import {
  AFFINITY_GATE,
  BRANCHES,
  CHARACTERS,
  FOCUS_ACTIONS,
  GRADE_REVIEWS,
  PEER_PARTNER_RELATION,
  PEER_PARTNER_TRUST,
  STORY_ARCS,
  getTheme,
  pickKnowledgeCard,
} from "./content";
import { branchFlagsForMonth } from "./branching";
import { decisionMethod, decisionOutcomeAlignment, decisionQuality } from "./narrativeSemantics";
import type {
  CharacterId,
  DecisionCategory,
  DecisionMethod,
  DecisionScore,
  FocusAction,
  GameDataYear,
  GameState,
  KnowledgeCard,
  MarketTheme,
  MentorId,
  OfficeState,
  ResearchDecision,
  RoundOutcome,
  StoryArc,
} from "../types";

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

const AFFECTION_TRACE = false;

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
    console.debug(
      "[affection]",
      characterId,
      current,
      "->",
      next,
      `(delta ${delta >= 0 ? "+" : ""}${delta})`,
      reason ?? "",
    );
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

export function storyForMonth(index: number, year?: string): StoryArc {
  const arc = STORY_ARCS[index % STORY_ARCS.length];
  if (year) {
    const theme = getTheme(year, index);
    return { ...arc, theme };
  }
  return arc;
}

export function focusById(id: string): FocusAction {
  return FOCUS_ACTIONS.find((item) => item.id === id) || FOCUS_ACTIONS[0];
}

const METHOD_TEXT: Record<DecisionMethod, string> = {
  fundamental_research: "选择了基本面研究，把判断建立在业务证据和可验证假设上",
  field_research: "选择了一线验证，用真实反馈校准案头假设",
  communication: "选择了沟通表达，把框架翻译给更多人检验",
  risk_management: "选择了风险管理，在热度最高时先写清错误边界",
  self_management: "优先照顾了生活状态和判断节奏",
  collaboration: "选择了团队协作，让判断经过交叉验证",
  committee_process: "站上投委会讲台，接受概率、赔率和反例的追问",
  quantitative_research: "选择了数据研究，用结构和回测约束直觉",
  market_chasing: "跳过验证追逐了市场热度，把方向判断交给了情绪",
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
  const method = decisionMethod(decision);
  const quality = decisionQuality(decision);
  const qualityText = quality === "sound"
    ? "方法执行完整。"
    : quality === "reckless"
      ? "这次选择跳过了关键验证。"
      : "方法有价值，但证据链仍有缺口。";
  return {
    title: `${story.speaker}对你的选择做出了评价`,
    dialogue: `${story.speaker}看了看你的选择：${METHOD_TEXT[method]}。${qualityText}${FOCUS_TEXT[focus.id] || ""}`,
    detail: decision.backgroundNote || "",
  };
}

type CoreResearchScores = Pick<
  DecisionScore,
  "evidenceScore" | "clarityScore" | "riskAwarenessScore"
>;

function methodIs(decision: ResearchDecision, ...candidates: DecisionMethod[]): boolean {
  return candidates.includes(decisionMethod(decision));
}

function coreResearchScores(
  decision: ResearchDecision,
  story: StoryArc,
  focus: FocusAction,
): CoreResearchScores {
  let evidenceScore = decision.evidenceLevel;
  let clarityScore = decision.clarityLevel;
  let riskAwarenessScore = decision.riskAwareness;

  if (focus.id === "deep_research") {
    evidenceScore = Math.min(20, evidenceScore + 2);
    clarityScore = Math.min(20, clarityScore + 1);
  }
  if (focus.id === "team_collab") {
    clarityScore = Math.min(20, clarityScore + 2);
  }
  if (story.characterId === "zhou_mingzhao") {
    riskAwarenessScore = Math.min(20, riskAwarenessScore + 2);
  }

  const reflectionBonus = Math.floor(decision.reflectionValue / 5);
  const qualityPenalty = decisionQuality(decision) === "reckless" ? 2 : 0;
  return {
    evidenceScore: Math.max(0, Math.min(20, evidenceScore + reflectionBonus - qualityPenalty)),
    clarityScore: Math.max(0, Math.min(20, clarityScore + reflectionBonus - qualityPenalty)),
    riskAwarenessScore: Math.max(0, Math.min(20, riskAwarenessScore + reflectionBonus - qualityPenalty)),
  };
}

