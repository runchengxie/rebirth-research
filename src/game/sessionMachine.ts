import { GAME_DATA } from "../data/gameData";
import type { GameState, ResearchDecision } from "../types";
import {
  advanceScene,
  canAdvanceScene,
  canRewindScene,
  createInitialState,
  currentSceneNode,
  rewindScene,
  sceneForMonth,
} from "./runtime";
import {
  branchMetaContext,
  completeRebirthCycle,
  endingIdFor,
  performInvestigation,
  prepareDecisionForRebirth,
  type RebirthMetaState,
} from "./rebirth";
import { isSceneNodeRead, markSceneNodeRead, skipReadSceneNodes } from "./rebirthFlow";
import { inspectOfficeProp, type OfficePropId } from "./rebirthOffice";
import {
  captureTimelineAnchor,
  completeActiveTimelineBranch,
  forkTimelineAtAnchor,
  recordTimelineEvent,
  restartTimelineRun,
  resumeTimelineBranch,
  startTimelineCycle,
  syncActiveTimelineBranch,
} from "./rebirthTimeline";
import { simulateTimelineAnchor } from "./rebirthTimelineInsights";
import type { TimelineSimulationProfileId } from "./rebirthTimelineState";
import { focusById, makeDecision, selectFocus } from "./engine";

export interface GameSessionSnapshot {
  state: GameState;
  rebirth: RebirthMetaState;
}

export type GameSessionAction =
  | { type: "replace"; snapshot: GameSessionSnapshot }
  | { type: "restart" }
  | { type: "advance" }
  | { type: "rewind" }
  | { type: "skip-read" }
  | { type: "inspect-office"; propId: OfficePropId }
  | { type: "select-focus"; focusId: string }
  | { type: "investigate"; nodeId: string }
  | { type: "make-decision"; decision: ResearchDecision }
  | { type: "fork-timeline"; anchorId: string }
  | { type: "resume-timeline"; branchId: string }
  | { type: "simulate-timeline"; anchorId: string; profileId: TimelineSimulationProfileId };

function withTimeline(
  snapshot: GameSessionSnapshot,
  state: GameState,
  rebirth: RebirthMetaState,
): GameSessionSnapshot {
  return {
    state,
    rebirth: syncActiveTimelineBranch(rebirth, state),
  };
}

function reduceAdvance(snapshot: GameSessionSnapshot): GameSessionSnapshot {
  const { state, rebirth } = snapshot;
  const branchMeta = branchMetaContext(rebirth);
  if (!canAdvanceScene(state, branchMeta)) return snapshot;

  const scene = sceneForMonth(state, branchMeta);
  const node = currentSceneNode(state, branchMeta);
  let nextMeta = node.type === "dialogue"
    ? markSceneNodeRead(rebirth, state, node.id)
    : rebirth;
  const isCycleEnd = state.finished && state.sceneNodeIndex >= scene.nodes.length - 1;

  if (isCycleEnd) {
    nextMeta = completeActiveTimelineBranch(nextMeta, state, endingIdFor(state));
    nextMeta = completeRebirthCycle(nextMeta, state);
    const nextState = createInitialState(state.year);
    nextMeta = startTimelineCycle(nextMeta, nextState);
    return { state: nextState, rebirth: nextMeta };
  }

  const nextState = advanceScene(state, GAME_DATA[state.year], branchMetaContext(nextMeta));
  nextMeta = captureTimelineAnchor(
    syncActiveTimelineBranch(nextMeta, nextState),
    nextState,
  );
  return { state: nextState, rebirth: nextMeta };
}

function reduceSkipRead(snapshot: GameSessionSnapshot): GameSessionSnapshot {
  const { state, rebirth } = snapshot;
  const branchMeta = branchMetaContext(rebirth);
  const node = currentSceneNode(state, branchMeta);
  const canSkip = rebirth.cycle >= 2
    && node.type === "dialogue"
    && !state.locked
    && isSceneNodeRead(rebirth, state, node.id);
  if (!canSkip) return snapshot;

  const nextState = skipReadSceneNodes(
    rebirth,
    state,
    GAME_DATA[state.year],
    branchMeta,
  );
  return withTimeline(snapshot, nextState, rebirth);
}

