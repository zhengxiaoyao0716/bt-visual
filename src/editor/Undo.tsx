import { createContext, ReactNode, useContext, useRef } from "react";
import IconButton from "@mui/material/IconButton";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import RestoreIcon from "@mui/icons-material/Restore";
import UpdateIcon from "@mui/icons-material/Update";
import Typography from "@mui/material/Typography";

import ToolBarSlot from "../components/ToolBarSlot";
import { useRefresh } from "../components/Refresh";
import { TransFunction } from "../storage/Locale";
import { useHistoryEditor } from "./Properties";
import Button from "@mui/material/Button";
import { useEffect } from "react";

interface Task {
  desc: string;
  (): Task | undefined;
}

const undoStacks: {
  [key: string]: {
    tasks: (Task | undefined)[];
    current: number;
  };
} = {};

export function clearStacks() {
  for (const key in undoStacks) {
    delete undoStacks[key];
  }
}

interface UndoManager {
  execute(desc: string, task: (redo: boolean) => () => void): void;
  refresh(): void;
}

const UndoContext = createContext<UndoManager | null>(null);

export default function Undo({
  id,
  trans,
  children,
}: {
  id: string;
  trans: TransFunction;
  children: ReactNode;
}) {
  if (!(id in undoStacks)) undoStacks[id] = { tasks: [undefined], current: 0 };

  const { tasks, current } = undoStacks[id];
  const undoDesc = tasks[current - 1]?.desc ?? undefined;
  const redoDesc = tasks[current]?.desc ?? undefined;

  const historyRefreshRef = useRef(() => {});
  const [rfCount, refreshProvider] = useRefresh();

  const undo = () => {
    // 懒得考虑闭包捕获问题了，保险起见，每次重新堆区 undo 堆栈
    const stack = undoStacks[id];
    stack.current--;
    const undoTask: Task | undefined = stack.tasks[stack.current];
    if (!undoTask) return; // never

    const redoTask = undoTask();
    stack.tasks[stack.current] = redoTask;
    historyRefreshRef.current();
    refreshProvider();
  };
  const redo = () => {
    // 懒得考虑闭包捕获问题了，保险起见，每次重新堆区 undo 堆栈
    const stack = undoStacks[id];
    const redoTask: Task | undefined = stack.tasks[stack.current];
    if (!redoTask) return; // never

    const undoTask = redoTask();
    stack.tasks[stack.current] = undoTask;
    stack.current++;
    historyRefreshRef.current();
    refreshProvider();
  };

  function History() {
    const [, refresh] = useRefresh();
    useEffect(() => {
      historyRefreshRef.current = refresh;
      return () => {
        historyRefreshRef.current = () => {};
      };
    }, []);

    const { tasks, current } = undoStacks[id];
    const goto = (index: number) => {
      if (index < 0 || index >= tasks.length) return;
      const stack = undoStacks[id];
      if (index < stack.current) {
        function autoUndo() {
          undo();
          index < stack.current && setTimeout(autoUndo, 16.66);
          refresh();
        }
        autoUndo();
      } else {
        function autoRedo() {
          redo();
          index >= stack.current && setTimeout(autoRedo, 16.66);
          refresh();
        }
        autoRedo();
      }
    };
    let disabled = false;
    return (
      <>
        {tasks.map((action, index) => {
          if (action == null) disabled = true;
          return (
            <Button
              key={index}
              sx={{ textAlign: "left" }}
              disabled={disabled}
              onClick={goto.bind(null, index)}
            >
              <Typography
                color={({ palette }) =>
                  palette.text[index < current ? "primary" : "secondary"]
                }
                sx={{ width: "100%" }}
              >
                {index + 1}.{action?.desc}
              </Typography>
            </Button>
          );
        })}
      </>
    );
  }
  const historyEditor = useHistoryEditor(trans, [History]);
  useEffect(() => historyEditor.hide, [id]);

  const toolBarSlot = ToolBarSlot.useSlot();
  useEffect(() => {
    toolBarSlot("Editor", "Undo", 1, [
      <IconButton
        color="inherit"
        disabled={!undoDesc && !redoDesc}
        title={`${trans("History")}`}
        onClick={historyEditor.show}
      >
        <HistoryToggleOffIcon />
      </IconButton>,
      <IconButton
        color="inherit"
        disabled={!undoDesc}
        title={`${trans("Undo")} ${undoDesc}`}
        onClick={undo}
      >
        <RestoreIcon />
      </IconButton>,
      <IconButton
        color="inherit"
        disabled={!redoDesc}
        title={`${trans("Redo")} ${redoDesc}`}
        onClick={redo}
      >
        <UpdateIcon />
      </IconButton>,
    ]);
  }, [rfCount]);

  const execute = (desc: string, task: (redo: boolean) => () => void) => {
    let execute = () => {
      execute = () => task(true);
      return task(false);
    };
    function redoTask() {
      try {
        const undo = execute();
        function undoTask() {
          try {
            undo();
          } catch (e) {
            console.log(
              `undo task failed: ${e}, id: ${id}, desc: ${desc}, task: ${task}`
            );
            // 出现异常，立刻清空 undo 堆栈，防止异常堆积导致不可挽回
            undoStacks[id] = { tasks: [], current: 0 };
            return undefined;
          }
          return redoTask as Task;
        }
        undoTask.desc = desc;
        return undoTask as Task;
      } catch (e) {
        console.log(
          `execute task failed: ${e}, id: ${id}, desc: ${desc}, task: ${task}`
        );
        // 出现异常，立刻清空 undo 堆栈，防止异常堆积导致不可挽回
        undoStacks[id] = { tasks: [], current: 0 };
        return undefined;
      }
    }
    redoTask.desc = desc;

    const undoTask = redoTask();
    if (undoTask == null) return;
    const stack = undoStacks[id];
    stack.tasks[stack.current] = undoTask;
    stack.tasks[++stack.current] = undefined;
    historyRefreshRef.current();
    refreshProvider();
  };

  const manager: UndoManager = {
    execute,
    refresh() {
      historyRefreshRef.current();
      refreshProvider();
    },
  };
  return (
    <UndoContext.Provider value={manager}>{children}</UndoContext.Provider>
  );
}

export function useUndo(): UndoManager {
  return useContext(UndoContext) as UndoManager;
}
