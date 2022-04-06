import Box from "@mui/material/Box";

import example from "../behavior-tree/example";
import { useTabs } from "../components/Tabs";
import { useTrans } from "../storage/Locale";
import DraftPaper from "./DraftPaper";
import GrabPaper from "./GrabPaper";
import NodeLibs from "./NodeLibs";
import NodeRender from "./NodeRender";

export default function Editor() {
  const forest = example; // TODO: load from storage
  const trans = useTrans();

  const { tab, tabs } = useTabs(forest.trees.map(({ name }) => name));
  const tree = forest.trees[tab];

  return (
    <Box
      sx={{
        flexGrow: 1,
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          flexGrow: 1,
          overflow: "hidden",
        }}
      >
        <NodeLibs>
          <DraftPaper key={tree.name}>
            <GrabPaper>
              <NodeRender node={tree.root} trans={trans} />
            </GrabPaper>
          </DraftPaper>
        </NodeLibs>
      </Box>
      <Box
        sx={{
          flexShrink: 0,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        {tabs}
      </Box>
    </Box>
  );
}
Editor.route = "/editor";
