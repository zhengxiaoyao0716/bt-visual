import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import { DragEvent, useEffect, useMemo, useRef } from "react";

import BTDefine from "../behavior-tree/Define";
import type { Node, NodeType } from "../behavior-tree/type";
import { getNodeType } from "../behavior-tree/utils";
import { useDragMoving } from "../components/DragMoving";
import { TreeItem, TreeView } from "../components/TreeView";
import VerticalScrollPanel from "../components/VerticalScrollPanel";
import WidthController from "../components/WidthController";
import Config from "../storage/Config";
import { TransFunction, useTrans } from "../storage/Locale";
import { NodeSvgRender } from "./NodeRender";

function NodeLibs({ children }: { children: JSX.Element }) {
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

  const nodeLibProps = { config, trans, define };

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
          <NodeLib {...nodeLibProps} type="Composite" />
          <NodeLib {...nodeLibProps} type="Decorator" />
          <NodeLib {...nodeLibProps} type="Action" />
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

export const nodeDraggingRef = {
  draggingType: null as null | NodeType,
};

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

const nodesSymbol = Symbol("/nodes");
interface NodeLibTree {
  [path: string]: NodeLibTree;
  [nodesSymbol]: { type: string; desc: string }[];
}

interface NodeLibProps {
  config: ReturnType<typeof Config.use>;
  trans: TransFunction;
  define: ReturnType<typeof BTDefine.use>;
  type: NodeType;
}
function NodeLib({ config, trans, define, type }: NodeLibProps) {
  if (type === "Unknown") return null;
  if (config?.value == null || define?.value == null) return null;
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

  const nodes = useMemo(() => {
    const nodes: NodeLibTree = { [nodesSymbol]: [] };
    for (const [nodeType, nodeDefine] of Object.entries(define.value[type])) {
      let treeData = nodes;
      if (nodeDefine.path) {
        for (const path of nodeDefine.path.split("/")) {
          if (!(path in treeData)) {
            treeData[path] = { [nodesSymbol]: [] };
          }
          treeData = treeData[path];
        }
      }
      const desc = nodeDefine.desc || `${trans(nodeType)} : ${label}`;
      treeData[nodesSymbol].push({ type: nodeType, desc });
    }
    return nodes;
  }, [trans, define.value, type]);

  return (
    <Box
      sx={{
        marginBottom: "0.5em",
      }}
    >
      <TreeView
        label={
          <Typography
            title={trans(`Node.${type}.desc`)}
            sx={{ userSelect: "none" }}
          >
            {label}
          </Typography>
        }
        control={[expanded, setExpanded]}
      >
        {() => (
          <NodeLibTreeRender trans={trans} define={define} nodes={nodes} />
        )}
      </TreeView>
    </Box>
  );
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
      {Object.entries(nodes).map(([path, nodes]) => (
        <TreeItem key={path}>
          <TreeView
            label={<Typography sx={{ userSelect: "none" }}>{path}</Typography>}
          >
            {() => (
              <NodeLibTreeRender trans={trans} define={define} nodes={nodes} />
            )}
          </TreeView>
        </TreeItem>
      ))}
      <TreeItem>
        <Box
          sx={{
            padding: "0.2em",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-evenly",
            position: "relative",
            backgroundColor: ({ palette }) =>
              palette.grey[palette.mode === "light" ? 100 : 900],
            pointerEvents: "none",
          }}
        >
          {nodes[nodesSymbol].map((node) => (
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
                {trans(node.type)}
              </NodeSvgRender>
            </NodeContainer>
          ))}
        </Box>
      </TreeItem>
    </>
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
