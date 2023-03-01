import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import SaveIcon from "@mui/icons-material/Save";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { MouseEvent, useEffect, useRef, useState } from "react";

import Define, { BTDefines } from "../behavior-tree/Define";
import { Forest } from "../behavior-tree/Forest";
import type { Tree } from "../behavior-tree/type";
import { defaultRootNode } from "../behavior-tree/utils";
import { invalidTree } from "../behavior-tree/validator";
import { useDialogPrompt } from "../components/DialogPrompt";
import { addHotkeyListener } from "../components/Hotkey";
import Snack from "../components/Snack";
import { useTabs } from "../components/Tabs";
import ToolBarSlot from "../components/ToolBarSlot";
import { handleInvalidNodes } from "../debugger";
import Config from "../storage/Config";
import { useTrans } from "../storage/Locale";
import { ContextValue } from "../storage/Storage";
import { LockerContext, useLocker } from "./NodeRender/NodeLocker";
import { getDeliverParent } from "./NodeSelector";
import Properties, {
  createComponentOption,
  PropertiesOption,
} from "./Properties";
import StorePreset from "./Properties/StorePreset";
import TreeRender from "./TreeRender";
import Undo from "./Undo";

export default function Workspace({
  forest,
  treeIndex,
  showTree,
}: {
  forest: ContextValue<Forest>;
  treeIndex: number;
  showTree(forest: string, treeIndex: number, readonly?: true): void;
}) {
  if (forest?.value == null) return null; // never
  const config = Config.use();
  const trans = useTrans();
  const snack = Snack.use();
  const { name, trees } = forest.value;
  const { dialog, prompt } = useDialogPrompt();

  const [anchorEl, setAnchorEl] = useState<null | [number, HTMLElement]>(null);
  const showMenu = (tab: number) => {
    const index = tab - 1;
    if (index < 0 || index >= trees.length) {
      return (event: MouseEvent<HTMLElement>) => event.preventDefault();
    }
    return (event: MouseEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setAnchorEl([index, event.currentTarget]);
    };
  };
  const hideMenu = () => setAnchorEl(null);
  const createTree = async (index: number, tree?: Tree) => {
    const treeName = await prompt({
      title:
        tree == null
          ? trans("Create Tree")
          : `${trans("Clone Tree")} - ${tree.name}`,
      message: trans("Please input the name of the behavior tree"),
      values: [trans("Tree Name")],
      cancel: trans("CANCEL"),
      submit: trans("CREATE"),
      async onSubmit([treeName]) {
        return treeName;
      },
    });
    if (treeName == null) return;

    if (!treeName) {
      await snack.show(trans("Invalid tree name"));
      return;
    }
    const duplicateName = labels.some(
      (name) =>
        typeof name === "string" &&
        name.toUpperCase() === treeName.toUpperCase()
    );
    if (duplicateName) {
      await snack.show(trans("Duplicate tree name"));
      return;
    }
    trees.splice(index, 0, {
      ...(tree || { root: defaultRootNode() }),
      name: treeName,
    });
    labels.splice(index, 0, treeName);
    showTree(name, index);
  };
  const removeTree = async () => {
    if (anchorEl == null) return; // never
    hideMenu();
    if (trees.length <= 1) {
      snack.show(trans("Can not remove the last tree"));
      return;
    }
    const treeIndex = anchorEl[0];
    const confirm = await prompt({
      onSubmit: async () => true,
      cancel: trans("CANCEL"),
      submit: trans("REMOVE"),
      title: trans("Confirm to remove the tree?"),
    });
    if (!confirm) return;
    trees.splice(treeIndex, 1);
    showTree(name, 0);
  };
  const cloneTree = async () => {
    if (anchorEl == null) return; // never
    hideMenu();
    const index = anchorEl[0];
    createTree(1 + index, JSON.parse(JSON.stringify(trees[index])));
  };

  const createTreeButton = (
    <Stack direction="row">
      <AddIcon />
      <Typography>{trans("CREATE")}</Typography>
    </Stack>
  );
  const labels = [createTreeButton, ...trees.map(({ name }) => name)];
  async function setTab(tab: number, event: MouseEvent) {
    if (tab === 0) {
      createTree(trees.length);
      return;
    }
    const index = tab - 1;
    if (!event.ctrlKey && !event.shiftKey) {
      if (index !== treeIndex) showTree(name, index);
      return;
    }
    // split view
    const forest = saveRef.current.forest;
    if (forest.saving) {
      await snack.show(trans("Saving, try again later"));
      return;
    }
    const treesDirty = saveRef.current.dirty(forest.value.trees);
    if (treesDirty) {
      await snack.show(trans("Modification has not been saved!"));
      return;
    }
    showTree(name, index, true);
  }
  const { tabs, refresh: refreshTab } = useTabs(
    labels,
    1 + treeIndex,
    setTab,
    showMenu
  );
  const tree = trees[treeIndex];

  const treeOptions = [
    { type: "subheader", value: trans("Tree Properties"), align: "right" },
    {
      type: "input",
      key: `tree#${treeIndex}`,
      label: trans("Tree Name"),
      value: tree.name,
      submit(value: string) {
        tree.name = value;
        labels[1 + treeIndex] = value;
        refreshTab(1 + treeIndex);
        const parent = getDeliverParent(tree.root);
        parent.refresh();
      },
    },
    { type: "divider" },
    {
      type: "subheader",
      value: `- ${trans("Store List")} -`,
      align: "center",
    },
    createComponentOption(StorePreset, {
      trans,
      scope: ".",
      read() {
        return tree.store || {};
      },
      save(store) {
        if (store == null) delete tree.store;
        else tree.store = store;
      },
    }),
  ] as PropertiesOption[];

  const Locker = useLocker(false, (locked) =>
    snack.show(trans(locked ? "Editor locked" : "Editor unlocked"))
  );

  const saveRef = useRef({ forest, dirty: (_trees: Tree[]) => "" as string });
  useEffect(() => {
    saveRef.current.forest = forest;
  }, [forest]);
  const define = Define.use();
  const toolBarSlot = ToolBarSlot.useSlot();

  useEffect(() => {
    if (define?.value == null) return;

    let treesSaved = JSON.stringify(trees);
    const dirty = (trees: Tree[]) => {
      const treesDirty = JSON.stringify(trees);
      return treesDirty == treesSaved ? "" : treesDirty;
    };
    const invalidTrees = (define: BTDefines, trees: Tree[]): number => {
      for (let index = 0; index < trees.length; index++) {
        const tree = trees[index];
        const invalidNodes = invalidTree(define, tree);
        if (invalidNodes.length <= 0) continue;
        handleInvalidNodes(invalidNodes);
        return index;
      }
      return -1;
    };
    saveRef.current.dirty = dirty;
    const save = async () => {
      const forest = saveRef.current.forest;
      if (forest.saving) {
        await snack.show(trans("Saving, try again later"));
        return;
      }
      const { trees } = forest.value;
      const invalidIndex = invalidTrees(define.value, trees);
      if (invalidIndex >= 0) {
        showTree(name, invalidIndex);
        snack.show(trans("Found invalid nodes, please check and fix them"));
        return;
      }
      const treesDirty = dirty(trees);
      if (!treesDirty) {
        await snack.show(trans("No modifications"));
        return;
      }
      snack.show(trans("Saving"));
      await forest.update({ ...forest.value, trees });
      treesSaved = treesDirty;
      await snack.show(trans("Modification has been saved"));
    };
    toolBarSlot("Editor", "Editor", 0, [
      <Locker.Controller>
        {(locked, troggle) => (
          <IconButton
            color="inherit"
            title={`${trans(locked ? "Unlock Editor" : "Lock Editor")}`}
            onClick={troggle}
          >
            {locked ? <LockOpenIcon /> : <LockIcon />}
          </IconButton>
        )}
      </Locker.Controller>,
      <IconButton color="inherit" title={`${trans("SAVE")}`} onClick={save}>
        <SaveIcon />
      </IconButton>,
    ]);

    const removeHotkeyListeners = addHotkeyListener(
      document.body,
      {
        code: "KeyS",
        ctrlKey: true,
        callback: save,
      },
      {
        code: "KeyL",
        ctrlKey: true,
        callback: Locker.troggle,
      }
    );

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
      saveRef.current.dirty = () => "";
      removeHotkeyListeners();
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [define?.value]);

  return (
    <Box
      sx={{
        flex: "1 1 auto",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <LockerContext.Provider value={Locker.locked}>
        <Properties options={treeOptions}>
          <Undo id={`${name}[${treeIndex}]`} trans={trans}>
            <TreeRender
              tree={tree}
              config={config}
              define={define?.value}
              trans={trans}
            />
          </Undo>
        </Properties>
      </LockerContext.Provider>
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
      <Menu
        open={anchorEl != null}
        anchorEl={anchorEl && anchorEl[1]}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        onClose={hideMenu}
      >
        <MenuItem onClick={removeTree}>
          <ListItemIcon>
            <DeleteIcon />
          </ListItemIcon>
          <ListItemText>{trans("Remove Tree")}</ListItemText>
        </MenuItem>
        <MenuItem onClick={cloneTree}>
          <ListItemIcon>
            <AddIcon />
          </ListItemIcon>
          <ListItemText>{trans("Clone Tree")}</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
