#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"{path} 缺少待替换片段：{old[:120]!r}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


# 重生元状态升级到 v3，并内嵌时间线。
replace_once(
    "src/game/rebirth.ts",
    'import { specialDecisionsForInvestigation } from "./rebirthSpecialDecisions";\n',
    'import { specialDecisionsForInvestigation } from "./rebirthSpecialDecisions";\n'
    'import {\n'
    '  createRebirthTimelineState,\n'
    '  restoreRebirthTimelineState,\n'
    '  type RebirthTimelineState,\n'
    '} from "./rebirthTimelineState";\n',
)
replace_once(
    "src/game/rebirth.ts",
    'export const REBIRTH_META_KEY_PREFIX = "rebirthMeta:v2:";\n'
    'export const LEGACY_REBIRTH_META_KEY_PREFIX = "rebirthMeta:v1:";\n',
    'export const REBIRTH_META_KEY_PREFIX = "rebirthMeta:v3:";\n'
    'export const LEGACY_REBIRTH_META_V2_KEY_PREFIX = "rebirthMeta:v2:";\n'
    'export const LEGACY_REBIRTH_META_KEY_PREFIX = "rebirthMeta:v1:";\n',
)
replace_once(
    "src/game/rebirth.ts",
    'export interface RebirthMetaState {\n'
    '  version: 2;\n',
    'export interface RebirthMetaState {\n'
    '  version: 3;\n',
)
replace_once(
    "src/game/rebirth.ts",
    '  officeDiscoveries: string[];\n'
    '}\n',
    '  officeDiscoveries: string[];\n'
    '  timeline: RebirthTimelineState;\n'
    '}\n',
)
replace_once(
    "src/game/rebirth.ts",
    '    version: 2,\n',
    '    version: 3,\n',
)
replace_once(
    "src/game/rebirth.ts",
    '    officeDiscoveries: [],\n'
    '  };\n',
    '    officeDiscoveries: [],\n'
    '    timeline: createRebirthTimelineState(),\n'
    '  };\n',
)
replace_once(
    "src/game/rebirth.ts",
    '    officeDiscoveries: Array.isArray(parsed.officeDiscoveries)\n'
    '      ? unique(parsed.officeDiscoveries.filter((item): item is string => typeof item === "string"))\n'
    '      : [],\n'
    '  };\n',
    '    officeDiscoveries: Array.isArray(parsed.officeDiscoveries)\n'
    '      ? unique(parsed.officeDiscoveries.filter((item): item is string => typeof item === "string"))\n'
    '      : [],\n'
    '    timeline: restoreRebirthTimelineState(parsed.timeline),\n'
    '  };\n',
)
replace_once(
    "src/game/rebirth.ts",
    '  for (const prefix of [REBIRTH_META_KEY_PREFIX, LEGACY_REBIRTH_META_KEY_PREFIX]) {\n',
    '  for (const prefix of [\n'
    '    REBIRTH_META_KEY_PREFIX,\n'
    '    LEGACY_REBIRTH_META_V2_KEY_PREFIX,\n'
    '    LEGACY_REBIRTH_META_KEY_PREFIX,\n'
    '  ]) {\n',
)
replace_once(
    "src/game/rebirth.ts",
    'function endingIdFor(state: GameState): string {\n',
    'export function endingIdFor(state: GameState): string {\n',
)

