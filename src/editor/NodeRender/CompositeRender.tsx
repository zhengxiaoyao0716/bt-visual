import { useAutoAnimate } from "@formkit/auto-animate/react";
import AddIcon from "@mui/icons-material/Add";
import { styled } from "@mui/material/styles";
import { useMemo, useRef } from "react";

import type { Composite, Node } from "../../behavior-tree/type";
import { getNodeAlias } from "../../behavior-tree/utils";
import { autoAttachKey } from "../../common/ExtValue";
import { useRefresh } from "../../components/Refresh";
import { WithNodeStatus } from "../../debugger/status";
import { createAnchorDropProps, createNodeDropProps } from "../NodeDrop";
import {
  getDeliverParent,
  isSelected,
  setAutoSelect,
  setDeliverParent,
  useSelector,
} from "../NodeSelector";
import Undo from "../Undo";
import DecoratorRender from "./DecoratorRender";
import LineRender, {
  DraggingData,
  LineDropArea,
  disableDropClass,
  lineToParentClass,
  triggerRedrawLines,
} from "./LineRender";
import NodeSvgRender, {
  SubProps,
  troggleNodeFoldHandler,
} from "./NodeSvgRender";

const CompositeContainer = styled("div")`
  border: 1px dashed #999;
  position: relative;
  pointer-events: none;
  margin: 0 8px;
`;
const CompositeCard = styled("div")`
  position: relative;
  padding: 16px;
  text-align: center;
`;
const CompositeNodes = styled("div")`
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
  status,
  locked,
  config,
  trans,
  btDefine,
  children,
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
    const alias = getNodeAlias(trans, node);
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
    const alias1 = getNodeAlias(trans, node1);
    const alias2 = getNodeAlias(trans, node2);
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
      const alias = getNodeAlias(trans, node);
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
      setAutoSelect(node, true);
    }
  );
  const draggingRef = {
    nodes,
    refresh() {
      refresh();
      triggerRedrawLines(ref.current);
    },
  };

  const selector = useSelector(getDeliverParent(node), trans, refresh);
  const onSelected = selector.handle(node);

  setDeliverParent(nodes, {
    composite: node,
    refresh,
    redrawLines() {
      triggerRedrawLines(ref.current);
    },
  });

  const nodeDropProps = createNodeDropProps({
    appendComposite(nodeNew) {
      const action = trans("Append Composite");
      const alias = getNodeAlias(trans, nodeNew);
      undoManager.execute(`${action} [${alias}]`, (redo) => {
        checkUnfold();
        nodes.push(nodeNew);
        setAutoSelect(nodeNew, true);
        redo || refresh();
        triggerRedrawLines(ref.current);
        return () => {
          checkUnfold();
          nodes.pop();
          setAutoSelect(node, true);
          triggerRedrawLines(ref.current);
        };
      });
    },
    appendAction(nodeNew) {
      const action = trans("Append Action");
      const alias = getNodeAlias(trans, nodeNew);
      undoManager.execute(`${action} [${alias}]`, (redo) => {
        checkUnfold();
        nodes.push(nodeNew);
        setAutoSelect(nodeNew, true);
        redo || refresh();
        triggerRedrawLines(ref.current);
        return () => {
          checkUnfold();
          nodes.pop();
          setAutoSelect(node, true);
          triggerRedrawLines(ref.current);
        };
      });
    },
    prependDecorator(nodeNew) {
      const action = trans("Prepend Decorator");
      const alias = getNodeAlias(trans, nodeNew);
      const { refresh } = getDeliverParent(node);
      undoManager.execute(`${action} [${alias}]`, (redo) => {
        node.deck.push(nodeNew);
        setAutoSelect(nodeNew, true);
        redo || refresh();
        return () => {
          node.deck.pop();
          setAutoSelect(node, true);
        };
      });
    },
  });

  const foldHandler = troggleNodeFoldHandler(node, selector.select, refresh);
  const [animateRef] = useAutoAnimate();

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
          status={status}
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
          ref={animateRef}
        >
          <LineDropArea onMoved={onMoved} />
          {nodes.map((node, index) => (
            <WithNodeStatus
              key={autoAttachKey(node, node.type)}
              defines={btDefine}
              node={WithNodeStatus.DeckOrNode(node)}
            >
              {(status) => (
                <DecoratorRender
                  node={node}
                  status={status}
                  locked={locked}
                  config={config}
                  trans={trans}
                  btDefine={btDefine}
                >
                  <LineRender
                    status={status}
                    locked={locked}
                    index={index}
                    total={nodes.length}
                    anchors={anchors}
                    onSwrap={onSwap}
                    redrawSig={refresh}
                    draggingRef={draggingRef}
                    {...svgSize}
                  />
                </DecoratorRender>
              )}
            </WithNodeStatus>
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
