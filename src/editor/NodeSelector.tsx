import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowLeftIcon from "@mui/icons-material/ArrowLeft";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import ContentPasteOffIcon from "@mui/icons-material/ContentPasteOff";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
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

import { styled } from "@mui/material/styles";
import type {
  Action,
  Composite,
  Decorator,
  Node,
  Tree,
} from "../behavior-tree/type";
import {
  defaultRootNode,
  getDecoratedNode,
  getNodeAlias,
  getNodeType,
} from "../behavior-tree/utils";
import ExtValue from "../common/ExtValue";
import clipboard, {
  copySelectedNodes,
  drawSelectedCapture,
  exportSelectedCapture,
} from "../components/clipboard";
import { useDragMoving } from "../components/DragMoving";
import { addHotkeyListener } from "../components/Hotkey";
import { useRefresh } from "../components/Refresh";
import Snack from "../components/Snack";
import { TransFunction, useTrans } from "../storage/Locale";
import { LockerContext } from "./NodeRender/NodeLocker";
import { PropertiesContext, useNodePropsEditor } from "./Properties";
import Undo, { UndoManager } from "./Undo";

const SelectionBox = styled("div")(({ theme: { palette } }) => {
  const color = palette.grey[palette.mode === "light" ? 400 : 600];
  return {
    position: "fixed",
    zIndex: 1,
    border: `1px dashed ${color}`,
    boxShadow: `inset 0 0 3px 1px ${color}`,
    background: `${color}33`,
  };
});

export const boxSelectEventKey = "boxSelectionCollide";

export type DeliverParent =
  | {
      tree: Tree;
      refresh(): void;
    }
  | {
      composite: Composite;
      refresh(): void;
      redrawLines(): void;
    };

const parentSymbol = Symbol("parent");
export function setDeliverParent(node: Node | Node[], parent: DeliverParent) {
  const nodes = node instanceof Array ? node : [node];
  for (const node of nodes) {
    ExtValue.setValue(node, parentSymbol, parent);
  }
}
export function getDeliverParent(node: Node): DeliverParent {
  return ExtValue.getValue(node, parentSymbol)!;
}

interface Selector {
  selected: {
    parent: DeliverParent;
    node: Node;
  }[];
  tree?: Tree;
  refresh(): void;
  copy?: () => void;
  paste?: () => void;
  moveUp?: () => void;
  moveDown?: () => void;
  moveLeft?: () => void;
  moveRight?: () => void;
  remove?: () => void;
}

const SelectorContext = createContext<MutableRefObject<Selector> | null>(null);

const selectedSymbol = Symbol("selected");
const autoSelectSymbol = Symbol("autoSelect");

export function isSelected(node: Node | Tree) {
  return ExtValue.getValue(node, selectedSymbol) != null;
}
export function setSelected(node: Node | Tree, selected: true | undefined) {
  ExtValue.setValue(node, selectedSymbol, selected);
}

function isAutoSelect(node: Node | Tree) {
  return ExtValue.getValue(node, autoSelectSymbol) != null;
}
export function setAutoSelect(node: Node | Tree, selected: true | undefined) {
  ExtValue.setValue(node, autoSelectSymbol, selected);
}

function cancelAllSelected(selector: Selector) {
  for (const { node, parent } of selector.selected) {
    setSelected(node, undefined);
    parent.refresh();
  }
  selector.selected = [];
  if (selector.tree) {
    setSelected(selector.tree, undefined);
    const parent = getDeliverParent(selector.tree.root);
    parent.refresh();
    delete selector.tree;
  }
}

function calcSelectionBoxStyle(
  { x, y }: { x: number; y: number },
  { moveX, moveY }: { moveX: number; moveY: number }
) {
  return {
    left: `${moveX < 0 ? x + moveX : x}px`,
    top: `${moveY < 0 ? y + moveY : y}px`,
    width: `${moveX < 0 ? -moveX : moveX}px`,
    height: `${moveY < 0 ? -moveY : moveY}px`,
  };
}

