import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import ContentPasteOffIcon from "@mui/icons-material/ContentPasteOff";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
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

import {
  Action,
  Composite,
  Decorator,
  Node,
  Tree,
} from "../behavior-tree/type";
import { EMPTY_NODE, getNodeType } from "../behavior-tree/utils";
import clipboard from "../components/clipboard";
import { addHotkeyListener, Hotkey } from "../components/Hotkey";
import { useRefresh } from "../components/Refresh";
import Snack from "../components/Snack";
import { TransFunction, useTrans } from "../storage/Locale";
import { LockerContext } from "./NodeRender/NodeLocker";
import { PropertiesContext, useNodePropsEditor } from "./Properties";
import Undo, { UndoManager } from "./Undo";

export type DeliverParent =
  | { tree: Tree }
  | {
      composite: Composite;
      refresh(): void;
      redrawLines(): void;
    };

interface Selector {
  selected: {
    parent: DeliverParent;
    node: Node;
  }[];
  refresh(): void;
  copy?: () => void;
  paste?: () => void;
  remove?: () => void;
}

const SelectorContext = createContext<MutableRefObject<Selector> | null>(null);

export default function NodeSelector({ children }: { children: ReactNode }) {
  const ref = useRef<Selector>({ selected: [], refresh() {} });
  const containerRef = useRef<HTMLDivElement>(null);

  const context = useContext(PropertiesContext);
  const hidePropsEditor = () => context?.setOptions(null);
  const snack = Snack.use();
  const undoManager = Undo.use();

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
        <NodeMenus
          containerRef={containerRef}
          hidePropsEditor={hidePropsEditor}
          showSnack={snack.show}
          undoManager={undoManager}
        />
      </Box>
    </SelectorContext.Provider>
  );
}

function findDirectlyDecorator(node: Node, target: Node): Decorator | null {
  if (getNodeType(node.type) !== "Decorator") return null;
  const decorator = node as Decorator;
  return decorator.node === target
    ? decorator
    : findDirectlyDecorator(decorator.node, target);
}
// 查找某节点在组合节点下的第几个分支以及其直接装饰器节点
function findPosition(
  composite: Composite,
  target: Node
): [number | null, Decorator | null] {
  const { nodes } = composite;
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    if (node === target) return [index, null];
    if (getNodeType(node.type) !== "Decorator") continue;
    const decorator = node as Decorator;
    const found = findDirectlyDecorator(decorator, target);
    if (found != null) return [index, found];
  }
  return [null, null];
}

function getNodesAlias(
  trans: TransFunction,
  num: number,
  first: Node,
  last: Node
) {
  return num == 1
    ? first.alias || trans(first.type)
    : `${last.alias || trans(last.type)}${trans(" ... ${num} nodes", { num })}`;
}

function getSelectedAlias(trans: TransFunction, selector: Selector): string {
  if (selector.selected == null) return "";
  const selNum = selector.selected.length;
  const { node: first } = selector.selected[0];
  const { node: last } = selector.selected[selNum - 1];
  return getNodesAlias(trans, selNum, first, last);
}

