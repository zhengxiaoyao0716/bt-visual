import { Composite, Tree } from "../behavior-tree/type";
import Socket, {
  MockedSession,
  MockedSocket,
  mockSession,
  mockSocket,
} from "../common/Socket";
import createService, { Dispatcher } from "./Service";

export interface TreeGroup {
  id: string; // groupId
  label: string; // group label
  trees?: { id: string; name: string }[];
  groups?: TreeGroup[]; // sub groups
}

export interface ServiceState {
  treeGroups?: TreeGroup[];
  tree?: Tree;
}

export type ServiceManager = Manager;

export type DispatchState = Dispatcher<ServiceState>;

interface Props {
  address: string;
}

export default createService<Props, ServiceState, ServiceManager>(
  "DebugService",
  ({ address }, dispatch) => {
    const socket = new Socket(address);
    const manager = launchService(socket, dispatch);
    return [null, manager, () => socket.close()];
  }
);

function launchService(socket: Socket, dispatch: DispatchState): Manager {
  mockSocket(socket, mockLaunchService);

  socket.read("/tree/groups/", async (text) =>
    dispatch({ treeGroups: JSON.parse(text) as TreeGroup[] })
  );
  return new Manager(socket, dispatch);
}

class Manager {
  constructor(
    private readonly socket: Socket,
    private readonly dispatch: DispatchState
  ) {}

  async loadTree(groupId: string, treeId: string) {
    const session = this.socket.request<Tree>("/tree/load/", {
      groupId,
      treeId,
    });

    mockSession(session, mockLoadTree, groupId, treeId);

    const tree = await session.done();
    this.dispatch({ tree });
  }
}

function mockLaunchService(ms: MockedSocket) {
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
      trees: [{ id: "tree0", name: "SoldierTree" }],
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
    },
  ];
  ms.mockText(`/tree/groups/${JSON.stringify(groups)}`);
}

function mockLoadTree(
  ms: MockedSession<Tree>,
  groupId: string,
  treeId: string
) {
  ms.mockDone({
    name: `mock://${groupId}/${treeId}`,
    root: {
      type: "?Selector",
      nodes: [],
    } as Composite,
  });
}
