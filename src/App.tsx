import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { GAME_DATA, GAME_YEARS } from "./data/gameData";
import { ProceduralBgm } from "./audio/bgm";
import { CHARACTERS, FOCUS_ACTIONS } from "./game/content";
import {
  advanceScene,
  analysisNote,
  bestRoute,
  canAdvanceScene,
  chooseOption,
  compactDate,
  createInitialState,
  currentSceneNode,
  focusById,
  formatDelta,
  formatMoney,
  formatMoneyFull,
  formatPct,
  riskLabel,
  sceneForMonth,
  selectFocus,
  signalType,
  storyForMonth,
  totalAffection,
} from "./game/engine";
import type { CharacterId, GameState, ResearchBrief, RoundResult, StockOption } from "./types";

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
      antialias: false,
      failIfMajorPerformanceCaveat: true,
      powerPreference: "low-power",
    };
    const gl = canvas.getContext("webgl2", contextOptions) ?? canvas.getContext("webgl", contextOptions);
    if (!gl) return false;

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info") as {
      UNMASKED_RENDERER_WEBGL: number;
      UNMASKED_VENDOR_WEBGL: number;
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
  return createInitialState(year, GAME_DATA[year]);
}

function StatusBar({ state }: { state: GameState }) {
  const data = GAME_DATA[state.year];
  const total = data.months.length;
  return (
    <section className="status-band" aria-label="角色状态">
      <div className="stat">
        <span>当前话数</span>
        <strong>
          {state.monthIndex + 1}/{total}
        </strong>
      </div>
      <div className="stat">
        <span>小金库余额</span>
        <strong>{formatMoney(state.capital)}</strong>
      </div>
      <div className="stat">
        <span>总好感</span>
        <strong>{totalAffection(state)}/300</strong>
      </div>
      <div className="stat">
        <span>疲劳值</span>
        <strong>{state.fatigue}/100</strong>
      </div>
    </section>
  );
}

function FocusSelector({
  state,
  onSelect,
}: {
  state: GameState;
  onSelect: (focusId: string) => void;
}) {
  return (
    <div className="focus-grid" aria-label="本话日程">
      {FOCUS_ACTIONS.map((focus) => (
        <button
          key={focus.id}
          className={`focus-card ${state.focusId === focus.id ? "active" : ""}`}
          disabled={state.locked}
          type="button"
          onClick={() => onSelect(focus.id)}
        >
          <span className="focus-icon">{focus.icon}</span>
          <strong>{focus.label}</strong>
          <small>{focus.short}</small>
          <p>{focus.detail}</p>
        </button>
      ))}
    </div>
  );
}

