export type CharacterId = "lin_ruoning" | "chen_xinghe" | "zhou_mingzhao";

export interface CharacterProfile {
  id: CharacterId;
  name: string;
  role: string;
  tag: string;
  color: "pink" | "blue" | "lavender";
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

export interface MarketTheme {
  id: string;
  period: string;           // e.g. "一月"
  title: string;            // e.g. "AI叙事重构"
  publicContext: string;    // 公开信息层面的事件描述（含具体历史锚点但不用真实公司名）
  protagonistMemory: string; // 男主知道的历史走向（但不直接给答案）
  gameHook: string;         // 本话引导
  historicalPrototype?: string; // 设计注释：参考了哪个历史事件（不在游戏内展示）
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
  year: number;
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
  communicationScore: number; // 0-20  晨会/路演/内部讨论表现
  lifeBalanceScore: number;   // 0-15  是否守住了生活节奏
  portfolioScore: number;     // 0-5   模拟组合表现（弱权重）
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
}
