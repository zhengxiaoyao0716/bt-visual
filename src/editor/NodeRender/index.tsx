import { styled } from "@mui/material/styles";
import { useContext, useEffect } from "react";

import type { Action, Composite, Tree } from "../../behavior-tree/type";
import { getNodeAlias, getNodeType } from "../../behavior-tree/utils";
import { useRefresh } from "../../components/Refresh";
import { useNodeStatus } from "../../debugger";
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
import { lineContainerClass } from "./LineRender";
import { LockerContext } from "./NodeLocker";
import NodeSvgRender, { Props, ROOT_TYPE, SubProps } from "./NodeSvgRender";
import UnknownRender from "./UnknownRender";

const RootContainer = styled("div")`
  position: relative;
  text-align: center;

  & .${lineContainerClass} g.line > path {
    stroke-dasharray: 12 20;
  }
  &.animate .${lineContainerClass} g.line.animate > path {
    animation: line-dash 1s infinite linear;
  }
  @keyframes line-dash {
    to {
      stroke-dashoffset: -64;
    }
  }
`;

const RootCard = styled("div")`
  position: relative;
  text-align: center;
  margin: 12px 0 -24px 0;
`;

export default function NodeRender({
  tree,
  animate,
  trans,
  ...props
}: Omit<Props, "locked"> & { tree: Tree; animate?: true }) {
  const [, refresh] = useRefresh();
  const deliverRoot = { tree, refresh };
  setDeliverParent(tree.root, deliverRoot);

  const selector = useSelector(deliverRoot, trans, refresh);
  const onSelected = selector.handle(tree);
  // 渲染不同的树时清空选中
  useEffect(() => {
    return () => selector.select(null);
  }, [tree.name]);

  const undoManager = Undo.use();
  const nodeDropProps = createNodeDropProps({
    appendComposite(nodeNew) {
      const action = trans("Append Composite");
      const alias = getNodeAlias(trans, nodeNew);
      const root = tree.root;
      nodeNew.nodes.push(root);
      undoManager.execute(`${action} [${alias}]`, (redo) => {
        tree.root = nodeNew;
        setAutoSelect(nodeNew, true);
        redo || refresh();
        return () => {
          tree.root = root;
          setAutoSelect(root, true);
        };
      });
    },
  });

  const locked = useContext(LockerContext);
  const status = useNodeStatus(props.btDefine, tree.root);

  return (
    <RootContainer className={animate ? "animate" : undefined}>
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
        status={status}
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
