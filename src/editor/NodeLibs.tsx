import { useEffect, useMemo, useRef, useState } from "react";
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
import { NodeType } from "../behavior-tree/define";
import Config from "../storage/Config";
import { useDragMoving } from "../components/DragMoving";
import BTNodes from "../storage/BTNodes";
import { NodeSvgRender } from "./NodeRender";

const WidthController = styled.div`
  position: absolute;
  width: 6px;
  height: 100%;
  right: 0;
  top: 0;
  pointer-events: visible;
  cursor: w-resize;
  &:hover,
  &:active {
    border: 2px dashed #cccccc;
  }
`;

function NodeLibs({ children }: { children: JSX.Element }) {
  const config = Config.use();
  const trans = useTrans();
  if (config?.value == null) return null;
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
    const width = wcLeft + nodeLibs.width;
    config.saving ||
      config.update({
        ...config.value,
        nodeLibs: {
          ...nodeLibs,
          width:
            width < 30 ? 0 : Math.max(nodeLibs.minWidth, Math.min(width, 1000)),
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
      {nodeLibs.width == 0 ? null : (
        <Stack
          sx={{
            width: `${nodeLibs.width}px`,
            flex: "0 0 auto",
            height: "100%",
            overflowY: "scroll",
          }}
        >
          <SearchNode onChange={onSearchKeywordChange} />
          <NodeLib {...nodeLibProps} type="Composite" />
          <NodeLib {...nodeLibProps} type="Decorator" />
          <NodeLib {...nodeLibProps} type="Action" />
        </Stack>
      )}
      <Box
        sx={{
          flex: "1 1 auto",
          m: 2,
          overflow: "hidden",
        }}
      >
        {children}
      </Box>
      <WidthController
        style={{
          left: `${wcLeft + Math.max(0, nodeLibs.width - 10)}px`,
        }}
        ref={widthControllerRef}
      />
    </Box>
  );
}

export default BTNodes.hoc(NodeLibs);

const NodeContainer = styled.div`
  display: inline-block;
  margin: 0.1em 0.2em;
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
          <NodeContainer key={index}>
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
