import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import BTDefine from "../behavior-tree/Define";
import { Forest } from "../behavior-tree/Forest";
import type { Store, Tree } from "../behavior-tree/type";
import { useDialogPrompt } from "../components/DialogPrompt";
import { useMoveableList } from "../components/MoveableList";
import { useRefresh } from "../components/Refresh";
import Snack from "../components/Snack";
import { useTabs } from "../components/Tabs";
import ToolBarSlot from "../components/ToolBarSlot";
import Config from "../storage/Config";
import { useTrans } from "../storage/Locale";
import { ContextValue } from "../storage/Storage";
import DraftPaper from "./DraftPaper";
import NodeRender from "./NodeRender";
import NodeSelector from "./NodeSelector";
import Properties, { PropertiesOption } from "./Properties";
import Undo from "./Undo";

export default function TreeRender({
  forest,
  treeIndex,
  craeteNavHref,
}: {
  forest: ContextValue<Forest>;
  treeIndex: number;
  craeteNavHref(forest: string, treeIndex: number): string;
}) {
  if (forest?.value == null) return null; // never
  const config = Config.use();
  const trans = useTrans();
  const define = BTDefine.use();
  const navigate = useNavigate();
  const snack = Snack.use();
  const { name, trees } = forest.value;
  const { dialog, prompt } = useDialogPrompt();

  const [anchorEl, setAnchorEl] = useState<null | [number, HTMLElement]>(null);
  const showMenu = (index: number) => {
    if (trees.length <= 1 || index >= trees.length) {
      return (event: MouseEvent<HTMLElement>) => event.preventDefault();
    }
    return (event: MouseEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setAnchorEl([index, event.currentTarget]);
    };
  };
  const hideMenu = () => setAnchorEl(null);
  const removeTree = async () => {
    if (anchorEl == null) return; // never
    hideMenu();
    const treeIndex = anchorEl[0];
    const confirm = await prompt({
      onSubmit: async () => true,
      cancel: trans("CANCEL"),
      submit: trans("REMOVE"),
      title: trans("Confirm to remove the tree?"),
    });
    if (!confirm) return;
    trees.splice(treeIndex, 1);
    navigate(craeteNavHref(name, 0));
  };

  const createTreeButton = (
    <Stack direction="row">
      <AddIcon />
      <Typography>{trans("CREATE")}</Typography>
    </Stack>
  );
  const labels = [...trees.map(({ name }) => name), createTreeButton];
  async function setTab(tab: number) {
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
  const { tabs, refresh: refreshTab } = useTabs(
    labels,
    treeIndex,
    setTab,
    showMenu
  );
  const tree = trees[treeIndex];

  const StoreList = useCallback(
    function StoreList() {
      const storeItems = Object.entries(tree.store || {});
      const [, refresh] = useRefresh();

      const appendStorePrompt = prompt.bind(null, {
        async onSubmit([name, value]: string[]) {
          if (!name) {
            snack.show(trans("Invalid input"));
            return null;
          }
          if (tree.store && name in tree.store) {
            snack.show(trans("Duplicate store key"));
            return null;
          }
          return [`.${name}`, value as Store.Value];
        },
        cancel: trans("CANCEL"),
        submit: trans("APPEND"),
        title: trans("Append Item"),
        message: trans("Please the key and value of the store item"),
        values: [trans("store key"), trans("store value")],
      }) as () => Promise<[string, Store.Value] | null>;

      const change = (index: number, value: string) => {
        const item = storeItems[index];
        if (item[1] === value) return;
        item[1] = value;
        if (tree.store == null) {
          tree.store = { [item[0]]: value };
        } else {
          tree.store[item[0]] = value;
        }
        refresh();
      };

      const moveableList = useMoveableList(
        storeItems,
        appendStorePrompt,
        () => {
          tree.store = Object.fromEntries(storeItems);
          refresh();
        },
        ([name, value], index, showMenu, anchor) => (
          <ListItem
            key={index}
            button
            onContextMenu={showMenu}
            sx={{ padding: 0 }}
          >
            <TextField
              label={name.slice(1)}
              title={name.slice(1)}
              fullWidth
              size="small"
              defaultValue={value}
              margin="dense"
              onChange={(event) => change(index, event.target.value)}
            />
            {anchor}
          </ListItem>
        )
      );
      return (
        <Box>
          {moveableList.listItems.length <= 0
            ? moveableList.appender
            : moveableList.listItems}
          {moveableList.itemMenu}
        </Box>
      );
    },
    [forest, treeIndex]
  );

  const treeOptions = [
    { type: "subheader", value: trans("Tree Properties"), align: "right" },
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
    { type: "divider" },
    {
      type: "subheader",
      value: `- ${trans("Store List")} -`,
      align: "center",
    },
    { type: "component", Component: StoreList },
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
        <Undo id={`${name}[${treeIndex}]`} trans={trans}>
          <NodeSelector>
            <DraftPaper key={tree.name}>
              <NodeRender
                tree={tree}
                config={config}
                trans={trans}
                btDefine={define?.value}
              />
            </DraftPaper>
          </NodeSelector>
        </Undo>
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
      </Menu>
    </Box>
  );
}
