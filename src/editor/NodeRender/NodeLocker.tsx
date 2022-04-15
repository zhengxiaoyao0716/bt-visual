import { createContext, useCallback, useRef, useState } from "react";

type Locked = boolean;
export const LockerContext = createContext(false);

interface Props {
  children: (lock: Locked, troggle: () => void) => JSX.Element;
}
export function useLocker(
  initLocked: Locked = false,
  onChange?: (locked: boolean) => void
) {
  const state = useState(initLocked);
  const ref = useRef(() => {});

  const Controller = useCallback(function Controller({ children }: Props) {
    const [locked, setLocked] = useState(initLocked);
    const troggle = () => {
      setLocked(!locked);
      state[1](!locked);
      onChange?.(!locked);
    };
    ref.current = troggle;
    return children(locked, troggle);
  }, []);

  return { locked: state[0], troggle: () => ref.current?.(), Controller };
}
