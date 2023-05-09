import { styled, useTheme } from "@mui/material/styles";
import { DragEvent, useEffect, useLayoutEffect, useRef } from "react";
import rough from "roughjs";

import type { Node } from "../../behavior-tree/type";
import { useRefresh } from "../../components/Refresh";
import { Status } from "../../debugger/status";

const Anchor = styled("a")`
  position: absolute;
  left: 50%;
  top: 16px;
  width: 32px;
  height: 32px;
  margin-left: -16px;
  margin-top: -16px;
  text-align: center;
  line-height: 32px;
  font-size: 24px;
  pointer-events: auto;
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
  z-index: 10;
`;

export const lineToParentClass = "line-to";
export const disableDropClass = "disable-drop";
export interface DraggingData {
  nodes: Node[];
  refresh(): void;
}
export const anchorDraggingRef = {
  current: null as DraggingData | null,
};

interface Props {
  status: Status.Value;
  locked: boolean;
  index: number;
  total: number;
  width: number;
  height: number;
  anchors: { [index: number]: HTMLElement };
  onSwrap: (index: number, swapTo: number) => void;
  redrawSig: any; // 重绘信号，不直接参与绘制
  draggingRef: DraggingData;
}
export default function LineRender({
  status,
  locked,
  index,
  total,
  width,
  height,
  anchors,
  onSwrap,
  redrawSig,
  draggingRef,
}: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [rfc, refresh] = useRefresh();
  const rect = ref.current?.getBoundingClientRect();
  const { palette } = useTheme();
  const strokeColor = status.color || palette.text.secondary;

  // 这里需要等 react 绘制完毕后再同步调用，不能用 useEffect，否则连接线会闪烁
  useLayoutEffect(() => {
    const $anchor = ref.current;
    if ($anchor == null) return;
    const $root = findLineRoot($anchor, $anchor);
    if ($root == null) return;
    $root.classList.remove("active"); // anchor 拖拽移动后，onDragEnd 方法可能没触发，手动移除 active 状态
    anchorDraggingRef.current = null; // 跟上面同理
    anchors[index] = $anchor;

    const svgWidth = $root.querySelector("svg")?.clientWidth ?? width;
    const lineTo = ((index + 0.5) / total) * svgWidth;
    const $lineTo = createLineTo(
      `${lineTo - svgWidth / 2}px`,
      `${height}px`,
      status.color
    );
    $root.appendChild($lineTo);

    const $svg = getOrCreateLineSvg($root);
    $svg.style.width = `${svgWidth}px`;

    const point0: [number, number] = [
      lineTo,
      $lineTo.offsetTop + $lineTo.offsetHeight / 2,
    ];
    const point3: [number, number] = [
      lineTo +
        ($anchor.offsetLeft - $lineTo.offsetLeft) +
        16 + // 16 个像素是锚点半宽
        8 + // 8 个像素是容器的 margin 造成的位移
        ($anchor.parentElement?.offsetLeft ?? 0),
      $anchor.offsetTop +
        16 + // 16 个像素是锚点半高
        ($anchor.parentElement?.parentElement?.offsetTop ?? 0),
    ];
    // const point1: [number, number] = [
    //   point0[0] * 0.8 + point3[0] * 0.2,
    //   point0[1] * 0.7 + point3[1] * 0.3,
    // ];
    const point2: [number, number] = [
      point0[0] * 0.2 + point3[0] * 0.8,
      point0[1] * 0.3 + point3[1] * 0.7,
    ];
    const $line = rough.svg($svg).curve([point0, point2, point3], {
      strokeWidth: status.color ? 3 : 1,
      roughness: 0,
      // strokeLineDash: [8, 16],
      stroke: strokeColor,
    });
    $line.classList.add("line");
    status.color && $line.classList.add("animate");
    $svg.appendChild($line);

    return () => {
      $root.classList.remove("active"); // anchor 拖拽移动后，onDragEnd 方法可能没触发，手动移除 active 状态
      anchorDraggingRef.current = null; // 跟上面同理
      $root.removeChild($lineTo);
      $svg.removeChild($line);
    };
  }, [
    ref.current,
    rect?.left,
    rect?.top,
    rect?.width,
    rect?.height,
    rfc,
    refresh,
    index,
    total,
    width,
    height,
    redrawSig,
    strokeColor,
  ]);

  useEffect(() => {
    const anchor = ref.current;
    if (anchor == null) return;
    const root = findLineRoot(anchor, anchor);
    if (root == null) return;
    root.addEventListener("redrawLines", refresh);

    return () => {
      root.removeEventListener("redrawLines", refresh);
    };
  }, [ref.current]);

  const onDragStart = locked
    ? undefined
    : (event: DragEvent) => {
        const anchor = ref.current;
        if (anchor == null) return;
        const root = findLineRoot(anchor, anchor);
        if (root == null) return;
        anchor.parentElement?.classList.add(disableDropClass); // 屏蔽 anchor 同一树上的拖放
        root.classList.add("active");
        anchorDraggingRef.current = draggingRef;

        event.dataTransfer.setData(
          "application/json",
          JSON.stringify({ anchor: index })
        );
      };

  const onDragEnd = locked
    ? undefined
    : (_event: DragEvent) => {
        const anchor = ref.current;
        if (anchor == null) return;
        const root = findLineRoot(anchor, anchor);
        if (root == null) return;
        anchorDraggingRef.current = null;
        anchor.parentElement?.classList.remove(disableDropClass); // 解除 anchor 同一树上的屏蔽
        root.classList.remove("active");
      };

  const onDragOver = locked
    ? undefined
    : (event: DragEvent) => {
        const anchor = ref.current;
        if (anchor == null) return;
        const root = findLineRoot(anchor, anchor);
        if (root == null || !root.classList.contains("active")) return;
        event.dataTransfer.dropEffect = "link";
        event.preventDefault();
      };

  const onDrop = locked
    ? undefined
    : (event: DragEvent) => {
        event.preventDefault();
        const data = JSON.parse(
          event.dataTransfer.getData("application/json") || "{}"
        );
        const anchorIndex = data.anchor as undefined | number;
        anchorIndex == null ||
          index === anchorIndex ||
          onSwrap(anchorIndex, index);
      };

  return (
    <Anchor
      className="line-anchor"
      ref={ref}
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{ color: status.color }}
    >
      ◉
    </Anchor>
  );
}

