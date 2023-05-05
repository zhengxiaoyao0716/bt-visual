import { styled } from "@mui/material/styles";

import { Node } from "../../behavior-tree/type";
import NodeSvgRender, { SubProps } from "./NodeSvgRender";

const UnknownCard = styled("div")`
  position: relative;
  padding: 16px;
`;
export default function UnknownRender({
  node,
  locked,
  trans,
  btDefine,
  children,
  ...baseProps
}: SubProps<Node>) {
  return (
    <UnknownCard>
      <NodeSvgRender
        locked={locked}
        trans={trans}
        btDefine={btDefine}
        type={node.type}
        size={{ width: 100, height: 50 }}
        {...baseProps}
      >
        {node.alias}
      </NodeSvgRender>
      {children}
    </UnknownCard>
  );
}
