import styled from "@emotion/styled";
import CenterFocusWeakIcon from "@mui/icons-material/CenterFocusWeak";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import IconButton from "@mui/material/IconButton";
import { MouseEvent, useEffect, useRef, useState, WheelEvent } from "react";

import { useDragMoving } from "../components/DragMoving";
import Fullscreen from "../components/Fullscreen";
import ToolBarSlot from "../components/ToolBarSlot";
import Config from "../storage/Config";
import { useTrans } from "../storage/Locale";

interface Props {
  readonly?: true;
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
  &.dragging {
    cursor: move;
  }
  ${gridBackground}
`;
const Paper = styled.div`
  transform-origin: left top;
  pointer-events: none;
  user-select: none;
`;

const initScale = 1.0;

export default function DraftPaper({ readonly, children }: Props) {
  const config = Config.use();
  const trans = useTrans();
  if (config?.value == null) return null; // never

  const ref = useRef<HTMLDivElement>(null);
  const isInvalidEventTarget = (event: MouseEvent) =>
    event.target != ref.current; // 这里不能用 currentTarget，会捕获到子元素

  const [movingProps, { moveX, moveY, dragging }, setDragMovingState] =
    useDragMoving(
      (event) => (event.buttons & 6) === 0 || isInvalidEventTarget(event)
    );

  const [scale, setScale] = useState(initScale);
  const onWheel = (event: WheelEvent) => {
    // if (isInvalidEventTarget(event)) return;
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

    const scaleChanged = event.deltaY / 2048;
    const scaleNew = scale - scale * scaleChanged;
    if (event.deltaY > 0 && scaleNew < 0.05) return;
    setScale(scaleNew);

    const $content = event.currentTarget?.children?.[0] as HTMLDivElement;
    const domRect = $content.getBoundingClientRect() as DOMRect;
    const offsetX = event.clientX - domRect.left; // - moveX;
    const offsetY = event.clientY - domRect.top; // - moveY;
    setDragMovingState({
      moveX: moveX + offsetX * scaleChanged,
      moveY: moveY + offsetY * scaleChanged,
      dragging,
    });
  };

  const toolBarSlot = ToolBarSlot.useSlot();
  useEffect(() => {
    const resetView = () => {
      setScale(initScale);
      setDragMovingState({
        moveX: 0,
        moveY: 0,
        dragging,
      });
    };

    const toolBarType = readonly ? "Editor/Readonly" : "Editor";
    toolBarSlot(toolBarType, "Paper", 2, [
      <IconButton
        color="inherit"
        title={`${trans("Reset View")}`}
        onClick={resetView}
      >
        <CenterFocusWeakIcon sx={{ transform: "scale(0.8)" }} />
      </IconButton>,
      <Fullscreen>
        {(fullscreen, troggle) => (
          <IconButton
            color="inherit"
            title={`${trans(fullscreen ? "Exit Fullscreen" : "Fullscreen")}`}
            onClick={troggle}
          >
            {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        )}
      </Fullscreen>,
    ]);
  }, [readonly]);

  return (
    <Container
      ref={ref}
      className={dragging ? "dragging" : undefined}
      onWheel={onWheel}
      onContextMenu={(event) => event.preventDefault()}
      {...movingProps}
      size={32 * scale}
      style={{
        margin: "6px",
        backgroundPosition: `${moveX}px ${moveY}px`,
      }}
    >
      <Paper
        style={{
          transform: `translate(${moveX}px, ${moveY}px) scale(${scale})`,
        }}
      >
        {children}
      </Paper>
    </Container>
  );
}
