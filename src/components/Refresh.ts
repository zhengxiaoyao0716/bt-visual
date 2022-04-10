import { useCallback, useState } from "react";

export function useRefresh() {
  const [count, setCount] = useState(0);
  return [
    count,
    useCallback(() => setCount((count) => 1 + count), []),
  ] as const;
}
