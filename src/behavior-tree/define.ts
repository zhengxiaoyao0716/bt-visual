import { createStorage } from "../storage/Storage";

export type Item = { desc?: string; optional?: true } & (
  | {
      type: "Store.Key";
    }
  | {
      type: "Store.Reader";
      valueType: "number" | "string" | "boolean";
    }
  | {
      type: "Store.Reader";
    }
  | {
      type: "dict";
      value: Item;
    }
);

export interface NodeProps {
  [name: string]: Item;
}

const items: { [key: string]: Item } = {
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
  "Store.Reader": {
    type: "Store.Reader",
  },
};
function optional(item: Item): Item {
  return { ...item, optional: true };
}

const nodes = {
  Composite: {
    "?=Selector": {},
    "&=Sequence": {},
    ">=Parallel": {
      expected: items["Store.Reader.Number"],
    },
    "?:SelectBy": {
      index: items["Store.Reader.Number"],
    },
    "?:SelectIf": {},
    "?:SelRandom": {},
    "&:SeqRandom": {},
    ">:Complete": {},
    ">:Success": {},
    ">:Faliure": {},
    ">:Priority": {},
  } as { [type: string]: NodeProps },
  Decorator: {
    "@CompareEQ": {
      expected: items["Store.Reader"],
      subject: items["Store.Reader"],
    },
    "@CompareGE": {
      expected: items["Store.Reader"],
      subject: items["Store.Reader"],
    },
    "@CompareLE": {
      expected: items["Store.Reader"],
      subject: items["Store.Reader"],
    },
    "@Repeat": {
      success: optional(items["Store.Reader.Number"]),
      failure: optional(items["Store.Reader.Number"]),
    },
    "@Inverse": {},
    "@Success": {},
    "@Failure": {},
    "@Delay": {
      failure: items["Store.Reader.Number"],
    },
    "@Save": {
      bind: items["Store.Key"],
    },
    "@Acc": {
      bind: items["Store.Key"],
      success: items["Store.Reader.Number"],
      failure: items["Store.Reader.Number"],
    },
  } as { [type: string]: NodeProps },
  Action: {
    "+ Empty": {
      extra: items["Store.Reader"],
    },
    "+ Tree": {
      name: items["Store.Reader.String"],
    },
    "+ Dynamic": {
      name: items["Store.Reader.String"],
      args: {
        type: "dict",
        value: items["Store.Reader"],
      },
    },
    "+ Wait": {
      millis: items["Store.Reader.Number"],
    },
  } as { [type: string]: NodeProps },
};

export default createStorage(
  "BTNodes",
  "/behavior-tree-nodes.yaml",
  Promise.resolve(nodes)
);
