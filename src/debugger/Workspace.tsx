import Box from "@mui/material/Box";
import { useEffect } from "react";

import Define from "../behavior-tree/Define";
import DebugService from "../common/service/DebugService";
import Loading from "../components/Loading";
import { useTabs } from "../components/Tabs";
import { LockerContext } from "../editor/NodeRender/NodeLocker";
import TreeRender from "../editor/TreeRender";
import Config from "../storage/Config";
import { useTrans } from "../storage/Locale";
import DebugController from "./DebugController";
import TreeSelector from "./TreeSelector";

export default function Workspace({
  parentId,
  groupId,
  treeId,
  loadGroup,
  loadTree,
}: {
  parentId: string | null;
  groupId: string | null;
  treeId: string | null;
  loadGroup(parentId: string, groupId: string): void;
  loadTree(groupId: string, treeId: string): void;
}) {
  const config = Config.use();
  const define = Define.use();
  const trans = useTrans();

  const [{ treeGroups, treeLoaded, loading }, manager] = DebugService.use()!;

  useEffect(() => {
    if (groupId == null) return;
    if (treeId == null) manager.loadGroup(parentId ?? "", groupId);
    else manager.loadTree(groupId, treeId);
  }, [parentId, groupId, treeId]);

  if (treeLoaded == null || !groupId || !treeId) {
    return treeGroups == null ? (
      <Loading />
    ) : (
      <TreeSelector
        treeGroups={treeGroups}
        loadGroup={loadGroup}
        loadTree={loadTree}
      />
    );
  }

  const treeIndex = treeLoaded.trees.findIndex(({ id }) => id === treeId);
  const { tabs } = useTabs(
    treeLoaded.trees.map(({ name }) => name),
    treeIndex,
    (tabIndex) => loadTree(groupId, treeLoaded.trees[tabIndex].id)
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
        {loading ? (
          <Loading />
        ) : (
          <TreeRender
            tree={treeLoaded.tree}
            readonly={true}
            animate={true}
            config={config}
            define={define?.value}
            trans={trans}
          >
            <DebugController
              trans={trans}
              tree={treeLoaded.tree}
              manager={manager}
            />
          </TreeRender>
        )}
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
