import createForest, { ForestManifest } from "../../behavior-tree/Forest";
import { Tree } from "../../behavior-tree/type";
import {
  NodeStatusDict,
  Status,
  clearTreeNodeStatus,
  linkTreeNodes,
  pauseTreeNodeStatus,
  resumeTreeNodeStatus,
  setTreeNodeStatus,
} from "../../debugger/status";
import Socket, {
  MockedSession,
  MockedSocket,
  mockSession,
  mockSocket,
} from "../Socket";
import createService, { Dispatcher } from "./Service";

export interface TreeGroup {
  id: string; // groupId
  label: string; // group label
  groups?: TreeGroup[]; // sub groups
  trees?: { id: string; name: string }[];
}

export interface ServiceState {
  treeGroups?: TreeGroup[];
  treeLoaded?: {
    trees: NonNullable<TreeGroup["trees"]>;
    tree: Tree;
    attachKey: string; // 节点附加信息的 key，由 debug 服务器指定
  };
  loading?: true;
}

export type ServiceManager = Manager;

export type DispatchState = Dispatcher<ServiceState>;

interface Props {
  address: string;
}

const DebugService = createService<Props, ServiceState, ServiceManager>(
  "DebugService",
  ({ address }, dispatch) => {
    const socket = new Socket(address);
    const manager = launchService(socket, dispatch);
    const cleanup = () => socket.close();
    return { manager, cleanup };
  }
);
export default DebugService;

function launchService(socket: Socket, dispatch: DispatchState): Manager {
  mockSocket(socket, mockRecvTreeGroups);

  socket.once("tree/groups", async (text) =>
    dispatch({
      treeGroups: JSON.parse(text) as TreeGroup[],
    })
  );
  return new Manager(socket, dispatch);
}

export class Manager {
  constructor(
    readonly socket: Socket,
    private readonly dispatch: DispatchState
  ) {}

  async loadGroup(parentId: string, groupId: string) {
    const session = this.socket.request(
      "group/load",
      JSON.stringify({ parentId, groupId })
    );

    mockSession(session, (ms) => ms.done("null"));
    const treeGroups = JSON.parse(await session.done());
    treeGroups && this.dispatch({ treeGroups });
  }

  async loadTree(groupId: string, treeId: string) {
    this.dispatch({ loading: true });
    const session = this.socket.request(
      "tree/load",
      JSON.stringify({ groupId, treeId })
    );

    mockSession(session, mockLoadTree, treeId);
    const treeLoaded: NonNullable<ServiceState["treeLoaded"]> = //
      JSON.parse(await session.done());

    this.dispatch(
      treeLoaded ? { loading: undefined, treeLoaded } : { loading: undefined }
    );
    treeLoaded && linkTreeNodes(treeLoaded.tree, treeLoaded.attachKey);
  }

  attachDebug(tree: Tree) {
    const session = this.socket.request("debug/attach", "");
    const start = async () => {
      if (resumeTreeNodeStatus(tree)) return;
      await session.send("start");
      const statusDict = JSON.parse(await session.read(6000));
      setTreeNodeStatus(tree, statusDict);
    };
    const pause = async () => {
      pauseTreeNodeStatus(tree);
    };
    const stop = async () => {
      clearTreeNodeStatus(tree);
      await session.send("stop");
    };
    const done = async () => {
      await session.send("close");
      await session.done();
    };
    session.once("status", (text) => {
      const statusDict = JSON.parse(text);
      setTreeNodeStatus(tree, statusDict);
    });
    return { start, pause, stop, done };
  }
}

function mockRecvTreeGroups(ms: MockedSocket) {
  const groups: TreeGroup[] = [
    {
      id: "stage0",
      label: "simple stage",
      trees: [
        { id: "tree0", name: "BossTree" },
        { id: "tree1", name: "SoldierTree" },
      ],
    },
    {
      id: "stage1",
      label: "multi line stage",
      groups: [
        {
          id: "stage1#line1",
          label: "stage line 01",
          trees: [
            { id: "tree0", name: "BossTree" },
            { id: "tree1", name: "SoldierTree011" },
          ],
        },
        {
          id: "stage1#line2",
          label: "stage line 02",
          trees: [
            { id: "tree0", name: "BossTree" },
            { id: "tree1", name: "SoldierTree021" },
          ],
        },
      ],
      trees: [{ id: "tree0", name: "SoldierTree" }],
    },
  ];
  ms.read("tree/groups", JSON.stringify(groups));
}

async function mockLoadTree(ms: MockedSession, treeId: string) {
  const manifest = await ForestManifest.load();
  const Forest = createForest(manifest[0].name || "");
  const forest = await Forest.load();
  const trees = forest.trees.map(({ name }, index) => ({
    id: `tree${index}`,
    name,
  }));
  const treeIndex = trees.findIndex(({ id }) => id === treeId);
  const tree = forest.trees[treeIndex];
  ms.done(JSON.stringify({ trees, tree: tree, attachKey: "" }));
}
