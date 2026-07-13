import type {
  DecisionBehaviorTag,
  DecisionCategory,
  DecisionMethod,
  DecisionQuality,
  MarketTheme,
  OutcomeAlignment,
  ResearchDecision,
} from "../types";

export const CONTENT_REVISION = "content-system-v2";

const METHOD_BY_CATEGORY: Record<DecisionCategory, DecisionMethod> = {
  deep_research: "fundamental_research",
  expert_interview: "field_research",
  roadshow: "communication",
  risk_alert: "risk_management",
  self_care: "self_management",
  help_colleague: "collaboration",
  committee_defense: "committee_process",
  data_deep_dive: "quantitative_research",
};

const RECKLESS_MARKERS = ["先上车", "追最强", "追涨", "冲进去", "赌一把", "不用验证", "拍脑袋"];

export function decisionMethod(decision: ResearchDecision): DecisionMethod {
  if (decision.method) return decision.method;
  const text = `${decision.label}${decision.description}`;
  if (
    decision.category === "risk_alert"
    && (decision.riskAwareness < 5
      || decision.effects.researchCredibility < 0
      || RECKLESS_MARKERS.some((marker) => text.includes(marker)))
  ) {
    return "market_chasing";
  }
  return METHOD_BY_CATEGORY[decision.category];
}

export function decisionQuality(decision: ResearchDecision): DecisionQuality {
  if (decision.quality) return decision.quality;
  const method = decisionMethod(decision);
  if (
    method === "market_chasing"
    || decision.evidenceLevel + decision.clarityLevel <= 10
    || (decision.riskAwareness <= 2 && decision.effects.researchCredibility < 0)
  ) {
    return "reckless";
  }
  if (
    decision.evidenceLevel + decision.clarityLevel + decision.riskAwareness >= 38
    && decision.reflectionValue >= 4
  ) {
    return "sound";
  }
  return "mixed";
}

export function decisionOutcomeAlignment(decision: ResearchDecision): OutcomeAlignment {
  if (decision.outcomeAlignment) return decision.outcomeAlignment;
  const method = decisionMethod(decision);
  if (method === "self_management" || method === "collaboration") return "mixed";
  if (decision.effects.viewAccuracy >= 4) return "supports";
  if (decision.effects.viewAccuracy <= -4) return "contradicts";
  return "mixed";
}

export function decisionBehaviorTags(decision: ResearchDecision): DecisionBehaviorTag[] {
  if (decision.behaviorTags) return decision.behaviorTags;
  const method = decisionMethod(decision);
  const quality = decisionQuality(decision);
  const tags: DecisionBehaviorTag[] = [];
  if (method === "market_chasing") tags.push("momentum_chasing", "thin_evidence");
  if (method === "risk_management") tags.push("crowding_aware", "downside_defined");
  if (quality === "sound") tags.push("hypothesis_driven");
  if (quality === "reckless" && !tags.includes("thin_evidence")) tags.push("thin_evidence");
  if (decision.reflectionValue >= 10) tags.push("reflective");
  return tags;
}

export function completeDecisionSemantics(decision: ResearchDecision): ResearchDecision {
  return {
    ...decision,
    method: decisionMethod(decision),
    quality: decisionQuality(decision),
    outcomeAlignment: decisionOutcomeAlignment(decision),
    behaviorTags: decisionBehaviorTags(decision),
  };
}

const PRICE_OR_MARKET_CLAUSE = /(涨|跌|指数|点位|市值|股价|成交额|净买入|反弹|回落|领涨|跌停|涨停|破万亿)/;

function businessFactFrom(theme: MarketTheme): string {
  const prototype = theme.historicalPrototype ?? "";
  const clauses = prototype
    .split(/[，。；]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !PRICE_OR_MARKET_CLAUSE.test(part));
  const fact = clauses.join("，") || theme.publicContext.split("。")[0] || theme.protagonistMemory;
  return `历史复盘确认：${fact}。`;
}

export function completeYearThemes(themes: MarketTheme[]): MarketTheme[] {
  return themes.map((theme) => ({
    ...theme,
    knownEvent: theme.knownEvent ?? theme.protagonistMemory,
    businessOutcome: theme.businessOutcome ?? businessFactFrom(theme),
    competingHypotheses: theme.competingHypotheses ?? {
      lin: `围绕“${theme.title}”，把收入、订单、利润率和现金流拆成可验证链条。`,
      chen: `跟踪“${theme.title}”相关成交结构、拥挤度与信号持续性，警惕一次性脉冲。`,
      zhou: `为“${theme.title}”建立估值、传导时滞和下行情景，先写清错误边界。`,
    },
  }));
}

export type SceneBeatKey =
  | "memory"
  | "afterMemory"
  | "competing"
  | "affinity"
  | "colleague"
  | "beforeDecision"
  | "decision";

export interface YearNarrativeProfile {
  id: "market-first" | "evidence-first" | "debate-first";
  beats: SceneBeatKey[];
}

export const YEAR_NARRATIVE_PROFILES: Record<string, YearNarrativeProfile> = {
  "2023": {
    id: "market-first",
    beats: ["colleague", "memory", "afterMemory", "competing", "affinity", "beforeDecision", "decision"],
  },
  "2024": {
    id: "evidence-first",
    beats: ["memory", "colleague", "afterMemory", "competing", "affinity", "beforeDecision", "decision"],
  },
  "2025": {
    id: "debate-first",
    beats: ["memory", "competing", "afterMemory", "affinity", "colleague", "beforeDecision", "decision"],
  },
};

export function sceneProfileFor(year: string): YearNarrativeProfile {
  return YEAR_NARRATIVE_PROFILES[year] ?? YEAR_NARRATIVE_PROFILES["2024"];
}
