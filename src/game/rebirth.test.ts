import { describe, expect, it } from "vitest";
import type { ResearchDecision, RoundResult } from "../types";
import { createInitialState } from "./runtime";
import {
  completeRebirthCycle,
  createRebirthMeta,
  decisionOptionsForRebirth,
  investigationNodeViews,
  performInvestigation,
  prepareDecisionForRebirth,
  readRebirthMeta,
  persistRebirthMeta,
} from "./rebirth";

const BASE_DECISION: ResearchDecision = {
  id: "test-fundamental",
  label: "测试研究方案",
  category: "deep_research",
  method: "fundamental_research",
  quality: "sound",
  outcomeAlignment: "supports",
  description: "用于验证调查线索如何进入结算。",
  effects: {
    researchCredibility: 5,
    committeeAdoption: 3,
    portfolioNav: 0,
    viewAccuracy: 3,
    clientFeedback: 2,
    teamTrust: 2,
    fatigue: 5,
    lifeBalance: -2,
    characterRelations: [{ characterId: "lin_ruoning", value: 2 }],
  },
  evidenceLevel: 10,
  clarityLevel: 10,
  riskAwareness: 8,
  reflectionValue: 5,
};

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function finishWithParachutedResult() {
  const state = createInitialState("2025");
  const result = {
    selected: BASE_DECISION,
    isParachuted: true,
    score: { reasoningScore: 10 },
  } as unknown as RoundResult;
  return {
    ...state,
    finished: true,
    fatigue: 76,
    relations: { ...state.relations, zhao_chengyu: 45 },
    methodCounts: { ...state.methodCounts, quantitative_research: 3 },
    history: [result],
  };
}

describe("重生元状态", () => {
  it("为 2025 第一周目建立六个时间块的调查关卡", () => {
    const meta = createRebirthMeta("2025");
    const state = createInitialState("2025");

    expect(meta.cycle).toBe(1);
    expect(meta.investigation?.timeBudget).toBe(6);
    expect(investigationNodeViews(meta, state).some((node) => node.id === "public_materials")).toBe(true);
    expect(investigationNodeViews(meta, state).find((node) => node.id === "unit_economics")?.lockedReason)
      .toContain("因果缺口");
  });

  it("按前置条件消耗时间并把调查效果写回本周目状态", () => {
    const state = createInitialState("2025");
    const meta = createRebirthMeta("2025");
    const publicResult = performInvestigation(meta, state, "public_materials");
    const modelResult = performInvestigation(publicResult.meta, publicResult.state, "financial_model");

    expect(publicResult.changed).toBe(true);
    expect(modelResult.changed).toBe(true);
    expect(modelResult.meta.investigation?.timeSpent).toBe(3);
    expect(modelResult.meta.investigation?.clueIds).toContain("margin_gap");
    expect(modelResult.state.researchCredibility).toBe(state.researchCredibility + 2);
    expect(modelResult.state.fatigue).toBe(state.fatigue + 2);
  });

  it("调查线索提高相符方法的证据评分，休息降低提交疲劳", () => {
    const state = createInitialState("2025");
    let meta = createRebirthMeta("2025");
    let nextState = state;
    for (const nodeId of ["public_materials", "financial_model", "risk_review", "rest"] as const) {
      const result = performInvestigation(meta, nextState, nodeId);
      meta = result.meta;
      nextState = result.state;
    }
    const prepared = prepareDecisionForRebirth(meta, nextState, BASE_DECISION);

    expect(prepared.evidenceLevel).toBeGreaterThan(BASE_DECISION.evidenceLevel);
    expect(prepared.clarityLevel).toBeGreaterThan(BASE_DECISION.clarityLevel);
    expect(prepared.riskAwareness).toBeGreaterThan(BASE_DECISION.riskAwareness);
    expect(prepared.effects.fatigue).toBe(BASE_DECISION.effects.fatigue - 2);
  });

  it("结局把失败、关系和方法转成下一周目的钥匙与捷径", () => {
    const meta = completeRebirthCycle(createRebirthMeta("2025"), finishWithParachutedResult());

    expect(meta.cycle).toBe(2);
    expect(meta.memoryKeys).toContain("causal_gap");
    expect(meta.memoryKeys).toContain("sample_pollution");
    expect(meta.memoryKeys).toContain("body_memory");
    expect(meta.shortcuts).toContain("zhao_factor_pipeline");
    expect(meta.contradictions).toContain("memory_source_mismatch");
    expect(meta.completedCycles).toHaveLength(1);
  });

  it("因果缺口钥匙解锁单位经济性调查和额外研究方案", () => {
    let meta = completeRebirthCycle(createRebirthMeta("2025"), finishWithParachutedResult());
    let state = createInitialState("2025");
    for (const nodeId of ["public_materials", "financial_model", "unit_economics"] as const) {
      const result = performInvestigation(meta, state, nodeId);
      meta = result.meta;
      state = result.state;
    }

    const decisions = decisionOptionsForRebirth(meta, state, [BASE_DECISION]);
    expect(meta.investigation?.completedNodeIds).toContain("unit_economics");
    expect(decisions.some((decision) => decision.id === "2025jan-unit-economics-plan")).toBe(true);
  });

  it("独立保存重生状态，不依赖当前周目存档格式", () => {
    const storage = new MemoryStorage();
    const saved = completeRebirthCycle(createRebirthMeta("2025"), finishWithParachutedResult());
    persistRebirthMeta(storage, saved);

    const restored = readRebirthMeta(storage, "2025");
    expect(restored.cycle).toBe(2);
    expect(restored.memoryKeys).toEqual(saved.memoryKeys);
    expect(restored.shortcuts).toEqual(saved.shortcuts);
  });
});
