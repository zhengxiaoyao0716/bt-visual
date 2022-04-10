import {
  DragEventHandler,
  MouseEventHandler,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
} from "react";
import rough from "roughjs";
import styled from "@emotion/styled";

import type { Node, Composite, Decorator, Action } from "../behavior-tree/type";
import LineRender, {
  disableDropClass,
  DraggingData,
  LineDropArea,
  lineToParentClass,
  triggerRedrawLines,
} from "./LineRender";
import { getNodeType } from "../behavior-tree/utils";
import Config from "../storage/Config";
import { TransFunction } from "../storage/Locale";
import { createAnchorDropProps, createNodeDropProps } from "./NodeDrop";
import { useNodePropsEditor } from "./Properties";
import { useRefresh } from "../components/Refresh";
import { useUndo } from "./Undo";

const RootContainer = styled.div`
  position: relative;
  pointer-events: none;
  text-align: center;
`;

interface Props {
  config: ReturnType<typeof Config.use>;
  trans: TransFunction;
  children?: JSX.Element;
}

export default function NodeRender({
  tree,
  trans,
  ...props
}: Props & { tree: { root: Node } }) {
  const [, refresh] = useRefresh();

  const undoManager = useUndo();
  const prependDecorator = (type: string) => {
    const nodeOld = tree.root;
    const nodeNew = { type, node: nodeOld } as Decorator;
    const action = trans("Prepend Node");
    const alias = nodeNew.alias || trans(nodeNew.type);
    undoManager.execute(`${action} [${alias}]`, () => {
      tree.root = nodeNew;
      return () => {
        tree.root = nodeOld;
      };
    });
    refresh();
  };
  return (
    <RootContainer>
      <AutoRender
        node={tree.root}
        trans={trans}
        prependDecorator={prependDecorator}
        {...props}
      />
    </RootContainer>
  );
}

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
  margin: 0 8px;
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
  display: flex;
  flex-direction: column;
  &:first-of-type {
    padding: 16px 8px 0 8px;
  }

  &.fold {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 316px;
  }
  &.fold svg > text {
    user-select: none;
  }
`;
const DecoratorNode = styled.div`
  margin-top: -16px;
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

type SubProps<N extends Node> = Props & {
  node: N;
  prependDecorator(type: string): void;
  status?: keyof typeof statusMapper;
};

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

