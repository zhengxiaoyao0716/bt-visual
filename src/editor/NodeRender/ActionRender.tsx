import { styled } from "@mui/material/styles";

import type { Action } from "../../behavior-tree/type";
import { getNodeAlias } from "../../behavior-tree/utils";
import { useRefresh } from "../../components/Refresh";
import { createNodeDropProps } from "../NodeDrop";
import {
  getDeliverParent,
  isSelected,
  setAutoSelect,
  useSelector,
} from "../NodeSelector";
import Undo from "../Undo";
import NodeSvgRender, { SubProps } from "./NodeSvgRender";

const ActionCard = styled("div")`
  position: relative;
  padding: 16px;
`;

export default function ActionRender({
  node,
  locked,
  trans,
  btDefine,
  children,
  ...baseProps
}: SubProps<Action>) {
  const undoManager = Undo.use();

  const nodeDropProps = createNodeDropProps({
    prependDecorator(nodeNew) {
      const action = trans("Prepend Decorator");
      const alias = getNodeAlias(trans, nodeNew);
      const { refresh } = getDeliverParent(node);
      undoManager.execute(`${action} [${alias}]`, (redo) => {
        if (!node.deck) node.deck = [];
        node.deck.push(nodeNew);
        setAutoSelect(nodeNew, true);
        redo || refresh();
        return () => {
          setAutoSelect(node, true);
          node.deck?.pop();
        };
      });
    },
  });

  const [, refresh] = useRefresh();
  const selector = useSelector(getDeliverParent(node), trans, refresh);
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
      >
        {node.alias}
      </NodeSvgRender>
      {children}
    </ActionCard>
  );
}
