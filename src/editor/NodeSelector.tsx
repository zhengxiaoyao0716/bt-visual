import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import {
  createContext,
  MouseEvent,
  MutableRefObject,
  ReactNode,
  useContext,
  useEffect,
  useRef,
} from "react";

import { Action, Composite, Decorator, Node } from "../behavior-tree/type";
import { useRefresh } from "../components/Refresh";
import { TransFunction, useTrans } from "../storage/Locale";
import { useNodePropsEditor } from "./Properties";

interface Selector {
  selected: {
    node: Node;
    remove(): void;
  }[];
  refresh(): void;
}

const SelectorContext = createContext<MutableRefObject<Selector> | null>(null);

export default function NodeSelector({ children }: { children: ReactNode }) {
  const ref = useRef<Selector>({ selected: [], refresh() {} });
  return (
    <SelectorContext.Provider value={ref}>
      <Box
        sx={{
          flexGrow: 1,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {children}
        <NodeMenus />
      </Box>
    </SelectorContext.Provider>
  );
}

function NodeMenus() {
  const trans = useTrans();
  const [, refresh] = useRefresh();
  const selector = useContext(SelectorContext)?.current;
  useEffect(() => {
    if (selector == null) return;
    selector.refresh = refresh;
    return () => {
      selector.refresh = () => {};
    };
  }, [selector]);

  if (selector == null) return null;
  const selNum = selector.selected.length;
  if (selNum <= 0) return null;

  const firstSelected = selector.selected[0];
  const firstAlias = firstSelected.node.alias || trans(firstSelected.node.type);

  const remove = () => {
    if (selector.selected.length > 1) {
      alert("// TODO 多选删除暂时还有点 bug 没解决。。。");
      return;
    }
    for (const selected of selector.selected) {
      selected.remove();
    }
    selector.selected = [];
    selector.refresh();
  };
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
      <IconButton onClick={remove} title={removeDesc}>
        <DeleteIcon />
      </IconButton>
      <IconButton onClick={cancel}>
        <CloseIcon />
      </IconButton>
    </Box>
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
        event.ctrlKey || event.shiftKey || (selector.selected = []);
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
