import { createStorage } from "./Storage";

const nodes = {
  Composite: [
    { type: "?=Selector" },
    { type: "&=Sequence" },
    { type: ">=Parallel" },
    { type: "?:SelectBy" },
    { type: "?:SelectIf" },
    { type: "?:SelRandom" },
    { type: "&:SeqRandom" },
    { type: ">:Complete" },
    { type: ">:Success" },
    { type: ">:Faliure" },
    { type: ">:Priority" },
  ],
  Decorator: [
    { type: "@CompareEQ" },
    { type: "@CompareGE" },
    { type: "@CompareLE" },
    { type: "@Repeat" },
    { type: "@Inverse" },
    { type: "@Success" },
    { type: "@Failure" },
    { type: "@Delay" },
    { type: "@Save" },
    { type: "@Acc" },
  ],
  Action: [
    { type: "+ Empty" },
    { type: "+ Tree" },
    { type: "+ Dynamic" },
    { type: "+ Wait" },
  ],
};

export default createStorage(
  "BTNodes",
  "/behavior-tree-nodes.yaml",
  Promise.resolve(nodes)
);
