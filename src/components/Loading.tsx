import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";

export default function Loading() {
  return (
    <Box sx={{ ml: 6 }}>
      <Skeleton width="60vw" height="60vh" />
      <Skeleton width="60vw" height="10vh" />
      <Skeleton width="45vw" height="10vh" />
    </Box>
  );
}
