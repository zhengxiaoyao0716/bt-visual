import { createStorage } from "../storage/Storage";
import type { Store } from "./type";

export type Item = { desc?: string; optional?: true } & (
  | {
      type: "Store.Key";
      optional: undefined; // key 不应可空
    }
  | {
      type: "Store.Reader";
      valueType: Store.ValueType;
    }
  | {
      type: "statements";
    }
  | {
      type: "StorePreset";
    }
);

export type NodeProps = {
  [name: string]: Item;
};

const items: { [key: string]: Item } = {
  "Store.Key": {
    type: "Store.Key",
    optional: undefined,
  },
  "Store.Reader.Number": {
    type: "Store.Reader",
    valueType: "number",
  },
  "Store.Reader.String": {
    type: "Store.Reader",
    valueType: "string",
  },
  "Store.Reader.Unknown": {
    type: "Store.Reader",
    valueType: "unknown",
  },
};
function optional(item: Item): Item {
  return { optional: true, ...item };
}

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
    "?Selector": {},
    "&Sequence": {},
    ">Parallel": {
      props: {
        expected: items["Store.Reader.Number"],
      },
    },
    "?SelectBy": {
      props: {
        index: items["Store.Reader.Number"],
      },
    },
    "?SelectIf": {
      valid: {
        nodesSize: [2, 3],
      },
    },
    "?SelRandom": {},
    "&SeqRandom": {},
    ">Complete": {},
    ">Success": {},
    ">Faliure": {},
    ">Priority": {},
  },
  Decorator: {
    "@Condition": {
      props: {
        statements: { type: "statements" },
        // signal: optional(items["Store.Reader.String"]),
      },
    },
    "@Interrupt": {
      props: {
        // signal: items["Store.Reader.String"],
      },
    },
    "@SwarmShout": {
      props: {
        flag: items["Store.Reader.String"],
        goal: items["Store.Reader.String"],
      },
    },
    "@SwarmReply": {
      props: {
        flag: items["Store.Reader.String"],
        least: items["Store.Reader.Number"],
      },
    },
    "@SwarmAssign": {
      props: {
        seats: optional(items["Store.Reader.Number"]),
        ratio: optional(items["Store.Reader.Number"]),
      },
    },
    "@Repeat": {
      props: {
        success: optional(items["Store.Reader.Number"]),
        failure: optional(items["Store.Reader.Number"]),
      },
    },
    "@Delay": {
      props: {
        millis: items["Store.Reader.Number"],
      },
    },
    "@Inverse": {},
    "@Success": {},
    "@Failure": {},
    "@Save": {
      props: {
        bind: items["Store.Key"],
      },
    },
    "@Acc": {
      props: {
        bind: items["Store.Key"],
        success: items["Store.Reader.Number"],
        failure: items["Store.Reader.Number"],
      },
    },
    "@DebugLog": {
      props: {
        prepare: optional(items["Store.Reader.String"]),
        success: optional(items["Store.Reader.String"]),
        failure: optional(items["Store.Reader.String"]),
      },
    },
  },
  Action: {
    "+Dynamic": {
      props: {
        name: items["Store.Reader.String"],
        args: optional({ type: "StorePreset" }),
      },
      shape:
        '<path d="M6.2 3.01C4.44 2.89 3 4.42 3 6.19V16c0 2.76 2.24 5 5 5s5-2.24 5-5V8c0-1.66 1.34-3 3-3s3 1.34 3 3v7h-.83c-1.61 0-3.06 1.18-3.17 2.79-.12 1.69 1.16 3.1 2.8 3.21 1.76.12 3.2-1.42 3.2-3.18V8c0-2.76-2.24-5-5-5s-5 2.24-5 5v8c0 1.66-1.34 3-3 3s-3-1.34-3-3V9h.83C7.44 9 8.89 7.82 9 6.21c.11-1.68-1.17-3.1-2.8-3.2z"></path>',
    },
    "+Empty": {
      props: {
        extra: optional(items["Store.Reader.Unknown"]),
      },
    },
    "+Tree": {
      props: {
        name: items["Store.Reader.String"],
      },
      shape:
        '<path d="M17 12h2L12 2 5.05 12H7l-3.9 6h6.92v4h3.96v-4H21z"></path>',
    },
    "+Wait": {
      props: {
        millis: items["Store.Reader.Number"],
      },
      shape:
        '<path d="m6 2 .01 6L10 12l-3.99 4.01L6 22h12v-6l-4-4 4-3.99V2H6zm10 14.5V20H8v-3.5l4-4 4 4z"></path>',
    },
  },
};

export default createStorage(
  "BTNodes",
  "/behavior-tree-nodes.yaml",
  Promise.resolve(nodes),
  { readonly: true }
);
