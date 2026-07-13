import { describe, expect, it } from "vitest";
import raw2023 from "./2023.json";
import raw2024 from "./2024.json";
import raw2025 from "./2025.json";
import { THEMES_2023, makeDecisions2023 } from "../content2023";
import { THEMES_2024, makeDecisions2024 } from "../content2024";
import { THEMES_2025, makeDecisions2025 } from "../content2025";
import { applyVerified2025Timeline, VERIFIED_2025_TIMELINE } from "../verified2025";
import { ContentValidationError, validateYearContent } from "./schema";

const YEARS = [
  {
    year: "2023",
    raw: raw2023,
    themes: THEMES_2023,
    makeDecisions: makeDecisions2023,
  },
  {
    year: "2024",
    raw: raw2024,
    themes: THEMES_2024,
    makeDecisions: makeDecisions2024,
  },
  {
    year: "2025",
    raw: raw2025,
    themes: THEMES_2025,
    makeDecisions: makeDecisions2025,
  },
] as const;

describe("正式年份内容层", () => {
  for (const sample of YEARS) {
    it(`${sample.year} 年包含完整的 12 个月 v2 内容`, () => {
      const content = validateYearContent(sample.raw);
      expect(content.contentVersion).toBe(2);
      expect(content.year).toBe(sample.year);
      expect(content.themes).toHaveLength(12);
      expect(content.decisions).toHaveLength(12);
      expect(content.decisions.every((pool) => pool.length > 0)).toBe(true);
      expect(content.themes.every((theme) => theme.knownEvent && theme.businessOutcome)).toBe(true);
      expect(content.themes.every((theme) =>
        theme.competingHypotheses?.lin
        && theme.competingHypotheses.chen
        && theme.competingHypotheses.zhou)).toBe(true);
      expect(content.decisions.flat().every((decision) =>
        decision.method
        && decision.quality
        && decision.outcomeAlignment
        && Array.isArray(decision.behaviorTags))).toBe(true);
      const expectedThemes = sample.year === "2025"
        ? applyVerified2025Timeline(content.themes)
        : content.themes;
      expect(sample.themes).toEqual(expectedThemes);
    });

    it(`${sample.year} 年加载器按月份返回研究方案并支持循环索引`, () => {
      const content = validateYearContent(sample.raw);
      expect(sample.makeDecisions(0)).toEqual(content.decisions[0]);
      expect(sample.makeDecisions(12)).toEqual(content.decisions[0]);
    });
  }

  it("2025 年核验台账覆盖 12 个月并修正错位事件", () => {
    expect(VERIFIED_2025_TIMELINE).toHaveLength(12);
    expect(VERIFIED_2025_TIMELINE.every((anchor) => anchor.sourceIds.length > 0)).toBe(true);
    expect(THEMES_2025[2].historicalPrototype).toContain("继续推进");
    expect(THEMES_2025[6].historicalPrototype).toContain("7月");
    expect(THEMES_2025[7].publicContext).not.toContain("三中全会");
  });

  it("把追涨错误选项识别为市场追逐，而不是风险管理", () => {
    const chase = makeDecisions2023(1).find((decision) => decision.id === "2023feb-chase");
    expect(chase?.category).toBe("risk_alert");
    expect(chase?.method).toBe("market_chasing");
    expect(chase?.quality).toBe("reckless");
  });

  it("生活管理和团队协作不会因研究证据维度较低被误判为冒进", () => {
    const decisions = YEARS.flatMap((sample) => validateYearContent(sample.raw).decisions.flat());
    const nonAnalytical = decisions.filter((decision) =>
      decision.method === "self_management" || decision.method === "collaboration");
    expect(nonAnalytical.length).toBeGreaterThan(0);
    expect(nonAnalytical.every((decision) => decision.quality !== "reckless")).toBe(true);
    expect(nonAnalytical.every((decision) => !decision.behaviorTags?.includes("thin_evidence"))).toBe(true);
  });

  it("拒绝缺少业务事实或三方假设的 v2 内容", () => {
    const missingOutcome = structuredClone(raw2023);
    missingOutcome.themes[0].businessOutcome = "";
    expect(() => validateYearContent(missingOutcome)).toThrow(/businessOutcome/);

    const missingHypothesis = structuredClone(raw2024);
    missingHypothesis.themes[0].competingHypotheses.lin = "";
    expect(() => validateYearContent(missingHypothesis)).toThrow(/competingHypotheses\.lin/);
  });

  it("拒绝缺少月份内容的数据", () => {
    expect(() =>
      validateYearContent({ contentVersion: 2, year: "2025", themes: [], decisions: [] }),
    ).toThrow(ContentValidationError);
  });

  it("拒绝未知的研究方案类别", () => {
    const bad = {
      contentVersion: 2,
      year: "2025",
      themes: raw2025.themes,
      decisions: [
        [
          {
            id: "unknown-category",
            label: "无效方案",
            category: "not_a_category",
            description: "无效类别应在加载时被拒绝",
            effects: {
              researchCredibility: 0,
              committeeAdoption: 0,
              portfolioNav: 0,
              viewAccuracy: 0,
              clientFeedback: 0,
              teamTrust: 0,
              fatigue: 0,
              lifeBalance: 0,
              characterRelations: [],
            },
            method: "fundamental_research",
            quality: "mixed",
            outcomeAlignment: "mixed",
            behaviorTags: [],
            evidenceLevel: 0,
            clarityLevel: 0,
            riskAwareness: 0,
            reflectionValue: 0,
          },
        ],
      ],
    };
    expect(() => validateYearContent(bad)).toThrow(ContentValidationError);
  });

  it("拒绝重复的研究方案编号", () => {
    const duplicate = structuredClone(raw2025);
    duplicate.decisions[1][0].id = duplicate.decisions[0][0].id;
    expect(() => validateYearContent(duplicate)).toThrow(/duplicate decision id/);
  });
});
