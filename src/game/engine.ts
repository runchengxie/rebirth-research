import { FOCUS_ACTIONS, SCENE_SCRIPTS, SIGNAL_TYPES, STORY_ARCS, YEAR_STORY_OVERRIDES } from "./content";
import type {
  CharacterId,
  FocusAction,
  GameDataYear,
  GameState,
  RoundOutcome,
  SceneNode,
  SceneScript,
  StockOption,
  StoryArc,
} from "../types";

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function compactDate(raw: string): string {
  if (!raw || raw.length !== 8) return raw || "";
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return "--";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 100000000) return `${sign}¥${(abs / 100000000).toFixed(2)}亿`;
  if (abs >= 10000) return `${sign}¥${(abs / 10000).toFixed(2)}万`;
  return `${sign}¥${abs.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}`;
}

export function formatMoneyFull(value: number): string {
  return `¥${value.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}`;
}

export function formatPct(rate: number): string {
  if (!Number.isFinite(rate)) return "--";
  const pct = rate * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatDelta(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}`;
}

export function storyForMonth(index: number, year?: string): StoryArc {
  const base = STORY_ARCS[index % STORY_ARCS.length];
  const override = year ? YEAR_STORY_OVERRIDES[year]?.[index] : undefined;
  if (!override) return base;
  return {
    ...base,
    ...override,
    event: {
      ...base.event,
      ...override.event,
    },
  };
}

export function sceneForMonth(index: number, year?: string): SceneScript {
  const explicitScene = SCENE_SCRIPTS.find((scene) => scene.monthIndex === index && (!scene.year || scene.year === year));
  if (explicitScene) return explicitScene;

  const story = storyForMonth(index, year);
  return {
    id: `${year || "default"}-month-${index + 1}`,
    year,
    monthIndex: index,
    title: story.title,
    defaultCharacterId: story.characterId,
    nodes: [
      {
        type: "line",
        characterId: story.characterId,
        speaker: "内心独白",
        role: "只有你知道",
        mood: "判断",
        text: story.event.protagonistMemory,
        prompt: "点击继续，把未来记忆整理成当下说得通的研究假设。",
        voiceCue: "silent",
      },
      {
        type: "line",
        characterId: story.characterId,
        speaker: story.speaker,
        role: story.role,
        mood: story.mood,
        text: `${story.line} ${story.event.publicContext}`,
        prompt: "点击继续，进入本月实战会。",
        voiceCue: "key",
      },
      {
        type: "stockRound",
        prompt: story.mission,
        bg: "briefing-room",
        briefTitle: `${story.event.period}：${story.event.title}`,
        briefs: [
          {
            characterId: "rina",
            label: "事件背景",
            text: story.event.publicContext,
          },
          {
            characterId: "misaki",
            label: "实战入口",
            text: story.event.gameHook,
          },
          {
            characterId: "mei",
            label: "剧情边界",
            text: "女主们只依据公开信息和当下数据判断。男主需要把未来记忆转成可验证假设。",
          },
        ],
      },
    ],
  };
}

export function currentSceneNode(state: GameState): SceneNode {
  const scene = sceneForMonth(state.monthIndex, state.year);
  return scene.nodes[state.sceneNodeIndex] || scene.nodes[scene.nodes.length - 1];
}

export function focusById(id: string): FocusAction {
  return FOCUS_ACTIONS.find((item) => item.id === id) || FOCUS_ACTIONS[0];
}

export function signalType(option: StockOption): string {
  const source = `${option.tsCode || ""}${option.industry || ""}`;
  const total = Array.from(source).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return SIGNAL_TYPES[total % SIGNAL_TYPES.length];
}

export function riskLabel(option: StockOption): string {
  if (option.returnRank <= 10) return "参考路线";
  if (option.activeRank <= 50) return "热门线";
  if (option.returnRate < 0) return "会扣血";
  return "观察中";
}

export function analysisNote(option: StockOption, revealed = false): string {
  const liquidity =
    option.activeRank <= 50
      ? "成交活跃度极高，资金关注度很高"
      : option.activeRank <= 200
        ? "成交活跃度靠前，说明当月已经被资金反复确认"
        : "成交活跃度仍在题库前列，但需要更重视逻辑兑现";
  const setup = `${option.industry || "未知行业"} · ${signalType(option)}。${liquidity}`;
  if (!revealed) {
    return `研究假设：${setup}。先判断逻辑能否从月初延续到月末。`;
  }
  const review =
    option.returnRate >= 0.2
      ? "复盘结果显示这条线索兑现得很充分"
      : option.returnRate >= 0
        ? "复盘结果偏稳，强度低于主线"
        : "复盘结果为负，说明当时的风险释放快于逻辑兑现";
  return `角色复盘：${setup}，涨幅排名 #${option.returnRank}。${review}。`;
}

export function createInitialState(year: string, data: GameDataYear, initialCapital?: number): GameState {
  const capital = initialCapital && initialCapital > 0 ? initialCapital : data.initialCapital || 10000;
  return {
    year,
    initialCapital: capital,
    capital,
    monthIndex: 0,
    focusId: "research",
    selectedId: null,
    sceneNodeIndex: 0,
    locked: false,
    finished: false,
    reputation: 18,
    fatigue: 34,
    affection: {
      rina: 24,
      misaki: 18,
      mei: 16,
    },
    history: [],
  };
}

