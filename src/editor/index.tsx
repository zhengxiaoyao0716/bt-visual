import Link from "@mui/material/Link";
import { Route, Routes, useParams } from "react-router-dom";

import BTDefine from "../behavior-tree/Define";
import createForest, { Forest } from "../behavior-tree/Forest";
import Snack from "../components/Snack";
import { ContextValue } from "../storage/Storage";
import NodeLibs from "./NodeLibs";
import TreeRender from "./TreeRender";

function ForestRender() {
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
                <TreeRender
                  forest={forest}
                  treeIndex={treeIndex}
                  craeteNavHref={craeteNavHref}
                />
              )
            }
          </Forest>
        </NodeLibs>
      </Snack>
    </BTDefine>
  );
}

function WorkspaceRender() {
  return <Link href={craeteNavHref("Example", 0)}>Example</Link>;
}

export default function Editor() {
  return (
    <Routes>
      <Route path={"/"} element={<WorkspaceRender />} />
      <Route path={`/:forest/:tree`} element={<ForestRender />} />
    </Routes>
  );
}
Editor.route = "/editor";

function craeteNavHref(forest: string, treeIndex: number) {
  return `${Editor.route}/${forest}/${treeIndex}`;
}
