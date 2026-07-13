import { describe, expect, it } from "vitest";
import type { GameDataYear, GameState } from "../types";
import { buildMonthScene } from "./content";
import {
  advanceScene,
  canAdvanceScene,
  canRewindScene,
  createInitialState,
  currentSceneNode,
  nextMonth,
  rewindScene,
  sceneForMonth,
} from "./runtime";

function emptyYear(): GameDataYear {
  return {
    year: 2025,
    currency: "CNY",
    generatedAt: new Date().toISOString(),
    source: {
      dailyDataset: "test",
      dailyDatasetVersion: "1",
      instrumentDataset: "test",
      priceColumn: "adj_close",
    },
    rules: {},
    benchmarks: [],
    scenes: [buildMonthScene(0, "2025"), buildMonthScene(1, "2025")],
  };
}

function makeTestState(year = "2023"): GameState {
  return createInitialState(year);
}

function stateAtNode(state: GameState, index: number): GameState {
  const scene = sceneForMonth(state);
  return {
    ...state,
    sceneNodeIndex: index,
    sceneNodeId: scene.nodes[index]?.id ?? "",
  };
}

describe("初始状态", () => {
  it("从第一话和第一个剧情节点开始", () => {
    const state = makeTestState("2023");
    expect(state.year).toBe("2023");
    expect(state.monthIndex).toBe(0);
    expect(state.sceneNodeIndex).toBe(0);
    expect(state.sceneNodeId).toBe(sceneForMonth(state).nodes[0].id);
    expect(state.locked).toBe(false);
    expect(state.finished).toBe(false);
    expect(state.relations.lin_ruoning).toBeGreaterThan(0);
    expect(state.focusId).toBe("deep_research");
  });
});

describe("当前剧情节点", () => {
  it("根据稳定节点 id 返回节点，并在 id 缺失时回退到数字索引", () => {
    const state = makeTestState("2023");
    const scene = sceneForMonth(state);
    expect(currentSceneNode(state).type).toBe("dialogue");
    const lastIndex = scene.nodes.length - 1;
    expect(currentSceneNode(stateAtNode(state, lastIndex)).type).toBe("decision");
    const legacyAtDecision = { ...state, sceneNodeIndex: lastIndex, sceneNodeId: "" };
    expect(currentSceneNode(legacyAtDecision).type).toBe("decision");
  });
});

describe("剧情推进条件", () => {
  it("对白节点可以继续", () => {
    expect(canAdvanceScene(makeTestState("2023"))).toBe(true);
  });

  it("未选择方案时停在研究方案节点，结算后可以继续", () => {
    const state = makeTestState("2023");
    const lastIndex = sceneForMonth(state).nodes.length - 1;
    const atDecision = stateAtNode(state, lastIndex);
    expect(canAdvanceScene(atDecision)).toBe(false);
    expect(canAdvanceScene({ ...atDecision, locked: true })).toBe(true);
  });
});

describe("回看当前场景", () => {
  it("允许在结算前返回上一段对白", () => {
    const state = stateAtNode(makeTestState("2023"), 2);
    expect(canRewindScene(state)).toBe(true);
    expect(rewindScene(state).sceneNodeIndex).toBe(1);
  });

  it("不会退到第一段对白之前", () => {
    const state = makeTestState("2023");
    expect(canRewindScene(state)).toBe(false);
    expect(rewindScene(state)).toBe(state);
  });

  it("结算完成后只允许通过记录回看，不撤销数值", () => {
    const state = { ...stateAtNode(makeTestState("2023"), 2), locked: true };
    expect(canRewindScene(state)).toBe(false);
    expect(rewindScene(state)).toBe(state);
  });
});

describe("稳定节点游标", () => {
  it("动态分支插入后仍按节点 id 恢复到同一段剧情", () => {
    const base = { ...createInitialState("2025"), monthIndex: 3 };
    const before = sceneForMonth(base);
    const colleagueIndex = before.nodes.findIndex((node) => node.id === "m3-colleague");
    const changed = {
      ...base,
      sceneNodeIndex: colleagueIndex,
      sceneNodeId: "m3-colleague",
      flags: { ...base.flags, peer_zhao_met: true },
    };
    const after = sceneForMonth(changed);
    expect(after.nodes.findIndex((node) => node.id === "m3-colleague")).not.toBe(colleagueIndex);
    expect(currentSceneNode(changed).id).toBe("m3-colleague");
  });

  it("推进和回看同步更新节点 id 与数字缓存", () => {
    const initial = createInitialState("2023");
    const advanced = advanceScene(initial, emptyYear());
    expect(advanced.sceneNodeId).toBe(sceneForMonth(advanced).nodes[advanced.sceneNodeIndex].id);
    const rewound = rewindScene(advanced);
    expect(rewound.sceneNodeId).toBe(sceneForMonth(rewound).nodes[rewound.sceneNodeIndex].id);
  });
});

describe("推进当前场景", () => {
  const data = emptyYear();

  it("不会越过尚未结算的研究方案节点", () => {
    const state = makeTestState("2023");
    const lastIndex = sceneForMonth(state).nodes.length - 1;
    const atDecision = stateAtNode(state, lastIndex);
    expect(advanceScene(atDecision, data)).toBe(atDecision);
  });

  it("从对白节点进入下一个节点", () => {
    const next = advanceScene(makeTestState("2023"), data);
    expect(next.sceneNodeIndex).toBe(1);
  });

  it("在本话最后一个节点结算后进入下一话", () => {
    const state = makeTestState("2023");
    const lastIndex = sceneForMonth(state).nodes.length - 1;
    const atEndLocked = { ...stateAtNode(state, lastIndex), locked: true };
    const next = advanceScene(atEndLocked, data);
    expect(next.monthIndex).toBe(1);
    expect(next.sceneNodeIndex).toBe(0);
    expect(next.sceneNodeId).toBe(sceneForMonth(next).nodes[0].id);
    expect(next.locked).toBe(false);
  });
});

describe("进入下一话", () => {
  it("本月尚未结算时保持原状态", () => {
    const state = makeTestState("2023");
    expect(nextMonth(state)).toBe(state);
  });

  it("重置剧情游标、锁定状态和默认日程", () => {
    const state = {
      ...makeTestState("2023"),
      locked: true,
      monthIndex: 2,
      focusId: "self_care",
    };
    const next = nextMonth(state);
    expect(next.monthIndex).toBe(3);
    expect(next.sceneNodeIndex).toBe(0);
    expect(next.sceneNodeId).toBe(sceneForMonth(next).nodes[0].id);
    expect(next.locked).toBe(false);
    expect(next.focusId).toBe("deep_research");
  });

  it("完成全年后开启同年份的新周目", () => {
    const state = {
      ...makeTestState("2023"),
      finished: true,
      locked: true,
      monthIndex: 11,
    };
    const next = nextMonth(state);
    expect(next.year).toBe("2023");
    expect(next.monthIndex).toBe(0);
    expect(next.finished).toBe(false);
  });
});
