import type {
  CharacterId,
  GameState,
  ResearchDecision,
  RoundResult,
} from "../types";
import { decisionMethod } from "./narrativeSemantics";
import { investigationDecisionBonus } from "./rebirthDecisionBonus";

export const REBIRTH_META_KEY_PREFIX = "rebirthMeta:v1:";

export type MemoryKeyId =
  | "causal_gap"
  | "sample_pollution"
  | "body_memory"
  | "opportunity_cost";

export type ResearchShortcutId =
  | "lin_contact_book"
  | "zhao_factor_pipeline"
  | "zhou_risk_template";

export type InvestigationNodeId =
  | "public_materials"
  | "financial_model"
  | "cio_calls"
  | "factor_crowding"
  | "risk_review"
  | "rest"
  | "unit_economics"
  | "raw_factor_check"
  | "staged_entry";

export type InvestigationClueId =
  | "cost_drop"
  | "margin_gap"
  | "payment_split"
  | "crowding_signal"
  | "competition_risk"
  | "clear_head"
  | "unit_economics"
  | "raw_factor_sample"
  | "staged_entry";

export interface InvestigationProgress {
  monthKey: string;
  timeBudget: number;
  timeSpent: number;
  completedNodeIds: InvestigationNodeId[];
  clueIds: InvestigationClueId[];
}

export interface CycleRecord {
  cycle: number;
  endingId: string;
  averageReasoning: number;
  unlocked: string[];
}

