// ═══════════════════════════════════════════════════════════
// VN runtime layer — scene progression & playable state
// ═══════════════════════════════════════════════════════════
//
// This module owns the *visual-novel runtime* concerns: building the current
// month's scene graph from content, advancing the dialogue/decision cursor,
// and the playable GameState factory plus month rollover.
//
// It deliberately depends only on `types` and the content layer
// (`buildMonthScene`). It must NOT import the simulation layer (engine.ts).
// Keeping that boundary clean is what lets a borrowed VN runtime such as
// Pixi'VN replace this file later — without touching financial simulation,
// scoring, character relations, or market settlement.
//
// Responsibilities that belong HERE (borrowable / replaceable):
//   - playable state shape (createInitialState) and month rollover (nextMonth)
//   - scene graph assembly (sceneForMonth) + cursor (currentSceneNode)
//   - dialogue/decision step advancement (advanceScene / canAdvanceScene)
//
// Responsibilities that stay in engine.ts (your core, never outsourced):
//   - research scoring, character relations, fatigue, net-value, market
//     settlement, route flags — i.e. makeDecision and everything it calls.

import { buildMonthScene } from "./content";
import type { GameDataYear, GameState, MonthScene } from "../types";

// ═══════════════════════════════════════════════════════════
// Playable state factory
// ═══════════════════════════════════════════════════════════

export function createInitialState(year: string): GameState {
  return {
    year,
    monthIndex: 0,
    focusId: "deep_research",
    selectedId: null,
    sceneNodeIndex: 0,
    locked: false,
    finished: false,
    // Research career metrics
    // portfolioNav = 研究推荐跟踪净值 (模拟研究员推荐标的的理论表现)
    // 基准参考另算，不与净值直接比较
    researchCredibility: 14,
    committeeAdoption: 10,
    portfolioNav: 1.0,
    viewAccuracy: 12,
    clientFeedback: 10,
    teamTrust: 20,
    fatigue: 22,
    lifeBalance: 52,
    relations: {
      lin_ruoning: 18,
      chen_xinghe: 14,
      zhou_mingzhao: 12,
    },
    flags: {},
    categoryCounts: {},
    milestone: null,
    history: [],
  };
}

// ═══════════════════════════════════════════════════════════
// Scene graph assembly & cursor
// ═══════════════════════════════════════════════════════════

export function sceneForMonth(state: GameState): MonthScene {
  return buildMonthScene(state.monthIndex, state.year, state);
}

export function currentSceneNode(state: GameState): MonthScene["nodes"][number] {
  const scene = sceneForMonth(state);
  return scene.nodes[state.sceneNodeIndex] || scene.nodes[scene.nodes.length - 1];
}

// ═══════════════════════════════════════════════════════════
// Scene advancement
// ═══════════════════════════════════════════════════════════

export function canAdvanceScene(state: GameState): boolean {
  const node = currentSceneNode(state);
  return node.type === "dialogue" || state.locked;
}

export function advanceScene(state: GameState, _data: GameDataYear): GameState {
  void _data;
  const scene = sceneForMonth(state);
  const node = currentSceneNode(state);
  if (node.type === "decision" && !state.locked) return state;
  if (state.sceneNodeIndex < scene.nodes.length - 1) {
    return {
      ...state,
      sceneNodeIndex: state.sceneNodeIndex + 1,
    };
  }
  return nextMonth(state);
}

// ═══════════════════════════════════════════════════════════
// Month rollover
// ═══════════════════════════════════════════════════════════

export function nextMonth(state: GameState): GameState {
  if (state.finished) return createInitialState(state.year);
  if (!state.locked) return state;
  return {
    ...state,
    monthIndex: Math.min(state.monthIndex + 1, 11),
    selectedId: null,
    sceneNodeIndex: 0,
    locked: false,
    focusId: "deep_research",
    milestone: null,
  };
}
