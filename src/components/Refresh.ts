import { useRef, useState } from "react";

export function useRefresh() {
  const ref = useRef(0);
  const [refresh, setRefresh] = useState(0);
  ref.current = refresh;
  return () => setRefresh(1 + ref.current);
}
