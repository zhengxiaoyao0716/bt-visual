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

// 树干节点
export type TreeNodeType = "Composite" | "Action";
export type DeckNodeType = "Decorator";
export type NodeType = TreeNodeType | DeckNodeType | "Unknown";

//#region 复合节点
export interface Composite extends Node {
  deck: Decorator[]; // 装饰列表
  nodes: (Composite | Action)[];
  fold?: true; // 折叠
}
export module Composite {
  export interface Selector extends Composite {
    type: "$Selector"; // 选择执行 // 依次执行 nodes 内的子节点，直到任意某个子节点执行成功，返回成功。当全部子节点执行失败时，返回失败。
  }
  export interface Sequence extends Composite {
    type: "&Sequence"; // 顺序执行 // 依次执行 nodes 内的子节点，直到任意某个子节点执行失败，返回失败。当全部子节点执行成功时，返回成功。
  }
  export interface Parallel extends Composite {
    type: "%Parallel"; // 并行执行 // 同时执行 nodes 内的子节点，待全部完成后根据统计成功失败数，根据 expected 配置的值，返回成功或失败。
    expected?: Store.Reader.Number; // >0: 成功子节点数大于等于该值则成功, <0: 失败子节点数大于等于该值的绝对值则失败, 0: 必定成功
  }

  export interface SelectBy extends Composite {
    type: "$SelectBy"; // 条件选择 // 根据 index 给定的值，执行对应位置的节点，返回对应节点的执行结果。
    index: Store.Reader.Number; // 要执行的节点的位置，0-based
  }
  export interface SelectIf extends Composite {
    type: "$SelectIf"; // 布尔选择 // 先执行 cond (nodes.first) 节点，cond 成功时执行 nodes.second，cond 失败时执行 nodes.third，返回对应节点的执行结果。
    nodes: (Composite | Action)[]; // [cond, second, third?]，节点数量应当为 2 或 3，第三个节点可省略。
  }

  export interface RandomOrder extends Composite {
    tupe:
      | "$SelRandom" // 随机选择执行 // 随机挑选一个子节点执行，成功则返回，失败则随机另一个子节点，重复该流程，直到全部执行失败，返回失败。
      | "&SeqRandom"; // 随机顺序执行 // 随机挑选一个子节点执行，失败则返回，成功则随机另一个子节点，重复该流程，直到全部执行完毕，返回成功。
  }

  export interface Contention extends Composite {
    type:
      | "%Complete" // 并行完成 // 同时执行 nodes 内的子节点，任一节点完成时立刻完成，并停止其他正在运行的节点，返回值与抢先完成的节点保持一致。
      | "%Success" // 并行成功 // 同时执行 nodes 内的子节点，任一节点成功时立刻返回成功，并停止其他正在运行的子节点。全部子节点失败时返回失败。
      | "%Faliure" // 并行失败 // 同时执行 nodes 内的子节点，任一节点失败时立刻返回失败，并停止其他正在运行的子节点。全部子节点成功时返回成功。
      | "%Priority"; // 并行优先 // 同时执行 nodes 内的子节点，第一个节点为主节点，其他为副节点，主节点完成时打断副节点，返回值与主节点保持一致。
  }
}
//#endregion

//#region 装饰节点
export interface Decorator extends Node {
  fold?: true; // 折叠
}
export module Decorator {
  export interface Condition extends Decorator {
    type: "@Condition"; // 条件侦听 // 条件满足时执行 node，执行完毕返回其执行结果，期间监听条件变化，若条件不满足了则中断 node 返回失败。
    suspend?: Store.Reader.Boolean; // 是否需要挂起 // false: 直接失败, true: 暂时挂起
    interrupt?: Store.Reader.Boolean; // 是否需要中断 // false: 不监听中断, true: 监听条件变化，条件不满足时挂起
    statements: Statement[]; // 条件语句
  }

