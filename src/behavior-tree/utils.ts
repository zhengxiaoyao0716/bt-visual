import type { TransFunction } from "../storage/Locale";
import type { Node, NodeType } from "./type";

const nodeTypeDict = {
  "?": "Composite",
  "&": "Composite",
  ">": "Composite",

  "@": "Decorator",

  "+": "Action",
};

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

export function getNodeExt<T>(node: Node, key: symbol): T | undefined {
  return node[key];
}

export function setNodeExt<T>(
  node: Node,
  key: symbol,
  value: T | undefined,
  enumerable = false
): void {
  if (value === undefined) {
    delete node[key];
    return;
  }
  if (enumerable) {
    node[key] = value;
    return;
  }
  Object.defineProperty(node, key, {
    enumerable: false, // JSON.stringify 时隐藏 selected 字段
    value: value,
    configurable: true,
  });
}
