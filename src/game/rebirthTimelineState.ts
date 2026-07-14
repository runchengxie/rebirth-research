import type { GameState } from "../types";

export const TIMELINE_VERSION = 1;
export const TIMELINE_BRANCH_LIMIT = 12;
export const TIMELINE_KEY_MONTHS = [0, 3, 6, 8, 11] as const;

export type TimelineBranchStatus = "active" | "paused" | "completed";
export type TimelineEventType =
  | "investigation"
  | "office"
  | "focus"
  | "decision"
  | "rewind";
export type TimelineSimulationProfileId =
  | "evidence_audit"
  | "sample_recovery"
  | "staged_exposure"
  | "sustainable_pace";

export interface TimelineInvestigationSnapshot {
  monthKey: string;
  timeBudget: number;
  timeSpent: number;
  completedNodeIds: string[];
  clueIds: string[];
}

export interface TimelineEvent {
  id: string;
  sequence: number;
  branchId: string;
  cycle: number;
  monthIndex: number;
  monthKey: string;
  type: TimelineEventType;
  label: string;
  payload: Record<string, string | number | boolean>;
}

export interface TimelineAnchor {
  id: string;
  branchId: string;
  cycle: number;
  monthIndex: number;
  monthKey: string;
  label: string;
  contentRevision: string;
  state: GameState;
  investigations: Record<string, TimelineInvestigationSnapshot>;
  sourceMemoryKeys: string[];
  sourceShortcuts: string[];
  sourceContradictions: string[];
  sequence: number;
}

export interface TimelineBranch {
  id: string;
  label: string;
  cycle: number;
  status: TimelineBranchStatus;
  parentBranchId: string | null;
  forkAnchorId: string | null;
  headState: GameState;
  investigations: Record<string, TimelineInvestigationSnapshot>;
  anchorIds: string[];
  events: TimelineEvent[];
  endingId: string | null;
  sequence: number;
}

export interface TimelineProjection {
  researchCredibility: number;
  committeeAdoption: number;
  teamTrust: number;
  fatigue: number;
  lifeBalance: number;
}

export interface TimelineSimulation {
  id: string;
  anchorId: string;
  branchId: string;
  profileId: TimelineSimulationProfileId;
  label: string;
  explanation: string;
  caveat: string;
  projection: TimelineProjection;
  sequence: number;
}

