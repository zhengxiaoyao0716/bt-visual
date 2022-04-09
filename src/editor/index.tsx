import { Route, Routes, useParams, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";

import type { Tree } from "../behavior-tree/type";
import { useTabs } from "../components/Tabs";
import BTDefine from "../behavior-tree/Define";
import Config from "../storage/Config";
import { useTrans } from "../storage/Locale";
import DraftPaper from "./DraftPaper";
import NodeLibs from "./NodeLibs";
import NodeRender from "./NodeRender";
import Properties, { PropertiesOption } from "./Properties";
import Undo from "./Undo";
import createForest, { Forest } from "../behavior-tree/Forest";
import { ContextValue } from "../storage/Storage";
import { useDialogPrompt } from "../components/DialogPrompt";

function RenderTree({
  forest,
  treeIndex,
}: {
  forest: ContextValue<Forest>;
  treeIndex: number;
}) {
  if (forest?.value == null) return null; // never
  const config = Config.use();
  const trans = useTrans();
  const navigate = useNavigate();
  const { name, trees } = forest.value;

  const { dialog, prompt } = useDialogPrompt();

  const labels = trees.map(({ name }) => name);
  const createTreeButton = (
    <Stack direction="row">
      <AddIcon />
      <Typography>{trans("CREATE")}</Typography>
    </Stack>
  );
  const { tabs, refresh: refreshTab } = useTabs(
    [...labels, createTreeButton],
    treeIndex,
    async (tab) => {
      if (tab === treeIndex) return;
      if (tab < trees.length) {
        navigate(craeteNavHref(name, tab));
        return;
      }
      if (forest.saving) return;
      const treeName = await prompt({
        title: trans("Create Tree"),
        message: trans("Please input the name of the behavior tree"),
        values: [trans("Tree Name")],
        cancel: trans("CANCEL"),
        submit: trans("CREATE"),
        async onSubmit([treeName]) {
          return treeName;
        },
      });
      if (!treeName || labels.some((name) => name === treeName)) return;
      const tree = {
        name: treeName,
        root: {
          type: "?=Selector",
          nodes: [],
        },
      } as Tree;
      await forest.update({
        ...forest.value,
        trees: [...trees, tree],
      });
      labels.push(treeName);
      navigate(craeteNavHref(name, tab));
    }
  );
  const tree = trees[treeIndex];

  const treeOptions = [
    { type: "subheader", value: trans("Tree Properties") },
    {
      type: "input",
      key: `tree#${treeIndex}`,
      label: trans("Tree Name"),
      value: tree.name,
      submit(value: string) {
        tree.name = value;
        labels[treeIndex] = value;
        refreshTab(treeIndex);
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
      <Undo id={`${name}[${treeIndex}]`} trans={trans}>
        <Properties options={treeOptions}>
          <DraftPaper key={tree.name}>
            <NodeRender tree={tree} config={config} trans={trans} />
          </DraftPaper>
        </Properties>
      </Undo>
      {dialog}
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

function RenderForest() {
  const { forest: forestName, tree: treeIndexText } = useParams();
  const treeIndex = Number.parseInt(treeIndexText || "0");
  const Forest = createForest(forestName || "");
  const invalid = (forest: ContextValue<Forest>) =>
    forest?.value == null ||
    treeIndex == null ||
    treeIndex < 0 ||
    treeIndex >= forest.value.trees.length;

  return (
    <BTDefine>
      <NodeLibs>
        <Forest>
          {(forest) =>
            invalid(forest) ? null : (
              <RenderTree forest={forest} treeIndex={treeIndex} />
            )
          }
        </Forest>
      </NodeLibs>
    </BTDefine>
  );
}

function RenderWorkspace() {
  return <Link href={craeteNavHref("Example", 0)}>Example</Link>;
}

export default function Editor() {
  return (
    <Routes>
      <Route path={"/"} element={<RenderWorkspace />} />
      <Route path={`/:forest/:tree`} element={<RenderForest />} />
    </Routes>
  );
}
Editor.route = "/editor";

function craeteNavHref(forest: string, treeIndex: number) {
  return `${Editor.route}/${forest}/${treeIndex}`;
}
