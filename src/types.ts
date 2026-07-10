export type CharacterId = "lin_ruoning" | "chen_xinghe" | "zhou_mingzhao" | "zhao_chengyu";

// 导师（可攻略/教学线）身份：排除同级友人同事赵承宇。
// 导师专属表（MENTOR_TEACHINGS / GRADE_REVIEWS 等）用这个，避免强加赵承宇进图鉴。
export type MentorId = Exclude<CharacterId, "zhao_chengyu">;

export type CharacterKind = "mentor" | "peer";

export interface CharacterProfile {
  id: CharacterId;
  name: string;
  role: string;
  tag: string;
  color: "pink" | "blue" | "lavender" | "slate";
  // mentor = 可攻略/教学线角色；peer = 同级友人同事，不进浪漫线、不进图鉴教学目录。
  kind?: CharacterKind;
  intro: string;
  methodology?: string; // 角色研究框架简述
}

export interface CharacterRelation {
  characterId: CharacterId;
  value: number; // 0-100
}

// ── Research decisions (expanded pool, not just 4 per month) ──

export type DecisionCategory =
  | "deep_research"      // 熬夜写深度研报
  | "expert_interview"   // 约专家电话会
  | "roadshow"           // 跟销售去路演
  | "risk_alert"         // 写风险提示
  | "self_care"          // 准时下班/生活优先
  | "help_colleague"     // 帮同事改模型/补数据
  | "committee_defense"  // 参加投委会答辩
  | "data_deep_dive";    // 拆成交数据/跑回测

export interface ResearchDecision {
  id: string;
  label: string;           // e.g. "连夜写《低成本推理对应用软件的影响》"
  category: DecisionCategory;
  description: string;
  effects: DecisionEffects;
  backgroundNote?: string; // market context shown after choice

  // New: what this decision demonstrates (for richer scoring)
  evidenceLevel: number;   // 0-20: how much evidence work this involves
  clarityLevel: number;    // 0-20: how well this makes hypotheses testable
  riskAwareness: number;   // 0-20: how much risk awareness this shows
  reflectionValue: number; // 0-15: how much self-reflection this enables

  // ── New narrative-system fields (all optional so legacy JSON keeps loading) ──
  // Which colleague's methodology this choice validates. The engine falls back
  // to the decision's primary relation character when omitted.
  framework?: CharacterId;
  // An in-character teaching beat surfaced after the choice (see KnowledgeCard).
  teaches?: KnowledgeCard;
  // Short, plain-language framing of the business angle this choice probes.
  businessAngle?: string;
}

// A knowledge card: a concept taught by a colleague *in their own voice*,
// archived into the player's research notebook (the glossary). This is the
// "platform" payoff — every meaningful choice leaves the player a little
// sharper, not just a little higher-scored.
export interface KnowledgeCard {
  id: string;               // stable concept id, e.g. "factor_crowding"
  concept: string;          // human label, e.g. "因子拥挤度"
  mentorId: CharacterId;    // who taught it
  mentorLine: string;       // the line they say, in their voice
  cfaRef?: string;          // optional CFA-style reading pointer
  tier: 1 | 2 | 3;          // surface / engaged / deep
}

// The office is the fourth character: a space that accumulates meaning across
// the twelve months through props, not exposition.
export interface OfficeState {
  postIts: number;          // sticky notes colleagues (mostly 林若宁) leave
  whiteboardMarkers: number; // framework sketches that accumulate on the board
  coffeeCups: number;       // late nights, quietly counted
  monthsElapsed: number;
}

export interface DecisionEffects {
  researchCredibility: number;   // +/- 研究可信度
  committeeAdoption: number;     // +/- 投委会采纳度
  portfolioNav: number;          // +/- 组合模拟净值变化率
  viewAccuracy: number;          // +/- 观点命中率
  clientFeedback: number;        // +/- 客户反馈
  teamTrust: number;             // +/- 团队信任
  fatigue: number;               // +/- 疲劳值
  lifeBalance: number;           // +/- 生活平衡
  characterRelations: CharacterRelation[];  // 角色关系变化
}

// ── Monthly scenario ──

// Three mutually-defensible hypotheses the three colleagues would each form
// from the same future memory. The point of CFA-style thinking is that
// reasonable analysts disagree — truth here is plural, not single.
export interface CompetingHypotheses {
  lin?: string;   // 林若宁 / 基本面视角
  chen?: string;  // 陈星禾 / 量化信号视角
  zhou?: string;  // 周明昭 / 宏观风控视角
}

