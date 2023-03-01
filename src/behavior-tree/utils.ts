import ExtValue from "../common/ExtValue";
import type { TransFunction } from "../storage/Locale";
import type { Action, Composite, Decorator, Node, NodeType } from "./type";

const nodeTypeDict = {
  "?": "Composite",
  "&": "Composite",
  ">": "Composite",

  "@": "Decorator",

  "+": "Action",
};

export function defaultRootNode(): Composite {
  return { type: ">Parallel", nodes: [] };
}

export function getNodeType(type: string): NodeType {
  const char = type.charAt(0);
  if (!(char in nodeTypeDict)) return "Unknown";
  const key = char as keyof typeof nodeTypeDict;
  return nodeTypeDict[key] as NodeType;
}

export const EMPTY_NODE = { type: "Unknown" };

export function getNodeAlias(trans: TransFunction, node: Node): string {
  if (!node.alias) return trans(node.type);
  const alias = node.alias;
  return alias.split("\n")[0].trim();
}

const nodeSymbol = Symbol("node");
export function setDecoratedNode(
  decorators: Decorator[],
  decorated: Composite | Action
) {
  for (const decorator of decorators) {
    ExtValue.setValue(decorator, nodeSymbol, decorated);
  }
}
export function getDecoratedNode(decorator: Decorator): Composite | Action {
  return ExtValue.getValue(decorator, nodeSymbol)!;
}
