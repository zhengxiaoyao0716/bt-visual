import styled from "@emotion/styled";
import {
  DragEventHandler,
  MouseEventHandler,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import rough from "roughjs";

import type { Composite, Decorator, Node } from "../../behavior-tree/type";
import { getNodeType } from "../../behavior-tree/utils";
import Config from "../../storage/Config";
import { TransFunction } from "../../storage/Locale";
import { triggerRedrawLines } from "./LineRender";

const statusMapper = {
  success: { color: "#00FF00" },
  failure: { color: "#FF0000" },
  running: { color: "#0000FF" },
  "": { color: "" },
};

const nodeTypeMapper = {
  Composite: { color: "#66EEEE", fillStyle: "zigzag" },
  Decorator: { color: "#AA66AA", fillStyle: "cross-hatch" },
  Action: { color: "#EE9966", fillStyle: "dots" },
  Unknown: { color: "#FFEE00", fillStyle: "solid" },
};

export interface Props {
  config: ReturnType<typeof Config.use>;
  trans: TransFunction;
  children?: JSX.Element;
}

export type SubProps<N extends Node> = Props & {
  node: N;
  removeNodes(onlyDecorator?: true): void;
  prependDecorator(type: string): void;
  status?: keyof typeof statusMapper;
};

export function troggleNodeFoldHandler(
  node: Composite | Decorator,
  refresh: () => void
) {
  const handler: MouseEventHandler = (event) => {
    event.preventDefault();
    event.stopPropagation();
    refresh();
    if (node.fold) delete node.fold;
    else node.fold = true;
    triggerRedrawLines(event.currentTarget);
  };
  return handler;
}

const NodeSvg = styled.svg`
  overflow: visible;
  cursor: auto;
  pointer-events: auto;
  user-select: none;
  & text {
    font-weight: bold;
    user-select: text;
  }

  transition: transform 0.1s;
  &:hover {
    transform: scale(1.2);
    transition: transform 0.3s;
  }
`;

export default function NodeSvgRender({
  type,
  size,
  status: statusKey,
  children,
  onClick,
  onDragOver,
  onDrop,
}: {
  type: string;
  size: { width: number; height: number };
  children: ReactNode | string;
  status?: keyof typeof statusMapper;
  onClick?: MouseEventHandler;
  onDragOver?: DragEventHandler;
  onDrop?: DragEventHandler;
}) {
  const nodeType = getNodeType(type);
  const status = statusMapper[statusKey || ""];
  const { color, fillStyle } = nodeTypeMapper[nodeType];
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (svg == null) return;
    const options = {
      stroke: status.color || color,
      strokeLineDash: nodeType === "Decorator" ? [16, 8] : undefined,
      strokeWidth: 2,
      fill: "#FFFFFF",
      fillStyle,
      fillWeight: 2,
      roughness: 1.5,
    };
    const shape =
      nodeType === "Action"
        ? rough
            .svg(svg)
            .ellipse(
              size.width / 2,
              size.height / 2,
              size.width,
              size.height,
              options
            )
        : rough.svg(svg).rectangle(0, 0, size.width, size.height, options);
    svg.prepend(shape);
    return () => {
      svg.removeChild(shape);
    };
  }, [ref.current, size.width, size.height, color, fillStyle, status.color]);
  return (
    <NodeSvg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      width={size.width}
      height={size.height}
      onClick={onClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {typeof children === "string" ? (
        size.height <= 30 ? (
          <text x={3} y={16} fontSize={12}>
            {children}
          </text>
        ) : (
          <text x={15} y={30}>
            {children}
          </text>
        )
      ) : (
        children
      )}
    </NodeSvg>
  );
}