const DropArea = styled("div")`
  position: absolute;
  width: calc(100% + 60px);
  top: -60px;
  height: 120px;
  div.active > div > & {
    pointer-events: auto;
    border: 1px dashed #3366ee;
  }
`;

export function LineDropArea(props: {
  onMoved: (index: number, left: number) => void;
}) {
  const onDragOver = (event: DragEvent) => {
    event.dataTransfer.dropEffect = "move";
    event.preventDefault();
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    const data = JSON.parse(
      event.dataTransfer.getData("application/json") || "{}"
    );
    const anchorIndex = data.anchor as undefined | number;
    anchorIndex == null || props.onMoved(anchorIndex, event.clientX);
  };

  return <DropArea onDragOver={onDragOver} onDrop={onDrop} />;
}

export async function triggerRedrawLines(element: Element | null) {
  await new Promise((resolve) => setTimeout(resolve, 500)); // 延迟一帧，等待 react 绘制完毕再重绘连接线
  if (element) {
    element.dispatchEvent(new CustomEvent("redrawLines", { bubbles: true }));
    return;
  }
  // element 丢失，常出现在 undo 时，节点树变化较大导致旧的节点已卸载，
  // 暂时没有想到好的解决方案，只能全局查一下所有锚点，全部触发重绘了。
  const anchors = document.querySelectorAll(".line-anchor");
  Array.prototype.map
    .call(anchors, (anchor) => findLineRoot(anchor, anchor))
    .forEach((root) =>
      (root as Element | null)?.dispatchEvent(
        new CustomEvent("redrawLines", { bubbles: false })
      )
    );
}

function findLineRoot(
  element: HTMLElement,
  anchor: HTMLAnchorElement
): HTMLElement | null {
  if (element.classList.contains(lineToParentClass)) {
    if (element != anchor.parentElement) return element;
  }
  if (element.parentElement == null || element.parentElement == element) {
    return null;
  } else return findLineRoot(element.parentElement, anchor);
}

function createLineTo(left: string, top: string, color: string) {
  const $lineTo = document.createElement("a");
  $lineTo.innerText = "◎";
  $lineTo.style.position = "absolute";
  $lineTo.style.marginLeft = left;
  $lineTo.style.left = "50%";
  $lineTo.style.top = top;
  $lineTo.style.transform = "translate(-50%)";
  $lineTo.style.color = color;
  return $lineTo;
}

export const lineContainerClass = "line-container";

function getOrCreateLineSvg($root: HTMLElement): SVGSVGElement {
  for (const child of $root.childNodes) {
    if (
      child instanceof HTMLDivElement &&
      child.classList.contains(lineContainerClass)
    ) {
      return child.getElementsByTagName("svg")[0] as SVGSVGElement;
    }
  }

  const $container = document.createElement("div");
  $container.classList.add(lineContainerClass);
  $container.style.position = "absolute";
  $container.style.left = "0";
  $container.style.top = "0";
  $container.style.width = "100%";
  $container.style.height = "100%";
  $root.appendChild($container);

  const $svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  $svg.style.position = "relative";
  $svg.style.overflow = "visible";
  $svg.style.pointerEvents = "none";
  $svg.style.display = "inline-block";
  $container.appendChild($svg);
  return $svg as SVGSVGElement;
}
