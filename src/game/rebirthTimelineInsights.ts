import type { GameState, RoundResult } from "../types";
import { getTheme } from "./content";
import { MEMORY_KEYS, type MemoryKeyId, type RebirthMetaState } from "./rebirth";
import {
  TIMELINE_KEY_MONTHS,
  type TimelineAnchor,
  type TimelineBranch,
  type TimelineSimulationProfileId,
} from "./rebirthTimelineState";

export interface TimelineBranchView {
  id: string;
  label: string;
  cycle: number;
  status: TimelineBranch["status"];
  parentBranchId: string | null;
  currentMonth: number;
  completedMonths: number;
  endingId: string | null;
  active: boolean;
  canResume: boolean;
}

export interface TimelineMonthView {
  monthIndex: number;
  monthKey: string;
  label: string;
  title: string;
  status: "completed" | "current" | "locked";
  keyMonth: boolean;
  anchorId: string | null;
  decisionLabel: string | null;
  grade: string | null;
  investigationProgress: string | null;
  eventCount: number;
}

export interface CausalAnnotation {
  id: string;
  label: string;
  description: string;
  source: "base" | "memory" | "result" | "relationship";
}

export interface TimelineAnchorDetail {
  anchor: TimelineAnchor;
  result: RoundResult | null;
  annotations: CausalAnnotation[];
  relationSummary: string;
}

export interface SimulationProfileView {
  id: TimelineSimulationProfileId;
  label: string;
  summary: string;
  lockedReason: string | null;
}

interface SimulationProfileDefinition {
  id: TimelineSimulationProfileId;
  label: string;
  summary: string;
  requiredKey: MemoryKeyId;
  deltas: {
    researchCredibility: number;
    committeeAdoption: number;
    teamTrust: number;
    fatigue: number;
    lifeBalance: number;
  };
  explanation: string;
}

const SIMULATION_PROFILES: SimulationProfileDefinition[] = [
  {
    id: "evidence_audit",
    label: "补齐证据链",
    summary: "把未来结论拆回当时可见的变量、时点和反例。",
    requiredKey: "causal_gap",
    deltas: {
      researchCredibility: 8,
      committeeAdoption: 4,
      teamTrust: 3,
      fatigue: 4,
      lifeBalance: -2,
    },
    explanation: "推演假设你把结论中间缺失的变量补齐。可信度提高，工作量也会真实增加。",
  },
  {
    id: "sample_recovery",
    label: "恢复失败样本",
    summary: "把被筛掉的区间、异常值和拥挤后的回撤放回模型。",
    requiredKey: "sample_pollution",
    deltas: {
      researchCredibility: 6,
      committeeAdoption: 2,
      teamTrust: 5,
      fatigue: 3,
      lifeBalance: -1,
    },
    explanation: "推演保留完整样本。结论可能没那么漂亮，但数据关系更可靠。",
  },
  {
    id: "staged_exposure",
    label: "保留观察仓",
    summary: "用分阶段验证替代追涨与完全等待的二选一。",
    requiredKey: "opportunity_cost",
    deltas: {
      researchCredibility: 4,
      committeeAdoption: 6,
      teamTrust: 4,
      fatigue: 1,
      lifeBalance: 0,
    },
    explanation: "推演使用观察仓控制机会成本。它不保证收益，只让错误有更小的代价。",
  },
  {
    id: "sustainable_pace",
    label: "降低透支",
    summary: "把疲劳对判断、沟通和关系的污染纳入决策。",
    requiredKey: "body_memory",
    deltas: {
      researchCredibility: 2,
      committeeAdoption: 1,
      teamTrust: 3,
      fatigue: -12,
      lifeBalance: 10,
    },
    explanation: "推演减少连续透支。短期产出略少，判断稳定性与关系边界得到保留。",
  },
];