# 控制器接入锚点、事件、分叉、恢复和推演。
replace_once(
    "src/app/useGameController.ts",
    '  decisionOptionsForRebirth,\n'
    '  performInvestigation,\n',
    '  decisionOptionsForRebirth,\n'
    '  endingIdFor,\n'
    '  performInvestigation,\n',
)
replace_once(
    "src/app/useGameController.ts",
    'import { inspectOfficeProp, type OfficePropId } from "../game/rebirthOffice";\n',
    'import { inspectOfficeProp, type OfficePropId } from "../game/rebirthOffice";\n'
    'import {\n'
    '  captureTimelineAnchor,\n'
    '  completeActiveTimelineBranch,\n'
    '  ensureTimelineInitialized,\n'
    '  forkTimelineAtAnchor,\n'
    '  recordTimelineEvent,\n'
    '  restartTimelineRun,\n'
    '  resumeTimelineBranch,\n'
    '  startTimelineCycle,\n'
    '  syncActiveTimelineBranch,\n'
    '} from "../game/rebirthTimeline";\n'
    'import { simulateTimelineAnchor } from "../game/rebirthTimelineInsights";\n'
    'import type { TimelineSimulationProfileId } from "../game/rebirthTimelineState";\n',
)
replace_once(
    "src/app/useGameController.ts",
    '  return {\n'
    '    state: readStoredState(actualYear) ?? createInitialState(actualYear),\n'
    '    rebirth: readStoredRebirth(actualYear),\n'
    '  };\n',
    '  const state = readStoredState(actualYear) ?? createInitialState(actualYear);\n'
    '  const rebirth = ensureTimelineInitialized(readStoredRebirth(actualYear), state);\n'
    '  return { state, rebirth };\n',
)
replace_once(
    "src/app/useGameController.ts",
    '  useEffect(() => {\n'
    '    persistRebirth(rebirth);\n'
    '  }, [rebirth]);\n\n'
    '  const changeYear = useCallback((year: string) => {\n',
    '  useEffect(() => {\n'
    '    persistRebirth(rebirth);\n'
    '  }, [rebirth]);\n\n'
    '  useEffect(() => {\n'
    '    setRebirth((current) => captureTimelineAnchor(\n'
    '      syncActiveTimelineBranch(current, state),\n'
    '      state,\n'
    '    ));\n'
    '  }, [state]);\n\n'
    '  const changeYear = useCallback((year: string) => {\n',
)
replace_once(
    "src/app/useGameController.ts",
    '  const restart = useCallback(() => {\n'
    '    resetLineVoice();\n'
    '    setState(createInitialState(state.year));\n'
    '    setRebirth((current) => resetRebirthRun(current));\n'
    '  }, [resetLineVoice, state.year]);\n',
    '  const restart = useCallback(() => {\n'
    '    resetLineVoice();\n'
    '    const nextState = createInitialState(state.year);\n'
    '    const nextMeta = restartTimelineRun(rebirth, state, nextState);\n'
    '    setState(nextState);\n'
    '    setRebirth(nextMeta);\n'
    '  }, [rebirth, resetLineVoice, state]);\n',
)
start = '''  const advanceCurrentScene = useCallback(() => {
    if (!sceneCanAdvance) return;
    playAdvance();
    if (sceneNode.type === "dialogue") {
      setRebirth((current) => markSceneNodeRead(current, state, sceneNode.id));
    }
    const isCycleEnd = state.finished && state.sceneNodeIndex >= scene.nodes.length - 1;
    if (isCycleEnd) {
      const nextRebirth = completeRebirthCycle(rebirth, state);
      setRebirth(nextRebirth);
      setState(createInitialState(state.year));
      resetLineVoice();
      return;
    }
    setState((current) => advanceScene(current, data, branchMetaContext(rebirth)));
  }, [
    data,
    playAdvance,
    rebirth,
    resetLineVoice,
    scene.nodes.length,
    sceneCanAdvance,
    sceneNode,
    state,
  ]);
'''
replacement = '''  const advanceCurrentScene = useCallback(() => {
    if (!sceneCanAdvance) return;
    playAdvance();
    let nextMeta = sceneNode.type === "dialogue"
      ? markSceneNodeRead(rebirth, state, sceneNode.id)
      : rebirth;
    const isCycleEnd = state.finished && state.sceneNodeIndex >= scene.nodes.length - 1;
    if (isCycleEnd) {
      nextMeta = completeActiveTimelineBranch(nextMeta, state, endingIdFor(state));
      nextMeta = completeRebirthCycle(nextMeta, state);
      const nextState = createInitialState(state.year);
      nextMeta = startTimelineCycle(nextMeta, nextState);
      setRebirth(nextMeta);
      setState(nextState);
      resetLineVoice();
      return;
    }
    const nextState = advanceScene(state, data, branchMetaContext(nextMeta));
    nextMeta = syncActiveTimelineBranch(nextMeta, nextState);
    setRebirth(nextMeta);
    setState(nextState);
  }, [
    data,
    playAdvance,
    rebirth,
    resetLineVoice,
    scene.nodes.length,
    sceneCanAdvance,
    sceneNode,
    state,
  ]);
'''
replace_once("src/app/useGameController.ts", start, replacement)
replace_once(
    "src/app/useGameController.ts",
    '  const goBack = useCallback(() => {\n'
    '    if (!canGoBack) return;\n'
    '    resetLineVoice();\n'
    '    setState((current) => rewindScene(current, branchMetaContext(rebirth)));\n'
    '  }, [canGoBack, rebirth, resetLineVoice]);\n',
    '  const goBack = useCallback(() => {\n'
    '    if (!canGoBack) return;\n'
    '    resetLineVoice();\n'
    '    const nextState = rewindScene(state, branchMetaContext(rebirth));\n'
    '    setState(nextState);\n'
    '    setRebirth(syncActiveTimelineBranch(rebirth, nextState));\n'
    '  }, [canGoBack, rebirth, resetLineVoice, state]);\n',
)
replace_once(
    "src/app/useGameController.ts",
    '  const skipReadScene = useCallback(() => {\n'
    '    if (!canSkipRead) return;\n'
    '    resetLineVoice();\n'
    '    setState((current) => skipReadSceneNodes(\n'
    '      rebirth,\n'
    '      current,\n'
    '      data,\n'
    '      branchMetaContext(rebirth),\n'
    '    ));\n'
    '  }, [canSkipRead, data, rebirth, resetLineVoice]);\n',
    '  const skipReadScene = useCallback(() => {\n'
    '    if (!canSkipRead) return;\n'
    '    resetLineVoice();\n'
    '    const nextState = skipReadSceneNodes(\n'
    '      rebirth,\n'
    '      state,\n'
    '      data,\n'
    '      branchMetaContext(rebirth),\n'
    '    );\n'
    '    setState(nextState);\n'
    '    setRebirth(syncActiveTimelineBranch(rebirth, nextState));\n'
    '  }, [canSkipRead, data, rebirth, resetLineVoice, state]);\n',
)
replace_once(
    "src/app/useGameController.ts",
    '    setRebirth(result.meta);\n'
    '    setState(result.state);\n'
    '  }, [playChoice, rebirth, state]);\n\n'
    '  const selectFocusWithSound = useCallback((focusId: string) => {\n'
    '    playChoice();\n'
    '    setState((current) => selectFocus(current, focusId));\n'
    '  }, [playChoice]);\n',
    '    const nextMeta = recordTimelineEvent(\n'
    '      result.meta,\n'
    '      result.state,\n'
    '      "office",\n'
    '      `整理研究室：${propId}`,\n'
    '      { propId },\n'
    '    );\n'
    '    setRebirth(nextMeta);\n'
    '    setState(result.state);\n'
    '  }, [playChoice, rebirth, state]);\n\n'
    '  const selectFocusWithSound = useCallback((focusId: string) => {\n'
    '    playChoice();\n'
    '    const nextState = selectFocus(state, focusId);\n'
    '    const focus = focusById(focusId);\n'
    '    const nextMeta = recordTimelineEvent(\n'
    '      rebirth,\n'
    '      nextState,\n'
    '      "focus",\n'
    '      `安排日程：${focus.label}`,\n'
    '      { focusId },\n'
    '    );\n'
    '    setState(nextState);\n'
    '    setRebirth(nextMeta);\n'
    '  }, [playChoice, rebirth, state]);\n',
)
replace_once(
    "src/app/useGameController.ts",
    '    setRebirth(result.meta);\n'
    '    setState(result.state);\n'
    '  }, [playChoice, rebirth, state]);\n\n'
    '  const makeDecisionWithSound = useCallback((decision: ResearchDecision) => {\n'
    '    playChoice();\n'
    '    setState((current) => {\n'
    '      const prepared = prepareDecisionForRebirth(rebirth, current, decision);\n'
    '      return makeDecision(current, data, prepared, branchMetaContext(rebirth));\n'
    '    });\n'
    '  }, [data, playChoice, rebirth]);\n',
    '    const nextMeta = recordTimelineEvent(\n'
    '      result.meta,\n'
    '      result.state,\n'
    '      "investigation",\n'
    '      `完成调查：${nodeId}`,\n'
    '      { nodeId },\n'
    '    );\n'
    '    setRebirth(nextMeta);\n'
    '    setState(result.state);\n'
    '  }, [playChoice, rebirth, state]);\n\n'
    '  const makeDecisionWithSound = useCallback((decision: ResearchDecision) => {\n'
    '    playChoice();\n'
    '    const prepared = prepareDecisionForRebirth(rebirth, state, decision);\n'
    '    const nextState = makeDecision(state, data, prepared, branchMetaContext(rebirth));\n'
    '    const nextMeta = recordTimelineEvent(\n'
    '      rebirth,\n'
    '      nextState,\n'
    '      "decision",\n'
    '      `提交研究判断：${decision.label}`,\n'
    '      { decisionId: decision.id },\n'
    '    );\n'
    '    setState(nextState);\n'
    '    setRebirth(nextMeta);\n'
    '  }, [data, playChoice, rebirth, state]);\n\n'
    '  const forkTimelineWithSound = useCallback((anchorId: string) => {\n'
    '    const result = forkTimelineAtAnchor(rebirth, state, anchorId);\n'
    '    if (!result.changed) return;\n'
    '    playChoice();\n'
    '    resetLineVoice();\n'
    '    setRebirth(result.meta);\n'
    '    setState(result.state);\n'
    '  }, [playChoice, rebirth, resetLineVoice, state]);\n\n'
    '  const resumeTimelineWithSound = useCallback((branchId: string) => {\n'
    '    const result = resumeTimelineBranch(rebirth, state, branchId);\n'
    '    if (!result.changed) return;\n'
    '    playChoice();\n'
    '    resetLineVoice();\n'
    '    setRebirth(result.meta);\n'
    '    setState(result.state);\n'
    '  }, [playChoice, rebirth, resetLineVoice, state]);\n\n'
    '  const simulateTimeline = useCallback((\n'
    '    anchorId: string,\n'
    '    profileId: TimelineSimulationProfileId,\n'
    '  ) => {\n'
    '    playChoice();\n'
    '    setRebirth((current) => simulateTimelineAnchor(current, anchorId, profileId));\n'
    '  }, [playChoice]);\n',
)
replace_once(
    "src/app/useGameController.ts",
    '    goBack,\n'
    '    inspectOfficeWithSound,\n',
    '    forkTimelineWithSound,\n'
    '    goBack,\n'
    '    inspectOfficeWithSound,\n',
)
replace_once(
    "src/app/useGameController.ts",
    '    restart,\n'
    '    scene,\n',
    '    restart,\n'
    '    resumeTimelineWithSound,\n'
    '    scene,\n',
)
replace_once(
    "src/app/useGameController.ts",
    '    selectFocusWithSound,\n'
    '    skipReadScene,\n',
    '    selectFocusWithSound,\n'
    '    simulateTimeline,\n'
    '    skipReadScene,\n',
)

