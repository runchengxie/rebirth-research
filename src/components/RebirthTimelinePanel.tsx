import { useMemo, useState } from "react";
import type { GameState } from "../types";
import type { RebirthMetaState } from "../game/rebirth";
import {
  canForkTimelineAnchor,
} from "../game/rebirthTimeline";
import {
  simulationProfileViews,
  simulationsForAnchor,
  timelineAnchorDetail,
  timelineBranchViews,
  timelineMonthViews,
} from "../game/rebirthTimelineInsights";
import type { TimelineSimulationProfileId } from "../game/rebirthTimelineState";

interface RebirthTimelinePanelProps {
  meta: RebirthMetaState;
  state: GameState;
  onFork: (anchorId: string) => void;
  onResume: (branchId: string) => void;
  onSimulate: (anchorId: string, profileId: TimelineSimulationProfileId) => void;
}

function statusLabel(status: "active" | "paused" | "completed"): string {
  if (status === "active") return "正在推进";
  if (status === "paused") return "已暂停";
  return "已完成";
}

function BranchSelector({
  meta,
  selectedBranchId,
  onSelect,
  onResume,
}: {
  meta: RebirthMetaState;
  selectedBranchId: string;
  onSelect: (branchId: string) => void;
  onResume: (branchId: string) => void;
}) {
  const branches = timelineBranchViews(meta);
  return (
    <div className="timeline-branch-list" aria-label="时间线列表">
      {branches.map((branch) => (
        <article
          className={`${branch.id === selectedBranchId ? "selected" : ""} ${branch.status}`}
          key={branch.id}
        >
          <button type="button" onClick={() => onSelect(branch.id)}>
            <span>第 {branch.cycle} 周目 · {statusLabel(branch.status)}</span>
            <strong>{branch.label}</strong>
            <small>
              完成 {branch.completedMonths}/12 月
              {branch.endingId ? ` · 结局 ${branch.endingId}` : ""}
            </small>
          </button>
          {branch.canResume ? (
            <button className="timeline-resume" type="button" onClick={() => onResume(branch.id)}>
              继续这条线
            </button>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function TimelineMonthGraph({
  meta,
  branchId,
  selectedAnchorId,
  onSelectAnchor,
}: {
  meta: RebirthMetaState;
  branchId: string;
  selectedAnchorId: string | null;
  onSelectAnchor: (anchorId: string) => void;
}) {
  const months = timelineMonthViews(meta, branchId);
  return (
    <ol className="timeline-month-graph">
      {months.map((month) => (
        <li className={`${month.status} ${month.keyMonth ? "key-month" : ""}`} key={month.monthKey}>
          <button
            className={month.anchorId === selectedAnchorId ? "selected" : ""}
            disabled={!month.anchorId}
            type="button"
            onClick={() => month.anchorId && onSelectAnchor(month.anchorId)}
          >
            <span>{month.label}</span>
            <strong>{month.title}</strong>
            {month.anchorId ? <b>回溯锚点</b> : null}
            {month.decisionLabel ? <p>{month.decisionLabel}</p> : null}
            {month.investigationProgress ? <small>{month.investigationProgress}</small> : null}
            {month.grade ? <i>评级 {month.grade}</i> : null}
            {month.eventCount > 0 ? <em>{month.eventCount} 项行动</em> : null}
          </button>
        </li>
      ))}
    </ol>
  );
}

function ProjectionGrid({
  projection,
}: {
  projection: {
    researchCredibility: number;
    committeeAdoption: number;
    teamTrust: number;
    fatigue: number;
    lifeBalance: number;
  };
}) {
  return (
    <dl className="timeline-projection-grid">
      <div><dt>研究可信度</dt><dd>{projection.researchCredibility}</dd></div>
      <div><dt>投委会采纳</dt><dd>{projection.committeeAdoption}</dd></div>
      <div><dt>团队信任</dt><dd>{projection.teamTrust}</dd></div>
      <div><dt>疲劳</dt><dd>{projection.fatigue}</dd></div>
      <div><dt>生活平衡</dt><dd>{projection.lifeBalance}</dd></div>
    </dl>
  );
}

function AnchorInspector({
  meta,
  state,
  anchorId,
  onFork,
  onSimulate,
}: {
  meta: RebirthMetaState;
  state: GameState;
  anchorId: string;
  onFork: (anchorId: string) => void;
  onSimulate: (anchorId: string, profileId: TimelineSimulationProfileId) => void;
}) {
  const detail = timelineAnchorDetail(meta, anchorId);
  if (!detail) return null;
  const forkReason = canForkTimelineAnchor(meta, state, anchorId);
  const profiles = simulationProfileViews(meta);
  const simulations = simulationsForAnchor(meta, anchorId);
  return (
    <section className="timeline-anchor-inspector" aria-label="回溯锚点详情">
      <header>
        <div>
          <span>观看模式 · 第 {detail.anchor.cycle} 周目</span>
          <h4>{detail.anchor.label}</h4>
        </div>
        <b>月初快照</b>
      </header>
      <p className="timeline-relation-summary">当时关系：{detail.relationSummary}</p>
      <div className="timeline-annotation-list">
        {detail.annotations.map((annotation) => (
          <article className={`source-${annotation.source}`} key={annotation.id}>
            <span>{annotation.source === "memory" ? "后来获得的理解" : "原时间线记录"}</span>
            <strong>{annotation.label}</strong>
            <p>{annotation.description}</p>
          </article>
        ))}
      </div>

      <div className="timeline-fork-box">
        <div>
          <span>分叉模式</span>
          <strong>从这个月初建立一条新时间线</strong>
          <p>原路线会永久保留。新路线恢复当时状态，但携带当前已经获得的记忆钥匙。</p>
        </div>
        <button disabled={Boolean(forkReason)} type="button" onClick={() => onFork(anchorId)}>
          {forkReason ?? "从这里创建分支"}
        </button>
      </div>

      <div className="timeline-simulation-box">
        <header>
          <span>推演模式</span>
          <strong>比较反事实，不改写当前进度</strong>
        </header>
        <div className="timeline-simulation-actions">
          {profiles.map((profile) => (
            <button
              disabled={Boolean(profile.lockedReason)}
              key={profile.id}
              title={profile.lockedReason ?? undefined}
              type="button"
              onClick={() => onSimulate(anchorId, profile.id)}
            >
              <strong>{profile.label}</strong>
              <span>{profile.lockedReason ?? profile.summary}</span>
            </button>
          ))}
        </div>
        {simulations.length > 0 ? (
          <div className="timeline-simulation-results">
            {simulations.map((simulation) => (
              <article key={simulation.id}>
                <strong>{simulation.label}</strong>
                <p>{simulation.explanation}</p>
                <ProjectionGrid projection={simulation.projection} />
                <small>{simulation.caveat}</small>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function RebirthTimelinePanel({
  meta,
  state,
  onFork,
  onResume,
  onSimulate,
}: RebirthTimelinePanelProps) {
  const branches = timelineBranchViews(meta);
  const defaultBranchId = meta.timeline.activeBranchId ?? branches[0]?.id ?? "";
  const [selectedBranchId, setSelectedBranchId] = useState(defaultBranchId);
  const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(null);

  const resolvedBranchId = branches.some((branch) => branch.id === selectedBranchId)
    ? selectedBranchId
    : defaultBranchId;
  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === resolvedBranchId) ?? null,
    [branches, resolvedBranchId],
  );
  const selectedEvents = meta.timeline.branches
    .find((branch) => branch.id === resolvedBranchId)?.events.slice(-8) ?? [];

  if (branches.length === 0) {
    return (
      <section className="archive-section timeline-rewind">
        <h3>因果回溯</h3>
        <p className="archive-empty">进入关键月份后，系统会保存第一枚月初锚点。</p>
      </section>
    );
  }

  return (
    <section className="archive-section timeline-rewind" aria-label="互动影游式因果回溯">
      <header className="rebirth-section-head">
        <div>
          <h3>因果回溯</h3>
          <p>观看旧路线、从关键月分叉，或只做反事实推演。原错误不会被覆盖。</p>
        </div>
        <b>{branches.length} 条时间线</b>
      </header>
      <div className="timeline-mode-strip">
        <span><b>观看</b> 回看快照与因果注释</span>
        <span><b>分叉</b> 恢复月初状态继续游玩</span>
        <span><b>推演</b> 比较可能结果但不改存档</span>
      </div>

      <BranchSelector
        meta={meta}
        selectedBranchId={resolvedBranchId}
        onSelect={(branchId) => {
          setSelectedBranchId(branchId);
          setSelectedAnchorId(null);
        }}
        onResume={onResume}
      />

      {selectedBranch ? (
        <>
          <TimelineMonthGraph
            meta={meta}
            branchId={selectedBranch.id}
            selectedAnchorId={selectedAnchorId}
            onSelectAnchor={setSelectedAnchorId}
          />
          {selectedEvents.length > 0 ? (
            <div className="timeline-event-log">
              <strong>最近行动</strong>
              <ol>
                {selectedEvents.map((event) => (
                  <li key={event.id}>
                    <span>{event.monthIndex + 1}月</span>
                    <p>{event.label}</p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </>
      ) : null}

      {selectedAnchorId ? (
        <AnchorInspector
          meta={meta}
          state={state}
          anchorId={selectedAnchorId}
          onFork={onFork}
          onSimulate={onSimulate}
        />
      ) : (
        <p className="timeline-select-hint">选择带有回溯锚点的关键月份，查看当时状态和后来补出的因果连接。</p>
      )}
    </section>
  );
}
