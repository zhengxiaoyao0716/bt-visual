import styled from "@emotion/styled";
import { useRef } from "react";

import { AutoRender } from ".";
import type { Composite, Decorator } from "../../behavior-tree/type";
import { getNodeType } from "../../behavior-tree/utils";
import { useRefresh } from "../../components/Refresh";
import { createNodeDropProps } from "../NodeDrop";
import { useSelector } from "../NodeSelector";
import { useUndo } from "../Undo";
import { triggerRedrawLines } from "./LineRender";
import NodeSvgRender, {
  SubProps,
  troggleNodeFoldHandler,
} from "./NodeSvgRender";

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

export default function DecoratorRender({
  node,
  locked,
  trans,
  btDefine,
  children,
  prependDecorator,
  removeNodes,
  ...baseProps
}: SubProps<Decorator>) {
  const [, refresh] = useRefresh();
  const foldHandler = troggleNodeFoldHandler(node, refresh);

  const ref = useRef<HTMLDivElement>(null);
  let decorators = [];
  let iter = node;
  let prepend = prependDecorator;
  let remove = removeNodes.bind(null, true);
  const undoManager = useUndo();
  while (iter) {
    const iterFinal = iter;
    const appendComposite = (type: string) => {
      const nodeOld = iterFinal.node;
      const nodeNew = { type, nodes: [nodeOld] } as Composite;
      const action = trans("Append Composite");
      const alias = nodeNew.alias || trans(nodeNew.type);
      undoManager.execute(`${action} [${alias}]`, (redo) => {
        iterFinal.node = nodeNew;
        redo || refresh();
        triggerRedrawLines(ref.current);
        return () => {
          iterFinal.node = nodeOld;
          triggerRedrawLines(ref.current);
        };
      });
    };
    const prependDecorator = prepend;
    prepend = (type: string) => {
      const nodeOld = iterFinal.node;
      const nodeNew = { type, node: nodeOld } as Decorator;
      const action = trans("Prepend Decorator");
      const alias = nodeNew.alias || trans(nodeNew.type);
      undoManager.execute(`${action} [${alias}]`, (redo) => {
        iterFinal.node = nodeNew;
        redo || refresh();
        triggerRedrawLines(ref.current);
        return () => {
          iterFinal.node = nodeOld;
          triggerRedrawLines(ref.current);
        };
      });
    };
    const removeNodes = remove;
    remove = () => {
      const action = trans("Remove Nodes");
      const decorator = iterFinal.node as Decorator;
      const alias = decorator.alias || trans(decorator.type);
      undoManager.execute(`${action} [${alias}]`, (redo) => {
        iterFinal.node = decorator.node;
        redo || refresh();
        triggerRedrawLines(ref.current);
        return () => {
          iterFinal.node = decorator;
          triggerRedrawLines(ref.current);
        };
      });
    };
    decorators.push([
      iterFinal,
      appendComposite,
      prependDecorator,
      removeNodes,
    ] as const);
    if (getNodeType(iterFinal.node.type) !== "Decorator") break;
    iter = iter.node as Decorator;
  }

  const selector = useSelector(trans, refresh);

  return (
    <DecoratorContainer ref={ref}>
      {node.fold ? (
        <DecoratorCard className="fold" onDoubleClick={foldHandler}>
          {decorators.map(([node], index) => (
            <NodeSvgRender
              locked={locked}
              trans={trans}
              btDefine={btDefine}
              key={index}
              type={node.type}
              size={{ width: 100, height: 24 }}
              fold={true}
              {...baseProps}
            >
              {node.alias}
            </NodeSvgRender>
          ))}
        </DecoratorCard>
      ) : (
        decorators.map(([node, append, prepend, remove], index) => (
          <DecoratorCard
            key={index}
            title={btDefine?.Decorator[node.type]?.desc || trans(node.type)}
            onDoubleClick={foldHandler}
          >
            <NodeSvgRender
              locked={locked}
              trans={trans}
              btDefine={btDefine}
              type={node.type}
              size={{ width: 150, height: 60 }}
              onClick={selector.onClick.bind(null, { node, remove })}
              {...baseProps}
              {...createNodeDropProps({
                appendComposite: append,
                prependDecorator: prepend,
              })}
            >
              {node.alias}
            </NodeSvgRender>
          </DecoratorCard>
        ))
      )}
      <DecoratorNode>
        <AutoRender
          node={iter.node}
          locked={locked}
          trans={trans}
          btDefine={btDefine}
          {...baseProps}
          prependDecorator={prepend}
          removeNodes={removeNodes}
        />
      </DecoratorNode>
      {children}
    </DecoratorContainer>
  );
}
