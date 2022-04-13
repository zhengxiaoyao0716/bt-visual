import styled from "@emotion/styled";
import CenterFocusWeakIcon from "@mui/icons-material/CenterFocusWeak";
import IconButton from "@mui/material/IconButton";
import { MouseEvent, useEffect, useRef, useState, WheelEvent } from "react";

import { useDragMoving } from "../components/DragMoving";
import ToolBarSlot from "../components/ToolBarSlot";
import Config from "../storage/Config";
import { useTrans } from "../storage/Locale";

interface Props {
  children?: JSX.Element;
}

const gridBackground = ({ size }: { size: number }) => {
  const gradientArgs = `transparent ${size - size / 16}px, #dddddd ${size}px`;
  const gradient = (direction: "left" | "top") =>
    `linear-gradient(${direction}, ${gradientArgs})`;
  const gradientLeft = gradient("left");
  const gradientTop = gradient("top");
  return [
    `background-image: -webkit-${gradientLeft}, -webkit-${gradientTop};`,
    `background-image: ${gradientLeft}, ${gradientTop};`,
    `background-size: ${size}px ${size}px`,
  ];
};
const Container = styled.div`
  flex-grow: 1;
  margin: 1em;
  overflow: hidden;
  display: flex;
  justify-content: center;
  pointer-events: auto;
  cursor: move;
  ${gridBackground}
`;
const Paper = styled.div`
  transform-origin: center top;
  pointer-events: none;
  user-select: none;
`;

export default function DraftPaper({ children }: Props) {
  const config = Config.use();
  const trans = useTrans();
  if (config?.value == null) return null; // never

  const ref = useRef<HTMLDivElement>(null);
  const isInvalidEventTarget = (event: MouseEvent) =>
    event.target != ref.current; // 这里不能用 currentTarget，会捕获到子元素

  const [movingProps, { left, top, dragging }, setDragMovingState] =
    useDragMoving(isInvalidEventTarget, 6);

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

  const toolBarSlot = ToolBarSlot.useSlot();
  useEffect(() => {
    const resetView = () => {
      setScale(1.0);
      setDragMovingState({
        left: 0,
        top: 0,
        dragging,
      });
    };

    toolBarSlot("Editor", "Paper", 2, [
      <IconButton
        color="inherit"
        title={`${trans("Reset View")}`}
        onClick={resetView}
      >
        <CenterFocusWeakIcon />
      </IconButton>,
    ]);
  }, []);

  return (
    <Container
      ref={ref}
      onWheel={onWheel}
      onContextMenu={(event) => event.preventDefault()}
      {...movingProps}
      size={32 * scale}
      style={{
        backgroundPosition: `${left}px ${top}px`,
      }}
    >
      <Paper
        style={{
          transform: `translate(${left}px, ${top}px) scale(${scale})`,
        }}
      >
        {children}
      </Paper>
    </Container>
  );
}
