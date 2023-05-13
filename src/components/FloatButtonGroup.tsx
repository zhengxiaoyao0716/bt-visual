import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import { ReactNode } from "react";

const FloatButtonGroup = styled(Box)(({ theme: { palette } }) => ({
  position: "absolute",
  top: "2em",
  display: "flex",
  width: "fit-content",
  border: `1px solid ${palette.divider}`,
  borderRadius: 1,
  backdropFilter: "blur(3px)",
  "& hr": {
    borderLeft: `1px solid ${palette.divider}`,
  },
}));
export default FloatButtonGroup;

export function FloatButtonLabel({ children }: { children: ReactNode }) {
  return (
    <Typography
      fontSize="small"
      color={({ palette }) => palette.text.secondary}
      sx={{
        position: "absolute",
        right: 0,
        top: "-1.5em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </Typography>
  );
}