# 档案抽屉把年度流程升级成因果回溯。
replace_once(
    "src/app/ImmersiveGameScreen.tsx",
    '  RebirthArchiveSection,\n'
    '  RebirthFlowPanel,\n',
    '  RebirthArchiveSection,\n',
)
replace_once(
    "src/app/ImmersiveGameScreen.tsx",
    'import { StatusBar } from "../components/StatusBar";\n',
    'import { RebirthTimelinePanel } from "../components/RebirthTimelinePanel";\n'
    'import { StatusBar } from "../components/StatusBar";\n',
)
replace_once(
    "src/app/ImmersiveGameScreen.tsx",
    '>年度流程</button>\n',
    '>因果回溯</button>\n',
)
replace_once(
    "src/app/ImmersiveGameScreen.tsx",
    '          {tab === "flow" ? (\n'
    '            <RebirthFlowPanel meta={session.rebirth} state={session.state} />\n'
    '          ) : null}\n',
    '          {tab === "flow" ? (\n'
    '            <RebirthTimelinePanel\n'
    '              meta={session.rebirth}\n'
    '              state={session.state}\n'
    '              onFork={session.forkTimelineWithSound}\n'
    '              onResume={session.resumeTimelineWithSound}\n'
    '              onSimulate={session.simulateTimeline}\n'
    '            />\n'
    '          ) : null}\n',
)

