import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import { Route, Routes, useParams, useNavigate } from "react-router-dom";

import BTDefine from "../behavior-tree/Define";
import createForest, { Forest } from "../behavior-tree/Forest";
import share from "../components/share";
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
    <BTDefine>
      <Snack>
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
      </Snack>
    </BTDefine>
  );
}

function ReadonlyForestRender() {
  const { forest: forestName, tree: treeIndexText } = useParams();
  const treeIndex = Number.parseInt(treeIndexText || "0");
  const Forest = createForest(forestName || "");

  const config = Config.use();
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
              trans={trans}
              readonly={true}
            />
          </LockerContext.Provider>
        );
      }}
    </Forest>
  );
}

function WorkspaceRender() {
  return (
    <Box sx={{ m: 2 }}>
      <Link href={`${Editor.route}/Example/0`}>
        <Button>Example</Button>
      </Link>
    </Box>
  );
}

export default function Editor() {
  return (
    <Routes>
      <Route path={"/"} element={<WorkspaceRender />} />
      <Route
        path={`/readonly/:forest/:tree`}
        element={<ReadonlyForestRender />}
      />
      <Route path={`/:forest/:tree`} element={<ForestRender />} />
    </Routes>
  );
}
Editor.route = "/editor";
