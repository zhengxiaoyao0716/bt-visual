import styled from "@emotion/styled";
import { useContext } from "react";

import type { Composite, Decorator, Node } from "../../behavior-tree/type";
import { getNodeType } from "../../behavior-tree/utils";
import { useRefresh } from "../../components/Refresh";
import Snack from "../../components/Snack";
import { useUndo } from "../Undo";
import ActionRender from "./ActionRender";
import CompositeRender from "./CompositeRender";
import DecoratorRender from "./DecoratorRender";
import { LockerContext } from "./NodeLocker";
import NodeSvgRender, { Props, SubProps } from "./NodeSvgRender";

const RootContainer = styled.div`
  position: relative;
  text-align: center;
`;

export default function NodeRender({
  tree,
  trans,
  ...props
}: Omit<Props, "locked"> & { tree: { root: Node } }) {
  const [, refresh] = useRefresh();

  const undoManager = useUndo();
  const prependDecorator = (type: string) => {
    const nodeOld = tree.root;
    const nodeNew = { type, node: nodeOld } as Decorator;
    const action = trans("Prepend Node");
    const alias = nodeNew.alias || trans(nodeNew.type);
    undoManager.execute(`${action} [${alias}]`, (redo) => {
      tree.root = nodeNew;
      redo || refresh();
      return () => {
        tree.root = nodeOld;
      };
    });
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
    undoManager.execute(`${action} [${alias}]`, (redo) => {
      tree.root = decorator.node;
      redo || refresh();
      return () => {
        tree.root = decorator;
      };
    });
  };

  const locked = useContext(LockerContext);

  return (
    <RootContainer>
      <AutoRender
        node={tree.root}
        locked={locked}
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
  children,
  ...props
}: SubProps<N>) {
  switch (getNodeType(node.type)) {
    case "Composite":
      return (
        <CompositeRender node={node as unknown as Composite} {...props}>
          {children}
        </CompositeRender>
      );
    case "Decorator":
      return (
        <DecoratorRender node={node as unknown as Decorator} {...props}>
          {children}
        </DecoratorRender>
      );
    case "Action":
      return (
        <ActionRender node={node} {...props}>
          {children}
        </ActionRender>
      );
    default:
      return (
        <NodeSvgRender
          locked={props.locked}
          trans={props.trans}
          btDefine={props.btDefine}
          type="unknown"
          size={{ width: 100, height: 50 }}
          status="failure"
        >
          {node.alias}
        </NodeSvgRender>
      );
  }
}

export { NodeSvgRender };
