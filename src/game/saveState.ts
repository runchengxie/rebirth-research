import { CONTENT_REVISION } from "./narrativeSemantics";
import { createInitialState, sceneForMonth } from "./runtime";
import type { GameState, KnowledgeCard, SceneNode } from "../types";

export const SAVE_KEY_PREFIX = "rebirthGameState:v2:";
export const LEGACY_SAVE_KEY_PREFIX = "rebirthGameState:v1:";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function restoreObject<T extends object>(value: unknown, fallback: T): T {
  return isObject(value) ? { ...fallback, ...value } as T : fallback;
}

function restoreRecord<T extends object>(value: unknown, fallback: T): T {
  return isObject(value) ? value as T : fallback;
}

function restoreArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? value as T[] : fallback;
}

function restoreKnowledgeCards(value: unknown): KnowledgeCard[] {
  if (!Array.isArray(value)) return [];
  const legacyReferenceKey = ["c", "f", "a", "Ref"].join("");
  return value.filter(isObject).map((raw) => {
    const legacyReference = raw[legacyReferenceKey];
    const card = Object.fromEntries(
      Object.entries(raw).filter(([key]) => key !== legacyReferenceKey),
    ) as Record<string, unknown>;
    if (typeof card.learningRef !== "string" && typeof legacyReference === "string") {
      card.learningRef = legacyReference.replace(/^[^·]+·\s*/, "金融基础 · ");
    }
    return card as unknown as KnowledgeCard;
  });
}

function stableNode(node: SceneNode): boolean {
  return node.type === "decision"
    || node.id.endsWith("-memory")
    || node.id.endsWith("-colleague")
    || node.id.startsWith("2025p-");
}

function restoredPosition(state: GameState): { sceneNodeIndex: number; sceneNodeId: string } {
  const scene = sceneForMonth(state);
  const exact = state.sceneNodeId
    ? scene.nodes.findIndex((node) => node.id === state.sceneNodeId)
    : -1;
  if (exact >= 0) return { sceneNodeIndex: exact, sceneNodeId: scene.nodes[exact].id };

  if (state.locked) {
    const decisionIndex = scene.nodes.findIndex((node) => node.type === "decision");
    if (decisionIndex >= 0) {
      return { sceneNodeIndex: decisionIndex, sceneNodeId: scene.nodes[decisionIndex].id };
    }
  }

  const legacyIndex = Math.max(0, Math.min(state.sceneNodeIndex, scene.nodes.length - 1));
  const stableBefore = scene.nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node, index }) => index <= legacyIndex && stableNode(node))
    .at(-1);
  const resolvedIndex = stableBefore?.index ?? legacyIndex;
  return {
    sceneNodeIndex: resolvedIndex,
    sceneNodeId: scene.nodes[resolvedIndex]?.id ?? scene.nodes[0]?.id ?? "",
  };
}

export function restoreStoredState(year: string, parsed: unknown): GameState | null {
  if (!isObject(parsed) || parsed.year !== year) return null;
  const saved = parsed as Partial<GameState>;
  if (!Number.isInteger(saved.monthIndex) || (saved.monthIndex ?? 0) < 0 || (saved.monthIndex ?? 0) > 11) {
    return null;
  }
  if (saved.sceneNodeIndex !== undefined
    && (!Number.isInteger(saved.sceneNodeIndex) || (saved.sceneNodeIndex ?? 0) < 0)) {
    return null;
  }

  const fresh = createInitialState(year);
  const restored: GameState = {
    ...fresh,
    ...saved,
    year,
    sceneNodeIndex: saved.sceneNodeIndex ?? 0,
    sceneNodeId: typeof saved.sceneNodeId === "string" ? saved.sceneNodeId : "",
    contentRevision: CONTENT_REVISION,
    relations: restoreObject(saved.relations, fresh.relations),
    flags: restoreRecord(saved.flags, fresh.flags),
    categoryCounts: restoreRecord(saved.categoryCounts, fresh.categoryCounts),
    methodCounts: restoreRecord(saved.methodCounts, fresh.methodCounts),
    history: restoreArray(saved.history, fresh.history),
    knowledgeCards: restoreKnowledgeCards(saved.knowledgeCards),
    office: restoreObject(saved.office, fresh.office),
  };
  return { ...restored, ...restoredPosition(restored) };
}

export function readStoredState(storage: StorageLike, year: string): GameState | null {
  for (const prefix of [SAVE_KEY_PREFIX, LEGACY_SAVE_KEY_PREFIX]) {
    try {
      const raw = storage.getItem(`${prefix}${year}`);
      if (!raw) continue;
      const restored = restoreStoredState(year, JSON.parse(raw) as unknown);
      if (restored) return restored;
    } catch {
      // Try the next save generation.
    }
  }
  return null;
}

export function persistStoredState(storage: StorageLike, state: GameState): void {
  storage.setItem(`${SAVE_KEY_PREFIX}${state.year}`, JSON.stringify({
    ...state,
    contentRevision: CONTENT_REVISION,
  }));
}
