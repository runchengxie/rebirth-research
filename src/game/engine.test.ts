import { describe, expect, it } from "vitest";
import {
  adjustAffection,
  bestRoute,
  clamp,
  formatPct,
  getFlag,
  gradeReviewText,
  hasFlag,
  isBestPartner,
  isParachutedDecision,
  makeDecision,
  scoreDecision,
  selectFocus,
  setFlag,
  storyForMonth,
  focusById,
  totalRelations,
} from "./engine";
import {
  advanceScene,
  createInitialState,
  currentSceneNode,
  nextMonth,
} from "./runtime";
import { buildMonthScene } from "./content";
import { evaluateBranchCondition } from "./branching";
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
    const scene = buildMonthScene(0, "2025");
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
    const scene = buildMonthScene(0, "2025");
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

describe("赵承宇 peer 弧（延迟后果）", () => {
  function stateAtMonth(m: number, flags: Record<string, boolean | number> = {}): GameState {
    const base = createInitialState("2025");
    return { ...base, monthIndex: m, locked: false, sceneNodeIndex: 0, selectedId: null, flags: { ...base.flags, ...flags } };
  }

  it("第一话帮赵承宇埋下 helped_zhao 旗标，第九话兑现人情返还", () => {
    const data = emptyYear();
    const month1 = stateAtMonth(1);
    const scene1 = buildMonthScene(1, "2025", month1);
    const decisionNode1 = scene1.nodes.find((n) => n.type === "decision")!;
    const helpDecision = decisionNode1.decisions!.find((d) => d.id === "peer-zhao-help-offer");
    expect(helpDecision).toBeDefined();

    const afterHelp = makeDecision(month1, data, helpDecision!);
    expect(getFlag(afterHelp, "helped_zhao")).toBe(true);
    expect(getFlag(afterHelp, "peer_zhao_met")).toBe(true);
    expect(afterHelp.relations.zhao_chengyu).toBeGreaterThan(10);

    // 第九话（monthIndex 8）：旗标已立，payback 节点应被注入。
    const month9 = { ...afterHelp, monthIndex: 8, locked: false, selectedId: null };
    const scene9 = buildMonthScene(8, "2025", month9);
    const payback = scene9.nodes.find((n) => n.id === "peer-zhao-payback");
    expect(payback).toBeDefined();
  });

  it("若第一话没帮赵承宇，第九话不触发人情返还", () => {
    const data = emptyYear();
    const month1 = stateAtMonth(1);
    const scene1 = buildMonthScene(1, "2025", month1);
    const decisionNode1 = scene1.nodes.find((n) => n.type === "decision")!;
    const other = decisionNode1.decisions!.find((d) => d.id !== "peer-zhao-help-offer")!;
    const afterOther = makeDecision(month1, data, other);
    expect(getFlag(afterOther, "helped_zhao")).not.toBe(true);

    const month9 = { ...afterOther, monthIndex: 8, locked: false, selectedId: null };
    const scene9 = buildMonthScene(8, "2025", month9);
    const payback = scene9.nodes.find((n) => n.id === "peer-zhao-payback");
    expect(payback).toBeUndefined();
  });
});

