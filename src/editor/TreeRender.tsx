import Define from "../behavior-tree/Define";
import type { Tree } from "../behavior-tree/type";
import Config from "../storage/Config";
import { TransFunction } from "../storage/Locale";
import DraftPaper from "./DraftPaper";
import NodeRender from "./NodeRender";
import NodeSelector from "./NodeSelector";

interface Props {
  readonly?: true;
  tree: Tree;
  config: ReturnType<typeof Config.use>;
  trans: TransFunction;
}

export default function TreeRender({ tree, config, trans, readonly }: Props) {
  const define = Define.use();
  return (
    <NodeSelector>
      <DraftPaper key={tree.name} readonly={readonly}>
        <NodeRender
          tree={tree}
          config={config}
          trans={trans}
          btDefine={define?.value}
        />
      </DraftPaper>
    </NodeSelector>
  );
}
