import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import ContentPasteOffIcon from "@mui/icons-material/ContentPasteOff";
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
    paste?: (node: Node) => void;
  }[];
  clipboard: {
    node?: Node;
  };
  remove?: () => void;
  copy?: () => void;
  paste?: () => void;
  refresh(): void;
}

const SelectorContext = createContext<MutableRefObject<Selector> | null>(null);

export default function NodeSelector({ children }: { children: ReactNode }) {
  const ref = useRef<Selector>({ selected: [], clipboard: {}, refresh() {} });
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
          display: "flex",
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

    selector.copy = () => {
      if (selector == null || selector.selected.length <= 0) return;
      if (selector.selected.length > 1) return;
      const { node } = selector.selected[0];
      selector.clipboard.node = JSON.parse(JSON.stringify(node));
      selector.refresh();
    };
    selector.paste = () => {
      const copied = selector.clipboard.node;
      if (copied == null) return;
      if (selector == null || selector.selected.length <= 0) return;
      if (selector.selected.length > 1) return;
      const { node, paste } = selector.selected[0];
      if (!paste) return;
      if ("fold" in node && (node as { fold?: true }).fold) return;
      paste(copied);
      // selector.refresh();
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
      },
      {
        code: "KeyC",
        ctrlKey: true,
        callback: selector.copy,
      },
      {
        code: "KeyV",
        ctrlKey: true,
        callback: selector.paste,
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

  const { node: selected, paste } = selector.selected[0];
  const firstAlias = selected.alias || trans(selected.type);
  const selectedAlias =
    selNum == 1
      ? firstAlias
      : `${firstAlias}${trans(" ... ${num} nodes", { num: selNum })}]`;

  const removeDesc = `${trans("Remove Nodes")} [${selectedAlias}]`;
  const copyDesc = `${trans("Copy Nodes")} [${selectedAlias}]`;

  const clipNode = selector.clipboard.node;
  const clipAlias =
    clipNode == null ? null : clipNode.alias || trans(clipNode.type);
  const isSelectedFold =
    "fold" in selected && (selected as { fold?: true }).fold;

  const pasteDesc =
    clipNode == null
      ? undefined
      : isSelectedFold
      ? trans("Disallow pasting to collapsed node")
      : paste
      ? `${trans("Paste Nodes")} [${clipAlias}]`
      : trans("Selected node does not support pasting");

  const cancel = () => {
    selector.selected = [];
    selector.clipboard = {};
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
      <IconButton onClick={selector.copy} title={copyDesc}>
        <ContentCopyIcon />
      </IconButton>
      <IconButton onClick={selector.paste} title={pasteDesc}>
        {clipNode && !isSelectedFold && paste ? (
          <ContentPasteIcon />
        ) : (
          <ContentPasteOffIcon />
        )}
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

export function useSelector(
  trans: TransFunction,
  refresh: () => void,
  paste?: (node: Node) => void
) {
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
          paste,
        });
        selector.refresh();
      }
    },
  };
}
