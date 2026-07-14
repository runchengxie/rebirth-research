import type {
  CharacterId,
  DecisionMethod,
  GameState,
  ResearchDecision,
  RoundResult,
} from "../types";
import { decisionMethod } from "./narrativeSemantics";
import { investigationDecisionBonus } from "./rebirthDecisionBonus";
import {
  CLUES,
  INVESTIGATION_NODES,
  chapterForMonth,
} from "./rebirthInvestigationData";
import { specialDecisionsForInvestigation } from "./rebirthSpecialDecisions";
import {
  createRebirthTimelineState,
  restoreRebirthTimelineState,
  type RebirthTimelineState,
} from "./rebirthTimelineState";

export const REBIRTH_META_KEY_PREFIX = "rebirthMeta:v3:";
export const LEGACY_REBIRTH_META_V2_KEY_PREFIX = "rebirthMeta:v2:";
export const LEGACY_REBIRTH_META_KEY_PREFIX = "rebirthMeta:v1:";

export type MemoryKeyId =
  | "causal_gap"
  | "sample_pollution"
  | "body_memory"
  | "opportunity_cost";

export type ResearchShortcutId =
  | "lin_contact_book"
  | "zhao_factor_pipeline"
  | "zhou_risk_template";

export type InvestigationNodeId = string;
export type InvestigationClueId = string;
export type InvestigationReliability =
  | "lead"
  | "verified"
  | "counterexample"
  | "state";

export interface InvestigationClueDefinition {
  label: string;
  description: string;
  reliability: InvestigationReliability;
}

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
  version: 3;
  year: string;
  cycle: number;
  memoryKeys: MemoryKeyId[];
  shortcuts: ResearchShortcutId[];
  contradictions: string[];
  seenEndingIds: string[];
  completedCycles: CycleRecord[];
  lastCycleUnlocks: string[];
  investigations: Record<string, InvestigationProgress>;
  readSceneNodeIds: string[];
  officeDiscoveries: string[];
  timeline: RebirthTimelineState;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface InvestigationEffects {
  researchCredibility?: number;
  teamTrust?: number;
  fatigue?: number;
  lifeBalance?: number;
  relations?: Partial<Record<CharacterId, number>>;
}

export interface InvestigationNodeDefinition {
  id: InvestigationNodeId;
  label: string;
  summary: string;
  cost: number;
  clueId: InvestigationClueId;
  requiresCompleted?: InvestigationNodeId[];
  requiresKey?: MemoryKeyId;
  requiresAnyKey?: MemoryKeyId[];
  requiresCycle?: number;
  shortcut?: ResearchShortcutId;
  requiresShortcut?: ResearchShortcutId;
  requiresFlag?: string;
  effects?: InvestigationEffects;
}

export interface InvestigationChapterDefinition {
  monthKey: string;
  title: string;
  thesis: string;
  timeBudget: number;
  keyMonth: boolean;
  nodes: InvestigationNodeDefinition[];
}