function monthKey(year: string, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function resultForAnchor(branch: TimelineBranch, anchor: TimelineAnchor): RoundResult | null {
  return branch.headState.history.find((result) => result.month === anchor.monthKey) ?? null;
}

function relationSummary(state: GameState): string {
  return [
    `林若宁 ${state.relations.lin_ruoning}`,
    `陈星禾 ${state.relations.chen_xinghe}`,
    `周明昭 ${state.relations.zhou_mingzhao}`,
    `赵承宇 ${state.relations.zhao_chengyu}`,
  ].join(" · ");
}

function baseAnnotations(anchor: TimelineAnchor): CausalAnnotation[] {
  return [
    {
      id: "state-capacity",
      label: "当时的判断容量",
      description: `疲劳 ${anchor.state.fatigue}，生活平衡 ${anchor.state.lifeBalance}。回溯会恢复当时状态，不会把后来练出的耐力伪装成过去已有。`,
      source: "base",
    },
    {
      id: "relationship-boundary",
      label: "关系不是密码锁",
      description: "锚点之前形成的信任、失约和边界会原样保留。分叉只重写后续行动，不自动修复人物关系。",
      source: "relationship",
    },
  ];
}

function memoryAnnotations(meta: RebirthMetaState): CausalAnnotation[] {
  const annotations: CausalAnnotation[] = [];
  if (meta.memoryKeys.includes("causal_gap")) {
    annotations.push({
      id: "causal-gap",
      label: MEMORY_KEYS.causal_gap.label,
      description: "流程图补出结论与结果之间缺失的收入、利润、留存和时点变量。",
      source: "memory",
    });
  }
  if (meta.memoryKeys.includes("sample_pollution")) {
    annotations.push({
      id: "sample-pollution",
      label: MEMORY_KEYS.sample_pollution.label,
      description: "流程图标记被隐藏的失败区间。漂亮回测不再自动获得可信身份。",
      source: "memory",
    });
  }
  if (meta.memoryKeys.includes("body_memory")) {
    annotations.push({
      id: "body-memory",
      label: MEMORY_KEYS.body_memory.label,
      description: "流程图显示疲劳如何改变证据读取、沟通质量和关系边界。",
      source: "memory",
    });
  }
  if (meta.memoryKeys.includes("opportunity_cost")) {
    annotations.push({
      id: "opportunity-cost",
      label: MEMORY_KEYS.opportunity_cost.label,
      description: "流程图补上没有行动的后果，并显示观察仓等可调整路径。",
      source: "memory",
    });
  }
  return annotations;
}

function resultAnnotations(result: RoundResult | null): CausalAnnotation[] {
  if (!result) return [];
  const annotations: CausalAnnotation[] = [
    {
      id: "actual-decision",
      label: "实际选择",
      description: `${result.selected.label}。${result.businessVerdict ?? result.outcome.detail}`,
      source: "result",
    },
  ];
  if (result.isParachuted) {
    annotations.push({
      id: "parachuted-result",
      label: "结果正确不等于推导完整",
      description: "这条时间线命中了方向，却没有建立可复用的中间步骤。回溯会保留这次错误记录。",
      source: "result",
    });
  }
  return annotations;
}

export function timelineBranchViews(meta: RebirthMetaState): TimelineBranchView[] {
  return [...meta.timeline.branches]
    .sort((left, right) => left.sequence - right.sequence)
    .map((branch) => ({
      id: branch.id,
      label: branch.label,
      cycle: branch.cycle,
      status: branch.status,
      parentBranchId: branch.parentBranchId,
      currentMonth: branch.headState.monthIndex + 1,
      completedMonths: branch.headState.history.length,
      endingId: branch.endingId,
      active: branch.id === meta.timeline.activeBranchId,
      canResume: branch.status === "paused",
    }));
}

export function timelineMonthViews(
  meta: RebirthMetaState,
  branchId: string,
): TimelineMonthView[] {
  const branch = meta.timeline.branches.find((candidate) => candidate.id === branchId);
  if (!branch) return [];
  return Array.from({ length: 12 }, (_, monthIndex) => {
    const key = monthKey(branch.headState.year, monthIndex);
    const result = branch.headState.history.find((item) => item.month === key);
    const progress = branch.investigations[key];
    const status = result
      ? "completed" as const
      : monthIndex === branch.headState.monthIndex && branch.status !== "completed"
        ? "current" as const
        : "locked" as const;
    const anchorId = branch.anchorIds
      .map((id) => meta.timeline.anchors.find((anchor) => anchor.id === id))
      .find((anchor) => anchor?.monthIndex === monthIndex)?.id ?? null;
    const theme = getTheme(branch.headState.year, monthIndex);
    return {
      monthIndex,
      monthKey: key,
      label: `${monthIndex + 1}月`,
      title: theme.title,
      status,
      keyMonth: TIMELINE_KEY_MONTHS.includes(
        monthIndex as (typeof TIMELINE_KEY_MONTHS)[number],
      ),
      anchorId,
      decisionLabel: result?.selected.label ?? null,
      grade: result?.score?.grade ?? null,
      investigationProgress: progress
        ? `${progress.completedNodeIds.length} 条路径 · ${progress.clueIds.length} 条线索`
        : null,
      eventCount: branch.events.filter((event) => event.monthIndex === monthIndex).length,
    };
  });
}

export function timelineAnchorDetail(
  meta: RebirthMetaState,
  anchorId: string,
): TimelineAnchorDetail | null {
  const anchor = meta.timeline.anchors.find((candidate) => candidate.id === anchorId);
  if (!anchor) return null;
  const branch = meta.timeline.branches.find((candidate) => candidate.id === anchor.branchId);
  if (!branch) return null;
  const result = resultForAnchor(branch, anchor);
  return {
    anchor,
    result,
    annotations: [
      ...baseAnnotations(anchor),
      ...memoryAnnotations(meta),
      ...resultAnnotations(result),
    ],
    relationSummary: relationSummary(anchor.state),
  };
}

export function simulationProfileViews(meta: RebirthMetaState): SimulationProfileView[] {
  return SIMULATION_PROFILES.map((profile) => ({
    id: profile.id,
    label: profile.label,
    summary: profile.summary,
    lockedReason: meta.memoryKeys.includes(profile.requiredKey)
      ? null
      : `需要记忆钥匙：${MEMORY_KEYS[profile.requiredKey].label}`,
  }));
}

export function simulateTimelineAnchor(
  meta: RebirthMetaState,
  anchorId: string,
  profileId: TimelineSimulationProfileId,
): RebirthMetaState {
  const anchor = meta.timeline.anchors.find((candidate) => candidate.id === anchorId);
  const profile = SIMULATION_PROFILES.find((candidate) => candidate.id === profileId);
  if (!anchor || !profile || !meta.memoryKeys.includes(profile.requiredKey)) return meta;

  const serial = meta.timeline.nextSimulationSerial;
  const sequence = meta.timeline.sequence + 1;
  const projection = {
    researchCredibility: clamp(
      anchor.state.researchCredibility + profile.deltas.researchCredibility,
    ),
    committeeAdoption: clamp(
      anchor.state.committeeAdoption + profile.deltas.committeeAdoption,
    ),
    teamTrust: clamp(anchor.state.teamTrust + profile.deltas.teamTrust),
    fatigue: clamp(anchor.state.fatigue + profile.deltas.fatigue),
    lifeBalance: clamp(anchor.state.lifeBalance + profile.deltas.lifeBalance),
  };
  const simulation = {
    id: `timeline-s${serial}`,
    anchorId,
    branchId: anchor.branchId,
    profileId,
    label: profile.label,
    explanation: profile.explanation,
    caveat: "这是基于当时状态和当前知识的反事实推演，不会修改实际时间线，也不保证角色会接受一次正确按钮。",
    projection,
    sequence,
  };
  const withoutDuplicate = meta.timeline.simulations.filter((item) => (
    item.anchorId !== anchorId || item.profileId !== profileId
  ));
  return {
    ...meta,
    timeline: {
      ...meta.timeline,
      nextSimulationSerial: serial + 1,
      sequence,
      simulations: [...withoutDuplicate, simulation].slice(-32),
    },
  };
}

export function simulationsForAnchor(
  meta: RebirthMetaState,
  anchorId: string,
) {
  return meta.timeline.simulations
    .filter((simulation) => simulation.anchorId === anchorId)
    .sort((left, right) => left.sequence - right.sequence);
}
