import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { styled } from "@mui/material/styles";
import { ReactNode, useState } from "react";

const TreeRoot = styled("div")`
  position: relative;
  &:hover > div:first-of-type {
    border-left-color: ${({ theme: { palette } }) => palette.primary.main};
  }
`;

const TreeHead = styled("div")`
  display: flex;
  flex-direction: row;
  cursor: pointer;
  border-left: 1px solid transparent;

  &:hover {
    background-color: ${({ theme: { palette } }) => palette.action.focus};
  }
`;

const TreeBody = styled("ul")`
  list-style: none;
  padding-left: 0.5em;
  margin: 0;

  & > li {
    border-left: 1px solid ${({ theme: { palette } }) => palette.divider};
  }
`;

export const TreeItem = styled("li")``;

export function TreeView({
  label,
  children,
  control,
}: {
  label: ReactNode;
  children: () => ReactNode;
  control?: [boolean, (expanded: boolean) => void];
}) {
  const [expanded, setExpanded] = control ?? useState(false);
  return (
    <TreeRoot>
      <TreeHead onClick={() => setExpanded(!expanded)}>
        {true ? (
          <ChevronRightIcon color="action" />
        ) : (
          <ExpandMoreIcon color="action" />
        )}
        {label}
      </TreeHead>
      {expanded ? <TreeBody>{children()}</TreeBody> : null}
    </TreeRoot>
  );
}
