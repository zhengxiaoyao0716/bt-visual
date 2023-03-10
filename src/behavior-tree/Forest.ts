import { createStorage, Storage } from "../storage/Storage";
import type { Tree } from "./type";
import { defaultRootNode } from "./utils";

export interface Forest {
  name: string;
  trees: Tree[];
}
const LocalStorages: { [name: string]: Storage<Forest> } = {};

export default function createForest(name: string): Storage<Forest> {
  const exist = LocalStorages[name];
  if (exist != null) return exist;
  const path = `/forest/${name}.yaml`;
  const empty = () => Promise.resolve(emptyForest(name));
  const Storage = createStorage(`forest-${name}`, path, empty);
  LocalStorages[name] = Storage;
  return Storage;
}

function emptyForest(name: string): Forest {
  return {
    name,
    trees: [
      {
        name,
        root: defaultRootNode(),
      },
    ],
  };
}

export const ForestManifest = createStorage(
  "ForestManifest",
  "/forest-manifest.yaml",
  () =>
    Promise.resolve(
      [] as {
        name: string;
      }[]
    )
);