export interface MarketTheme {
  id: string;
  period: string;           // e.g. "一月"
  title: string;            // e.g. "AI叙事重构"
  publicContext: string;    // 公开信息层面的事件描述（含具体历史锚点但不用真实公司名）
  protagonistMemory: string; // 男主知道的历史走向（但不直接给答案）
  gameHook: string;         // 本话引导
  historicalPrototype?: string; // 设计注释：参考了哪个历史事件（不在游戏内展示）

  // ── New narrative-system fields ──
  // The concrete business fact 顾行之 carries back (he knows *what happened*,
  // not the stock price — prices are noise; business reality is the verdict).
  knownEvent?: string;
  // Authored business-fact settlement: what the underlying business reality
  // turned out to be. NOT a market return. Deterministic, controllable, and
  // honest about plural outcomes.
  businessOutcome?: string;
  // The three competing hypotheses the colleagues would each form.
  competingHypotheses?: CompetingHypotheses;
}

export interface SceneNode {
  id: string;
  type: "dialogue" | "decision";
  characterId: CharacterId;
  speaker: string;
  role: string;
  mood: string;
  text: string;
  prompt?: string;
  pose?: string;
  bg?: string;
  bgm?: string;
  voice?: string;
  voiceCue?: "silent" | "key";
  // decision nodes
  decisions?: ResearchDecision[];
  decisionPrompt?: string;
  briefTitle?: string;
  briefs?: ResearchBrief[];
}

// Legacy alias for sfx.ts compatibility
export type DialogueNode = SceneNode;

export interface ResearchBrief {
  characterId: CharacterId;
  label: string;
  text: string;
}

// Story arc type (exported for engine.ts)
export interface StoryArc {
  characterId: CharacterId;
  title: string;
  speaker: string;
  role: string;
  mood: string;
  line: string;
  mission: string;
  theme: MarketTheme;
}

export interface MonthScene {
  id: string;
  year?: string;
  monthIndex: number;
  month: string;           // "2025-01"
  label: string;           // "2025年1月"
  theme: MarketTheme;
  nodes: SceneNode[];
}

// ── Conditional branching layer ──
//
// A `Branch` lets accumulated run state (affection, career metrics, which
// decision categories the player keeps favouring, story flags) reshape the
// month's scene — not just inject one affinity-flavoured dialogue node, but
// add genuinely different scene nodes, unlock extra decision options, and
// rewrite the decision prompt. This is the "real multi-route" layer on top of
// the affinity-gate bridge and the affection-driven endings.

// Career metrics a branch condition may read.
export type BranchMetricKey =
  | "researchCredibility"
  | "committeeAdoption"
  | "portfolioNav"
  | "viewAccuracy"
  | "clientFeedback"
  | "teamTrust"
  | "fatigue"
  | "lifeBalance";

export type BranchCondition =
  | { kind: "always" }
  | { kind: "affinity"; characterId: CharacterId; gte: number }
  | { kind: "affinityAny"; gte: number }
  | { kind: "metric"; key: BranchMetricKey; gte: number }
  | { kind: "metricAtMost"; key: BranchMetricKey; lte: number }
  | { kind: "flag"; key: string; equals?: boolean | number }
  | { kind: "categoryStreak"; category: DecisionCategory; gte: number }
  | { kind: "month"; gte: number }
  | { kind: "and"; of: BranchCondition[] }
  | { kind: "or"; of: BranchCondition[] }
  | { kind: "not"; of: BranchCondition };

// What a matched branch contributes to the month it is active in.
export interface BranchContribution {
  // Scene nodes injected just before the decision node.
  nodes?: SceneNode[];
  // Extra research decisions appended to the month's decision pool.
  decisions?: ResearchDecision[];
  // Flags written back to GameState when this branch is active for the month.
  setFlags?: Record<string, boolean | number>;
  // Overrides applied to the month's decision node (text/prompt/briefs).
  overrideDecision?: Partial<Pick<SceneNode, "text" | "prompt" | "decisionPrompt" | "briefTitle" | "briefs">>;
}

export interface Branch {
  id: string;
  label: string;            // human-readable, for debugging
  when: BranchCondition;
  contribute: BranchContribution;
  // If true, the branch fires at most once across the whole run (tracked by a
  // `seen_<id>` flag). Scene-flavour branches use this; route-unlocking
  // branches usually leave it false so the route stays live while active.
  once?: boolean;
  // Where nodes are injected relative to the decision node.
  injectAt?: "before-decision" | "after-memory";
}

// ── Game month data (market post-mortem from real data) ──

export interface MarketSnapshot {
  month: string;           // "2025-01"
  label: string;
  marketStart: string;     // "20250102"
  marketEnd: string;
  themeIndex: string;      // reference index (e.g. "000300.SH")
  themeReturn: number;     // reference index monthly return
  sectorRotation: SectorReturn[];   // top/bottom sectors this month
  styleFactorReturns: StyleFactorReturn[]; // Barra-style factor returns
  eventSummary: string;    // what actually happened (from build_data.py)
}

