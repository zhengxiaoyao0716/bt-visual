import styled from "@emotion/styled";

import type { Action } from "../../behavior-tree/type";
import { useRefresh } from "../../components/Refresh";
import { createNodeDropProps } from "../NodeDrop";
import { useSelector } from "../NodeSelector";
import NodeSvgRender, { SubProps } from "./NodeSvgRender";

const ActionCard = styled.div`
  position: relative;
  padding: 16px;
`;

export default function ActionRender({
  node,
  trans,
  children,
  prependDecorator,
  removeNodes,
  ...baseProps
}: SubProps<Action>) {
  const alias = node.alias || trans(node.type);

  const nodeDropProps = createNodeDropProps({ prependDecorator });
  const [, refresh] = useRefresh();
  const selector = useSelector(trans, refresh);

  return (
    <ActionCard title={trans(node.type)}>
      <NodeSvgRender
        type={node.type}
        size={{ width: 120, height: 90 }}
        onClick={selector.onClick.bind(null, node, removeNodes)}
        {...baseProps}
        {...nodeDropProps}
      >
        {alias}
      </NodeSvgRender>
      {children}
    </ActionCard>
  );
}
