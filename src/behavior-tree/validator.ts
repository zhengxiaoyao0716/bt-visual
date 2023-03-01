import { getDeliverParent } from "../editor/NodeSelector";
import { BTDefines, Item } from "./Define";
import type { Composite, Node, NodeType, Store, Tree } from "./type";
import { getNodeType } from "./utils";

type Invalid = string;
export interface InvalidNode {
  node: Node;
  invalids?: Invalid[]; // node 有值但 invalids 为空，意味着其子节点有错误
}

export function invalidTree(defines: BTDefines, tree: Tree): InvalidNode[] {
  return invalidNodeRec(defines, tree.root);
}
function invalidNodeRec(defines: BTDefines, node: Node): InvalidNode[] {
  const type = getNodeType(node.type);
  const invalids = invalidNode(defines, node, type);
  const invalidDecks =
    "deck" in node
      ? (node.deck as Node[]).flatMap((node) => invalidNodeRec(defines, node))
      : [];
  const invalidNodes =
    "nodes" in node
      ? (node.nodes as Node[]).flatMap((node) => invalidNodeRec(defines, node))
      : [];
  return invalids.length > 0
    ? [...invalidDecks, ...invalidNodes, { node, invalids }]
    : invalidDecks.length > 0 || invalidNodes.length > 0
    ? [...invalidDecks, ...invalidNodes, { node }]
    : [];
}

export function invalidNode(
  defines: BTDefines,
  node: Node,
  type: NodeType
): Invalid[] {
  if (type === "Unknown") return ["Unknown node type"];
  const define = defines[type]?.[node.type];
  if (!define) return ["Unknown node type"];
  const allInvalids: Invalid[] = [];

  // 校验根节点
  const parent = getDeliverParent(node);
  if (parent && "tree" in parent && getNodeType(node.type) !== "Composite") {
    allInvalids.push("invalid root node");
  }
  // 校验节点数量
  if (type === "Composite") {
    if (!("nodes" in node) || (node as Composite).nodes?.length <= 0) {
      allInvalids.push("missing nodes");
    }
  }

  const { valid = {} } = define;
  // 优先验证校验额外校验规则
  valid.nodesSize &&
    allInvalids.push(...invalidNodeSize(node, ...valid.nodesSize));

  const { props } = define;
  if (props == null) return allInvalids.flat();

  // 然后根据 props 自动校验
  for (const name in props) {
    const item = props[name];
    const value = (node as any)[name];
    const invalids = invalidItem(value, item) // 校验属性并补上具体的属性名
      .map((reason) => `[${name}] ${reason}`);
    allInvalids.push(...invalids);
  }

  return allInvalids.flat();
}

function invalidNodeSize(node: Node, min: number, max: number): Invalid[] {
  if (!("nodes" in node)) return [];
  const { nodes } = node as { nodes: Node[] };
  return nodes.length < min || nodes.length > max
    ? [`nodes size should between ${min} and ${max}`]
    : [];
}

function invalidItem(value: any, item: Item): Invalid[] {
  if (value == null) {
    return item.optional ? [] : [`${item.type} should not be empty`];
  }

  switch (item.type) {
    case "Store.Key":
      return invalidStoreKey(value, item.optional);
    case "Store.Reader":
      return invalidStoreReader(value, item.valueType, item.optional);
    case "statements":
      return invalidStatements(value, item.optional);
    case "StorePreset":
      return invalidStorePreset(value, item.optional);
  }
}

function invalidStoreKey(value: any, optional?: true): Invalid[] {
  if (typeof value !== "string") return ["Store.Key should be string"];
  if (value.length === 0) {
    if (optional) return []; // never 正常来说 Store.Key 不应该可空
    return ["Store.Key should not be empty"];
  }
  return [];
}

function invalidStoreReader(
  value: any,
  valueType: Store.ValueType,
  optional?: true
): Invalid[] {
  if (typeof value !== "object") {
    if (valueType === "unknown") return [];
    return typeof value === valueType
      ? optional || value !== ""
        ? []
        : ["Store.Reader should not be empty"]
      : [`Store.Reader value type should be ${valueType}`];
  }
  if (!("bind" in value)) return ["Store.Reader missing bind key"];
  if (!("type" in value)) return ["Store.Reader missing value type"];
  if (value.type === "unknown") return [];
  if (!("init" in value)) return ["Store.Reader missing init value"];
  if (typeof value.init !== valueType) {
    return [`Store.Reader init value type should be ${valueType}`];
  }
  return value.type === "number"
    ? "zoom" in value && typeof value.zoom !== "number"
      ? ["Store.Reader zoom should be number"]
      : []
    : [];
}

function invalidStatements(value: any, optional?: true): Invalid[] {
  if (!Array.isArray(value)) return ["statements should be array"];
  if (value.length === 0) {
    if (optional) return [];
    return ["statements should not be empty"];
  }
  return [];
}

function invalidStorePreset(value: any, optional?: true): Invalid[] {
  return [];
}