# 样式与结构校验。
replace_once(
    "src/main.tsx",
    'import "./rebirth-v2.css";\n',
    'import "./rebirth-v2.css";\n'
    'import "./timeline.css";\n',
)
replace_once(
    "scripts/validate_frontend.js",
    '  "src/rebirth-v2.css",\n',
    '  "src/rebirth-v2.css",\n'
    '  "src/timeline.css",\n',
)
replace_once(
    "scripts/validate_frontend.js",
    '  "src/components/EndingPanel.tsx",\n',
    '  "src/components/EndingPanel.tsx",\n'
    '  "src/components/RebirthTimelinePanel.tsx",\n',
)
replace_once(
    "scripts/validate_frontend.js",
    '  "src/game/rebirthSpecialDecisions.ts",\n',
    '  "src/game/rebirthSpecialDecisions.ts",\n'
    '  "src/game/rebirthTimeline.ts",\n'
    '  "src/game/rebirthTimeline.test.ts",\n'
    '  "src/game/rebirthTimelineInsights.ts",\n'
    '  "src/game/rebirthTimelineState.ts",\n',
)
replace_once(
    "scripts/validate_frontend.js",
    '  "RebirthFlowPanel",\n',
    '  "RebirthTimelinePanel",\n',
)
replace_once(
    "scripts/validate_frontend.js",
    '  "OfficeHubPanel",\n',
    '  "OfficeHubPanel",\n'
    '  "因果回溯",\n',
)

# 旧重生测试更新版本断言。
replace_once(
    "src/game/rebirth.test.ts",
    '    expect(restored.version).toBe(2);\n',
    '    expect(restored.version).toBe(3);\n',
)
replace_once(
    "src/game/rebirth.test.ts",
    '  it("持久化使用 v2 键并保留跨周目状态", () => {\n',
    '  it("持久化使用 v3 键并保留跨周目状态", () => {\n',
)

print("timeline rewind integration applied")