export interface RebirthTimelineState {
  version: 1;
  activeBranchId: string | null;
  nextBranchSerial: number;
  nextEventSerial: number;
  nextSimulationSerial: number;
  sequence: number;
  branches: TimelineBranch[];
  anchors: TimelineAnchor[];
  simulations: TimelineSimulation[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function cloneTimelineStateSnapshot(state: GameState): GameState {
  return cloneJson(state);
}

export function cloneTimelineInvestigations(
  investigations: Record<string, TimelineInvestigationSnapshot>,
): Record<string, TimelineInvestigationSnapshot> {
  return cloneJson(investigations);
}

export function createRebirthTimelineState(): RebirthTimelineState {
  return {
    version: TIMELINE_VERSION,
    activeBranchId: null,
    nextBranchSerial: 1,
    nextEventSerial: 1,
    nextSimulationSerial: 1,
    sequence: 0,
    branches: [],
    anchors: [],
    simulations: [],
  };
}

function validGameState(value: unknown): value is GameState {
  if (!isObject(value)) return false;
  return typeof value.year === "string"
    && Number.isInteger(value.monthIndex)
    && Array.isArray(value.history)
    && isObject(value.flags)
    && isObject(value.relations);
}

function restoreInvestigationMap(
  value: unknown,
): Record<string, TimelineInvestigationSnapshot> {
  if (!isObject(value)) return {};
  const restored: Record<string, TimelineInvestigationSnapshot> = {};
  for (const [monthKey, raw] of Object.entries(value)) {
    if (!isObject(raw)) continue;
    restored[monthKey] = {
      monthKey,
      timeBudget: typeof raw.timeBudget === "number" ? raw.timeBudget : 0,
      timeSpent: typeof raw.timeSpent === "number" ? raw.timeSpent : 0,
      completedNodeIds: Array.isArray(raw.completedNodeIds)
        ? raw.completedNodeIds.filter((item): item is string => typeof item === "string")
        : [],
      clueIds: Array.isArray(raw.clueIds)
        ? raw.clueIds.filter((item): item is string => typeof item === "string")
        : [],
    };
  }
  return restored;
}

function restoreEvent(value: unknown): TimelineEvent | null {
  if (!isObject(value)) return null;
  if (typeof value.id !== "string" || typeof value.branchId !== "string") return null;
  return {
    id: value.id,
    sequence: typeof value.sequence === "number" ? value.sequence : 0,
    branchId: value.branchId,
    cycle: typeof value.cycle === "number" ? value.cycle : 1,
    monthIndex: typeof value.monthIndex === "number" ? value.monthIndex : 0,
    monthKey: typeof value.monthKey === "string" ? value.monthKey : "",
    type: typeof value.type === "string" ? value.type as TimelineEventType : "rewind",
    label: typeof value.label === "string" ? value.label : "时间线事件",
    payload: isObject(value.payload)
      ? Object.fromEntries(Object.entries(value.payload).filter(([, item]) => (
          typeof item === "string" || typeof item === "number" || typeof item === "boolean"
        )))
      : {},
  };
}

function restoreBranch(value: unknown): TimelineBranch | null {
  if (!isObject(value) || typeof value.id !== "string" || !validGameState(value.headState)) {
    return null;
  }
  const status = value.status === "active" || value.status === "paused" || value.status === "completed"
    ? value.status
    : "paused";
  return {
    id: value.id,
    label: typeof value.label === "string" ? value.label : value.id,
    cycle: typeof value.cycle === "number" ? value.cycle : 1,
    status,
    parentBranchId: typeof value.parentBranchId === "string" ? value.parentBranchId : null,
    forkAnchorId: typeof value.forkAnchorId === "string" ? value.forkAnchorId : null,
    headState: cloneTimelineStateSnapshot(value.headState),
    investigations: restoreInvestigationMap(value.investigations),
    anchorIds: Array.isArray(value.anchorIds)
      ? value.anchorIds.filter((item): item is string => typeof item === "string")
      : [],
    events: Array.isArray(value.events)
      ? value.events.map(restoreEvent).filter((item): item is TimelineEvent => Boolean(item))
      : [],
    endingId: typeof value.endingId === "string" ? value.endingId : null,
    sequence: typeof value.sequence === "number" ? value.sequence : 0,
  };
}

function restoreAnchor(value: unknown): TimelineAnchor | null {
  if (!isObject(value) || typeof value.id !== "string" || typeof value.branchId !== "string") {
    return null;
  }
  if (!validGameState(value.state)) return null;
  return {
    id: value.id,
    branchId: value.branchId,
    cycle: typeof value.cycle === "number" ? value.cycle : 1,
    monthIndex: typeof value.monthIndex === "number" ? value.monthIndex : 0,
    monthKey: typeof value.monthKey === "string" ? value.monthKey : "",
    label: typeof value.label === "string" ? value.label : "回溯锚点",
    contentRevision: typeof value.contentRevision === "string" ? value.contentRevision : "",
    state: cloneTimelineStateSnapshot(value.state),
    investigations: restoreInvestigationMap(value.investigations),
    sourceMemoryKeys: Array.isArray(value.sourceMemoryKeys)
      ? value.sourceMemoryKeys.filter((item): item is string => typeof item === "string")
      : [],
    sourceShortcuts: Array.isArray(value.sourceShortcuts)
      ? value.sourceShortcuts.filter((item): item is string => typeof item === "string")
      : [],
    sourceContradictions: Array.isArray(value.sourceContradictions)
      ? value.sourceContradictions.filter((item): item is string => typeof item === "string")
      : [],
    sequence: typeof value.sequence === "number" ? value.sequence : 0,
  };
}

function restoreProjection(value: unknown): TimelineProjection {
  const projection = isObject(value) ? value : {};
  return {
    researchCredibility: typeof projection.researchCredibility === "number"
      ? projection.researchCredibility
      : 0,
    committeeAdoption: typeof projection.committeeAdoption === "number"
      ? projection.committeeAdoption
      : 0,
    teamTrust: typeof projection.teamTrust === "number" ? projection.teamTrust : 0,
    fatigue: typeof projection.fatigue === "number" ? projection.fatigue : 0,
    lifeBalance: typeof projection.lifeBalance === "number" ? projection.lifeBalance : 0,
  };
}

function restoreSimulation(value: unknown): TimelineSimulation | null {
  if (!isObject(value) || typeof value.id !== "string" || typeof value.anchorId !== "string") {
    return null;
  }
  return {
    id: value.id,
    anchorId: value.anchorId,
    branchId: typeof value.branchId === "string" ? value.branchId : "",
    profileId: typeof value.profileId === "string"
      ? value.profileId as TimelineSimulationProfileId
      : "evidence_audit",
    label: typeof value.label === "string" ? value.label : "反事实推演",
    explanation: typeof value.explanation === "string" ? value.explanation : "",
    caveat: typeof value.caveat === "string" ? value.caveat : "反事实结果不会改写实际时间线。",
    projection: restoreProjection(value.projection),
    sequence: typeof value.sequence === "number" ? value.sequence : 0,
  };
}

export function restoreRebirthTimelineState(value: unknown): RebirthTimelineState {
  const fresh = createRebirthTimelineState();
  if (!isObject(value)) return fresh;
  const branches = Array.isArray(value.branches)
    ? value.branches.map(restoreBranch).filter((item): item is TimelineBranch => Boolean(item))
    : [];
  const anchors = Array.isArray(value.anchors)
    ? value.anchors.map(restoreAnchor).filter((item): item is TimelineAnchor => Boolean(item))
    : [];
  const simulations = Array.isArray(value.simulations)
    ? value.simulations.map(restoreSimulation)
      .filter((item): item is TimelineSimulation => Boolean(item))
    : [];
  const requestedActive = typeof value.activeBranchId === "string" ? value.activeBranchId : null;
  const activeBranchId = branches.some((branch) => branch.id === requestedActive)
    ? requestedActive
    : branches.find((branch) => branch.status === "active")?.id ?? null;
  return {
    version: TIMELINE_VERSION,
    activeBranchId,
    nextBranchSerial: typeof value.nextBranchSerial === "number" ? value.nextBranchSerial : 1,
    nextEventSerial: typeof value.nextEventSerial === "number" ? value.nextEventSerial : 1,
    nextSimulationSerial: typeof value.nextSimulationSerial === "number"
      ? value.nextSimulationSerial
      : 1,
    sequence: typeof value.sequence === "number" ? value.sequence : 0,
    branches,
    anchors,
    simulations,
  };
}
