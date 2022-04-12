import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import {
  createContext,
  MouseEvent,
  MutableRefObject,
  ReactNode,
  RefObject,
  useContext,
  useEffect,
  useRef,
} from "react";

import { Action, Composite, Decorator, Node } from "../behavior-tree/type";
import { addHotkeyListener } from "../components/Hotkey";
import { useRefresh } from "../components/Refresh";
import { TransFunction, useTrans } from "../storage/Locale";
import { useNodePropsEditor } from "./Properties";

interface Selector {
  selected: {
    node: Node;
    remove(): void;
  }[];
  refresh(): void;
  remove(): void;
}

const SelectorContext = createContext<MutableRefObject<Selector> | null>(null);

export default function NodeSelector({ children }: { children: ReactNode }) {
  const ref = useRef<Selector>({ selected: [], refresh() {}, remove() {} });
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <SelectorContext.Provider value={ref}>
      <Box
        id="nodeSelectorContainer"
        ref={containerRef}
        sx={{
          flexGrow: 1,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {children}
        <NodeMenus containerRef={containerRef} />
      </Box>
    </SelectorContext.Provider>
  );
}

function NodeMenus({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement>;
}) {
  const trans = useTrans();
  const [, refresh] = useRefresh();
  const selector = useContext(SelectorContext)?.current;

  useEffect(() => {
    if (selector == null) return;
    selector.refresh = refresh;
    selector.remove = () => {
      if (selector == null || selector.selected.length <= 0) return;
      if (selector.selected.length > 1) {
        // alert("// TODO 多选删除暂时还有点 bug 没解决。。。"); // 暂时不做多选删除了
        return;
      }
      for (const selected of selector.selected) {
        selected.remove();
      }
      selector.selected = [];
      selector.refresh();
    };

    const removeHotkeyListener = addHotkeyListener(
      {
        code: "Delete",
        callback: selector.remove,
      },
      {
        code: "KeyD",
        ctrlKey: true,
        callback: selector.remove,
      }
    );
    return () => {
      selector.refresh = () => {};
      selector.remove = () => {};
      removeHotkeyListener();
    };
  }, [selector]);

  useEffect(() => {
    const container = containerRef.current;
    if (container == null) return;
    const hide = () => {
      if (selector == null || selector.selected.length <= 0) return;
      selector.selected = [];
      selector.refresh();
    };
    container.addEventListener("cancelSelector", hide);
    return () => {
      container.removeEventListener("cancelSelector", hide);
    };
  }, [containerRef.current]);

  if (selector == null) return null;
  const selNum = selector.selected.length;
  if (selNum <= 0) return null;

  const firstSelected = selector.selected[0];
  const firstAlias = firstSelected.node.alias || trans(firstSelected.node.type);

  const removeDesc =
    selNum == 1
      ? `${trans("Remove Nodes")} [${firstAlias}]`
      : `${trans("Remove Nodes")} [${firstAlias}${trans(
          " ... ${num} nodes"
        ).replace("${num}", String(selNum))}]`;

  const cancel = () => {
    selector.selected = [];
    selector.refresh();
  };

  return (
    <Box
      sx={{
        position: "absolute",
        right: "2em",
        top: "2em",
        display: "flex",
        width: "fit-content",
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        bgcolor: "background.paper",
      }}
    >
      <IconButton onClick={selector.remove} title={removeDesc}>
        <DeleteIcon />
      </IconButton>
      <IconButton onClick={cancel}>
        <CloseIcon />
      </IconButton>
    </Box>
  );
}

export function cancelSelector() {
  const container = document.getElementById("nodeSelectorContainer");
  container?.dispatchEvent(
    new CustomEvent("cancelSelector", { bubbles: true })
  );
}

export function useSelector(trans: TransFunction, refresh: () => void) {
  const propsEditor = useNodePropsEditor(trans, refresh);
  const selector = useContext(SelectorContext)?.current;
  return {
    onClick(
      node: Composite | Decorator | Action,
      remove: () => void,
      event: MouseEvent
    ) {
      event.stopPropagation();
      event.preventDefault();

      propsEditor.show(node);
      if (selector == null) return;
      const filtered = selector.selected.filter(
        (selected) => selected.node !== node
      );
      if (filtered.length < selector.selected.length) {
        selector.selected = filtered;
        selector.refresh();
      } else {
        // event.ctrlKey || event.shiftKey || (selector.selected = []);
        selector.selected = []; // 暂时不做多选删除了
        selector.selected.push({
          node,
          remove() {
            propsEditor.hide();
            remove();
          },
        });
        selector.refresh();
      }
    },
  };
}
