import Box from "@mui/material/Box";
import { useState } from "react";
import { Decorator, Tree } from "../behavior-tree/define";

import example from "../behavior-tree/example";
import { useRefresh } from "../components/Refresh";
import { useTabs } from "../components/Tabs";
import Config from "../storage/Config";
import { useTrans } from "../storage/Locale";
import DraftPaper from "./DraftPaper";
import NodeLibs from "./NodeLibs";
import NodeRender from "./NodeRender";
import Properties, { PropertiesOption } from "./Properties";

function TreePaper({ trees }: { trees: Tree[] }) {
  const config = Config.use();
  const trans = useTrans();

  const labels = trees.map(({ name }) => name);
  const { tab, tabs, refresh: refreshTab } = useTabs(labels);
  const tree = trees[tab];

  const refresh = useRefresh();
  const prependDecorator = (type: string) => {
    const node = tree.root;
    tree.root = { type, node } as Decorator;
    refresh();
  };

  const treeOptions = [
    { type: "subheader", value: trans("Tree Properties") },
    {
      type: "input",
      key: `tree#${tab}`,
      label: trans("Tree Name"),
      value: tree.name,
      submit(value: string) {
        tree.name = value;
        labels[tab] = value;
        refreshTab(tab);
      },
    },
  ] as PropertiesOption[];

  return (
    <Box
      sx={{
        flex: "1 1 auto",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Properties options={treeOptions}>
        <DraftPaper key={tree.name}>
          <NodeRender
            node={tree.root}
            config={config}
            trans={trans}
            prependDecorator={prependDecorator}
          />
        </DraftPaper>
      </Properties>
      <Box
        sx={{
          flex: "0 0",
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        {tabs}
      </Box>
    </Box>
  );
}

export default function Editor() {
  const forest = example; // TODO: load from storage

  return (
    <NodeLibs>
      <TreePaper trees={forest.trees} />
    </NodeLibs>
  );
}
Editor.route = "/editor";