function reduceOffice(
  snapshot: GameSessionSnapshot,
  propId: OfficePropId,
): GameSessionSnapshot {
  const result = inspectOfficeProp(snapshot.rebirth, snapshot.state, propId);
  if (!result.changed) return snapshot;
  const rebirth = recordTimelineEvent(
    result.meta,
    result.state,
    "office",
    `整理研究室：${propId}`,
    { propId },
  );
  return { state: result.state, rebirth };
}

function reduceFocus(snapshot: GameSessionSnapshot, focusId: string): GameSessionSnapshot {
  const nextState = selectFocus(snapshot.state, focusId);
  if (nextState === snapshot.state) return snapshot;
  const focus = focusById(focusId);
  const rebirth = recordTimelineEvent(
    snapshot.rebirth,
    nextState,
    "focus",
    `安排日程：${focus.label}`,
    { focusId },
  );
  return { state: nextState, rebirth };
}

function reduceInvestigation(
  snapshot: GameSessionSnapshot,
  nodeId: string,
): GameSessionSnapshot {
  const result = performInvestigation(snapshot.rebirth, snapshot.state, nodeId);
  if (!result.changed) return snapshot;
  const rebirth = recordTimelineEvent(
    result.meta,
    result.state,
    "investigation",
    `完成调查：${nodeId}`,
    { nodeId },
  );
  return { state: result.state, rebirth };
}

function reduceDecision(
  snapshot: GameSessionSnapshot,
  decision: ResearchDecision,
): GameSessionSnapshot {
  const prepared = prepareDecisionForRebirth(snapshot.rebirth, snapshot.state, decision);
  const nextState = makeDecision(
    snapshot.state,
    GAME_DATA[snapshot.state.year],
    prepared,
    branchMetaContext(snapshot.rebirth),
  );
  if (nextState === snapshot.state) return snapshot;
  const rebirth = recordTimelineEvent(
    snapshot.rebirth,
    nextState,
    "decision",
    `提交研究判断：${decision.label}`,
    { decisionId: decision.id },
  );
  return { state: nextState, rebirth };
}

export function gameSessionReducer(
  snapshot: GameSessionSnapshot,
  action: GameSessionAction,
): GameSessionSnapshot {
  switch (action.type) {
    case "replace":
      return action.snapshot;
    case "restart": {
      const state = createInitialState(snapshot.state.year);
      const rebirth = restartTimelineRun(snapshot.rebirth, snapshot.state, state);
      return { state, rebirth };
    }
    case "advance":
      return reduceAdvance(snapshot);
    case "rewind": {
      const branchMeta = branchMetaContext(snapshot.rebirth);
      if (!canRewindScene(snapshot.state, branchMeta)) return snapshot;
      const state = rewindScene(snapshot.state, branchMeta);
      return withTimeline(snapshot, state, snapshot.rebirth);
    }
    case "skip-read":
      return reduceSkipRead(snapshot);
    case "inspect-office":
      return reduceOffice(snapshot, action.propId);
    case "select-focus":
      return reduceFocus(snapshot, action.focusId);
    case "investigate":
      return reduceInvestigation(snapshot, action.nodeId);
    case "make-decision":
      return reduceDecision(snapshot, action.decision);
    case "fork-timeline": {
      const result = forkTimelineAtAnchor(snapshot.rebirth, snapshot.state, action.anchorId);
      return result.changed ? { state: result.state, rebirth: result.meta } : snapshot;
    }
    case "resume-timeline": {
      const result = resumeTimelineBranch(snapshot.rebirth, snapshot.state, action.branchId);
      return result.changed ? { state: result.state, rebirth: result.meta } : snapshot;
    }
    case "simulate-timeline":
      return {
        ...snapshot,
        rebirth: simulateTimelineAnchor(
          snapshot.rebirth,
          action.anchorId,
          action.profileId,
        ),
      };
  }
}
