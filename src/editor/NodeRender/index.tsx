import styled from "@emotion/styled";
import { useContext } from "react";

import type {
  Composite,
  Decorator,
  Node,
  Tree,
} from "../../behavior-tree/type";
import { getNodeType } from "../../behavior-tree/utils";
import { useRefresh } from "../../components/Refresh";
import Snack from "../../components/Snack";
import { setAutoSelect } from "../NodeSelector";
import Undo from "../Undo";
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
}: Omit<Props, "locked"> & { tree: Tree }) {
  const [, refresh] = useRefresh();

  const undoManager = Undo.use();
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
    setAutoSelect(nodeNew, true);
  };

  const snack = Snack.use();

  const locked = useContext(LockerContext);

  return (
    <RootContainer>
      <AutoRender
        node={tree.root}
        locked={locked}
        trans={trans}
        prependDecorator={prependDecorator}
        deliverParent={{ tree, refresh }}
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
        >
          {node.alias}
        </NodeSvgRender>
      );
  }
}

export { NodeSvgRender };