export function buildOutcome(
  option: StockOption,
  story: StoryArc,
  before: number,
  after: number,
  focus: FocusAction,
): RoundOutcome {
  const focusText = focus.returnBonus === 0 ? "本话没有收益修正" : `日程修正 ${formatPct(focus.returnBonus)}`;
  if (option.isBest) {
    return {
      title: "实战路线命中",
      dialogue: `${story.speaker}开心地合上笔记本：答对啦！这条路线把事件和资金连起来了，今天给你加一颗小星星。`,
      detail: `小金库 ${formatMoneyFull(before)} → ${formatMoneyFull(after)}，${focusText}。`,
      reputationDelta: 10,
      fatigueDelta: -6,
      affectionDelta: 5,
    };
  }
  if (option.returnRate >= 0.2) {
    return {
      title: "支线也有收益",
      dialogue: `${story.speaker}看了一眼涨幅，露出笑容：这条支线也有不错收益，选得很细心。`,
      detail: `小金库 ${formatMoneyFull(before)} → ${formatMoneyFull(after)}，${focusText}。`,
      reputationDelta: 5,
      fatigueDelta: 2,
      affectionDelta: 2,
    };
  }
  if (option.returnRate >= 0) {
    return {
      title: "普通支线通过",
      dialogue: `${story.speaker}提醒你：能小赚已经很棒了，想进好结局，下次可以再大胆一点。`,
      detail: `小金库 ${formatMoneyFull(before)} → ${formatMoneyFull(after)}，${focusText}。`,
      reputationDelta: 2,
      fatigueDelta: 5,
      affectionDelta: 1,
    };
  }
  return {
    title: "风险复盘",
    dialogue: `${story.speaker}没有责怪你，只把复盘模板发了过来：没关系，失败记录也会变成经验值。`,
    detail: `小金库 ${formatMoneyFull(before)} → ${formatMoneyFull(after)}，${focusText}。`,
    reputationDelta: -6,
    fatigueDelta: 12,
    affectionDelta: -1,
  };
}

export function selectFocus(state: GameState, focusId: string): GameState {
  if (state.locked || state.finished) return state;
  return { ...state, focusId };
}

export function chooseOption(state: GameState, data: GameDataYear, option: StockOption): GameState {
  if (state.locked || state.finished) return state;
  const month = data.months[state.monthIndex];
  const story = storyForMonth(state.monthIndex, state.year);
  const focus = focusById(state.focusId);
  const before = state.capital;
  const finalRate = Math.max(-0.95, option.returnRate + focus.returnBonus);
  const after = before * (1 + finalRate);
  const outcome = buildOutcome(option, story, before, after, focus);
  const characterId = story.characterId;
  const nextReputation = clamp(state.reputation + outcome.reputationDelta + focus.reputationDelta);
  const nextFatigue = clamp(state.fatigue + outcome.fatigueDelta + focus.fatigueDelta);
  const nextAffection = clamp(
    state.affection[characterId] + outcome.affectionDelta + focus.affectionDelta,
  );

  return {
    ...state,
    capital: after,
    locked: true,
    selectedId: option.id,
    reputation: nextReputation,
    fatigue: nextFatigue,
    affection: {
      ...state.affection,
      [characterId]: nextAffection,
    },
    finished: state.monthIndex >= data.months.length - 1,
    history: [
      ...state.history,
      {
        month: month.month,
        label: month.label,
        story,
        characterId,
        selected: option,
        best: month.best,
        focus,
        before,
        marketRate: option.returnRate,
        executionRate: focus.returnBonus,
        finalRate,
        after,
        hit: Boolean(option.isBest),
        outcome,
        reputationAfter: nextReputation,
        fatigueAfter: nextFatigue,
        affectionAfter: nextAffection,
      },
    ],
  };
}

export function nextMonth(state: GameState, data: GameDataYear): GameState {
  if (state.finished) return createInitialState(state.year, data, state.initialCapital);
  if (!state.locked) return state;
  return {
    ...state,
    monthIndex: Math.min(state.monthIndex + 1, data.months.length - 1),
    selectedId: null,
    sceneNodeIndex: 0,
    locked: false,
    focusId: "research",
  };
}

export function canAdvanceScene(state: GameState): boolean {
  const node = currentSceneNode(state);
  return node.type === "line" || state.locked;
}

export function advanceScene(state: GameState, data: GameDataYear): GameState {
  const scene = sceneForMonth(state.monthIndex, state.year);
  const node = currentSceneNode(state);
  if (node.type === "stockRound" && !state.locked) return state;
  if (state.sceneNodeIndex < scene.nodes.length - 1) {
    return {
      ...state,
      sceneNodeIndex: state.sceneNodeIndex + 1,
    };
  }
  return nextMonth(state, data);
}

export function totalAffection(state: GameState): number {
  return Object.values(state.affection).reduce((sum, value) => sum + value, 0);
}

export function bestRoute(state: GameState): CharacterId {
  const sorted = (Object.entries(state.affection) as Array<[CharacterId, number]>).sort(
    (a, b) => b[1] - a[1],
  );
  return sorted[0]?.[0] || "rina";
}