function ResearchBriefPanel({
  title,
  briefs,
}: {
  title: string;
  briefs: ResearchBrief[];
}) {
  if (briefs.length === 0) return null;
  return (
    <div className="research-briefs" aria-label="研究会纪要">
      <div className="research-briefs-head">
        <span>研究会纪要</span>
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

function OptionCard({
  option,
  index,
  state,
  onChoose,
}: {
  option: StockOption;
  index: number;
  state: GameState;
  onChoose: (option: StockOption) => void;
}) {
  const optionLetter = String.fromCharCode(65 + index);
  const locked = state.locked;
  const selected = state.selectedId === option.id;
  const className = [
    "option",
    locked && option.isBest ? (selected ? "correct" : "missed") : "",
    locked && selected && !option.isBest ? "wrong" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={className} disabled={locked} type="button" onClick={() => onChoose(option)}>
      <div className="option-kicker">
        <span>心动卡 {optionLetter}</span>
        <span>{signalType(option)}</span>
      </div>
      <div className="option-top">
        <div className="stock-name">
          <strong>{option.name}</strong>
          <span>{option.tsCode}</span>
        </div>
        <span className="rank-badge">{riskLabel(option)}</span>
      </div>
      <div className="meta">
        {option.industry} · {option.market || option.board || "A股"} · 活跃 #{option.activeRank}
      </div>
      <p className="analysis-note">{analysisNote(option, locked)}</p>
      <div className="option-bottom">
        <span className={locked ? `return ${option.returnRate >= 0 ? "up" : "down"}` : "hidden-return"}>
          {locked ? formatPct(option.returnRate) : "本话结局待揭晓"}
        </span>
        <span className="meta">{locked ? `涨幅 #${option.returnRank}` : `交易日 ${option.tradingDays}`}</span>
      </div>
    </button>
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
    <div className="character-routes" aria-label="角色路线">
      {Object.values(CHARACTERS).map((character) => {
        const affection = state.affection[character.id];
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
                <b>{affection}/100</b>
                <i style={{ width: `${Math.max(0, Math.min(100, affection))}%` }} />
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
  const displayValue = className === "ambition" ? `${normalized.toFixed(2)}%` : Math.round(normalized);
  return (
    <div className={`meter ${className}`}>
      <div className="meter-head">
        <span>{label}</span>
        <strong>{displayValue}</strong>
      </div>
      <div className="meter-track">
        <i style={{ width: `${normalized}%` }} />
      </div>
    </div>
  );
}

function CapitalChart({ state }: { state: GameState }) {
  const data = GAME_DATA[state.year];
  const selectedPath = [state.initialCapital, ...state.history.map((item) => item.after)];
  const bestPath = [state.initialCapital];
  data.months.forEach((month, index) => {
    if (index < state.history.length) {
      const prev = bestPath[bestPath.length - 1];
      bestPath.push(prev * (1 + month.best.returnRate));
    }
  });

  const values = [...selectedPath, ...bestPath, data.targetCapital].filter((value) => value > 0);
  const minLog = Math.log10(Math.max(1, Math.min(...values) * 0.8));
  const maxLog = Math.log10(Math.max(...values) * 1.15);
  const width = 720;
  const height = 260;
  const pad = { left: 48, right: 20, top: 18, bottom: 32 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const maxSteps = data.months.length;

  const x = (index: number) => pad.left + (chartW * index) / maxSteps;
  const y = (value: number) => {
    const log = Math.log10(Math.max(1, value));
    return pad.top + chartH - ((log - minLog) / (maxLog - minLog || 1)) * chartH;
  };
  const path = (items: number[]) => items.map((value, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(value)}`).join(" ");

  return (
    <svg className="capital-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="小金库曲线">
      {[0, 1, 2, 3, 4].map((item) => {
        const yy = pad.top + (chartH * item) / 4;
        return <line className="chart-grid-line" key={item} x1={pad.left} x2={width - pad.right} y1={yy} y2={yy} />;
      })}
      <text className="chart-label" x={pad.left - 8} y={y(state.initialCapital)} textAnchor="end">
        {formatMoney(state.initialCapital)}
      </text>
      <text className="chart-label" x={pad.left - 8} y={y(data.targetCapital)} textAnchor="end">
        {formatMoney(data.targetCapital)}
      </text>
      <line className="chart-target" x1={pad.left} x2={width - pad.right} y1={y(data.targetCapital)} y2={y(data.targetCapital)} />
      <path className="chart-best" d={path(bestPath)} />
      <path className="chart-current" d={path(selectedPath)} />
      {selectedPath.map((value, index) => (
        <circle className="chart-point current" key={`s-${index}`} cx={x(index)} cy={y(value)} r="4" />
      ))}
      {bestPath.map((value, index) => (
        <circle className="chart-point best" key={`b-${index}`} cx={x(index)} cy={y(value)} r="3" />
      ))}
    </svg>
  );
}

function EndingPanel({ state }: { state: GameState }) {
  if (!state.finished || state.history.length === 0) return null;
  const data = GAME_DATA[state.year];
  const hits = state.history.filter((item) => item.hit).length;
  const multiple = state.capital / state.initialCapital;
  const heroine = CHARACTERS[bestRoute(state)];
  let title = "普通结局：可靠投研部员线";
  let copy = "你没有解锁传说 CG，但每一次复盘都在让下一周目更接近好结局。";

  if (state.capital >= data.targetCapital) {
    title = `真结局：${heroine.name}的亿级心动K线`;
    copy = `一年时间，你把小金库推到亿级目标。${heroine.name}说，这条路线一定要存档。`;
  } else if (multiple >= 20 && state.reputation >= 60) {
    title = `好结局：${heroine.name}的闪耀研究员线`;
    copy = `小金库曲线和闪耀度同时起飞，${heroine.name}开始把你的名字和主线剧情放在一起。`;
  } else if (state.fatigue >= 82) {
    title = "疲劳结局：深夜复盘线";
    copy = "你赚到了一些钱，也把自己逼到极限。下一周目前，先让疲劳值降下来。";
  } else if (hits >= 3 || multiple >= 5) {
    title = "成长结局：主线入场线";
    copy = "你还没有打出真结局，但终于进入女主们愿意认真期待的主线。";
  }

  return (
    <section className="ending-panel">
      <div>
        <span className="panel-kicker">Ending</span>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
      <dl>
        <div>
          <dt>最终小金库</dt>
          <dd>{formatMoneyFull(state.capital)}</dd>
        </div>
        <div>
          <dt>闪光路线</dt>
          <dd>
            {hits}/{state.history.length}
          </dd>
        </div>
        <div>
          <dt>璃奈/美咲/芽衣</dt>
          <dd>
            {state.affection.rina}/{state.affection.misaki}/{state.affection.mei}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function HistoryPanel({ history }: { history: RoundResult[] }) {
  if (history.length === 0) return null;
  return (
    <section className="history-panel">
      <div className="history-head">
        <h2>存档回放</h2>
        <span className="meta">{history.length} / 12</span>
      </div>
      <div className="history-table-wrap">
        <table>
          <thead>
            <tr>
              <th>章节</th>
              <th>情报卡</th>
              <th>市场/执行</th>
              <th>闪光路线</th>
              <th>结算</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.month}>
                <td>
                  {item.label}
                  <br />
                  <span className="meta">{item.story.title}</span>
                </td>
                <td>
                  {item.selected.name}
                  <br />
                  <span className="meta">
                    {CHARACTERS[item.characterId].name}路线 · {signalType(item.selected)} · {item.selected.tsCode}
                  </span>
                </td>
                <td>
                  <span className={`return ${item.marketRate >= 0 ? "up" : "down"}`}>{formatPct(item.marketRate)}</span>
                  <br />
                  <span className="meta">
                    {item.focus.label} {formatPct(item.executionRate)}
                  </span>
                </td>
                <td>
                  {item.best.name}
                  <br />
                  <span className="meta">{formatPct(item.best.returnRate)}</span>
                </td>
                <td>
                  {formatMoneyFull(item.after)}
                  <br />
                  <span className="meta">
                    闪耀 {formatDelta(item.outcome.reputationDelta)} · 疲劳 {formatDelta(item.outcome.fatigueDelta)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(readTheme());
  const [musicOn, setMusicOn] = useState(false);
  const [volume, setVolume] = useState(0.22);
  const [usePixiStage] = useState(canUsePixiStage);
  const bgmRef = useRef<ProceduralBgm | null>(null);
  const [initialCapitalInput, setInitialCapitalInput] = useState(() => String(GAME_DATA[bestInitialYear()].initialCapital || 10000));
  const [state, setState] = useState<GameState>(() => createState());
  const data = GAME_DATA[state.year];
  const month = data.months[state.monthIndex];
  const story = storyForMonth(state.monthIndex);
  const scene = sceneForMonth(state.monthIndex);
  const sceneNode = currentSceneNode(state);
  const stockRoundNode = sceneNode.type === "stockRound" ? sceneNode : null;
  const isStockRound = Boolean(stockRoundNode);
  const lineCharacterId = sceneNode.type === "line" ? sceneNode.characterId : story.characterId;
  const activeCharacter = CHARACTERS[lineCharacterId];
  const sceneBackground = sceneNode.type === "line" ? sceneNode.bg || "research-room" : stockRoundNode?.bg || "briefing-room";
  const scenePose = sceneNode.type === "line" ? sceneNode.pose || "neutral" : "thinking";
  const last = state.history[state.history.length - 1];
  const activeFocus = focusById(state.focusId);
  const sceneCanAdvance = canAdvanceScene(state);
  const sceneProgress = `${Math.min(state.sceneNodeIndex + 1, scene.nodes.length)}/${scene.nodes.length}`;
  const isLastSceneNode = state.sceneNodeIndex >= scene.nodes.length - 1;

  const speakerName = state.locked && isStockRound && last ? story.speaker : sceneNode.type === "line" ? sceneNode.speaker : story.speaker;
  const speakerRole = state.locked && isStockRound && last ? story.role : sceneNode.type === "line" ? sceneNode.role : story.role;
  const sceneMood = sceneNode.type === "line" ? sceneNode.mood : story.mood;
  const resultText = isStockRound
    ? state.locked && last
      ? last.outcome.title
      : "选择心动情报卡"
    : state.locked && last
      ? "结算后剧情"
      : "剧情推进中";
  const resultDetail = isStockRound
    ? state.locked && last
      ? `${last.outcome.detail} 隐藏闪光路线为 ${month.best.name} ${formatPct(month.best.returnRate)}。`
      : `${compactDate(month.marketStart)} 至 ${compactDate(month.marketEnd)}，候选池 ${month.candidateCount} 只。`
    : state.locked && last
      ? `${last.outcome.title} · 剧情节点 ${sceneProgress}，${isLastSceneNode ? "继续后会进入下一话。" : "继续后会推进结算后剧情。"}`
      : `${scene.title} · 剧情节点 ${sceneProgress}，继续后会进入本月情报会。`;
  const dialogue = stockRoundNode
    ? state.locked && last
      ? last.outcome.dialogue
      : "四张心动情报卡已经摆在桌上。先安排本话日程，再选出你要负责的路线。"
    : sceneNode.type === "line"
      ? sceneNode.text
      : "";
  const prompt = stockRoundNode
    ? state.locked
      ? "结算完成，点击继续剧情。"
      : stockRoundNode?.prompt || story.mission
    : sceneNode.prompt || "点击继续剧情。";
  const advanceLabel =
    isStockRound && !state.locked
      ? "先选择情报卡"
      : state.finished && isLastSceneNode
        ? "开启新周目"
        : state.locked && isLastSceneNode
          ? "下一话"
        : isStockRound && state.locked
          ? "继续剧情"
          : "继续";

  const topOptions = useMemo(() => month.options, [month]);

  useEffect(() => {
    if (!bgmRef.current) {
      bgmRef.current = new ProceduralBgm();
    }
    bgmRef.current.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    return () => bgmRef.current?.stop();
  }, []);

  function restart(year = state.year) {
    const parsedCapital = Number(initialCapitalInput);
    setState(createInitialState(year, GAME_DATA[year], Number.isFinite(parsedCapital) ? parsedCapital : undefined));
  }

  function changeYear(year: string) {
    setState(createInitialState(year, GAME_DATA[year], Number(initialCapitalInput) || undefined));
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("rebirthGameTheme", next);
    } catch {
      // Local storage can be unavailable in strict privacy modes.
    }
  }

  async function toggleMusic() {
    const controller = bgmRef.current || new ProceduralBgm();
    bgmRef.current = controller;
    if (musicOn) {
      controller.stop();
      setMusicOn(false);
      return;
    }
    await controller.start();
    controller.setVolume(volume);
    setMusicOn(true);
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-kicker">Moe Galgame · PixiJS Stage · A 股实盘题库</span>
          <h1>心动K线：重生投研部</h1>
          <p>被三位投研部女主捡回年初工位，用真实行情、日程安排和小金库改写新周目。</p>
        </div>
        <div className="controls">
          <div className="segmented" aria-label="年份">
            {GAME_YEARS.map((year) => (
              <button className={year === state.year ? "active" : ""} key={year} type="button" onClick={() => changeYear(year)}>
                {year}线
              </button>
            ))}
          </div>
          <label className="money-input">
            小金库
            <input
              min="100"
              step="100"
              type="number"
              value={initialCapitalInput}
              onChange={(event) => setInitialCapitalInput(event.target.value)}
              onBlur={() => restart(state.year)}
            />
          </label>
          <button className="icon-button theme-button" type="button" title="切换主题" aria-label="切换主题" onClick={toggleTheme}>
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button className="icon-button" type="button" title="切换背景音乐" aria-label="切换背景音乐" onClick={() => void toggleMusic()}>
            {musicOn ? "♪" : "♩"}
          </button>
          <label className="volume-input" title="背景音乐音量">
            音量
            <input
              max="0.7"
              min="0"
              step="0.01"
              type="range"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
            />
          </label>
          <button className="icon-button" type="button" title="重新开始" aria-label="重新开始" onClick={() => restart(state.year)}>
            ↻
          </button>
        </div>
      </header>

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
            <span>{activeCharacter.name} ROUTE</span>
            <span>好感 {state.affection[activeCharacter.id]}</span>
          </div>
          <div className="chapter-card">
            <span>Episode {String(state.monthIndex + 1).padStart(2, "0")}</span>
            <h2>{scene.title}</h2>
            <p>
              {month.label} · {sceneMood} · 剧情 {sceneProgress} · 当前日程：{activeFocus.label}
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
              onClick={() => setState((current) => advanceScene(current, data))}
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
              <span className="panel-kicker">本话分支</span>
              <h2>{month.label} 心动情报会</h2>
            </div>
            <div className="dates">
              {compactDate(month.marketStart)} / {compactDate(month.marketEnd)}
            </div>
          </div>
          <p className="scene-brief">{isStockRound ? story.mission : "剧情演出中。继续对话后，会进入本月心动情报会。"}</p>
          {isStockRound ? (
            <>
              <ResearchBriefPanel
                briefs={stockRoundNode?.briefs || []}
                title={stockRoundNode?.briefTitle || `${month.label} 研究会`}
              />
              <FocusSelector state={state} onSelect={(focusId) => setState((current) => selectFocus(current, focusId))} />
              <div className="options">
                {topOptions.map((option, index) => (
                  <OptionCard
                    index={index}
                    key={option.id}
                    option={option}
                    state={state}
                    onChoose={(selected) => setState((current) => chooseOption(current, data, selected))}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="script-preview">
              <span>剧情节点</span>
              <strong>{scene.title}</strong>
              <p>当前节点 {sceneProgress}。继续完成对白后，本月心动情报会会开放。</p>
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
              onClick={() => setState((current) => advanceScene(current, data))}
            >
              {advanceLabel}
            </button>
          </div>
        </div>

        <aside className="chart-panel">
          <div className="chart-title">
            <h2>小金库曲线</h2>
            <span>
              {data.year} · {data.months.length}话
            </span>
          </div>
          <div className="route-meters">
            <Meter label="闪耀度" value={state.reputation} className="reputation" />
            <Meter label="疲劳值" value={state.fatigue} className="stress" />
            <Meter label="亿级梦想" value={Math.min(100, (state.capital / data.targetCapital) * 100)} className="ambition" />
          </div>
          <CharacterRoutes activeId={activeCharacter.id} state={state} />
          <CapitalChart state={state} />
          <div className="legend">
            <span>
              <i className="key" /> 我的路线
            </span>
            <span>
              <i className="key best" /> 闪光路线
            </span>
          </div>
        </aside>
      </section>

      <EndingPanel state={state} />
      <HistoryPanel history={state.history} />

      <footer className="rules-note" aria-labelledby="rulesTitle">
        <h2 id="rulesTitle">企划与机制</h2>
        <p>
          这是 Vite + TypeScript + React + PixiJS 版本：PixiJS 负责萌系视觉舞台，React 负责日程、心动卡、角色路线和存档回放。股票收益仍来自真实 A
          股月度题库，日程行动提供额外执行修正和角色状态变化。当前 BGM 是 Web Audio 程序化合成循环，不依赖外部版权音频。
        </p>
      </footer>
    </main>
  );
}
