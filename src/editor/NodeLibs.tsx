import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import { DragEvent, MouseEvent, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";

import BTDefine, { BTDefines } from "../behavior-tree/Define";
import type { Node, NodeType } from "../behavior-tree/type";
import { getNodeType } from "../behavior-tree/utils";
import { useDragMoving } from "../components/DragMoving";
import { useFilterKeyword } from "../components/FilterKeyword";
import { TreeItem, TreeView } from "../components/TreeView";
import VerticalScrollPanel from "../components/VerticalScrollPanel";
import WidthController from "../components/WidthController";
import Config from "../storage/Config";
import { TransFunction, useTrans } from "../storage/Locale";
import { NodeSvgRender } from "./NodeRender";

function NodeLibs({
  pinnedLibs,
  children,
}: {
  pinnedLibs(type: string, width: number, height: number): void;
  children: JSX.Element;
}) {
  const config = Config.use();
  if (config?.value == null) return null; // never
  const trans = useTrans();
  const define = BTDefine.use();

  const { nodeLibs } = config.value;

  const widthControllerRef = useRef<HTMLDivElement>(null);
  const [wcProps, { moveX: wcLeft, dragging: wcDragging }, setWCState] =
    useDragMoving((event) => {
      if (event.target !== widthControllerRef.current && !wcDragging) {
        return true;
      }
      event.preventDefault();
      event.stopPropagation();
      return false;
    });
  useEffect(() => {
    if (wcDragging || wcLeft === 0) return;
    const width = nodeLibs.width + wcLeft;
    config.saving ||
      config.update({
        ...config.value,
        nodeLibs: {
          ...nodeLibs,
          width: width < 60 ? 0 : Math.max(nodeLibs.minWidth, width),
        },
      });
    setWCState({ moveX: 0, moveY: 0, dragging: false });
  }, [wcDragging]);

  const troggleWidth = () => {
    const width = nodeLibs.width < 60 ? nodeLibs.minWidth * 2 : 0;
    config.saving ||
      config.update({ ...config.value, nodeLibs: { ...nodeLibs, width } });
  };

  const [filterKeyword, FilterKeyword] = useFilterKeyword();

  const nodeLibProps = {
    config,
    trans,
    define,
    pinnedLibs: (type: string) =>
      pinnedLibs(
        type,
        nodeLibs.width,
        widthControllerRef.current?.clientHeight ?? 300
      ),
  };

  return (
    <Box
      sx={{
        height: "100%",
        overflow: "hidden",
        display: "flex",
        position: "relative",
      }}
      {...wcProps}
    >
      {nodeLibs.width <= 0 ? null : (
        <VerticalScrollPanel style={{ width: `${nodeLibs.width}px` }}>
          <Container sx={{ mb: 1 }}>
            <FilterKeyword />
          </Container>
          {filterKeyword ? (
            <FilteredNodes {...nodeLibProps} keyword={filterKeyword} />
          ) : (
            <>
              <NodeLib {...nodeLibProps} type="Composite" />
              <NodeLib {...nodeLibProps} type="Decorator" />
              <NodeLib {...nodeLibProps} type="Action" />
            </>
          )}
        </VerticalScrollPanel>
      )}
      {children}
      <WidthController
        pos="left"
        style={{
          left: `${Math.max(0, nodeLibs.width) + wcLeft}px`,
        }}
        ref={widthControllerRef}
        onDoubleClick={troggleWidth}
      />
    </Box>
  );
}

export default NodeLibs;

function FilteredNodes({
  trans,
  define,
  keyword,
}: {
  trans: TransFunction;
  define: ReturnType<typeof BTDefine.use>;
  keyword: string;
}) {
  if (define?.value == null) return null;
  const ref = useRef({
    keyword: "",
    nodes: [] as { type: string; alias: string; desc?: string }[],
  });
  const nodes = useMemo(() => {
    const continueSearch =
      ref.current.keyword && keyword.indexOf(ref.current.keyword) >= 0;
    const nodes = continueSearch
      ? ref.current.nodes.filter(
          ({ type, alias }) =>
            type.toLocaleLowerCase().indexOf(keyword) >= 0 ||
            alias.toLowerCase().indexOf(keyword) >= 0
        )
      : [
          define.value["Composite"],
          define.value["Decorator"],
          define.value["Action"],
        ]
          .flatMap((nodes) => Object.entries(nodes))
          .map(([type, node]) => ({
            type,
            alias: trans(type),
            desc: node.desc,
          }));
    console.log(continueSearch);
    ref.current = { keyword, nodes };
    return nodes;
  }, [keyword]);
  return <Nodes trans={trans} define={define} nodes={nodes} />;
}

//#region node lib
export const nodeDraggingRef = {
  draggingType: null as null | NodeType,
};

const nodesSymbol = Symbol("/nodes");
interface NodeLibTree {
  [group: string]: NodeLibTree;
  [nodesSymbol]: { type: string; alias: string; desc?: string }[];
}

interface NodeLibProps {
  config: ReturnType<typeof Config.use>;
  trans: TransFunction;
  define: ReturnType<typeof BTDefine.use>;
  pinnedLibs(type: string): void;
  type: NodeType;
}

function NodeLib({ config, trans, define, pinnedLibs, type }: NodeLibProps) {
  if (type === "Unknown") return null;
  if (config?.value == null) return null;
  const label = trans(`Node.${type}.name`);

  const nodeLibs = config.value.nodeLibs;
  const expanded = nodeLibs.expanded[type];
  const setExpanded = (expanded: boolean) => {
    if (config.saving) return;
    config.update({
      ...config.value,
      nodeLibs: {
        ...nodeLibs,
        expanded: { ...nodeLibs.expanded, [type]: expanded },
      },
    });
  };

  const nodes = useNodes(trans, define?.value?.[type]);

  const openInNewTab = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    pinnedLibs(type);
  };

  return (
    <Box sx={{ margin: "0 0 0.5em -0.5em" }}>
      <TreeView
        label={
          <>
            <Typography
              title={trans(`Node.${type}.desc`)}
              sx={{ userSelect: "none", flexGrow: 1 }}
              onClick={(event) =>
                (event.ctrlKey || event.shiftKey) && openInNewTab(event)
              }
            >
              {label}
            </Typography>
            <IconButton
              size="small"
              title={`${trans("Open in new tab")} - Ctrl/Shift+Click`}
              onClick={openInNewTab}
            >
              <OpenInNewIcon sx={{ fontSize: "1em" }} />
            </IconButton>
          </>
        }
        control={[expanded, setExpanded]}
      >
        <NodeLibTreeRender trans={trans} define={define} nodes={nodes} />
      </TreeView>
    </Box>
  );
}

