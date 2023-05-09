import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";

export default function Loading() {
  return (
    <Box sx={{ ml: 6, width: "100%", height: "100%" }}>
      <Skeleton width="60%" height="60%" />
      <Skeleton width="60%" height="10%" />
      <Skeleton width="45%" height="10%" />
    </Box>
  );
}
