import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { GAME_YEARS } from "../data/gameData";
import { CHARACTERS } from "../game/content";
import type { CharacterId, CompetingHypotheses, SceneNode } from "../types";
import { DecisionCard } from "../components/DecisionCard";
import { EndingPanel } from "../components/EndingPanel";
import { FocusSelector } from "../components/FocusSelector";
import {
  InvestigationPanel,
  OfficeHubPanel,
  RebirthArchiveSection,
  RebirthFlowPanel,
} from "../components/RebirthPanel";
import { StatusBar } from "../components/StatusBar";
import { StoryRecapPanel } from "../components/StoryRecapPanel";
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

function StaticStage({ color }: { color: string }) {
  return <div className={`pixi-stage pixi-stage-fallback immersive-static character-${color}`} aria-hidden="true" />;
}

function StageArt({ session, usePixiStage }: { session: GameSession; usePixiStage: boolean }) {
  const view = buildSceneView(session);
  if (session.sceneNode.id.endsWith("-competing")) {
    return <div className={`debate-stage debate-stage-${view.sceneBackground}`} aria-hidden="true" />;
  }
  if (!usePixiStage) return <StaticStage color={view.activeCharacter.color} />;
  return (
    <Suspense fallback={<StaticStage color={view.activeCharacter.color} />}>
      <PixiStage
        activeCharacter={view.activeCharacter}
        activePose={view.scenePose}
        backgroundId={view.sceneBackground}
      />
    </Suspense>
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
  const view = buildSceneView(session);
  const decisionNode = view.decisionNode;
  if (!decisionNode) return null;
  const result = session.state.locked ? view.last : undefined;

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

  return (
    <div className="immersive-decision-panel">
      <div className="decision-prompt">
        <span>本话研究选择</span>
        <strong>{decisionNode.decisionPrompt || session.story.mission}</strong>
      </div>
      <ResearchBriefs node={decisionNode} />
      <InvestigationPanel
        meta={session.rebirth}
        state={session.state}
        onInvestigate={session.investigateWithSound}
      />
      <FocusSelector state={session.state} onSelect={session.selectFocusWithSound} />
      <div className="options">
        {view.topDecisions.map((decision, index) => (
          <DecisionCard
            decision={decision}
            index={index}
            key={decision.id}
            state={session.state}
            onChoose={session.makeDecisionWithSound}
          />
        ))}
      </div>
    </div>
  );
}

function DialogueHistory({ session }: { session: GameSession }) {
  const nodes = session.scene.nodes.slice(0, session.state.sceneNodeIndex + 1);
  return (
    <section className="archive-section">
      <h3>本话记录</h3>
      <ol className="dialogue-history">
        {nodes.map((node) => (
          <li key={node.id}>
            <span>{node.type === "dialogue" ? node.speaker : "研究选择"}</span>
            <p style={{ whiteSpace: "pre-line" }}>{node.id.endsWith("-competing")
              ? "三位同事围绕同一事实给出基本面、量价和风控三种假设。"
              : node.type === "dialogue" ? node.text : node.decisionPrompt || node.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function RelationSummary({ session }: { session: GameSession }) {
  return (
    <section className="archive-section">
      <h3>同事关系</h3>
      <div className="archive-relations">
        {Object.values(CHARACTERS).map((character) => {
          const relation = session.state.relations[character.id] ?? 0;
          return (
            <article className={character.color} key={character.id}>
              <div>
                <strong>{character.name}</strong>
                <span>{character.role}</span>
              </div>
              <b>{relation}</b>
              <i style={{ width: `${Math.max(0, Math.min(100, relation))}%` }} />
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ResearchArchive({ session }: { session: GameSession }) {
  return (
    <>
      <RelationSummary session={session} />
      <section className="archive-section">
        <h3>研究札记</h3>
        {session.state.history.length === 0 ? (
          <p className="archive-empty">完成第一次研究选择后，复盘会留在这里。</p>
        ) : (
          <ul className="archive-history">
            {session.state.history.map((item) => (
              <li key={item.month}>
                <span>{item.label}</span>
                <strong>{item.selected.label}</strong>
                <small>{item.outcome.title}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="archive-section">
        <h3>知识卡</h3>
        {session.state.knowledgeCards.length === 0 ? (
          <p className="archive-empty">有方法的判断会逐渐积成你的工具书。</p>
        ) : (
          <ul className="archive-knowledge">
            {session.state.knowledgeCards.map((card) => (
              <li className={CHARACTERS[card.mentorId].color} key={card.id}>
                <strong>{card.concept}</strong>
                <span>{CHARACTERS[card.mentorId].name}：{card.mentorLine}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <RebirthArchiveSection meta={session.rebirth} />
      <EndingPanel state={session.state} />
    </>
  );
}

function ArchiveDrawer({
  open,
  session,
  onClose,
}: {
  open: boolean;
  session: GameSession;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"log" | "archive" | "flow" | "office">("log");
  if (!open) return null;
  return (
    <div className="archive-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="archive-drawer"
        aria-label="剧情记录与研究档案"
        aria-modal="true"
        role="dialog"
        onMouseDown={(event: { stopPropagation(): void }) => event.stopPropagation()}
      >
        <header className="archive-drawer-head">
          <div>
            <span>{session.scene.label} · 第 {session.rebirth.cycle} 周目</span>
            <strong>{session.scene.theme.title}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭档案">×</button>
        </header>
        <div className="archive-tabs" role="tablist">
          <button aria-controls="archive-tabpanel" aria-selected={tab === "log"} className={tab === "log" ? "active" : ""} role="tab" type="button" onClick={() => setTab("log")}>本话记录</button>
          <button aria-controls="archive-tabpanel" aria-selected={tab === "archive"} className={tab === "archive" ? "active" : ""} role="tab" type="button" onClick={() => setTab("archive")}>研究档案</button>
          <button aria-controls="archive-tabpanel" aria-selected={tab === "flow"} className={tab === "flow" ? "active" : ""} role="tab" type="button" onClick={() => setTab("flow")}>年度流程</button>
          <button aria-controls="archive-tabpanel" aria-selected={tab === "office"} className={tab === "office" ? "active" : ""} role="tab" type="button" onClick={() => setTab("office")}>研究室</button>
        </div>
        <div className="archive-scroll" id="archive-tabpanel" role="tabpanel">
          {tab === "log" ? <DialogueHistory session={session} /> : null}
          {tab === "archive" ? <ResearchArchive session={session} /> : null}
          {tab === "flow" ? (
            <RebirthFlowPanel meta={session.rebirth} state={session.state} />
          ) : null}
          {tab === "office" ? (
            <OfficeHubPanel
              meta={session.rebirth}
              state={session.state}
              onInspect={session.inspectOfficeWithSound}
            />
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function SettingsPopover({
  audio,
  session,
  settingsOpen,
  settingsRef,
  setSettingsOpen,
  themeControl,
}: Omit<ImmersiveGameScreenProps, "usePixiStage">) {
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
                  onClick={() => session.changeYear(year)}
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
            <button
              type="button"
              onClick={() => {
                if (window.confirm("重新开始会覆盖当前年份的本周目存档，但保留已经获得的记忆钥匙和研究捷径。确定继续吗？")) session.restart();
              }}
            >
              重新开始
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ImmersiveGameScreen(props: ImmersiveGameScreenProps) {
  const { session, usePixiStage } = props;
  const view = buildSceneView(session);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const isDebate = session.sceneNode.id.endsWith("-competing")
    && Boolean(session.scene.theme.competingHypotheses);
  const headerCopy = useMemo(() => {
    if (session.state.finished) return { name: "年度复盘", role: `${session.state.year} 年研究结局` };
    if (isDebate) return { name: "观点交锋", role: "同一事实，三种框架" };
    return { name: view.speakerName, role: `${view.speakerRole} · ${view.activeCharacter.tag}` };
  }, [isDebate, session.state.finished, session.state.year, view.activeCharacter.tag, view.speakerName, view.speakerRole]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLButtonElement || target instanceof HTMLInputElement) return;
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

  return (
    <main className={`immersive-app character-${view.activeCharacter.color}`}>
      <header className="immersive-topbar">
        <div className="immersive-brand">
          <span>重生投研部</span>
          <strong>{session.scene.theme.title}</strong>
          <small>{session.scene.label} · 第 {session.rebirth.cycle} 周目 · 剧情 {view.sceneProgress}</small>
        </div>
        <SettingsPopover {...props} />
      </header>
      <StatusBar state={session.state} />
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
              <span>关系 {session.state.relations[view.activeCharacter.id]}</span>
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
            <button className="secondary-action" type="button" onClick={() => setArchiveOpen(true)}>
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
      <ArchiveDrawer open={archiveOpen} session={session} onClose={() => setArchiveOpen(false)} />
    </main>
  );
}
