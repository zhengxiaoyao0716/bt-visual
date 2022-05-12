import Define from "../behavior-tree/Define";
import Loading from "../components/Loading";
import { LockerContext } from "../editor/NodeRender/NodeLocker";
import TreeRender from "../editor/TreeRender";
import DebugService from "../service/DebugService";
import Config from "../storage/Config";
import { useTrans } from "../storage/Locale";
import TreeSelector from "./TreeSelector";

export default function Workspace() {
  const config = Config.use();
  const define = Define.use();
  const trans = useTrans();

  const [{ treeGroups, tree }, manager, _dispatch] = DebugService.use()!;
  if (treeGroups == null) return <Loading />;

  if (tree == null) {
    return <TreeSelector treeGroups={treeGroups} manager={manager} />;
  }

  return (
    <LockerContext.Provider value={true}>
      <TreeRender
        tree={tree}
        config={config}
        define={define?.value}
        trans={trans}
        readonly={true}
      />
    </LockerContext.Provider>
  );
}