function applyCharacterSynergy(
  scores: CoreResearchScores,
  decision: ResearchDecision,
  story: StoryArc,
): CoreResearchScores {
  const next = { ...scores };
  if (
    story.characterId === "lin_ruoning"
    && methodIs(decision, "fundamental_research", "field_research")
  ) {
    next.evidenceScore = Math.min(20, next.evidenceScore + 1);
    next.clarityScore = Math.min(20, next.clarityScore + 1);
  }
  if (
    story.characterId === "chen_xinghe"
    && methodIs(decision, "quantitative_research", "field_research")
  ) {
    next.evidenceScore = Math.min(20, next.evidenceScore + 1);
    next.riskAwarenessScore = Math.min(20, next.riskAwarenessScore + 1);
  }
  if (
    story.characterId === "zhou_mingzhao"
    && methodIs(decision, "risk_management", "committee_process")
  ) {
    next.riskAwarenessScore = Math.min(20, next.riskAwarenessScore + 2);
  }
  return next;
}

function communicationScore(
  decision: ResearchDecision,
  story: StoryArc,
  focus: FocusAction,
): number {
  const methodScores: Partial<Record<DecisionMethod, number>> = {
    communication: 18,
    committee_process: 17,
    field_research: 14,
    market_chasing: 6,
  };
  let score = methodScores[decisionMethod(decision)] ?? 10;
  if (score === 10 && focus.id === "team_collab") score = 15;
  if (
    story.characterId === "chen_xinghe"
    && methodIs(decision, "quantitative_research", "communication")
  ) {
    score = Math.min(20, score + 2);
  }
  return score;
}

function lifeBalanceScore(decision: ResearchDecision, focus: FocusAction): number {
  const method = decisionMethod(decision);
  let score = 8;
  if (method === "self_management") score = 14;
  else if (focus.id === "self_care") score = 12;
  else if (method === "fundamental_research" && focus.id === "deep_research") score = 3;
  else if (method === "collaboration") score = 10;
  if (decision.reflectionValue >= 10) score = Math.min(15, score + 2);
  return score;
}

function portfolioScore(decision: ResearchDecision): number {
  const method = decisionMethod(decision);
  if (decisionQuality(decision) === "reckless") return 0;
  if (method === "fundamental_research") {
    return decision.effects.portfolioNav > 0.01 ? 5 : 4;
  }
  const methodScores: Partial<Record<DecisionMethod, number>> = {
    quantitative_research: 4,
    risk_management: 3,
    self_management: 2,
  };
  return methodScores[method] ?? 3;
}

function gradeFor(total: number): string {
  if (total >= 90) return "S";
  if (total >= 75) return "A";
  if (total >= 60) return "B";
  if (total >= 40) return "C";
  return "D";
}

export function scoreDecision(
  decision: ResearchDecision,
  story: StoryArc,
  focus: FocusAction,
): DecisionScore {
  const researchScores = applyCharacterSynergy(
    coreResearchScores(decision, story, focus),
    decision,
    story,
  );
  const communication = communicationScore(decision, story, focus);
  const lifeBalance = lifeBalanceScore(decision, focus);
  const portfolio = portfolioScore(decision);
  const quality = decisionQuality(decision);
  const alignment = decisionOutcomeAlignment(decision);
  const qualityBonus = quality === "sound" ? 6 : quality === "mixed" ? 2 : -8;
  const outcomeScore = alignment === "supports" ? 4 : alignment === "mixed" ? 1 : 0;
  const total = clamp(
    researchScores.evidenceScore
      + researchScores.clarityScore
      + researchScores.riskAwarenessScore
      + communication
      + lifeBalance
      + portfolio
      + qualityBonus
      + outcomeScore,
  );
  const reasoningScore = Math.min(
    25,
    Math.round(
      ((researchScores.evidenceScore
        + researchScores.clarityScore
        + researchScores.riskAwarenessScore) / 3) * 1.25,
    ),
  );

  return {
    ...researchScores,
    communicationScore: communication,
    lifeBalanceScore: lifeBalance,
    portfolioScore: portfolio,
    qualityBonus,
    outcomeScore,
    reasoningScore,
    total,
    grade: gradeFor(total),
  };
}

