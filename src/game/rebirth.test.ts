import { describe, expect, it } from "vitest";
import type { GameState, ResearchDecision, RoundResult } from "../types";
import { createInitialState } from "./runtime";
import {
  LEGACY_REBIRTH_META_KEY_PREFIX,
  REBIRTH_META_KEY_PREFIX,
  completeRebirthCycle,
  createRebirthMeta,
  currentInvestigation,
  decisionOptionsForRebirth,
  investigationNodeViews,
  performInvestigation,
  persistRebirthMeta,
  prepareDecisionForRebirth,
  readRebirthMeta,
  type RebirthMetaState,
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

function stateAtMonth(monthIndex: number) {
  return { ...createInitialState("2025"), monthIndex };
}

describe("重生元状态", () => {
  it("为一月建立六个时间块，并保留钥匙前置条件", () => {
    const meta = createRebirthMeta("2025");
    const state = createInitialState("2025");

    expect(meta.cycle).toBe(1);
    expect(currentInvestigation(meta, state)?.timeBudget).toBe(6);
    expect(investigationNodeViews(meta, state).some((node) => node.id === "public_materials"))
      .toBe(true);
    expect(investigationNodeViews(meta, state)
      .find((node) => node.id === "unit_economics")?.lockedReason)
      .toContain("因果缺口");
  });

  it("按月份独立保存调查进度和即时效果", () => {
    const state = createInitialState("2025");
    const meta = createRebirthMeta("2025");
    const publicResult = performInvestigation(meta, state, "public_materials");
    const modelResult = performInvestigation(
      publicResult.meta,
      publicResult.state,
      "financial_model",
    );

    expect(modelResult.changed).toBe(true);
    expect(modelResult.meta.investigations["2025-01"]?.timeSpent).toBe(3);
    expect(modelResult.meta.investigations["2025-01"]?.clueIds).toContain("margin_gap");
    expect(modelResult.state.researchCredibility).toBe(state.researchCredibility + 2);
    expect(modelResult.state.fatigue).toBe(state.fatigue + 2);
  });

  it("调查线索提高相符方法评分，休息降低提交疲劳", () => {
    let state = createInitialState("2025");
    let meta = createRebirthMeta("2025");
    for (const nodeId of ["public_materials", "financial_model", "risk_review", "rest"]) {
      const result = performInvestigation(meta, state, nodeId);
      meta = result.meta;
      state = result.state;
    }
    const prepared = prepareDecisionForRebirth(meta, state, BASE_DECISION);

    expect(prepared.evidenceLevel).toBeGreaterThan(BASE_DECISION.evidenceLevel);
    expect(prepared.clarityLevel).toBeGreaterThan(BASE_DECISION.clarityLevel);
    expect(prepared.riskAwareness).toBeGreaterThan(BASE_DECISION.riskAwareness);
    expect(prepared.effects.fatigue).toBe(BASE_DECISION.effects.fatigue - 2);
  });

  it("结局把失败、关系和方法转成下一周目的钥匙与捷径", () => {
    const meta = completeRebirthCycle(
      createRebirthMeta("2025"),
      finishWithParachutedResult(),
    );

    expect(meta.cycle).toBe(2);
    expect(meta.memoryKeys).toContain("causal_gap");
    expect(meta.memoryKeys).toContain("sample_pollution");
    expect(meta.memoryKeys).toContain("body_memory");
    expect(meta.shortcuts).toContain("zhao_factor_pipeline");
    expect(meta.contradictions).toContain("memory_source_mismatch");
    expect(meta.completedCycles).toHaveLength(1);
  });

  it("四月用因果缺口解锁事后正确审计和专属方案", () => {
    let state = stateAtMonth(3);
    let meta: RebirthMetaState = {
      ...createRebirthMeta("2025"),
      cycle: 2,
      memoryKeys: ["causal_gap"],
    };
    for (const nodeId of [
      "apr_earnings_scan",
      "apr_margin_retention",
      "apr_hindsight_audit",
    ]) {
      const result = performInvestigation(meta, state, nodeId);
      meta = result.meta;
      state = result.state;
    }

    const decisions = decisionOptionsForRebirth(meta, state, [BASE_DECISION]);
    expect(currentInvestigation(meta, state)?.completedNodeIds)
      .toContain("apr_hindsight_audit");
    expect(decisions.some((decision) => decision.id === "2025apr-rebuild-evidence"))
      .toBe(true);
  });

  it("七月需要回测捷径才能在预算内拼出失败样本与再平衡路线", () => {
    let state = stateAtMonth(6);
    let meta: RebirthMetaState = {
      ...createRebirthMeta("2025"),
      cycle: 2,
      memoryKeys: ["sample_pollution", "opportunity_cost"],
      shortcuts: ["zhao_factor_pipeline"],
    };
    for (const nodeId of [
      "jul_segment_margins",
      "jul_flow_split",
      "jul_chain_heatmap",
      "jul_failure_sample",
      "jul_rebalance",
    ]) {
      const result = performInvestigation(meta, state, nodeId);
      expect(result.changed).toBe(true);
      meta = result.meta;
      state = result.state;
    }

    expect(currentInvestigation(meta, state)?.timeSpent).toBe(5);
    expect(decisionOptionsForRebirth(meta, state, [BASE_DECISION])
      .some((decision) => decision.id === "2025jul-hybrid-rebalance"))
      .toBe(true);
  });

  it("九月把过去关系积累转成闭门数据权限", () => {
    const state = stateAtMonth(8);
    const withoutShortcut = createRebirthMeta("2025");
    const locked = investigationNodeViews(withoutShortcut, state)
      .find((node) => node.id === "sep_closed_door_access");
    expect(locked?.lockedReason).toContain("自动回测管线");

    const withShortcut: RebirthMetaState = {
      ...withoutShortcut,
      shortcuts: ["zhao_factor_pipeline"],
    };
    const available = investigationNodeViews(withShortcut, state)
      .find((node) => node.id === "sep_closed_door_access");
    expect(available?.cost).toBe(0);
    expect(available?.lockedReason).toBeNull();
  });

  it("十二月真相路线要求档案、双钥匙和可持续边界共同完成", () => {
    let state: GameState = {
      ...stateAtMonth(11),
      flags: { year_2025: true, office_archive_reviewed: true },
    };
    let meta: RebirthMetaState = {
      ...createRebirthMeta("2025"),
      cycle: 2,
      memoryKeys: ["causal_gap", "sample_pollution", "body_memory"],
    };
    for (const nodeId of [
      "dec_archive_audit",
      "dec_compare_memory",
      "dec_replay_failures",
      "dec_boundary_review",
      "dec_truth_synthesis",
    ]) {
      const result = performInvestigation(meta, state, nodeId);
      expect(result.changed).toBe(true);
      meta = result.meta;
      state = result.state;
    }

    expect(currentInvestigation(meta, state)?.timeSpent).toBe(6);
    expect(decisionOptionsForRebirth(meta, state, [BASE_DECISION])
      .some((decision) => decision.id === "2025dec-truth-audit"))
      .toBe(true);
  });

  it("读取 v1 单月存档时自动迁移到按月份保存的 v2 结构", () => {
    const storage = new MemoryStorage();
    storage.setItem(`${LEGACY_REBIRTH_META_KEY_PREFIX}2025`, JSON.stringify({
      version: 1,
      year: "2025",
      cycle: 2,
      memoryKeys: ["causal_gap"],
      shortcuts: [],
      contradictions: [],
      seenEndingIds: [],
      completedCycles: [],
      lastCycleUnlocks: [],
      investigation: {
        monthKey: "2025-01",
        timeBudget: 6,
        timeSpent: 1,
        completedNodeIds: ["public_materials"],
        clueIds: ["cost_drop"],
      },
    }));

    const restored = readRebirthMeta(storage, "2025");
    expect(restored.version).toBe(3);
    expect(restored.investigations["2025-01"]?.completedNodeIds)
      .toEqual(["public_materials"]);
  });

  it("持久化使用 v3 键并保留跨周目状态", () => {
    const storage = new MemoryStorage();
    const saved = completeRebirthCycle(
      createRebirthMeta("2025"),
      finishWithParachutedResult(),
    );
    persistRebirthMeta(storage, saved);

    expect(storage.getItem(`${REBIRTH_META_KEY_PREFIX}2025`)).not.toBeNull();
    const restored = readRebirthMeta(storage, "2025");
    expect(restored.cycle).toBe(2);
    expect(restored.memoryKeys).toEqual(saved.memoryKeys);
    expect(restored.shortcuts).toEqual(saved.shortcuts);
  });
});
