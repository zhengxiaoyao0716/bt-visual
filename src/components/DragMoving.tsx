import { Dispatch, MouseEvent, useState } from "react";
import styled from "@emotion/styled";

export interface DragEvent {
  buttons: number;
  movementX: number;
  movementY: number;
  stopPropagation(): void;
  preventDefault(): void;
}
export type DragListeners<E extends DragEvent> = {
  [event in "onMouseDown" | "onMouseMove" | "onMouseUp" | "onMouseLeave"]: (
    event: E
  ) => void;
};
export type Ignore = boolean;
export interface DragState {
  left: number;
  top: number;
  dragging: boolean;
}

export interface BeforeHandler<E extends DragEvent> {
  (event: E): Ignore;
}

export function defaultBeforeHandler<E extends DragEvent>(event: E) {
  event.stopPropagation();
  event.preventDefault();
  return false;
}

export function useDragMoving(
  before: BeforeHandler<MouseEvent> = defaultBeforeHandler,
  mouse: number = 7
): [DragListeners<MouseEvent>, DragState, Dispatch<DragState>] {
  const [state, setState] = useState({ left: 0, top: 0, dragging: false });
  const props = createDragListeners<MouseEvent>(state, setState, before, mouse);
  return [props, state, setState];
}

const Widget = styled.a`
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: auto;
  cursor: grab;
  transform-origin: center center;
  /* opacity: 0; */
  &:active {
    transform: scale(2);
  }
`;

export function createDragListeners<E extends DragEvent>(
  state: DragState,
  setState: Dispatch<DragState>,
  before: BeforeHandler<E> = defaultBeforeHandler,
  mouse: number = 7
): DragListeners<E> {
  const onMouseDown = (event: E) => {
    if ((event.buttons & mouse) === 0) return;
    if (before && before(event)) return;
    if (!state.dragging) setState({ ...state, dragging: true });
  };
  const onMouseMove = (event: E) => {
    if (before && before(event)) return;
    const { left, top, dragging: draging } = state;
    if (draging)
      setState({
        left: left + event.movementX,
        top: top + event.movementY,
        dragging: true,
      });
  };
  const onMouseUp = (event: E) => {
    if (before && before(event)) return;
    if (state.dragging) setState({ ...state, dragging: false });
  };
  const onMouseLeave = (event: E) => {
    if (before && before(event)) return;
    if (state.dragging) setState({ ...state, dragging: false });
  };
  return { onMouseDown, onMouseMove, onMouseUp, onMouseLeave };
}
