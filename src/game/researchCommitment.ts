import type { DecisionMethod, ResearchDecision } from "../types";
import {
  decisionMethod,
  decisionOutcomeAlignment,
} from "./narrativeSemantics";

export type ConfidenceLevel = 55 | 70 | 85;
export type FalsifierId = "business" | "flow" | "risk" | "timing";
export type ReviewCheckId = "evidence" | "counterexample" | "exit";

export interface ResearchCommitment {
  confidence: ConfidenceLevel;
  falsifier: FalsifierId;
  reviewChecks: Record<ReviewCheckId, boolean>;
}

export const CONFIDENCE_OPTIONS: ReadonlyArray<{
  value: ConfidenceLevel;
  label: string;
  detail: string;
}> = [
  { value: 55, label: "保守判断", detail: "证据仍有缺口，保留较大的更新空间。" },
  { value: 70, label: "基准判断", detail: "证据足以行动，同时承认反例可能推翻结论。" },
  { value: 85, label: "高确信判断", detail: "只适合证据、反例和退出条件都已写清。" },
];

export const FALSIFIER_OPTIONS: ReadonlyArray<{
  id: FalsifierId;
  label: string;
  detail: string;
}> = [
  { id: "business", label: "业务数据失效", detail: "收入、订单、留存或现金流没有按假设兑现。" },
  { id: "flow", label: "资金信号失效", detail: "成交结构、因子暴露或资金持续性出现反转。" },
  { id: "risk", label: "风险边界失效", detail: "估值、波动或下行情景突破事先写下的边界。" },
  { id: "timing", label: "兑现时点失效", detail: "方向可能成立，但验证时间明显晚于研究窗口。" },
];

export const REVIEW_CHECK_OPTIONS: ReadonlyArray<{
  id: ReviewCheckId;
  label: string;
  detail: string;
}> = [
  { id: "evidence", label: "证据来源", detail: "我能指出至少一条可复核的数据或事实。" },
  { id: "counterexample", label: "最强反例", detail: "我写下了最可能推翻自己的解释。" },
  { id: "exit", label: "退出条件", detail: "我知道何时停止为原结论辩护。" },
];

const RECOMMENDED_FALSIFIER: Partial<Record<DecisionMethod, FalsifierId>> = {
  fundamental_research: "business",
  field_research: "business",
  quantitative_research: "flow",
  market_chasing: "flow",
  risk_management: "risk",
  committee_process: "risk",
  communication: "timing",
  collaboration: "timing",
  self_management: "timing",
};

export function createSteadyResearchCommitment(
  falsifier: FalsifierId = "business",
): ResearchCommitment {
  return {
    confidence: 70,
    falsifier,
    reviewChecks: {
      evidence: true,
      counterexample: true,
      exit: true,
    },
  };
}

export function createAssistedResearchCommitment(
  decision: ResearchDecision,
): ResearchCommitment {
  return createSteadyResearchCommitment(
    RECOMMENDED_FALSIFIER[decisionMethod(decision)] ?? "business",
  );
}

interface CommitmentContext {
  completed: number;
  fullyReviewed: boolean;
  unsupportedHighConfidence: boolean;
}