export interface RebirthMetaState {
  version: 1;
  year: string;
  cycle: number;
  memoryKeys: MemoryKeyId[];
  shortcuts: ResearchShortcutId[];
  contradictions: string[];
  seenEndingIds: string[];
  completedCycles: CycleRecord[];
  lastCycleUnlocks: string[];
  investigation: InvestigationProgress | null;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface InvestigationEffects {
  researchCredibility?: number;
  teamTrust?: number;
  fatigue?: number;
  lifeBalance?: number;
  relations?: Partial<Record<CharacterId, number>>;
}

interface InvestigationNodeDefinition {
  id: InvestigationNodeId;
  label: string;
  summary: string;
  cost: number;
  clueId: InvestigationClueId;
  clue: string;
  requiresCompleted?: InvestigationNodeId[];
  requiresKey?: MemoryKeyId;
  shortcut?: ResearchShortcutId;
  effects?: InvestigationEffects;
}

export interface InvestigationNodeView {
  id: InvestigationNodeId;
  label: string;
  summary: string;
  clue: string;
  cost: number;
  completed: boolean;
  lockedReason: string | null;
  shortcutLabel: string | null;
}

export interface RebirthTransition {
  meta: RebirthMetaState;
  state: GameState;
  changed: boolean;
}

export const MEMORY_KEYS: Record<MemoryKeyId, { label: string; description: string }> = {
  causal_gap: {
    label: "因果缺口",
    description: "你开始追问结论中间缺失的变量，可调查单位经济性与利润传导。",
  },
  sample_pollution: {
    label: "样本污染",
    description: "你记住了漂亮回测也可能来自筛选偏差，可检查原始样本与异常区间。",
  },
  body_memory: {
    label: "身体记忆",
    description: "透支留下了比结论更诚实的记忆，本周目第一次主动休息不消耗时间。",
  },
  opportunity_cost: {
    label: "机会成本",
    description: "谨慎同样有代价，可调查分阶段进入和观察仓方案。",
  },
};

export const RESEARCH_SHORTCUTS: Record<ResearchShortcutId, { label: string; description: string }> = {
  lin_contact_book: {
    label: "产业联系人簿",
    description: "林若宁留下稳定的调研渠道，CIO 访谈少消耗一个时间块。",
  },
  zhao_factor_pipeline: {
    label: "自动回测管线",
    description: "赵承宇把数据口径固化成脚本，因子调查少消耗一个时间块。",
  },
  zhou_risk_template: {
    label: "风险审查模板",
    description: "周明昭留下压力测试清单，风险讨论少消耗一个时间块。",
  },
};

export const CONTRADICTIONS: Record<string, { label: string; description: string }> = {
  memory_source_mismatch: {
    label: "记忆来源不明",
    description: "你记得调用量暴增，却想不起利润数据。那段记忆更像后来反复出现的财经标题。",
  },
  record_mismatch: {
    label: "档案与记忆不一致",
    description: "研究档案记录了推导缺口，你的主观记忆却只留下了结论正确。",
  },
  office_residue: {
    label: "没有重置的白板字迹",
    description: "新周目的办公室恢复原样，白板角落却还留着一句“调用量涨得比利润快”。",
  },
};

const CLUES: Record<InvestigationClueId, { label: string; description: string }> = {
  cost_drop: {
    label: "调用成本骤降",
    description: "发布材料证明单位调用价格快速下降，但没有说明利润如何分配。",
  },
  margin_gap: {
    label: "收入与利润断层",
    description: "调用增长可能被单价下滑和竞争投入抵消，收入增长不自动等于利润增长。",
  },
  payment_split: {
    label: "付费意愿分化",
    description: "大型企业愿意试点，中小客户仍在观望，部署能力决定付费转化。",
  },
  crowding_signal: {
    label: "动量拥挤",
    description: "短期收益主要由动量因子解释，成交结构仍强，但拥挤正在积累。",
  },
  competition_risk: {
    label: "赢家诅咒",
    description: "成本下降也降低进入壁垒，最热门的应用可能承受最激烈的竞争。",
  },
  clear_head: {
    label: "清醒输入",
    description: "停止继续摄入噪声后，你能更准确地区分自己知道什么、只是记得什么。",
  },
  unit_economics: {
    label: "单位经济性",
    description: "把调用量、单价、毛利和获客投入放进同一张敏感性表，商业化节奏终于可检验。",
  },
  raw_factor_sample: {
    label: "原始失败区间",
    description: "完整样本显示热门因子在拥挤后的回撤远高于精选回测。",
  },
  staged_entry: {
    label: "观察仓方案",
    description: "先保留小仓位验证，再根据订单与利润数据增加暴露，降低等待的机会成本。",
  },
};

const INVESTIGATION_NODES: InvestigationNodeDefinition[] = [
  {
    id: "public_materials",
    label: "阅读发布材料和公开报道",
    summary: "先确认技术突破与调用价格变化，避免拿二手情绪当原始事实。",
    cost: 1,
    clueId: "cost_drop",
    clue: CLUES.cost_drop.description,
  },
  {
    id: "financial_model",
    label: "拆应用公司的收入与成本模型",
    summary: "把调用量、单价、毛利率和获客投入拆开，寻找商业化传导缺口。",
    cost: 2,
    clueId: "margin_gap",
    clue: CLUES.margin_gap.description,
    requiresCompleted: ["public_materials"],
    effects: { researchCredibility: 2, fatigue: 2 },
  },
  {
    id: "cio_calls",
    label: "联系企业 CIO 做电话调研",
    summary: "绕过概念宣传，询问预算、部署难度和真实续费意愿。",
    cost: 2,
    clueId: "payment_split",
    clue: CLUES.payment_split.description,
    shortcut: "lin_contact_book",
    effects: {
      teamTrust: 1,
      fatigue: 1,
      relations: { lin_ruoning: 1 },
    },
  },
  {
    id: "factor_crowding",
    label: "在量化终端检查因子拥挤",
    summary: "拆解收益来源、盘口厚度和 Alpha 衰减，判断短期强势有多少来自情绪。",
    cost: 2,
    clueId: "crowding_signal",
    clue: CLUES.crowding_signal.description,
    shortcut: "zhao_factor_pipeline",
    effects: {
      researchCredibility: 1,
      fatigue: 2,
      relations: { chen_xinghe: 1, zhao_chengyu: 1 },
    },
  },
  {
    id: "risk_review",
    label: "和周明昭做竞争与下行情景",
    summary: "讨论成本下降如何改变进入壁垒，并提前写清错误边界。",
    cost: 1,
    clueId: "competition_risk",
    clue: CLUES.competition_risk.description,
    shortcut: "zhou_risk_template",
    effects: { relations: { zhou_mingzhao: 1 } },
  },
  {
    id: "rest",
    label: "停止刷屏，准时休息",
    summary: "把一个时间块留给睡眠，让明天的判断不再接收被疲劳污染的输入。",
    cost: 1,
    clueId: "clear_head",
    clue: CLUES.clear_head.description,
    effects: { fatigue: -8, lifeBalance: 8 },
  },
  {
    id: "unit_economics",
    label: "建立单位经济性敏感性表",
    summary: "利用上一周目的因果缺口，把调用量增长和利润增长放进同一套可证伪模型。",
    cost: 1,
    clueId: "unit_economics",
    clue: CLUES.unit_economics.description,
    requiresKey: "causal_gap",
    requiresCompleted: ["financial_model"],
    effects: { researchCredibility: 2, fatigue: 1 },
  },
  {
    id: "raw_factor_check",
    label: "恢复回测中的失败区间",
    summary: "利用样本污染记忆，检查被筛掉的月份、异常值和拥挤后的回撤。",
    cost: 1,
    clueId: "raw_factor_sample",
    clue: CLUES.raw_factor_sample.description,
    requiresKey: "sample_pollution",
    requiresCompleted: ["factor_crowding"],
    effects: { researchCredibility: 1, fatigue: 1 },
  },
  {
    id: "staged_entry",
    label: "设计观察仓与分阶段验证",
    summary: "利用机会成本记忆，把等待和追涨之间的二选一改成可调整的路径。",
    cost: 1,
    clueId: "staged_entry",
    clue: CLUES.staged_entry.description,
    requiresKey: "opportunity_cost",
    requiresCompleted: ["risk_review"],
    effects: { researchCredibility: 1 },
  },
];

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMemoryKey(value: unknown): value is MemoryKeyId {
  return typeof value === "string" && value in MEMORY_KEYS;
}

function isShortcut(value: unknown): value is ResearchShortcutId {
  return typeof value === "string" && value in RESEARCH_SHORTCUTS;
}

function isInvestigationNodeId(value: unknown): value is InvestigationNodeId {
  return typeof value === "string" && INVESTIGATION_NODES.some((node) => node.id === value);
}

function isClueId(value: unknown): value is InvestigationClueId {
  return typeof value === "string" && value in CLUES;
}

function initialInvestigation(year: string): InvestigationProgress | null {
  if (year !== "2025") return null;
  return {
    monthKey: "2025-01",
    timeBudget: 6,
    timeSpent: 0,
    completedNodeIds: [],
    clueIds: [],
  };
}

export function createRebirthMeta(year: string): RebirthMetaState {
  return {
    version: 1,
    year,
    cycle: 1,
    memoryKeys: [],
    shortcuts: [],
    contradictions: [],
    seenEndingIds: [],
    completedCycles: [],
    lastCycleUnlocks: [],
    investigation: initialInvestigation(year),
  };
}

function restoreInvestigation(value: unknown, year: string): InvestigationProgress | null {
  const fallback = initialInvestigation(year);
  if (!fallback || !isObject(value)) return fallback;
  return {
    monthKey: typeof value.monthKey === "string" ? value.monthKey : fallback.monthKey,
    timeBudget: typeof value.timeBudget === "number" ? value.timeBudget : fallback.timeBudget,
    timeSpent: typeof value.timeSpent === "number" ? value.timeSpent : fallback.timeSpent,
    completedNodeIds: Array.isArray(value.completedNodeIds)
      ? value.completedNodeIds.filter(isInvestigationNodeId)
      : [],
    clueIds: Array.isArray(value.clueIds) ? value.clueIds.filter(isClueId) : [],
  };
}

export function restoreRebirthMeta(year: string, parsed: unknown): RebirthMetaState {
  const fresh = createRebirthMeta(year);
  if (!isObject(parsed) || parsed.year !== year) return fresh;
  return {
    ...fresh,
    cycle: typeof parsed.cycle === "number" && parsed.cycle >= 1 ? Math.floor(parsed.cycle) : 1,
    memoryKeys: Array.isArray(parsed.memoryKeys) ? unique(parsed.memoryKeys.filter(isMemoryKey)) : [],
    shortcuts: Array.isArray(parsed.shortcuts) ? unique(parsed.shortcuts.filter(isShortcut)) : [],
    contradictions: Array.isArray(parsed.contradictions)
      ? unique(parsed.contradictions.filter((item): item is string => typeof item === "string"))
      : [],
    seenEndingIds: Array.isArray(parsed.seenEndingIds)
      ? unique(parsed.seenEndingIds.filter((item): item is string => typeof item === "string"))
      : [],
    completedCycles: Array.isArray(parsed.completedCycles)
      ? parsed.completedCycles.filter(isObject).map((record) => ({
        cycle: typeof record.cycle === "number" ? record.cycle : 1,
        endingId: typeof record.endingId === "string" ? record.endingId : "ordinary",
        averageReasoning: typeof record.averageReasoning === "number" ? record.averageReasoning : 0,
        unlocked: Array.isArray(record.unlocked)
          ? record.unlocked.filter((item): item is string => typeof item === "string")
          : [],
      }))
      : [],
    lastCycleUnlocks: Array.isArray(parsed.lastCycleUnlocks)
      ? parsed.lastCycleUnlocks.filter((item): item is string => typeof item === "string")
      : [],
    investigation: restoreInvestigation(parsed.investigation, year),
  };
}

export function readRebirthMeta(storage: StorageLike, year: string): RebirthMetaState {
  try {
    const raw = storage.getItem(`${REBIRTH_META_KEY_PREFIX}${year}`);
    return raw ? restoreRebirthMeta(year, JSON.parse(raw) as unknown) : createRebirthMeta(year);
  } catch {
    return createRebirthMeta(year);
  }
}

export function persistRebirthMeta(storage: StorageLike, meta: RebirthMetaState): void {
  storage.setItem(`${REBIRTH_META_KEY_PREFIX}${meta.year}`, JSON.stringify(meta));
}

export function resetRebirthRun(meta: RebirthMetaState): RebirthMetaState {
  return {
    ...meta,
    lastCycleUnlocks: [],
    investigation: initialInvestigation(meta.year),
  };
}

function effectiveCost(node: InvestigationNodeDefinition, meta: RebirthMetaState): number {
  if (node.id === "rest" && meta.memoryKeys.includes("body_memory")) return 0;
  if (node.shortcut && meta.shortcuts.includes(node.shortcut)) return Math.max(0, node.cost - 1);
  return node.cost;
}

function remainingTime(meta: RebirthMetaState): number {
  const investigation = meta.investigation;
  return investigation ? Math.max(0, investigation.timeBudget - investigation.timeSpent) : 0;
}

function lockedReason(
  node: InvestigationNodeDefinition,
  meta: RebirthMetaState,
): string | null {
  const investigation = meta.investigation;
  if (!investigation) return "当前年份没有调查关卡";
  if (node.requiresKey && !meta.memoryKeys.includes(node.requiresKey)) {
    return `需要记忆钥匙：${MEMORY_KEYS[node.requiresKey].label}`;
  }
  const missing = node.requiresCompleted?.find((id) => !investigation.completedNodeIds.includes(id));
  if (missing) {
    const requirement = INVESTIGATION_NODES.find((candidate) => candidate.id === missing);
    return `先完成：${requirement?.label ?? missing}`;
  }
  const cost = effectiveCost(node, meta);
  if (remainingTime(meta) < cost) return `还需要 ${cost} 个时间块`;
  return null;
}

export function isInvestigationActive(meta: RebirthMetaState, state: GameState): boolean {
  return meta.year === "2025"
    && state.year === "2025"
    && state.monthIndex === 0
    && !state.locked
    && meta.investigation?.monthKey === "2025-01";
}

export function investigationNodeViews(
  meta: RebirthMetaState,
  state: GameState,
): InvestigationNodeView[] {
  if (!isInvestigationActive(meta, state)) return [];
  return INVESTIGATION_NODES.map((node) => {
    const completed = meta.investigation?.completedNodeIds.includes(node.id) ?? false;
    const shortcutLabel = node.id === "rest" && meta.memoryKeys.includes("body_memory")
      ? MEMORY_KEYS.body_memory.label
      : node.shortcut && meta.shortcuts.includes(node.shortcut)
        ? RESEARCH_SHORTCUTS[node.shortcut].label
        : null;
    return {
      id: node.id,
      label: node.label,
      summary: node.summary,
      clue: node.clue,
      cost: effectiveCost(node, meta),
      completed,
      lockedReason: completed ? null : lockedReason(node, meta),
      shortcutLabel,
    };
  });
}

function clampMetric(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function applyEffects(state: GameState, effects: InvestigationEffects | undefined): GameState {
  if (!effects) return state;
  const relations = { ...state.relations };
  for (const [characterId, delta] of Object.entries(effects.relations ?? {}) as Array<[CharacterId, number]>) {
    relations[characterId] = clampMetric((relations[characterId] ?? 0) + delta);
  }
  return {
    ...state,
    researchCredibility: clampMetric(state.researchCredibility + (effects.researchCredibility ?? 0)),
    teamTrust: clampMetric(state.teamTrust + (effects.teamTrust ?? 0)),
    fatigue: clampMetric(state.fatigue + (effects.fatigue ?? 0)),
    lifeBalance: clampMetric(state.lifeBalance + (effects.lifeBalance ?? 0)),
    relations,
    flags: { ...state.flags, investigation_used: true },
  };
}

export function performInvestigation(
  meta: RebirthMetaState,
  state: GameState,
  nodeId: InvestigationNodeId,
): RebirthTransition {
  if (!isInvestigationActive(meta, state)) return { meta, state, changed: false };
  const node = INVESTIGATION_NODES.find((candidate) => candidate.id === nodeId);
  if (!node || meta.investigation?.completedNodeIds.includes(nodeId) || lockedReason(node, meta)) {
    return { meta, state, changed: false };
  }
  const investigation = meta.investigation;
  if (!investigation) return { meta, state, changed: false };
  const nextMeta: RebirthMetaState = {
    ...meta,
    investigation: {
      ...investigation,
      timeSpent: investigation.timeSpent + effectiveCost(node, meta),
      completedNodeIds: [...investigation.completedNodeIds, node.id],
      clueIds: unique([...investigation.clueIds, node.clueId]),
    },
  };
  return {
    meta: nextMeta,
    state: applyEffects(state, node.effects),
    changed: true,
  };
}

function specialUnitEconomicsDecision(): ResearchDecision {
  return {
    id: "2025jan-unit-economics-plan",
    label: "做单位经济性敏感度模型：调用量 × 单价 × 毛利",
    category: "data_deep_dive",
    method: "quantitative_research",
    quality: "sound",
    outcomeAlignment: "supports",
    behaviorTags: ["hypothesis_driven", "crowding_aware"],
    description: "把未来记忆拆成可证伪的经营模型，同时检查调用量增长能否覆盖单价下降和竞争投入。",
    effects: {
      researchCredibility: 12,
      committeeAdoption: 8,
      portfolioNav: 0.012,
      viewAccuracy: 10,
      clientFeedback: 6,
      teamTrust: 7,
      fatigue: 8,
      lifeBalance: -4,
      characterRelations: [
        { characterId: "lin_ruoning", value: 5 },
        { characterId: "chen_xinghe", value: 5 },
      ],
    },
    evidenceLevel: 18,
    clarityLevel: 18,
    riskAwareness: 14,
    reflectionValue: 9,
    backgroundNote: "调用量确实快速增长，但单位成本与竞争投入下降得更快。模型提前暴露了收入与利润的断层。",
    framework: "lin_ruoning",
    businessAngle: "单位经济性与利润传导",
  };
}

function specialStagedEntryDecision(): ResearchDecision {
  return {
    id: "2025jan-staged-entry-plan",
    label: "先建观察仓，按订单与利润验证分阶段增加暴露",
    category: "risk_alert",
    method: "risk_management",
    quality: "sound",
    outcomeAlignment: "supports",
    behaviorTags: ["downside_defined", "hypothesis_driven"],
    description: "把追涨和等待改成可调整路径，先用小暴露验证，再按业务数据增加权重。",
    effects: {
      researchCredibility: 9,
      committeeAdoption: 7,
      portfolioNav: 0.008,
      viewAccuracy: 8,
      clientFeedback: 5,
      teamTrust: 8,
      fatigue: 4,
      lifeBalance: -1,
      characterRelations: [{ characterId: "zhou_mingzhao", value: 8 }],
    },
    evidenceLevel: 14,
    clarityLevel: 17,
    riskAwareness: 19,
    reflectionValue: 10,
    backgroundNote: "观察仓没有吃满短期涨幅，却保留了验证空间，也避免在商业化分化时承担全部回撤。",
    framework: "zhou_mingzhao",
    businessAngle: "分阶段进入与错误边界",
  };
}

export function decisionOptionsForRebirth(
  meta: RebirthMetaState,
  state: GameState,
  base: ResearchDecision[],
): ResearchDecision[] {
  if (state.year !== "2025" || state.monthIndex !== 0 || state.locked) return base;
  const completed = meta.investigation?.completedNodeIds ?? [];
  const extra: ResearchDecision[] = [];
  if (completed.includes("unit_economics")) extra.push(specialUnitEconomicsDecision());
  if (completed.includes("staged_entry")) extra.push(specialStagedEntryDecision());
  const ids = new Set(base.map((decision) => decision.id));
  return [...base, ...extra.filter((decision) => !ids.has(decision.id))];
}

export function prepareDecisionForRebirth(
  meta: RebirthMetaState,
  state: GameState,
  decision: ResearchDecision,
): ResearchDecision {
  if (state.year !== "2025" || state.monthIndex !== 0) return decision;
  const bonus = investigationDecisionBonus(meta, decisionMethod(decision));
  return {
    ...decision,
    evidenceLevel: Math.min(20, decision.evidenceLevel + bonus.evidence),
    clarityLevel: Math.min(20, decision.clarityLevel + bonus.clarity),
    riskAwareness: Math.min(20, decision.riskAwareness + bonus.risk),
    reflectionValue: Math.min(15, decision.reflectionValue + bonus.reflection),
    effects: {
      ...decision.effects,
      fatigue: decision.effects.fatigue + bonus.fatigue,
      characterRelations: [...decision.effects.characterRelations],
    },
  };
}

function averageReasoning(history: RoundResult[]): number {
  const scores = history.flatMap((result) => result.score ? [result.score.reasoningScore] : []);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}

function endingIdFor(state: GameState): string {
  if (state.fatigue >= 85 || state.flags.route_burnout) return "burnout";
  if (state.history.some((result) => result.isParachuted)) return "parachuted";
  if (state.flags.route_balanced) return "balanced";
  if (state.flags.route_relation) return "relation";
  if (state.flags.route_research) return "research";
  if (state.researchCredibility >= 80 && state.teamTrust >= 70) return "trusted_researcher";
  return "ordinary";
}

function earnedMemoryKeys(state: GameState): MemoryKeyId[] {
  const keys: MemoryKeyId[] = [];
  const reasoning = state.history.map((result) => result.score?.reasoningScore ?? 25);
  if (state.history.some((result) => result.isParachuted) || reasoning.some((score) => score <= 14)) {
    keys.push("causal_gap");
  }
  if ((state.methodCounts.quantitative_research ?? 0) >= 3
    || state.history.some((result) => result.selected.id.includes("hype"))) {
    keys.push("sample_pollution");
  }
  if (state.fatigue >= 70 || state.flags.route_burnout) keys.push("body_memory");
  if ((state.methodCounts.risk_management ?? 0) >= 3
    || state.flags.route_balanced) {
    keys.push("opportunity_cost");
  }
  return keys.length > 0 ? unique(keys) : ["causal_gap"];
}

function earnedShortcuts(state: GameState): ResearchShortcutId[] {
  const shortcuts: ResearchShortcutId[] = [];
  if ((state.relations.lin_ruoning ?? 0) >= 60 || (state.methodCounts.field_research ?? 0) >= 3) {
    shortcuts.push("lin_contact_book");
  }
  if ((state.relations.zhao_chengyu ?? 0) >= 40 || state.flags.helped_zhao) {
    shortcuts.push("zhao_factor_pipeline");
  }
  if ((state.relations.zhou_mingzhao ?? 0) >= 60 || (state.methodCounts.risk_management ?? 0) >= 3) {
    shortcuts.push("zhou_risk_template");
  }
  return shortcuts;
}

function earnedContradictions(meta: RebirthMetaState, state: GameState): string[] {
  const contradictions: string[] = [];
  if (meta.cycle === 1) contradictions.push("memory_source_mismatch");
  if (state.history.some((result) => result.isParachuted)) contradictions.push("record_mismatch");
  if (meta.cycle >= 2) contradictions.push("office_residue");
  return contradictions;
}

function unlockLabels(keys: MemoryKeyId[], shortcuts: ResearchShortcutId[], contradictions: string[]): string[] {
  return [
    ...keys.map((id) => `记忆钥匙：${MEMORY_KEYS[id].label}`),
    ...shortcuts.map((id) => `研究捷径：${RESEARCH_SHORTCUTS[id].label}`),
    ...contradictions.map((id) => `异常档案：${CONTRADICTIONS[id]?.label ?? id}`),
  ];
}

export function completeRebirthCycle(
  meta: RebirthMetaState,
  state: GameState,
): RebirthMetaState {
  const keys = earnedMemoryKeys(state).filter((id) => !meta.memoryKeys.includes(id));
  const shortcuts = earnedShortcuts(state).filter((id) => !meta.shortcuts.includes(id));
  const contradictions = earnedContradictions(meta, state)
    .filter((id) => !meta.contradictions.includes(id));
  const unlocked = unlockLabels(keys, shortcuts, contradictions);
  const endingId = endingIdFor(state);
  return {
    ...meta,
    cycle: meta.cycle + 1,
    memoryKeys: unique([...meta.memoryKeys, ...keys]),
    shortcuts: unique([...meta.shortcuts, ...shortcuts]),
    contradictions: unique([...meta.contradictions, ...contradictions]),
    seenEndingIds: unique([...meta.seenEndingIds, endingId]),
    completedCycles: [
      ...meta.completedCycles,
      {
        cycle: meta.cycle,
        endingId,
        averageReasoning: averageReasoning(state.history),
        unlocked,
      },
    ],
    lastCycleUnlocks: unlocked,
    investigation: initialInvestigation(meta.year),
  };
}

export function investigationClues(meta: RebirthMetaState): Array<{ id: string; label: string; description: string }> {
  return (meta.investigation?.clueIds ?? []).map((id) => ({ id, ...CLUES[id] }));
}

export function memoryKeyEntries(meta: RebirthMetaState) {
  return meta.memoryKeys.map((id) => ({ id, ...MEMORY_KEYS[id] }));
}

export function shortcutEntries(meta: RebirthMetaState) {
  return meta.shortcuts.map((id) => ({ id, ...RESEARCH_SHORTCUTS[id] }));
}

export function contradictionEntries(meta: RebirthMetaState) {
  return meta.contradictions.map((id) => ({
    id,
    label: CONTRADICTIONS[id]?.label ?? id,
    description: CONTRADICTIONS[id]?.description ?? "这条异常还没有完成解释。",
  }));
}

export function memorySourceNote(meta: RebirthMetaState): string {
  if (meta.cycle === 1) {
    return "记忆来源：无法确认。你只记得结论，想不起当时能看到哪些原始数据。";
  }
  if (meta.contradictions.includes("memory_source_mismatch")) {
    return "记忆来源疑点：这更像三个月后的财经标题。调用量很清楚，利润数据却始终模糊。";
  }
  return "记忆来源仍待核验。已经知道结果，不代表知道当时成立的证据。";
}
