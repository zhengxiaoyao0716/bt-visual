import type { Tree } from "./type";

const neerGhostTree: Tree = {
  name: "Pac-Man / NearGhost",
  root: {
    type: "?=Selector",
    // @ts-ignore
    nodes: [
      {
        // 判定敌人是否害怕
        type: "@CompareEQ",
        expected: true,
        subject: {
          type: "boolean",
          bind: ".ghost.isScared",
          init: false,
        },
        // 敌人害怕时的行为
        node: {
          type: "+ Empty",
          extra: "Chase Ghost", // 追赶敌人
        },
      },
      // 敌人不害怕时的行为
      {
        // 测量与能量的距离
        type: "@CompareLE",
        expected: 10,
        subject: {
          type: "number",
          bind: ".power.distance",
          init: 100,
        },
        // 距离能量较近时的行为
        node: {
          type: "+ Empty",
          extra: "Run to Power", // 向着能量跑去
        },
      },
      // // 距离能量较远时的行为 // 反之是直接失败，有没有这个条件都一样
      // {
      //     type: '@Failure',
      //     node: { type: 'Empty' },    // 直接失败，跳出条件
      // },
    ],
  },
};

const mainTree: Tree = {
  name: "Pac-Man",
  root: {
    type: "?=Selector",
    // @ts-ignore
    nodes: [
      {
        // 判定豆子数量
        type: "@CompareEQ",
        expected: 0,
        subject: {
          type: "number",
          bind: ".pills.num",
          init: "10",
        },
        // 豆子清空时直接胜利
        node: { type: "+ Empty", extra: "Win" },
      },
      // 豆子未清空时的行为
      {
        // 测量与敌人的距离
        type: "@CompareLE",
        expected: 10,
        subject: {
          type: "number",
          bind: ".ghost.distance",
          init: 100,
        },
        // 距离敌人较近时的行为
        node: {
          type: "+ Tree",
          name: "Pac-Man/NearGhost", // 运行子树
        },
      },
      // 距离敌人较远时的行为
      {
        type: ">:Priority",
        nodes: [
          { type: "+ Empty", extra: "Seek for Pills" }, // 寻找豆子
          { type: "+ Empty", extra: "Seek for Fruit" }, // 寻找水果
        ],
      },
      // 永远不会触发，仅测试用
      {
        type: "@CompareGE",
        expected: 10,
        subject: 9,
        node: {
          type: "@Inverse",
          node: {
            type: "&=Sequence",
            nodes: [
              { type: "+ Empty" },
              { type: "+ Empty" },
              {
                type: ">=Parallel",
                nodes: [
                  { type: "+ Empty" },
                  {
                    type: "@Repeat",
                    node: { type: "+ Empty" },
                  },
                  { type: "+ Empty" },
                ],
              },
              { type: "+ Empty" },
            ],
          },
        },
      },
    ],
  },
};

export default {
  name: "Example",
  trees: [mainTree, neerGhostTree],
};
