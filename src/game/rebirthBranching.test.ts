import { describe, expect, it } from "vitest";
import { buildMonthScene } from "./content";
import { evaluateBranchCondition } from "./branching";
import { createInitialState } from "./runtime";

describe("跨周目分支条件", () => {
  it("cycle 条件读取独立元状态", () => {
    const state = createInitialState("2025");
    expect(evaluateBranchCondition(
      { kind: "cycle", gte: 2 },
      state,
      { cycle: 1, memoryKeys: [] },
    )).toBe(false);
    expect(evaluateBranchCondition(
      { kind: "cycle", gte: 2 },
      state,
      { cycle: 2, memoryKeys: [] },
    )).toBe(true);
  });

  it("memoryKey 条件不会退化成普通剧情旗标", () => {
    const state = {
      ...createInitialState("2025"),
      flags: { year_2025: true, causal_gap: true },
    };
    expect(evaluateBranchCondition(
      { kind: "memoryKey", key: "causal_gap" },
      state,
      { cycle: 2, memoryKeys: [] },
    )).toBe(false);
    expect(evaluateBranchCondition(
      { kind: "memoryKey", key: "causal_gap" },
      state,
      { cycle: 2, memoryKeys: ["causal_gap"] },
    )).toBe(true);
  });

  it("四月第二周目把事后正确审计对白注入正式场景", () => {
    const state = { ...createInitialState("2025"), monthIndex: 3 };
    const firstCycle = buildMonthScene(3, "2025", state, {
      cycle: 1,
      memoryKeys: [],
    });
    const secondCycle = buildMonthScene(3, "2025", state, {
      cycle: 2,
      memoryKeys: ["causal_gap"],
    });

    expect(firstCycle.nodes.some((node) => node.id === "rebirth-apr-hindsight-node"))
      .toBe(false);
    expect(secondCycle.nodes.some((node) => node.id === "rebirth-apr-hindsight-node"))
      .toBe(true);
  });

  it("十二月真相对白要求因果缺口和样本污染同时存在", () => {
    const state = { ...createInitialState("2025"), monthIndex: 11 };
    const partial = buildMonthScene(11, "2025", state, {
      cycle: 2,
      memoryKeys: ["causal_gap"],
    });
    const complete = buildMonthScene(11, "2025", state, {
      cycle: 2,
      memoryKeys: ["causal_gap", "sample_pollution"],
    });

    expect(partial.nodes.some((node) => node.id === "rebirth-dec-truth-node"))
      .toBe(false);
    expect(complete.nodes.some((node) => node.id === "rebirth-dec-truth-node"))
      .toBe(true);
  });
});