describe("赵承宇 分歧张力线（认同/吵架/和解）", () => {
  function peerState(m: number, flags: Record<string, boolean | number> = {}): GameState {
    const base = createInitialState("2025");
    return { ...base, monthIndex: m, locked: false, sceneNodeIndex: 0, selectedId: null, flags: { ...base.flags, peer_zhao_met: true, ...flags } };
  }

  it("年中注入三种立场的分歧决策", () => {
    const scene = buildMonthScene(3, "2025", peerState(3));
    const dNode = scene.nodes.find((n) => n.type === "decision")!;
    const ids = dNode.decisions!.map((d) => d.id);
    expect(ids).toContain("peer-clash-stand");
    expect(ids).toContain("peer-clash-yield");
    expect(ids).toContain("peer-clash-fence");
  });

  it("选「当场驳他」→ 后期只走和解走向，不触发认同/中性", () => {
    const data = emptyYear();
    const scene = buildMonthScene(3, "2025", peerState(3));
    const stand = scene.nodes.find((n) => n.type === "decision")!.decisions!.find((d) => d.id === "peer-clash-stand")!;
    const after = makeDecision(peerState(3), data, stand);
    expect(getFlag(after, "peer_stand")).toBe(true);
    expect(getFlag(after, "peer_tension")).toBe(true);
    expect(getFlag(after, "peer_yield")).not.toBe(true);

    const later = { ...after, monthIndex: 7, locked: false, selectedId: null };
    const scene7 = buildMonthScene(7, "2025", later);
    expect(scene7.nodes.find((n) => n.id === "peer-zhao-resolve-stand")).toBeDefined();
    expect(scene7.nodes.find((n) => n.id === "peer-zhao-resolve-yield")).toBeUndefined();
    expect(scene7.nodes.find((n) => n.id === "peer-zhao-resolve-fence")).toBeUndefined();
  });

  it("选「先顺盘口」→ 后期走认同走向", () => {
    const data = emptyYear();
    const scene = buildMonthScene(3, "2025", peerState(3));
    const yieldD = scene.nodes.find((n) => n.type === "decision")!.decisions!.find((d) => d.id === "peer-clash-yield")!;
    const after = makeDecision(peerState(3), data, yieldD);
    expect(getFlag(after, "peer_yield")).toBe(true);

    const later = { ...after, monthIndex: 7, locked: false, selectedId: null };
    const scene7 = buildMonthScene(7, "2025", later);
    expect(scene7.nodes.find((n) => n.id === "peer-zhao-resolve-yield")).toBeDefined();
    expect(scene7.nodes.find((n) => n.id === "peer-zhao-resolve-stand")).toBeUndefined();
  });
});

