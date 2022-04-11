import styled from "@emotion/styled";
import { useMemo, useRef } from "react";

import { AutoRender } from ".";
import type {
  Action,
  Composite,
  Decorator,
  Node,
} from "../../behavior-tree/type";
import { useRefresh } from "../../components/Refresh";
import { createAnchorDropProps, createNodeDropProps } from "../NodeDrop";
import { useSelector } from "../NodeSelector";
import { useUndo } from "../Undo";
import LineRender, {
  disableDropClass,
  DraggingData,
  LineDropArea,
  lineToParentClass,
  triggerRedrawLines,
} from "./LineRender";
import NodeSvgRender, {
  SubProps,
  troggleNodeFoldHandler,
} from "./NodeSvgRender";

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

interface CompositeProps extends SubProps<Composite> {
  redrawLine?: (sig: number) => void;
}

export default function CompositeRender({
  node,
  config,
  trans,
  children,
  prependDecorator,
  removeNodes,
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

  const selector = useSelector(trans, refresh);

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
          onClick={selector.onClick.bind(null, node, removeNodes)}
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
              removeNodes={(onlyDecorator) => {
                const action = trans("Remove Nodes");
                const alias = node.alias || trans(node.type);
                undoManager.execute(`${action} [${alias}]`, () => {
                  if (onlyDecorator) {
                    const decorator = nodes[index] as Decorator;
                    const node = (decorator as Decorator).node;
                    nodes[index] = node;
                    triggerRedrawLines(ref.current);
                    return () => {
                      nodes[index] = decorator;
                      triggerRedrawLines(ref.current);
                    };
                  } else {
                    const node = nodes.splice(index, 1)[0];
                    triggerRedrawLines(ref.current);
                    return () => {
                      nodes.splice(index, 0, node);
                      triggerRedrawLines(ref.current);
                    };
                  }
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
