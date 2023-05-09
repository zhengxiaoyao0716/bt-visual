import { Dispatch, useEffect, useState } from "react";

import { BTDefines } from "../behavior-tree/Define";
import { Node } from "../behavior-tree/type";
import ExtValue from "../common/ExtValue";
import { useRefresh } from "../components/Refresh";

const statusMapper = {
  success: { color: "#00cd00" },
  failure: { color: "#ee0212" },
  running: { color: "#0288ee" },
  none: { color: "" },
};
export module Status {
  export type Key = keyof typeof statusMapper;
  export type Value = (typeof statusMapper)[Key];
}

const debugStatusExtKey = Symbol("debug.status");
const debugDefinesExtKey = Symbol("debug.defines");
const debugSetStatusExtKey = Symbol("debug.setStatus");

export function useNodeStatus(
  defines: BTDefines | undefined,
  node: Node | undefined
): Status.Value {
  const [, refresh] = useRefresh();
  const status =
    (node && (ExtValue.getValue(node, debugStatusExtKey) as Status.Key)) ??
    "none";

  // TODO 临时测试动画
  useEffect(() => {
    if (node == null || window.location.href.indexOf("debug") < 0) return;
    const handler = setInterval(() => {
      ExtValue.setValue(
        node,
        debugStatusExtKey,
        Object.keys(statusMapper)[(Math.random() * 4) | 0]
      );
      refresh();
    }, Math.random() * 3_000 + 3_000);
    return () => clearInterval(handler);
  }, []);

  useEffect(() => {
    if (node == null || defines == null) return;
    ExtValue.setValue(node, debugDefinesExtKey, defines);
    return () => {
      ExtValue.setValue(node, debugDefinesExtKey, undefined);
    };
  }, [node, defines]);

  useEffect(() => {
    if (node == null) return;
    ExtValue.setValue(node, debugSetStatusExtKey, (status: Status.Key) => {
      ExtValue.setValue(node, debugStatusExtKey, status);
      refresh();
    });
    return () => {
      ExtValue.setValue(node, debugSetStatusExtKey, undefined);
    };
  }, [node, refresh]);

  return statusMapper[status];
}

export function getBTDefines(node: Node): BTDefines | undefined {
  return ExtValue.getValue(node, debugDefinesExtKey);
}

export function getStatusSetter(node: Node): Dispatch<Status.Key> | undefined {
  return ExtValue.getValue(node, debugSetStatusExtKey);
}

export function WithNodeStatus({
  defines,
  node,
  children,
}: {
  defines: BTDefines | undefined;
  node: Node | undefined;
  children(status: Status.Value): JSX.Element;
}) {
  const status = useNodeStatus(defines, node);
  return children(status);
}
