import { describe, expect, it } from "vitest";
import type { GameDataYear, GameState } from "../types";
import { buildMonthScene } from "./content";
import {
  advanceScene,
  canAdvanceScene,
  createInitialState,
  currentSceneNode,
  nextMonth,
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

describe("初始状态", () => {
  it("从第一话和第一个剧情节点开始", () => {
    const state = makeTestState("2023");
    expect(state.year).toBe("2023");
    expect(state.monthIndex).toBe(0);
    expect(state.sceneNodeIndex).toBe(0);
    expect(state.locked).toBe(false);
    expect(state.finished).toBe(false);
    expect(state.relations.lin_ruoning).toBeGreaterThan(0);
    expect(state.focusId).toBe("deep_research");
  });
});

describe("当前剧情节点", () => {
  it("根据 sceneNodeIndex 返回节点，并在末尾进入研究方案", () => {
    const state = makeTestState("2023");
    const scene = sceneForMonth(state);
    expect(currentSceneNode(state).type).toBe("dialogue");
    const lastIndex = scene.nodes.length - 1;
    const atDecision = { ...state, sceneNodeIndex: lastIndex };
    expect(currentSceneNode(atDecision).type).toBe("decision");
  });
});

describe("剧情推进条件", () => {
  it("对白节点可以继续", () => {
    expect(canAdvanceScene(makeTestState("2023"))).toBe(true);
  });

  it("未选择方案时停在研究方案节点，结算后可以继续", () => {
    const state = makeTestState("2023");
    const lastIndex = sceneForMonth(state).nodes.length - 1;
    const atDecision = { ...state, sceneNodeIndex: lastIndex };
    expect(canAdvanceScene(atDecision)).toBe(false);
    expect(canAdvanceScene({ ...atDecision, locked: true })).toBe(true);
  });
});

describe("推进当前场景", () => {
  const data = emptyYear();

  it("不会越过尚未结算的研究方案节点", () => {
    const state = makeTestState("2023");
    const lastIndex = sceneForMonth(state).nodes.length - 1;
    const atDecision = { ...state, sceneNodeIndex: lastIndex };
    expect(advanceScene(atDecision, data)).toBe(atDecision);
  });

  it("从对白节点进入下一个节点", () => {
    const next = advanceScene(makeTestState("2023"), data);
    expect(next.sceneNodeIndex).toBe(1);
  });

  it("在本话最后一个节点结算后进入下一话", () => {
    const state = makeTestState("2023");
    const lastIndex = sceneForMonth(state).nodes.length - 1;
    const atEndLocked = { ...state, sceneNodeIndex: lastIndex, locked: true };
    const next = advanceScene(atEndLocked, data);
    expect(next.monthIndex).toBe(1);
    expect(next.sceneNodeIndex).toBe(0);
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
