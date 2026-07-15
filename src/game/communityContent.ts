import type {
  DecisionMethod,
  DecisionQuality,
  ResearchDecision,
} from "../types";

export const COMMUNITY_PACK_FORMAT = "rebirth-research-community-pack";
export const COMMUNITY_PACK_VERSION = 1;
export const COMMUNITY_LIBRARY_KEY = "rebirthCommunityPacks:v1";

export interface CommunityDecision {
  id: string;
  label: string;
  description: string;
  method: DecisionMethod;
  quality: DecisionQuality;
  evidence: number;
  clarity: number;
  risk: number;
  reflection: number;
}

export interface CommunityCase {
  id: string;
  title: string;
  context: string;
  futureMemory: string;
  fundamentalHypothesis: string;
  quantitativeHypothesis: string;
  riskHypothesis: string;
  outcome: string;
  decisions: CommunityDecision[];
}

export interface CommunityPack {
  format: typeof COMMUNITY_PACK_FORMAT;
  version: typeof COMMUNITY_PACK_VERSION;
  id: string;
  title: string;
  author: string;
  description: string;
  updatedAt: string;
  cases: CommunityCase[];
}

export interface ContentValidationResult {
  valid: boolean;
  errors: string[];
}

const METHODS: readonly DecisionMethod[] = [
  "fundamental_research",
  "field_research",
  "communication",
  "risk_management",
  "self_management",
  "collaboration",
  "committee_process",
  "quantitative_research",
  "market_chasing",
];