export interface InvestigationNodeView {
  id: InvestigationNodeId;
  label: string;
  summary: string;
  clue: string;
  reliability: InvestigationReliability;
  reliabilityLabel: string;
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

export const RESEARCH_SHORTCUTS: Record<
  ResearchShortcutId,
  { label: string; description: string }
> = {
  lin_contact_book: {
    label: "产业联系人簿",
    description: "林若宁留下稳定的调研渠道，产业访谈少消耗一个时间块。",
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
    description: "新周目的办公室恢复原样，白板角落却还留着一句调用量涨得比利润快。",
  },
};

const RELIABILITY_LABELS: Record<InvestigationReliability, string> = {
  lead: "待验证线索",
  verified: "已验证证据",
  counterexample: "反例",
  state: "状态记录",
};

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

function currentMonthKey(state: GameState): string {
  return `${state.year}-${String(state.monthIndex + 1).padStart(2, "0")}`;
}

function initialProgress(monthKey: string): InvestigationProgress | null {
  const chapter = chapterForMonth(monthKey);
  if (!chapter) return null;
  return {
    monthKey,
    timeBudget: chapter.timeBudget,
    timeSpent: 0,
    completedNodeIds: [],
    clueIds: [],
  };
}

export function createRebirthMeta(year: string): RebirthMetaState {
  return {
    version: 3,
    year,
    cycle: 1,
    memoryKeys: [],
    shortcuts: [],
    contradictions: [],
    seenEndingIds: [],
    completedCycles: [],
    lastCycleUnlocks: [],
    investigations: {},
    readSceneNodeIds: [],
    officeDiscoveries: [],
    timeline: createRebirthTimelineState(),
  };
}

function restoreProgress(value: unknown, monthKey: string): InvestigationProgress | null {
  const fallback = initialProgress(monthKey);
  if (!fallback || !isObject(value)) return fallback;
  return {
    monthKey,
    timeBudget: typeof value.timeBudget === "number"
      ? value.timeBudget
      : fallback.timeBudget,
    timeSpent: typeof value.timeSpent === "number" ? value.timeSpent : 0,
    completedNodeIds: Array.isArray(value.completedNodeIds)
      ? value.completedNodeIds.filter((item): item is string => typeof item === "string")
      : [],
    clueIds: Array.isArray(value.clueIds)
      ? value.clueIds.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function restoreInvestigations(parsed: Record<string, unknown>): Record<string, InvestigationProgress> {
  const restored: Record<string, InvestigationProgress> = {};
  if (isObject(parsed.investigations)) {
    for (const [monthKey, value] of Object.entries(parsed.investigations)) {
      const progress = restoreProgress(value, monthKey);
      if (progress) restored[monthKey] = progress;
    }
  }
  if (isObject(parsed.investigation)) {
    const legacyMonthKey = typeof parsed.investigation.monthKey === "string"
      ? parsed.investigation.monthKey
      : "2025-01";
    const legacy = restoreProgress(parsed.investigation, legacyMonthKey);
    if (legacy && !restored[legacyMonthKey]) restored[legacyMonthKey] = legacy;
  }
  return restored;
}

export function restoreRebirthMeta(year: string, parsed: unknown): RebirthMetaState {
  const fresh = createRebirthMeta(year);
  if (!isObject(parsed) || parsed.year !== year) return fresh;
  return {
    ...fresh,
    cycle: typeof parsed.cycle === "number" && parsed.cycle >= 1
      ? Math.floor(parsed.cycle)
      : 1,
    memoryKeys: Array.isArray(parsed.memoryKeys)
      ? unique(parsed.memoryKeys.filter(isMemoryKey))
      : [],
    shortcuts: Array.isArray(parsed.shortcuts)
      ? unique(parsed.shortcuts.filter(isShortcut))
      : [],
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
          averageReasoning: typeof record.averageReasoning === "number"
            ? record.averageReasoning
            : 0,
          unlocked: Array.isArray(record.unlocked)
            ? record.unlocked.filter((item): item is string => typeof item === "string")
            : [],
        }))
      : [],
    lastCycleUnlocks: Array.isArray(parsed.lastCycleUnlocks)
      ? parsed.lastCycleUnlocks.filter((item): item is string => typeof item === "string")
      : [],
    investigations: restoreInvestigations(parsed),
    readSceneNodeIds: Array.isArray(parsed.readSceneNodeIds)
      ? unique(parsed.readSceneNodeIds.filter((item): item is string => typeof item === "string"))
      : [],
    officeDiscoveries: Array.isArray(parsed.officeDiscoveries)
      ? unique(parsed.officeDiscoveries.filter((item): item is string => typeof item === "string"))
      : [],
    timeline: restoreRebirthTimelineState(parsed.timeline),
  };
}

export function readRebirthMeta(storage: StorageLike, year: string): RebirthMetaState {
  for (const prefix of [
    REBIRTH_META_KEY_PREFIX,
    LEGACY_REBIRTH_META_V2_KEY_PREFIX,
    LEGACY_REBIRTH_META_KEY_PREFIX,
  ]) {
    try {
      const raw = storage.getItem(`${prefix}${year}`);
      if (raw) return restoreRebirthMeta(year, JSON.parse(raw) as unknown);
    } catch {
      // Try the older generation before returning a clean state.
    }
  }
  return createRebirthMeta(year);
}

