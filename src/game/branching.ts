import type {
  Branch,
  BranchCondition,
  BranchMetaContext,
  GameState,
} from "../types";

function flagIsSet(state: GameState, key: string): boolean {
  const value = state.flags[key];
  return value !== undefined && value !== false && value !== 0;
}

function numberOrZero(value: number | undefined): number {
  return value ?? 0;
}

function metricValue(
  state: GameState,
  key: Extract<BranchCondition, { kind: "metric" }>["key"],
): number {
  return state[key];
}

function isPersistentRouteBranch(branch: Branch): boolean {
  return branch.id.startsWith("route-")
    && Object.keys(branch.contribute.setFlags ?? {}).some((key) => key.startsWith("route_"));
}

function contributionFlagsAlreadyApplied(state: GameState, branch: Branch): boolean {
  if (!isPersistentRouteBranch(branch)) return false;
  const entries = Object.entries(branch.contribute.setFlags ?? {});
  return entries.length > 0 && entries.every(([key, value]) => state.flags[key] === value);
}

function suppressRepeatedNodes(state: GameState, branch: Branch): Branch {
  if (!branch.contribute.nodes?.length || !contributionFlagsAlreadyApplied(state, branch)) {
    return branch;
  }
  return {
    ...branch,
    contribute: {
      ...branch.contribute,
      nodes: [],
    },
  };
}

function evaluateStateLeaf(
  cond: BranchCondition,
  state: GameState,
): boolean | null {
  switch (cond.kind) {
    case "always":
      return true;
    case "affinity":
      return numberOrZero(state.relations[cond.characterId]) >= cond.gte;
    case "affinityAny":
      return Object.values(state.relations).some((value) => value >= cond.gte);
    case "metric":
      return metricValue(state, cond.key) >= cond.gte;
    case "metricAtMost":
      return metricValue(state, cond.key) <= cond.lte;
    case "flag":
      return cond.equals === undefined
        ? flagIsSet(state, cond.key)
        : state.flags[cond.key] === cond.equals;
    default:
      return null;
  }
}

function evaluateProgressLeaf(
  cond: BranchCondition,
  state: GameState,
  meta?: BranchMetaContext,
): boolean | null {
  switch (cond.kind) {
    case "categoryStreak":
      return numberOrZero(state.categoryCounts[cond.category]) >= cond.gte;
    case "methodStreak":
      return numberOrZero(state.methodCounts[cond.method]) >= cond.gte;
    case "month":
      return state.monthIndex >= cond.gte;
    case "cycle":
      return (meta?.cycle ?? 1) >= cond.gte;
    case "memoryKey":
      return meta?.memoryKeys.includes(cond.key) ?? false;
    default:
      return null;
  }
}

export function evaluateBranchCondition(
  cond: BranchCondition,
  state: GameState,
  meta?: BranchMetaContext,
): boolean {
  const stateLeaf = evaluateStateLeaf(cond, state);
  if (stateLeaf !== null) return stateLeaf;
  const progressLeaf = evaluateProgressLeaf(cond, state, meta);
  if (progressLeaf !== null) return progressLeaf;
  if (cond.kind === "and") {
    return cond.of.every((child) => evaluateBranchCondition(child, state, meta));
  }
  if (cond.kind === "or") {
    return cond.of.some((child) => evaluateBranchCondition(child, state, meta));
  }
  if (cond.kind === "not") {
    return !evaluateBranchCondition(cond.of, state, meta);
  }
  return false;
}

export function activeBranches(
  state: GameState,
  branches: Branch[],
  meta?: BranchMetaContext,
): Branch[] {
  return branches
    .filter((branch) => {
      if (branch.once && flagIsSet(state, `seen_${branch.id}`)) return false;
      return evaluateBranchCondition(branch.when, state, meta);
    })
    .map((branch) => suppressRepeatedNodes(state, branch));
}

export function branchFlagsForMonth(
  state: GameState,
  branches: Branch[],
  meta?: BranchMetaContext,
): Record<string, boolean | number> {
  const flags: Record<string, boolean | number> = {};
  for (const branch of activeBranches(state, branches, meta)) {
    if (branch.contribute.setFlags) {
      Object.assign(flags, branch.contribute.setFlags);
    }
    if (branch.once) {
      flags[`seen_${branch.id}`] = true;
    }
  }
  return flags;
}
