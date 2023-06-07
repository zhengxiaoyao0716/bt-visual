import { Dispatch, useEffect } from "react";

import { BTDefines } from "../behavior-tree/Define";
import { Node, Tree } from "../behavior-tree/type";
import ExtValue from "../common/ExtValue";
import { useRefresh } from "../components/Refresh";
import { Composite } from "../behavior-tree/type";
import { Action } from "../behavior-tree/type";

export const statusMapper = Object.freeze({
  success: { color: "#00cd00", dash: true, class: ["animate"] },
  failure: { color: "#ee0212", dash: true, class: ["animate"] },
  running: { color: "#0288ee", dash: true, class: ["animate", "infinite"] },
  none: { color: "", dash: false, class: [] },
});
export module Status {
  export type Key = keyof typeof statusMapper;
  export type Value = (typeof statusMapper)[Key];
}

const debugStatusExtKey = Symbol("debug.status");
const debugDefinesExtKey = Symbol("debug.defines");
const debugSetStatusExtKey = Symbol("debug.setStatus");

export function useNodeStatus(
  defines: BTDefines | undefined,
  node: Node | undefined
): Status.Value {
  const [, refresh] = useRefresh();

  useEffect(() => {
    if (node == null || defines == null) return;
    ExtValue.setValue(node, debugDefinesExtKey, defines);
    return () => {
      ExtValue.setValue(node, debugDefinesExtKey, undefined);
    };
  }, [node, defines]);

  useEffect(() => {
    if (node == null) return;
    ExtValue.setValue(
      node,
      debugSetStatusExtKey,
      (status: Status.Key | undefined) => {
        if (status == ExtValue.getValue(node, debugStatusExtKey)) return;
        ExtValue.setValue(node, debugStatusExtKey, status);
        refresh();
      }
    );
    return () => {
      ExtValue.setValue(node, debugSetStatusExtKey, undefined);
    };
  }, [node, refresh]);

  const status =
    (node && (ExtValue.getValue(node, debugStatusExtKey) as Status.Key)) ??
    "none";
  return statusMapper[status];
}

export function getBTDefines(node: Node): BTDefines | undefined {
  return ExtValue.getValue(node, debugDefinesExtKey);
}

export function getStatusSetter(
  node: Node
): Dispatch<Status.Key | undefined> | undefined {
  return ExtValue.getValue(node, debugSetStatusExtKey);
}

interface Props {
  defines: BTDefines | undefined;
  node: Node | undefined;
  children(status: Status.Value): JSX.Element;
}
export function WithNodeStatus({ defines, node, children }: Props) {
  const status = useNodeStatus(defines, node);
  return children(status);
}
WithNodeStatus.DeckOrNode = (node: Node | undefined) =>
  node == null
    ? undefined
    : !("deck" in node)
    ? node
    : (node as Composite | Action).deck?.[0] ?? node;
WithNodeStatus.Exist = function Exist({
  status,
  ...props
}: { status?: Status.Value } & Props) {
  return status == null ? (
    <WithNodeStatus {...props} />
  ) : (
    props.children(status)
  );
};

const attachKeySymbol = Symbol("attachKey");
const pausingSymbol = Symbol("pausing");

interface AttachNodesDict {
  [nodeKey: string | number]: Node;
}
export interface NodeStatusDict {
  [nodeKey: string | number]: Status.Key;
}

export function* iterAllNodes(node: any): Generator<Node> {
  const deck = node.deck ?? [];
  for (const node of deck) {
    yield node;
  }
  yield node;
  const nodes = node.nodes ?? [];
  for (const node of nodes) {
    yield* iterAllNodes(node);
  }
  if (node.node) {
    yield* iterAllNodes(node.node);
  }
}

export function linkTreeNodes(tree: Tree, attachKey: string) {
  const nodesDict: AttachNodesDict = {};
  for (const node of iterAllNodes(tree.root)) {
    const key = (node as any)[attachKey];
    if (key != null) nodesDict[key] = node;
  }
  ExtValue.setValue(tree, attachKeySymbol, nodesDict);
}

export function resumeTreeNodeStatus(tree: Tree): boolean {
  const pauseDict: NodeStatusDict | undefined = ExtValue.getValue(
    tree,
    pausingSymbol
  );
  if (pauseDict == null) return false;
  ExtValue.setValue(tree, pausingSymbol, undefined);
  setTreeNodeStatus(tree, pauseDict);
  return true;
}

export function pauseTreeNodeStatus(tree: Tree) {
  ExtValue.setValue(tree, pausingSymbol, {});
}

export function setTreeNodeStatus(tree: Tree, statusDict: NodeStatusDict) {
  const pauseDict: NodeStatusDict | undefined = ExtValue.getValue(
    tree,
    pausingSymbol
  );
  if (pauseDict != null) {
    Object.entries(statusDict).forEach(([key, status]) => {
      pauseDict[key] = status;
    });
    return;
  }
  const nodesDict: AttachNodesDict =
    ExtValue.getValue(tree, attachKeySymbol) ?? {};
  Object.entries(statusDict).forEach(([key, status]) => {
    const node = nodesDict[key];
    if (node == null) return;
    const setter = getStatusSetter(node);
    setter?.(status as Status.Key);
  });
}

export function clearTreeNodeStatus(tree: Tree) {
  for (const node of iterAllNodes(tree.root)) {
    const setter = getStatusSetter(node);
    setter?.(undefined);
  }
  ExtValue.setValue(tree, pausingSymbol, undefined);
}
