import { createStorage, Storage } from "../storage/Storage";
import type { Composite, Tree } from "./type";

export interface Forest {
  name: string;
  trees: Tree[];
}
const LocalStorages: { [name: string]: Storage<Forest> } = {};

export default function createForest(name: string): Storage<Forest> {
  const path = `/forest/${name}.yaml`;
  const exist = LocalStorages[name];
  if (exist != null) return exist;
  const empty = Promise.resolve(emptyForest(name));
  const Storage = createStorage(name, path, empty);
  LocalStorages[name] = Storage;
  return Storage;
}

function emptyForest(name: string): Forest {
  return {
    name,
    trees: [
      {
        name,
        root: {
          type: "?Selector",
          nodes: [],
        } as Composite,
      },
    ],
  };
}

export const ForestMainfest = createStorage(
  "ForestManifest",
  "/forest-manifest.yaml",
  Promise.resolve([{ name: "Example" }, { name: "测试中文" }] as {
    name: string;
  }[])
);
