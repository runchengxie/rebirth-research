// 2025 内容层：正式内容统一由 version 2 JSON 提供。

import raw from "./content/2025.json";
import type { MarketTheme, ResearchDecision } from "../types";
import { validateYearContent } from "./content/schema";
import { completeDecisionSemantics, completeYearThemes } from "./narrativeSemantics";

const CONTENT_2025 = validateYearContent(raw);

export const THEMES_2025: MarketTheme[] = completeYearThemes(CONTENT_2025.themes);

export function makeDecisions2025(monthIndex: number): ResearchDecision[] {
  const pool = CONTENT_2025.decisions[monthIndex % CONTENT_2025.decisions.length];
  return (pool ?? []).map(completeDecisionSemantics);
}
