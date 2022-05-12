import { BTDefines } from "../behavior-tree/Define";
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
  define: BTDefines | undefined;
  trans: TransFunction;
}

export default function TreeRender({
  tree,
  config,
  define,
  trans,
  readonly,
}: Props) {
  return (
    <NodeSelector>
      <DraftPaper key={tree.name} readonly={readonly}>
        <NodeRender
          tree={tree}
          config={config}
          trans={trans}
          btDefine={define}
        />
      </DraftPaper>
    </NodeSelector>
  );
}
