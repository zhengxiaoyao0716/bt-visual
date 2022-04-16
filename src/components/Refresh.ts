import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export function useRefresh() {
  const [count, setCount] = useState(0);

  const ref = useRef<Dispatch<SetStateAction<number>>>(() => {});
  // 避免 refresh 里直接捕获 setCount，导致组件卸载后 setCount 泄露
  useEffect(() => {
    ref.current = setCount;
    return () => {
      ref.current = () => {};
    };
  }, []);

  const refresh = useCallback(() => ref.current((count) => 1 + count), []);
  return [count, refresh] as const;
}
