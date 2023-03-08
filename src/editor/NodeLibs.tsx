import styled from "@emotion/styled";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DragEvent, useEffect, useMemo, useRef } from "react";

import BTDefine from "../behavior-tree/Define";
import type { Node, NodeType } from "../behavior-tree/type";
import { useDragMoving } from "../components/DragMoving";
import { useFilterKeyword } from "../components/FilterKeyword";
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
          width:
            width < 60 ? 0 : Math.max(nodeLibs.minWidth, Math.min(width, 1000)),
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
          <Container>
            <FilterKeyword />
          </Container>
          <NodeLib {...nodeLibProps} type="Composite" />
          <NodeLib {...nodeLibProps} type="Decorator" />
          <NodeLib {...nodeLibProps} type="Action" />
        </Stack>
      )}
      {children}
      <WidthController
        style={{
          left: `${Math.max(0, nodeLibs.width - 6) + wcLeft}px`,
        }}
        ref={widthControllerRef}
        onDoubleClick={troggleWidth}
      />
    </Box>
  );
}

export default NodeLibs;

export const nodeDraggingRef = {
  draggingType: null as null | "Composite" | "Decorator" | "Action",
};

const NodeContainer = styled.div`
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

interface NodeLibProps {
  config: ReturnType<typeof Config.use>;
  trans: TransFunction;
  define: ReturnType<typeof BTDefine.use>;
  keyword: string;
  type: NodeType;
}
function NodeLib({ config, trans, define, keyword, type }: NodeLibProps) {
  if (type === "Unknown") return null;
  if (config?.value == null) return null;
  if (define?.value == null) return null;
  const label = trans(`Node.${type}.name`);

  const { nodeLibs } = config.value;
  const nodes = useMemo(() => {
    const nodes = Object.entries(define.value[type]).map(([type, define]) => ({
      type,
      translated: {
        type: trans(type),
        desc: define.desc || `${trans(type)} : ${label}`,
      },
    }));
    if (!keyword) return nodes;
    return nodes.filter((node) =>
      [node.type, node.translated.type].some(
        (key) => key.toLowerCase().indexOf(keyword) >= 0
      )
    );
  }, [config, trans, define.value, type, keyword]);

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
          position: "relative",
        }}
      >
        {nodes.map((node, index) => (
          <NodeContainer
            key={index}
            title={node.translated.desc}
            {...createDragNodeProps(type, node)}
          >
            <NodeSvgRender
              locked={true}
              trans={trans}
              btDefine={define.value}
              type={node.type}
              size={{ width: undefined, height: 25 }}
            >
              {trans(node.translated.type)}
            </NodeSvgRender>
          </NodeContainer>
        ))}
      </AccordionDetails>
    </Accordion>
  );
}

function createDragNodeProps(
  type: "Composite" | "Decorator" | "Action",
  node: Node
) {
  const onDragStart = (event: DragEvent) => {
    nodeDraggingRef.draggingType = type;
    event.dataTransfer.effectAllowed = "copyLink";
    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ type: node.type })
    );
  };
  const onDragEnd = (_event: DragEvent) => {
    nodeDraggingRef.draggingType = null;
  };
  return { draggable: true, onDragStart, onDragEnd };
}
