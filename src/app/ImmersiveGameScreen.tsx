import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { GAME_YEARS } from "../data/gameData";
import { CHARACTERS } from "../game/content";
import type { CharacterId, CompetingHypotheses, GameState, SceneNode } from "../types";
import { DecisionCard } from "../components/DecisionCard";
import { EndingPanel } from "../components/EndingPanel";
import { FocusSelector } from "../components/FocusSelector";
import { InvestigationPanel } from "../components/InvestigationPanel";
import { ResearchCommitmentPanel } from "../components/ResearchCommitmentPanel";
import { SaveTransferPanel } from "../components/SaveTransferPanel";
import { StatusBar } from "../components/StatusBar";
import { StoryRecapPanel } from "../components/StoryRecapPanel";
import {
  applyResearchCommitment,
  completedReviewCount,
  createDefaultResearchCommitment,
} from "../game/researchCommitment";
import { recordPlaytestEvent } from "../game/playtestTelemetry";
import { writeSessionEnvelope } from "../game/sessionEnvelope";
import { stakeholderPressureFor } from "../game/stakeholderPressure";
import { buildSceneView } from "./useGameController";
import type {
  GameAudio,
  GameSession,
  SettingsMenu,
  ThemeControl,
} from "./useGameController";

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

interface DebateItem {
  characterId: CharacterId;
  label: string;
  text: string;
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

function OfficeMemoryLayer({ state }: { state: GameState }) {
  const postIts = Math.min(6, state.office.postIts);
  const whiteboardMarks = Math.min(7, state.office.whiteboardMarkers);
  const coffeeCups = Math.min(6, state.office.coffeeCups);
  if (postIts + whiteboardMarks + coffeeCups === 0) return null;

  return (
    <div className="office-memory-layer" aria-hidden="true">
      <div className="office-postits">
        {Array.from({ length: postIts }, (_, index) => <span className="office-postit" key={`postit-${index}`} />)}
      </div>
      <div className="office-whiteboard">
        {Array.from({ length: whiteboardMarks }, (_, index) => <span key={`mark-${index}`} />)}
      </div>
      <div className="office-coffee">
        {Array.from({ length: coffeeCups }, (_, index) => <span key={`coffee-${index}`} />)}
      </div>
    </div>
  );
}

function StageArt({ session, usePixiStage }: { session: GameSession; usePixiStage: boolean }) {
  const view = buildSceneView(session);
  let artwork;
  if (session.sceneNode.id.endsWith("-competing")) {
    artwork = <div className={`debate-stage debate-stage-${view.sceneBackground}`} aria-hidden="true" />;
  } else if (!usePixiStage) {
    artwork = <StaticStage color={view.activeCharacter.color} />;
  } else {
    artwork = (
      <Suspense fallback={<StaticStage color={view.activeCharacter.color} />}>
        <PixiStage
          activeCharacter={view.activeCharacter}
          activePose={view.scenePose}
          backgroundId={view.sceneBackground}
        />
      </Suspense>
    );
  }

  return (
    <>
      {artwork}
      <OfficeMemoryLayer state={session.state} />
    </>
  );
}

function debateItems(hypotheses: CompetingHypotheses | undefined): DebateItem[] {
  if (!hypotheses) return [];
  const items: DebateItem[] = [];
  if (hypotheses.lin) {
    items.push({ characterId: "lin_ruoning", label: "基本面", text: hypotheses.lin });
  }
  if (hypotheses.chen) {
    items.push({ characterId: "chen_xinghe", label: "量价", text: hypotheses.chen });
  }
  if (hypotheses.zhou) {
    items.push({ characterId: "zhou_mingzhao", label: "风控", text: hypotheses.zhou });
  }
  return items;
}

function DebatePanel({ hypotheses }: { hypotheses: CompetingHypotheses | undefined }) {
  const items = debateItems(hypotheses);
  return (
    <div className="debate-panel" aria-label="三种研究观点">
      <div className="debate-intro">
        <strong>观点交锋</strong>
        <span>同一段未来记忆，被三种方法拆成了三条证据链。</span>
      </div>
      <div className="debate-grid">
        {items.map((item) => {
          const character = CHARACTERS[item.characterId];
          return (
            <article className={`debate-card ${character.color}`} key={item.characterId}>
              <header>
                <span>{character.name}</span>
                <strong>{item.label}</strong>
              </header>
              <p>{item.text}</p>
            </article>
          );
        })}
      </div>
      <p className="debate-conclusion">
        每套框架都有证据，也都有盲区。你要选择一条证据链，并为它忽略的部分负责。
      </p>
    </div>
  );
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
        <StoryRecapPanel result={result} state={session.state} />
      </div>
    );
  }

  const submitDecision: GameSession["makeDecisionWithSound"] = (decision) => {
    const committedDecision = applyResearchCommitment(decision, commitment);
    recordPlaytestEvent("decision_submit", {
      year: session.state.year,
      month: session.state.monthIndex + 1,
      cycle: session.rebirth.cycle,
      decisionId: decision.id,
      confidence: commitment.confidence,
      falsifier: commitment.falsifier,
      reviewChecks: completedReviewCount(commitment),
    });
    session.makeDecisionWithSound(committedDecision);
  };

  return (
    <div className="immersive-decision-panel">
      <div className="decision-prompt">
        <span>本话研究选择</span>
        <strong>{decisionNode.decisionPrompt || session.story.mission}</strong>
      </div>
      <aside className="stakeholder-pressure">
        <header>
          <span>{pressure.source}</span>
          <strong>{pressure.title}</strong>
        </header>
        <p>{pressure.detail}</p>
        <small>{pressure.tradeoff}</small>
      </aside>
      <ResearchBriefs node={decisionNode} />
      <InvestigationPanel
        meta={session.rebirth}
        state={session.state}
        onInvestigate={session.investigateWithSound}
      />
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
      <ResearchCommitmentPanel commitment={commitment} onChange={setCommitment} />
      <div className="options">
        {view.topDecisions.map((decision, index) => (
          <DecisionCard
            decision={decision}
            index={index}
            key={decision.id}
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
            <button aria-pressed={showExactMetrics} type="button" onClick={onToggleExactMetrics}>
              指标 {showExactMetrics ? "精确" : "叙事"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("重新开始会覆盖当前年份的本周目存档，但保留已经获得的记忆钥匙和研究捷径。确定继续吗？")) session.restart();
              }}
            >
              重新开始
            </button>
          </div>
          <small className="metric-mode-note">
            叙事模式隐藏精确关系与职业数值；精确模式用于攻略、调试和复盘。
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
  const isDebate = session.sceneNode.id.endsWith("-competing")
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
          <small>{session.scene.label} · 第 {session.rebirth.cycle} 周目 · 剧情 {view.sceneProgress}</small>
        </div>
        <SettingsPopover
          {...props}
          showExactMetrics={showExactMetrics}
          onToggleExactMetrics={toggleExactMetrics}
        />
      </header>
      <StatusBar state={session.state} showExactMetrics={showExactMetrics} />
      <section className="immersive-workspace" aria-label="剧情舞台与操作区">
        <div className="immersive-stage" aria-hidden="true">
          <StageArt session={session} usePixiStage={usePixiStage} />
        </div>
        <div className="immersive-stage-meta">
          {isDebate ? (
            <span>三种框架并列</span>
          ) : (
            <>
              <span>{view.activeCharacter.name}路线</span>
              <span>
                {showExactMetrics
                  ? `关系 ${session.state.relations[view.activeCharacter.id]}`
                  : relationshipSignal(session.state.relations[view.activeCharacter.id])}
              </span>
            </>
          )}
          <span>{view.sceneMood}</span>
        </div>
        <section className={`interaction-panel ${session.state.finished ? "ending-mode" : view.isDecision ? "decision-mode" : "dialogue-mode"}`}>
          <div className="interaction-scroll">
            <div className="speaker-row">
              <span className="speaker-name">{headerCopy.name}</span>
              <span className="speaker-role">{headerCopy.role}</span>
            </div>
            {session.state.finished ? (
              <EndingPanel state={session.state} />
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
              记录与档案
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
