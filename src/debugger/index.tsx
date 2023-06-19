import { useSearchParams } from "react-router-dom";
import { getNodeType } from "../behavior-tree/utils";
import { invalidNode, InvalidNode } from "../behavior-tree/validator";
import DebugService from "../common/service/DebugService";
import Connect from "./Connect";
import { getBTDefines, getStatusSetter } from "./status";
import Workspace from "./Workspace";

export { useNodeStatus } from "./status";

export function handleInvalidNodes(invalidNodes: InvalidNode[]) {
  for (const { node, invalids } of invalidNodes) {
    if ("fold" in node) delete (node as { fold?: true }).fold; // 展开节点
    if (invalids == null || invalids.length <= 0) continue;
    console.warn(`Found invalid node:`, node, invalids);

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
  const parentId = params.get("parentId");
  const groupId = params.get("groupId");
  const treeId = params.get("treeId");
  return address == null ? (
    <Connect connect={(address: string) => setParams({ address })} />
  ) : (
    <DebugService address={address}>
      <Workspace
        parentId={parentId}
        groupId={groupId}
        treeId={treeId}
        loadGroup={(parentId: string, groupId: string) =>
          setParams({ address, parentId, groupId })
        }
        loadTree={(groupId: string, treeId: string) =>
          setParams({ address, groupId, treeId })
        }
      />
    </DebugService>
  );
}
Debugger.route = `${import.meta.env.BASE_URL}debugger`;
