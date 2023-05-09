import autoAnimate from "@formkit/auto-animate";
import { styled } from "@mui/material/styles";
import { useEffect, useRef } from "react";

import { AutoRender } from ".";
import type { Action, Composite } from "../../behavior-tree/type";
import {
  getDecoratedNode,
  getNodeAlias,
  setDecoratedNode,
} from "../../behavior-tree/utils";
import { autoAttachKey } from "../../common/ExtValue";
import { useRefresh } from "../../components/Refresh";
import { Status, WithNodeStatus } from "../../debugger/status";
import { createNodeDropProps } from "../NodeDrop";
import {
  getDeliverParent,
  isSelected,
  setAutoSelect,
  useSelector,
} from "../NodeSelector";
import Undo from "../Undo";
import { triggerRedrawLines } from "./LineRender";
import NodeSvgRender, {
  SubProps,
  troggleNodeFoldHandler,
} from "./NodeSvgRender";

const DecoratorContainer = styled("div")`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  padding-top: 16px;
`;
const DecoratorCard = styled("div")`
  padding: 0px 8px 0 8px;
  display: flex;
  flex-direction: column;
  &.fold svg > text {
    user-select: none;
  }
`;
const DecoratorNode = styled("div")`
  margin-top: -16px;
`;

export default function DecoratorRender({
  node,
  locked,
  trans,
  btDefine,
  children,
  status,
  ...baseProps
}: SubProps<Composite | Action> & { status: Status.Value }) {
  const decorators = node.deck || [];
  setDecoratedNode(decorators, node);

  const [, refresh] = useRefresh();

  const ref = useRef<HTMLDivElement>(null);
  const selector = useSelector(getDeliverParent(node), trans, refresh);

  const undoManager = Undo.use();

  const foldHandler = troggleNodeFoldHandler(
    decorators[0],
    selector.select,
    refresh
  );

  useEffect(() => {
    ref.current && autoAnimate(ref.current);
  }, [ref]);

  return (
    <DecoratorContainer ref={ref}>
      {decorators[0]?.fold ? (
        <>
          <DecoratorCard className="fold" onDoubleClick={foldHandler}>
            {(decorators.length > 3
              ? [
                  decorators[0],
                  { type: "@......" },
                  decorators[decorators.length - 1],
                ]
              : decorators
            ).map((node, index) => (
              <WithNodeStatus key={index} defines={btDefine} node={node}>
                {(status) => (
                  <NodeSvgRender
                    status={status}
                    locked={locked}
                    trans={trans}
                    btDefine={btDefine}
                    type={node.type}
                    size={{ width: 120, height: 24 }}
                    fold={true}
                    {...baseProps}
                  >
                    {node.alias}
                  </NodeSvgRender>
                )}
              </WithNodeStatus>
            ))}
          </DecoratorCard>
        </>
      ) : (
        decorators.map((node, index) => (
          <WithNodeStatus
            key={autoAttachKey(node, node.type)}
            defines={btDefine}
            node={node}
          >
            {(status) => (
              <DecoratorCard
                title={btDefine?.Decorator[node.type]?.desc || trans(node.type)}
                onDoubleClick={foldHandler}
              >
                <NodeSvgRender
                  status={status}
                  locked={locked}
                  trans={trans}
                  btDefine={btDefine}
                  type={node.type}
                  size={{
                    width: 150,
                    height:
                      node.alias && node.alias.indexOf("\n") > 0 ? 80 : 60,
                  }}
                  selected={isSelected(node)}
                  onClick={selector.handle(node)}
                  {...baseProps}
                  {...createNodeDropProps({
                    appendComposite(nodeNew) {
                      const action = trans("Append Composite");
                      const alias = getNodeAlias(trans, nodeNew);

                      const decorated = getDecoratedNode(node);
                      const parent = getDeliverParent(decorated);
                      undoManager.execute(`${action} [${alias}]`, (redo) => {
                        const retains = decorators.splice(
                          1 + index,
                          decorators.length
                        );
                        decorated.deck = retains;
                        nodeNew.deck = decorators;
                        nodeNew.nodes.push(decorated);

                        if ("tree" in parent) {
                          parent.tree.root = nodeNew;
                          parent.refresh();
                        } else {
                          const index =
                            parent.composite.nodes.indexOf(decorated);
                          parent.composite.nodes[index] = nodeNew;
                          redo || parent.refresh();
                        }
                        setAutoSelect(nodeNew, true);
                        triggerRedrawLines(ref.current);
                        return () => {
                          decorators.push(...retains);
                          decorated.deck = decorators;
                          nodeNew.nodes.shift();

                          if ("tree" in parent) {
                            parent.tree.root = decorated;
                            parent.refresh();
                          } else {
                            const index =
                              parent.composite.nodes.indexOf(nodeNew);
                            parent.composite.nodes[index] = decorated;
                          }
                          setAutoSelect(node, true);
                          triggerRedrawLines(ref.current);
                        };
                      });
                    },
                    prependDecorator(nodeNew) {
                      const action = trans("Prepend Decorator");
                      const alias = getNodeAlias(trans, nodeNew);
                      undoManager.execute(`${action} [${alias}]`, (redo) => {
                        decorators.splice(index, 0, nodeNew);
                        setAutoSelect(nodeNew, true);
                        redo || refresh();
                        return () => {
                          decorators.splice(index, 1);
                          setAutoSelect(node, true);
                        };
                      });
                    },
                  })}
                >
                  {node.alias}
                </NodeSvgRender>
              </DecoratorCard>
            )}
          </WithNodeStatus>
        ))
      )}
      <DecoratorNode>
        <AutoRender
          node={node}
          status={status}
          locked={locked}
          trans={trans}
          btDefine={btDefine}
          {...baseProps}
        />
      </DecoratorNode>
      {children}
    </DecoratorContainer>
  );
}