interface CommitmentDeltas {
  credibility: number;
  committee: number;
  trust: number;
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

function falsifierLabel(id: FalsifierId): string {
  return FALSIFIER_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

function commitmentContext(commitment: ResearchCommitment): CommitmentContext {
  const completed = completedReviewCount(commitment);
  return {
    completed,
    fullyReviewed: completed === 3,
    unsupportedHighConfidence: commitment.confidence === 85 && completed < 3,
  };
}

function commitmentDeltas(
  decision: ResearchDecision,
  commitment: ResearchCommitment,
  context: CommitmentContext,
): CommitmentDeltas {
  const alignment = decisionOutcomeAlignment(decision);
  let credibility = context.completed - 1;
  let committee = context.fullyReviewed ? 2 : 0;
  let trust = context.completed >= 2 ? 1 : 0;

  committee -= Number(commitment.confidence === 55);
  if (context.unsupportedHighConfidence) {
    credibility -= 4;
    committee -= 4;
    trust -= 2;
  }

  const confidentContradiction = alignment === "contradicts" && commitment.confidence === 85;
  credibility -= Number(confidentContradiction) * 3;
  trust -= Number(confidentContradiction) * 2;

  const supportedConviction = alignment === "supports"
    && commitment.confidence === 85
    && context.fullyReviewed;
  committee += Number(supportedConviction);
  return { credibility, committee, trust };
}

function commitmentNarrative(context: CommitmentContext): string {
  if (context.unsupportedHighConfidence) {
    return "证据链尚未补齐却给出高确信，团队会把这次判断当作校准样本。";
  }
  if (context.fullyReviewed) {
    return "你把支持证据、最强反例和退出条件一起交上了桌。";
  }
  return "未完成的审查项会在月度复盘中保留。";
}

function commitmentFlags(
  decision: ResearchDecision,
  commitment: ResearchCommitment,
  context: CommitmentContext,
): Record<string, boolean | number> {
  return {
    ...(decision.setsFlags ?? {}),
    [`commitment_confidence_${commitment.confidence}`]: true,
    [`commitment_falsifier_${commitment.falsifier}`]: true,
    ...(context.fullyReviewed ? { commitment_fully_reviewed: true } : {}),
    ...(context.unsupportedHighConfidence ? { commitment_overconfident: true } : {}),
  };
}

export function createDefaultResearchCommitment(): ResearchCommitment {
  return {
    confidence: 70,
    falsifier: "business",
    reviewChecks: {
      evidence: false,
      counterexample: false,
      exit: false,
    },
  };
}

export function completedReviewCount(commitment: ResearchCommitment): number {
  return Object.values(commitment.reviewChecks).filter(Boolean).length;
}

export function commitmentWarning(commitment: ResearchCommitment): string {
  const completed = completedReviewCount(commitment);
  if (commitment.confidence === 85 && completed < 3) {
    return "高确信需要完整写清证据、反例和退出条件。现在提交会被记录为过度自信。";
  }
  if (completed === 0) {
    return "你可以直接提交，但空白的审查记录会成为后续复盘的一部分。";
  }
  if (completed < 3) {
    return `投委会自检已完成 ${completed}/3，剩余缺口不会被系统替你补上。`;
  }
  return "三项自检完整。结论仍可能错，但推导链已经可以被复核。";
}

export function applyResearchCommitment(
  decision: ResearchDecision,
  commitment: ResearchCommitment,
): ResearchDecision {
  const context = commitmentContext(commitment);
  const deltas = commitmentDeltas(decision, commitment, context);
  const method = decisionMethod(decision);
  const falsifierMatches = RECOMMENDED_FALSIFIER[method] === commitment.falsifier;
  const note = [
    decision.backgroundNote,
    `提交前承诺：置信度 ${commitment.confidence}%。失效条件为${falsifierLabel(commitment.falsifier)}。投委会自检 ${context.completed}/3。`,
    commitmentNarrative(context),
  ].filter(Boolean).join(" ");

  return {
    ...decision,
    clarityLevel: clamp(decision.clarityLevel + context.completed + Number(falsifierMatches), 20),
    riskAwareness: clamp(decision.riskAwareness + context.completed + Number(falsifierMatches), 20),
    reflectionValue: clamp(decision.reflectionValue + context.completed, 15),
    effects: {
      ...decision.effects,
      researchCredibility: decision.effects.researchCredibility + deltas.credibility,
      committeeAdoption: decision.effects.committeeAdoption + deltas.committee,
      teamTrust: decision.effects.teamTrust + deltas.trust,
    },
    backgroundNote: note,
    setsFlags: commitmentFlags(decision, commitment, context),
  };
}
