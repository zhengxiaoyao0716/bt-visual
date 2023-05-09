import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import PreviewIcon from "@mui/icons-material/Preview";
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
import share from "../common/share";
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
  PropertiesOption,
  createComponentOption,
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
  showTree(forest: string, index: number, readonly?: true): void;
}) {
  if (forest?.value == null) return null; // never
  const config = Config.use();
  const trans = useTrans();
  const snack = Snack.use();
  const { name: forestName, trees } = forest.value;
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
  const isDuplicateName = (input: string) => {
    const name = input.toUpperCase();
    return labels.some(
      (label) => typeof label === "string" && label.toUpperCase() === name
    );
  };
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
    if (isDuplicateName(treeName)) {
      await snack.show(trans("Duplicate tree name"));
      return;
    }
    trees.splice(index, 0, {
      name: treeName,
      desc: tree?.desc ?? "",
      root: tree?.root ?? defaultRootNode(),
    });
    labels.splice(index, 0, treeName);
    showTree(forestName, index);
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
    showTree(forestName, 0);
  };
  const cloneTree = async () => {
    if (anchorEl == null) return; // never
    hideMenu();
    const index = anchorEl[0];
    createTree(1 + index, JSON.parse(JSON.stringify(trees[index])));
  };
  const showTreeReadonly = async (event: MouseEvent, index: number) => {
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
    showTree(forestName, index, true);
  };
  const openReadonly = (event: MouseEvent) => {
    if (anchorEl == null) return; // never
    hideMenu();
    const index = anchorEl[0];
    showTreeReadonly(event, index);
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
    if (event.ctrlKey || event.shiftKey) {
      showTreeReadonly(event, index);
    } else if (index !== treeIndex) {
      showTree(forestName, index);
    }
  }
  const { tabs, refresh: refreshTab } = useTabs(
    labels,
    1 + treeIndex,
    setTab,
    showMenu
  );
  const tree = trees[treeIndex];
  const define = Define.use();

  const treeOptions = [
    { type: "subheader", value: trans("Tree Properties"), align: "right" },
    {
      type: "input",
      key: `tree#${treeIndex}-name`,
      label: trans("Tree Name"),
      get value() {
        return tree.name;
      },
      async submit(value: string) {
        if (isDuplicateName(value)) {
          await snack.show(trans("Duplicate tree name"));
          return;
        }
        tree.name = value;
        labels[1 + treeIndex] = value;
        refreshTab(1 + treeIndex);
        const parent = getDeliverParent(tree.root);
        parent.refresh();
      },
    },
    {
      type: "input",
      key: `tree#${treeIndex}-desc`,
      label: trans("Tree Desc"),
      get value() {
        return tree.desc;
      },
      multiline: true,
      maxRows: 3,
      submit(value: string) {
        if (value === tree.desc) return;
        tree.desc = value;
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
      storeScopes: define?.value?.storeScopes ?? [],
    }),
  ] as PropertiesOption[];

  const Locker = useLocker(false, (locked) =>
    snack.show(trans(locked ? "Editor locked" : "Editor unlocked"))
  );

  const saveRef = useRef({ forest, dirty: (_trees: Tree[]) => "" as string });
  useEffect(() => {
    saveRef.current.forest = forest;
  }, [forest]);
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
        showTree(forestName, invalidIndex);
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
            title={`${trans(locked ? "UNLOCK" : "LOCK")} - Ctrl+L`}
            onClick={troggle}
          >
            {locked ? <LockOpenIcon /> : <LockIcon />}
          </IconButton>
        )}
      </Locker.Controller>,
      <IconButton title={`${trans("SAVE")} - Ctrl+S`} onClick={save}>
        <SaveIcon />
      </IconButton>,
    ]);

    const removeHotkeyListeners = addHotkeyListener(
      document.body,
      {
        code: "KeyS",
        ctrlKey: true,
        ignore: (_event) => false, // Ctrl+S 事件针对全局生效
        callback: save,
      },
      {
        code: "KeyL",
        ctrlKey: true,
        ignore: (_event) => false, // Ctrl+L 事件针对全局生效
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
    share &&
      (share.closingConfirm = () => {
        const treesDirty = JSON.stringify(trees);
        if (treesDirty === treesSaved) return "";
        return trans("Modification has not been saved!");
      });

    return () => {
      saveRef.current.dirty = () => "";
      removeHotkeyListeners();
      window.removeEventListener("beforeunload", beforeUnload);
      share && (share.closingConfirm = undefined);
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
        <Properties forestName={forestName} options={treeOptions} trans={trans}>
          <Undo id={`${forestName}[${treeIndex}]`} trans={trans}>
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
          backgroundColor: ({ palette }) => palette.background.paper,
          flex: "0 0",
          borderTop: 1,
          borderColor: ({ palette }) => palette.divider,
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
        <MenuItem
          onClick={openReadonly}
          title={`${trans("Open in new tab")} - Ctrl/Shift+Click`}
        >
          <ListItemIcon>
            <PreviewIcon />
          </ListItemIcon>
          <ListItemText>{trans("Readonly Mode")}</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
