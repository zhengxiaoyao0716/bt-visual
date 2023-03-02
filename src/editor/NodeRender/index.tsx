import styled from "@emotion/styled";
import { useContext } from "react";

import type { Action, Composite, Tree } from "../../behavior-tree/type";
import { getNodeAlias, getNodeType } from "../../behavior-tree/utils";
import { useRefresh } from "../../components/Refresh";
import { createNodeDropProps } from "../NodeDrop";
import {
  isSelected,
  setAutoSelect,
  setDeliverParent,
  useSelector,
} from "../NodeSelector";
import Undo from "../Undo";
import ActionRender from "./ActionRender";
import CompositeRender from "./CompositeRender";
import DecoratorRender from "./DecoratorRender";
import { LockerContext } from "./NodeLocker";
import NodeSvgRender, { Props, ROOT_TYPE, SubProps } from "./NodeSvgRender";
import UnknownRender from "./UnknownRender";

const RootContainer = styled.div`
  position: relative;
  text-align: center;
`;

const RootCard = styled.div`
  position: relative;
  text-align: center;
  margin: 12px 0 -24px 0;
`;

export default function NodeRender({
  tree,
  trans,
  ...props
}: Omit<Props, "locked"> & { tree: Tree }) {
  const [, refresh] = useRefresh();
  const deliverRoot = { tree, refresh };
  setDeliverParent(tree.root, deliverRoot);

  const selector = useSelector(deliverRoot, trans, refresh);
  const onSelected = selector.handle(tree);

  const undoManager = Undo.use();
  const nodeDropProps = createNodeDropProps({
    appendComposite(nodeNew) {
      const action = trans("Append Composite");
      const alias = getNodeAlias(trans, nodeNew);
      const root = tree.root;
      undoManager.execute(`${action} [${alias}]`, (redo) => {
        nodeNew.nodes.push(root);
        tree.root = nodeNew;
        redo || refresh();
        return () => {
          nodeNew.nodes.shift();
          tree.root = root;
        };
      });
      setAutoSelect(nodeNew, true);
    },
  });

  const locked = useContext(LockerContext);
  return (
    <RootContainer>
      <RootCard title={tree.name}>
        <NodeSvgRender
          locked={locked}
          trans={trans}
          type={ROOT_TYPE}
          size={{ width: 300, height: 60 }}
          onClick={onSelected}
          selected={isSelected(tree)}
          {...props}
          {...nodeDropProps}
        >
          {tree.name}
        </NodeSvgRender>
      </RootCard>
      <DecoratorRender
        node={tree.root}
        locked={locked}
        trans={trans}
        {...props}
      />
    </RootContainer>
  );
}

export function AutoRender<N extends Composite | Action>({
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
    // case "Decorator":
    //   return (
    //     <DecoratorRender node={node as unknown as Decorator} {...props}>
    //       {children}
    //     </DecoratorRender>
    //   );
    case "Action":
      return (
        <ActionRender node={node as unknown as Action} {...props}>
          {children}
        </ActionRender>
      );
    default:
      return (
        <UnknownRender node={node} {...props}>
          {children}
        </UnknownRender>
      );
  }
}

export { NodeSvgRender };
