import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { MouseEvent, useState } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";

import {
  default as BTDefine,
  default as Define,
} from "../behavior-tree/Define";
import createForest, { Forest, ForestMainfest } from "../behavior-tree/Forest";
import share from "../common/share";
import { useDialogPrompt } from "../components/DialogPrompt";
import Loading from "../components/Loading";
import Snack from "../components/Snack";
import Config from "../storage/Config";
import { useTrans } from "../storage/Locale";
import { ContextValue } from "../storage/Storage";
import NodeLibs from "./NodeLibs";
import { LockerContext } from "./NodeRender/NodeLocker";
import TreeRender from "./TreeRender";
import Workerspace from "./Workerspace";

function ForestRender() {
  const { forest: forestName, tree: treeIndexText } = useParams();
  const treeIndex = Number.parseInt(treeIndexText || "0");
  const Forest = createForest(forestName || "");
  const invalid = (forest: ContextValue<Forest>) =>
    forest?.value == null ||
    treeIndex == null ||
    treeIndex < 0 ||
    treeIndex >= forest.value.trees.length;
  const navigate = useNavigate();
  const showTree = (forest: string, treeIndex: number, readonly?: true) => {
    if (!readonly) {
      navigate(`${Editor.route}/${forest}/${treeIndex}`);
      return;
    }
    const openNewTab =
      share?.openNewTab ??
      ((url) =>
        window.open(
          url,
          "_blank",
          "location=no,menubar=no,status=no,toolbar=no,width=800,height=600"
        ));
    openNewTab(`${Editor.route}/readonly/${forest}/${treeIndex}`);
  };

  return (
    <NodeLibs>
      <Forest>
        {(forest) =>
          invalid(forest) ? null : (
            <Workerspace
              forest={forest}
              treeIndex={treeIndex}
              showTree={showTree}
            />
          )
        }
      </Forest>
    </NodeLibs>
  );
}

function ReadonlyForestRender() {
  const { forest: forestName, tree: treeIndexText } = useParams();
  const treeIndex = Number.parseInt(treeIndexText || "0");
  const Forest = createForest(forestName || "");

  const config = Config.use();
  const define = Define.use();
  const trans = useTrans();

  return (
    <Forest>
      {(forest) => {
        const tree = forest?.value?.trees?.[treeIndex];
        return tree == null ? null : (
          <LockerContext.Provider value={true}>
            <TreeRender
              tree={tree}
              config={config}
              define={define?.value}
              trans={trans}
              readonly={true}
            />
          </LockerContext.Provider>
        );
      }}
    </Forest>
  );
}

function ForestManager() {
  const trans = useTrans();
  const snack = Snack.use();
  const { dialog, prompt } = useDialogPrompt();

  const [anchorEl, setAnchorEl] = useState<null | [number, HTMLElement]>(null);
  const showMenu = (event: MouseEvent<HTMLElement>, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl([index, event.currentTarget]);
  };
  const hideMenu = () => setAnchorEl(null);
  const removeTree = async (manifest: ContextValue<{ name: string }[]>) => {
    if (!manifest?.value) return;
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
    if (manifest.saving) {
      await snack.show(trans("Saving, try again later"));
      return;
    }
    manifest.value.splice(treeIndex, 1);
    await manifest.update(manifest.value);
  };

  const createForest = async (manifest: ContextValue<{ name: string }[]>) => {
    if (!manifest?.value) return;
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
    const duplicateName = manifest.value.some(
      ({ name }) => name.toUpperCase() === treeName.toUpperCase()
    );
    if (duplicateName) {
      await snack.show(trans("Duplicate tree name"));
      return;
    }
    if (manifest.saving) {
      await snack.show(trans("Saving, try again later"));
      return;
    }
    manifest.value.push({ name: treeName });
    await manifest.update(manifest.value);
  };

  return (
    <Box sx={{ m: 2 }}>
      <ForestMainfest>
        {(manifest) =>
          manifest?.value == null ? (
            <Loading />
          ) : (
            <>
              {manifest.value.map(({ name }, index) => (
                <Link href={`${Editor.route}/${name}/0`} key={index}>
                  <Button
                    sx={{ textTransform: "none" }}
                    onContextMenu={(event) => showMenu(event, index)}
                  >
                    {name}
                  </Button>
                </Link>
              ))}
              <Button onClick={() => createForest(manifest)}>
                <Stack direction="row">
                  <AddIcon />
                  <Typography>{trans("CREATE")}</Typography>
                </Stack>
              </Button>
              {dialog}
              <Menu
                open={anchorEl != null}
                anchorEl={anchorEl && anchorEl[1]}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                onClose={hideMenu}
              >
                <MenuItem onClick={() => removeTree(manifest)}>
                  <ListItemIcon>
                    <DeleteIcon />
                  </ListItemIcon>
                  <ListItemText>{trans("Remove Tree")}</ListItemText>
                </MenuItem>
              </Menu>
            </>
          )
        }
      </ForestMainfest>
    </Box>
  );
}

export default function Editor() {
  return (
    <BTDefine>
      <Snack>
        <Routes>
          <Route path={"/"} element={<ForestManager />} />
          <Route
            path={`/readonly/:forest/:tree`}
            element={<ReadonlyForestRender />}
          />
          <Route path={`/:forest/:tree`} element={<ForestRender />} />
        </Routes>
      </Snack>
    </BTDefine>
  );
}
Editor.route = "/editor";
