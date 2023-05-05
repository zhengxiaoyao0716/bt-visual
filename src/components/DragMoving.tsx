import { Dispatch, MouseEvent, useState } from "react";

export type DragListeners<E extends MouseEvent> = {
  [event in "onMouseDown" | "onMouseMove" | "onMouseUp" | "onMouseLeave"]: (
    event: E
  ) => void;
};
export type Ignore = boolean;
export interface DragState {
  moveX: number;
  moveY: number;
  dragging: boolean;
  origin?: { x: number; y: number };
}

export interface BeforeHandler<E extends MouseEvent> {
  (event: E): Ignore;
}

export function defaultBeforeHandler<E extends MouseEvent>(event: E) {
  event.stopPropagation();
  event.preventDefault();
  return false;
}

export function useDragMoving(
  before: BeforeHandler<MouseEvent> = defaultBeforeHandler
): [DragListeners<MouseEvent>, DragState, Dispatch<DragState>] {
  const [state, setState] = useState({ moveX: 0, moveY: 0, dragging: false });
  const props = createDragListeners<MouseEvent>(state, setState, before);
  return [props, state, setState];
}

export function createDragListeners<E extends MouseEvent>(
  state: DragState,
  setState: Dispatch<DragState>,
  before: BeforeHandler<E> = defaultBeforeHandler
): DragListeners<E> {
  const onMouseDown = (event: E) => {
    if (before && before(event)) return;
    if (state.dragging) return;
    const origin = { x: event.clientX, y: event.clientY };
    setState({ ...state, dragging: true, origin });
  };
  const onMouseMove = (event: E) => {
    if (!state.dragging) return;
    setState({
      ...state,
      moveX: state.moveX + event.movementX,
      moveY: state.moveY + event.movementY,
    });
  };
  const onMouseUp = (_event: E) => {
    if (state.dragging) setState({ ...state, dragging: false });
  };
  const onMouseLeave = (_event: E) => {
    if (state.dragging) setState({ ...state, dragging: false });
  };
  return { onMouseDown, onMouseMove, onMouseUp, onMouseLeave };
}
