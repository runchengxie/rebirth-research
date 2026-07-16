import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { GAME_YEARS } from "../data/gameData";
import { CHARACTERS } from "../game/content";
import type { CharacterProfile, SceneNode } from "../types";
import { DebatePanel } from "../components/DebatePanel";
import { DecisionCard } from "../components/DecisionCard";
import { EndingPanel } from "../components/EndingPanel";
import { FocusSelector } from "../components/FocusSelector";
import { InvestigationPanel } from "../components/InvestigationPanel";
import { ResearchCommitmentPanel } from "../components/ResearchCommitmentPanel";
import { SaveTransferPanel } from "../components/SaveTransferPanel";
import { StatusBar } from "../components/StatusBar";
import { StoryRecapPanel } from "../components/StoryRecapPanel";
import {
  completedReviewCount,
  createDefaultResearchCommitment,
} from "../game/researchCommitment";
import { experiencePolicy } from "../game/experienceMode";
import { isDebateNode } from "../game/narrativeMachine";
import { recordPlaytestEvent } from "../game/playtestTelemetry";
import { writeSessionEnvelope } from "../game/sessionEnvelope";
import { stakeholderPressureFor } from "../game/stakeholderPressure";
import { buildSceneView } from "./useGameController";
import type {
  GameAudio,
  SettingsMenu,
  ThemeControl,
} from "./useGameController";
import type { MachineGameSession as GameSession } from "./useGameSessionMachine";

const PixiStage = lazy(() =>
  import("../components/PixiStage").then((module) => ({ default: module.PixiStage })),
);
const loadArchiveDrawer = () => import("../components/ArchiveDrawer");
const ArchiveDrawer = lazy(() =>
  loadArchiveDrawer().then((module) => ({ default: module.ArchiveDrawer })),
);

interface ImmersiveGameScreenProps {
  audio: GameAudio;
  session: GameSession;
  settingsOpen: boolean;
  settingsRef: SettingsMenu["settingsRef"];
  setSettingsOpen: SettingsMenu["setSettingsOpen"];
  themeControl: ThemeControl;
  usePixiStage: boolean;
}

function readExactMetricPreference(): boolean {
  try {
    return localStorage.getItem("rebirthShowExactMetrics") === "1";
  } catch {
    return false;
  }
}

function relationshipSignal(value: number): string {
  if (value >= 80) return "关系已进入长期承诺";
  if (value >= 60) return "关系明显深化";
  if (value >= 40) return "专业默契形成";
  return "仍在互相观察";
}

function StaticStage({ color }: { color: string }) {
  return <div className={`pixi-stage pixi-stage-fallback immersive-static character-${color}`} aria-hidden="true" />;
}

export function StageArt({
  activeCharacter,
  activePose,
  sceneBackground,
  showDebate,
  usePixiStage,
}: {
  activeCharacter: CharacterProfile;
  activePose: string;
  sceneBackground: string;
  showDebate: boolean;
  usePixiStage: boolean;
}) {
  let artwork;
  if (showDebate) {
    artwork = <div className={`debate-stage debate-stage-${sceneBackground}`} aria-hidden="true" />;
  } else if (!usePixiStage) {
    artwork = <StaticStage color={activeCharacter.color} />;
  } else {
    artwork = (
      <Suspense fallback={<StaticStage color={activeCharacter.color} />}>
        <PixiStage
          activeCharacter={activeCharacter}
          activePose={activePose}
          backgroundId={sceneBackground}
        />
      </Suspense>
    );
  }

  return artwork;
}

function ResearchBriefs({ node }: { node: SceneNode }) {
  const briefs = node.briefs ?? [];
  if (briefs.length === 0) return null;
  return (
    <div className="immersive-briefs" aria-label="研究线索">
      {briefs.map((brief) => {
        const character = CHARACTERS[brief.characterId];
        return (
          <article className={`immersive-brief ${character.color}`} key={`${brief.characterId}-${brief.label}`}>
            <span>{character.name}</span>
            <strong>{brief.label}</strong>
            <p>{brief.text}</p>
          </article>
        );
      })}
    </div>
  );
}

