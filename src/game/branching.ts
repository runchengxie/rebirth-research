import type { Branch, BranchCondition, GameState } from "../types";

function flagIsSet(state: GameState, key: string): boolean {
  const value = state.flags[key];
  return value !== undefined && value !== false && value !== 0;
}

function numberOrZero(value: number | undefined): number {
  return value ?? 0;
}

function metricValue(state: GameState, key: Extract<BranchCondition, { kind: "metric" }>['key']): number {
  return state[key];
}

export function evaluateBranchCondition(cond: BranchCondition, state: GameState): boolean {
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
    case "categoryStreak":
      return numberOrZero(state.categoryCounts[cond.category]) >= cond.gte;
    case "methodStreak":
      return numberOrZero(state.methodCounts[cond.method]) >= cond.gte;
    case "month":
      return state.monthIndex >= cond.gte;
    case "and":
      return cond.of.every((child) => evaluateBranchCondition(child, state));
    case "or":
      return cond.of.some((child) => evaluateBranchCondition(child, state));
    case "not":
      return !evaluateBranchCondition(cond.of, state);
  }
}

export function activeBranches(state: GameState, branches: Branch[]): Branch[] {
  return branches.filter((branch) => {
    if (branch.once && flagIsSet(state, `seen_${branch.id}`)) return false;
    return evaluateBranchCondition(branch.when, state);
  });
}

export function branchFlagsForMonth(
  state: GameState,
  branches: Branch[],
): Record<string, boolean | number> {
  const flags: Record<string, boolean | number> = {};
  for (const branch of activeBranches(state, branches)) {
    if (branch.contribute.setFlags) {
      Object.assign(flags, branch.contribute.setFlags);
    }
    if (branch.once) {
      flags[`seen_${branch.id}`] = true;
    }
  }
  return flags;
}
