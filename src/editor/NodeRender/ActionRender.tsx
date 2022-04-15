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
  locked,
  trans,
  btDefine,
  children,
  prependDecorator,
  removeNodes,
  ...baseProps
}: SubProps<Action>) {
  const nodeDropProps = createNodeDropProps({ prependDecorator });
  const [, refresh] = useRefresh();
  const selector = useSelector(trans, refresh);
  const selected = selector.onClick.bind(null, { node, remove: removeNodes });

  return (
    <ActionCard title={btDefine?.Action[node.type]?.desc || trans(node.type)}>
      <NodeSvgRender
        locked={locked}
        trans={trans}
        btDefine={btDefine}
        type={node.type}
        size={{ width: 120, height: 90 }}
        onClick={selected}
        {...baseProps}
        {...nodeDropProps}
      >
        {node.alias}
      </NodeSvgRender>
      {children}
    </ActionCard>
  );
}
