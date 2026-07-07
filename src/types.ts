export type CharacterId = "rina" | "misaki" | "mei";

export interface CharacterProfile {
  id: CharacterId;
  name: string;
  role: string;
  tag: string;
  color: "pink" | "blue" | "lavender";
  intro: string;
}

export interface StockOption {
  id: string;
  tsCode: string;
  name: string;
  industry: string;
  market?: string;
  board?: string;
  activeRank: number;
  returnRank: number;
  returnRate: number;
  tradingDays: number;
  isBest?: boolean;
}

export interface GameMonth {
  month: string;
  label: string;
  marketStart: string;
  marketEnd: string;
  candidateCount: number;
  best: StockOption;
  options: StockOption[];
}

export interface GameDataYear {
  year: number;
  initialCapital: number;
  targetCapital: number;
  perfectCapital: number;
  months: GameMonth[];
}

export type GameDataMap = Record<string, GameDataYear>;

export interface StoryArc {
  characterId: CharacterId;
  title: string;
  speaker: string;
  role: string;
  mood: string;
  line: string;
  mission: string;
}

export interface DialogueNode {
  type: "line";
  characterId: CharacterId;
  speaker: string;
  role: string;
  mood: string;
  text: string;
  prompt?: string;
  pose?: string;
  bg?: string;
  bgm?: string;
}

export interface StockRoundNode {
  type: "stockRound";
  prompt: string;
  bg?: string;
  briefTitle?: string;
  briefs?: ResearchBrief[];
}

export type SceneNode = DialogueNode | StockRoundNode;

export interface ResearchBrief {
  characterId: CharacterId;
  label: string;
  text: string;
}

export interface SceneScript {
  id: string;
  monthIndex: number;
  title: string;
  defaultCharacterId: CharacterId;
  nodes: SceneNode[];
}

export interface FocusAction {
  id: string;
  label: string;
  icon: string;
  short: string;
  detail: string;
  returnBonus: number;
  reputationDelta: number;
  fatigueDelta: number;
  affectionDelta: number;
}

export interface GameState {
  year: string;
  initialCapital: number;
  capital: number;
  monthIndex: number;
  focusId: string;
  selectedId: string | null;
  sceneNodeIndex: number;
  locked: boolean;
  finished: boolean;
  reputation: number;
  fatigue: number;
  affection: Record<CharacterId, number>;
  history: RoundResult[];
}

export interface RoundOutcome {
  title: string;
  dialogue: string;
  detail: string;
  reputationDelta: number;
  fatigueDelta: number;
  affectionDelta: number;
}

export interface RoundResult {
  month: string;
  label: string;
  story: StoryArc;
  characterId: CharacterId;
  selected: StockOption;
  best: StockOption;
  focus: FocusAction;
  before: number;
  marketRate: number;
  executionRate: number;
  finalRate: number;
  after: number;
  hit: boolean;
  outcome: RoundOutcome;
  reputationAfter: number;
  fatigueAfter: number;
  affectionAfter: number;
}