export function gradeReviewText(characterId: CharacterId, grade: string): string {
  const reviews = GRADE_REVIEWS[characterId as MentorId]?.[grade];
  if (!reviews || reviews.length === 0) return "";
  const seed = Array.from(grade).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return reviews[seed % reviews.length];
}

export function selectFocus(state: GameState, focusId: string): GameState {
  if (state.locked || state.finished) return state;
  return { ...state, focusId };
}

type NextMetrics = Pick<
  GameState,
  | "researchCredibility"
  | "committeeAdoption"
  | "portfolioNav"
  | "viewAccuracy"
  | "clientFeedback"
  | "teamTrust"
  | "fatigue"
  | "lifeBalance"
> & { rawPortfolioNav: number };

function nextMetrics(
  state: GameState,
  decision: ResearchDecision,
  focus: FocusAction,
): NextMetrics {
  const effects = decision.effects;
  const rawPortfolioNav = Math.max(0.001, state.portfolioNav * (1 + effects.portfolioNav));
  return {
    researchCredibility: clamp(
      state.researchCredibility +
        effects.researchCredibility +
        focus.researchCredibilityBonus,
    ),
    committeeAdoption: clamp(state.committeeAdoption + effects.committeeAdoption),
    portfolioNav: Math.round(rawPortfolioNav * 10000) / 10000,
    rawPortfolioNav,
    viewAccuracy: clamp(state.viewAccuracy + effects.viewAccuracy),
    clientFeedback: clamp(state.clientFeedback + effects.clientFeedback),
    teamTrust: clamp(state.teamTrust + effects.teamTrust + focus.teamTrustBonus),
    fatigue: clamp(state.fatigue + effects.fatigue + focus.fatigueDelta),
    lifeBalance: clamp(state.lifeBalance + effects.lifeBalance + focus.lifeBalanceDelta),
  };
}

function nextRelations(
  state: GameState,
  decision: ResearchDecision,
  story: StoryArc,
  focus: FocusAction,
): Record<CharacterId, number> {
  const relations = { ...state.relations };
  for (const relation of decision.effects.characterRelations) {
    adjustAffection(relations, relation.characterId, relation.value, `decision:${decision.id}`);
  }
  const focusTrustToArc = Math.floor(focus.teamTrustBonus / 3);
  if (focusTrustToArc !== 0) {
    adjustAffection(relations, story.characterId, focusTrustToArc, `focus:${focus.id}`);
  }
  return relations;
}

function markAffinityFlags(
  state: GameState,
  relations: Record<CharacterId, number>,
  flags: Record<string, boolean | number>,
): CharacterId | null {
  let milestone: CharacterId | null = null;
  for (const characterId of Object.keys(relations) as CharacterId[]) {
    const before = state.relations[characterId] ?? 0;
    const after = relations[characterId];
    const gate =
      CHARACTERS[characterId]?.kind === "peer" ? PEER_PARTNER_RELATION : AFFINITY_GATE;
    if (after >= gate) flags[`affinity_${characterId}`] = after;
    if (before < gate && after >= gate && milestone === null) milestone = characterId;
  }
  return milestone;
}

export function isParachutedDecision(
  decision: ResearchDecision,
  score: DecisionScore,
): boolean {
  return decisionOutcomeAlignment(decision) === "supports"
    && decisionQuality(decision) !== "sound"
    && score.reasoningScore <= 14;
}

