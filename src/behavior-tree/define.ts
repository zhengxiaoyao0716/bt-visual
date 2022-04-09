import { createStorage } from "../storage/Storage";

export interface NodeProps {}

const nodes = {
  Composite: {
    "?=Selector": {},
    "&=Sequence": {},
    ">=Parallel": {},
    "?:SelectBy": {},
    "?:SelectIf": {},
    "?:SelRandom": {},
    "&:SeqRandom": {},
    ">:Complete": {},
    ">:Success": {},
    ">:Faliure": {},
    ">:Priority": {},
  } as { [type: string]: NodeProps },
  Decorator: {
    "@CompareEQ": {},
    "@CompareGE": {},
    "@CompareLE": {},
    "@Repeat": {},
    "@Inverse": {},
    "@Success": {},
    "@Failure": {},
    "@Delay": {},
    "@Save": {},
    "@Acc": {},
  } as { [type: string]: NodeProps },
  Action: {
    "+ Empty": {},
    "+ Tree": {},
    "+ Dynamic": {},
    "+ Wait": {},
  } as { [type: string]: NodeProps },
};

export default createStorage(
  "BTNodes",
  "/behavior-tree-nodes.yaml",
  Promise.resolve(nodes)
);
