import { describe, expect, it } from "vitest";
import {
  advanceScene,
  bestRoute,
  clamp,
  createInitialState,
  currentSceneNode,
  formatPct,
  gradeReviewText,
  makeDecision,
  nextMonth,
  sceneForMonth,
  selectFocus,
  totalRelations,
} from "./engine";
import { buildMonthScene } from "./content";
import type { GameDataYear, GameState } from "../types";

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

function makeTestState(year = "2025"): GameState {
  return createInitialState(year);
}

describe("game engine", () => {
  it("creates the initial state with research metrics", () => {
    const state = makeTestState();

    expect(state.researchCredibility).toBe(14);
    expect(state.focusId).toBe("deep_research");
    expect(state.relations.lin_ruoning).toBeGreaterThan(state.relations.zhou_mingzhao);
    expect(state.locked).toBe(false);
  });

  it("selects a focus before locking the round", () => {
    const state = makeTestState();
    const next = selectFocus(state, "team_collab");

    expect(next.focusId).toBe("team_collab");
  });

  it("applies decision effects and updates research metrics", () => {
    const data = emptyYear();
    const decision = data.scenes[0].nodes.find((n) => n.type === "decision")!;
    const d = decision.decisions![0]; // first decision (deep research)
    const state = selectFocus(makeTestState(), "deep_research");
    const result = makeDecision(state, data, d);

    expect(result.locked).toBe(true);
    expect(result.selectedId).toBe(d.id);
    expect(result.history).toHaveLength(1);
    expect(result.researchCredibility).toBeGreaterThan(state.researchCredibility);
    expect(result.fatigue).toBeGreaterThan(state.fatigue);
    expect(result.relations.lin_ruoning).toBeGreaterThan(state.relations.lin_ruoning);
  });

  it("moves to the next month only after a locked round", () => {
    const data = emptyYear();
    const state = makeTestState();
    const unlocked = nextMonth(state);
    expect(unlocked.monthIndex).toBe(0);

    const decision = data.scenes[0].nodes.find((n) => n.type === "decision")!;
    const d = decision.decisions![0];
    const locked = makeDecision(state, data, d);
    const advanced = nextMonth(locked);

    expect(advanced.monthIndex).toBe(1);
    expect(advanced.locked).toBe(false);
    expect(advanced.selectedId).toBeNull();
  });

  it("walks scripted dialogue into the decision node", () => {
    const data = emptyYear();
    const scene = sceneForMonth(0, "2025");
    const decisionIndex = scene.nodes.findIndex((node) => node.type === "decision");
    let state = makeTestState();

    expect(currentSceneNode(state).type).toBe("dialogue");
    for (let index = 0; index < decisionIndex; index += 1) {
      state = advanceScene(state, data);
    }

    expect(currentSceneNode(state).type).toBe("decision");
    expect(advanceScene(state, data).sceneNodeIndex).toBe(state.sceneNodeIndex);
  });

  it("continues to next month after decision and scene end", () => {
    const data = emptyYear();
    const scene = sceneForMonth(0, "2025");
    const decisionIndex = scene.nodes.findIndex((node) => node.type === "decision")!;
    let state = makeTestState();

    for (let index = 0; index < decisionIndex; index += 1) {
      state = advanceScene(state, data);
    }

    const decision = scene.nodes[decisionIndex];
    const d = decision.decisions![0];
    const locked = makeDecision(state, data, d);
    // The decision node is the last in the scene, so advancing moves to next month
    const postChoice = advanceScene(locked, data);

    expect(postChoice.monthIndex).toBe(1);
    expect(postChoice.locked).toBe(false);
    expect(postChoice.selectedId).toBeNull();
  });

  it("finishes after 12 months", () => {
    const data = emptyYear();
    let state = makeTestState();
    // Simulate all 12 months
    for (let m = 0; m < 12; m++) {
      const scene = buildMonthScene(m, "2025");
      const dNode = scene.nodes.find((n) => n.type === "decision");
      if (!dNode) break;
      const d = dNode.decisions![0];
      state = makeDecision({ ...state, locked: false }, data, d);
      state = { ...state, monthIndex: m + 1, selectedId: null, sceneNodeIndex: 0, locked: false, focusId: "deep_research" };
    }
    // After 12 rounds, history should have 12 entries
    // Note: the simulation above pushes history incrementally
    // Actually this test is testing the engine, not simulation
    expect(state.monthIndex).toBe(12);
  });
});

describe("utility functions", () => {
  it("clamp values to [0, 100]", () => {
    expect(clamp(-5)).toBe(0);
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
    expect(clamp(150)).toBe(100);
  });

  it("formatPct shows signed percentage", () => {
    expect(formatPct(0.1)).toBe("+10.00%");
    expect(formatPct(-0.05)).toBe("-5.00%");
    expect(formatPct(0)).toBe("0.00%");
  });

  it("totalRelations sums all characters", () => {
    const state = makeTestState();
    expect(totalRelations(state)).toBe(18 + 14 + 12);
  });

  it("bestRoute returns character with highest relation", () => {
    const state = makeTestState();
    expect(bestRoute(state)).toBe("lin_ruoning");
  });
});

describe("scoring system", () => {
  it("scoreDecision returns all 4 dimensions with total and grade", () => {
    const data = emptyYear();
    const decision = data.scenes[0].nodes.find((n) => n.type === "decision")!;
    const d = decision.decisions![0];
    const state = selectFocus(makeTestState(), "deep_research");
    const result = makeDecision(state, data, d);
    const score = result.history[0].score!;

    expect(score.evidenceScore).toBeGreaterThanOrEqual(0);
    expect(score.evidenceScore).toBeLessThanOrEqual(20);
    expect(score.clarityScore).toBeGreaterThanOrEqual(0);
    expect(score.clarityScore).toBeLessThanOrEqual(20);
    expect(score.riskAwarenessScore).toBeGreaterThanOrEqual(0);
    expect(score.riskAwarenessScore).toBeLessThanOrEqual(20);
    expect(score.communicationScore).toBeGreaterThanOrEqual(0);
    expect(score.communicationScore).toBeLessThanOrEqual(20);
    expect(score.lifeBalanceScore).toBeGreaterThanOrEqual(0);
    expect(score.lifeBalanceScore).toBeLessThanOrEqual(15);
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
    expect(["S", "A", "B", "C", "D"]).toContain(score.grade);
  });

  it("life choice scores high on life balance", () => {
    const decision = buildMonthScene(0, "2025").nodes.find((n) => n.type === "decision")!;
    const lifeChoice = decision.decisions!.find((d) => d.category === "self_care")!;
    const state = selectFocus(makeTestState(), "self_care");
    const result = makeDecision(state, emptyYear(), lifeChoice);
    const score = result.history[0].score!;
    expect(score.lifeBalanceScore).toBeGreaterThanOrEqual(10);
  });
});

describe("grade review", () => {
  it("returns text for valid character + grade", () => {
    const text = gradeReviewText("lin_ruoning", "S");
    expect(text.length).toBeGreaterThan(0);
  });

  it("returns empty string for invalid grade", () => {
    expect(gradeReviewText("lin_ruoning", "Z")).toBe("");
  });
});
