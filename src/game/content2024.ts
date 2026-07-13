// ═══════════════════════════════════════════════════════════
// 2024 内容层 —— 从 JSON 数据加载并校验（与 2023 / 2025 层一致）
//
// 原始内容由 decision 工厂 d() 编写，已通过 scripts/dump2024.mjs
// 抽到 content/2024.json。本文件只做「加载 + 校验」，保持内容/逻辑分离。
// ═══════════════════════════════════════════════════════════

import raw from "./content/2024.json";
import type { MarketTheme, ResearchDecision } from "../types";
import { validateYearContent } from "./content/schema";
import { completeDecisionSemantics, completeYearThemes } from "./narrativeSemantics";

const CONTENT_2024 = validateYearContent(raw);

export const THEMES_2024: MarketTheme[] = completeYearThemes(CONTENT_2024.themes);

export function makeDecisions2024(monthIndex: number): ResearchDecision[] {
  const pool = CONTENT_2024.decisions[monthIndex % CONTENT_2024.decisions.length];
  return (pool ?? []).map(completeDecisionSemantics);
}
