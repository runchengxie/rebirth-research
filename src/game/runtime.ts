// Visual-novel runtime: dynamic scene assembly plus stable-node progression.

import { buildMonthScene } from "./content";
import { CONTENT_REVISION } from "./narrativeSemantics";
import type { GameDataYear, GameState, MonthScene } from "../types";

function firstNodeId(year: string, monthIndex: number, state?: GameState): string {
  return buildMonthScene(monthIndex, year, state).nodes[0]?.id ?? "";
}

export function createInitialState(year: string): GameState {
  return {
    year,
    monthIndex: 0,
    focusId: "deep_research",
    selectedId: null,
    sceneNodeIndex: 0,
    sceneNodeId: firstNodeId(year, 0),
    contentRevision: CONTENT_REVISION,
    locked: false,
    finished: false,
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
      zhao_chengyu: 10,
    },
    flags: year === "2025" ? { year_2025: true } : {},
    categoryCounts: {},
    methodCounts: {},
    milestone: null,
    history: [],
    knowledgeCards: [],
    office: { postIts: 0, whiteboardMarkers: 0, coffeeCups: 0, monthsElapsed: 0 },
  };
}

export function sceneForMonth(state: GameState): MonthScene {
  return buildMonthScene(state.monthIndex, state.year, state);
}

export function scenePosition(
  state: GameState,
  scene: MonthScene = sceneForMonth(state),
): number {
  const idIndex = state.sceneNodeId
    ? scene.nodes.findIndex((node) => node.id === state.sceneNodeId)
    : -1;
  if (idIndex >= 0) return idIndex;
  return Math.max(0, Math.min(state.sceneNodeIndex, scene.nodes.length - 1));
}

export function currentSceneNode(state: GameState): MonthScene["nodes"][number] {
  const scene = sceneForMonth(state);
  return scene.nodes[scenePosition(state, scene)] ?? scene.nodes[scene.nodes.length - 1];
}

export function canAdvanceScene(state: GameState): boolean {
  const node = currentSceneNode(state);
  return node.type === "dialogue" || state.locked;
}

export function canRewindScene(state: GameState): boolean {
  return !state.locked && scenePosition(state) > 0;
}

export function rewindScene(state: GameState): GameState {
  if (!canRewindScene(state)) return state;
  const scene = sceneForMonth(state);
  const nextIndex = scenePosition(state, scene) - 1;
  return {
    ...state,
    sceneNodeIndex: nextIndex,
    sceneNodeId: scene.nodes[nextIndex]?.id ?? state.sceneNodeId,
  };
}

export function advanceScene(state: GameState, _data: GameDataYear): GameState {
  void _data;
  const scene = sceneForMonth(state);
  const currentIndex = scenePosition(state, scene);
  const node = scene.nodes[currentIndex];
  if (node.type === "decision" && !state.locked) return state;
  if (currentIndex < scene.nodes.length - 1) {
    const nextIndex = currentIndex + 1;
    return {
      ...state,
      sceneNodeIndex: nextIndex,
      sceneNodeId: scene.nodes[nextIndex]?.id ?? state.sceneNodeId,
    };
  }
  return nextMonth(state);
}

export function nextMonth(state: GameState): GameState {
  if (state.finished) return createInitialState(state.year);
  if (!state.locked) return state;
  const monthIndex = Math.min(state.monthIndex + 1, 11);
  const next: GameState = {
    ...state,
    monthIndex,
    selectedId: null,
    sceneNodeIndex: 0,
    sceneNodeId: "",
    contentRevision: CONTENT_REVISION,
    locked: false,
    focusId: "deep_research",
    milestone: null,
  };
  return { ...next, sceneNodeId: firstNodeId(state.year, monthIndex, next) };
}