function applyNarrativeFlags(
  flags: Record<string, boolean | number>,
  decision: ResearchDecision,
  score: DecisionScore,
  framework: CharacterId,
): void {
  if (score.grade === "S") flags[`respect_${framework}`] = true;
  if (score.grade === "D") flags[`watch_${framework}`] = true;
  if (isParachutedDecision(decision, score)) flags[`parachuted_${framework}`] = true;

  if (decisionMethod(decision) === "collaboration") {
    const primaryRelation = decision.effects.characterRelations[0]?.characterId;
    if (primaryRelation === "chen_xinghe") flags.helped_xinghe = true;
    if (primaryRelation === "zhao_chengyu") flags.helped_zhao = true;
  }
  if (decision.setsFlags) Object.assign(flags, decision.setsFlags);
}

function nextOffice(state: GameState, decision: ResearchDecision, focus: FocusAction): OfficeState {
  const addsPostIt = methodIs(decision, "fundamental_research", "collaboration");
  const addsWhiteboard = methodIs(
    decision,
    "fundamental_research",
    "quantitative_research",
    "committee_process",
  );
  const addsCoffee = focus.id === "deep_research" || decisionMethod(decision) === "fundamental_research";
  return {
    postIts: state.office.postIts + Number(addsPostIt),
    whiteboardMarkers: state.office.whiteboardMarkers + Number(addsWhiteboard),
    coffeeCups: state.office.coffeeCups + Number(addsCoffee),
    monthsElapsed: state.monthIndex + 1,
  };
}

function nextKnowledgeCards(
  state: GameState,
  card: KnowledgeCard | null,
): KnowledgeCard[] {
  if (!card) return state.knowledgeCards;
  const alreadyHas = state.knowledgeCards.some((existing) => existing.id === card.id);
  return alreadyHas ? state.knowledgeCards : [...state.knowledgeCards, card];
}

function nextCategoryCounts(
  state: GameState,
  decision: ResearchDecision,
): Partial<Record<DecisionCategory, number>> {
  return {
    ...state.categoryCounts,
    [decision.category]: (state.categoryCounts[decision.category] ?? 0) + 1,
  };
}

function nextMethodCounts(
  state: GameState,
  decision: ResearchDecision,
): Partial<Record<DecisionMethod, number>> {
  const method = decisionMethod(decision);
  return {
    ...state.methodCounts,
    [method]: (state.methodCounts[method] ?? 0) + 1,
  };
}

export function makeDecision(
  state: GameState,
  _data: GameDataYear,
  decision: ResearchDecision,
): GameState {
  if (state.locked || state.finished) return state;

  const story = storyForMonth(state.monthIndex, state.year);
  const focus = focusById(state.focusId);
  const outcome = buildOutcome(decision, story, focus);
  const metrics = nextMetrics(state, decision, focus);
  const relations = nextRelations(state, decision, story, focus);
  const flags: Record<string, boolean | number> = { ...state.flags };
  const milestone = markAffinityFlags(state, relations, flags);
  Object.assign(flags, branchFlagsForMonth(state, BRANCHES));

  const score = scoreDecision(decision, story, focus);
  const framework = frameworkOf(decision, story);
  const card: KnowledgeCard | null = pickKnowledgeCard(decision, story);
  const isParachuted = isParachutedDecision(decision, score);
  applyNarrativeFlags(flags, decision, score, framework);
  const alignment = decisionOutcomeAlignment(decision);
  const quality = decisionQuality(decision);
  const method = decisionMethod(decision);
  const businessVerdict = buildBusinessVerdict(story.theme, score, alignment, isParachuted);

  return {
    ...state,
    office: nextOffice(state, decision, focus),
    knowledgeCards: nextKnowledgeCards(state, card),
    locked: true,
    selectedId: decision.id,
    researchCredibility: metrics.researchCredibility,
    committeeAdoption: metrics.committeeAdoption,
    portfolioNav: metrics.portfolioNav,
    viewAccuracy: metrics.viewAccuracy,
    clientFeedback: metrics.clientFeedback,
    teamTrust: metrics.teamTrust,
    fatigue: metrics.fatigue,
    lifeBalance: metrics.lifeBalance,
    relations,
    flags,
    categoryCounts: nextCategoryCounts(state, decision),
    methodCounts: nextMethodCounts(state, decision),
    milestone,
    finished: state.monthIndex >= 11,
    history: [
      ...state.history,
      {
        month: `${state.year}-${String(state.monthIndex + 1).padStart(2, "0")}`,
        label: `${state.year}年${state.monthIndex + 1}月`,
        characterId: story.characterId,
        sceneTitle: story.title,
        selected: decision,
        focus,
        outcome,
        researchCredibilityAfter: metrics.researchCredibility,
        committeeAdoptionAfter: metrics.committeeAdoption,
        portfolioNavAfter: metrics.rawPortfolioNav,
        viewAccuracyAfter: metrics.viewAccuracy,
        clientFeedbackAfter: metrics.clientFeedback,
        teamTrustAfter: metrics.teamTrust,
        fatigueAfter: metrics.fatigue,
        lifeBalanceAfter: metrics.lifeBalance,
        relationsAfter: { ...relations },
        marketTheme: story.theme.title,
        marketReturn: 0,
        score,
        businessVerdict,
        method,
        quality,
        outcomeAlignment: alignment,
        framework,
        knowledgeCardId: card?.id,
        isParachuted,
      },
    ],
  };
}

