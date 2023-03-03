import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import RestoreIcon from "@mui/icons-material/Restore";
import UpdateIcon from "@mui/icons-material/Update";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { addHotkeyListener } from "../components/Hotkey";

import { useRefresh } from "../components/Refresh";
import ToolBarSlot from "../components/ToolBarSlot";
import { TransFunction } from "../storage/Locale";
import { LockerContext } from "./NodeRender/NodeLocker";
import { cancelSelector } from "./NodeSelector";
import { useHistoryEditor } from "./Properties";

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

export interface UndoManager {
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

  const historyRefreshRef = useRef(() => {});
  const [rfc, refreshProvider] = useRefresh();

  const undo = useCallback(() => {
    // 懒得考虑闭包捕获问题了，保险起见，每次重新堆区 undo 堆栈
    const stack = undoStacks[id];
    const undoTask: Task | undefined = stack.tasks[stack.current - 1];
    if (!undoTask) return;
    stack.current--;

    const redoTask = undoTask();
    stack.tasks[stack.current] = redoTask;
    historyRefreshRef.current();
    refreshProvider();
  }, [id]);
  const redo = useCallback(() => {
    // 懒得考虑闭包捕获问题了，保险起见，每次重新堆区 undo 堆栈
    const stack = undoStacks[id];
    const redoTask: Task | undefined = stack.tasks[stack.current];
    if (!redoTask) return;

    const undoTask = redoTask();
    stack.tasks[stack.current] = undoTask;
    stack.current++;
    historyRefreshRef.current();
    refreshProvider();
  }, [id]);

  useEffect(() => {
    const removeHotkeyListener = addHotkeyListener(
      document.body,
      {
        ctrlKey: true,
        shiftKey: false,
        code: "KeyZ",
        callback: undo,
      },
      {
        ctrlKey: true,
        shiftKey: true,
        code: "KeyZ",
        callback: redo,
      },
      {
        ctrlKey: true,
        code: "KeyY",
        callback: redo,
      }
    );
    return () => {
      removeHotkeyListener();
    };
  }, [undo, redo]);

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

    const locked = useContext(LockerContext);
    let disabled = false;
    return (
      <>
        {tasks
          .map((action, index) => {
            if (action == null) disabled = true;
            return (
              <Button
                key={index}
                size="small"
                sx={{ textAlign: "left", textTransform: "none" }}
                disabled={locked || disabled}
                onClick={goto.bind(null, index)}
              >
                <Typography
                  color={({ palette }) =>
                    palette.text[
                      !locked && index < current ? "primary" : "secondary"
                    ]
                  }
                  sx={{ width: "100%" }}
                >
                  <small>{index + 1}. </small>
                  {action?.desc}
                </Typography>
              </Button>
            );
          })
          .reverse()}
      </>
    );
  }
  const historyEditor = useHistoryEditor(trans, [History]);
  useEffect(() => historyEditor.hide, [id]);

  const { tasks, current } = undoStacks[id];
  const undoDesc = tasks[current - 1]?.desc ?? undefined;
  const redoDesc = tasks[current]?.desc ?? undefined;
  const locked = useContext(LockerContext);

  const toolBarSlot = ToolBarSlot.useSlot();
  useEffect(() => {
    toolBarSlot("Editor", "Undo", 1, [
      <IconButton
        color="inherit"
        disabled={locked || (!undoDesc && !redoDesc)}
        title={`${trans("History")}`}
        onClick={historyEditor.show}
      >
        <HistoryToggleOffIcon />
      </IconButton>,
      <IconButton
        color="inherit"
        disabled={locked || !undoDesc}
        title={`${trans("Undo")} ${undoDesc}`}
        onClick={undo}
      >
        <RestoreIcon />
      </IconButton>,
      <IconButton
        color="inherit"
        disabled={locked || !redoDesc}
        title={`${trans("Redo")} ${redoDesc}`}
        onClick={redo}
      >
        <UpdateIcon />
      </IconButton>,
    ]);
  }, [rfc, locked, undo, redo]);

  const execute = (desc: string, task: (redo: boolean) => () => void) => {
    let execute = () => {
      execute = () => task(true);
      return task(false);
    };
    function redoTask() {
      cancelSelector();
      try {
        const undo = execute();
        function undoTask() {
          cancelSelector();
          try {
            undo();
          } catch (e) {
            console.error(
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
        console.error(
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

Undo.use = (): UndoManager => useContext(UndoContext) as UndoManager;
