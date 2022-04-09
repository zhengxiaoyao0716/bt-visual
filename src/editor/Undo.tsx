import { createContext, ReactNode, useContext } from "react";
import IconButton from "@mui/material/IconButton";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";

import ToolBarSlot from "../components/ToolBarSlot";
import { useRefresh } from "../components/Refresh";
import { TransFunction } from "../storage/Locale";

interface Action {
  desc: string;
  (): Action | undefined;
}

const undoStacks: {
  [key: string]: {
    actions: (Action | undefined)[];
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
  if (!(id in undoStacks)) undoStacks[id] = { actions: [], current: 0 };

  const { actions, current } = undoStacks[id];
  const undoDesc = actions[current - 1]?.desc ?? undefined;
  const redoDesc = actions[current]?.desc ?? undefined;

  const [, refresh] = useRefresh();

  const undo = () => {
    // 懒得考虑闭包捕获问题了，保险起见，每次重新堆区 undo 堆栈
    const stack = undoStacks[id];
    stack.current--;
    const undoAction: Action | undefined = stack.actions[stack.current];
    if (!undoAction) return; // never

    const redoAction = undoAction();
    stack.actions[stack.current] = redoAction;
    refresh();

    console.info(`${id} - undo: ${undoAction.desc}`);
  };
  const redo = () => {
    // 懒得考虑闭包捕获问题了，保险起见，每次重新堆区 undo 堆栈
    const stack = undoStacks[id];
    const redoAction: Action | undefined = stack.actions[stack.current];
    if (!redoAction) return; // never

    const undoAction = redoAction();
    stack.actions[stack.current] = undoAction;
    stack.current++;
    refresh();

    console.info(`${id} - redo: ${redoAction.desc}`);
  };

  const toolBarSlot = ToolBarSlot.useSlot();
  toolBarSlot("Editor", {
    undo: {
      node: (
        <IconButton
          color="inherit"
          disabled={!undoDesc}
          title={`${trans("Undo")}${undoDesc}`}
          onClick={undo}
        >
          <UndoIcon />
        </IconButton>
      ),
      order: 0,
    },
    redo: {
      node: (
        <IconButton
          color="inherit"
          disabled={!redoDesc}
          title={`${trans("Redo")}${redoDesc}`}
          onClick={redo}
        >
          <RedoIcon />
        </IconButton>
      ),
      order: 1,
    },
  });

  const execute = (desc: string, task: (redo: boolean) => () => {}) => {
    let execute = () => {
      execute = () => task(true);
      return task(false);
    };
    function redoAction() {
      try {
        const undo = execute();
        function undoAction() {
          try {
            undo();
          } catch (e) {
            console.log(
              `undo task failed: ${e}, id: ${id}, desc: ${desc}, task: ${task}`
            );
            // 出现异常，立刻清空 undo 堆栈，防止异常堆积导致不可挽回
            undoStacks[id] = { actions: [], current: 0 };
            return undefined;
          }
          return redoAction as Action;
        }
        undoAction.desc = desc;
        return undoAction as Action;
      } catch (e) {
        console.log(
          `execute task failed: ${e}, id: ${id}, desc: ${desc}, task: ${task}`
        );
        // 出现异常，立刻清空 undo 堆栈，防止异常堆积导致不可挽回
        undoStacks[id] = { actions: [], current: 0 };
        return undefined;
      }
    }
    redoAction.desc = desc;

    const undoAction = redoAction();
    if (undoAction == null) return;
    const stack = undoStacks[id];
    stack.actions[stack.current] = undoAction;
    stack.actions[++stack.current] = undefined;
    refresh();
  };

  const manager: UndoManager = { execute, refresh };
  return (
    <UndoContext.Provider value={manager}>{children}</UndoContext.Provider>
  );
}

export function useUndo(): UndoManager {
  return useContext(UndoContext) as UndoManager;
}