export interface SectorReturn {
  sector: string;          // e.g. "AI应用", "光模块", "消费电子"
  returnRate: number;      // monthly return
  rank: number;            // 1 = top performer
}

export interface StyleFactorReturn {
  factor: string;          // e.g. "size", "momentum", "value", "volatility"
  returnRate: number;      // factor premium this month
  direction: string;       // "小盘溢价" / "大盘溢价" etc.
}

export interface GameDataYear {
  year: number | string;
  currency: string;
  generatedAt: string;
  source: Record<string, string>;
  rules: Record<string, unknown>;
  benchmarks: MarketSnapshot[];
  scenes: MonthScene[];
}

export type GameDataMap = Record<string, GameDataYear>;

// ── Focus actions (daily schedule choices) ──

export interface FocusAction {
  id: string;
  label: string;
  icon: string;
  short: string;
  detail: string;
  researchCredibilityBonus: number;
  fatigueDelta: number;
  lifeBalanceDelta: number;
  teamTrustBonus: number;
}

// ── Game state ──

export interface GameState {
  year: string;
  monthIndex: number;
  focusId: string;
  selectedId: string | null;
  sceneNodeIndex: number;
  locked: boolean;
  finished: boolean;

  // Research career metrics
  researchCredibility: number;   // 0-100
  committeeAdoption: number;     // 0-100
  portfolioNav: number;          // 组合模拟净值，起点 1.000
  viewAccuracy: number;          // 0-100
  clientFeedback: number;        // 0-100
  teamTrust: number;             // 0-100
  fatigue: number;               // 0-100
  lifeBalance: number;           // 0-100

  // Character relations
  relations: Record<CharacterId, number>;

  // Branching / progression flags (affinity gates, story beats, etc.)
  flags: Record<string, boolean | number>;

  // Cumulative count of each decision category the player has chosen so far.
  // This is the primary signal that distinguishes "routes" (research-obsessed,
  // relationship-focused, self-care-balanced, ...) without hard-coding per-month
  // logic. Drives categoryStreak branch conditions.
  categoryCounts: Partial<Record<DecisionCategory, number>>;

  // Transient: the character whose affinity crossed a gate on the most recent decision
  milestone: CharacterId | null;

  history: RoundResult[];

  // ── New narrative-system state ──
  // Collected knowledge cards (the research notebook / glossary). Keyed by id
  // so re-teaching the same concept just re-affirms it.
  knowledgeCards: KnowledgeCard[];
  // The office: a space that accumulates meaning across the year.
  office: OfficeState;
}

// ── Round result ──

export interface RoundOutcome {
  title: string;
  dialogue: string;
  detail: string;
}

export interface DecisionScore {
  // New multi-dimensional scoring
  evidenceScore: number;      // 0-20  证据是否充分
  clarityScore: number;       // 0-20  假设是否清晰可验证
  riskAwarenessScore: number; // 0-20  是否识别反身性和拥挤度
  communicationScore: number;  // 0-20  晨会/路演/内部讨论表现
  lifeBalanceScore: number;   // 0-15  是否守住了生活节奏
  portfolioScore: number;     // 0-5   模拟组合表现（弱权重）
  // Reasoning quality, surfaced separately from the conclusion's correctness.
  // High reasoning + wrong business outcome still earns respect; low reasoning
  // + right outcome gets flagged as a "parachuted conclusion" (空降结论).
  reasoningScore: number;     // 0-25
  total: number;              // 0-100
  grade: string;              // S/A/B/C/D
}

export interface RoundResult {
  month: string;
  label: string;
  characterId: CharacterId;
  sceneTitle: string;
  selected: ResearchDecision;
  focus: FocusAction;
  outcome: RoundOutcome;

  // Post-decision state
  researchCredibilityAfter: number;
  committeeAdoptionAfter: number;
  portfolioNavAfter: number;
  viewAccuracyAfter: number;
  clientFeedbackAfter: number;
  teamTrustAfter: number;
  fatigueAfter: number;
  lifeBalanceAfter: number;
  relationsAfter: Record<CharacterId, number>;

  // Market post-mortem (for flavor, not scoring)
  marketTheme: string;
  marketReturn: number;

  score?: DecisionScore;

  // ── New narrative-system fields ──
  // Business-fact settlement verdict (not a stock return).
  businessVerdict?: string;
  // Which colleague's methodology this choice engaged.
  framework?: CharacterId;
  // The knowledge card taught this month (archived into the glossary).
  knowledgeCardId?: string;
  // True when the grade was earned on conclusion correctness but the reasoning
  // was thin — a "parachuted" (空降) answer the colleagues will call out.
  isParachuted?: boolean;
}
