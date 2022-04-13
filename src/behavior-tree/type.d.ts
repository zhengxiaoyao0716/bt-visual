// 基础节点
export interface Node {
  type: string;
  alias?: string; // 别名
}

// 树状节点
export interface Tree {
  name: string;
  root: Node;
  store?: { [key: string]: Store.Value };
}

export type NodeType = "Composite" | "Decorator" | "Action" | "Unknown";

// 复合节点
export interface Composite extends Node {
  nodes: Node[];
  fold?: true; // 折叠
}
export module Composition {
  export interface Selector extends Composite {
    type: "?=Selector"; // 选择执行 // 依次执行 nodes 内的子节点，直到任意某个子节点执行成功，返回成功。当全部子节点执行失败时，返回失败。
  }
  export interface Sequence extends Composite {
    type: "&=Sequence"; // 顺序执行 // 依次执行 nodes 内的子节点，直到任意某个子节点执行失败，返回失败。当全部子节点执行成功时，返回成功。
  }
  export interface Parallel extends Composite {
    type: ">=Parallel"; // 并行执行 // 同时执行 nodes 内的子节点，待全部完成后根据执行成功的节点的数量，大于等于 expected 返回成功，否则失败。
    expected: Store.Reader.Number; // 期望的执行成功节点数
  }

  export interface SelectBy extends Composite {
    type: "?:SelectBy"; // 条件选择 // 根据 index 给定的值，执行对应位置的节点，返回对应节点的执行结果。
    index: Store.Reader.Number; // 要执行的节点的位置，0-based
  }
  export interface SelectIf extends Composite {
    type: "?:SelectIf"; // 布尔选择 // 先执行 cond (nodes.first) 节点，cond 成功时执行 nodes.second，cond 失败时执行 nodes.third，返回对应节点的执行结果。
    nodes: [Node, Node] | [Node, Node, Node]; // [cond, second, third?]，节点数量应当为 2 或 3，第三个节点可省略。
  }

  export interface RandomOrder extends Composite {
    tupe:
      | "?:SelRandom" // 随机选择执行 // 随机挑选一个子节点执行，成功则返回，失败则随机另一个子节点，重复该流程，直到全部执行失败，返回失败。
      | "&:SeqRandom"; // 随机顺序执行 // 随机挑选一个子节点执行，失败则返回，成功则随机另一个子节点，重复该流程，直到全部执行完毕，返回成功。
  }

  export interface Contention extends Composite {
    type:
      | ">:Complete" // 并行完成 // 同时执行 nodes 内的子节点，任一节点完成时立刻完成，并停止其他正在运行的节点，返回值与抢先完成的节点保持一致。
      | ">:Success" // 并行成功 // 同时执行 nodes 内的子节点，任一节点成功时立刻返回成功，并停止其他正在运行的子节点。全部子节点失败时返回失败。
      | ">:Faliure" // 并行失败 // 同时执行 nodes 内的子节点，任一节点失败时立刻返回失败，并停止其他正在运行的子节点。全部子节点成功时返回成功。
      | ">:Priority"; // 并行优先 // 同时执行 nodes 内的子节点，任意子节点完成时，其右侧的子节点立刻停止。全部子节点结束后，返回最左子节点的结果。
  }
}

// 装饰节点
export interface Decorator extends Node {
  node: Node;
  fold?: true; // 折叠
}
export module Decorator {
  export interface Condition<V> extends Decorator {
    // TODO 条件节点得重新设计
    type:
      | "@CompareEQ" // 比较给定的两个值是否相等，相等则执行 node 并返回其执行结果，不相等则直接返回失败。
      | "@CompareGE" // 比较给定的两个值的大小，若期望值大于等于待测值，执行 node 并返回其结果，否则失败。
      | "@CompareLE"; // 比较给定的两个值的大小，若期望值小于等于待测值，执行 node 并返回其结果，否则失败。
    expected: Store.Reader<V>; // 预期值
    subject: Store.Reader<V>; // 待测值
    // signal?: Signal // 当条件状态变化时，向父节点递归发出信号
  }

  export interface Reapeat extends Decorator {
    type: "@Repeat"; // 重复执行 node，直到成功次数达到 success 时返回成功，或失败次数达到 failure 时返回失败
    success?: Store.Reader.Number;
    failure?: Store.Reader.Number;
  }

  export interface Pipeline extends Decorator {
    type:
      | "@Inverse" // 节点逆变 // 当 node 执行成功时返回失败，node 执行失败时返回成功
      | "@Success" // 必定成功 // 当 node 执行完成后，永远返回成功
      | "@Failure"; // 必定失败 // 当 node 执行完成后，永远返回失败
  }

  export interface Delay extends Decorator {
    type: "@Delay"; // 延迟执行 // 延迟 millis 毫秒后执行 node 并返回 node 的执行结果
    millis: Store.Reader.Number; // 延迟时长，单位毫秒
  }

  export interface Save extends Decorator {
    type: "@Save"; // 保存结果 // 将 node 的执行结果存储到 store 中，返回 node 的执行结果
    bind: Store.Key; // 绑定存储空间
  }

  export interface Acc extends Action {
    type: "@Acc"; // 累加结果 // node 执行完毕后，根据成功或失败累加对应的增量，返回 node 的执行结果。
    bind: Store.Key; // 绑定存储空间
    success: Store.Reader.Number; // 成功时累加值
    failure: Store.Reader.Number; // 失败时累加值
  }
}

// 行为节点
export interface Action extends Node {}
export module Action {
  export interface Empty extends Action {
    type: "+Empty"; // 空白节点 // 默认什么都不做
    extra?: Store.Reader; // 额外参数
  }

  export interface Tree extends Action {
    type: "+Tree"; // 子树节点 // 执行 name 指定的子树
    name: Store.Reader.String; // 子树名称
  }

  export interface Dynamic extends Action {
    type: "+Dynamic"; // 动态行为 // 执行 name 指定的行为
    name: Store.Reader.String; // 行为名称
    args?: { [name: string]: Store.Reader }; // 透传参数
  }

  export interface Wait extends Action {
    type: "+Wait"; // 定时等待 // 等待 millis 毫秒后返回成功
    millis: Store.Reader.Number; // 等待时长，单位毫秒
  }
}

// 存储空间
export module Store {
  export type Key =
    | string // 存储 key 的简写，'/' 起头为全局，'.' 起头为局部
    | ["global" | "local", string];
  export type Value = number | string | boolean;

  // 存储空间的读取接口
  export type Reader<V = Value> =
    | V
    | {
        bind: Store.Key; // 绑定存储空间
        init: V; // 初始默认的值
        type: "number" | "string" | "boolean"; // 读取值的类型
      };
  export module Reader {
    export type Random = Reader<number> & { type: "number"; zoom: number }; // 随机读取一个数，随机算法为：init + random() * zoom，其中 random 返回 [0, 1) 之间的随机数
    export type Number =
      | number
      | (Reader<number> & { type: "number" })
      | Random;
    export type String =
      | string
      | (Reader<string> & { type: "string"; format?: "list" | "dict" });
    export type Boolean = boolean | (Reader<boolean> & { type: "boolean" });
  }
}
