import { useEffect, useRef } from "react";
import { Route, Routes, useParams, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import IconButton from "@mui/material/IconButton";
import SaveIcon from "@mui/icons-material/Save";

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
import ToolBarSlot from "../components/ToolBarSlot";
import Snack from "../components/Snack";

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
  const snack = Snack.use();
  const { name, trees } = forest.value;

  const { dialog, prompt } = useDialogPrompt();

  const createTreeButton = (
    <Stack direction="row">
      <AddIcon />
      <Typography>{trans("CREATE")}</Typography>
    </Stack>
  );
  const labels = [...trees.map(({ name }) => name), createTreeButton];
  const { tabs, refresh: refreshTab } = useTabs(
    labels,
    treeIndex,
    async (tab) => {
      if (tab === treeIndex) return;
      if (tab < trees.length) {
        navigate(craeteNavHref(name, tab));
        return;
      }
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
      if (!treeName) {
        await snack.show(trans("Invalid tree name"));
        return;
      }
      const duplicateName = labels
        .slice(0, -1)
        .some(
          (name) =>
            typeof name === "string" &&
            name.toUpperCase() === treeName.toUpperCase()
        );
      if (duplicateName) {
        await snack.show(trans("Duplicate tree name"));
        return;
      }
      const tree = {
        name: treeName,
        root: {
          type: "?=Selector",
          nodes: [],
        },
      } as Tree;
      trees.push(tree);
      labels[labels.length - 1] = treeName;
      labels.push(createTreeButton);
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

  const toolBarSlot = ToolBarSlot.useSlot();
  const forestRef = useRef(forest);
  useEffect(() => {
    forestRef.current = forest;
  }, [forest]);
  useEffect(() => {
    let treesSaved = JSON.stringify(trees);
    const save = async () => {
      const forest = forestRef.current;
      const treesDirty = JSON.stringify(trees);
      if (treesDirty === treesSaved) {
        await snack.show(trans("No modifications"));
        return;
      }
      if (forest.saving) {
        await snack.show(trans("Saving, try again later"));
        return;
      }
      snack.show(trans("Saving"));
      await forest.update({ ...forest.value, trees });
      treesSaved = treesDirty;
      await snack.show(trans("Modification has been saved"));
    };
    toolBarSlot("Editor", "Editor", 0, [
      <IconButton color="inherit" title={`${trans("SAVE")}`} onClick={save}>
        <SaveIcon />
      </IconButton>,
    ]);

    const beforeUnload = (event: BeforeUnloadEvent) => {
      const treesDirty = JSON.stringify(trees);
      if (treesDirty === treesSaved) return;
      const warning = trans("Modification has not been saved!");
      event.cancelBubble = true;
      event.returnValue = warning;
      event.stopPropagation();
      event.preventDefault();
      return warning;
    };
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, []);

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
          <Undo id={`${name}[${treeIndex}]`} trans={trans}>
            <NodeRender tree={tree} config={config} trans={trans} />
          </Undo>
        </DraftPaper>
      </Properties>
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
      <Snack>
        <NodeLibs>
          <Forest>
            {(forest) =>
              invalid(forest) ? null : (
                <RenderTree forest={forest} treeIndex={treeIndex} />
              )
            }
          </Forest>
        </NodeLibs>
      </Snack>
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