const QUALITIES: readonly DecisionQuality[] = ["sound", "mixed", "reckless"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function bounded(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function validateDecision(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} 必须是对象。`);
    return;
  }
  for (const field of ["id", "label", "description"] as const) {
    if (!nonEmpty(value[field])) errors.push(`${path}.${field} 不能为空。`);
  }
  if (!METHODS.includes(value.method as DecisionMethod)) errors.push(`${path}.method 无效。`);
  if (!QUALITIES.includes(value.quality as DecisionQuality)) errors.push(`${path}.quality 无效。`);
  for (const [field, max] of [["evidence", 20], ["clarity", 20], ["risk", 20], ["reflection", 15]] as const) {
    if (!bounded(value[field], 0, max)) errors.push(`${path}.${field} 必须在 0-${max}。`);
  }
}

function validateCase(value: unknown, index: number, errors: string[]): void {
  const path = `cases[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${path} 必须是对象。`);
    return;
  }
  for (const field of [
    "id",
    "title",
    "context",
    "futureMemory",
    "fundamentalHypothesis",
    "quantitativeHypothesis",
    "riskHypothesis",
    "outcome",
  ] as const) {
    if (!nonEmpty(value[field])) errors.push(`${path}.${field} 不能为空。`);
  }
  if (!Array.isArray(value.decisions) || value.decisions.length < 2) {
    errors.push(`${path}.decisions 至少需要两个方案。`);
    return;
  }
  value.decisions.forEach((decision, decisionIndex) => {
    validateDecision(decision, `${path}.decisions[${decisionIndex}]`, errors);
  });
}

export function validateCommunityPack(value: unknown): ContentValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ["内容包必须是 JSON 对象。"] };
  if (value.format !== COMMUNITY_PACK_FORMAT) errors.push("format 不匹配。") ;
  if (value.version !== COMMUNITY_PACK_VERSION) errors.push("version 不受支持。") ;
  for (const field of ["id", "title", "author", "description", "updatedAt"] as const) {
    if (!nonEmpty(value[field])) errors.push(`${field} 不能为空。`);
  }
  if (!Array.isArray(value.cases) || value.cases.length === 0) {
    errors.push("内容包至少需要一个案例。") ;
  } else {
    value.cases.forEach((item, index) => validateCase(item, index, errors));
  }
  return { valid: errors.length === 0, errors };
}

export function parseCommunityPack(raw: string): CommunityPack {
  const value: unknown = JSON.parse(raw);
  const result = validateCommunityPack(value);
  if (!result.valid) throw new Error(result.errors.join("\n"));
  return value as CommunityPack;
}

export function readCommunityPacks(storage: Storage = localStorage): CommunityPack[] {
  try {
    const raw = storage.getItem(COMMUNITY_LIBRARY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CommunityPack => validateCommunityPack(item).valid);
  } catch {
    return [];
  }
}

export function writeCommunityPack(pack: CommunityPack, storage: Storage = localStorage): void {
  const result = validateCommunityPack(pack);
  if (!result.valid) throw new Error(result.errors.join("\n"));
  const packs = readCommunityPacks(storage);
  const next = [...packs.filter((item) => item.id !== pack.id), pack];
  storage.setItem(COMMUNITY_LIBRARY_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("rebirth-community-packs-changed"));
}

export function deleteCommunityPack(id: string, storage: Storage = localStorage): void {
  const packs = readCommunityPacks(storage).filter((item) => item.id !== id);
  storage.setItem(COMMUNITY_LIBRARY_KEY, JSON.stringify(packs));
  window.dispatchEvent(new CustomEvent("rebirth-community-packs-changed"));
}

export function createStarterCommunityPack(): CommunityPack {
  const now = new Date().toISOString();
  return {
    format: COMMUNITY_PACK_FORMAT,
    version: COMMUNITY_PACK_VERSION,
    id: `pack-${crypto.randomUUID()}`,
    title: "现金流与漂亮利润",
    author: "匿名研究员",
    description: "一个用于演示内容工坊和投委会模式的社区案例。",
    updatedAt: now,
    cases: [
      {
        id: `case-${crypto.randomUUID()}`,
        title: "利润增长，现金流下降",
        context: "一家企业披露利润高速增长，但经营现金流持续下降，应收账款和渠道库存同时上升。",
        futureMemory: "你记得它后来经历了一次收入确认口径调整，但记忆里没有完整审计过程。",
        fundamentalHypothesis: "收入质量正在恶化，需要核对合同、回款和渠道库存。",
        quantitativeHypothesis: "财报后量价没有确认，资金对利润数字的信任有限。",
        riskHypothesis: "若现金流继续背离，估值需要按更悲观的回款情景重算。",
        outcome: "后续审计确认部分收入确认过早，利润被回溯调整，现金流背离是更早的警报。",
        decisions: [
          {
            id: `decision-${crypto.randomUUID()}`,
            label: "拆合同、回款和渠道库存",
            description: "先验证收入质量，再决定是否接受利润增长叙事。",
            method: "fundamental_research",
            quality: "sound",
            evidence: 17,
            clarity: 16,
            risk: 14,
            reflection: 7,
          },
          {
            id: `decision-${crypto.randomUUID()}`,
            label: "顺着利润增速做乐观路演",
            description: "利用漂亮利润争取当期关注，暂时弱化现金流疑点。",
            method: "communication",
            quality: "reckless",
            evidence: 4,
            clarity: 8,
            risk: 2,
            reflection: 2,
          },
        ],
      },
    ],
  };
}

function methodCategory(method: DecisionMethod): ResearchDecision["category"] {
  if (method === "fundamental_research") return "deep_research";
  if (method === "field_research") return "expert_interview";
  if (method === "communication") return "roadshow";
  if (method === "risk_management" || method === "market_chasing") return "risk_alert";
  if (method === "self_management") return "self_care";
  if (method === "collaboration") return "help_colleague";
  if (method === "committee_process") return "committee_defense";
  return "data_deep_dive";
}

export function communityDecisionToResearchDecision(
  decision: CommunityDecision,
): ResearchDecision {
  return {
    id: decision.id,
    label: decision.label,
    category: methodCategory(decision.method),
    method: decision.method,
    quality: decision.quality,
    outcomeAlignment: decision.quality === "reckless" ? "contradicts" : "mixed",
    behaviorTags: decision.quality === "reckless" ? ["thin_evidence"] : ["hypothesis_driven"],
    description: decision.description,
    evidenceLevel: decision.evidence,
    clarityLevel: decision.clarity,
    riskAwareness: decision.risk,
    reflectionValue: decision.reflection,
    effects: {
      researchCredibility: decision.quality === "sound" ? 6 : decision.quality === "mixed" ? 2 : -5,
      committeeAdoption: decision.quality === "sound" ? 4 : 0,
      portfolioNav: 0,
      viewAccuracy: decision.quality === "sound" ? 4 : 0,
      clientFeedback: decision.method === "communication" ? 4 : 0,
      teamTrust: decision.quality === "reckless" ? -3 : 3,
      fatigue: 3,
      lifeBalance: -1,
      characterRelations: [],
    },
  };
}
