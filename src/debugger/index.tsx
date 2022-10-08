import { useSearchParams } from "react-router-dom";
import BTDefine from "../behavior-tree/Define";
import { getNodeType } from "../behavior-tree/utils";
import { invalidNode, InvalidNode } from "../behavior-tree/validator";
import Snack from "../components/Snack";
import DebugService from "../service/DebugService";
import Connect from "./Connect";
import { getBTDefines, getStatusSetter } from "./status";
import Workspace from "./Workspace";

export { useNodeStatus } from "./status";

export function handleInvalidNodes(invalidNodes: InvalidNode[]) {
  for (const { node, invalids } of invalidNodes) {
    if ("fold" in node) delete (node as { fold?: true }).fold; // 展开节点
    if (invalids == null || invalids.length <= 0) continue;
    console.warn(`Found invalid node:`, node);

    function updateStatus(failedCount = 0) {
      const setStatus = getStatusSetter(node);
      const defines = getBTDefines(node);
      if (setStatus == null || defines == null) {
        // 节点未挂载，重试三次
        failedCount < 3 &&
          setTimeout(
            updateStatus.bind(null, 1 + failedCount),
            10 + failedCount * 100
          );
        return;
      }

      const invalids = invalidNode(defines, node, getNodeType(node.type));
      if (invalids == null || invalids.length <= 0) {
        setStatus("none");
        return;
      }
      // 设置为失败，每秒检测失败节点是否修复
      setStatus("failure");
      setTimeout(updateStatus, 1000);
    }
    updateStatus();
  }
}

export default function Debugger() {
  const [params, setParams] = useSearchParams();
  const address = params.get("address");
  const connect = (address: string) => setParams({ address });
  return (
    <BTDefine>
      <Snack>
        {address == null ? (
          <Connect connect={connect} />
        ) : (
          <DebugService address={address}>
            <Workspace />
          </DebugService>
        )}
      </Snack>
    </BTDefine>
  );
}
Debugger.route = "/debugger";