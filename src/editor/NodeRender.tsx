import {
  DragEventHandler,
  MouseEventHandler,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import rough from "roughjs";
import styled from "@emotion/styled";

import { Node, Composite, Decorator, Action } from "../behavior-tree/define";
import LineRender, {
  disableDropClass,
  DraggingData,
  LineDropArea,
  lineToParentClass,
  triggerRedrawLiens,
} from "./LineRender";
import { getNodeType } from "../behavior-tree/utils";
import Config from "../storage/Config";
import { TransFunction } from "../storage/Locale";
import { createAnchorDropProps, createNodeDropProps } from "./NodeDrop";
import { useNodePropsEditor } from "./Properties";
import { useRefresh } from "../components/Refresh";

interface Props<N extends Node> {
  node: N;
  config: ReturnType<typeof Config.use>;
  trans: TransFunction;
  prependDecorator(type: string): void;
  children?: JSX.Element;
}

export default function NodeRender<N extends Node>(props: Props<N>) {
  return AutoRender(props);
}

const statusMapper = {
  success: { color: "#00FF00" },
  failure: { color: "#FF0000" },
  running: { color: "#0000FF" },
  "": { color: "#000000" },
};

const nodeTypeColor = {
  Composite: "#66EEEE",
  Decorator: "#AA66AA",
  Action: "#EE9966",
  Unknown: "#FFEE00",
};

interface BaseProps {
  type: string;
  size: { width: number; height: number };
  status?: keyof typeof statusMapper;
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
const CompositeContainer = styled.div`
  border: 1px dashed #999;
  position: relative;
  pointer-events: none;
  & & {
    margin: 0 8px;
  }
`;
const CompositeCard = styled.div`
  position: relative;
  padding: 16px;
  text-align: center;
`;
const CompositeNodes = styled.div`
  display: flex;
  justify-content: center;
  position: relative;
  & > div.${disableDropClass} div * {
    pointer-events: none;
  }
`;
const DecoratorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
`;
const DecoratorCard = styled.div`
  padding: 16px 8px 0 8px;
  display: flex;
  flex-direction: column;
  /* justify-content: center; */
  margin-bottom: -16px;

  &.fold {
    flex-direction: row;
    flex-wrap: wrap;
    max-width: 316px;
  }
  &.fold svg > text {
    user-select: none;
  }
`;

const ActionCard = styled.div`
  position: relative;
  padding: 16px;
`;

export function NodeSvgRender({
  type,
  size,
  status: statusKey,
  children,
  onClick,
  onDragOver,
  onDrop,
}: BaseProps & {
  children: ReactNode | string;
  onClick?: MouseEventHandler;
  onDragOver?: DragEventHandler;
  onDrop?: DragEventHandler;
}) {
  const nodeType = getNodeType(type);
  const status = statusMapper[statusKey || ""];
  const color = statusKey ? status.color : nodeTypeColor[nodeType];
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (svg == null) return;
    const options = {
      stroke: color,
      strokeLineDash: nodeType === "Decorator" ? [16, 8] : undefined,
      strokeWidth: 2,
      fill: "#FFFFFF",
      fillStyle:
        nodeType === "Decorator"
          ? "cross-hatch"
          : nodeType === "Action"
          ? "dots"
          : "zigzag",
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
  }, [ref.current, size.width, size.height, color]);
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

type SubProps<N extends Node> = Omit<
  Props<N> & BaseProps,
  "type" | "label" | "size" | "small"
> & { prependDecorator(type: string): void };

interface CompositeProps extends SubProps<Composite> {
  redrawLine?: (sig: number) => void;
}
function findMoveToNodeIndex(
  left: number,
  min: number,
  max: number,
  anchors: { [index: number]: HTMLElement }
): number {
  for (let index = min; index < max; index++) {
    const anchorLeft = anchors[index].getBoundingClientRect().left;
    if (left < anchorLeft) {
      return index;
    }
  }
  return max;
}

function useNodeFold() {
  const [fold, setFold] = useState(false);
  const handler: MouseEventHandler = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setFold(!fold);
    triggerRedrawLiens(event.currentTarget);
  };
  return [fold, handler] as const;
}

function CompositeRender({
  node,
  config,
  trans,
  children,
  prependDecorator,
  ...baseProps
}: CompositeProps) {
  if (config?.value == null) return null; // never

  const ref = useRef<HTMLDivElement>(null);
  const svgSize = { width: 250, height: 100 };
  const { type, nodes } = node;

  const [fold, foldHandler] = useNodeFold();

  const refresh = useRefresh();
  const anchors: { [index: number]: HTMLElement } = useMemo(() => ({}), []);
  const onMoved = (index: number, left: number) => {
    if (left === 0) return;
    const anchor = anchors[index];
    if (anchor == null) return;
    const anchorRect = anchor.getBoundingClientRect();

    const moveToIndex =
      left < anchorRect.left
        ? findMoveToNodeIndex(left, 0, index, anchors)
        : findMoveToNodeIndex(left, index, nodes.length, anchors) - 1;
    if (index === moveToIndex) return;

    // move
    const node = nodes.splice(index, 1)[0];
    nodes.splice(moveToIndex, 0, node);
    refresh();
    triggerRedrawLiens(anchor);
  };
  const onSwap = (index: number, swapTo: number) => {
    const anchor = anchors[index];
    // swap
    const node = nodes[index];
    nodes[index] = nodes[swapTo];
    nodes[swapTo] = node;
    refresh();
    triggerRedrawLiens(anchor);
  };

  const anchorDropProps = createAnchorDropProps(
    (data: DraggingData, index: number, copy) => {
      const node = copy
        ? JSON.parse(JSON.stringify(data.nodes[index]))
        : data.nodes.splice(index, 1)[0];
      nodes.push(node);
      data.refresh();
      refresh();
      ref.current && triggerRedrawLiens(ref.current);
    }
  );
  const draggingRef = {
    nodes,
    refresh() {
      refresh();
      ref.current && triggerRedrawLiens(ref.current);
    },
  };

  const nodeDropProps = createNodeDropProps({
    appendComposite(type: string) {
      nodes.push({ type, nodes: [] } as Composite);
      refresh();
      ref.current && triggerRedrawLiens(ref.current);
    },
    appendAction(type: string) {
      nodes.push({ type } as Action);
      refresh();
      ref.current && triggerRedrawLiens(ref.current);
    },
    prependDecorator,
  });

  const propsEditor = useNodePropsEditor(trans, () => refresh());

  return (
    <CompositeContainer className={lineToParentClass} ref={ref}>
      <CompositeCard onDoubleClick={foldHandler} {...anchorDropProps}>
        <NodeSvgRender
          type={type}
          size={svgSize}
          onClick={propsEditor.onClick.bind(null, node)}
          {...baseProps}
          {...nodeDropProps}
        >
          {node.alias || trans(type)}
        </NodeSvgRender>
      </CompositeCard>
      {fold || (
        <CompositeNodes
          style={{
            margin: `${config.value.nodeVerticalMargin}px 8px`,
          }}
        >
          <LineDropArea onMoved={onMoved} />
          {nodes.map((node, index) => (
            <AutoRender
              key={index}
              node={node}
              config={config}
              trans={trans}
              prependDecorator={(type) => {
                nodes[index] = { type, node } as Decorator;
                refresh();
                triggerRedrawLiens(anchors[index]);
              }}
            >
              <LineRender
                index={index}
                total={nodes.length}
                anchors={anchors}
                onSwrap={onSwap}
                redrawSig={refresh}
                draggingRef={draggingRef}
                {...svgSize}
              />
            </AutoRender>
          ))}
        </CompositeNodes>
      )}
      {children}
    </CompositeContainer>
  );
}

function DecoratorRender({
  node,
  trans,
  children,
  prependDecorator,
  ...baseProps
}: SubProps<Decorator>) {
  const [fold, foldHandler] = useNodeFold();
  const refresh = useRefresh();
  const ref = useRef<HTMLDivElement>(null);
  let decorators = [];
  let iter = node;
  let prepend = prependDecorator;
  while (iter) {
    const iterFinal = iter;
    const appendComposite = (type: string) => {
      const node = iterFinal.node;
      iterFinal.node = { type, nodes: [node] } as Composite;
      refresh();
      ref.current && triggerRedrawLiens(ref.current);
    };
    const prependDecorator = prepend;
    prepend = (type: string) => {
      const node = iterFinal.node;
      iterFinal.node = { type, node } as Decorator;
      refresh();
      ref.current && triggerRedrawLiens(ref.current);
    };
    decorators.push([iterFinal, appendComposite, prependDecorator] as const);
    if (getNodeType(iterFinal.node.type) !== "Decorator") break;
    iter = iter.node as Decorator;
  }

  const propsEditor = useNodePropsEditor(trans, () => refresh());

  return (
    <DecoratorContainer>
      <DecoratorCard
        className={fold ? "fold" : undefined}
        onDoubleClick={foldHandler}
        ref={ref}
      >
        {decorators.map(([node, append, prepend], index) =>
          fold ? (
            <NodeSvgRender
              key={index}
              type={node.type}
              size={{ width: 100, height: 24 }}
              {...baseProps}
            >
              {node.alias || trans(node.type)}
            </NodeSvgRender>
          ) : (
            <NodeSvgRender
              key={index}
              type={node.type}
              size={{ width: 150, height: 60 }}
              onClick={propsEditor.onClick.bind(null, node)}
              {...baseProps}
              {...createNodeDropProps({
                appendComposite: append,
                prependDecorator: prepend,
              })}
            >
              {node.alias || trans(node.type)}
            </NodeSvgRender>
          )
        )}
      </DecoratorCard>
      <AutoRender
        node={iter.node}
        trans={trans}
        {...baseProps}
        prependDecorator={prepend}
      />
      {children}
    </DecoratorContainer>
  );
}

function ActionRender({
  node,
  trans,
  children,
  prependDecorator,
  ...baseProps
}: SubProps<Action>) {
  const nodeDropProps = createNodeDropProps({ prependDecorator });
  const refresh = useRefresh();
  const propsEditor = useNodePropsEditor(trans, refresh);

  return (
    <ActionCard>
      <NodeSvgRender
        type={node.type}
        size={{ width: 120, height: 90 }}
        onClick={propsEditor.onClick.bind(null, node)}
        {...baseProps}
        {...nodeDropProps}
      >
        {node.alias || trans(node.type)}
      </NodeSvgRender>
      {children}
    </ActionCard>
  );
}

function AutoRender<N extends Node>({
  node,
  config,
  trans,
  prependDecorator,
  children,
}: Props<N>) {
  switch (getNodeType(node.type)) {
    case "Composite":
      return (
        <CompositeRender
          node={node as unknown as Composite}
          config={config}
          trans={trans}
          prependDecorator={prependDecorator}
        >
          {children}
        </CompositeRender>
      );
    case "Decorator":
      return (
        <DecoratorRender
          node={node as unknown as Decorator}
          config={config}
          trans={trans}
          prependDecorator={prependDecorator}
        >
          {children}
        </DecoratorRender>
      );
    case "Action":
      return (
        <ActionRender
          node={node}
          config={config}
          trans={trans}
          prependDecorator={prependDecorator}
        >
          {children}
        </ActionRender>
      );
    default:
      return (
        <NodeSvgRender
          type="unknown"
          size={{ width: 100, height: 50 }}
          status="failure"
        >
          {node.alias || trans(node.type)}
        </NodeSvgRender>
      );
  }
}