function NodeMenus({
  containerRef,
  hidePropsEditor,
  showSnack,
  undoManager,
}: {
  containerRef: RefObject<HTMLDivElement>;
  hidePropsEditor(): void;
  showSnack(message: string, duration?: number): Promise<void>;
  undoManager: UndoManager;
}) {
  const trans = useTrans();
  const [, refresh] = useRefresh();
  const selector = useContext(SelectorContext)?.current;
  const locked = useContext(LockerContext);

  const removeDesc = trans("Remove Nodes");
  const copyDesc = trans("Copy Nodes");

  useEffect(() => {
    if (selector == null) return;
    selector.refresh = refresh;

    selector.copy = async () => {
      if (selector == null || selector.selected.length <= 0) return;
      const nodes = selector.selected.map(({ node }) => node);
      await clipboard.write("nodes", nodes);
      selector.refresh();
    };

    selector.paste = locked
      ? undefined
      : async () => {
          const copied: Node[] | null = await clipboard.read("nodes");
          if (copied == null) return;
          if (selector == null || selector.selected.length <= 0) return;
          if (selector.selected.length > 1) return;
          const { parent, node } = selector.selected[0];
          const canPaste = getNodeType(node.type) === "Composite";
          if (!canPaste) return;
          if ("fold" in node && (node as { fold?: true }).fold) return;
          selector.refresh();
          const alias = getNodesAlias(
            trans,
            copied.length,
            copied[0],
            copied[copied.length - 1]
          );
          const { nodes } = node as Composite;
          undoManager.execute(`${copyDesc} [${alias}]`, (redo) => {
            nodes.push(...copied);
            redo || ("refresh" in parent && parent.refresh());
            "redrawLines" in parent && parent.redrawLines();
            return () => {
              nodes.splice(nodes.length - copied.length, copied.length);
              "refresh" in parent && parent.refresh();
              "redrawLines" in parent && parent.redrawLines();
            };
          });
          hidePropsEditor();
        };

    selector.remove = locked
      ? undefined
      : () => {
          if (selector == null || selector.selected.length <= 0) return;

          const tasks: (() => () => void)[] = [];
          const parents: Set<DeliverParent> = new Set([]);
          for (const { parent, node } of selector.selected) {
            parents.add(parent);
            const nodeType = getNodeType(node.type);
            if ("tree" in parent) {
              // 禁止删除 root 下的非装饰器节点
              if (nodeType !== "Decorator") {
                showSnack(trans("The root node is forbidden to be removed"));
                return;
              }
              const target = node as Decorator;
              const { tree } = parent;
              tasks.push(() => {
                if (tree.root === target) {
                  tree.root = target.node;
                  target.node = EMPTY_NODE;
                  return () => {
                    target.node = tree.root;
                    tree.root = target;
                  };
                }
                const decorator = findDirectlyDecorator(tree.root, target);
                if (decorator == null) return () => {};
                decorator.node = target.node;
                target.node = EMPTY_NODE;
                return () => {
                  target.node = decorator.node;
                  decorator.node = target;
                };
              });
            } else {
              const { composite } = parent;
              if (nodeType === "Decorator") {
                const target = node as Decorator;
                tasks.push(() => {
                  const [index, decorator] = findPosition(composite, target);
                  if (index == null) return () => {};
                  if (decorator == null) {
                    composite.nodes[index] = target.node;
                    target.node = EMPTY_NODE;
                    return () => {
                      target.node = composite.nodes[index];
                      composite.nodes[index] = target;
                    };
                  } else {
                    decorator.node = target.node;
                    target.node = EMPTY_NODE;
                    return () => {
                      target.node = decorator.node;
                      decorator.node = target;
                    };
                  }
                });
              } else {
                const target = node;
                tasks.push(() => {
                  const [index] = findPosition(composite, target);
                  if (index == null) return () => {};
                  const node = composite.nodes.splice(index, 1)[0];
                  return () => {
                    composite.nodes.splice(index, 0, node);
                  };
                });
              }
            }
          }
          if (tasks.length <= 0) return;
          const alias = getSelectedAlias(trans, selector);
          const refresh = (redo: boolean) => {
            parents.forEach((parent: DeliverParent) => {
              if ("tree" in parent) return;
              const { refresh, redrawLines } = parent;
              redo || refresh();
              redrawLines();
            });
          };
          undoManager.execute(`${removeDesc} [${alias}]`, (redo) => {
            const undoTasks = tasks.map((task) => task());
            refresh(redo);
            return () => {
              undoTasks.reverse().forEach((task) => task());
              refresh(false);
            };
          });
          hidePropsEditor();
          selector.selected = [];
          selector.refresh();
        };

    const removeHotkeyListener = addHotkeyListener(
      {
        code: "KeyC",
        ctrlKey: true,
        callback: selector.copy,
      },
      ...(locked
        ? []
        : ([
            {
              code: "KeyV",
              ctrlKey: true,
              callback: selector.paste,
            },
            {
              code: "Delete",
              callback: selector.remove,
            },
            {
              code: "KeyD",
              ctrlKey: true,
              callback: selector.remove,
            },
          ] as Hotkey[]))
    );
    return () => {
      selector.refresh = () => {};
      selector.remove = () => {};
      selector.copy = () => {};
      selector.paste = () => {};
      removeHotkeyListener();
    };
  }, [selector, locked]);

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

  const selectedAlias = getSelectedAlias(trans, selector);
  const isSelectedFold = selector.selected.some(
    ({ node }) => "fold" in node && (node as { fold?: true }).fold
  );
  const canPaste = getNodeType(selector.selected[0].node.type) === "Composite";

  const pasteDesc =
    selNum > 1
      ? trans("Selected nodes does not support pasting")
      : isSelectedFold
      ? trans("Disallow pasting to collapsed node")
      : canPaste
      ? trans("Paste Nodes")
      : trans("Selected nodes does not support pasting");

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
      <IconButton onClick={selector.copy} title={copyDesc}>
        <ContentCopyIcon fontSize="small" />
      </IconButton>
      {locked ? null : (
        <IconButton onClick={selector.paste} title={pasteDesc}>
          {selNum === 1 && !isSelectedFold && canPaste ? (
            <ContentPasteIcon fontSize="small" />
          ) : (
            <ContentPasteOffIcon fontSize="small" />
          )}
        </IconButton>
      )}
      {locked ? null : (
        <IconButton onClick={selector.remove} title={removeDesc}>
          <DeleteOutlineIcon />
        </IconButton>
      )}
      <IconButton onClick={cancel}>
        <CloseIcon />
      </IconButton>
      <Typography
        fontSize="small"
        color={({ palette }) => palette.text.secondary}
        sx={{
          position: "absolute",
          right: 0,
          top: "-1.5em",
          whiteSpace: "nowrap",
        }}
      >
        {`${trans("Selected")} ${selectedAlias}`}
      </Typography>
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
  parent: DeliverParent,
  trans: TransFunction,
  refresh: () => void
) {
  const propsEditor = useNodePropsEditor(trans, refresh);
  const selector = useContext(SelectorContext)?.current;
  const select = (node: Node, multiSelect: boolean = false) => {
    propsEditor.show(node);
    if (selector == null) return;
    if (multiSelect) {
      const filtered = selector.selected.filter(
        (selected) => selected.node !== node
      );
      if (filtered.length < selector.selected.length) {
        selector.selected = filtered;
        selector.refresh();
        return;
      }
    } else {
      selector.selected = [];
    }

    selector.selected.push({
      parent,
      node,
    });
    selector.refresh();
  };
  return {
    select,
    onClick(node: Composite | Decorator | Action, event: MouseEvent) {
      event.stopPropagation();
      event.preventDefault();
      select(node, event.ctrlKey || event.shiftKey);
    },
  };
}
