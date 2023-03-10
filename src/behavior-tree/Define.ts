import { createStorage } from "../storage/Storage";
import type { Store } from "./type";

export type Item = {
  desc?: string; // 属性描述
  help?: string; // 文档地址
} & (
  | {
      type: "Store.Key";
    }
  | {
      type: "Store.Reader";
      valueType: Store.ValueType;
      optional?: true;
    }
  | { type: "statements" }
  | {
      type: "StorePreset";
      optional: true;
    }
);

export type NodeProps = {
  [name: string]: Item;
};

const items = {
  "Store.Key": {
    type: "Store.Key",
  },
  "Store.Reader.Number": {
    type: "Store.Reader",
    valueType: "number",
  },
  "Store.Reader.String": {
    type: "Store.Reader",
    valueType: "string",
  },
  "Store.Reader.Dict": {
    type: "Store.Reader",
    valueType: "dict",
  },
  "Store.Reader.List": {
    type: "Store.Reader",
    valueType: "list",
  },
  "Store.Reader.Boolean": {
    type: "Store.Reader",
    valueType: "boolean",
  },
  "Store.Reader.Unknown": {
    type: "Store.Reader",
    valueType: "unknown",
  },
} as const;

interface ValidOptions {
  nodesSize?: [number, number]; // 限制节点数量，比如 ?SelectIf 节点要求 nodeSize 必须为 [2, 3]
}

export interface NodeDefine {
  props?: NodeProps;
  shape?: string;
  desc?: string;
  valid?: ValidOptions; // 额外校验参数
}

export type BTDefines = {
  [nodeType in "Composite" | "Decorator" | "Action"]: {
    [type: string]: NodeDefine;
  };
};

const Settings = {
  storeScopes: [
    { label: "none", value: "" }, // 只读常量，例如直接读取配置
    { label: "local", value: "." }, // 局部，一般指仅所属单位（例如行为树所控制的怪物）
    { label: "stage", value: "/" }, // 全局，一般指当前地图（同一地图内各单位的各行为树共享）
  ],
};

