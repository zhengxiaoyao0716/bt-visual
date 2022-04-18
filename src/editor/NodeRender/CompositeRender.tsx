import styled from "@emotion/styled";
import { useMemo, useRef } from "react";
import AddIcon from "@mui/icons-material/Add";

import { AutoRender } from ".";
import type {
  Action,
  Composite,
  Decorator,
  Node,
} from "../../behavior-tree/type";
import { useRefresh } from "../../components/Refresh";
import { createAnchorDropProps, createNodeDropProps } from "../NodeDrop";
import { DeliverParent, isSelected, useSelector } from "../NodeSelector";
import Undo from "../Undo";
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
import Box from "@mui/material/Box";

const CompositeContainer = styled.div`
  border: 1px dashed #999;
  position: relative;
  pointer-events: none;
  margin: 0 8px;
  height: fit-content;
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
  locked,
  config,
  trans,
  btDefine,
  children,
  prependDecorator,
  deliverParent,
  ...baseProps
}: CompositeProps) {
  if (config?.value == null) return null; // never

  const ref = useRef<HTMLDivElement>(null);
  const svgSize = { width: 250, height: 100 };
  const { type, nodes } = node;

  const [, refresh] = useRefresh();
  const undoManager = Undo.use();

  const anchors: { [index: number]: HTMLElement } = useMemo(() => ({}), []);
  const moveTo = (index: number, moveToIndex: number) => {
    if (index === moveToIndex) return;

    const node = nodes[index];
    const action = trans(
      `Move nodes ${index < moveToIndex ? "left" : "right"}`
    );
    const alias = node.alias || trans(node.type);
    undoManager.execute(`${action} [${alias}]`, (redo) => {
      const node = nodes.splice(index, 1)[0];
      nodes.splice(moveToIndex, 0, node);
      redo || refresh();
      const anchor = anchors[index];
      triggerRedrawLines(anchor);
      return () => {
        const node = nodes.splice(moveToIndex, 1)[0];
        nodes.splice(index, 0, node);
        const anchor = anchors[index];
        triggerRedrawLines(anchor);
      };
    });
  };
  const onMoved = (index: number, left: number) => {
    if (left === 0) return;
    const anchor = anchors[index];
    if (anchor == null) return;
    const anchorRect = anchor.getBoundingClientRect();

    const moveToIndex =
      left < anchorRect.left
        ? findMoveToNodeIndex(left, 0, index, anchors)
        : findMoveToNodeIndex(left, index, nodes.length, anchors) - 1;
    moveTo(index, moveToIndex);
  };
  const onSwap = (index: number, swapTo: number) => {
    const anchor = anchors[index];
    const node1 = nodes[index];
    const node2 = nodes[swapTo];
    const action = trans("Swap nodes");
    const alias1 = node1.alias || trans(node1.type);
    const alias2 = node2.alias || trans(node2.type);
    undoManager.execute(`${action} [${alias1}] <-> [${alias2}]`, (redo) => {
      nodes[index] = node2;
      nodes[swapTo] = node1;
      redo || refresh();
      triggerRedrawLines(anchor);
      return () => {
        nodes[index] = node1;
        nodes[swapTo] = node2;
        triggerRedrawLines(anchor);
      };
    });
  };

  function checkUnfold() {
    node.fold && delete node.fold;
  }

  const anchorDropProps = createAnchorDropProps(
    (data: DraggingData, index: number, copy: boolean) => {
      const node = copy
        ? JSON.parse(JSON.stringify(data.nodes[index]))
        : data.nodes.splice(index, 1)[0];
      const action = trans(copy ? "Copy Nodes" : "Move Nodes");
      const alias = node.alias || trans(node.type);
      undoManager.execute(`${action} [${alias}]`, (redo) => {
        checkUnfold();
        if (!copy && redo) {
          data.nodes.splice(index, 1)[0];
        }
        nodes.push(node);
        if (!redo) {
          data.refresh();
          refresh();
        }
        triggerRedrawLines(ref.current);

        return () => {
          checkUnfold();
          const node = nodes.pop() as Node;
          copy || data.nodes.splice(index, 0, node);
          triggerRedrawLines(ref.current);
        };
      });
    }
  );
  const draggingRef = {
    nodes,
    refresh() {
      refresh();
      triggerRedrawLines(ref.current);
    },
  };

  const nodeDropProps = createNodeDropProps({
    appendComposite(type: string) {
      const node = { type, nodes: [] } as Composite;
      const action = trans("Append Composite");
      const alias = node.alias || trans(node.type);
      undoManager.execute(`${action} [${alias}]`, (redo) => {
        checkUnfold();
        nodes.push(node);
        redo || refresh();
        triggerRedrawLines(ref.current);
        return () => {
          checkUnfold();
          nodes.pop();
          triggerRedrawLines(ref.current);
        };
      });
    },
    appendAction(type: string) {
      const node = { type } as Action;
      const action = trans("Append Action");
      const alias = node.alias || trans(node.type);
      undoManager.execute(`${action} [${alias}]`, (redo) => {
        checkUnfold();
        nodes.push(node);
        redo || refresh();
        triggerRedrawLines(ref.current);
        return () => {
          checkUnfold();
          nodes.pop();
          triggerRedrawLines(ref.current);
        };
      });
    },
    prependDecorator,
  });

  const selector = useSelector(deliverParent, trans, refresh);
  const onSelected = selector.onClick.bind(null, node);

  const deliverSelf: DeliverParent = {
    composite: node,
    refresh,
    redrawLines() {
      triggerRedrawLines(ref.current);
    },
  };

  const foldHandler = troggleNodeFoldHandler(node, selector.select, refresh);

  return (
    <CompositeContainer className={lineToParentClass} ref={ref}>
      <CompositeCard
        title={btDefine?.Composite[node.type]?.desc || trans(node.type)}
        onDoubleClick={foldHandler}
        {...anchorDropProps}
      >
        <NodeSvgRender
          locked={locked}
          trans={trans}
          btDefine={btDefine}
          type={type}
          size={svgSize}
          fold={node.fold}
          selected={isSelected(node)}
          onClick={onSelected}
          {...baseProps}
          {...nodeDropProps}
        >
          {node.alias}
        </NodeSvgRender>
        {node.fold ? (
          <AddIcon
            sx={{
              position: "absolute",
              width: "100%",
              left: "50%",
              marginLeft: "-50%",
              textAlign: "center",
              bottom: "1em",
            }}
          />
        ) : null}
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
              locked={locked}
              config={config}
              trans={trans}
              btDefine={btDefine}
              prependDecorator={(type) => {
                const nodeNew = { type, node } as Decorator;
                const action = trans("Prepend Decorator");
                const alias = nodeNew.alias || trans(nodeNew.type);
                undoManager.execute(`${action} [${alias}]`, (redo) => {
                  nodes[index] = nodeNew;
                  redo || refresh();
                  triggerRedrawLines(ref.current);
                  return () => {
                    nodes[index] = node;
                    triggerRedrawLines(ref.current);
                  };
                });
              }}
              deliverParent={deliverSelf}
            >
              <LineRender
                locked={locked}
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
