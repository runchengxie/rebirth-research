#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"{path} 缺少待替换片段：{old[:100]!r}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "src/game/rebirth.ts",
    '''function lockedReason(
  node: InvestigationNodeDefinition,
  meta: RebirthMetaState,
  state: GameState,
  progress: InvestigationProgress,
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
  if (node.requiresFlag && !flagIsSet(state, node.requiresFlag)) {
    return "需要先在研究室完成对应档案整理";
  }
  const missing = node.requiresCompleted?.find(
    (id) => !progress.completedNodeIds.includes(id),
  );
  if (missing) {
    const requirement = INVESTIGATION_NODES.find((candidate) => candidate.id === missing);
    return `先完成：${requirement?.label ?? missing}`;
  }
  const cost = effectiveCost(node, meta);
  if (remainingTime(progress) < cost) return `还需要 ${cost} 个时间块`;
  return null;
}
''',
    '''function metaRequirementReason(
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
''',
)

replace_once(
    "src/game/rebirthOffice.test.ts",
    '''    history: [{ month: "2025-01" }, { month: "2025-02" }, { month: "2025-03" }]
      as RoundResult[],
''',
    '''    history: Array.from({ length: 3 }, () => ({} as RoundResult)),
''',
)

print("first rebirth v2 check fixes applied")
