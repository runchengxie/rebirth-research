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
    source: { dailyDataset: "test", dailyDatasetVersion: "1", instrumentDataset: "test", priceColumn: "adj_close" },
    rules: {},
    benchmarks: [],
    scenes: [buildMonthScene(0, "2025"), buildMonthScene(1, "2025")],
  };
}

function makeTestState(year = "2023"): GameState {
  return createInitialState(year);
}

describe("runtime.createInitialState", () => {
  it("starts at month 0, unlocked, with baseline metrics", () => {
    const s = makeTestState("2023");
    expect(s.year).toBe("2023");
    expect(s.monthIndex).toBe(0);
    expect(s.sceneNodeIndex).toBe(0);
    expect(s.locked).toBe(false);
    expect(s.finished).toBe(false);
    expect(s.relations.lin_ruoning).toBeGreaterThan(0);
    expect(s.focusId).toBe("deep_research");
  });
});

describe("runtime.scene cursor", () => {
  it("currentSceneNode follows sceneNodeIndex and ends on the decision node", () => {
    const s = makeTestState("2023");
    const scene = sceneForMonth(s);
    expect(currentSceneNode(s).type).toBe("dialogue");
    const lastIdx = scene.nodes.length - 1;
    const atDecision = { ...s, sceneNodeIndex: lastIdx };
    expect(currentSceneNode(atDecision).type).toBe("decision");
  });
});

describe("runtime.canAdvanceScene", () => {
  it("dialogue node is advanceable", () => {
    expect(canAdvanceScene(makeTestState("2023"))).toBe(true);
  });

  it("unlocked decision node blocks advance, locked allows it", () => {
    const s = makeTestState("2023");
    const lastIdx = sceneForMonth(s).nodes.length - 1;
    const atDecision = { ...s, sceneNodeIndex: lastIdx };
    expect(canAdvanceScene(atDecision)).toBe(false);
    expect(canAdvanceScene({ ...atDecision, locked: true })).toBe(true);
  });
});

describe("runtime.advanceScene", () => {
  const data = emptyYear();

  it("does not advance past an unlocked decision node", () => {
    const s = makeTestState("2023");
    const lastIdx = sceneForMonth(s).nodes.length - 1;
    const atDecision = { ...s, sceneNodeIndex: lastIdx };
    expect(advanceScene(atDecision, data)).toBe(atDecision);
  });

  it("advances the cursor on a dialogue node", () => {
    const next = advanceScene(makeTestState("2023"), data);
    expect(next.sceneNodeIndex).toBe(1);
  });

  it("rolls to the next month when advancing past the last node while locked", () => {
    const s = makeTestState("2023");
    const lastIdx = sceneForMonth(s).nodes.length - 1;
    const atEndLocked = { ...s, sceneNodeIndex: lastIdx, locked: true };
    const next = advanceScene(atEndLocked, data);
    expect(next.monthIndex).toBe(1);
    expect(next.sceneNodeIndex).toBe(0);
    expect(next.locked).toBe(false);
  });
});

describe("runtime.nextMonth", () => {
  it("does nothing until the month is locked", () => {
    const s = makeTestState("2023");
    expect(nextMonth(s)).toBe(s);
  });

  it("rolls over the month, resets cursor and lock, restores default focus", () => {
    const s = { ...makeTestState("2023"), locked: true, monthIndex: 2, focusId: "self_care" };
    const next = nextMonth(s);
    expect(next.monthIndex).toBe(3);
    expect(next.sceneNodeIndex).toBe(0);
    expect(next.locked).toBe(false);
    expect(next.focusId).toBe("deep_research");
  });

  it("restarts a fresh game when already finished", () => {
    const s = { ...makeTestState("2023"), finished: true, locked: true, monthIndex: 11 };
    const next = nextMonth(s);
    expect(next.monthIndex).toBe(0);
    expect(next.finished).toBe(false);
  });
});
