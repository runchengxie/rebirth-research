import type { Branch, BranchCondition, GameState } from "../types";

// ═══════════════════════════════════════════════════════════
// Conditional branching layer — pure evaluators (no content imports)
//
// `branching.ts` only depends on the type definitions so it can be imported by
// both `content.ts` (which owns the branch *content*) and `engine.ts` (which
// owns state transitions) without creating an import cycle.
// ═══════════════════════════════════════════════════════════

function flagIsSet(state: GameState, key: string): boolean {
  const value = state.flags[key];
  return value !== undefined && value !== false && value !== 0;
}

// Evaluate a branch condition against the current game state.
export function evaluateBranchCondition(cond: BranchCondition, state: GameState): boolean {
  switch (cond.kind) {
    case "always":
      return true;
    case "affinity":
      return (state.relations[cond.characterId] ?? 0) >= cond.gte;
    case "affinityAny":
      return (Object.values(state.relations) as number[]).some((v) => v >= cond.gte);
    case "metric":
      return ((state[cond.key] as number) ?? 0) >= cond.gte;
    case "metricAtMost":
      return ((state[cond.key] as number) ?? 0) <= cond.lte;
    case "flag":
      if (cond.equals === undefined) return flagIsSet(state, cond.key);
      return state.flags[cond.key] === cond.equals;
    case "categoryStreak":
      return (state.categoryCounts[cond.category] ?? 0) >= cond.gte;
    case "month":
      return state.monthIndex >= cond.gte;
    case "and":
      return cond.of.every((c) => evaluateBranchCondition(c, state));
    case "or":
      return cond.of.some((c) => evaluateBranchCondition(c, state));
    case "not":
      return !evaluateBranchCondition(cond.of, state);
    default:
      return false;
  }
}

// Branches currently active for the given state. Honours `once` (a branch that
// has already been "seen" via its `seen_<id>` flag is treated as inactive so it
// is not re-injected on later months).
export function activeBranches(state: GameState, branches: Branch[]): Branch[] {
  return branches.filter((b) => {
    if (b.once && flagIsSet(state, `seen_${b.id}`)) return false;
    return evaluateBranchCondition(b.when, state);
  });
}

// Flags that should be written back to GameState for the month just played:
// the union of every active branch's `setFlags`, plus a `seen_<id>` marker for
// each `once` branch that fired. Call from makeDecision after the choice is
// applied so the route is recorded in persistent state.
export function branchFlagsForMonth(state: GameState, branches: Branch[]): Record<string, boolean | number> {
  const flags: Record<string, boolean | number> = {};
  for (const b of activeBranches(state, branches)) {
    if (b.contribute.setFlags) {
      Object.assign(flags, b.contribute.setFlags);
    }
    if (b.once) {
      flags[`seen_${b.id}`] = true;
    }
  }
  return flags;
}
