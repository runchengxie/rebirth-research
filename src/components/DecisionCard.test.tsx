import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createInitialState } from "../game/runtime";
import type { ResearchDecision } from "../types";
import { DecisionCard } from "./DecisionCard";

const DECISION: ResearchDecision = {
  id: "glossary-render-test",
  label: "复核 ARR 与订单流",
  category: "data_deep_dive",
  method: "quantitative_research",
  quality: "sound",
  outcomeAlignment: "supports",
  description: "用 ARR 和订单流交叉验证需求是否真实。",
  effects: {
    researchCredibility: 5,
    committeeAdoption: 2,
    portfolioNav: 0,
    viewAccuracy: 2,
    clientFeedback: 1,
    teamTrust: 1,
    fatigue: 5,
    lifeBalance: -3,
    characterRelations: [{ characterId: "lin_ruoning", value: 3 }],
  },
  evidenceLevel: 11,
  clarityLevel: 10,
  riskAwareness: 8,
  reflectionValue: 5,
};

describe("方案卡术语渲染（路线图 R2.6）", () => {
  it("职业模式展示默认折叠的本选项术语", () => {
    const html = renderToStaticMarkup(
      <DecisionCard
        decision={DECISION}
        experienceMode="career"
        index={0}
        state={createInitialState("2025")}
        onChoose={vi.fn()}
      />,
    );
    expect(html).toContain("career-glossary");
    expect(html).toContain("本选项术语（2）");
    expect(html).toContain("career-term");
    expect(html).not.toContain("<details open");
  });

  it("剧情模式不渲染职业术语与研究表单密度", () => {
    const html = renderToStaticMarkup(
      <DecisionCard
        decision={DECISION}
        experienceMode="romance"
        index={0}
        state={createInitialState("2025", "romance")}
        onChoose={vi.fn()}
      />,
    );
    expect(html).not.toContain("career-glossary");
    expect(html).not.toContain("career-term");
    expect(html).not.toContain("career-option-logic");
  });

  it("草案模式标记选中状态且不渲染卡内提交确认", () => {
    const html = renderToStaticMarkup(
      <DecisionCard
        decision={DECISION}
        draftMode
        draftSelected
        experienceMode="career"
        index={0}
        state={createInitialState("2025")}
        onChoose={vi.fn()}
      />,
    );
    expect(html).toContain("is-draft-selected");
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain("decision-confirmation");
  });
});
