import { DragEvent, useEffect, useMemo, useRef, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import styled from "@emotion/styled";
import Container from "@mui/material/Container";
import Input from "@mui/material/Input";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";

import { TransFunction, useTrans } from "../storage/Locale";
import { Node, NodeType } from "../behavior-tree/define";
import Config from "../storage/Config";
import { useDragMoving } from "../components/DragMoving";
import BTNodes from "../storage/BTNodes";
import { NodeSvgRender } from "./NodeRender";
import WidthController from "../components/WidthController";

function NodeLibs({ children }: { children: JSX.Element }) {
  const config = Config.use();
  if (config?.value == null) return null; // never
  const trans = useTrans();
  const btNodes = BTNodes.use();

  const { nodeLibs } = config.value;

  const widthControllerRef = useRef<HTMLDivElement>(null);
  const [wcProps, { left: wcLeft, dragging: wcDragging }, setWCState] =
    useDragMoving((event) => {
      if (event.target !== widthControllerRef.current && !wcDragging)
        return true;
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
          width:
            width < 60 ? 0 : Math.max(nodeLibs.minWidth, Math.min(width, 1000)),
        },
      });
    setWCState({ left: 0, top: 0, dragging: false });
  }, [wcDragging]);

  const [filterKeyword, setFilterKeyword] = useState("");
  const onSearchKeywordChange = (value: string) => {
    const keyword = value.trim().toLowerCase();
    keyword === filterKeyword || setFilterKeyword(keyword);
  };

  const nodeLibProps = {
    config,
    trans,
    btNodes,
    keyword: filterKeyword,
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
        <Stack
          sx={{
            width: `${nodeLibs.width}px`,
            paddingRight: "6px",
            flex: "0 0 auto",
            height: "100%",
            overflowY: "scroll",
            "&::-webkit-scrollbar": {
              display: "none",
            },
          }}
        >
          <SearchNode onChange={onSearchKeywordChange} />
          <NodeLib {...nodeLibProps} type="Composite" />
          <NodeLib {...nodeLibProps} type="Decorator" />
          <NodeLib {...nodeLibProps} type="Action" />
        </Stack>
      )}
      <WidthController
        style={{
          left: `${Math.max(0, nodeLibs.width - 6) + wcLeft}px`,
        }}
        ref={widthControllerRef}
      />
      {children}
    </Box>
  );
}

export default BTNodes.hoc(NodeLibs);

export const nodeDraggingRef = {
  draggingType: null as null | "Composite" | "Decorator" | "Action",
};

const NodeContainer = styled.div`
  display: inline-block;
  margin: 0.1em 0.2em;
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

interface NodeLibProps {
  config: ReturnType<typeof Config.use>;
  trans: TransFunction;
  btNodes: ReturnType<typeof BTNodes.use>;
  keyword: string;
  type: NodeType;
}
function NodeLib({ config, trans, btNodes, keyword, type }: NodeLibProps) {
  if (type === "Unknown") return null;
  if (config?.value == null) return null;
  if (btNodes?.value == null) return null;

  const { nodeLibs } = config.value;
  const nodes = useMemo(() => {
    const nodes = btNodes.value[type].map((node) => ({
      ...node,
      translated: {
        type: trans(node.type),
      },
    }));
    if (!keyword) return nodes;
    return nodes.filter((node) =>
      [node.type, node.translated.type].some(
        (key) => key.toLowerCase().indexOf(keyword) >= 0
      )
    );
  }, [config, trans, btNodes.value, type, keyword]);

  const fold = nodeLibs.fold[type];
  const handleFoldChange = () =>
    config.saving ||
    config.update({
      ...config.value,
      nodeLibs: {
        ...nodeLibs,
        fold: {
          ...nodeLibs.fold,
          [type]: !fold,
        },
      },
    });

  const label = trans(`Node.${type}.name`);

  return (
    <Accordion
      disableGutters
      sx={{
        backgroundColor: ({ palette }) =>
          palette.grey[palette.mode === "light" ? 100 : 900],
        marginTop: 1,
      }}
      expanded={fold}
      onChange={handleFoldChange}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={label}
        title={trans(`Node.${type}.desc`)}
      >
        <Typography>{label}</Typography>
      </AccordionSummary>
      <AccordionDetails
        sx={{
          padding: 1,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-evenly",
        }}
      >
        {nodes.map((node, index) => (
          <NodeContainer key={index} {...createDragNodeProps(type, node)}>
            <NodeSvgRender type={node.type} size={{ width: 100, height: 30 }}>
              {trans(node.translated.type)}
            </NodeSvgRender>
          </NodeContainer>
        ))}
      </AccordionDetails>
    </Accordion>
  );
}

function SearchNode({ onChange }: { onChange(keyword: string): void }) {
  return (
    <Container>
      <Input
        fullWidth
        startAdornment={
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        }
        onChange={(event) => onChange(event.target.value)}
      />
    </Container>
  );
}

function createDragNodeProps(
  type: "Composite" | "Decorator" | "Action",
  node: Node
) {
  const onDragStart = (event: DragEvent) => {
    nodeDraggingRef.draggingType = type;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/json", JSON.stringify(node));
  };
  const onDragEnd = (_event: DragEvent) => {
    nodeDraggingRef.draggingType = null;
  };
  return { draggable: true, onDragStart, onDragEnd };
}