export function persistRebirthMeta(storage: StorageLike, meta: RebirthMetaState): void {
  storage.setItem(`${REBIRTH_META_KEY_PREFIX}${meta.year}`, JSON.stringify(meta));
}

export function resetRebirthRun(meta: RebirthMetaState): RebirthMetaState {
  return {
    ...meta,
    lastCycleUnlocks: [],
    investigations: {},
  };
}

export function currentInvestigation(
  meta: RebirthMetaState,
  state: GameState,
): InvestigationProgress | null {
  const monthKey = currentMonthKey(state);
  return meta.investigations[monthKey] ?? initialProgress(monthKey);
}

export function currentInvestigationChapter(
  state: GameState,
): InvestigationChapterDefinition | null {
  return chapterForMonth(currentMonthKey(state));
}

function effectiveCost(
  node: InvestigationNodeDefinition,
  meta: RebirthMetaState,
): number {
  if (node.id === "rest" && meta.memoryKeys.includes("body_memory")) return 0;
  if (node.shortcut && meta.shortcuts.includes(node.shortcut)) {
    return Math.max(0, node.cost - 1);
  }
  return node.cost;
}

function remainingTime(progress: InvestigationProgress): number {
  return Math.max(0, progress.timeBudget - progress.timeSpent);
}

function flagIsSet(state: GameState, key: string): boolean {
  const value = state.flags[key];
  return value !== undefined && value !== false && value !== 0;
}

function metaRequirementReason(
  node: InvestigationNodeDefinition,
  meta: RebirthMetaState,
): string | null {
  if (node.requiresCycle && meta.cycle < node.requiresCycle) {
    return `需要第 ${node.requiresCycle} 周目`;
  }
  if (node.requiresKey && !meta.memoryKeys.includes(node.requiresKey)) {
    return `需要记忆钥匙：${MEMORY_KEYS[node.requiresKey].label}`;
  }
  if (node.requiresAnyKey
    && !node.requiresAnyKey.some((key) => meta.memoryKeys.includes(key))) {
    const labels = node.requiresAnyKey.map((key) => MEMORY_KEYS[key].label).join("或");
    return `需要记忆钥匙：${labels}`;
  }
  if (node.requiresShortcut && !meta.shortcuts.includes(node.requiresShortcut)) {
    return `需要研究捷径：${RESEARCH_SHORTCUTS[node.requiresShortcut].label}`;
  }
  return null;
}

function stateRequirementReason(
  node: InvestigationNodeDefinition,
  state: GameState,
): string | null {
  if (node.requiresFlag && !flagIsSet(state, node.requiresFlag)) {
    return "需要先在研究室完成对应档案整理";
  }
  return null;
}

function progressRequirementReason(
  node: InvestigationNodeDefinition,
  meta: RebirthMetaState,
  progress: InvestigationProgress,
): string | null {
  const missing = node.requiresCompleted?.find(
    (id) => !progress.completedNodeIds.includes(id),
  );
  if (missing) {
    const requirement = INVESTIGATION_NODES.find((candidate) => candidate.id === missing);
    return `先完成：${requirement?.label ?? missing}`;
  }
  const cost = effectiveCost(node, meta);
  return remainingTime(progress) < cost ? `还需要 ${cost} 个时间块` : null;
}

function lockedReason(
  node: InvestigationNodeDefinition,
  meta: RebirthMetaState,
  state: GameState,
  progress: InvestigationProgress,
): string | null {
  return metaRequirementReason(node, meta)
    ?? stateRequirementReason(node, state)
    ?? progressRequirementReason(node, meta, progress);
}

export function isInvestigationActive(
  meta: RebirthMetaState,
  state: GameState,
): boolean {
  return meta.year === state.year
    && Boolean(currentInvestigationChapter(state))
    && !state.locked;
}

