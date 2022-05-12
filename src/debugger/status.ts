import { Dispatch, useEffect, useState } from "react";

import { BTDefines } from "../behavior-tree/Define";
import { Node } from "../behavior-tree/type";
import { getNodeExt, setNodeExt } from "../behavior-tree/utils";

const statusMapper = {
  success: { color: "#00FF00" },
  failure: { color: "#FF0000" },
  running: { color: "#0000FF" },
  none: { color: "" },
};
export module Status {
  export type Key = keyof typeof statusMapper;
  export type Value = typeof statusMapper[Key];
}

const debugDefinesExtKey = Symbol("debug.defines");
const debugSetStatusExtKey = Symbol("debug.setStatus");

export function useNodeStatus(
  defines: BTDefines | undefined,
  node: Node | undefined
): Status.Value {
  const [status, setStatus] = useState<Status.Key>("none");

  useEffect(() => {
    if (node == null || defines == null) return;
    setNodeExt(node, debugDefinesExtKey, defines);
    return () => {
      setNodeExt(node, debugDefinesExtKey, undefined);
    };
  }, [node, defines]);

  useEffect(() => {
    if (node == null || setStatus == null) return;
    setNodeExt(node, debugSetStatusExtKey, setStatus);
    return () => {
      setNodeExt(node, debugSetStatusExtKey, undefined);
    };
  }, [node, setStatus]);

  return statusMapper[status];
}

export function getBTDefines(node: Node): BTDefines | undefined {
  return getNodeExt(node, debugDefinesExtKey);
}

export function getStatusSetter(node: Node): Dispatch<Status.Key> | undefined {
  return getNodeExt(node, debugSetStatusExtKey);
}
