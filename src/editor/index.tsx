import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";

import {
  default as BTDefine,
  default as Define,
} from "../behavior-tree/Define";
import createForest, { Forest, ForestMainfest } from "../behavior-tree/Forest";
import share from "../common/share";
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
  return (
    <Box sx={{ m: 2 }}>
      <ForestMainfest>
        {(manifest) =>
          manifest?.value == null ? (
            <Loading />
          ) : (
            manifest.value.map(({ name }, index) => (
              <Link href={`${Editor.route}/${name}/0`} key={index}>
                <Button sx={{ textTransform: "none" }}>{name}</Button>
              </Link>
            ))
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
