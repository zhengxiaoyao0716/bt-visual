// 基础节点
export type Node = {
  type: string;
  alias?: string; // 别名
} & {
  [key: symbol]: any; // 扩展字段，主要是一些编辑器临时用不需要持久化和导出的字段
};

// 树状节点
export type Tree = {
  name: string;
  root: Composite | Action;
  store?: { [key: string]: Store.Reader | undefined };
} & {
  [key: symbol]: any; // 扩展字段，主要是一些编辑器临时用不需要持久化和导出的字段
};

export type TreeNodeType = "Composite" | "Action";
export type DeckNodeType = "Decorator";
export type NodeType = TreeNodeType | DeckNodeType | "Unknown";

// 复合节点
export interface Composite extends Node {
  deck: Decorator[]; // 装饰列表
  nodes: (Composite | Action)[];
  fold?: true; // 折叠
}
// 装饰节点
export interface Decorator extends Node {
  fold?: true; // 折叠
}
// 动作节点
export interface Action extends Node {
  deck?: Decorator[]; // 装饰列表
}

// 存储空间
export module Store {
  export type Key = string; // 存储 key，'.' 起头为局部，'/' 起头为全局，其他为只读常量（'_' 理论上是一个永远不存在值的只读常量）
  export type Value =
    | number
    | string
    // | ({ [key: string]: Value } | Value[]) // json 类型，底层仍用 string 存储，通过包裹符号来区分
    | boolean;
  export type ValueType =
    | "number"
    | "string"
    | ("dict" | "list") // json 类型，对应 ({ [key: string]: Value } | Value[])
    | "boolean"
    | "unknown";

  interface ReaderRandomNumber {
    bind: Store.Key;
    init: number;
    zoom: number;
  }
  // 存储空间的读取接口
  export type Reader<V extends Value = Value> =
    | V
    | { bind: Store.Key; init: V }
    // 当 init 为数值 且存在 zoom 字段时，若读取不到 bind 的值，则计算并返回：init + random * zoom，其中 0 <= random < 1
    | (V extends number ? { bind: Store.Key; init: V; zoom: number } : never);
}

export module Statement {
  export type ID = string;

  // 逻辑运算，例如逻辑表达式 "r = a && !c || d && !e" 会解析为：
  // { id: "r", lid: "a", op: "&&", rid: "!c", next: { op: "||", rid: "d", next: { op: "&&", rid: "!e"}  } }
  export type Logic = { op: "&&" | "||"; rid: ID; next?: Logic };
  // 条件语句
  export type Value =
    // 逻辑运算
    | ({ id: ID; lid: ID } & Logic)
    // 比较运算
    | { id: ID; op: "=="; lid: ID; rid: ID }
    | { id: ID; op: "!="; lid: ID; rid: ID }
    | { id: ID; op: "<"; lid: ID; rid: ID }
    | { id: ID; op: "<="; lid: ID; rid: ID }
    | { id: ID; op: ">"; lid: ID; rid: ID }
    | { id: ID; op: ">="; lid: ID; rid: ID }
    // 算数运算
    | { id: ID; op: "+"; lid: ID; rid: ID }
    | { id: ID; op: "-"; lid: ID; rid: ID }
    | { id: ID; op: "*"; lid: ID; rid: ID }
    | { id: ID; op: "/"; lid: ID; rid: ID }
    | { id: ID; op: "%"; lid: ID; rid: ID }
    | { id: ID; op: "+1"; lid: ID }
    | { id: ID; op: "-1"; lid: ID }
    // 其他操作
    | { id: ID; op: "="; val: Store.Reader } // 将 val 值赋给 id
    | { op: "?"; cid: ID; ret: boolean }; // cid 对应表达式为真时，中断计算并返回 ret
}
export type Statement = Statement.Value;
