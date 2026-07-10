// ═══════════════════════════════════════════════════════════
// 2023 内容层 —— 从 JSON 数据加载并校验（与 2025 层一致）
//
// 原始内容由 decision 工厂 d() 编写，已通过 scripts/dump2023.mjs
// 抽到 content/2023.json。本文件只做「加载 + 校验」，保持内容/逻辑分离。
// 任何字段写错都会在加载时直接抛错（ContentValidationError），而不是
// 在游戏里静默出错。
// ═══════════════════════════════════════════════════════════

import raw from "./content/2023.json";
import type { MarketTheme, ResearchDecision } from "../types";
import { validateYearContent } from "./content/schema";

const CONTENT_2023 = validateYearContent(raw);

export const THEMES_2023: MarketTheme[] = CONTENT_2023.themes;

export function makeDecisions2023(monthIndex: number): ResearchDecision[] {
  const pool = CONTENT_2023.decisions[monthIndex % CONTENT_2023.decisions.length];
  return pool ?? [];
}
