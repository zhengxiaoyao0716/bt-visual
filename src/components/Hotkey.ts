export interface Hotkey {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  code: "Delete" | "KeyZ" | "KeyY" | "KeyD" | "KeyC" | "KeyV" | "KeyS" | "KeyL";
  callback: () => void;
}

export function addHotkeyListener(...hotKeys: Hotkey[]) {
  if (hotKeys.length === 0) return () => {};
  const onKeyDown = (event: KeyboardEvent) => {
    const accept = hotKeys.some(({ code, ctrlKey, shiftKey, callback }) => {
      if (code !== event.code) return false;
      if (ctrlKey != null && ctrlKey !== event.ctrlKey) return false;
      if (shiftKey != null && shiftKey !== event.shiftKey) return false;
      callback();
      return true;
    });
    if (!accept) return;
    event.preventDefault();
    event.stopPropagation();
  };
  window.addEventListener("keydown", onKeyDown);
  return () => {
    window.removeEventListener("keydown", onKeyDown);
  };
}
