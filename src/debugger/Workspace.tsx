import { useEffect } from "react";
import Define from "../behavior-tree/Define";
import Loading from "../components/Loading";
import { LockerContext } from "../editor/NodeRender/NodeLocker";
import TreeRender from "../editor/TreeRender";
import DebugService from "../service/DebugService";
import Config from "../storage/Config";
import { useTrans } from "../storage/Locale";
import TreeSelector from "./TreeSelector";

export default function Workspace({
  groupId,
  treeId,
  select,
}: {
  groupId: string;
  treeId: string;
  select(groupId: string, treeId: string): void;
}) {
  const config = Config.use();
  const define = Define.use();
  const trans = useTrans();

  const [{ treeGroups, tree }, manager, _dispatch] = DebugService.use()!;

  useEffect(() => {
    if (groupId && treeId) manager.loadTree(groupId, treeId);
  }, [groupId, treeId]);

  if (treeGroups == null) return <Loading />;

  if (tree == null) {
    return <TreeSelector treeGroups={treeGroups} select={select} />;
  }

  return (
    <LockerContext.Provider value={true}>
      <TreeRender
        tree={tree}
        readonly={true}
        animate={true}
        config={config}
        define={define?.value}
        trans={trans}
      />
    </LockerContext.Provider>
  );
}