const nodes: typeof Settings & BTDefines = {
  ...Settings,
  Composite: {
    $Selector: {
      desc: "选择执行 // 依次执行 nodes 内的子节点，直到任意某个子节点执行成功，返回成功。当全部子节点执行失败时，返回失败。",
    },
    "&Sequence": {
      desc: "顺序执行 // 依次执行 nodes 内的子节点，直到任意某个子节点执行失败，返回失败。当全部子节点执行成功时，返回成功。",
    },
    "%Parallel": {
      desc: "并行执行 // 同时执行 nodes 内的子节点，待全部完成后根据统计成功失败数，根据 expected 配置的值，返回成功或失败。",
      props: {
        expected: {
          desc: ">0: 成功子节点数大于等于该值则成功, <0: 失败子节点数大于等于该值的绝对值则失败, 0: 必定成功",
          ...items["Store.Reader.Number"],
          optional: true,
        },
      },
    },
    $SelectBy: {
      desc: "条件选择 // 根据 index 给定的值，执行对应位置的节点，返回对应节点的执行结果。",
      props: {
        index: {
          desc: "要执行的节点的位置，0-based",
          ...items["Store.Reader.Number"],
        },
      },
    },
    $SelectIf: {
      desc: "布尔选择 // 先执行 cond (nodes.first) 节点，cond 成功时执行 nodes.second，cond 失败时执行 nodes.third，返回对应节点的执行结果。",
      valid: {
        nodesSize: [2, 3],
      },
    },
    $SelRandom: {
      desc: "随机选择执行 // 随机挑选一个子节点执行，成功则返回，失败则随机另一个子节点，重复该流程，直到全部执行失败，返回失败。",
    },
    "&SeqRandom": {
      desc: "随机顺序执行 // 随机挑选一个子节点执行，失败则返回，成功则随机另一个子节点，重复该流程，直到全部执行完毕，返回成功。",
    },
    "%Complete": {
      desc: "并行完成 // 同时执行 nodes 内的子节点，任一节点完成时立刻完成，并停止其他正在运行的节点，返回值与抢先完成的节点保持一致。",
    },
    "%Success": {
      desc: "并行成功 // 同时执行 nodes 内的子节点，任一节点成功时立刻返回成功，并停止其他正在运行的子节点。全部子节点失败时返回失败。",
    },
    "%Faliure": {
      desc: "并行失败 // 同时执行 nodes 内的子节点，任一节点失败时立刻返回失败，并停止其他正在运行的子节点。全部子节点成功时返回成功。",
    },
    "%Priority": {
      desc: "并行优先 // 同时执行 nodes 内的子节点，第一个节点为主节点，其他为副节点，主节点完成时打断副节点，返回值与主节点保持一致。",
    },
  },
  Decorator: {
    "@Condition": {
      desc: "条件侦听 // 条件满足时执行 node，执行完毕返回其执行结果，期间监听条件变化，若条件不满足了则中断 node 返回失败。",
      props: {
        suspend: {
          desc: "是否需要挂起 // false: 直接失败, true: 暂时挂起",
          ...items["Store.Reader.Boolean"],
          optional: true,
        },
        interrupt: {
          desc: "是否需要中断 // false: 不监听中断, true: 监听条件变化，条件不满足时挂起",
          ...items["Store.Reader.Boolean"],
          optional: true,
        },
        statements: { type: "statements" },
      },
    },
    "@SwarmShout": {
      desc: "群体呼唤 // 根据策略选定目标，选定成功则激发群体讯号并执行 node",
      props: {
        flag: {
          desc: "识别讯号",
          ...items["Store.Reader.String"],
        },
        goal: {
          desc: "目标策略",
          ...items["Store.Reader.String"],
        },
      },
    },
    "@SwarmReply": {
      desc: "群体响应 // 响应周围的群体讯号，目标一致则加入该群体并执行 node",
      props: {
        flag: {
          desc: "识别讯号",
          ...items["Store.Reader.String"],
        },
        least: {
          desc: "最少单位数目，群体单位过少时将拒绝加入",
          ...items["Store.Reader.Number"],
        },
      },
    },
    "@SwarmAssign": {
      desc: "群体分派 // 满足条件则占用一个名额并执行 node，执行失败时释放名额",
      props: {
        seats: {
          desc: "最大分派名额，留空则不限制",
          ...items["Store.Reader.Number"],
          optional: true,
        },
        ratio: {
          desc: "最大分派比例，留空则不限制",
          ...items["Store.Reader.Number"],
          optional: true,
        },
      },
    },
    "@Repeat": {
      desc: "重复执行 // 重复执行 node，直到成功次数达到 success 时返回成功，或失败次数达到 failure 时返回失败",
      props: {
        success: {
          desc: "成功次数达到该次数时返回成功，留空则不限成功次数",
          ...items["Store.Reader.Number"],
          optional: true,
        },
        failure: {
          desc: "失败次数达到该次数时返回失败，留空则不限失败次数",
          ...items["Store.Reader.Number"],
          optional: true,
        },
      },
    },
    "@Delay": {
      desc: "延迟执行 // 延迟 millis 毫秒后执行 node 并返回 node 的执行结果",
      props: {
        millis: {
          desc: "延迟时长，单位毫秒",
          ...items["Store.Reader.Number"],
        },
      },
    },
    "@Inverse": {
      desc: "节点逆变 // 当 node 执行成功时返回失败，node 执行失败时返回成功",
    },
    "@Success": {
      desc: "必定成功 // 当 node 执行完成后，永远返回成功",
    },
    "@Failure": {
      desc: "必定失败 // 当 node 执行完成后，永远返回失败",
    },
    "@DebugLog": {
      desc: "调试日志 // node 执行前后追加日志，仅后端开启 Debug 级别时生效。",
      props: {
        prepare: {
          desc: "准备执行日志",
          ...items["Store.Reader.String"],
          optional: true,
        },
        success: {
          desc: "执行成功日志",
          ...items["Store.Reader.String"],
          optional: true,
        },
        failure: {
          desc: "执行失败日志",
          ...items["Store.Reader.String"],
          optional: true,
        },
      },
    },
  },
  Action: {
    "+Dynamic": {
      desc: "动态节点 // 执行 name 指定的行为",
      props: {
        name: {
          desc: "行为名称",
          ...items["Store.Reader.String"],
        },
        args: {
          desc: "透传参数",
          ...{ type: "StorePreset" },
          optional: true,
        },
      },
      shape:
        '<path d="M6.2 3.01C4.44 2.89 3 4.42 3 6.19V16c0 2.76 2.24 5 5 5s5-2.24 5-5V8c0-1.66 1.34-3 3-3s3 1.34 3 3v7h-.83c-1.61 0-3.06 1.18-3.17 2.79-.12 1.69 1.16 3.1 2.8 3.21 1.76.12 3.2-1.42 3.2-3.18V8c0-2.76-2.24-5-5-5s-5 2.24-5 5v8c0 1.66-1.34 3-3 3s-3-1.34-3-3V9h.83C7.44 9 8.89 7.82 9 6.21c.11-1.68-1.17-3.1-2.8-3.2z"></path>',
    },
    "+Empty": {
      desc: "空白节点 // 默认什么都不做",
      props: {
        extra: {
          desc: "额外参数",
          ...items["Store.Reader.Unknown"],
          optional: true,
        },
      },
    },
    "+Tree": {
      desc: "子树节点 // 执行 file 指定的文件中的 name 子树",
      props: {
        name: {
          desc: "子树名称",
          ...items["Store.Reader.String"],
        },
        file: {
          desc: "所在文件，留空则默认为当前文件",
          ...items["Store.Reader.String"],
          optional: true,
        },
      },
      shape:
        '<path d="M17 12h2L12 2 5.05 12H7l-3.9 6h6.92v4h3.96v-4H21z"></path>',
    },
    "+Wait": {
      desc: "定时等待 // 等待 millis 毫秒后返回成功",
      props: {
        millis: {
          desc: "等待时长，单位毫秒",
          ...items["Store.Reader.Number"],
        },
      },
      shape:
        '<path d="m6 2 .01 6L10 12l-3.99 4.01L6 22h12v-6l-4-4 4-3.99V2H6zm10 14.5V20H8v-3.5l4-4 4 4z"></path>',
    },
  },
};

export default createStorage(
  "BTNodes",
  "/behavior-tree-nodes.yaml",
  () => Promise.resolve(nodes),
  { readonly: true }
);
