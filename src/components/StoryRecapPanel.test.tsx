import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { focusById } from "../game/engine";
import { createInitialState } from "../game/runtime";
import type { DecisionScore, ResearchDecision, RoundResult } from "../types";
import { methodSummaryFor } from "../game/methodArchive";
import { StoryRecapPanel } from "./StoryRecapPanel";

const DECISION: ResearchDecision = {
  id: "recap-test",
  label: "验证订单流的持续性",
  category: "data_deep_dive",
  method: "quantitative_research",
  quality: "mixed",
  outcomeAlignment: "mixed",
  description: "复核大单流向与盘口厚度，确认买盘是否仍在。",
  effects: {
    researchCredibility: 4,
    committeeAdoption: 1,
    portfolioNav: 0,
    viewAccuracy: 2,
    clientFeedback: 1,
    teamTrust: 0,
    fatigue: 4,
    lifeBalance: -2,
    characterRelations: [],
  },
  evidenceLevel: 9,
  clarityLevel: 9,
  riskAwareness: 8,
  reflectionValue: 4,
};

function scoreWith(overrides: Partial<DecisionScore>): DecisionScore {
  return {
    evidenceScore: 12,
    clarityScore: 11,
    riskAwarenessScore: 10,
    communicationScore: 9,
    lifeBalanceScore: 8,
    portfolioScore: 3,
    qualityBonus: 0,
    outcomeScore: 2,
    reasoningScore: 14,
    total: 55,
    grade: "B",
    ...overrides,
  };
}

function resultWith(score: DecisionScore | undefined): RoundResult {
  return {
    month: "2025-03",
    label: "3月",
    characterId: "chen_xinghe",
    sceneTitle: "算力叙事的资金结构",
    selected: DECISION,
    focus: focusById("deep_research"),
    outcome: { title: "判断保留", dialogue: "她点了点头。", detail: "等待业务数据。" },
    researchCredibilityAfter: 20,
    committeeAdoptionAfter: 12,
    portfolioNavAfter: 1.02,
    viewAccuracyAfter: 14,
    clientFeedbackAfter: 11,
    teamTrustAfter: 22,
    fatigueAfter: 30,
    lifeBalanceAfter: 48,
    relationsAfter: { lin_ruoning: 18, chen_xinghe: 16, zhou_mingzhao: 12, zhao_chengyu: 10 },
    marketTheme: "算力",
    marketReturn: 0.021,
    score,
    method: "quantitative_research",
    quality: "mixed",
  };
}

describe("职业评分拆解（路线图 R2B）", () => {
  it("负数方法质量加成按历史记录原样展示，沟通维度使用沟通命名", () => {
    const html = renderToStaticMarkup(
      <StoryRecapPanel
        experienceMode="career"
        result={resultWith(scoreWith({ qualityBonus: -5, total: 50 }))}
        state={createInitialState("2025")}
      />,
    );
    expect(html).toContain("career-score-breakdown");
    expect(html).toContain("方法质量");
    expect(html).toContain("-5");
    expect(html).toContain("沟通");
    expect(html).not.toContain("协作评分");
    expect(html).toContain("14/25");
    expect(html).toContain("50 · B 级");
  });

  it("剧情模式只显示人物对白，不渲染评分数字", () => {
    const html = renderToStaticMarkup(
      <StoryRecapPanel
        experienceMode="romance"
        result={resultWith(scoreWith({}))}
        state={createInitialState("2025", "romance")}
      />,
    );
    expect(html).toContain("她点了点头。");
    expect(html).not.toContain("career-score-breakdown");
    expect(html).not.toContain("career-full-recap");
  });

  it("缺少评分的旧存档记录可以直接展示，不重新计算", () => {
    const html = renderToStaticMarkup(
      <StoryRecapPanel
        experienceMode="career"
        result={resultWith(undefined)}
        state={createInitialState("2025")}
      />,
    );
    expect(html).toContain("career-full-recap");
    expect(html).not.toContain("career-score-breakdown");
  });
});

describe("方法档案摘要（路线图 R2C）", () => {
  it("展示方法、执行质量、日程与推理分", () => {
    const summary = methodSummaryFor(resultWith(scoreWith({})));
    expect(summary).toContain("量化验证");
    expect(summary).toContain("证据有缺口");
    expect(summary).toContain("日程 深度研报");
    expect(summary).toContain("推理 14/25");
  });

  it("旧存档缺字段时提供稳定降级文案", () => {
    const legacy = { ...resultWith(undefined), method: undefined, quality: undefined };
    const summary = methodSummaryFor(legacy);
    expect(summary).toContain("早期存档未记录方法");
    expect(summary).toContain("执行质量未记录");
    expect(summary).toContain("推理分未记录");
  });
});
