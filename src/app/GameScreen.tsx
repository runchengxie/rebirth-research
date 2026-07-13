import { lazy, Suspense } from "react";
import { GAME_YEARS } from "../data/gameData";
import { CHARACTERS } from "../game/content";
import type { CharacterId, GameState, RoundResult } from "../types";
import { DecisionCard } from "../components/DecisionCard";
import { EndingPanel } from "../components/EndingPanel";
import { FocusSelector } from "../components/FocusSelector";
import { HistoryPanel } from "../components/HistoryPanel";
import { StatusBar } from "../components/StatusBar";
import { StoryRecapPanel } from "../components/StoryRecapPanel";
import { buildSceneView } from "./useGameController";
import type {
  GameAudio,
  GameSession,
  SceneView,
  SettingsMenu,
  ThemeControl,
} from "./useGameController";

const PixiStage = lazy(() =>
  import("../components/PixiStage").then((module) => ({ default: module.PixiStage })),
);

function StaticStageArt() {
  return <div className="pixi-stage pixi-stage-fallback" aria-hidden="true" />;
}

function ResearchBriefPanel({
  title,
  briefs,
}: {
  title: string;
  briefs: Array<{ characterId: CharacterId; label: string; text: string }>;
}) {
  if (briefs.length === 0) return null;
  return (
    <div className="research-briefs" aria-label="研究线索">
      <div className="research-briefs-head">
        <span>研究线索</span>
        <strong>{title}</strong>
      </div>
      <div className="research-brief-grid">
        {briefs.map((brief) => {
          const character = CHARACTERS[brief.characterId];
          return (
            <div className={`research-brief ${character.color}`} key={`${brief.characterId}-${brief.label}`}>
              <span>{character.name}</span>
              <strong>{brief.label}</strong>
              <p>{brief.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThemePanel({ scene }: { scene: GameSession["scene"] }) {
  const theme = scene.theme;
  return (
    <div className="historical-event" aria-label="本月主题">
      <div className="historical-event-head">
        <span>市场主题</span>
        <strong>{theme.period}</strong>
      </div>
      <h3>{theme.title}</h3>
      <p>{theme.publicContext}</p>
      <dl>
        <div>
          <dt>顾行之内心</dt>
          <dd>{theme.protagonistMemory}</dd>
        </div>
        <div>
          <dt>研究入口</dt>
          <dd>{theme.gameHook}</dd>
        </div>
      </dl>
    </div>
  );
}

function ScorePanel({ result }: { result: RoundResult | undefined }) {
  if (!result || !result.score) return null;
  const { score } = result;
  const bars: Array<{ label: string; value: number; max: number; className: string }> = [
    { label: "证据分", value: score.evidenceScore, max: 20, className: "score-logic" },
    { label: "清晰分", value: score.clarityScore, max: 20, className: "score-risk" },
    { label: "风控分", value: score.riskAwarenessScore, max: 20, className: "score-discipline" },
    { label: "协作分", value: score.communicationScore, max: 20, className: "score-discipline" },
    { label: "生活分", value: score.lifeBalanceScore, max: 15, className: "score-character" },
  ];

  const gradeColors: Record<string, string> = {
    S: "#ffd700", A: "#ff6b6b", B: "#4ecdc4", C: "#95a5a6", D: "#7f8c8d",
  };

  return (
    <div className="score-panel" aria-label="月度评分">
      <div className="score-head">
        <span>月度评分</span>
        <strong style={{ color: gradeColors[score.grade] || "#fff" }}>{score.grade}</strong>
        <span>{score.total}/100</span>
      </div>
      <div className="score-bars">
        {bars.map((bar) => (
          <div className={`score-bar ${bar.className}`} key={bar.label}>
            <div className="score-bar-head">
              <span>{bar.label}</span>
              <strong>{bar.value}/{bar.max}</strong>
            </div>
            <div className="score-bar-track">
              <i style={{ width: `${(bar.value / bar.max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CharacterRoutes({
  state,
  activeId,
}: {
  state: GameState;
  activeId: CharacterId;
}) {
  return (
    <div className="character-routes" aria-label="同事关系">
      {Object.values(CHARACTERS)
        .filter((character) => character.kind !== "peer")
        .map((character) => {
          const relation = state.relations[character.id];
          return (
            <div
              className={`character-card ${character.color} ${character.id === activeId ? "active" : ""}`}
              key={character.id}
            >
              <div className="character-avatar" aria-hidden="true">
                {character.name.slice(0, 1)}
              </div>
              <div className="character-copy">
                <div className="character-head">
                  <strong>{character.name}</strong>
                  <span>{character.role}</span>
                </div>
                <p>{character.intro}</p>
                <div className="mini-meter">
                  <span>{character.tag}</span>
                  <b>{relation}/100</b>
                  <i style={{ width: `${Math.max(0, Math.min(100, relation))}%` }} />
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}

function Meter({ label, value, className }: { label: string; value: number; className: string }) {
  const normalized = Math.max(0, Math.min(100, value));
  return (
    <div className={`meter ${className}`}>
      <div className="meter-head">
        <span>{label}</span>
        <strong>{Math.round(normalized)}</strong>
      </div>
      <div className="meter-track">
        <i style={{ width: `${normalized}%` }} />
      </div>
    </div>
  );
}

function ResearchNotes({ state }: { state: GameState }) {
  const cards = state.knowledgeCards;
  return (
    <div className="research-notes" aria-label="研究札记 · 知识库">
      <div className="research-notes-head">
        <span>研究札记 · 知识库</span>
        <strong>{cards.length} 条</strong>
      </div>
      {cards.length === 0 ? (
        <p className="research-notes-empty">
          每做出一个有方法的判断，同事都会顺手教你一句。这里会慢慢攒成你的工具书。
        </p>
      ) : (
        <ul className="research-notes-list">
          {cards.map((card) => {
            const mentor = CHARACTERS[card.mentorId];
            return (
              <li key={card.id} className={`research-note ${mentor.color}`}>
                <strong>{card.concept}</strong>
                <span>
                  {mentor.name}：{card.mentorLine}
                </span>
                {card.learningRef ? <small>{card.learningRef}</small> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function OfficeWidget({ state }: { state: GameState }) {
  const office = state.office;
  const flavor =
    office.monthsElapsed >= 11
      ? "白板从空到满，便签层层叠着。一年了，这间屋子记得你每一次熬夜和每一次想通。"
      : office.postIts > 0
        ? "林若宁的便签又多了一张，白板上的框架慢慢连成了网。研究室本身也在陪你长大。"
        : "研究室还空着。等你第一个有方法的判断，它就开始长东西。";
  const progress = Math.min(100, (office.monthsElapsed / 12) * 100);
  return (
    <div className="office-widget" aria-label="研究室">
      <div className="office-head">
        <span>研究室</span>
        <strong>第 {office.monthsElapsed}/12 月</strong>
      </div>
      <div className="office-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="office-flavor">{flavor}</p>
      <div className="office-meters">
        <span><strong>{office.postIts}</strong><small>便签</small></span>
        <span><strong>{office.whiteboardMarkers}</strong><small>白板</small></span>
        <span><strong>{office.coffeeCups}</strong><small>咖啡</small></span>
      </div>
    </div>
  );
}

function GameSettings({
  audio,
  session,
  settingsOpen,
  settingsRef,
  setSettingsOpen,
  themeControl,
}: {
  audio: GameAudio;
  session: GameSession;
  settingsOpen: boolean;
  settingsRef: SettingsMenu["settingsRef"];
  setSettingsOpen: SettingsMenu["setSettingsOpen"];
  themeControl: ThemeControl;
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-kicker">重生投研部 · 金融职场叙事 · 研究决策游戏</span>
        <h1>重生投研部：十二个月的研究札记</h1>
        <p>你带着未来记忆回到投研部，在公开信息、合规边界、团队协作和个人生活之间做出研究判断。</p>
      </div>
      <div className="top-actions" ref={settingsRef}>
        <button
          className={`menu-button ${settingsOpen ? "active" : ""}`}
          type="button"
          title="打开设置"
          aria-controls="settingsMenu"
          aria-expanded={settingsOpen}
          aria-label="打开设置"
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
        </button>
        <div className={`settings-menu ${settingsOpen ? "open" : ""}`} id="settingsMenu">
          <div className="settings-menu-head">
            <strong>游戏设置</strong>
            <span>{session.state.year} 线</span>
          </div>
          <div className="controls">
            <div className="segmented" aria-label="年份">
              {GAME_YEARS.map((year) => (
                <button
                  className={year === session.state.year ? "active" : ""}
                  key={year}
                  type="button"
                  onClick={() => session.changeYear(year)}
                >
                  {year}线
                </button>
              ))}
            </div>
            <button className="icon-button theme-button" type="button" title="切换主题" aria-label="切换主题" onClick={themeControl.toggleTheme}>
              {themeControl.theme === "dark" ? "☀" : "☾"}
            </button>
            <button className="icon-button" type="button" title="切换背景音乐" aria-label="切换背景音乐" onClick={() => void audio.toggleMusic()}>
              {audio.musicOn ? "♪" : "♩"}
            </button>
            <button className="icon-button" type="button" title="切换音效" aria-label="切换音效" onClick={() => void audio.toggleSound()}>
              {audio.soundOn ? "音" : "静"}
            </button>
            <label className="volume-input" title="背景音乐音量">
              音量
              <input max="0.7" min="0" step="0.01" type="range" value={audio.volume} onChange={(event) => audio.setVolume(Number(event.target.value))} />
            </label>
            <label className="volume-input" title="音效音量">
              音效
              <input max="0.45" min="0" step="0.01" type="range" value={audio.soundVolume} onChange={(event) => audio.setSoundVolume(Number(event.target.value))} />
            </label>
            <button className="icon-button" type="button" title="重新开始" aria-label="重新开始" onClick={session.restart}>
              ↻
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function MilestoneBanner({ state }: { state: GameState }) {
  const milestone = state.milestone;
  if (!milestone || CHARACTERS[milestone]?.kind === "peer") return null;
  return (
    <div className="milestone-banner" role="status" aria-label="关系升温">
      <span>关系升温</span>
      <strong>你和{CHARACTERS[milestone].name}的关系更近了一步</strong>
    </div>
  );
}

function NarrativeStage({
  session,
  usePixiStage,
  view,
}: {
  session: GameSession;
  usePixiStage: boolean;
  view: SceneView;
}) {
  return (
    <section className={`vn-stage character-${view.activeCharacter.color}`} aria-label="剧情舞台">
      {usePixiStage ? (
        <Suspense fallback={<StaticStageArt />}>
          <PixiStage activeCharacter={view.activeCharacter} activePose={view.scenePose} backgroundId={view.sceneBackground} />
        </Suspense>
      ) : (
        <StaticStageArt />
      )}
      <div className="vn-stage-content">
        <div className="moe-badges">
          <span>{view.activeCharacter.name}路线</span>
          <span>关系 {session.state.relations[view.activeCharacter.id]}</span>
        </div>
        <div className="chapter-card">
          <span>第 {String(session.state.monthIndex + 1).padStart(2, "0")} 话</span>
          <h2>{session.scene.theme.title}</h2>
          <p>
            {session.scene.label} · {view.sceneMood} · 剧情 {view.sceneProgress} · 当前日程：{view.activeFocus.label}
          </p>
        </div>
        <div className="dialogue-box">
          <div className="speaker-row">
            <span className="speaker-name">{view.speakerName}</span>
            <span className="speaker-role">
              {view.speakerRole} · {view.activeCharacter.tag}
            </span>
          </div>
          <p>{view.dialogue}</p>
          <small>{view.prompt}</small>
          <button
            className="story-next-button"
            disabled={!session.sceneCanAdvance}
            type="button"
            onClick={session.advanceCurrentScene}
          >
            {view.advanceLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

function DecisionOptions({ session, view }: { session: GameSession; view: SceneView }) {
  const decisionNode = view.decisionNode;
  if (!decisionNode) {
    return (
      <div className="script-preview">
        <span>剧情节点</span>
        <strong>{session.scene.theme.title}</strong>
        <p>当前节点 {view.sceneProgress}。继续完成对白后，本月研究选择会开放。</p>
      </div>
    );
  }
  return (
    <>
      <ResearchBriefPanel
        briefs={decisionNode.briefs || []}
        title={decisionNode.briefTitle || `${session.scene.label} 研究线索`}
      />
      <FocusSelector state={session.state} onSelect={session.selectFocusWithSound} />
      <div className="options">
        {view.topDecisions.map((decision, index) => (
          <DecisionCard
            index={index}
            key={decision.id}
            decision={decision}
            state={session.state}
            onChoose={session.makeDecisionWithSound}
          />
        ))}
      </div>
    </>
  );
}

function PlayPanel({ session, view }: { session: GameSession; view: SceneView }) {
  const result = session.state.locked ? view.last : undefined;
  return (
    <div className="question-panel">
      <div className="month-head">
        <div>
          <span className="panel-kicker">市场主题与研究决策</span>
          <h2>{session.scene.label} 研究选择</h2>
        </div>
      </div>
      <p className="scene-brief">
        {view.isDecision ? session.story.mission : "剧情演出中。继续对话后，会进入本月研究选择。"}
      </p>
      <ThemePanel scene={session.scene} />
      <DecisionOptions session={session} view={view} />
      <div className="result-band">
        <div className="result-copy">
          <strong>{view.resultText}</strong>
          <span>{view.resultDetail}</span>
        </div>
        <button
          className="primary-button"
          disabled={!session.sceneCanAdvance}
          type="button"
          onClick={session.advanceCurrentScene}
        >
          {view.advanceLabel}
        </button>
      </div>
      {view.isDecision ? <StoryRecapPanel result={result} state={session.state} /> : null}
      {view.isDecision ? <ScorePanel result={result} /> : null}
    </div>
  );
}

function ResearchArchive({ session, view }: { session: GameSession; view: SceneView }) {
  return (
    <aside className="chart-panel">
      <div className="chart-title">
        <h2>研究档案</h2>
        <span>{session.data.year} · 12话</span>
      </div>
      <OfficeWidget state={session.state} />
      <div className="route-meters">
        <Meter label="研究可信度" value={session.state.researchCredibility} className="reputation" />
        <Meter label="投委会采纳" value={session.state.committeeAdoption} className="stress" />
        <Meter label="观点命中率" value={session.state.viewAccuracy} className="ambition" />
        <Meter label="生活平衡" value={session.state.lifeBalance} className="reputation" />
      </div>
      <CharacterRoutes activeId={view.activeCharacter.id} state={session.state} />
      <ResearchNotes state={session.state} />
    </aside>
  );
}

export function GameScreen({
  audio,
  session,
  settingsOpen,
  settingsRef,
  setSettingsOpen,
  themeControl,
  usePixiStage,
}: {
  audio: GameAudio;
  session: GameSession;
  settingsOpen: boolean;
  settingsRef: SettingsMenu["settingsRef"];
  setSettingsOpen: SettingsMenu["setSettingsOpen"];
  themeControl: ThemeControl;
  usePixiStage: boolean;
}) {
  const view = buildSceneView(session);
  return (
    <main className="app">
      <GameSettings
        audio={audio}
        session={session}
        settingsOpen={settingsOpen}
        settingsRef={settingsRef}
        setSettingsOpen={setSettingsOpen}
        themeControl={themeControl}
      />
      <MilestoneBanner state={session.state} />
      <StatusBar state={session.state} />
      <NarrativeStage session={session} usePixiStage={usePixiStage} view={view} />
      <section className="play">
        <PlayPanel session={session} view={view} />
        <ResearchArchive session={session} view={view} />
      </section>
      <EndingPanel state={session.state} />
      <HistoryPanel history={session.state.history} />
      <footer className="rules-note" aria-labelledby="rulesTitle">
        <h2 id="rulesTitle">玩法说明</h2>
        <p>
          本页面是静态剧情游戏。每月的市场主题下，你需要做出工作/生活方面的研究决策。
          日程选择会影响研究深度、团队信任和生活平衡。角色名称和事件已作化名处理。
          当前背景音乐和轻音效由浏览器生成。
        </p>
      </footer>
    </main>
  );
}
