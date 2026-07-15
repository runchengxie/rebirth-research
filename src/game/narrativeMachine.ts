import type { GameState, MonthScene, SceneNode } from "../types";

export type NarrativePhase =
  | "dialogue"
  | "debate"
  | "decision"
  | "result"
  | "ending";

export interface NarrativeFrame {
  phase: NarrativePhase;
  node: SceneNode;
  nodeIndex: number;
  nodeCount: number;
  progressLabel: string;
  canChoose: boolean;
  isTerminal: boolean;
}

export function isDebateNode(node: SceneNode): boolean {
  return node.id.endsWith("-competing");
}

export function narrativePhaseFor(state: GameState, node: SceneNode): NarrativePhase {
  if (state.finished) return "ending";
  if (node.type === "decision") return state.locked ? "result" : "decision";
  if (isDebateNode(node)) return "debate";
  return "dialogue";
}

export function narrativeFrameFor(
  state: GameState,
  scene: MonthScene,
  node: SceneNode,
): NarrativeFrame {
  const nodeIndex = Math.max(0, Math.min(state.sceneNodeIndex, scene.nodes.length - 1));
  const phase = narrativePhaseFor(state, node);
  return {
    phase,
    node,
    nodeIndex,
    nodeCount: scene.nodes.length,
    progressLabel: `${nodeIndex + 1}/${scene.nodes.length}`,
    canChoose: phase === "decision",
    isTerminal: phase === "ending" && nodeIndex >= scene.nodes.length - 1,
  };
}
