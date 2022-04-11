import styled from "@emotion/styled";

import type { Composite, Decorator, Node } from "../../behavior-tree/type";
import { getNodeType } from "../../behavior-tree/utils";
import { useRefresh } from "../../components/Refresh";
import Snack from "../../components/Snack";
import { useUndo } from "../Undo";
import ActionRender from "./ActionRender";
import CompositeRender from "./CompositeRender";
import DecoratorRender from "./DecoratorRender";
import NodeSvgRender, { Props, SubProps } from "./NodeSvgRender";

const RootContainer = styled.div`
  position: relative;
  pointer-events: none;
  text-align: center;
`;

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

  const snack = Snack.use();
  const removeNodes = (onlyDecorator?: boolean) => {
    if (!onlyDecorator) {
      snack.show(trans("The root node is forbidden to be removed"));
      return;
    }
    const decorator = tree.root as Decorator;
    const action = trans("Remove Nodes");
    const alias = decorator.alias || trans(decorator.type);
    undoManager.execute(`${action} [${alias}]`, () => {
      tree.root = decorator.node;
      return () => {
        tree.root = decorator;
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
        removeNodes={removeNodes}
        {...props}
      />
    </RootContainer>
  );
}

export function AutoRender<N extends Node>({
  node,
  config,
  trans,
  prependDecorator,
  removeNodes,
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
          removeNodes={removeNodes}
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
          removeNodes={removeNodes}
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
          removeNodes={removeNodes}
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

export { NodeSvgRender };