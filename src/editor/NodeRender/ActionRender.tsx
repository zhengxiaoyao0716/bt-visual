import styled from "@emotion/styled";

import type { Action } from "../../behavior-tree/type";
import { useRefresh } from "../../components/Refresh";
import { createNodeDropProps } from "../NodeDrop";
import { isSelected, useSelector } from "../NodeSelector";
import NodeSvgRender, { SubProps } from "./NodeSvgRender";

const ActionCard = styled.div`
  position: relative;
  padding: 16px;
`;

export default function ActionRender({
  node,
  locked,
  trans,
  btDefine,
  children,
  prependDecorator,
  deliverParent,
  ...baseProps
}: SubProps<Action>) {
  const nodeDropProps = createNodeDropProps({ prependDecorator });
  const [, refresh] = useRefresh();
  const selector = useSelector(deliverParent, trans, refresh);
  const onSelected = selector.handle(node);

  return (
    <ActionCard title={btDefine?.Action[node.type]?.desc || trans(node.type)}>
      <NodeSvgRender
        locked={locked}
        trans={trans}
        btDefine={btDefine}
        type={node.type}
        size={{ width: 120, height: 90 }}
        selected={isSelected(node)}
        onClick={onSelected}
        {...baseProps}
        {...nodeDropProps}
        node={node}
      >
        {node.alias}
      </NodeSvgRender>
      {children}
    </ActionCard>
  );
}
