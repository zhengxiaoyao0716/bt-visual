import CenterFocusWeakIcon from "@mui/icons-material/CenterFocusWeak";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import IconButton from "@mui/material/IconButton";
import { styled, useTheme } from "@mui/material/styles";
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

const gridBackground = (size: number, color: string) => {
  const gradientArgs = `${color}, transparent 5%`;
  const gradientLeft = `linear-gradient(0deg, ${gradientArgs})`;
  const gradientTop = `linear-gradient(90deg, ${gradientArgs})`;
  return {
    // backgroundImage: `-webkit-${gradientLeft}, -webkit-${gradientTop}`,
    backgroundImage: `${gradientLeft}, ${gradientTop}`,
    backgroundSize: `${size}px ${size}px`,
  };
};
const GridBackground = styled("div")`
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background-origin: content-box;
`;
const Container = styled("div")`
  flex-grow: 1;
  margin: 0.5em;
  overflow: hidden;
  display: flex;
  justify-content: center;
  pointer-events: auto;
  &.dragging {
    cursor: move;
  }
`;
const Paper = styled("div")`
  transform-origin: center top;
  pointer-events: none;
  user-select: none;
  transition: transform 0.1s;
`;

const initScale = 1.0;

export default function DraftPaper({ readonly, children }: Props) {
  const config = Config.use();
  const trans = useTrans();
  const { palette } = useTheme();
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

    const $children = event.currentTarget?.children;
    if ($children == null) return;
    const $content = $children[$children.length - 1];
    const domRect = $content.getBoundingClientRect() as DOMRect;
    const offsetX = event.clientX - domRect.left - domRect.width / 2; // - moveX;
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

  const gridZoom = scale > 1 ? 32 : (Math.sqrt(1 / scale) | 0) * 32;
  return (
    <Container
      ref={ref}
      className={dragging ? "dragging" : undefined}
      onWheel={onWheel}
      onContextMenu={(event) =>
        isInvalidEventTarget(event) || event.preventDefault()
      }
      {...movingProps}
    >
      <GridBackground
        style={{
          backgroundPosition: `${moveX}px ${moveY}px`,
          ...gridBackground(
            scale * gridZoom * 2,
            palette.grey[palette.mode === "light" ? 300 : 800]
          ),
        }}
      />
      <GridBackground
        style={{
          backgroundPosition: `${moveX}px ${moveY}px`,
          ...gridBackground(
            scale * gridZoom,
            palette.grey[palette.mode === "light" ? 300 : 800]
          ),
        }}
      />
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
