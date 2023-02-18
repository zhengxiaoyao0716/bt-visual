import styled from "@emotion/styled";
import { DragEvent, useEffect, useLayoutEffect, useRef } from "react";
import rough from "roughjs";

import type { Node } from "../../behavior-tree/type";
import { useRefresh } from "../../components/Refresh";

const Anchor = styled.a`
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  top: 16px;
  width: 32px;
  height: 32px;
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
  locked: boolean;
  index: number;
  total: number;
  width: number;
  height: number;
  anchors: { [index: number]: HTMLElement };
  onSwrap: (index: number, swapTo: number) => void;
  redrawSig: any; // 重绘信号，不直接参与绘制
  draggingRef: DraggingData;
  color?: string;
}
export default function LineRender({
  locked,
  index,
  total,
  width,
  height,
  anchors,
  onSwrap,
  redrawSig,
  draggingRef,
  color,
}: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [rfc, refresh] = useRefresh();
  const rect = ref.current?.getBoundingClientRect();

  // 这里需要等 react 绘制完毕后再同步调用，不能用 useEffect，否则连接线会闪烁
  useLayoutEffect(() => {
    const anchor = ref.current;
    if (anchor == null) return;
    const root = findLineRoot(anchor, anchor);
    if (root == null) return;
    root.classList.remove("active"); // anchor 拖拽移动后，onDragEnd 方法可能没触发，手动移除 active 状态
    anchorDraggingRef.current = null; // 跟上面同理
    anchors[index] = anchor;

    const lineTo = createLineTo(
      `${((index - total / 2 + 0.5) / total) * width}px`,
      `${height}px`
    );
    root.appendChild(lineTo);

    const svg = getOrCreateLineSvg(root);
    const line = rough.svg(svg).line(
      lineTo.offsetLeft,
      lineTo.offsetTop + lineTo.offsetHeight / 2,
      anchor.offsetLeft + (anchor.parentElement?.offsetLeft ?? 0) + 8, // 8 个像素是容器的 margin 造成的位移
      anchor.offsetTop + (anchor.parentElement?.parentElement?.offsetTop ?? 0),
      {
        strokeWidth: 0.5,
        strokeLineDash: [8, 16],
        ...(color ? { stroke: color } : null),
      }
    );
    svg.appendChild(line);

    return () => {
      root.classList.remove("active"); // anchor 拖拽移动后，onDragEnd 方法可能没触发，手动移除 active 状态
      anchorDraggingRef.current = null; // 跟上面同理
      root.removeChild(lineTo);
      svg.removeChild(line);
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
    >
      ◉
    </Anchor>
  );
}

const DropArea = styled.div`
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
  await new Promise((resolve) => setTimeout(resolve, 0)); // 延迟一帧，等待 react 绘制完毕再重绘连接线
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

function createLineTo(left: string, top: string) {
  const $lineTo = document.createElement("a");
  $lineTo.innerText = "◎";
  $lineTo.style.position = "absolute";
  $lineTo.style.marginLeft = left;
  $lineTo.style.left = "50%";
  $lineTo.style.top = top;
  $lineTo.style.transform = "translate(-50%)";
  return $lineTo;
}

function getOrCreateLineSvg(root: HTMLElement): SVGSVGElement {
  for (const child of root.childNodes) {
    if (
      child instanceof SVGSVGElement &&
      child.classList.contains("line-container")
    ) {
      return child as SVGSVGElement;
    }
  }
  const $svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  $svg.classList.add("line-container");
  $svg.style.position = "absolute";
  $svg.style.left = "0";
  $svg.style.top = "0";
  $svg.style.width = "100%";
  $svg.style.height = "100%";
  $svg.style.pointerEvents = "none";
  root.appendChild($svg);
  return $svg as SVGSVGElement;
}