export function postMortem(decision: ResearchDecision, monthLabel: string): string {
  return `${monthLabel} ${METHOD_TEXT[decisionMethod(decision)]}。${decision.backgroundNote || ""}`;
}

export function frameworkOf(decision: ResearchDecision, story: StoryArc): CharacterId {
  if (decision.framework) return decision.framework;
  const primary = decision.effects.characterRelations[0]?.characterId;
  return primary ?? story.characterId;
}

export function buildBusinessVerdict(
  theme: MarketTheme,
  score: DecisionScore,
  alignment = "mixed" as "supports" | "mixed" | "contradicts",
  isParachuted = false,
): string {
  const fallback =
    "业务事实在月末才慢慢显形。价格会吵吵闹闹，但生意自己会说话，你这次的框架，经得起回头看吗？";
  const base = theme.businessOutcome?.length ? theme.businessOutcome : fallback;

  if (isParachuted) {
    return `${base} 结果这次站在你这边，但推导链没有跟上。结论像从天花板掉下来，下一次未必还接得住。`;
  }
  if (alignment === "contradicts") {
    return `${base} 业务事实没有支持你的原判断。把错位发生在哪个假设、变量或时点写下来，比替结论找借口更有用。`;
  }
  if (alignment === "supports" && score.reasoningScore >= 18) {
    return `${base} 你的结论和业务事实方向一致，推导链也经得起复盘。`;
  }
  if (score.reasoningScore <= 8) {
    return `${base} 你的判断来得太快，中间几步没有铺开。答案会过期，方法不会。`;
  }
  return base;
}

export function bestRoute(state: GameState): CharacterId {
  const sorted = (Object.entries(state.relations) as Array<[CharacterId, number]>)
    .filter(([characterId]) => CHARACTERS[characterId]?.kind !== "peer")
    .sort((left, right) => right[1] - left[1]);
  return sorted[0]?.[0] || "lin_ruoning";
}

export function isBestPartner(state: GameState): boolean {
  return (
    (state.relations.zhao_chengyu ?? 0) >= PEER_PARTNER_RELATION &&
    state.teamTrust >= PEER_PARTNER_TRUST
  );
}

export function totalRelations(state: GameState): number {
  return Object.values(state.relations).reduce((sum, value) => sum + value, 0);
}

export function setFlag(
  state: GameState,
  key: string,
  value: boolean | number = true,
): GameState {
  return { ...state, flags: { ...state.flags, [key]: value } };
}

export function getFlag(state: GameState, key: string): boolean | number | undefined {
  return state.flags[key];
}

export function hasFlag(state: GameState, key: string): boolean {
  const value = state.flags[key];
  return value !== undefined && value !== false && value !== 0;
}