function DecisionPanel({ session }: { session: GameSession }) {
  const [commitment, setCommitment] = useState(createDefaultResearchCommitment);
  const policy = experiencePolicy(session.rebirth.experienceMode);
  const view = buildSceneView(session);
  const decisionNode = view.decisionNode;
  if (!decisionNode) return null;
  const result = session.state.locked ? view.last : undefined;
  const pressure = stakeholderPressureFor(session.state.year, session.state.monthIndex);

  if (session.state.locked) {
    return (
      <div className="decision-result" aria-live="polite">
        <div className="decision-result-copy">
          <span>本话结算</span>
          <strong>{view.resultText}</strong>
          <p>{view.resultDetail}</p>
        </div>
        <StoryRecapPanel
          experienceMode={session.rebirth.experienceMode}
          result={result}
          state={session.state}
        />
      </div>
    );
  }

  const submitDecision: GameSession["makeDecisionWithSound"] = (decision) => {
    recordPlaytestEvent("decision_submit", {
      year: session.state.year,
      month: session.state.monthIndex + 1,
      cycle: session.rebirth.cycle,
      decisionId: decision.id,
      experienceMode: session.rebirth.experienceMode,
      confidence: policy.showResearchCommitment ? commitment.confidence : "assisted",
      falsifier: policy.showResearchCommitment ? commitment.falsifier : "assisted",
      reviewChecks: policy.showResearchCommitment ? completedReviewCount(commitment) : 3,
    });
    session.makeDecisionWithSound(
      decision,
      policy.showResearchCommitment ? commitment : undefined,
    );
  };

  return (
    <div className={`immersive-decision-panel experience-${policy.id}`}>
      <div className="decision-prompt">
        <span>{policy.id === "romance" ? "本话剧情选择" : "本话研究选择"}</span>
        <strong>{decisionNode.decisionPrompt || session.story.mission}</strong>
      </div>
      {policy.id === "romance" ? (
        <aside className="romance-assist-note">
          <span>剧情辅助已开启</span>
          <strong>研究细节会采用稳健方案，你只需要决定如何回应眼前的人。</strong>
          <small>关系中的承诺、诚实和边界仍会真实影响后续剧情。</small>
        </aside>
      ) : null}
      {policy.showCareerMetrics ? (
        <aside className="stakeholder-pressure">
          <header>
            <span>{pressure.source}</span>
            <strong>{pressure.title}</strong>
          </header>
          <p>{pressure.detail}</p>
          <small>{pressure.tradeoff}</small>
        </aside>
      ) : null}
      {policy.showResearchBriefs ? <ResearchBriefs node={decisionNode} /> : null}
      {policy.showInvestigation ? (
        <InvestigationPanel
          meta={session.rebirth}
          state={session.state}
          onInvestigate={session.investigateWithSound}
        />
      ) : null}
      {policy.showSchedule ? (
        <FocusSelector
          monthIndex={session.state.monthIndex}
          state={session.state}
          theme={session.scene.theme}
          onSelect={(focusId) => {
            recordPlaytestEvent("focus_select", {
              year: session.state.year,
              month: session.state.monthIndex + 1,
              cycle: session.rebirth.cycle,
              focusId,
            });
            session.selectFocusWithSound(focusId);
          }}
        />
      ) : null}
      {policy.showResearchCommitment ? (
        <ResearchCommitmentPanel commitment={commitment} onChange={setCommitment} />
      ) : null}
      <div className="options">
        {view.topDecisions.map((decision, index) => (
          <DecisionCard
            decision={decision}
            index={index}
            key={decision.id}
            experienceMode={session.rebirth.experienceMode}
            state={session.state}
            onChoose={submitDecision}
          />
        ))}
      </div>
    </div>
  );
}

function changeYearFromSettings(session: GameSession, year: string): void {
  const url = new URL(window.location.href);
  if (year === "2025") url.searchParams.delete("year");
  else url.searchParams.set("year", year);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  session.changeYear(year);
}

interface SettingsPopoverProps extends Omit<ImmersiveGameScreenProps, "usePixiStage"> {
  showExactMetrics: boolean;
  onToggleExactMetrics: () => void;
}

