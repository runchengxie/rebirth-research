import { AFFINITY_GATE, BRANCHES, FOCUS_ACTIONS, GRADE_REVIEWS, STORY_ARCS, buildMonthScene, getTheme } from "./content";
import { branchFlagsForMonth } from "./branching";
import type {
  CharacterId,
  DecisionCategory,
  DecisionScore,
  FocusAction,
  GameDataYear,
  GameState,
  MonthScene,
  ResearchDecision,
  RoundOutcome,
  StoryArc,
} from "../types";

// ═══════════════════════════════════════════════════════════
// Clamp & format helpers
// ═══════════════════════════════════════════════════════════

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

// When true, affection changes are logged to the console (dev aid).
const AFFECTION_TRACE = false;

// Single choke-point for every affection mutation. Clamps to [0,100] and
// (optionally) traces the change so behaviour is debuggable — this is the
// "adjustAffection" helper that replaces scattered `+=` writes.
export function adjustAffection(
  relations: Record<CharacterId, number>,
  characterId: CharacterId,
  delta: number,
  reason?: string,
): Record<CharacterId, number> {
  const current = relations[characterId] ?? 0;
  const next = clamp(current + delta);
  relations[characterId] = next;
  if (AFFECTION_TRACE) {
    console.debug("[affection]", characterId, current, "->", next, `(delta ${delta >= 0 ? "+" : ""}${delta})`, reason ?? "");
  }
  return relations;
}

