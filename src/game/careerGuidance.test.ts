import { describe, expect, it } from "vitest";
import { FOCUS_ACTIONS } from "./content";
import { buildMonthScene } from "./sceneBuilders";
import type { ResearchDecision, RoundResult } from "../types";
import {
  CAREER_GLOSSARY,
  careerRecap,
  decisionPresentation,
  glossaryTermsIn,
  monthlyCareerGuidance,
} from "./careerGuidance";

const DECISION: ResearchDecision = {
  id: "guidance-test",
  label: "拆解单位经济性与因子拥挤度",
  category: "deep_research",
  method: "fundamental_research",
  quality: "sound",
  outcomeAlignment: "supports",
  description: "用敏感性分析检查收入、利润和因子拥挤度。",
  effects: {
    researchCredibility: 5,
    committeeAdoption: 2,
    portfolioNav: 0,
    viewAccuracy: 1,
    clientFeedback: 0,
    teamTrust: 1,
    fatigue: 9,
    lifeBalance: -7,
    characterRelations: [{ characterId: "lin_ruoning", value: 2 }],
  },
  evidenceLevel: 18,
  clarityLevel: 15,
  riskAwareness: 11,
  reflectionValue: 8,
};

const RESULT: RoundResult = {
  month: "2025-01",
  label: "2025年1月",
  characterId: "lin_ruoning",
  sceneTitle: "未来记忆审计",
  selected: DECISION,
  focus: FOCUS_ACTIONS[0],
  outcome: { title: "复盘", dialogue: "复盘", detail: "复盘" },
  researchCredibilityAfter: 42,
  committeeAdoptionAfter: 28,
  portfolioNavAfter: 1,
  viewAccuracyAfter: 20,
  clientFeedbackAfter: 15,
  teamTrustAfter: 29,
  fatigueAfter: 48,
  lifeBalanceAfter: 35,
  relationsAfter: {
    lin_ruoning: 20,
    chen_xinghe: 14,
    zhou_mingzhao: 12,
    zhao_chengyu: 10,
  },
  marketTheme: "AI叙事重构",
  marketReturn: 0,
  score: {
    evidenceScore: 19,
    clarityScore: 16,
    riskAwarenessScore: 10,
    communicationScore: 11,
    lifeBalanceScore: 4,
    portfolioScore: 4,
    qualityBonus: 6,
    outcomeScore: 4,
    reasoningScore: 19,
    total: 74,
    grade: "B",
  },
};

describe("职业模式理解层", () => {
  it("为每个月只提供一个目标、风险和校准问题", () => {
    const january = monthlyCareerGuidance("2025", 0);
    const december = monthlyCareerGuidance("2025", 11);

    expect(january.goal).toContain("证据");
    expect(january.risk).toContain("结果");
    expect(december.question).toContain("纪律");
    expect(monthlyCareerGuidance("2024", 0).goal).toContain("研究假设");
  });

  it("把专业方案翻译成主张、押注变量、代价和推荐日程", () => {
    const presentation = decisionPresentation(DECISION);

    expect(presentation.methodLabel).toBe("基本面验证");
    expect(presentation.claim).toContain("业务兑现");
    expect(presentation.tradeoff).toContain("疲劳");
    expect(presentation.recommendedFocusId).toBe("deep_research");
  });

  it("按首次出现顺序返回当前内容实际出现的术语", () => {
    const terms = glossaryTermsIn(DECISION.label, DECISION.description);

    expect(terms.map((term) => term.id)).toEqual([
      "unit-economics",
      "factor-crowding",
      "sensitivity-analysis",
    ]);
    expect(glossaryTermsIn("普通业务描述")).toEqual([]);
  });

  it("覆盖第一话的交易术语并解释它在本话中的作用", () => {
    const terms = glossaryTermsIn(
      "Barra 归因显示动量因子主导，订单簿和盘口厚度变弱，Alpha 衰减加快。",
      "风险偏好、流动性和安全边际都要检查，也别漏掉反身性。",
    );

    expect(terms.map((term) => term.id)).toEqual([
      "barra",
      "momentum-factor",
      "order-book",
      "market-depth",
      "alpha-decay",
      "risk-appetite",
      "liquidity",
      "margin-of-safety",
      "reflexivity",
    ]);
    expect(terms.every((term) => term.relevance.length > 0)).toBe(true);
  });

  it("结算先解释优势、风险和状态后果", () => {
    const recap = careerRecap(RESULT);

    expect(recap.strength).toContain("证据");
    expect(recap.risk).toContain("工作节奏");
    expect(recap.consequence).toContain("疲劳");
  });
});

describe("术语词典质量（路线图 R2.7）", () => {
  it("显示名与别名在词典内全局唯一，命中后不会重复显示同一概念", () => {
    const seen = new Map<string, string>();
    for (const term of CAREER_GLOSSARY) {
      for (const alias of [term.label, ...term.aliases]) {
        const key = alias.toLocaleLowerCase("zh-CN");
        const owner = seen.get(key);
        expect(owner === undefined || owner === term.id, `别名 ${alias} 同时属于 ${owner} 和 ${term.id}`).toBe(true);
        seen.set(key, term.id);
      }
    }
  });

  it("解释保持中性：只说明概念，不暗示推荐、高分或正确方案", () => {
    for (const term of CAREER_GLOSSARY) {
      expect(term.explanation.length).toBeGreaterThan(8);
      expect(term.relevance.length).toBeGreaterThan(0);
      for (const banned of ["推荐", "高分", "正确方案", "好感", "选它"]) {
        expect(term.explanation, `${term.id} 的解释包含诱导词 ${banned}`).not.toContain(banned);
        expect(term.relevance, `${term.id} 的作用说明包含诱导词 ${banned}`).not.toContain(banned);
      }
    }
  });

  it("2025 全年方案文本中的首批术语都能被词典命中", () => {
    const texts: string[] = [];
    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const scene = buildMonthScene(monthIndex, "2025");
      for (const node of scene.nodes) {
        for (const decision of node.decisions ?? []) {
          texts.push(decision.label, decision.description);
        }
      }
    }
    const source = texts.join("\n");
    // 首批要求覆盖的概念（路线图 R2.2）在 2025 文本中出现时必须可解释。
    for (const requiredId of ["arr", "barra", "alpha-decay", "factor-crowding", "order-flow", "valuation-percentile", "dcf"]) {
      const term = CAREER_GLOSSARY.find((item) => item.id === requiredId);
      expect(term, `词典缺少首批术语 ${requiredId}`).toBeDefined();
      if (!term) continue;
      const appears = [term.label, ...term.aliases].some((alias) => source.includes(alias));
      if (appears) {
        expect(glossaryTermsIn(source).map((item) => item.id)).toContain(requiredId);
      }
    }
  });
});