function SettingsPopover({
  audio,
  session,
  settingsOpen,
  settingsRef,
  setSettingsOpen,
  themeControl,
  showExactMetrics,
  onToggleExactMetrics,
}: SettingsPopoverProps) {
  const policy = experiencePolicy(session.rebirth.experienceMode);
  return (
    <div className="immersive-settings" ref={settingsRef}>
      <button
        className={`immersive-icon-button ${settingsOpen ? "active" : ""}`}
        type="button"
        aria-label="打开设置"
        aria-expanded={settingsOpen}
        onClick={() => setSettingsOpen((open) => !open)}
      >
        ☰
      </button>
      {settingsOpen ? (
        <div className="immersive-settings-popover">
          <div className="settings-row">
            <span>年份线</span>
            <div className="settings-years">
              {GAME_YEARS.map((year) => (
                <button
                  className={year === session.state.year ? "active" : ""}
                  aria-pressed={year === session.state.year}
                  key={year}
                  type="button"
                  onClick={() => changeYearFromSettings(session, year)}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-row settings-switches">
            <button type="button" onClick={themeControl.toggleTheme}>
              {themeControl.theme === "dark" ? "浅色" : "深色"}
            </button>
            <button aria-pressed={audio.musicOn} type="button" onClick={() => void audio.toggleMusic()}>
              音乐 {audio.musicOn ? "开" : "关"}
            </button>
            <button aria-pressed={audio.soundOn} type="button" onClick={() => void audio.toggleSound()}>
              音效 {audio.soundOn ? "开" : "关"}
            </button>
            {policy.showCareerMetrics ? (
              <button aria-pressed={showExactMetrics} type="button" onClick={onToggleExactMetrics}>
                指标 {showExactMetrics ? "精确" : "叙事"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                const message = policy.id === "romance"
                  ? "重新开始会覆盖当前剧情进度，但不会改变本存档的体验模式。确定继续吗？"
                  : "重新开始会覆盖当前年份的本周目存档，但保留已经获得的记忆钥匙和研究捷径。确定继续吗？";
                if (window.confirm(message)) session.restart();
              }}
            >
              重新开始
            </button>
          </div>
          <small className="metric-mode-note">
            {policy.id === "romance"
              ? "剧情模式会协助处理职业细节，当前存档的体验模式在新游戏时确定。"
              : "叙事指标隐藏精确关系与职业数值。精确指标用于攻略、调试和复盘。"}
          </small>
          <SaveTransferPanel year={session.state.year} />
        </div>
      ) : null}
    </div>
  );
}

export function ImmersiveGameScreen(props: ImmersiveGameScreenProps) {
  const { session, usePixiStage } = props;
  const view = buildSceneView(session);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [showExactMetrics, setShowExactMetrics] = useState(readExactMetricPreference);
  const policy = experiencePolicy(session.rebirth.experienceMode);
  const isDebate = isDebateNode(session.sceneNode)
    && Boolean(session.scene.theme.competingHypotheses);
  const headerCopy = useMemo(() => {
    if (session.state.finished) return { name: "年度复盘", role: `${session.state.year} 年研究结局` };
    if (isDebate) return { name: "观点交锋", role: "同一事实，三种框架" };
    return { name: view.speakerName, role: `${view.speakerRole} · ${view.activeCharacter.tag}` };
  }, [isDebate, session.state.finished, session.state.year, view.activeCharacter.tag, view.speakerName, view.speakerRole]);

  useEffect(() => {
    writeSessionEnvelope(localStorage, session.state, session.rebirth);
  }, [session.rebirth, session.state]);

  useEffect(() => {
    recordPlaytestEvent("scene_view", {
      year: session.state.year,
      month: session.state.monthIndex + 1,
      cycle: session.rebirth.cycle,
      sceneNodeId: session.sceneNode.id,
      sceneNodeType: session.sceneNode.type,
    });
  }, [session.rebirth.cycle, session.sceneNode.id, session.sceneNode.type, session.state.monthIndex, session.state.year]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLButtonElement
        || target instanceof HTMLInputElement
        || target instanceof HTMLSelectElement
        || target instanceof HTMLTextAreaElement
      ) return;
      if (event.key === "Escape" && archiveOpen) {
        event.preventDefault();
        setArchiveOpen(false);
        return;
      }
      if (archiveOpen || props.settingsOpen) return;
      if (event.key === "ArrowLeft" && session.canGoBack) {
        event.preventDefault();
        session.goBack();
      }
      if ((event.key === "Enter" || event.key === " ") && session.sceneCanAdvance) {
        event.preventDefault();
        session.advanceCurrentScene();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [archiveOpen, props.settingsOpen, session]);

  const toggleExactMetrics = () => {
    setShowExactMetrics((current) => {
      const next = !current;
      try {
        localStorage.setItem("rebirthShowExactMetrics", next ? "1" : "0");
      } catch {
        // Storage may be unavailable in strict privacy modes.
      }
      return next;
    });
  };

  return (
    <main className={`immersive-app character-${view.activeCharacter.color}`}>
      <header className="immersive-topbar">
        <div className="immersive-brand">
          <span>重生投研部</span>
          <strong>{session.scene.theme.title}</strong>
          <small>{policy.id === "romance"
            ? `${session.scene.label} · ${policy.label} · 剧情 ${view.sceneProgress}`
            : `${session.scene.label} · ${policy.label} · 第 ${session.rebirth.cycle} 周目 · 剧情 ${view.sceneProgress}`}</small>
        </div>
        <SettingsPopover
          {...props}
          showExactMetrics={showExactMetrics}
          onToggleExactMetrics={toggleExactMetrics}
        />
      </header>
      <StatusBar
        experienceMode={session.rebirth.experienceMode}
        state={session.state}
        showExactMetrics={showExactMetrics}
      />
      <section className="immersive-workspace" aria-label="剧情舞台与操作区">
        <div className="immersive-stage" aria-hidden="true">
          <StageArt
            activeCharacter={view.activeCharacter}
            activePose={view.scenePose}
            sceneBackground={view.sceneBackground}
            showDebate={isDebate}
            usePixiStage={usePixiStage}
          />
        </div>
        <div className="immersive-stage-meta">
          {isDebate ? (
            <span>三种框架并列</span>
          ) : (
            <>
              <span>{view.activeCharacter.name}路线</span>
              <span>
                {policy.showCareerMetrics && showExactMetrics
                  ? `关系 ${session.state.relations[view.activeCharacter.id]}`
                  : relationshipSignal(session.state.relations[view.activeCharacter.id])}
              </span>
            </>
          )}
          <span>{view.sceneMood}</span>
        </div>
        <section className={`interaction-panel ${session.state.finished ? "ending-mode" : view.isDecision ? "decision-mode" : "dialogue-mode"}`}>
          <div
            aria-label={isDebate ? "观点内容" : view.isDecision ? "选择内容" : "对白内容"}
            className="interaction-scroll"
            tabIndex={0}
          >
            <div className="speaker-row">
              <span className="speaker-name">{headerCopy.name}</span>
              <span className="speaker-role">{headerCopy.role}</span>
            </div>
            {session.state.finished ? (
              <EndingPanel
                experienceMode={session.rebirth.experienceMode}
                state={session.state}
              />
            ) : isDebate ? (
              <DebatePanel hypotheses={session.scene.theme.competingHypotheses} />
            ) : view.isDecision ? (
              <DecisionPanel session={session} />
            ) : (
              <div className="immersive-dialogue-copy">
                <p style={{ whiteSpace: "pre-line" }}>{view.dialogue}</p>
                <small>{view.prompt}</small>
              </div>
            )}
          </div>
          <footer className="interaction-actions">
            <button
              className="secondary-action"
              disabled={!session.canGoBack}
              type="button"
              onClick={session.goBack}
            >
              ← 上一句
            </button>
            <button
              className="secondary-action"
              disabled={!session.canSkipRead}
              type="button"
              onClick={session.skipReadScene}
            >
              跳过已读
            </button>
            <button
              className="secondary-action"
              type="button"
              onFocus={() => void loadArchiveDrawer()}
              onPointerEnter={() => void loadArchiveDrawer()}
              onClick={() => setArchiveOpen(true)}
            >
              {policy.id === "romance" ? "剧情回顾" : "档案与研究室"}
            </button>
            <button
              className="primary-action"
              disabled={!session.sceneCanAdvance}
              type="button"
              onClick={session.advanceCurrentScene}
            >
              {view.advanceLabel}
            </button>
          </footer>
        </section>
      </section>
      {archiveOpen ? (
        <Suspense fallback={(
          <div className="archive-backdrop" role="status">
            <aside className="archive-drawer">
              <div className="archive-scroll">
                <p className="archive-empty">正在打开档案。纸很多，浏览器正在翻。</p>
              </div>
            </aside>
          </div>
        )}>
          <ArchiveDrawer session={session} onClose={() => setArchiveOpen(false)} />
        </Suspense>
      ) : null}
    </main>
  );
}
