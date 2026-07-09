import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { GAME_DATA, GAME_YEARS } from "./data/gameData";
import { ProceduralBgm } from "./audio/bgm";
import { NarrativeAudio } from "./audio/sfx";
import { CHARACTERS } from "./game/content";
import {
  advanceScene,
  canAdvanceScene,
  createInitialState,
  currentSceneNode,
  focusById,
  gradeReviewText,
  makeDecision,
  postMortem,
  sceneForMonth,
  selectFocus,
  storyForMonth,
} from "./game/engine";
import type { CharacterId, GameState, ResearchDecision, RoundResult } from "./types";
import { PortfolioChart } from "./components/PortfolioChart";
import { EndingPanel } from "./components/EndingPanel";
import { FocusSelector } from "./components/FocusSelector";
import { HistoryPanel } from "./components/HistoryPanel";
import { DecisionCard } from "./components/DecisionCard";
import { StatusBar } from "./components/StatusBar";

const PixiStage = lazy(() =>
  import("./components/PixiStage").then((module) => ({ default: module.PixiStage })),
);

function canUsePixiStage(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get("pixi") === "0" || params.get("staticStage") === "1") return false;
  if (params.get("pixi") === "1") return true;

  try {
    const canvas = document.createElement("canvas");
    const contextOptions: WebGLContextAttributes = {
      antialias: false, failIfMajorPerformanceCaveat: true, powerPreference: "low-power",
    };
    const gl = canvas.getContext("webgl2", contextOptions) ?? canvas.getContext("webgl", contextOptions);
    if (!gl) return false;

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info") as {
      UNMASKED_RENDERER_WEBGL: number; UNMASKED_VENDOR_WEBGL: number;
    } | null;
    const renderer = debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : "";
    const vendor = debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !`${vendor} ${renderer}`.toLowerCase().includes("nouveau");
  } catch {
    return false;
  }
}

function StaticStageArt() {
  return <div className="pixi-stage pixi-stage-fallback" aria-hidden="true" />;
}

function readTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function bestInitialYear() {
  return GAME_YEARS[GAME_YEARS.length - 1] || "2025";
}