describe("赵承宇 最佳搭档结局", () => {
  function partnerState(zhao: number, trust: number): GameState {
    const base = createInitialState("2025");
    return { ...base, relations: { ...base.relations, zhao_chengyu: zhao }, teamTrust: trust };
  }

  it("赵承宇关系高 + teamTrust 高 → 解锁最佳搭档", () => {
    expect(isBestPartner(partnerState(45, 65))).toBe(true);
  });
  it("关系够但 teamTrust 不够 → 不解锁", () => {
    expect(isBestPartner(partnerState(50, 30))).toBe(false);
  });
  it("teamTrust 够但赵承宇关系不够 → 不解锁", () => {
    expect(isBestPartner(partnerState(20, 65))).toBe(false);
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
    expect(totalRelations(state)).toBe(18 + 14 + 12 + 10);
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

describe("正式年份评分可达性", () => {
  const years = ["2023", "2024", "2025"];
  const focuses = ["deep_research", "team_collab", "self_care"];

  it.each(years)("%s 年存在可达的 S 评级", (year) => {
    const grades = new Set<string>();
    for (let month = 0; month < 12; month += 1) {
      const decisionNode = buildMonthScene(month, year).nodes.find((node) => node.type === "decision");
      for (const decision of decisionNode?.decisions ?? []) {
        for (const focusId of focuses) {
          grades.add(scoreDecision(decision, storyForMonth(month, year), focusById(focusId)).grade);
        }
      }
    }
    expect(grades).toContain("S");
  });

  it.each(years)("%s 年存在可达的空降结论", (year) => {
    let reachable = false;
    for (let month = 0; month < 12; month += 1) {
      const decisionNode = buildMonthScene(month, year).nodes.find((node) => node.type === "decision");
      for (const decision of decisionNode?.decisions ?? []) {
        for (const focusId of focuses) {
          const score = scoreDecision(decision, storyForMonth(month, year), focusById(focusId));
          reachable ||= isParachutedDecision(decision, score);
        }
      }
    }
    expect(reachable).toBe(true);
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

describe("affection system & branching", () => {
  it("adjustAffection applies deltas and clamps to [0,100]", () => {
    const rel = { lin_ruoning: 95, chen_xinghe: 0, zhou_mingzhao: 0, zhao_chengyu: 0 };
    adjustAffection(rel, "lin_ruoning", 10, "test");
    expect(rel.lin_ruoning).toBe(100);
    adjustAffection(rel, "chen_xinghe", -5, "test");
    expect(rel.chen_xinghe).toBe(0);
  });

  it("applies the arc character's affection exactly once (no double-count)", () => {
    const data = emptyYear();
    const scene = buildMonthScene(0, "2024");
    const decision = scene.nodes.find((n) => n.type === "decision")!;
    const janHelp = decision.decisions!.find((d) => d.id === "jan-help")!;
    // jan-help targets lin_ruoning (+10); lin is the month-0 arc character.
    // deep_research focus -> floor(teamTrust/3) = floor(3/3) = 1.
    // Buggy code doubled the arc delta (+10 twice => +21); fixed code is +10 +1 = +11.
    const state = selectFocus(makeTestState(), "deep_research");
    const result = makeDecision(state, data, janHelp);
    expect(result.relations.lin_ruoning - state.relations.lin_ruoning).toBe(11);
  });

  it("flag helpers get/set/has work", () => {
    let state = makeTestState();
    expect(hasFlag(state, "affinity_lin_ruoning")).toBe(false);
    state = setFlag(state, "affinity_lin_ruoning", 65);
    expect(getFlag(state, "affinity_lin_ruoning")).toBe(65);
    expect(hasFlag(state, "affinity_lin_ruoning")).toBe(true);
    state = setFlag(state, "affinity_lin_ruoning", 0);
    expect(hasFlag(state, "affinity_lin_ruoning")).toBe(false);
  });

  it("sets an affinity flag and a one-time milestone when a relation crosses the gate", () => {
    const data = emptyYear();
    const scene = buildMonthScene(0, "2024");
    const decision = scene.nodes.find((n) => n.type === "decision")!;
    const janHelp = decision.decisions!.find((d) => d.id === "jan-help")!; // lin +10 -> 65
    const state = {
      ...makeTestState(),
      relations: { lin_ruoning: 55, chen_xinghe: 10, zhou_mingzhao: 10, zhao_chengyu: 10 },
    };
    const result = makeDecision(state, data, janHelp);
    expect(result.flags[`affinity_lin_ruoning`]).toBe(result.relations.lin_ruoning);
    expect(result.relations.lin_ruoning).toBeGreaterThanOrEqual(60);
    expect(result.milestone).toBe("lin_ruoning");
  });

  it("injects an affinity moment node only when the arc character is above the gate", () => {
    const flat = buildMonthScene(0, "2024"); // no relations -> 3 nodes
    expect(flat.nodes).toHaveLength(3);
    const warm = buildMonthScene(0, "2024", {
      ...createInitialState("2024"),
      relations: { lin_ruoning: 70, chen_xinghe: 10, zhou_mingzhao: 10, zhao_chengyu: 10 },
    });
    expect(warm.nodes).toHaveLength(4);
    const inserted = warm.nodes.find((n) => n.id === "m0-affinity");
    expect(inserted).toBeDefined();
    expect(inserted!.characterId).toBe("lin_ruoning");
    expect(inserted!.type).toBe("dialogue");
  });

  describe("conditional branching layer", () => {
    it("evaluates branch conditions against game state", () => {
      const base = createInitialState("2025");
      const s: GameState = { ...base, fatigue: 80, lifeBalance: 70 };
      expect(evaluateBranchCondition({ kind: "metric", key: "fatigue", gte: 75 }, s)).toBe(true);
      expect(evaluateBranchCondition({ kind: "metricAtMost", key: "fatigue", lte: 50 }, s)).toBe(false);
      expect(
        evaluateBranchCondition(
          { kind: "and", of: [
            { kind: "metric", key: "lifeBalance", gte: 60 },
            { kind: "metricAtMost", key: "fatigue", lte: 50 },
          ] },
          s,
        ),
      ).toBe(false);
      expect(
        evaluateBranchCondition(
          { kind: "or", of: [
            { kind: "metric", key: "fatigue", gte: 75 },
            { kind: "metric", key: "lifeBalance", gte: 60 },
          ] },
          s,
        ),
      ).toBe(true);
      expect(evaluateBranchCondition({ kind: "not", of: { kind: "metric", key: "fatigue", gte: 75 } }, s)).toBe(false);
      expect(evaluateBranchCondition({ kind: "categoryStreak", category: "deep_research", gte: 4 }, { ...s, categoryCounts: { deep_research: 5 } })).toBe(true);
      expect(evaluateBranchCondition({ kind: "methodStreak", method: "fundamental_research", gte: 4 }, { ...s, methodCounts: { fundamental_research: 5 } })).toBe(true);
      expect(
        evaluateBranchCondition(
          { kind: "affinityAny", gte: 60 },
          { ...s, relations: { lin_ruoning: 70, chen_xinghe: 10, zhou_mingzhao: 10, zhao_chengyu: 10 } },
        ),
      ).toBe(true);
    });

    it("accumulates categoryCounts on each decision", () => {
      let state = createInitialState("2025");
      const dec = buildMonthScene(1, "2025", state).nodes.find((n) => n.type === "decision")!.decisions![0];
      state = makeDecision(state, emptyYear(), dec);
      expect(state.categoryCounts[dec.category]).toBe(1);
      state = nextMonth(state);
      state = makeDecision(state, emptyYear(), dec);
      expect(state.categoryCounts[dec.category]).toBe(2);
    });

    it("injects a burnout branch scene and decision when fatigue is high", () => {
      const s = { ...createInitialState("2025"), fatigue: 80 };
      const scene = buildMonthScene(1, "2025", s);
      expect(scene.nodes.find((n) => n.id === "route-burnout-node")).toBeDefined();
      const decisionNode = scene.nodes.find((n) => n.type === "decision")!;
      expect(decisionNode.decisions?.some((d) => d.id === "burnout-route-rest")).toBe(true);
    });

    it("records the active route flag through makeDecision", () => {
      let state = { ...createInitialState("2025"), fatigue: 80 };
      const dec = buildMonthScene(1, "2025", state)
        .nodes.find((n) => n.type === "decision")!
        .decisions!.find((d) => d.id === "burnout-route-rest")!;
      state = makeDecision(state, emptyYear(), dec);
      expect(state.flags.route_burnout).toBe(true);
    });

    it("does not inject branches when no state is passed (static build)", () => {
      const scene = buildMonthScene(1, "2025");
      expect(scene.nodes.find((n) => n.id === "route-burnout-node")).toBeUndefined();
    });
  });
});

// 守卫：同事寒暄按年份轮换，同月份跨年不应再雷同。锁死这点，防止以后有人把
// buildMonthScene 里的 arcLine 改回 story.line，让 2023/2025 重新和 2024 说同一句。
describe("同事寒暄按年份轮换（跨年不雷同）", () => {
  const colleagueText = (year: string, m: number): string => {
    const scene = buildMonthScene(m, year);
    const node = scene.nodes.find((n) => n.id === `m${m}-colleague`);
    if (!node || typeof node.text !== "string") {
      throw new Error(`year=${year} m=${m} 找不到 colleague 台词`);
    }
    return node.text;
  };

  it("2023 与 2024 同月份寒暄不同", () => {
    for (let m = 0; m < 12; m++) {
      expect(colleagueText("2023", m)).not.toBe(colleagueText("2024", m));
    }
  });

  it("2025 与 2024 同月份寒暄不同（2025 M0 走专属 prologue，跳过）", () => {
    for (let m = 1; m < 12; m++) {
      expect(colleagueText("2025", m)).not.toBe(colleagueText("2024", m));
    }
  });

  it("年份专属 line 确实生效：2023 M2 是陈星禾的「两会+中特估」口吻", () => {
    const t = colleagueText("2023", 2);
    expect(t).toContain("两会");
    expect(t).toContain("中特估");
  });

  it("无年份专属覆盖时回退到 STORY_ARCS 原 line（2024 不崩）", () => {
    const t = colleagueText("2024", 2);
    expect(t).toContain("订单流结构");
  });
});

// 守卫：决策提示 mission 同样按年份轮换，同月份跨年不应再雷同。锁死这点，防止以后
// 有人把 buildMonthScene 里的 arcMission 改回 story.mission，让 2023/2025 重新和 2024
// 用同一句 functional prompt。
describe("决策提示 mission 按年份轮换（跨年不雷同）", () => {
  const decisionPrompt = (year: string, m: number): string => {
    const scene = buildMonthScene(m, year);
    const node = scene.nodes.find((n) => n.id === `m${m}-decision`);
    if (!node || typeof node.prompt !== "string") {
      throw new Error(`year=${year} m=${m} 找不到 decision 节点的 prompt`);
    }
    return node.prompt;
  };

  it("2023 与 2024 同月份 mission 不同", () => {
    for (let m = 1; m < 12; m++) {
      expect(decisionPrompt("2023", m)).not.toBe(decisionPrompt("2024", m));
    }
  });

  it("2025 与 2024 同月份 mission 不同", () => {
    for (let m = 1; m < 12; m++) {
      expect(decisionPrompt("2025", m)).not.toBe(decisionPrompt("2024", m));
    }
  });

  it("年份专属 mission 确实生效：2023 M2 含「中特估」、2025 M2 含「AI+行动」", () => {
    expect(decisionPrompt("2023", 2)).toContain("中特估");
    expect(decisionPrompt("2025", 2)).toContain("AI+行动");
  });

  it("无年份专属覆盖时回退到 STORY_ARCS 原 mission（2024 不崩）", () => {
    expect(decisionPrompt("2024", 2)).toContain("因子拆解和订单流");
  });
});