export function investigationNodeViews(
  meta: RebirthMetaState,
  state: GameState,
): InvestigationNodeView[] {
  if (!isInvestigationActive(meta, state)) return [];
  const chapter = currentInvestigationChapter(state);
  const progress = currentInvestigation(meta, state);
  if (!chapter || !progress) return [];
  return chapter.nodes.map((node) => {
    const completed = progress.completedNodeIds.includes(node.id);
    const shortcutLabel = node.id === "rest" && meta.memoryKeys.includes("body_memory")
      ? MEMORY_KEYS.body_memory.label
      : node.shortcut && meta.shortcuts.includes(node.shortcut)
        ? RESEARCH_SHORTCUTS[node.shortcut].label
        : node.requiresShortcut && meta.shortcuts.includes(node.requiresShortcut)
          ? RESEARCH_SHORTCUTS[node.requiresShortcut].label
          : null;
    const clue = CLUES[node.clueId];
    return {
      id: node.id,
      label: node.label,
      summary: node.summary,
      clue: clue?.description ?? "这条线索仍待整理。",
      reliability: clue?.reliability ?? "lead",
      reliabilityLabel: RELIABILITY_LABELS[clue?.reliability ?? "lead"],
      cost: effectiveCost(node, meta),
      completed,
      lockedReason: completed ? null : lockedReason(node, meta, state, progress),
      shortcutLabel,
    };
  });
}

