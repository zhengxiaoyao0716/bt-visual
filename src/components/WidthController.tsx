import { Theme, styled } from "@mui/material/styles";

export default styled("div")`
  position: absolute;
  width: 5px;
  height: 100%;
  top: 0;
  pointer-events: visible;
  cursor: w-resize;
  ${({ theme: { palette } }) =>
    ({ pos }: { pos: "left" | "right" }) =>
      [
        `border-${pos}: 1px solid ${palette.divider};`,
        `&:hover, &:active { border-${pos}: 3px solid ${palette.primary.main}; }`,
      ]}
`;
