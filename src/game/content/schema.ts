// ═══════════════════════════════════════════════════════════
// Content-layer schema — 内容层校验（不依赖运行时库）
// ═══════════════════════════════════════════════════════════
//
// 内容（MarketTheme / ResearchDecision）已经从代码迁移到 JSON 数据文件。
// 这里提供一份与 types.ts 对齐的「加载时」schema 校验：任何一份年份内容
// 在加载时都必须通过 validateYearContent，否则直接抛错 —— 把「内容写错」
// 变成「启动即发现」，而不是在游戏里 silently 出错。
//
// 不引入 zod 等运行时依赖，保持项目依赖精简；校验逻辑就是一份手写类型守卫。

import type {
  CharacterId,
  DecisionCategory,
  DecisionEffects,
  MarketTheme,
  ResearchDecision,
} from "../../types";

export const CHARACTER_IDS: readonly CharacterId[] = [
  "lin_ruoning",
  "chen_xinghe",
  "zhou_mingzhao",
];

export const DECISION_CATEGORIES: readonly DecisionCategory[] = [
  "deep_research",
  "expert_interview",
  "roadshow",
  "risk_alert",
  "self_care",
  "help_colleague",
  "committee_defense",
  "data_deep_dive",
];

const DECISION_METHODS = [
  "fundamental_research",
  "field_research",
  "communication",
  "risk_management",
  "self_management",
  "collaboration",
  "committee_process",
  "quantitative_research",
  "market_chasing",
] as const;
const DECISION_QUALITIES = ["sound", "mixed", "reckless"] as const;
const OUTCOME_ALIGNMENTS = ["supports", "mixed", "contradicts"] as const;
const BEHAVIOR_TAGS = [
  "hypothesis_driven",
  "thin_evidence",
  "momentum_chasing",
  "crowding_aware",
  "downside_defined",
  "reflective",
] as const;

export interface YearContent {
  contentVersion: 2;
  year: string;
  themes: MarketTheme[];
  decisions: ResearchDecision[][];
}

