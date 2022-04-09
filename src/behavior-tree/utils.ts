import type { NodeType } from "./type";

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
