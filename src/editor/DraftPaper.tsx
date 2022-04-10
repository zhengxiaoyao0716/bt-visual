import { MouseEvent, useRef, useState, WheelEvent } from "react";
import styled from "@emotion/styled";
import Box from "@mui/material/Box";

import Config from "../storage/Config";
import { useDragMoving } from "../components/DragMoving";

interface Props {
  children?: JSX.Element;
}

const Container = styled.div`
  flex-grow: 1;
  margin: 1em;
  overflow: hidden;
  display: flex;
  justify-content: center;
`;
const Paper = styled.div`
  transform-origin: center top;
  pointer-events: auto;
  cursor: move;
  & > div:first-of-type {
    background-image: -webkit-linear-gradient(
        top,
        transparent 31px,
        #dddddd 32px
      ),
      -webkit-linear-gradient(left, transparent 31px, #dddddd 32px);
    background-image: linear-gradient(top, transparent 31px, #dddddd 32px),
      linear-gradient(left, transparent 31px, #dddddd 32px);
    background-size: 32px 32px;
  }
`;

export default function DraftPaper({ children }: Props) {
  const config = Config.use();
  if (config?.value == null) return null; // never

  const ref = useRef<HTMLDivElement>(null);
  const isInvalidEventTarget = (event: MouseEvent) =>
    event.target != ref.current; // 这里不能用 currentTarget，会捕获到子元素

  const [movingProps, { left, top, dragging }, setDragMovingState] =
    useDragMoving(isInvalidEventTarget);

  const [scale, setScale] = useState(1.0);
  const onWheel = (event: WheelEvent) => {
    if (isInvalidEventTarget(event)) return;

    event.stopPropagation();

    if (event.shiftKey) {
      if (config?.saving) return;
      config?.update({
        ...config.value,
        nodeVerticalMargin:
          config.value?.nodeVerticalMargin - event.deltaY / 10,
      });
      return;
    }

    const paper = event.currentTarget as HTMLDivElement;
    const { height } = event.currentTarget.getBoundingClientRect();
    const scaleChanged = event.deltaY / 1000;
    const scaleNew = scale - scaleChanged;
    const heightNew = (height / scale) * scaleNew;
    if (heightNew <= 10) return;
    setScale(scaleNew);

    const parentRect =
      paper.parentElement?.parentElement?.getBoundingClientRect() as DOMRect;
    const center = parentRect.top + parentRect.height / 2;
    setDragMovingState({
      left,
      top: top + (center - top) * scaleChanged,
      dragging,
    });
  };

  return (
    <Container>
      {/* Container 的 `display: flex` 会限制元素高度，Paper 放一个空 div，来避免 Paper 没有覆盖完整的 children 的内容 */}
      <Box>
        <Paper
          ref={ref}
          style={{
            transform: `translate(${left}px, ${top}px) scale(${scale})`,
          }}
          onWheel={onWheel}
          {...movingProps}
        >
          {children}
        </Paper>
      </Box>
    </Container>
  );
}
