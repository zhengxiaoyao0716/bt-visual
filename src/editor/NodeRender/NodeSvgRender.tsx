import { styled, useTheme } from "@mui/material/styles";
import {
  DragEventHandler,
  MouseEvent,
  MouseEventHandler,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import rough from "roughjs";

import { BTDefines } from "../../behavior-tree/Define";
import type { Composite, Decorator, Node } from "../../behavior-tree/type";
import { getNodeType } from "../../behavior-tree/utils";
import { Status } from "../../debugger/status";
import Config from "../../storage/Config";
import { TransFunction } from "../../storage/Locale";
import { boxSelectEventKey } from "../NodeSelector";
import { lineContainerClass, triggerRedrawLines } from "./LineRender";

const treeShape =
  '<path d="M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3z" />';
const nodeTypeMapper = {
  Composite: {
    color: "#00CC99",
    fillStyle: "zigzag",
    shape:
      '<path d="m17 16-4-4V8.82C14.16 8.4 15 7.3 15 6c0-1.66-1.34-3-3-3S9 4.34 9 6c0 1.3.84 2.4 2 2.82V12l-4 4H3v5h5v-3.05l4-4.2 4 4.2V21h5v-5h-4z"></path>',
  },
  Decorator: {
    color: "#EE9966",
    fillStyle: "cross-hatch",
    shape:
      '<path d="M19.02 10v9H5V5h9V3H5.02c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-9h-2zM17 10l.94-2.06L20 7l-2.06-.94L17 4l-.94 2.06L14 7l2.06.94zm-3.75.75L12 8l-1.25 2.75L8 12l2.75 1.25L12 16l1.25-2.75L16 12z"></path>',
  },
  Action: {
    color: "#EE99CC",
    fillStyle: "dots",
    shape:
      '<path d="M15.49 9.63c-.18-2.79-1.31-5.51-3.43-7.63-2.14 2.14-3.32 4.86-3.55 7.63 1.28.68 2.46 1.56 3.49 2.63 1.03-1.06 2.21-1.94 3.49-2.63zm-6.5 2.65c-.14-.1-.3-.19-.45-.29.15.11.31.19.45.29zm6.42-.25c-.13.09-.27.16-.4.26.13-.1.27-.17.4-.26zM12 15.45C9.85 12.17 6.18 10 2 10c0 5.32 3.36 9.82 8.03 11.49.63.23 1.29.4 1.97.51.68-.12 1.33-.29 1.97-.51C18.64 19.82 22 15.32 22 10c-4.18 0-7.85 2.17-10 5.45z"></path>',
  },
  Unknown: {
    color: "#AAAAAA",
    fillStyle: "solid",
    shape: treeShape,
  },
  Root: {
    color: "#EE99CC",
    fillStyle: "solid",
    shape: treeShape,
  },
};

export interface Props {
  locked: boolean;
  config: ReturnType<typeof Config.use>;
  trans: TransFunction;
  btDefine: BTDefines | undefined;
  children?: JSX.Element;
}

export type SubProps<N extends Node> = Props & {
  node: N;
  status: Status.Value;
};

export function troggleNodeFoldHandler(
  node: Composite | Decorator,
  onSelect: (node: Composite | Decorator | null) => void,
  refresh: () => void
) {
  const handler: MouseEventHandler = (event) => {
    event.preventDefault();
    event.stopPropagation();
    refresh();
    if (node.fold) delete node.fold;
    else node.fold = true;
    onSelect(node.fold ? null : node);
    triggerRedrawLines(event.currentTarget);
  };
  return handler;
}

const NodeSvg = styled("svg")`
  overflow: visible;
  cursor: auto;
  pointer-events: auto;
  user-select: none;
  & text {
    font-weight: bold;
    user-select: text;
  }

  transition: transform 0.1s;
  &:hover,
  &.selected {
    transform: scale(1.1);
    transition: transform 0.3s;
    z-index: 1;
  }
`;

function polygonPoints(width: number, height: number): [number, number][] {
  const wo = width / 12;
  const ho = height / 8;
  return [
    [wo, 0],
    [0, ho],
    [0, height - ho],
    [wo, height],
    [width - wo, height],
    [width, height - ho],
    [width, ho],
    [width - wo, 0],
  ];
}

export const ROOT_TYPE = "[ R O O T ]";

export default function NodeSvgRender({
  locked,
  trans,
  btDefine,
  type,
  size,
  fold,
  selected,
  children,
  onClick,
  onDragEnter,
  onDragOver,
  onDrop,
  status,
}: {
  locked: boolean;
  trans: TransFunction;
  btDefine: BTDefines | undefined;
  type: string;
  size: { width?: number; height: number };
  children?: ReactNode | string;
  fold?: true;
  selected?: boolean;
  onClick?: (event: MouseEvent | Event) => void;
  onDragEnter?: DragEventHandler;
  onDragOver?: DragEventHandler;
  onDrop?: DragEventHandler;
  status?: Status.Value;
}) {
  const nodeType = getNodeType(type);
  const {
    color,
    fillStyle,
    shape: nodeTypeShape,
  } = type === ROOT_TYPE ? nodeTypeMapper.Root : nodeTypeMapper[nodeType];

  const shape =
    nodeType === "Unknown"
      ? nodeTypeShape
      : btDefine?.[nodeType]?.[type]?.shape ?? nodeTypeShape;
  const shapeRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = shapeRef.current;
    if (svg == null) return;
    svg.innerHTML = shape;
  }, [shapeRef.current, shape]);

  const { palette } = useTheme();
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const $svg = ref.current;
    if ($svg == null) return;
    const options = {
      stroke: status?.color || color,
      strokeLineDash:
        nodeType === "Decorator" || status?.dash ? [20, 12] : undefined,
      strokeWidth: 2,
      fill: palette.background.paper,
      fillStyle,
      fillWeight: 2,
      roughness: 1.5,
    };
    const maxTextWidth = Math.max(
      size.width || 0,
      ...(Array.prototype.map.call(
        $svg.querySelectorAll("text"),
        (text: SVGTextElement) => 10 + text.clientWidth
      ) as number[])
    );
    const width = maxTextWidth;
    const height = $svg.clientHeight;
    $svg.setAttribute("width", String(width));
    const $shape =
      nodeType === "Action"
        ? rough.svg($svg).ellipse(width / 2, height / 2, width, height, options)
        : nodeType === "Decorator"
        ? rough.svg($svg).polygon(polygonPoints(width, height), options)
        : rough.svg($svg).rectangle(0, 0, width, height, options);
    onClick && $svg.addEventListener(boxSelectEventKey, onClick);
    $svg.prepend($shape);
    return () => {
      $svg.removeChild($shape);
      onClick && $svg.removeEventListener(boxSelectEventKey, onClick);
    };
  }, [
    ref.current,
    size.width,
    size.height,
    status?.color,
    fold,
    color,
    fillStyle,
    palette.mode,
  ]);

  useEffect(() => {
    const cls = status?.aniCls;
    if (!cls) return;
    const $svg = ref.current;
    if ($svg == null) return;
    const $shape = $svg.children[0];
    if ($shape == null) return;
    $shape.setAttribute("class", cls);
  }, [status?.aniCls]);

  const bgColor =
    status?.color && `${status.color}${palette.mode === "light" ? "55" : "bb"}`;
  const textPrimaryColor = palette.text.primary;
  const textSecondaryColor = palette.text.secondary;
  const alias =
    children == null
      ? [trans(type).slice(1)]
      : typeof children === "string"
      ? children.split("\n", 2)
      : null;

  return (
    <NodeSvg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      width={size.width}
      height={size.height}
      onClick={onClick}
      onDragEnter={locked ? undefined : onDragEnter}
      onDragOver={locked ? undefined : onDragOver}
      onDrop={locked ? undefined : onDrop}
      className={`${selected ? "selected node" : "node"} ${lineContainerClass}`}
      style={{
        background: bgColor
          ? `radial-gradient(${bgColor}, transparent 80%)`
          : "none",
      }}
    >
      {alias ? (
        size.height <= 30 ? (
          // node libraries
          <>
            <svg
              x={3}
              y={3}
              fill={color}
              ref={shapeRef}
              width={21}
              height={21}
              viewBox="0 0 30 30"
            />
            <text x={20} y={18} fontSize={14} fill={textPrimaryColor}>
              {alias[0]}
            </text>
          </>
        ) : (
          // node renderer
          <>
            <text x={24} y={20} fontSize={12} fill={color}>
              {trans(type)}
            </text>
            <svg
              x={6}
              y={21}
              fill={color}
              ref={shapeRef}
              width={35}
              height={35}
              viewBox="0 0 30 30"
            />
            <text x={35} y={42} fill={textPrimaryColor} fontSize={18}>
              {alias[0]}
            </text>
            {alias[1] ? (
              <text x={8} y={65} fill={textSecondaryColor} fontSize={16}>
                {alias[1]}
              </text>
            ) : null}
            {selected ? (
              <svg x="80%" y="0" fill={color}>
                <polygon points="38.2578,4.5882 13.6995,23.4648 0.2589,12.8583 0,17.7765 13.3437,33.9351 38.5233,9.4998" />
              </svg>
            ) : null}
          </>
        )
      ) : (
        children
      )}
    </NodeSvg>
  );
}