function createState(year = bestInitialYear()): GameState {
  return createInitialState(year);
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

function ThemePanel({ scene }: { scene: ReturnType<typeof sceneForMonth> }) {
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

function StoryRecapPanel({ result }: { result: RoundResult | undefined }) {
  if (!result) return null;
  const character = CHARACTERS[result.characterId];
  const gradeReview = result.score ? gradeReviewText(result.characterId, result.score.grade) : "";
  const pm = postMortem(result.selected, result.label);

  return (
    <div className={`story-recap ${character.color}`} aria-label="同事复盘">
      <span>{character.name}的复盘</span>
      <p>{gradeReview}</p>
      <p className="story-recap-detail">{pm}</p>
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
      {Object.values(CHARACTERS).map((character) => {
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

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(readTheme());
  const [musicOn, setMusicOn] = useState(false);
  const [volume, setVolume] = useState(0.22);
  const [soundOn, setSoundOn] = useState(false);
  const [soundVolume, setSoundVolume] = useState(0.18);
  const [usePixiStage] = useState(canUsePixiStage);
  const bgmRef = useRef<ProceduralBgm | null>(null);
  const audioRef = useRef<NarrativeAudio | null>(null);
  const lastLineVoiceRef = useRef("");
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [state, setState] = useState<GameState>(() => createState());
  const data = GAME_DATA[state.year];
  const scene = sceneForMonth(state.monthIndex, state.year, state.relations);
  const sceneNode = currentSceneNode(state);
  const decisionNode = sceneNode.type === "decision" ? sceneNode : null;
  const isDecision = Boolean(decisionNode);
  const story = storyForMonth(state.monthIndex, state.year);
  const lineCharacterId: CharacterId = sceneNode.type === "dialogue" ? sceneNode.characterId : story.characterId;
  const activeCharacter = CHARACTERS[lineCharacterId];
  const sceneBackground = sceneNode.type === "dialogue" ? sceneNode.bg || "research-room" : decisionNode?.bg || "briefing-room";
  const scenePose = sceneNode.type === "dialogue" ? sceneNode.pose || "neutral" : "thinking";
  const last = state.history[state.history.length - 1];
  const activeFocus = focusById(state.focusId);
  const sceneCanAdvance = canAdvanceScene(state);
  const sceneProgress = `${Math.min(state.sceneNodeIndex + 1, scene.nodes.length)}/${scene.nodes.length}`;
  const isLastSceneNode = state.sceneNodeIndex >= scene.nodes.length - 1;

  const speakerName = state.locked && isDecision && last ? story.speaker : sceneNode.type === "dialogue" ? sceneNode.speaker : story.speaker;
  const speakerRole = state.locked && isDecision && last ? story.role : sceneNode.type === "dialogue" ? sceneNode.role : story.role;
  const sceneMood = sceneNode.type === "dialogue" ? sceneNode.mood : story.mood;
  const resultText = isDecision
    ? state.locked && last ? last.outcome.title : "选择研究方向"
    : state.locked && last ? "结算后剧情" : "剧情推进中";
  const resultDetail = isDecision
    ? state.locked && last
      ? `${last.outcome.detail}`
      : `${scene.label} · 选择你的研究方向和工作方式。`
    : state.locked && last
      ? `${last.outcome.title} · 剧情节点 ${sceneProgress}。`
      : `${scene.theme.title} · 剧情节点 ${sceneProgress}，继续后会进入本月研究选择。`;
  const dialogue = decisionNode
    ? state.locked && last
      ? last.outcome.dialogue
      : "四个研究方向已经摆在桌上。先安排本话日程，再选出你要负责的方向。"
    : sceneNode.type === "dialogue"
      ? sceneNode.text
      : "";
  const prompt = decisionNode
    ? state.locked
      ? "结算完成，点击继续剧情。"
      : decisionNode.decisionPrompt || story.mission
    : sceneNode.prompt || "点击继续剧情。";
  const advanceLabel =
    isDecision && !state.locked
      ? "先选择研究方向"
      : state.finished && isLastSceneNode
        ? "开启新周目"
        : state.locked && isLastSceneNode
          ? "下一话"
          : isDecision && state.locked
            ? "继续剧情"
            : "继续";

  const topDecisions = useMemo(() => decisionNode?.decisions || [], [decisionNode]);

  useEffect(() => {
    if (!bgmRef.current) bgmRef.current = new ProceduralBgm();
    bgmRef.current.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current) audioRef.current = new NarrativeAudio();
    audioRef.current.setVolume(soundVolume);
  }, [soundVolume]);

  useEffect(() => {
    return () => { bgmRef.current?.stop(); audioRef.current?.stop(); };
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !settingsRef.current?.contains(event.target)) setSettingsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSettingsOpen(false);
    }
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsOpen]);

  function restart(year = state.year) {
    lastLineVoiceRef.current = "";
    setState(createInitialState(year));
  }

  function changeYear(year: string) {
    lastLineVoiceRef.current = "";
    setState(createInitialState(year));
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("rebirthGameTheme", next); } catch { /* noop */ }
  }

  async function toggleMusic() {
    const controller = bgmRef.current || new ProceduralBgm();
    bgmRef.current = controller;
    if (musicOn) { controller.stop(); setMusicOn(false); return; }
    await controller.start();
    controller.setVolume(volume);
    setMusicOn(true);
  }

  async function toggleSound() {
    const controller = audioRef.current || new NarrativeAudio();
    audioRef.current = controller;
    if (soundOn) { controller.stop(); lastLineVoiceRef.current = ""; setSoundOn(false); return; }
    await controller.start();
    controller.setVolume(soundVolume);
    lastLineVoiceRef.current = "";
    controller.playPreview();
    setSoundOn(true);
  }

  const lineVoiceKey =
    sceneNode.type === "dialogue" && sceneNode.voiceCue !== "silent"
      ? `${state.year}-${state.monthIndex}-${state.sceneNodeIndex}`
      : "";

  useEffect(() => {
    if (!soundOn || !lineVoiceKey) return;
    if (lastLineVoiceRef.current === lineVoiceKey) return;
    lastLineVoiceRef.current = lineVoiceKey;
    if (sceneNode.type === "dialogue") {
      audioRef.current?.playVoiceLine(sceneNode);
    }
  }, [lineVoiceKey, sceneNode, soundOn]);

  function advanceCurrentScene() {
    if (!sceneCanAdvance) return;
    if (soundOn) audioRef.current?.playAdvance();
    setState((current) => advanceScene(current, data));
  }

  function selectFocusWithSound(focusId: string) {
    if (soundOn) audioRef.current?.playChoice();
    setState((current) => selectFocus(current, focusId));
  }

  function makeDecisionWithSound(decision: ResearchDecision) {
    if (soundOn) {
      audioRef.current?.playChoice();
      window.setTimeout(() => {
        audioRef.current?.playResult(decision.category === "deep_research" || decision.category === "roadshow" || decision.category === "committee_defense" ? "success" : "miss");
      }, 130);
    }
    setState((current) => makeDecision(current, data, decision));
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-kicker">重生投研部 · 金融职场叙事 · 研究决策游戏</span>
          <h1>重生投研部：十二个月的研究札记</h1>
          <p>你带着未来记忆回到投研部，在公开信息、合规边界、团队协作和个人生活之间做出研究判断。</p>
        </div>
        <div className="top-actions" ref={settingsRef}>
          <button
            className={`menu-button ${settingsOpen ? "active" : ""}`}
            type="button" title="打开设置" aria-controls="settingsMenu" aria-expanded={settingsOpen} aria-label="打开设置"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
          </button>
          <div className={`settings-menu ${settingsOpen ? "open" : ""}`} id="settingsMenu">
            <div className="settings-menu-head">
              <strong>游戏设置</strong>
              <span>{state.year} 线</span>
            </div>
            <div className="controls">
              <div className="segmented" aria-label="年份">
                {GAME_YEARS.map((year) => (
                  <button className={year === state.year ? "active" : ""} key={year} type="button" onClick={() => changeYear(year)}>
                    {year}线
                  </button>
                ))}
              </div>
              <button className="icon-button theme-button" type="button" title="切换主题" aria-label="切换主题" onClick={toggleTheme}>
                {theme === "dark" ? "☀" : "☾"}
              </button>
              <button className="icon-button" type="button" title="切换背景音乐" aria-label="切换背景音乐" onClick={() => void toggleMusic()}>
                {musicOn ? "♪" : "♩"}
              </button>
              <button className="icon-button" type="button" title="切换音效" aria-label="切换音效" onClick={() => void toggleSound()}>
                {soundOn ? "音" : "静"}
              </button>
              <label className="volume-input" title="背景音乐音量">
                音量
                <input max="0.7" min="0" step="0.01" type="range" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
              </label>
              <label className="volume-input" title="音效音量">
                音效
                <input max="0.45" min="0" step="0.01" type="range" value={soundVolume} onChange={(event) => setSoundVolume(Number(event.target.value))} />
              </label>
              <button className="icon-button" type="button" title="重新开始" aria-label="重新开始" onClick={() => restart(state.year)}>
                ↻
              </button>
            </div>
          </div>
        </div>
      </header>

      {state.milestone ? (
        <div className="milestone-banner" role="status" aria-label="关系升温">
          <span>关系升温</span>
          <strong>你和{CHARACTERS[state.milestone].name}的关系更近了一步</strong>
        </div>
      ) : null}

      <StatusBar state={state} />

      <section className={`vn-stage character-${activeCharacter.color}`} aria-label="剧情舞台">
        {usePixiStage ? (
          <Suspense fallback={<StaticStageArt />}>
            <PixiStage activeCharacter={activeCharacter} activePose={scenePose} backgroundId={sceneBackground} />
          </Suspense>
        ) : (
          <StaticStageArt />
        )}
        <div className="vn-stage-content">
          <div className="moe-badges">
            <span>{activeCharacter.name}路线</span>
            <span>关系 {state.relations[activeCharacter.id]}</span>
          </div>
          <div className="chapter-card">
            <span>第 {String(state.monthIndex + 1).padStart(2, "0")} 话</span>
            <h2>{scene.theme.title}</h2>
            <p>
              {scene.label} · {sceneMood} · 剧情 {sceneProgress} · 当前日程：{activeFocus.label}
            </p>
          </div>
          <div className="dialogue-box">
            <div className="speaker-row">
              <span className="speaker-name">{speakerName}</span>
              <span className="speaker-role">
                {speakerRole} · {activeCharacter.tag}
              </span>
            </div>
            <p>{dialogue}</p>
            <small>{prompt}</small>
            <button
              className="story-next-button"
              disabled={!sceneCanAdvance}
              type="button"
              onClick={advanceCurrentScene}
            >
              {advanceLabel}
            </button>
          </div>
        </div>
      </section>

      <section className="play">
        <div className="question-panel">
          <div className="month-head">
            <div>
              <span className="panel-kicker">市场主题与研究决策</span>
              <h2>{scene.label} 研究选择</h2>
            </div>
          </div>
          <p className="scene-brief">{isDecision ? story.mission : "剧情演出中。继续对话后，会进入本月研究选择。"}</p>
          <ThemePanel scene={scene} />
          {isDecision ? (
            <>
              <ResearchBriefPanel
                briefs={decisionNode?.briefs || []}
                title={decisionNode?.briefTitle || `${scene.label} 研究线索`}
              />
              <FocusSelector state={state} onSelect={selectFocusWithSound} />
              <div className="options">
                {topDecisions.map((decision, index) => (
                  <DecisionCard
                    index={index}
                    key={decision.id}
                    decision={decision}
                    state={state}
                    onChoose={makeDecisionWithSound}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="script-preview">
              <span>剧情节点</span>
              <strong>{scene.theme.title}</strong>
              <p>当前节点 {sceneProgress}。继续完成对白后，本月研究选择会开放。</p>
            </div>
          )}
          <div className="result-band">
            <div className="result-copy">
              <strong>{resultText}</strong>
              <span>{resultDetail}</span>
            </div>
            <button
              className="primary-button"
              disabled={!sceneCanAdvance}
              type="button"
              onClick={advanceCurrentScene}
            >
              {advanceLabel}
            </button>
          </div>
          {isDecision ? <StoryRecapPanel result={state.locked ? last : undefined} /> : null}
          {isDecision ? <ScorePanel result={state.locked ? last : undefined} /> : null}
        </div>

        <aside className="chart-panel">
          <div className="chart-title">
            <h2>研究档案</h2>
            <span>{data.year} · 12话</span>
          </div>
          <div className="route-meters">
            <Meter label="研究可信度" value={state.researchCredibility} className="reputation" />
            <Meter label="投委会采纳" value={state.committeeAdoption} className="stress" />
            <Meter label="观点命中率" value={state.viewAccuracy} className="ambition" />
            <Meter label="生活平衡" value={state.lifeBalance} className="reputation" />
          </div>
          <CharacterRoutes activeId={activeCharacter.id} state={state} />
          <PortfolioChart state={state} />
          <div className="legend">
            <span><i className="key" /> 推荐净值</span>
            <span><i className="key best" /> 沪深300</span>
          </div>
        </aside>
      </section>

      <EndingPanel state={state} />
      <HistoryPanel history={state.history} />

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
