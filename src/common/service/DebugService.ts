import createForest, { ForestManifest } from "../../behavior-tree/Forest";
import { Tree } from "../../behavior-tree/type";
import {
  NodeStatusDict,
  Status,
  clearTreeNodeStatus,
  iterAllNodes,
  linkTreeNodes,
  pauseTreeNodeStatus,
  resumeTreeNodeStatus,
  setTreeNodeStatus,
  statusMapper,
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
    mockSession(session, mockLoadGroup, parentId, groupId);

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
      mockSession(session, debugStartPlay, tree);

      const statusDict = JSON.parse(await session.read(6000));
      setTreeNodeStatus(tree, statusDict);
    };
    const pause = async () => {
      pauseTreeNodeStatus(tree);
    };
    const stop = async () => {
      clearTreeNodeStatus(tree);
      await session.send("stop");
      mockSession(session, debugStopPlay, tree);
    };
    const query = async (bind: string): Promise<string> => {
      await session.send("query");
      await session.send(bind);
      return await session.read(6000);
    };
    const done = async () => {
      await session.send("close");
      mockSession(session, debugClose, tree);
      await session.done();
    };
    session.once("status", (text) => {
      const statusDict = JSON.parse(text);
      setTreeNodeStatus(tree, statusDict);
    });
    return { start, pause, stop, query, done };
  }
}

function mockedRootGroups(): TreeGroup[] {
  return [
    // 测试延迟加载分组
    {
      id: "humanStage",
      label: "Human Stage",
      groups: [
        { id: "human#01", label: "Test Human 01" },
        { id: "human#02", label: "Test Human 02" },
      ],
    },
    {
      id: "worldStage",
      label: "World Stage",
      groups: [
        {
          id: "world#01",
          label: "World Stage 01",
        },
        {
          id: "world#02",
          label: "World Stage 02",
        },
      ],
    },
    // 测试直接加载分组和树信息
    {
      id: "specials",
      label: "Specials",
      groups: [
        {
          id: "specials#01",
          label: "Special Stage Line-1",
          trees: [
            { id: "tree1", name: "Line-1 Tree-1" },
            { id: "tree2", name: "Line-1 Tree-2" },
          ],
        },
        {
          id: "specials#02",
          label: "Special Stage line-2",
          trees: [
            { id: "tree1", name: "Line-2 Tree-1" },
            { id: "tree2", name: "Line-2 Tree-2" },
          ],
        },
      ],
      trees: [
        { id: "tree1", name: "Main Tree-1" },
        { id: "tree2", name: "Main Tree-2" },
      ],
    },
  ];
}

function mockRecvTreeGroups(ms: MockedSocket) {
  const groups: TreeGroup[] = mockedRootGroups();
  ms.read("tree/groups", JSON.stringify(groups));
}

function mockLoadGroup(ms: MockedSession, parentId: string, groupId: string) {
  const groups: TreeGroup[] = parentId
    ? [
        {
          id: "monster#01",
          label: `${groupId} - Monster 01`,
          trees: [
            { id: "tree1", name: `${groupId} - Monster 01 - Tree-1` },
            { id: "tree2", name: `${groupId} - Monster 01 - Tree-2` },
          ],
        },
        {
          id: "monster#02",
          label: `${groupId} - Monster 02`,
          trees: [
            { id: "tree1", name: `${groupId} - Monster 02 - Tree-1` },
            { id: "tree2", name: `${groupId} - Monster 02 - Tree-2` },
          ],
        },
      ]
    : mockedRootGroups();
  ms.done(JSON.stringify(groups));
}

async function mockLoadTree(ms: MockedSession, treeId: string) {
  const manifest = await ForestManifest.load();
  const Forest = createForest(manifest[0].name || "");
  const forest = await Forest.load();
  const trees = forest.trees.map(({ name }, index) => ({
    id: `tree${1 + index}`,
    name,
  }));
  const treeIndex = trees.findIndex(({ id }) => id === treeId);
  const tree = forest.trees[treeIndex];

  let index = 0;
  const attachKey = "_DBG";
  for (const node of iterAllNodes(tree.root)) {
    (node as any)[attachKey] = index++;
  }
  ms.done(JSON.stringify({ trees, tree, attachKey }));
}

async function debugStartPlay(ms: MockedSession, tree: Tree) {
  const statusDict: NodeStatusDict = { 0: "running" };
  ms.read(JSON.stringify(statusDict));

  let nodesNum = 0;
  for (const _node of iterAllNodes(tree.root)) nodesNum++;
  const statusKeys = Object.keys(statusMapper) as Status.Key[];

  let timer: number | undefined;
  function debugTimer(index: number) {
    timer = window.setTimeout(() => {
      const key = (1 + index) % nodesNum;
      debugTimer(key);
      const statusDict: NodeStatusDict = {
        [key]: statusKeys[(Math.random() * statusKeys.length) | 0],
      };
      ms.once("status", JSON.stringify(statusDict));
      console.log(statusDict);
    }, 1000);
  }
  debugTimer(0);
  (tree as any)._DBG_STOP = () => timer == null || window.clearTimeout(timer);
}
async function debugStopPlay(_ms: MockedSession, tree: Tree) {
  (tree as any)._DBG_STOP?.();
}
async function debugClose(_ms: MockedSession, tree: Tree) {
  (tree as any)._DBG_STOP?.();
  _ms.done("");
}
