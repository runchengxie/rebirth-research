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

describe("游戏引擎", () => {
  it("创建包含研究指标的初始状态", () => {
    const state = makeTestState();

    expect(state.researchCredibility).toBe(14);
    expect(state.focusId).toBe("deep_research");
    expect(state.relations.lin_ruoning).toBeGreaterThan(state.relations.zhou_mingzhao);
    expect(state.locked).toBe(false);
  });

  it("在本轮锁定前选择研究方向", () => {
    const state = makeTestState();
    const next = selectFocus(state, "team_collab");

    expect(next.focusId).toBe("team_collab");
  });

  it("应用决策效果并更新研究指标", () => {
    const data = emptyYear();
    const decision = data.scenes[0].nodes.find((n) => n.type === "decision")!;
    const d = decision.decisions![0]; // 第一项方案选择深度研究
    const state = selectFocus(makeTestState(), "deep_research");
    const result = makeDecision(state, data, d);

    expect(result.locked).toBe(true);
    expect(result.selectedId).toBe(d.id);
    expect(result.history).toHaveLength(1);
    expect(result.researchCredibility).toBeGreaterThan(state.researchCredibility);
    expect(result.fatigue).toBeGreaterThan(state.fatigue);
    expect(result.relations.lin_ruoning).toBeGreaterThan(state.relations.lin_ruoning);
  });

  it("仅在本轮决策锁定后进入下个月", () => {
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

  it("按顺序推进剧情对白并停在决策节点", () => {
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

  it("决策完成且场景结束后进入下个月", () => {
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
    // 决策节点位于场景末尾，继续推进会进入下个月。
    const postChoice = advanceScene(locked, data);

    expect(postChoice.monthIndex).toBe(1);
    expect(postChoice.locked).toBe(false);
    expect(postChoice.selectedId).toBeNull();
  });

  it("完成十二个月的决策后结束年度剧情", () => {
    const data = emptyYear();
    let state = makeTestState();

    for (let month = 0; month < 12; month += 1) {
      const scene = buildMonthScene(state.monthIndex, state.year, state);
      const decisionNode = scene.nodes.find((node) => node.type === "decision");
      expect(decisionNode).toBeDefined();
      state = makeDecision(state, data, decisionNode!.decisions![0]);
      if (month < 11) state = nextMonth(state);
    }

    expect(state.monthIndex).toBe(11);
    expect(state.history).toHaveLength(12);
    expect(state.finished).toBe(true);
  });
});

describe("赵承宇同事支线（延迟后果）", () => {
  function stateAtMonth(m: number, flags: Record<string, boolean | number> = {}): GameState {
    const base = createInitialState("2025");
    return { ...base, monthIndex: m, locked: false, sceneNodeIndex: 0, selectedId: null, flags: { ...base.flags, ...flags } };
  }

  it("第一话帮助赵承宇后，第九话兑现人情返还", () => {
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

    // 第九话对应 monthIndex 8。此时已留下帮助记录，应注入人情返还节点。
    const month9 = { ...afterHelp, monthIndex: 8, locked: false, selectedId: null };
    const scene9 = buildMonthScene(8, "2025", month9);
    const payback = scene9.nodes.find((n) => n.id === "peer-zhao-payback");
    expect(payback).toBeDefined();
  });

  it("第一话未帮助赵承宇时，第九话不触发人情返还", () => {
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

describe("赵承宇分歧张力线（认同、争执与和解）", () => {
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

  it("选择当场反驳后，后期只进入和解走向", () => {
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

  it("选择先顺盘口后，后期进入认同走向", () => {
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

describe("赵承宇最佳搭档结局", () => {
  function partnerState(zhao: number, trust: number): GameState {
    const base = createInitialState("2025");
    return { ...base, relations: { ...base.relations, zhao_chengyu: zhao }, teamTrust: trust };
  }

  it("赵承宇关系和团队信任都高时解锁最佳搭档", () => {
    expect(isBestPartner(partnerState(45, 65))).toBe(true);
  });
  it("赵承宇关系足够但团队信任较低时保持锁定", () => {
    expect(isBestPartner(partnerState(50, 30))).toBe(false);
  });
  it("团队信任足够但赵承宇关系较低时保持锁定", () => {
    expect(isBestPartner(partnerState(20, 65))).toBe(false);
  });
});

describe("工具函数", () => {
  it("把数值限制在 0 到 100", () => {
    expect(clamp(-5)).toBe(0);
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
    expect(clamp(150)).toBe(100);
  });

  it("输出带正负号的百分比", () => {
    expect(formatPct(0.1)).toBe("+10.00%");
    expect(formatPct(-0.05)).toBe("-5.00%");
    expect(formatPct(0)).toBe("0.00%");
  });

  it("计算所有角色的关系值总和", () => {
    const state = makeTestState();
    expect(totalRelations(state)).toBe(18 + 14 + 12 + 10);
  });

  it("返回关系值最高的角色", () => {
    const state = makeTestState();
    expect(bestRoute(state)).toBe("lin_ruoning");
  });
});

describe("评分系统", () => {
  it("返回五项评分、总分和等级", () => {
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

  it("生活类选择会得到较高的生活平衡分", () => {
    const decision = buildMonthScene(0, "2025").nodes.find((n) => n.type === "decision")!;
    const lifeChoice = decision.decisions!.find((d) => d.category === "self_care")!;
    const state = selectFocus(makeTestState(), "self_care");
    const result = makeDecision(state, emptyYear(), lifeChoice);
    const score = result.history[0].score!;
    expect(score.lifeBalanceScore).toBeGreaterThanOrEqual(10);
  });
});

describe("完整年份内容的评分可达性", () => {
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

describe("评级评语", () => {
  it("有效角色和评级能得到评语", () => {
    const text = gradeReviewText("lin_ruoning", "S");
    expect(text.length).toBeGreaterThan(0);
  });

  it("无效评级返回空文本", () => {
    expect(gradeReviewText("lin_ruoning", "Z")).toBe("");
  });
});

describe("关系值与分支系统", () => {
  it("应用关系变化量并把结果限制在 0 到 100", () => {
    const rel = { lin_ruoning: 95, chen_xinghe: 0, zhou_mingzhao: 0, zhao_chengyu: 0 };
    adjustAffection(rel, "lin_ruoning", 10, "test");
    expect(rel.lin_ruoning).toBe(100);
    adjustAffection(rel, "chen_xinghe", -5, "test");
    expect(rel.chen_xinghe).toBe(0);
  });

  it("剧情角色的关系值只增加一次", () => {
    const data = emptyYear();
    const scene = buildMonthScene(0, "2024");
    const decision = scene.nodes.find((n) => n.type === "decision")!;
    const janHelp = decision.decisions!.find((d) => d.id === "jan-help")!;
    // jan-help 让林若宁关系值增加 10，她也是首月剧情角色。
    // deep_research 方向贡献 floor(teamTrust / 3)，当前为 floor(3 / 3)，结果是 1。
    // 关系值应增加 10 + 1，共计 11，防止剧情角色的变化量被重复计算。
    const state = selectFocus(makeTestState(), "deep_research");
    const result = makeDecision(state, data, janHelp);
    expect(result.relations.lin_ruoning - state.relations.lin_ruoning).toBe(11);
  });

  it("旗标辅助函数可以读取、设置和判断旗标", () => {
    let state = makeTestState();
    expect(hasFlag(state, "affinity_lin_ruoning")).toBe(false);
    state = setFlag(state, "affinity_lin_ruoning", 65);
    expect(getFlag(state, "affinity_lin_ruoning")).toBe(65);
    expect(hasFlag(state, "affinity_lin_ruoning")).toBe(true);
    state = setFlag(state, "affinity_lin_ruoning", 0);
    expect(hasFlag(state, "affinity_lin_ruoning")).toBe(false);
  });

  it("关系值越过门槛时设置亲密旗标和一次性里程碑", () => {
    const data = emptyYear();
    const scene = buildMonthScene(0, "2024");
    const decision = scene.nodes.find((n) => n.type === "decision")!;
    const janHelp = decision.decisions!.find((d) => d.id === "jan-help")!; // 林若宁增加 10，达到 65
    const state = {
      ...makeTestState(),
      relations: { lin_ruoning: 55, chen_xinghe: 10, zhou_mingzhao: 10, zhao_chengyu: 10 },
    };
    const result = makeDecision(state, data, janHelp);
    expect(result.flags[`affinity_lin_ruoning`]).toBe(result.relations.lin_ruoning);
    expect(result.relations.lin_ruoning).toBeGreaterThanOrEqual(60);
    expect(result.milestone).toBe("lin_ruoning");
  });

  it("仅在剧情角色关系值达到门槛时注入亲密时刻节点", () => {
    const flat = buildMonthScene(0, "2024"); // 未传入关系状态时有三个节点
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

  describe("条件分支层", () => {
    it("根据游戏状态判断分支条件", () => {
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

    it("每次决策都会累加方案类别计数", () => {
      let state = createInitialState("2025");
      const dec = buildMonthScene(1, "2025", state).nodes.find((n) => n.type === "decision")!.decisions![0];
      state = makeDecision(state, emptyYear(), dec);
      expect(state.categoryCounts[dec.category]).toBe(1);
      state = nextMonth(state);
      state = makeDecision(state, emptyYear(), dec);
      expect(state.categoryCounts[dec.category]).toBe(2);
    });

    it("疲劳值较高时注入倦怠分支场景和决策", () => {
      const s = { ...createInitialState("2025"), fatigue: 80 };
      const scene = buildMonthScene(1, "2025", s);
      expect(scene.nodes.find((n) => n.id === "route-burnout-node")).toBeDefined();
      const decisionNode = scene.nodes.find((n) => n.type === "decision")!;
      expect(decisionNode.decisions?.some((d) => d.id === "burnout-route-rest")).toBe(true);
    });

    it("做出决策时记录当前生效的路线旗标", () => {
      let state = { ...createInitialState("2025"), fatigue: 80 };
      const dec = buildMonthScene(1, "2025", state)
        .nodes.find((n) => n.type === "decision")!
        .decisions!.find((d) => d.id === "burnout-route-rest")!;
      state = makeDecision(state, emptyYear(), dec);
      expect(state.flags.route_burnout).toBe(true);
    });

    it("未传入状态时不注入动态分支", () => {
      const scene = buildMonthScene(1, "2025");
      expect(scene.nodes.find((n) => n.id === "route-burnout-node")).toBeUndefined();
    });
  });
});

// 保护跨年台词差异。若把 buildMonthScene 中的 arcLine 改回 story.line，
// 2023、2025 年会重新与 2024 年使用同一句台词。
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

  it("2025 与 2024 同月份寒暄不同（2025 年首月使用专属序章）", () => {
    for (let m = 1; m < 12; m++) {
      expect(colleagueText("2025", m)).not.toBe(colleagueText("2024", m));
    }
  });

  it("年份专属台词生效，2023 年第三个月采用陈星禾的两会和中特估口吻", () => {
    const t = colleagueText("2023", 2);
    expect(t).toContain("两会");
    expect(t).toContain("中特估");
  });

  it("缺少年份专属覆盖时回退到默认剧情台词", () => {
    const t = colleagueText("2024", 2);
    expect(t).toContain("订单流结构");
  });
});

// 保护跨年决策提示差异。若把 buildMonthScene 中的 arcMission 改回 story.mission，
// 2023、2025 年会重新与 2024 年使用同一句提示。
describe("决策提示按年份轮换（跨年不雷同）", () => {
  const decisionPrompt = (year: string, m: number): string => {
    const scene = buildMonthScene(m, year);
    const node = scene.nodes.find((n) => n.id === `m${m}-decision`);
    if (!node || typeof node.prompt !== "string") {
      throw new Error(`year=${year} m=${m} 找不到 decision 节点的 prompt`);
    }
    return node.prompt;
  };

  it("2023 与 2024 同月份决策提示不同", () => {
    for (let m = 1; m < 12; m++) {
      expect(decisionPrompt("2023", m)).not.toBe(decisionPrompt("2024", m));
    }
  });

  it("2025 与 2024 同月份决策提示不同", () => {
    for (let m = 1; m < 12; m++) {
      expect(decisionPrompt("2025", m)).not.toBe(decisionPrompt("2024", m));
    }
  });

  it("年份专属提示生效，2023 年第三个月含中特估，2025 年第三个月含 AI+行动", () => {
    expect(decisionPrompt("2023", 2)).toContain("中特估");
    expect(decisionPrompt("2025", 2)).toContain("AI+行动");
  });

  it("缺少年份专属覆盖时回退到默认剧情提示", () => {
    expect(decisionPrompt("2024", 2)).toContain("因子拆解和订单流");
  });
});