export function compactDate(raw: string): string {
  if (!raw || raw.length !== 8) return raw || "";
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

export function formatPct(rate: number): string {
  if (!Number.isFinite(rate)) return "--";
  const pct = rate * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatNav(value: number): string {
  return value.toFixed(4);
}

export function formatDelta(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}`;
}

// ═══════════════════════════════════════════════════════════
// Story / scene lookup
// ═══════════════════════════════════════════════════════════

export function storyForMonth(index: number, year?: string): StoryArc {
  const arc = STORY_ARCS[index % STORY_ARCS.length];
  if (year) {
    const theme = getTheme(year, index);
    return { ...arc, theme };
  }
  return arc;
}

export function sceneForMonth(state: GameState): MonthScene {
  return buildMonthScene(state.monthIndex, state.year, state);
}

export function currentSceneNode(state: GameState): MonthScene["nodes"][number] {
  const scene = sceneForMonth(state);
  return scene.nodes[state.sceneNodeIndex] || scene.nodes[scene.nodes.length - 1];
}

// ═══════════════════════════════════════════════════════════
// Focus actions
// ═══════════════════════════════════════════════════════════

export function focusById(id: string): FocusAction {
  return FOCUS_ACTIONS.find((item) => item.id === id) || FOCUS_ACTIONS[0];
}

// ═══════════════════════════════════════════════════════════
// Initial state
// ═══════════════════════════════════════════════════════════

export function createInitialState(year: string): GameState {
  return {
    year,
    monthIndex: 0,
    focusId: "deep_research",
    selectedId: null,
    sceneNodeIndex: 0,
    locked: false,
    finished: false,
    // Research career metrics
    // portfolioNav = 研究推荐跟踪净值 (模拟研究员推荐标的的理论表现)
    // 基准参考另算，不与净值直接比较
    researchCredibility: 14,
    committeeAdoption: 10,
    portfolioNav: 1.0,
    viewAccuracy: 12,
    clientFeedback: 10,
    teamTrust: 20,
    fatigue: 22,
    lifeBalance: 52,
    relations: {
      lin_ruoning: 18,
      chen_xinghe: 14,
      zhou_mingzhao: 12,
    },
    flags: {},
    categoryCounts: {},
    milestone: null,
    history: [],
  };
}

// ═══════════════════════════════════════════════════════════
// Decision outcome builder
// ═══════════════════════════════════════════════════════════

const CATEGORY_TEXT: Record<DecisionCategory, string> = {
  deep_research: "选择了深度研究，把判断建立在数据和逻辑上",
  expert_interview: "选择了产业验证，用一手信息校准假设",
  roadshow: "选择了沟通和表达，把框架翻译给更多人",
  risk_alert: "选择了风险提示，在市场最热的时候提醒冷静",
  self_care: "优先照顾了生活状态",
  help_colleague: "选择了帮助同事，在协作中建立信任",
  committee_defense: "站上了投委会的讲台，接受交叉提问",
  data_deep_dive: "选择了深度数据分析，用证据驱动判断",
};

const FOCUS_TEXT: Record<string, string> = {
  deep_research: "深度研报的专注让证据链更完整",
  team_collab: "团队协作让你的判断经过了交叉验证",
  self_care: "生活优先让你保持了清晰的判断力",
};

export function buildOutcome(
  decision: ResearchDecision,
  story: StoryArc,
  focus: FocusAction,
): RoundOutcome {
  return {
    title: `${story.speaker}对你的选择做出了评价`,
    dialogue: `${story.speaker}看了看你的选择：${CATEGORY_TEXT[decision.category] || "做了选择"}。${FOCUS_TEXT[focus.id] || ""}`,
    detail: decision.backgroundNote || "",
  };
}

// ═══════════════════════════════════════════════════════════
// Multi-dimensional scoring (replacing the old lookup table)
// ═══════════════════════════════════════════════════════════

export function scoreDecision(
  decision: ResearchDecision,
  story: StoryArc,
  focus: FocusAction,
): DecisionScore {
  // ── Evidence score (0-20): from decision's evidence work ──
  let evidenceScore = decision.evidenceLevel;
  if (focus.id === "deep_research") evidenceScore = Math.min(20, evidenceScore + 2);

  // ── Clarity score (0-20): how testable are the hypotheses ──
  let clarityScore = decision.clarityLevel;
  if (focus.id === "team_collab") clarityScore = Math.min(20, clarityScore + 2);
  if (focus.id === "deep_research") clarityScore = Math.min(20, clarityScore + 1);

  // ── Risk awareness score (0-20): recognising crowding and reflexivity ──
  let riskAwarenessScore = decision.riskAwareness;
  // Character synergy: Zhou Mingzhao's macro/risk episodes boost risk awareness
  if (story.characterId === "zhou_mingzhao") {
    riskAwarenessScore = Math.min(20, riskAwarenessScore + 2);
  }

  // ── Communication score (0-20): presentation and influence ──
  let communicationScore = 10; // baseline
  if (decision.category === "roadshow") communicationScore = 18;
  else if (decision.category === "committee_defense") communicationScore = 17;
  else if (decision.category === "expert_interview") communicationScore = 14;
  else if (focus.id === "team_collab") communicationScore = Math.max(communicationScore, 15);
  // Chen Xinghe synergy for data-driven communication
  if (story.characterId === "chen_xinghe" && (decision.category === "data_deep_dive" || decision.category === "roadshow")) {
    communicationScore = Math.min(20, communicationScore + 2);
  }

  // ── Life balance score (0-15): maintaining sustainable pace ──
  let lifeBalanceScore = 8; // baseline
  if (decision.category === "self_care") lifeBalanceScore = 14;
  else if (focus.id === "self_care") lifeBalanceScore = Math.max(lifeBalanceScore, 12);
  else if (decision.category === "deep_research" && focus.id === "deep_research") lifeBalanceScore = 3;
  else if (decision.category === "help_colleague") lifeBalanceScore = 10;
  // Reflection bonus from self-care decisions
  if (decision.reflectionValue >= 10) lifeBalanceScore = Math.min(15, lifeBalanceScore + 2);

  // ── Portfolio score (0-5): research recommendation tracking ──
  // Minimal weight — this is about the research process, not stock-picking luck
  let portfolioScore = 3; // baseline
  if (decision.category === "deep_research" && decision.effects.portfolioNav > 0.01) portfolioScore = 5;
  else if (decision.category === "deep_research") portfolioScore = 4;
  else if (decision.category === "data_deep_dive") portfolioScore = 4;
  else if (decision.category === "risk_alert") portfolioScore = 2;
  else if (decision.category === "self_care") portfolioScore = 2;

  // ── Reflection bonus (built into the scores from decision.reflectionValue) ──
  // Reflection quality enhances all dimensions slightly
  const reflectionBonus = Math.floor(decision.reflectionValue / 5);
  evidenceScore = Math.min(20, evidenceScore + reflectionBonus);
  clarityScore = Math.min(20, clarityScore + reflectionBonus);
  riskAwarenessScore = Math.min(20, riskAwarenessScore + reflectionBonus);

  // ── Character synergy bonus ──
  const characterId = story.characterId;
  if (characterId === "lin_ruoning" && (decision.category === "deep_research" || decision.category === "data_deep_dive")) {
    evidenceScore = Math.min(20, evidenceScore + 1);
    clarityScore = Math.min(20, clarityScore + 1);
  } else if (characterId === "chen_xinghe" && (decision.category === "data_deep_dive" || decision.category === "expert_interview")) {
    evidenceScore = Math.min(20, evidenceScore + 1);
    riskAwarenessScore = Math.min(20, riskAwarenessScore + 1);
  } else if (characterId === "zhou_mingzhao" && (decision.category === "risk_alert" || decision.category === "committee_defense")) {
    riskAwarenessScore = Math.min(20, riskAwarenessScore + 2);
  }

  // ── Total ──
  const total = Math.min(100,
    evidenceScore + clarityScore + riskAwarenessScore +
    communicationScore + lifeBalanceScore + portfolioScore
  );

  let grade = "D";
  if (total >= 90) grade = "S";
  else if (total >= 75) grade = "A";
  else if (total >= 60) grade = "B";
  else if (total >= 40) grade = "C";

  return {
    evidenceScore,
    clarityScore,
    riskAwarenessScore,
    communicationScore,
    lifeBalanceScore,
    portfolioScore,
    total,
    grade,
  };
}

// ═══════════════════════════════════════════════════════════
// Grade review text
// ═══════════════════════════════════════════════════════════

export function gradeReviewText(characterId: CharacterId, grade: string): string {
  const reviews = GRADE_REVIEWS[characterId]?.[grade];
  if (!reviews || reviews.length === 0) return "";
  const seed = Array.from(grade).reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return reviews[seed % reviews.length];
}

// ═══════════════════════════════════════════════════════════
// State transitions
// ═══════════════════════════════════════════════════════════

export function selectFocus(state: GameState, focusId: string): GameState {
  if (state.locked || state.finished) return state;
  return { ...state, focusId };
}

export function makeDecision(state: GameState, _data: GameDataYear, decision: ResearchDecision): GameState {
  if (state.locked || state.finished) return state;
  const story = storyForMonth(state.monthIndex, state.year);
  const focus = focusById(state.focusId);
  const outcome = buildOutcome(decision, story, focus);
  const characterId = story.characterId;
  const eff = decision.effects;

  // Apply focus bonuses
  const researchBonus = focus.researchCredibilityBonus;
  const fatigueFromFocus = focus.fatigueDelta;
  const lifeBalanceFromFocus = focus.lifeBalanceDelta;
  const teamTrustFromFocus = focus.teamTrustBonus;

  const nextResearchCredibility = clamp(state.researchCredibility + eff.researchCredibility + researchBonus);
  const nextCommitteeAdoption = clamp(state.committeeAdoption + eff.committeeAdoption);
  // portfolioNav tracks research recommendation performance (not personal trading)
  const nextPortfolioNav = Math.max(0.001, state.portfolioNav * (1 + eff.portfolioNav));
  const nextViewAccuracy = clamp(state.viewAccuracy + eff.viewAccuracy);
  const nextClientFeedback = clamp(state.clientFeedback + eff.clientFeedback);
  const nextTeamTrust = clamp(state.teamTrust + eff.teamTrust + teamTrustFromFocus);
  const nextFatigue = clamp(state.fatigue + eff.fatigue + fatigueFromFocus);
  const nextLifeBalance = clamp(state.lifeBalance + eff.lifeBalance + lifeBalanceFromFocus);

  // All per-decision affection deltas are applied exactly once through the
  // central adjustAffection helper (no hidden double-counting).
  const nextRelations: Record<CharacterId, number> = { ...state.relations };
  eff.characterRelations.forEach((rel) => {
    adjustAffection(nextRelations, rel.characterId, rel.value, `decision:${decision.id}`);
  });
  // The month's arc character also absorbs a small fraction of the team trust
  // built through the chosen daily focus. This is an explicit, documented
  // coupling (not a hidden double-count) and is intentionally small so the
  // player's own choices dominate who they grow close to.
  const focusTrustToArc = Math.floor(teamTrustFromFocus / 3);
  if (focusTrustToArc !== 0) {
    adjustAffection(nextRelations, characterId, focusTrustToArc, `focus:${focus.id}`);
  }

  // Accumulate the chosen decision category so route branches can read a
  // "category streak" — the primary signal distinguishing research-obsessed,
  // relationship-focused, self-care-balanced, ... playstyles.
  const nextCategoryCounts: Partial<Record<DecisionCategory, number>> = {
    ...state.categoryCounts,
    [decision.category]: (state.categoryCounts[decision.category] ?? 0) + 1,
  };

  // Affinity gates: record which characters crossed the relationship threshold,
  // and surface a one-time milestone for the UI.
  const nextFlags: Record<string, boolean | number> = { ...state.flags };
  let milestone: CharacterId | null = null;
  (Object.keys(nextRelations) as CharacterId[]).forEach((cid) => {
    const before = state.relations[cid] ?? 0;
    const after = nextRelations[cid];
    if (after >= AFFINITY_GATE) nextFlags[`affinity_${cid}`] = after;
    if (before < AFFINITY_GATE && after >= AFFINITY_GATE && !milestone) milestone = cid;
  });

  // Record the route branches that were active while playing this month (they
  // were already evaluated to build the scene, so this just persists them).
  Object.assign(nextFlags, branchFlagsForMonth(state, BRANCHES));

  const score = scoreDecision(decision, story, focus);

  return {
    ...state,
    locked: true,
    selectedId: decision.id,
    researchCredibility: nextResearchCredibility,
    committeeAdoption: nextCommitteeAdoption,
    portfolioNav: Math.round(nextPortfolioNav * 10000) / 10000,
    viewAccuracy: nextViewAccuracy,
    clientFeedback: nextClientFeedback,
    teamTrust: nextTeamTrust,
    fatigue: nextFatigue,
    lifeBalance: nextLifeBalance,
    relations: nextRelations,
    flags: nextFlags,
    categoryCounts: nextCategoryCounts,
    milestone,
    finished: state.monthIndex >= 11,
    history: [
      ...state.history,
      {
        month: `${state.year}-${String(state.monthIndex + 1).padStart(2, "0")}`,
        label: `${state.year}年${state.monthIndex + 1}月`,
        characterId,
        sceneTitle: story.title,
        selected: decision,
        focus,
        outcome,
        researchCredibilityAfter: nextResearchCredibility,
        committeeAdoptionAfter: nextCommitteeAdoption,
        portfolioNavAfter: nextPortfolioNav,
        viewAccuracyAfter: nextViewAccuracy,
        clientFeedbackAfter: nextClientFeedback,
        teamTrustAfter: nextTeamTrust,
        fatigueAfter: nextFatigue,
        lifeBalanceAfter: nextLifeBalance,
        relationsAfter: { ...nextRelations },
        marketTheme: story.theme.title,
        marketReturn: 0, // Will be filled from data if available
        score,
      },
    ],
  };
}

export function nextMonth(state: GameState): GameState {
  if (state.finished) return createInitialState(state.year);
  if (!state.locked) return state;
  return {
    ...state,
    monthIndex: Math.min(state.monthIndex + 1, 11),
    selectedId: null,
    sceneNodeIndex: 0,
    locked: false,
    focusId: "deep_research",
    milestone: null,
  };
}

// ═══════════════════════════════════════════════════════════
// Scene advancement
// ═══════════════════════════════════════════════════════════

export function canAdvanceScene(state: GameState): boolean {
  const node = currentSceneNode(state);
  return node.type === "dialogue" || state.locked;
}

export function advanceScene(state: GameState, _data: GameDataYear): GameState {
  void _data;
  const scene = sceneForMonth(state);
  const node = currentSceneNode(state);
  if (node.type === "decision" && !state.locked) return state;
  if (state.sceneNodeIndex < scene.nodes.length - 1) {
    return {
      ...state,
      sceneNodeIndex: state.sceneNodeIndex + 1,
    };
  }
  return nextMonth(state);
}

// ═══════════════════════════════════════════════════════════
// Post-mortem text
// ═══════════════════════════════════════════════════════════

export function postMortem(
  decision: ResearchDecision,
  monthLabel: string,
): string {
  return `${monthLabel} ${CATEGORY_TEXT[decision.category] || "做了选择"}。${decision.backgroundNote || ""}`;
}

// ═══════════════════════════════════════════════════════════
// Best route (highest relation)
// ═══════════════════════════════════════════════════════════

export function bestRoute(state: GameState): CharacterId {
  const sorted = (Object.entries(state.relations) as Array<[CharacterId, number]>).sort(
    (a, b) => b[1] - a[1],
  );
  return sorted[0]?.[0] || "lin_ruoning";
}

export function totalRelations(state: GameState): number {
  return Object.values(state.relations).reduce((sum, v) => sum + v, 0);
}

// ═══════════════════════════════════════════════
// Branching / progression flags
// ═══════════════════════════════════════════════

export function setFlag(state: GameState, key: string, value: boolean | number = true): GameState {
  return { ...state, flags: { ...state.flags, [key]: value } };
}

export function getFlag(state: GameState, key: string): boolean | number | undefined {
  return state.flags[key];
}

export function hasFlag(state: GameState, key: string): boolean {
  const value = state.flags[key];
  return value !== undefined && value !== false && value !== 0;
}
