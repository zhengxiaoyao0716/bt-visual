import { useEffect } from "react";
import Define from "../behavior-tree/Define";
import Loading from "../components/Loading";
import { LockerContext } from "../editor/NodeRender/NodeLocker";
import TreeRender from "../editor/TreeRender";
import DebugService from "../service/DebugService";
import Config from "../storage/Config";
import { useTrans } from "../storage/Locale";
import TreeSelector from "./TreeSelector";
import Box from "@mui/material/Box";
import { useTabs } from "../components/Tabs";

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

  const [{ treeGroups, treeLoaded }, manager, _dispatch] = DebugService.use()!;

  useEffect(() => {
    if (groupId && treeId) manager.loadTree(groupId, treeId);
  }, [groupId, treeId]);

  if (treeGroups == null) return <Loading />;

  if (treeLoaded == null) {
    return <TreeSelector treeGroups={treeGroups} select={select} />;
  }

  const treeIndex = treeLoaded.trees.findIndex(({ id }) => id === treeId);
  const { tabs } = useTabs(
    treeLoaded.trees.map(({ name }) => name),
    treeIndex,
    (tabIndex) => select(groupId, treeLoaded.trees[tabIndex].id)
  );

  return (
    <Box
      sx={{
        flex: "1 1 auto",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <LockerContext.Provider value={true}>
        <TreeRender
          tree={treeLoaded.tree}
          readonly={true}
          animate={true}
          config={config}
          define={define?.value}
          trans={trans}
        />
      </LockerContext.Provider>
      <Box
        sx={{
          backgroundColor: ({ palette }) => palette.background.paper,
          flex: "0 0",
          borderTop: 1,
          borderColor: ({ palette }) => palette.divider,
        }}
      >
        {tabs}
      </Box>
    </Box>
  );
}
