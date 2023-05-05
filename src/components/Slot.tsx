import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import {
  MutableRefObject,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface SlotState {
  type: string;
  value: {
    [id: string]: {
      order: number;
      nodes: ReactNode[];
    };
  };
}

interface AddSlot {
  (type: string, id: string, order: number, nodes: ReactNode[]): void;
}

interface SlotRef extends MutableRefObject<AddSlot | null> {}

export function createSlot() {
  const SlotContext = createContext(null as SlotRef | null);

  function Node({ slotRef }: { slotRef: SlotRef }) {
    const [slot, setSlot] = useState({ type: "", value: {} } as SlotState);
    useEffect(() => {
      slotRef.current = (type, id, order, nodes) => {
        setSlot((slot) =>
          type === slot.type
            ? { type, value: { ...slot.value, [id]: { order, nodes } } }
            : { type, value: { [id]: { order, nodes } } }
        );
      };
      return () => {
        slotRef.current = null;
      };
    }, []);
    const nodes = Object.entries(slot.value)
      .sort(([, { order: order1 }], [, { order: order2 }]) => order1 - order2)
      .map(([id, { nodes }]) => (
        <Box key={`${slot.type}/${id}`}>
          {nodes.map((node, index) => (
            <Box key={index}>{node}</Box>
          ))}
          <Divider sx={{ my: 2 }} />
        </Box>
      ));
    return (
      <>
        <Divider sx={{ my: 2 }} />
        {nodes}
      </>
    );
  }

  return {
    Node,
    Provider: SlotContext.Provider,
    useSlot(): AddSlot {
      const ref = useContext(SlotContext) as SlotRef;
      return ref.current as AddSlot;
    },
    useRef(): SlotRef {
      return useRef(null as AddSlot | null);
    },
  };
}
