import rough from "roughjs";
import styled from "@emotion/styled";
import { useLayoutEffect, useRef, useState } from "react";

import { grabableClass, GrabEvent } from "./GrabPaper";

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
`;

export const lineToParentClass = "line-to";

interface Props {
  index: number;
  total: number;
  width: number;
  height: number;
  anchors: { [index: number]: HTMLElement };
  onMoved: (index: number, left: number, top: number) => void;
  redrawSig: any; // 重绘信号，不直接参与绘制
  color?: string;
}
export default function LineRender({
  index,
  total,
  width,
  height,
  anchors,
  onMoved,
  redrawSig,
  color,
}: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [refresh, setRefresh] = useState(0);

  useLayoutEffect(() => {
    // 这里需要等 react 绘制完毕后再同步调用，不能用 useEffect，否则连接线会闪烁
    const anchor = ref.current;
    if (anchor == null) return;
    const root = findLineRoot(anchor, anchor);
    if (root == null) return;
    anchors[index] = anchor;

    const lineTo = createLineTo(
      `${((index - total / 2 + 0.5) / total) * width}px`,
      `${height}px`
    );
    root.appendChild(lineTo);

    const svg = getOrCreateLineSvg(root);
    const line = rough
      .svg(svg)
      .line(
        lineTo.offsetLeft,
        lineTo.offsetTop + lineTo.offsetHeight / 2,
        anchor.offsetLeft + (anchor.parentElement?.offsetLeft ?? 0),
        anchor.offsetTop + (anchor.parentElement?.offsetTop ?? 0),
        {
          strokeLineDash: [8, 16],
          ...(color ? { stroke: color } : null),
        }
      );
    svg.appendChild(line);

    const handleRedrawLines = () => setRefresh(1 + refresh);
    root.addEventListener("redrawLines", handleRedrawLines);

    const onGrab = (event: Event) => {
      const { left, top } = event as GrabEvent;
      onMoved(index, left, top);
    };
    anchor.addEventListener(GrabEvent.KEY, onGrab);

    return () => {
      root.removeChild(lineTo);
      svg.removeChild(line);
      root.removeEventListener("redrawLines", handleRedrawLines);
      anchor.removeEventListener(GrabEvent.KEY, onGrab);
    };
  }, [ref.current, refresh, index, total, width, height, redrawSig]);

  return (
    <Anchor ref={ref} className={grabableClass}>
      ◉
    </Anchor>
  );
}

export function triggerRedrawLiens(element: Element) {
  element.dispatchEvent(new Event("redrawLines", { bubbles: true }));
}

function findLineRoot(
  element: HTMLElement,
  anchor: HTMLAnchorElement
): HTMLElement | null {
  if (element.classList.contains(lineToParentClass)) {
    if (element != anchor.parentElement) return element;
  }
  if (element.parentElement == null || element.parentElement == element)
    return null;
  else return findLineRoot(element.parentElement, anchor);
}

function createLineTo(left: string, top: string) {
  const lineTo = document.createElement("a");
  lineTo.innerText = "◎";
  lineTo.style.position = "absolute";
  lineTo.style.marginLeft = left;
  lineTo.style.left = "50%";
  lineTo.style.top = top;
  lineTo.style.transform = "translate(-50%)";
  return lineTo;
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
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("line-container");
  svg.style.position = "absolute";
  svg.style.left = "0";
  svg.style.top = "0";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.pointerEvents = "none";
  root.appendChild(svg);
  return svg as SVGSVGElement;
}