function clampMetric(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function applyEffects(
  state: GameState,
  effects: InvestigationEffects | undefined,
): GameState {
  if (!effects) return state;
  const relations = { ...state.relations };
  for (const [characterId, delta] of Object.entries(effects.relations ?? {}) as Array<[
    CharacterId,
    number,
  ]>) {
    relations[characterId] = clampMetric((relations[characterId] ?? 0) + delta);
  }
  return {
    ...state,
    researchCredibility: clampMetric(
      state.researchCredibility + (effects.researchCredibility ?? 0),
    ),
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
  const chapter = currentInvestigationChapter(state);
  const progress = currentInvestigation(meta, state);
  const node = chapter?.nodes.find((candidate) => candidate.id === nodeId);
  if (!chapter || !progress || !node) return { meta, state, changed: false };
  if (progress.completedNodeIds.includes(nodeId)) return { meta, state, changed: false };
  if (lockedReason(node, meta, state, progress)) return { meta, state, changed: false };

  const nextProgress: InvestigationProgress = {
    ...progress,
    timeSpent: progress.timeSpent + effectiveCost(node, meta),
    completedNodeIds: [...progress.completedNodeIds, node.id],
    clueIds: unique([...progress.clueIds, node.clueId]),
  };
  return {
    meta: {
      ...meta,
      investigations: { ...meta.investigations, [chapter.monthKey]: nextProgress },
    },
    state: applyEffects(state, node.effects),
    changed: true,
  };
}

export function decisionOptionsForRebirth(
  meta: RebirthMetaState,
  state: GameState,
  base: ResearchDecision[],
): ResearchDecision[] {
  const completed = currentInvestigation(meta, state)?.completedNodeIds ?? [];
  const extra = specialDecisionsForInvestigation(state, completed);
  const ids = new Set(base.map((decision) => decision.id));
  return [...base, ...extra.filter((decision) => !ids.has(decision.id))];
}

export function prepareDecisionForRebirth(
  meta: RebirthMetaState,
  state: GameState,
  decision: ResearchDecision,
): ResearchDecision {
  const clueIds = currentInvestigation(meta, state)?.clueIds ?? [];
  if (clueIds.length === 0) return decision;
  const bonus = investigationDecisionBonus(clueIds, decisionMethod(decision));
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
  const scores = history.flatMap((result) => result.score
    ? [result.score.reasoningScore]
    : []);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}

export function endingIdFor(state: GameState): string {
  if (state.flags.rebirth_truth_route) return "truth_audit";
  if (state.fatigue >= 85 || state.flags.route_burnout) return "burnout";
  if (state.history.some((result) => result.isParachuted)) return "parachuted";
  if (state.flags.route_balanced) return "balanced";
  if (state.flags.route_relation) return "relation";
  if (state.flags.route_research) return "research";
  if (state.researchCredibility >= 80 && state.teamTrust >= 70) {
    return "trusted_researcher";
  }
  return "ordinary";
}

function earnedMemoryKeys(state: GameState): MemoryKeyId[] {
  const keys: MemoryKeyId[] = [];
  const reasoning = state.history.map((result) => result.score?.reasoningScore ?? 25);
  if (state.history.some((result) => result.isParachuted)
    || reasoning.some((score) => score <= 14)) {
    keys.push("causal_gap");
  }
  if ((state.methodCounts.quantitative_research ?? 0) >= 3
    || state.history.some((result) => result.selected.id.includes("hype"))) {
    keys.push("sample_pollution");
  }
  if (state.fatigue >= 70 || state.flags.route_burnout) keys.push("body_memory");
  if ((state.methodCounts.risk_management ?? 0) >= 3 || state.flags.route_balanced) {
    keys.push("opportunity_cost");
  }
  return keys.length > 0 ? unique(keys) : ["causal_gap"];
}

function earnedShortcuts(state: GameState): ResearchShortcutId[] {
  const shortcuts: ResearchShortcutId[] = [];
  if ((state.relations.lin_ruoning ?? 0) >= 60
    || (state.methodCounts.field_research ?? 0) >= 3) {
    shortcuts.push("lin_contact_book");
  }
  if ((state.relations.zhao_chengyu ?? 0) >= 40 || state.flags.helped_zhao) {
    shortcuts.push("zhao_factor_pipeline");
  }
  if ((state.relations.zhou_mingzhao ?? 0) >= 60
    || (state.methodCounts.risk_management ?? 0) >= 3) {
    shortcuts.push("zhou_risk_template");
  }
  return shortcuts;
}

function earnedContradictions(
  meta: RebirthMetaState,
  state: GameState,
): string[] {
  const contradictions: string[] = [];
  if (meta.cycle === 1) contradictions.push("memory_source_mismatch");
  if (state.history.some((result) => result.isParachuted)) {
    contradictions.push("record_mismatch");
  }
  return contradictions;
}

function unlockLabels(
  keys: MemoryKeyId[],
  shortcuts: ResearchShortcutId[],
  contradictions: string[],
): string[] {
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
    investigations: {},
  };
}

export function addContradiction(
  meta: RebirthMetaState,
  contradictionId: string,
): RebirthMetaState {
  if (meta.contradictions.includes(contradictionId)) return meta;
  return {
    ...meta,
    contradictions: [...meta.contradictions, contradictionId],
  };
}

export function investigationClues(
  meta: RebirthMetaState,
  state: GameState,
): Array<{
  id: string;
  label: string;
  description: string;
  reliability: InvestigationReliability;
  reliabilityLabel: string;
}> {
  return (currentInvestigation(meta, state)?.clueIds ?? []).map((id) => {
    const clue = CLUES[id];
    const reliability = clue?.reliability ?? "lead";
    return {
      id,
      label: clue?.label ?? id,
      description: clue?.description ?? "这条线索仍待整理。",
      reliability,
      reliabilityLabel: RELIABILITY_LABELS[reliability],
    };
  });
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
    return "记忆来源疑点：这更像后来形成的财经标题。结果很清楚，事前证据却始终模糊。";
  }
  return "记忆来源仍待核验。已经知道结果，不代表知道当时成立的证据。";
}

export function branchMetaContext(meta: RebirthMetaState): {
  cycle: number;
  memoryKeys: string[];
} {
  return { cycle: meta.cycle, memoryKeys: meta.memoryKeys };
}

export function investigationMethodBonus(
  meta: RebirthMetaState,
  state: GameState,
  method: DecisionMethod,
) {
  return investigationDecisionBonus(
    currentInvestigation(meta, state)?.clueIds ?? [],
    method,
  );
}
