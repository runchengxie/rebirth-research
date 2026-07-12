import { describe, expect, it } from "vitest";
import raw2023 from "./2023.json";
import raw2024 from "./2024.json";
import raw2025 from "./2025.json";
import { THEMES_2023, makeDecisions2023 } from "../content2023";
import { THEMES_2024, makeDecisions2024 } from "../content2024";
import { THEMES_2025, makeDecisions2025 } from "../content2025";
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
    it(`${sample.year} 年包含 12 个主题和 12 组研究方案`, () => {
      const content = validateYearContent(sample.raw);
      expect(content.year).toBe(sample.year);
      expect(content.themes).toHaveLength(12);
      expect(content.decisions).toHaveLength(12);
      expect(content.decisions.every((pool) => pool.length > 0)).toBe(true);
      expect(sample.themes).toHaveLength(12);
    });

    it(`${sample.year} 年加载器按月份返回研究方案并支持循环索引`, () => {
      const content = validateYearContent(sample.raw);
      expect(sample.makeDecisions(0)).toEqual(content.decisions[0]);
      expect(sample.makeDecisions(12)).toEqual(content.decisions[0]);
    });
  }

  it("拒绝缺少月份内容的数据", () => {
    expect(() =>
      validateYearContent({ year: "2025", themes: [], decisions: [] }),
    ).toThrow(ContentValidationError);
  });

  it("拒绝未知的研究方案类别", () => {
    const bad = {
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
