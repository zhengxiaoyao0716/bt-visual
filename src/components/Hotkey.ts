import { KeyboardEvent as ReactKeyboardEvent } from "react";

export interface Hotkey {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  ignore?: (event: KeyboardEvent) => boolean;
  code:
    | "Delete"
    | "KeyZ"
    | "KeyY"
    | "KeyD"
    | "KeyC"
    | "KeyX"
    | "KeyV"
    | "KeyS"
    | "KeyL"
    | "ArrowDown"
    | "ArrowUp"
    | "ArrowLeft"
    | "ArrowRight";
  callback: (event: KeyboardEvent) => void;
}

export function addHotkeyListener(target: HTMLElement, ...hotKeys: Hotkey[]) {
  if (hotKeys.length === 0) return () => {};
  const handle = (event: KeyboardEvent) => {
    const isTarget = event.target === target;
    const accept = hotKeys.some(
      ({ code, ctrlKey, shiftKey, ignore, callback }) => {
        if (code !== event.code) return false;
        if (ctrlKey != null && ctrlKey !== event.ctrlKey) return false;
        if (shiftKey != null && shiftKey !== event.shiftKey) return false;
        if (ignore ? ignore(event) : !isTarget) return false; // 若未定义 ignore，则默认判定一下 event 的 target 是否匹配
        callback(event);
        return true;
      }
    );
    if (!accept) return;
    event.preventDefault();
    event.stopPropagation();
  };
  target.addEventListener("keydown", handle);
  return () => {
    target.removeEventListener("keydown", handle);
  };
}

export function inputOnKeyDown({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (event: ReactKeyboardEvent) => {
    if (event.ctrlKey || event.shiftKey || event.altKey) return;
    switch (event.key) {
      case "Enter":
        onSubmit();
        break;
      case "Escape":
        onCancel();
        break;
      default:
        return; // 其他按键继续传递
    }
    event.preventDefault();
    event.stopPropagation();
  };
}
