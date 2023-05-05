import Stack from "@mui/material/Stack";
import { styled } from "@mui/material/styles";

const pad = 0.3;

export default styled(Stack)(({ theme: { palette } }) => ({
  padding: `${pad}em 0 0 ${pad}em`,
  background: palette.background.paper,
  flex: "0 0 auto",
  height: "100%",
  overflowY: "scroll",
  "&::-webkit-scrollbar": {
    width: `${pad}em`,
    height: `${pad}em`,
  },
  "&::-webkit-scrollbar-thumb": {
    background: palette.action.focus,
  },
}));
