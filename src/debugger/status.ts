import { Dispatch, useEffect, useState } from "react";

import { BTDefines } from "../behavior-tree/Define";
import { Node } from "../behavior-tree/type";
import ExtValue from "../common/ExtValue";

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
    ExtValue.setValue(node, debugDefinesExtKey, defines);
    return () => {
      ExtValue.setValue(node, debugDefinesExtKey, undefined);
    };
  }, [node, defines]);

  useEffect(() => {
    if (node == null || setStatus == null) return;
    ExtValue.setValue(node, debugSetStatusExtKey, setStatus);
    return () => {
      ExtValue.setValue(node, debugSetStatusExtKey, undefined);
    };
  }, [node, setStatus]);

  return statusMapper[status];
}

export function getBTDefines(node: Node): BTDefines | undefined {
  return ExtValue.getValue(node, debugDefinesExtKey);
}

export function getStatusSetter(node: Node): Dispatch<Status.Key> | undefined {
  return ExtValue.getValue(node, debugSetStatusExtKey);
}