export default function NodeSelector({ children }: { children: ReactNode }) {
  const ref = useRef<Selector>({ selected: [], refresh() {} });
  const containerRef = useRef<HTMLDivElement>(null);

  const context = useContext(PropertiesContext);
  const hidePropsEditor = () =>
    context?.type === "NodeProps" && context.setOptions(null, "");
  const snack = Snack.use();
  const undoManager = Undo.use();

  const [boxSelectionProps, boxSelState, setBoxSelectionState] = useDragMoving(
    (event) => {
      if (event.buttons !== 1) return true;
      if (event.target !== containerRef.current?.children[0]) return true;
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  );
  const selectionBoxStyle =
    boxSelState.dragging && boxSelState.origin
      ? calcSelectionBoxStyle(boxSelState.origin, boxSelState)
      : null;
  useEffect(() => {
    if (boxSelState.dragging) return;
    const { origin, moveX, moveY } = boxSelState;
    setBoxSelectionState({ moveX: 0, moveY: 0, dragging: false });
    const $container = containerRef.current;
    if (origin == null || $container == null) return;
    if (moveX > -30 && moveX < 30) return;
    if (moveY > -30 && moveY < 30) return;
    const leftMin = moveX < 0 ? origin.x + moveX : origin.x;
    const topMin = moveY < 0 ? origin.y + moveY : origin.y;
    const leftMax = moveX < 0 ? origin.x : origin.x + moveX;
    const topMax = moveY < 0 ? origin.y : origin.y + moveY;
    // 异步计算碰撞以尽量减轻阻塞
    setTimeout(() => {
      const $nodes: NodeListOf<SVGSVGElement> =
        $container.querySelectorAll("svg.node");
      for (const $node of $nodes) {
        const rect = $node.getBoundingClientRect();
        const collide =
          rect.left > leftMin &&
          rect.top > topMin &&
          rect.right < leftMax &&
          rect.bottom < topMax;
        collide && $node.dispatchEvent(new CustomEvent(boxSelectEventKey));
      }
    }, 0);
  }, [boxSelState.dragging]);

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
        {...boxSelectionProps}
      >
        {children}
        {selectionBoxStyle && <SelectionBox style={selectionBoxStyle} />}
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

function getSelectedAlias(trans: TransFunction, selector: Selector): string {
  if (selector.tree) return selector.tree.name;
  const selected = selector.selected;
  if (selected == null || selected.length <= 0) return "";

  if (selected.length === 1) return getNodeAlias(trans, selected[0].node);
  const last = selected[selected.length - 1];
  const suffix = trans(" ... ${num} nodes", {
    num: selected.length,
  });
  return `${getNodeAlias(trans, last.node)}${suffix}`;
}

function getMoveArgs(selector: Selector | undefined): {
  horizontal?: { index: number; nodes: Node[] };
  vertical?: { index: number; deck: Decorator[] };
} {
  const result: {
    horizontal?: { index: number; nodes: Node[] };
    vertical?: { index: number; deck: Decorator[] };
  } = {};
  if (selector == null || selector.tree) return result;
  const selected = selector.selected;
  if (selected == null || selected.length !== 1) return result;
  const { parent, node } = selected[0];
  const nodeType = getNodeType(node.type);

  const decorated =
    nodeType === "Decorator" ? getDecoratedNode(node as Decorator) : null;
  // 装饰节点，可上下移动
  if (decorated?.deck) {
    const deck = decorated.deck;
    const index = deck.indexOf(node);
    result.vertical = { index, deck };
  }
  // 根节点，不可左右移动
  if ("tree" in parent) return result;
  // 其他情况，可左右移动
  const { nodes } = parent.composite;
  if (nodes.length <= 1) return result;
  const index = parent.composite.nodes.indexOf(
    decorated || (node as Composite | Action)
  );
  result.horizontal = { index, nodes };
  return result;
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
  const [rfc, refresh] = useRefresh();
  const selector = useContext(SelectorContext)?.current;
  const locked = useContext(LockerContext);

  const removeDesc = trans("Remove Nodes");
  const copyDesc = trans("Copy Nodes");

  const moveUpDesc = trans("Move node up");
  const moveDownDesc = trans("Move node down");
  const moveLeftDesc = trans("Move nodes left");
  const moveRightDesc = trans("Move nodes right");

  useEffect(() => {
    if (selector == null) return;
    selector.refresh = refresh;

    const unavailable = async (text?: string) => {
      showSnack(trans("Clipboard unavailable"));
      if (text == null) return;
      const page = window.open(
        "",
        "_blank",
        "location=no,menubar=no,status=no,toolbar=no,width=800,height=600"
      );
      if (page == null) return;
      const $textarea = page.window.document.createElement("textarea");
      $textarea.innerHTML = text;
      $textarea.style.width = "100%";
      $textarea.style.height = "100%";
      page.window.document.body.appendChild($textarea);
      $textarea.select();
    };

    selector.copy = async (event?: KeyboardEvent) => {
      if (selector == null) return;
      if (selector.selected.length <= 0 && selector.tree == null) return;
      const nodes =
        selector.tree == null
          ? selector.selected.map(({ node }) => node)
          : selector.tree;
      const dumps = await clipboard.write("nodes", nodes, unavailable);
      if (!dumps) return;
      const capture = await drawSelectedCapture();
      if (capture == null) return;
      await copySelectedNodes(dumps, capture);
      if (event?.ctrlKey && event?.shiftKey) {
        const alias = getSelectedAlias(trans, selector);
        exportSelectedCapture(alias, dumps, capture);
      }
    };
    const removeCopyHotkey = addHotkeyListener(
      document.body,
      {
        code: "KeyC",
        ctrlKey: true,
        callback: selector.copy,
      },
      {
        code: "KeyX",
        ctrlKey: true,
        callback: () => {
          selector.copy && selector.copy();
          selector.remove && selector.remove();
        },
      }
    );

    if (locked) {
      selector.paste = () => {};
      selector.remove = () => {};
      return () => {
        selector.refresh = () => {};
        selector.copy = () => {};
        removeCopyHotkey();
      };
    }

    selector.paste = async () => {
      if (selector == null) return;
      const read: Node[] | Tree | null = await clipboard.read(
        "nodes",
        unavailable
      );
      if (read == null) return;
      const copied = read instanceof Array ? read : [read.root];

      const alias = getSelectedAlias(trans, selector);
      const copiedDeck: Decorator[] = [];
      const copiedNodes: (Composite | Action)[] = [];
      for (const node of copied) {
        if (getNodeType(node.type) === "Decorator") copiedDeck.push(node);
        else copiedNodes.push(node as Composite | Action);
      }
      const tree = selector.tree;
      if (tree != null) {
        if (copiedNodes.length <= 0) return;
        const copied = copiedNodes[0];
        const root = tree.root;
        if ("nodes" in copied) {
          (copied as Composite).nodes.push(root);
        }
        const parent = getDeliverParent(root);
        undoManager.execute(`${copyDesc} [${alias}]`, (_redo) => {
          tree.root = copied;
          setAutoSelect(copied, true);
          parent.refresh();
          return () => {
            tree.root = root;
            setAutoSelect(root, true);
            parent.refresh();
          };
        });
        return;
      }
      if (selector.selected.length !== 1) return;
      const { parent, node } = selector.selected[0];
      const nodeType = getNodeType(node.type);
      if (nodeType === "Decorator") {
        const decorated = getDecoratedNode(node);
        const deck = decorated.deck;
        if (deck == null) return;
        undoManager.execute(`${copyDesc} [${alias}]`, (redo) => {
          const index = deck.indexOf(node);
          if (index < 0) return () => {};
          deck.splice(index, 0, ...copiedDeck);
          redo || parent.refresh();
          "redrawLines" in parent && parent.redrawLines();
          setAutoSelect(node, true);
          return () => {
            deck.splice(index, copiedDeck.length);
            setAutoSelect(node, true);
            parent.refresh();
            "redrawLines" in parent && parent.redrawLines();
          };
        });
        return;
      }

      const selected = node as Composite | Action;
      if (copiedDeck.length > 0 && !selected.deck) selected.deck = [];
      const deck = copiedDeck.length > 0 ? selected.deck : undefined;
      const nodes =
        copiedNodes.length > 0 && nodeType === "Composite"
          ? (selected as Composite).nodes
          : undefined;
      if (deck == null && nodes == null) return;

      undoManager.execute(`${copyDesc} [${alias}]`, (redo) => {
        "fold" in node && delete (node as { fold?: true }).fold;
        deck != null && deck.push(...copiedDeck);
        nodes != null && nodes.push(...copiedNodes);
        redo || parent.refresh();
        "redrawLines" in parent && parent.redrawLines();
        setAutoSelect(selected, true);
        return () => {
          "fold" in node && delete (node as { fold?: true }).fold;
          deck &&
            deck.splice(deck.length - copiedDeck.length, copiedDeck.length);
          nodes &&
            nodes.splice(nodes.length - copiedNodes.length, copiedNodes.length);
          parent.refresh();
          "redrawLines" in parent && parent.redrawLines();
          setAutoSelect(selected, true);
        };
      });
    };

    selector.remove = () => {
      if (selector == null || selector.selected.length <= 0) return;

      const tasks: (() => () => void)[] = [];
      const parents: Set<DeliverParent> = new Set([]);
      for (const { parent, node } of selector.selected) {
        parents.add(parent);
        const nodeType = getNodeType(node.type);
        if (nodeType === "Decorator") {
          const target = node as Decorator;
          const decorated = getDecoratedNode(target);
          const deck = decorated.deck;
          if (deck == null) continue;
          tasks.push(() => {
            const index = deck.indexOf(target);
            if (index < 0) return () => {};
            const node = deck.splice(index, 1)[0];
            return () => {
              deck.splice(index, 0, node);
              setAutoSelect(node, true);
            };
          });
        } else if ("tree" in parent) {
          const empty = defaultRootNode();
          const { tree } = parent;
          tasks.push(() => {
            tree.root = empty;
            return () => {
              tree.root = node as Composite | Action;
              setAutoSelect(node, true);
            };
          });
        } else {
          const { composite } = parent;
          const target = node as Composite | Action;
          tasks.push(() => {
            const index = composite.nodes.indexOf(target);
            if (index < 0) return () => {};
            const node = composite.nodes.splice(index, 1)[0];
            return () => {
              composite.nodes.splice(index, 0, node);
              setAutoSelect(node, true);
            };
          });
        }
      }
      if (tasks.length <= 0) return;
      const alias = getSelectedAlias(trans, selector);
      const refresh = (redo: boolean) => {
        parents.forEach((parent: DeliverParent) => {
          if (!redo || "tree" in parent) parent.refresh();
          if ("redrawLines" in parent) parent.redrawLines();
        });
      };
      undoManager.execute(`${removeDesc} [${alias}]`, (redo) => {
        const undoTasks = tasks.map((task) => task());
        hidePropsEditor();
        refresh(redo);
        return () => {
          undoTasks.reverse().forEach((task) => task());
          refresh(false);
        };
      });
      cancelAllSelected(selector);
      selector.refresh();
    };

    const removeEditableHotkeys = addHotkeyListener(
      document.body,
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
      }
    );

    const swapNode = (nodes: Node[], index: number, swap: number) => {
      if (swap < 0 || swap >= nodes.length) return;

      const target = selector.selected[0].node;
      const alias = getNodeAlias(trans, target);
      const { parent } = selector.selected[0];

      undoManager.execute(`${moveLeftDesc} [${alias}]`, (redo) => {
        setAutoSelect(target, true);
        const node = nodes[index];
        nodes[index] = nodes[swap];
        nodes[swap] = node;
        if ("tree" in parent) {
          return () => {
            setAutoSelect(target, true);
            nodes[swap] = nodes[index];
            nodes[index] = node;
          };
        }
        redo || parent.refresh();
        parent.redrawLines();
        return () => {
          setAutoSelect(target, true);
          nodes[swap] = nodes[index];
          nodes[index] = node;
          redo || parent.refresh();
          parent.redrawLines();
        };
      });
    };
    selector.moveUp = () => {
      const { vertical } = getMoveArgs(selector);
      if (vertical == null) return;
      const { index, deck } = vertical;
      swapNode(deck, index, index - 1);
    };
    selector.moveDown = () => {
      const { vertical } = getMoveArgs(selector);
      if (vertical == null) return;
      const { index, deck } = vertical;
      swapNode(deck, index, index + 1);
    };
    selector.moveLeft = () => {
      const { horizontal } = getMoveArgs(selector);
      if (horizontal == null) return;
      const { index, nodes } = horizontal;
      swapNode(nodes, index, index - 1);
    };
    selector.moveRight = () => {
      const { horizontal } = getMoveArgs(selector);
      if (horizontal == null) return;
      const { index, nodes } = horizontal;
      swapNode(nodes, index, index + 1);
    };

    const removeMoveableHotkeys = addHotkeyListener(
      document.body,
      {
        code: "ArrowUp",
        // ctrlKey: true,
        callback: selector.moveUp,
      },
      {
        code: "ArrowDown",
        // ctrlKey: true,
        callback: selector.moveDown,
      },
      {
        code: "ArrowLeft",
        // ctrlKey: true,
        callback: selector.moveLeft,
      },
      {
        code: "ArrowRight",
        // ctrlKey: true,
        callback: selector.moveRight,
      }
    );

    return () => {
      selector.refresh = () => {};
      selector.copy = () => {};
      selector.paste = () => {};
      selector.remove = () => {};
      removeCopyHotkey();
      removeEditableHotkeys();
      removeMoveableHotkeys();
    };
  }, [rfc, selector, undoManager, locked]);

  useEffect(() => {
    const container = containerRef.current;
    if (container == null) return;
    const hide = () => {
      if (selector == null || selector.selected.length <= 0) return;
      cancelAllSelected(selector);
      selector.refresh();
    };
    container.addEventListener("cancelSelector", hide);
    return () => {
      container.removeEventListener("cancelSelector", hide);
    };
  }, [rfc, containerRef.current]);

  if (selector == null) return null;
  const selNum = selector.selected.length;
  if (selNum === 0 && selector.tree == null) return null;

  const selectedAlias = getSelectedAlias(trans, selector);
  const canPaste =
    selector.tree ||
    (selNum > 0 && getNodeType(selector.selected[0].node.type) !== "Decorator");
  const pasteDesc =
    selNum > 1
      ? trans("Selected nodes does not support pasting")
      : canPaste
      ? trans("Paste Nodes")
      : trans("Selected nodes does not support pasting");

  const { horizontal, vertical } = getMoveArgs(selector);

  const cancel = () => {
    cancelAllSelected(selector);
    selector.refresh();
  };

  return (
    <Box
      sx={({ palette }) => ({
        position: "absolute",
        right: "2em",
        top: "2em",
        display: "flex",
        width: "fit-content",
        border: `1px solid ${palette.divider}`,
        borderRadius: 1,
        backdropFilter: "blur(3px)",
        "& hr": {
          borderLeft: `1px solid ${palette.divider}`,
        },
      })}
    >
      {locked || vertical == null ? null : (
        <>
          <IconButton
            onClick={selector.moveUp}
            title={`${moveUpDesc} - Up`}
            disabled={vertical.index <= 0}
          >
            <ArrowDropUpIcon />
          </IconButton>
          <IconButton
            onClick={selector.moveDown}
            title={`${moveDownDesc} - Down`}
            disabled={vertical.index >= vertical.deck.length - 1}
          >
            <ArrowDropDownIcon />
          </IconButton>
          <Divider />
        </>
      )}
      {locked || horizontal == null ? null : (
        <>
          <IconButton
            onClick={selector.moveLeft}
            title={`${moveLeftDesc} - Left`}
            disabled={horizontal.index <= 0}
          >
            <ArrowLeftIcon />
          </IconButton>
          <IconButton
            onClick={selector.moveRight}
            title={`${moveRightDesc} - Right`}
            disabled={horizontal.index >= horizontal.nodes.length - 1}
          >
            <ArrowRightIcon />
          </IconButton>
          <Divider />
        </>
      )}
      {locked || selector.tree ? null : (
        <IconButton onClick={selector.remove} title={`${removeDesc} - Delete`}>
          <DeleteOutlineIcon />
        </IconButton>
      )}
      {locked ? null : (
        <IconButton onClick={selector.paste} title={`${pasteDesc} - Ctrl+V`}>
          {selNum <= 1 && canPaste ? (
            <ContentPasteIcon fontSize="small" />
          ) : (
            <ContentPasteOffIcon fontSize="small" />
          )}
        </IconButton>
      )}
      {selNum > 0 || selector.tree ? (
        <IconButton onClick={selector.copy} title={`${copyDesc} - Ctrl+C`}>
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      ) : null}
      <Divider />
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
        {`${trans("Selected")} [${selectedAlias}]`}
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
  const select = (node: Node | Tree | null, multiSelect: boolean = false) => {
    if (selector == null) return;
    if (node == null) {
      cancelAllSelected(selector);
      selector.refresh();
      return;
    }
    if (selector.tree) {
      const tree = selector.tree;
      setSelected(selector.tree, undefined);
      delete selector.tree;
      if ("root" in node) {
        // 重复选取根节点
        parent.refresh();
        selector.refresh();
        return;
      } else {
        // 在选中根节点的情况下选择了其他节点
        const parent = getDeliverParent(tree.root);
        parent.refresh();
      }
    }
    if ("root" in node) {
      if (multiSelect) return; // 多选状态下忽略根节点
      // else 单选，选中根节点
      cancelAllSelected(selector);
      selector.tree = node;
      setSelected(node, true);
      propsEditor.show(node);
      parent.refresh();
      selector.refresh();
      return;
    }

    propsEditor.show(node);
    if (multiSelect) {
      const filtered = selector.selected.filter(
        (selected) => selected.node !== node
      );
      // 多选，选择已处于选定状态的节点，视为取消选定
      if (filtered.length < selector.selected.length) {
        setSelected(node, undefined);
        selector.selected = filtered;
        parent.refresh();
        selector.refresh();
        return;
      }
    } else {
      const already =
        selector.selected.length === 1 && selector.selected[0].node === node;
      cancelAllSelected(selector);
      if (already) {
        selector.refresh();
        return;
      }
    }

    setSelected(node, true);
    selector.selected.push({
      parent,
      node,
    });
    parent.refresh();
    selector.refresh();
  };
  return {
    select,
    handle(node: Composite | Decorator | Action | Tree) {
      if (isAutoSelect(node)) {
        setAutoSelect(node, undefined);
        setTimeout(() => select(node, true), 0);
      }
      return (event: MouseEvent | Event) => {
        event.stopPropagation();
        event.preventDefault();
        const multiSelect =
          event.type === boxSelectEventKey ||
          ("ctrlKey" in event && event.ctrlKey) ||
          ("shiftKey" in event && event.shiftKey);
        select(node, multiSelect);
      };
    },
  };
}
