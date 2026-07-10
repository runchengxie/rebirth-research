import type { GameDataMap, GameDataYear, MarketSnapshot } from "../types";
import { buildMonthScene } from "../game/content";

// Build 12-month scene data for each year
function buildYearData(year: string): GameDataYear {
  const scenes = [];
  const benchmarks: MarketSnapshot[] = [];
  for (let i = 0; i < 12; i++) {
    const scene = buildMonthScene(i, year);
    scenes.push(scene);
    // Placeholder benchmark — real data would come from build_data.py
    benchmarks.push({
      month: scene.month,
      label: scene.label,
      marketStart: `${year}0101`,
      marketEnd: `${year}1231`,
      themeIndex: "000300.SH",
      themeReturn: 0,
      sectorRotation: [],
      styleFactorReturns: [],
      eventSummary: scene.theme.publicContext,
    });
  }

  return {
    year,
    currency: "CNY",
    generatedAt: new Date().toISOString(),
    source: {
      dailyDataset: "a_share_daily_clean",
      dailyDatasetVersion: "20260701",
      instrumentDataset: "a_share_instruments",
      priceColumn: "adj_close",
    },
    rules: {
      activePool: 500,
      excludeST: true,
      excludeSuspended: true,
    },
    benchmarks,
    scenes,
  };
}

export const GAME_DATA: GameDataMap = {
  "2023": buildYearData("2023"),
  "2024": buildYearData("2024"),
  "2025": buildYearData("2025"),
  "demo": buildYearData("demo"),
};

// 年份选择器只列正式年份；demo 是示范章节，藏起来只留 ?year=demo 深链。
export const GAME_YEARS = ["2023", "2024", "2025"];
