import styled from "@emotion/styled";

export default styled.div`
  position: absolute;
  width: 6px;
  height: 100%;
  top: 0;
  pointer-events: visible;
  cursor: w-resize;
  border: 2px dashed #cccccc;
  &:hover,
  &:active {
    border-style: solid;
  }
`;