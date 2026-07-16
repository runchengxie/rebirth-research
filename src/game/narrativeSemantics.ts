import type {
  DecisionBehaviorTag,
  DecisionCategory,
  DecisionMethod,
  DecisionQuality,
  MarketTheme,
  OutcomeAlignment,
  ResearchDecision,
} from "../types";
import { polishMixedText } from "./dialogueText";

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
const NON_ANALYTICAL_METHODS: DecisionMethod[] = ["self_management", "collaboration"];

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
  if (method === "market_chasing") return "reckless";
  if (method === "self_management") {
    return decision.effects.lifeBalance >= 8
      || decision.effects.fatigue <= -8
      || decision.reflectionValue >= 10
      ? "sound"
      : "mixed";
  }
  if (method === "collaboration") {
    return decision.effects.teamTrust >= 8 || decision.reflectionValue >= 8
      ? "sound"
      : "mixed";
  }
  if (
    decision.evidenceLevel + decision.clarityLevel <= 10
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
  if (quality === "sound" && !NON_ANALYTICAL_METHODS.includes(method)) {
    tags.push("hypothesis_driven");
  }
  if (quality === "reckless" && !tags.includes("thin_evidence")) tags.push("thin_evidence");
  if (decision.reflectionValue >= 10) tags.push("reflective");
  return tags;
}

export function completeDecisionSemantics(decision: ResearchDecision): ResearchDecision {
  return {
    ...decision,
    label: polishMixedText(decision.label),
    description: polishMixedText(decision.description),
    ...(decision.backgroundNote === undefined
      ? {}
      : { backgroundNote: polishMixedText(decision.backgroundNote) }),
    ...(decision.businessAngle === undefined
      ? {}
      : { businessAngle: polishMixedText(decision.businessAngle) }),
    ...(decision.teaches === undefined
      ? {}
      : { teaches: {
        ...decision.teaches,
        concept: polishMixedText(decision.teaches.concept),
        mentorLine: polishMixedText(decision.teaches.mentorLine),
        ...(decision.teaches.learningRef === undefined
          ? {}
          : { learningRef: polishMixedText(decision.teaches.learningRef) }),
      } }),
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
  return themes.map((theme) => {
    const polished: MarketTheme = {
      ...theme,
      title: polishMixedText(theme.title),
      publicContext: polishMixedText(theme.publicContext),
      protagonistMemory: polishMixedText(theme.protagonistMemory),
      gameHook: polishMixedText(theme.gameHook),
      historicalPrototype: theme.historicalPrototype === undefined
        ? undefined
        : polishMixedText(theme.historicalPrototype),
      knownEvent: theme.knownEvent === undefined ? undefined : polishMixedText(theme.knownEvent),
      businessOutcome: theme.businessOutcome === undefined
        ? undefined
        : polishMixedText(theme.businessOutcome),
      competingHypotheses: theme.competingHypotheses === undefined
        ? undefined
        : {
          lin: theme.competingHypotheses.lin === undefined
            ? undefined
            : polishMixedText(theme.competingHypotheses.lin),
          chen: theme.competingHypotheses.chen === undefined
            ? undefined
            : polishMixedText(theme.competingHypotheses.chen),
          zhou: theme.competingHypotheses.zhou === undefined
            ? undefined
            : polishMixedText(theme.competingHypotheses.zhou),
        },
    };
    return {
      ...polished,
      knownEvent: polished.knownEvent ?? polished.protagonistMemory,
      businessOutcome: polished.businessOutcome ?? businessFactFrom(polished),
      competingHypotheses: polished.competingHypotheses ?? {
        lin: `围绕${polished.title}，把收入、订单、利润率和现金流拆成可验证链条。`,
        chen: `跟踪${polished.title}相关的成交结构、拥挤度与信号持续性，警惕一次性脉冲。`,
        zhou: `为${polished.title}建立估值、传导时滞和下行情景，先写清错误边界。`,
      },
    };
  });
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
