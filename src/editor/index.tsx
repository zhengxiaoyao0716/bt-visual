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
import { MouseEvent, ReactNode, useState } from "react";
import { Route, useNavigate, useParams } from "react-router-dom";

import Define from "../behavior-tree/Define";
import createForest, { Forest, ForestManifest } from "../behavior-tree/Forest";
import { openNewTab } from "../common/share";
import { useDialogPrompt } from "../components/DialogPrompt";
import { useFilterKeyword } from "../components/FilterKeyword";
import Loading from "../components/Loading";
import Snack from "../components/Snack";
import Config from "../storage/Config";
import { useTrans } from "../storage/Locale";
import { ContextValue } from "../storage/Storage";
import NodeLibs, { ReadonlyNodeLibs } from "./NodeLibs";
import { LockerContext } from "./NodeRender/NodeLocker";
import TreeRender from "./TreeRender";
import Workerspace from "./Workerspace";

function useShowTree() {
  const navigate = useNavigate();
  return (forest: string, treeIndex: number, readonly?: true) => {
    if (readonly) {
      openNewTab(
        `${EditorRoutes.routeReadonly}/${forest}/${treeIndex}`,
        800,
        600
      );
    } else {
      navigate(`${EditorRoutes.routeMain}/${forest}/${treeIndex}`);
    }
  };
}

function pinnedLibs(type: string, width: number, height: number) {
  openNewTab(`${EditorRoutes.routeLibarary}/${type}`, width, height);
}

function ForestRender() {
  const { forest: forestName, tree: treeIndexText } = useParams();
  const treeIndex = Number.parseInt(treeIndexText || "0");
  const Forest = createForest(forestName || "");
  const invalid = (forest: ContextValue<Forest>) =>
    forest?.value == null ||
    treeIndex == null ||
    treeIndex < 0 ||
    treeIndex >= forest.value.trees.length;
  const showTree = useShowTree();
  return (
    <NodeLibs pinnedLibs={pinnedLibs}>
      <Forest>
        {(forest) =>
          invalid(forest) ? (
            <Loading />
          ) : (
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
  const showTree = useShowTree();

  const [anchorEl, setAnchorEl] = useState<null | [number, HTMLElement]>(null);
  const showMenu = (event: MouseEvent<HTMLElement>, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl([index, event.currentTarget]);
  };
  const hideMenu = () => setAnchorEl(null);
  const createTree = async (
    manifest: ContextValue<{ name: string }[]>,
    cloneIndex?: number
  ) => {
    if (!manifest?.value) return;
    const cloneName = cloneIndex == null ? "" : manifest.value[cloneIndex].name;
    const treeName = await prompt({
      title:
        cloneIndex == null
          ? trans("Create Tree")
          : `${trans("Clone Tree")} - ${cloneName}`,
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
    if (cloneIndex == null) {
      // create new
      manifest.value.unshift({ name: treeName });
      await manifest.update(manifest.value);
      // showTree(treeName, 0);
      return;
    } // else clone old
    const data = await createForest(cloneName).load();
    await createForest(treeName).save({ ...data, name: treeName });
    manifest.value.splice(1 + cloneIndex, 0, { name: treeName });
    await manifest.update(manifest.value);
    showTree(treeName, 0);
  };
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
  const cloneTree = async (manifest: ContextValue<{ name: string }[]>) => {
    if (!manifest?.value) return;
    if (anchorEl == null) return; // never
    hideMenu();
    createTree(manifest, anchorEl[0]);
  };
  const [filterKeyword, FilterKeyword] = useFilterKeyword();

  return (
    <Box sx={{ m: 2 }}>
      <ForestManifest>
        {(manifest) =>
          manifest?.value == null ? (
            <Loading />
          ) : (
            <>
              <Stack direction="row">
                <Button
                  sx={{ flexShrink: 0 }}
                  onClick={() => createTree(manifest)}
                >
                  <AddIcon />
                  <Typography>{trans("CREATE")}</Typography>
                </Button>
                <FilterKeyword />
              </Stack>
              {manifest.value.map(({ name }, index) =>
                name.toLowerCase().indexOf(filterKeyword) >= 0 ? (
                  <Link
                    href={`${EditorRoutes.routeMain}/${name}/0`}
                    key={index}
                  >
                    <Button
                      sx={{ textTransform: "none" }}
                      onContextMenu={(event) => showMenu(event, index)}
                    >
                      {name}
                    </Button>
                  </Link>
                ) : null
              )}
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
                <MenuItem onClick={() => cloneTree(manifest)}>
                  <ListItemIcon>
                    <AddIcon />
                  </ListItemIcon>
                  <ListItemText>{trans("Clone Tree")}</ListItemText>
                </MenuItem>
              </Menu>
            </>
          )
        }
      </ForestManifest>
    </Box>
  );
}

export function EditorRoutes(
  withApp: (children: ReactNode, noFrame?: true) => ReactNode
) {
  return (
    <>
      <Route
        path={EditorRoutes.routeMain}
        element={withApp(<ForestManager />)}
      />
      <Route
        path={`${EditorRoutes.routeMain}/:forest/:tree`}
        element={withApp(<ForestRender />)}
      />
      <Route
        path={`${EditorRoutes.routeReadonly}/:forest/:tree`}
        element={withApp(<ReadonlyForestRender />)}
      />
      <Route
        path={`${EditorRoutes.routeLibarary}/:type`}
        element={withApp(<ReadonlyNodeLibs />, true)}
      />
    </>
  );
}
EditorRoutes.routeMain = "/editor";
EditorRoutes.routeReadonly = "/editor-r";
EditorRoutes.routeLibarary = "/editor-l";
