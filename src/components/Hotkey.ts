export interface Hotkey {
  ctrlKey?: boolean;
  shiftKey?: boolean;
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
    if (event.target !== target) return;
    const accept = hotKeys.some(({ code, ctrlKey, shiftKey, callback }) => {
      if (code !== event.code) return false;
      if (ctrlKey != null && ctrlKey !== event.ctrlKey) return false;
      if (shiftKey != null && shiftKey !== event.shiftKey) return false;
      callback(event);
      return true;
    });
    if (!accept) return;
    event.preventDefault();
    event.stopPropagation();
  };
  target.addEventListener("keydown", handle);
  return () => {
    target.removeEventListener("keydown", handle);
  };
}
