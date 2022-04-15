import Define from "../behavior-tree/Define";
import type { Node } from "../behavior-tree/type";
import Config from "../storage/Config";
import { TransFunction } from "../storage/Locale";
import DraftPaper from "./DraftPaper";
import NodeRender from "./NodeRender";

interface Props {
  readonly?: true;
  tree: { name: string; root: Node };
  config: ReturnType<typeof Config.use>;
  trans: TransFunction;
}

export default function TreeRender({ tree, config, trans, readonly }: Props) {
  const define = Define.use();
  return (
    <DraftPaper key={tree.name} readonly={readonly}>
      <NodeRender
        tree={tree}
        config={config}
        trans={trans}
        btDefine={define?.value}
      />
    </DraftPaper>
  );
}