export class ContentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentValidationError";
  }
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNonEmptyString(v: unknown): v is string {
  return isString(v) && v.trim().length > 0;
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validateCharacterId(v: unknown): v is CharacterId {
  return typeof v === "string" && (CHARACTER_IDS as readonly string[]).includes(v);
}

function validateDecisionEffects(v: unknown): v is DecisionEffects {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  const numericKeys: (keyof DecisionEffects)[] = [
    "researchCredibility",
    "committeeAdoption",
    "portfolioNav",
    "viewAccuracy",
    "clientFeedback",
    "teamTrust",
    "fatigue",
    "lifeBalance",
  ];
  for (const key of numericKeys) {
    if (!isNumber(e[key])) return false;
  }
  if (!Array.isArray(e.characterRelations)) return false;
  for (const rel of e.characterRelations as unknown[]) {
    if (typeof rel !== "object" || rel === null) return false;
    const r = rel as Record<string, unknown>;
    if (!validateCharacterId(r.characterId)) return false;
    if (!isNumber(r.value)) return false;
  }
  return true;
}

function requireCompetingHypotheses(value: unknown, where: string): void {
  if (typeof value !== "object" || value === null) {
    throw new ContentValidationError(`${where}: theme.competingHypotheses must be an object`);
  }
  const hypotheses = value as Record<string, unknown>;
  for (const key of ["lin", "chen", "zhou"] as const) {
    if (!isNonEmptyString(hypotheses[key])) {
      throw new ContentValidationError(`${where}: theme.competingHypotheses.${key} must be a non-empty string`);
    }
  }
}

function requireTheme(v: unknown, where: string): MarketTheme {
  if (typeof v !== "object" || v === null) {
    throw new ContentValidationError(`${where}: theme must be an object`);
  }
  const t = v as Record<string, unknown>;
  for (const key of [
    "id",
    "period",
    "title",
    "publicContext",
    "protagonistMemory",
    "gameHook",
    "knownEvent",
    "businessOutcome",
  ] as const) {
    if (!isNonEmptyString(t[key])) {
      throw new ContentValidationError(`${where}: theme.${key} must be a non-empty string`);
    }
  }
  requireCompetingHypotheses(t.competingHypotheses, where);
  if (t.historicalPrototype !== undefined && !isString(t.historicalPrototype)) {
    throw new ContentValidationError(`${where}: theme.historicalPrototype must be a string when present`);
  }
  return v as MarketTheme;
}

function requireDecisionSemantics(d: Record<string, unknown>, where: string): void {
  if (!(DECISION_METHODS as readonly string[]).includes(String(d.method))) {
    throw new ContentValidationError(`${where}: decision.method is invalid`);
  }
  if (!(DECISION_QUALITIES as readonly string[]).includes(String(d.quality))) {
    throw new ContentValidationError(`${where}: decision.quality is invalid`);
  }
  if (!(OUTCOME_ALIGNMENTS as readonly string[]).includes(String(d.outcomeAlignment))) {
    throw new ContentValidationError(`${where}: decision.outcomeAlignment is invalid`);
  }
  const validTags = Array.isArray(d.behaviorTags)
    && (d.behaviorTags as unknown[]).every((tag) => (BEHAVIOR_TAGS as readonly unknown[]).includes(tag));
  if (!validTags) {
    throw new ContentValidationError(`${where}: decision.behaviorTags is invalid`);
  }
}

function requireDecision(v: unknown, where: string): ResearchDecision {
  if (typeof v !== "object" || v === null) {
    throw new ContentValidationError(`${where}: decision must be an object`);
  }
  const d = v as Record<string, unknown>;
  for (const key of ["id", "label", "category", "description"] as const) {
    if (!isString(d[key])) {
      throw new ContentValidationError(`${where}: decision.${key} must be a string`);
    }
  }
  if (!(DECISION_CATEGORIES as readonly string[]).includes(d.category as string)) {
    throw new ContentValidationError(
      `${where}: decision.category "${String(d.category)}" is not a valid category`,
    );
  }
  if (!validateDecisionEffects(d.effects)) {
    throw new ContentValidationError(`${where}: decision.effects is invalid`);
  }
  requireDecisionSemantics(d, where);
  if (d.backgroundNote !== undefined && !isString(d.backgroundNote)) {
    throw new ContentValidationError(`${where}: decision.backgroundNote must be a string when present`);
  }
  for (const key of ["evidenceLevel", "clarityLevel", "riskAwareness", "reflectionValue"] as const) {
    if (!isNumber(d[key])) {
      throw new ContentValidationError(`${where}: decision.${key} must be a number`);
    }
  }
  return v as ResearchDecision;
}

export function validateYearContent(raw: unknown): YearContent {
  if (typeof raw !== "object" || raw === null) {
    throw new ContentValidationError("year content must be an object");
  }
  const c = raw as Record<string, unknown>;
  if (c.contentVersion !== 2) {
    throw new ContentValidationError("year content: 'contentVersion' must be 2");
  }
  if (!isString(c.year)) {
    throw new ContentValidationError("year content: 'year' must be a string");
  }
  if (!Array.isArray(c.themes)) {
    throw new ContentValidationError("year content: 'themes' must be an array");
  }
  if (!Array.isArray(c.decisions)) {
    throw new ContentValidationError("year content: 'decisions' must be an array");
  }

  const themes = c.themes.map((t, i) => requireTheme(t, `themes[${i}]`));
  if (themes.length !== 12) {
    throw new ContentValidationError(`expected 12 monthly themes, got ${themes.length}`);
  }

  const seen = new Set<string>();
  const decisions = c.decisions.map((month, mi) => {
    if (!Array.isArray(month)) {
      throw new ContentValidationError(`decisions[${mi}] must be an array`);
    }
    return month.map((dec, di) => {
      const validated = requireDecision(dec, `decisions[${mi}][${di}]`);
      if (seen.has(validated.id)) {
        throw new ContentValidationError(`duplicate decision id "${validated.id}"`);
      }
      seen.add(validated.id);
      return validated;
    });
  });
  if (decisions.length !== 12) {
    throw new ContentValidationError(`expected 12 monthly decision pools, got ${decisions.length}`);
  }

  return { contentVersion: 2, year: c.year, themes, decisions };
}
