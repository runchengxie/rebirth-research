import { describe, expect, it } from "vitest";
import { createRebirthMeta } from "./rebirth";
import {
  completeActiveTimelineBranch,
  ensureTimelineInitialized,
  forkTimelineAtAnchor,
  restartTimelineRun,
  startTimelineCycle,
} from "./rebirthTimeline";
import { TIMELINE_BRANCH_LIMIT } from "./rebirthTimelineState";
import { createInitialState } from "./runtime";

function completedMeta() {
  const initial = createInitialState("2025");
  let meta = ensureTimelineInitialized(createRebirthMeta("2025"), initial);
  const anchorId = meta.timeline.anchors[0]?.id ?? "";
  const finished = {
    ...initial,
    monthIndex: 11,
    locked: true,
    finished: true,
  };
  meta = completeActiveTimelineBranch(meta, finished, "ordinary");
  return {
    anchorId,
    finished,
    meta: {
      ...meta,
      cycle: 2,
      completedCycles: [
        { cycle: 1, endingId: "ordinary", averageReasoning: 0, unlocked: [] },
      ],
    },
  };
}

describe("回溯安全边界", () => {
  it("剧情内容版本变化后保留观看能力并禁止恢复旧快照", () => {
    const { meta, finished, anchorId } = completedMeta();
    const changedContent = { ...finished, contentRevision: "future-content-revision" };
    const result = forkTimelineAtAnchor(meta, changedContent, anchorId);

    expect(result.changed).toBe(false);
    expect(result.reason).toContain("剧情版本");
    expect(meta.timeline.anchors.some((anchor) => anchor.id === anchorId)).toBe(true);
  });

  it("达到时间线数量上限后拒绝继续分叉", () => {
    const { meta, finished, anchorId } = completedMeta();
    const template = meta.timeline.branches[0];
    if (!template) throw new Error("测试需要一条已完成时间线");
    const branches = Array.from({ length: TIMELINE_BRANCH_LIMIT }, (_, index) => ({
      ...template,
      id: `limit-branch-${index + 1}`,
      label: `上限测试 ${index + 1}`,
      sequence: index + 1,
    }));
    branches[0] = { ...branches[0], id: template.id };
    const limited = {
      ...meta,
      timeline: {
        ...meta.timeline,
        branches,
      },
    };
    const result = forkTimelineAtAnchor(limited, finished, anchorId);

    expect(result.changed).toBe(false);
    expect(result.reason).toContain("上限");
    expect(result.meta.timeline.branches).toHaveLength(TIMELINE_BRANCH_LIMIT);
  });

  it("重新开始和进入新周目会自动维持十二条容量", () => {
    const initial = createInitialState("2025");
    const activeMeta = ensureTimelineInitialized(createRebirthMeta("2025"), initial);
    const activeTemplate = activeMeta.timeline.branches[0];
    if (!activeTemplate) throw new Error("测试需要一条活跃时间线");
    const activeBranches = Array.from(
      { length: TIMELINE_BRANCH_LIMIT },
      (_, index) => ({
        ...activeTemplate,
        id: index === 0 ? activeTemplate.id : `completed-${index}`,
        status: index === 0 ? "active" as const : "completed" as const,
        sequence: index + 1,
      }),
    );
    const activeLimited = {
      ...activeMeta,
      timeline: {
        ...activeMeta.timeline,
        activeBranchId: activeTemplate.id,
        branches: activeBranches,
      },
    };
    const restarted = restartTimelineRun(activeLimited, initial, createInitialState("2025"));

    expect(restarted.timeline.branches).toHaveLength(TIMELINE_BRANCH_LIMIT);
    expect(restarted.timeline.branches.some((branch) => branch.id === activeTemplate.id))
      .toBe(false);
    expect(restarted.timeline.activeBranchId).not.toBeNull();

    const { meta } = completedMeta();
    const completedTemplate = meta.timeline.branches[0];
    if (!completedTemplate) throw new Error("测试需要一条已完成时间线");
    const completedBranches = Array.from(
      { length: TIMELINE_BRANCH_LIMIT },
      (_, index) => ({
        ...completedTemplate,
        id: index === 0 ? completedTemplate.id : `old-completed-${index}`,
        sequence: index + 1,
      }),
    );
    const completedLimited = {
      ...meta,
      timeline: {
        ...meta.timeline,
        activeBranchId: null,
        branches: completedBranches,
      },
    };
    const nextCycle = startTimelineCycle(completedLimited, createInitialState("2025"));

    expect(nextCycle.timeline.branches).toHaveLength(TIMELINE_BRANCH_LIMIT);
    expect(nextCycle.timeline.activeBranchId).not.toBeNull();
    expect(nextCycle.timeline.branches.some((branch) => branch.id === completedTemplate.id))
      .toBe(false);
  });
});