  export interface SwarmShout extends Decorator {
    type: "@SwarmShout"; // 群体呼唤 // 根据策略选定目标，选定成功则激发群体讯号并执行 node
    flag: Store.Reader.String; // 识别讯号
    goal: Store.Reader.String; // 目标策略
  }
  export interface SwarmReply extends Decorator {
    type: "@SwarmReply"; // 群体响应 // 响应周围的群体讯号，目标一致则加入该群体并执行 node
    flag: Store.Reader.String; // 识别讯号
    least: Store.Reader.Number; // 最少单位数目，群体单位过少时将拒绝加入
  }
  export interface SwarmAssign extends Decorator {
    type: "@SwarmAssign"; // 群体分派 // 满足条件则占用一个名额并执行 node，执行失败时释放名额
    seats?: Store.Reader.Number; // 最大分派名额，留空则不限制
    ratio?: Store.Reader.Number; // 最大分派比例，留空则不限制
  }

  export interface Repeat extends Decorator {
    type: "@Repeat"; // 重复执行 // 重复执行 node，直到成功次数达到 success 时返回成功，或失败次数达到 failure 时返回失败
    success?: Store.Reader.Number; // 成功次数达到该次数时返回成功，留空则不限成功次数
    failure?: Store.Reader.Number; // 失败次数达到该次数时返回失败，留空则不限失败次数
  }

  export interface Delay extends Decorator {
    type: "@Delay"; // 延迟执行 // 延迟 millis 毫秒后执行 node 并返回 node 的执行结果
    millis: Store.Reader.Number; // 延迟时长，单位毫秒
  }

  export interface Pipeline extends Decorator {
    type:
      | "@Inverse" // 节点逆变 // 当 node 执行成功时返回失败，node 执行失败时返回成功
      | "@Success" // 必定成功 // 当 node 执行完成后，永远返回成功
      | "@Failure"; // 必定失败 // 当 node 执行完成后，永远返回失败
  }

  export interface DebugLog extends Decorator {
    type: "@DebugLog"; // 调试日志 // node 执行前后追加日志，仅后端开启 Debug 级别时生效。
    prepare?: Store.Reader.String; // 准备执行日志
    success?: Store.Reader.String; // 执行成功日志
    failure?: Store.Reader.String; // 执行失败日志
  }
}
//#endregion

//#region 动作节点
export interface Action extends Node {
  deck?: Decorator[]; // 装饰列表
}
export module Action {
  export interface Dynamic extends Action {
    type: "+Dynamic"; // 动态节点 // 执行 name 指定的行为
    name: Store.Reader.String; // 行为名称
    args?: { [name: string]: Store.Reader | undefined }; // 透传参数
  }

  export interface Empty extends Action {
    type: "+Empty"; // 空白节点 // 默认什么都不做
    extra?: Store.Reader; // 额外参数
  }

  export interface Tree extends Action {
    type: "+Tree"; // 子树节点 // 执行 file 指定的文件中的 name 子树
    name: Store.Reader.String; // 子树名称
    file?: Store.Reader.String; // 所在文件，留空则默认为当前文件
  }

  export interface Wait extends Action {
    type: "+Wait"; // 定时等待 // 等待 millis 毫秒后返回成功
    millis: Store.Reader.Number; // 等待时长，单位毫秒
  }
}
//#endregion

// 存储空间
export module Store {
  export type Key = string; // 存储 key，'.' 起头为局部，'/' 起头为全局，其他为只读常量（'_' 理论上是一个永远不存在值的只读常量）
  export type Value = number | string | boolean;

  // 存储空间的读取接口
  export type Reader<V = Value> =
    | V
    | {
        bind: Store.Key; // 绑定存储空间
        init: V; // 初始默认的值
        type: "number" | "string" | "boolean" | "dict" | "list"; // 读取值的类型
      }
    | {
        bind: Store.Key; // 绑定存储空间
        type: "unknown"; // 读取值的类型
      };

  export type ValueType = Extract<Reader, { bind: Key }> extends {
    type: infer T;
  }
    ? T
    : never;

  export module Reader {
    export type Random = {
      bind: Store.Key;
      init: number;
      type: "number";
      zoom: number;
    }; // 随机读取一个数，随机算法为：init + random() * zoom，其中 random 返回 [0, 1) 之间的随机数
    export type Number =
      | number
      | (Reader<number> & { type: "number" })
      | Random;
    export type String = string | (Reader<string> & { type: "string" });
    export type Dict = string | (Reader<string> & { type: "dict" }); // json 底层仍然用字符串来存
    export type List = string | (Reader<string> & { type: "list" }); // json 底层仍然用字符串来存
    export type Boolean = boolean | (Reader<boolean> & { type: "boolean" });
  }
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