function useNodes(trans: TransFunction, define?: BTDefines[keyof BTDefines]) {
  return useMemo(() => {
    const nodes: NodeLibTree = { [nodesSymbol]: [] };
    if (define == null) return nodes;

    for (const [key, value] of Object.entries(define)) {
      let treeData = nodes;
      if (value.path) {
        for (const group of value.path.split("/")) {
          if (!(group in treeData)) {
            treeData[group] = { [nodesSymbol]: [] };
          }
          treeData = treeData[group];
        }
      }
      const alias = trans(key);
      treeData[nodesSymbol].push({ type: key, alias, desc: value.desc });
    }
    return nodes;
  }, [trans, define]);
}

function NodeLibTreeRender({
  trans,
  define,
  nodes,
}: {
  trans: TransFunction;
  define: ReturnType<typeof BTDefine.use>;
  nodes: NodeLibTree;
}) {
  return (
    <>
      {Object.entries(nodes).map(([group, nodes]) => (
        <TreeItem key={group}>
          <TreeView
            label={
              <Typography sx={{ userSelect: "none" }}>
                {trans(`Node.Group.${group}`)}
              </Typography>
            }
          >
            <NodeLibTreeRender trans={trans} define={define} nodes={nodes} />
          </TreeView>
        </TreeItem>
      ))}
      <TreeItem>
        <Nodes trans={trans} define={define} nodes={nodes[nodesSymbol]} />
      </TreeItem>
    </>
  );
}
//#endregion

//#region nodes
const NodeContainer = styled("div")`
  display: inline-block;
  margin: 0.1em 0.2em;
  max-width: 100%;
  & > svg {
    cursor: grab;
  }
  & > svg:active {
    cursor: grabbing;
  }
  & > svg > text {
    cursor: text;
  }
`;

function Nodes({
  trans,
  define,
  nodes,
}: {
  trans: TransFunction;
  define: ReturnType<typeof BTDefine.use>;
  nodes: { type: string; alias: string; desc?: string }[];
}) {
  return (
    <Box sx={{ padding: "0.2em 0" }}>
      <Box
        sx={{
          padding: "0.2em",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-evenly",
          position: "relative",
          backgroundColor: ({ palette }) =>
            palette.grey[palette.mode === "light" ? 100 : 900],
        }}
      >
        {nodes.map((node) => (
          <NodeContainer
            key={node.type}
            title={node.desc}
            {...createDragNodeProps({ type: node.type })}
          >
            <NodeSvgRender
              locked={true}
              trans={trans}
              btDefine={define?.value}
              type={node.type}
              size={{ width: undefined, height: 25 }}
            >
              {node.alias}
            </NodeSvgRender>
          </NodeContainer>
        ))}
      </Box>
    </Box>
  );
}

function createDragNodeProps(node: Node) {
  const onDragStart = (event: DragEvent) => {
    nodeDraggingRef.draggingType = getNodeType(node.type);
    event.dataTransfer.effectAllowed = "copyLink";
    event.dataTransfer.setData("text/plain", JSON.stringify(node));
  };
  const onDragEnd = (_event: DragEvent) => {
    nodeDraggingRef.draggingType = null;
  };
  return { draggable: true, onDragStart, onDragEnd };
}
//#endregion

export function ReadonlyNodeLibs() {
  const config = Config.use();
  if (config?.value == null) return null; // never
  const trans = useTrans();
  const define = BTDefine.use();
  const { type } = useParams();
  const nodes = useNodes(
    trans,
    define?.value?.[type as "Composite" | "Decorator" | "Action"]
  );
  return (
    <VerticalScrollPanel>
      <Box sx={{ margin: "0 0 0.5em -0.5em" }}>
        <TreeView>
          <NodeLibTreeRender trans={trans} define={define} nodes={nodes} />
        </TreeView>
      </Box>
    </VerticalScrollPanel>
  );
}