function troggleNodeFoldHandler(node: Node, refresh: () => void) {
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
  const alias = node.alias || trans(node.type);
  const { type, nodes } = node;

  const [, refresh] = useRefresh();
  const foldHandler = troggleNodeFoldHandler(node, refresh);
  const undoManager = useUndo();

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

    const node = nodes[index];
    const action = trans(
      `Move nodes ${left < anchorRect.left ? "left" : "right"}`
    );
    const alias = node.alias || trans(node.type);
    undoManager.execute(`${action} [${alias}]`, () => {
      const node = nodes.splice(index, 1)[0];
      nodes.splice(moveToIndex, 0, node);
      triggerRedrawLines(anchor);
      return () => {
        const node = nodes.splice(moveToIndex, 1)[0];
        nodes.splice(index, 0, node);
        triggerRedrawLines(anchor);
      };
    });
    refresh();
  };
  const onSwap = (index: number, swapTo: number) => {
    const anchor = anchors[index];
    const node1 = nodes[index];
    const node2 = nodes[swapTo];
    const action = trans("Swap nodes");
    const alias1 = node1.alias || trans(node1.type);
    const alias2 = node2.alias || trans(node2.type);
    undoManager.execute(`${action} [${alias1}] <-> [${alias2}]`, () => {
      nodes[index] = node2;
      nodes[swapTo] = node1;
      triggerRedrawLines(anchor);
      return () => {
        nodes[index] = node1;
        nodes[swapTo] = node2;
        triggerRedrawLines(anchor);
      };
    });
    refresh();
  };

  const anchorDropProps = node.fold
    ? null
    : createAnchorDropProps((data: DraggingData, index: number, copy) => {
        const node = copy
          ? JSON.parse(JSON.stringify(data.nodes[index]))
          : data.nodes.splice(index, 1)[0];
        const action = trans(copy ? "Copy Nodes" : "Move Nodes");
        const alias = node.alias || trans(node.type);
        undoManager.execute(`${action} [${alias}]`, (redo) => {
          if (!copy && redo) {
            data.nodes.splice(index, 1)[0];
          }
          nodes.push(node);
          triggerRedrawLines(ref.current);

          return () => {
            const node = nodes.pop() as Node;
            copy || data.nodes.splice(index, 0, node);
            triggerRedrawLines(ref.current);
          };
        });

        data.refresh();
        refresh();
      });
  const draggingRef = {
    nodes,
    refresh() {
      refresh();
      triggerRedrawLines(ref.current);
    },
  };

  const nodeDropProps = node.fold
    ? null
    : createNodeDropProps({
        appendComposite(type: string) {
          const node = { type, nodes: [] } as Composite;
          const action = trans("Append Composite");
          const alias = node.alias || trans(node.type);
          undoManager.execute(`${action} [${alias}]`, () => {
            nodes.push(node);
            triggerRedrawLines(ref.current);
            return () => {
              nodes.pop();
              triggerRedrawLines(ref.current);
            };
          });
          refresh();
        },
        appendAction(type: string) {
          const node = { type } as Action;
          const action = trans("Append Action");
          const alias = node.alias || trans(node.type);
          undoManager.execute(`${action} [${alias}]`, () => {
            nodes.push(node);
            triggerRedrawLines(ref.current);
            return () => {
              nodes.pop();
              triggerRedrawLines(ref.current);
            };
          });
          refresh();
        },
        prependDecorator,
      });

  const propsEditor = useNodePropsEditor(trans, () => refresh());

  return (
    <CompositeContainer className={lineToParentClass} ref={ref}>
      <CompositeCard
        title={trans(node.type)}
        onDoubleClick={foldHandler}
        {...anchorDropProps}
      >
        <NodeSvgRender
          type={type}
          size={svgSize}
          onClick={propsEditor.onClick.bind(null, node)}
          {...baseProps}
          {...nodeDropProps}
        >
          {alias}
        </NodeSvgRender>
      </CompositeCard>
      {node.fold ? null : (
        <CompositeNodes
          style={{
            margin: `${config.value.nodeVerticalMargin}px 8px 8px 8px`,
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
                const nodeNew = { type, node } as Decorator;
                const action = trans("Prepend Decorator");
                const alias = nodeNew.alias || trans(nodeNew.type);
                undoManager.execute(`${action} [${alias}]`, () => {
                  nodes[index] = nodeNew;
                  triggerRedrawLines(ref.current);
                  return () => {
                    nodes[index] = node;
                    triggerRedrawLines(ref.current);
                  };
                });
                refresh();
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
  const [, refresh] = useRefresh();
  const foldHandler = troggleNodeFoldHandler(node, refresh);

  const ref = useRef<HTMLDivElement>(null);
  let decorators = [];
  let iter = node;
  let prepend = prependDecorator;
  const undoManager = useUndo();
  while (iter) {
    const iterFinal = iter;
    const alias = iter.alias || trans(iter.type);
    const appendComposite = (type: string) => {
      const nodeOld = iterFinal.node;
      const nodeNew = { type, nodes: [nodeOld] } as Composite;
      const action = trans("Append Composite");
      const alias = nodeNew.alias || trans(nodeNew.type);
      undoManager.execute(`${action} [${alias}]`, () => {
        iterFinal.node = nodeNew;
        triggerRedrawLines(ref.current);
        return () => {
          iterFinal.node = nodeOld;
          triggerRedrawLines(ref.current);
        };
      });
      refresh();
    };
    const prependDecorator = prepend;
    prepend = (type: string) => {
      const nodeOld = iterFinal.node;
      const nodeNew = { type, node: nodeOld } as Decorator;
      const action = trans("Prepend Decorator");
      const alias = nodeNew.alias || trans(nodeNew.type);
      undoManager.execute(`${action} [${alias}]`, () => {
        iterFinal.node = nodeNew;
        triggerRedrawLines(ref.current);
        return () => {
          iterFinal.node = nodeOld;
          triggerRedrawLines(ref.current);
        };
      });
      refresh();
    };
    decorators.push([
      iterFinal,
      alias,
      appendComposite,
      prependDecorator,
    ] as const);
    if (getNodeType(iterFinal.node.type) !== "Decorator") break;
    iter = iter.node as Decorator;
  }

  const propsEditor = useNodePropsEditor(trans, () => refresh());

  return (
    <DecoratorContainer ref={ref}>
      {node.fold ? (
        <DecoratorCard className="fold" onDoubleClick={foldHandler}>
          {decorators.map(([node, alias, append, prepend], index) => (
            <NodeSvgRender
              key={index}
              type={node.type}
              size={{ width: 100, height: 24 }}
              {...baseProps}
            >
              {alias}
            </NodeSvgRender>
          ))}
        </DecoratorCard>
      ) : (
        decorators.map(([node, alias, append, prepend], index) => (
          <DecoratorCard
            key={index}
            title={trans(node.type)}
            onDoubleClick={foldHandler}
          >
            <NodeSvgRender
              type={node.type}
              size={{ width: 150, height: 60 }}
              onClick={propsEditor.onClick.bind(null, node)}
              {...baseProps}
              {...createNodeDropProps({
                appendComposite: append,
                prependDecorator: prepend,
              })}
            >
              {alias}
            </NodeSvgRender>
          </DecoratorCard>
        ))
      )}
      <DecoratorNode>
        <AutoRender
          node={iter.node}
          trans={trans}
          {...baseProps}
          prependDecorator={prepend}
        />
      </DecoratorNode>
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
  const alias = node.alias || trans(node.type);

  const nodeDropProps = createNodeDropProps({ prependDecorator });
  const [, refresh] = useRefresh();
  const propsEditor = useNodePropsEditor(trans, refresh);

  return (
    <ActionCard title={trans(node.type)}>
      <NodeSvgRender
        type={node.type}
        size={{ width: 120, height: 90 }}
        onClick={propsEditor.onClick.bind(null, node)}
        {...baseProps}
        {...nodeDropProps}
      >
        {alias}
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
}: SubProps<N>) {
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
