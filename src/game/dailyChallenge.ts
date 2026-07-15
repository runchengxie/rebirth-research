import type { CommitteeCase, CommitteeScore } from "./committeeMode";

export const DAILY_RESULT_KEY = "rebirthDailyResults:v1";

export interface DailyConstraint {
  id: string;
  label: string;
  description: string;
}

export interface DailyChallenge {
  date: string;
  seed: number;
  caseData: CommitteeCase;
  constraint: DailyConstraint;
}

export interface DailyResult {
  date: string;
  caseId: string;
  caseTitle: string;
  score: CommitteeScore;
  decisionLabel: string;
  completedAt: string;
}

const CONSTRAINTS: DailyConstraint[] = [
  {
    id: "limited-time",
    label: "限时陈述",
    description: "今天的投委会只接受最关键的证据。回答时优先保留可证伪性。",
  },
  {
    id: "compliance-first",
    label: "合规优先",
    description: "信息来源受到额外审查。无法公开验证的记忆不能直接进入结论。",
  },
  {
    id: "drawdown-first",
    label: "回撤优先",
    description: "组合刚经历回撤，任何方案都必须先说明错误情景与退出条件。",
  },
  {
    id: "client-pressure",
    label: "客户追问",
    description: "客户要求一个明确方向，但漂亮表达不能替代失败样本和置信度。",
  },
  {
    id: "contrarian-room",
    label: "全场反方",
    description: "投委会默认反对你的结论。你需要证明自己愿意被新证据更新。",
  },
];

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hashText(text: string): number {
  let hash = 2166136261;
  for (const character of text) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function dailyChallengeFor(
  cases: CommitteeCase[],
  dateKey = localDateKey(),
): DailyChallenge {
  if (cases.length === 0) throw new Error("没有可用的每日挑战案例。") ;
  const seed = hashText(`rebirth-research:${dateKey}`);
  return {
    date: dateKey,
    seed,
    caseData: cases[seed % cases.length],
    constraint: CONSTRAINTS[Math.floor(seed / Math.max(1, cases.length)) % CONSTRAINTS.length],
  };
}

export function readDailyResults(storage: Storage = localStorage): DailyResult[] {
  try {
    const raw = storage.getItem(DAILY_RESULT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as DailyResult[] : [];
  } catch {
    return [];
  }
}

export function saveDailyResult(result: DailyResult, storage: Storage = localStorage): void {
  const results = readDailyResults(storage);
  const next = [result, ...results.filter((item) => item.date !== result.date)].slice(0, 90);
  storage.setItem(DAILY_RESULT_KEY, JSON.stringify(next));
}

function dayBefore(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return localDateKey(date);
}

export function currentDailyStreak(
  results: DailyResult[],
  today = localDateKey(),
): number {
  const completed = new Set(results.map((item) => item.date));
  let cursor = completed.has(today) ? today : dayBefore(today);
  let streak = 0;
  while (completed.has(cursor)) {
    streak += 1;
    cursor = dayBefore(cursor);
  }
  return streak;
}

export function dailyShareText(result: DailyResult, streak: number): string {
  return [
    `重生投研部 · 每日投委会 ${result.date}`,
    `${result.caseTitle}`,
    `评级 ${result.score.grade} · ${result.score.total}/100`,
    `连续完成 ${streak} 天`,
    "证据、反例、退出条件，一个都别省。",
  ].join("\n");
}
