import Box from "@mui/material/Box";
import { ReactNode } from "react";
import {
  createContext,
  MutableRefObject,
  useContext,
  useRef,
  useState,
} from "react";

interface SlotValue {
  node: ReactNode;
  order: number;
}

interface SlotState {
  type: string;
  slots: {
    [id: string]: SlotValue;
  };
}

interface AddSlot {
  (type: string, slots: { [id: string]: SlotValue }): void;
}

interface SlotRef extends MutableRefObject<AddSlot | null> {}

export function createSlot() {
  const SlotContext = createContext(null as SlotRef | null);

  function Node({ slotRef }: { slotRef: SlotRef }) {
    const [slot, setSlot] = useState({ type: "", slots: {} } as SlotState);
    slotRef.current = (type, slots) => {
      if (type === slot.type) {
        setSlot({ type, slots: { ...slot.slots, ...slots } });
      } else {
        setSlot({ type, slots });
      }
    };
    const nodes = Object.values(slot.slots)
      .sort((a, b) => a.order - b.order)
      .map((value, index) => <Box key={index}>{value.node}</Box>);
    return <>{nodes}</>;
  }

  return {
    Node,
    Provider: SlotContext.Provider,
    useSlot(): AddSlot {
      const ref = useContext(SlotContext) as SlotRef;
      return (type, slots) =>
        // 强制压入事件循环延迟执行，避免在渲染过程中插入 slot
        setTimeout(() => ref.current?.(type, slots), 0);
    },
    useRef(): SlotRef {
      return useRef(null as AddSlot | null);
    },
  };
}
