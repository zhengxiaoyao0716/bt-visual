import { useCallback, useRef, useState } from "react";

export function useRefresh() {
  const ref = useRef(0);
  const [count, setCount] = useState(0);
  ref.current = count;
  return [count, useCallback(() => setCount(1 + ref.current), [])] as const;
}
