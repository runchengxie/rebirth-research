import type { MarketTheme, ResearchDecision } from "../types";
import {
  completedReviewCount,
  type ResearchCommitment,
} from "./researchCommitment";
import { decisionMethod, decisionQuality } from "./narrativeSemantics";

export type ExaminerId = "pm" | "fundamental" | "quant" | "risk" | "compliance";
export type CommitteeDimension = "evidence" | "clarity" | "risk" | "communication" | "integrity";

export interface CommitteeExaminer {
  id: ExaminerId;
  name: string;
  role: string;
  initials: string;
  scene: "committee-room" | "data-wall" | "risk-review" | "compliance-desk";
}

export interface CommitteeResponse {
  id: string;
  label: string;
  detail: string;
  effects: Partial<Record<CommitteeDimension, number>>;
  flag?: "transparent" | "evasive" | "overconfident" | "adaptive";
}

export interface CommitteeRound {
  id: string;
  examiner: CommitteeExaminer;
  question: string;
  context: string;
  responses: CommitteeResponse[];
}

export interface CommitteeCase {
  id: string;
  title: string;
  context: string;
  futureMemory: string;
  hypotheses: {
    fundamental: string;
    quantitative: string;
    risk: string;
  };
  outcome: string;
  decisions: ResearchDecision[];
  sourceLabel: string;
}

export interface CommitteeScore {
  evidence: number;
  clarity: number;
  risk: number;
  communication: number;
  integrity: number;
  calibration: number;
  total: number;
  grade: "S" | "A" | "B" | "C" | "D";
  verdict: string;
  flags: string[];
}

export const COMMITTEE_EXAMINERS: Record<ExaminerId, CommitteeExaminer> = {
  pm: {
    id: "pm",
    name: "沈砚川",
    role: "基金经理",
    initials: "沈",
    scene: "committee-room",
  },
  fundamental: {
    id: "fundamental",
    name: "林若宁",
    role: "基本面研究员",
    initials: "林",
    scene: "committee-room",
  },
  quant: {
    id: "quant",
    name: "陈星禾",
    role: "量化与资金信号",
    initials: "陈",
    scene: "data-wall",
  },
  risk: {
    id: "risk",
    name: "周明昭",
    role: "宏观与风险负责人",
    initials: "周",
    scene: "risk-review",
  },
  compliance: {
    id: "compliance",
    name: "许闻舟",
    role: "合规负责人",
    initials: "许",
    scene: "compliance-desk",
  },
};

function responsesFor(examiner: ExaminerId): CommitteeResponse[] {
  if (examiner === "fundamental") {
    return [
      {
        id: "evidence-chain",
        label: "把收入、利润和现金流的验证顺序摊开",
        detail: "明确每一步证据、时间点和可能被推翻的位置。",
        effects: { evidence: 5, clarity: 4, integrity: 2 },
        flag: "transparent",
      },
      {
        id: "future-answer",
        label: "强调自己对最终方向很有把握",
        detail: "结论听起来坚定，但无法补齐当下证据。",
        effects: { communication: 2, evidence: -4, integrity: -3 },
        flag: "overconfident",
      },
      {
        id: "ask-time",
        label: "承认缺口并申请补一次一线验证",
        detail: "牺牲速度，换取可复核的一手证据。",
        effects: { evidence: 3, integrity: 4, communication: -1 },
        flag: "adaptive",
      },
    ];
  }
  if (examiner === "quant") {
    return [
      {
        id: "show-failures",
        label: "同时展示有效区间和失败样本",
        detail: "让模型边界和样本污染一起进入讨论。",
        effects: { evidence: 4, risk: 3, integrity: 5 },
        flag: "transparent",
      },
      {
        id: "best-window",
        label: "只展示表现最好的回测窗口",
        detail: "曲线更漂亮，归因与稳健性被藏在附件里。",
        effects: { communication: 3, integrity: -5, risk: -3 },
        flag: "evasive",
      },
      {
        id: "orthogonalize",
        label: "先拆掉动量暴露，再讨论净信号",
        detail: "降低叙事冲击，换取更干净的归因。",
        effects: { evidence: 3, clarity: 4, communication: -1 },
        flag: "adaptive",
      },
    ];
  }
  if (examiner === "risk") {
    return [
      {
        id: "downside-map",
        label: "给出下行情景、退出条件和最大容忍偏差",
        detail: "先说明错了怎么办，再讨论对了能获得什么。",
        effects: { risk: 6, clarity: 2, integrity: 2 },
        flag: "transparent",
      },
      {
        id: "direction-only",
        label: "坚持方向正确，波动只是噪声",
        detail: "把时间和估值风险都交给一句长期看好。",
        effects: { communication: 2, risk: -5, integrity: -2 },
        flag: "overconfident",
      },
      {
        id: "stage-position",
        label: "改成分阶段验证和观察仓",
        detail: "承认时点不确定，用可逆行动保留更新空间。",
        effects: { risk: 4, integrity: 4, communication: 1 },
        flag: "adaptive",
      },
    ];
  }
  if (examiner === "compliance") {
    return [
      {
        id: "source-boundary",
        label: "逐项标明公开来源、推断和无法披露的记忆",
        detail: "把事实、推断和直觉分层，不用神秘确定性包装观点。",
        effects: { integrity: 6, clarity: 3 },
        flag: "transparent",
      },
      {
        id: "authority",
        label: "用个人判断和过往命中率替代来源说明",
        detail: "权威感短期有效，信息边界依然空白。",
        effects: { communication: 3, integrity: -6 },
        flag: "evasive",
      },
      {
        id: "narrow-claim",
        label: "收窄结论，只提交能够公开验证的部分",
        detail: "降低结论力度，保住合规边界和可复核性。",
        effects: { integrity: 5, evidence: 2, communication: -1 },
        flag: "adaptive",
      },
    ];
  }
  return [
    {
      id: "probability",
      label: "给出概率、赔率和资源需求",
      detail: "把观点翻译成可以被组合管理的行动方案。",
      effects: { clarity: 4, communication: 5, risk: 2 },
      flag: "transparent",
    },
    {
      id: "strong-story",
      label: "给出一个没有条件句的强叙事",
      detail: "更容易被记住，也更容易在变量变化后失控。",
      effects: { communication: 4, clarity: -2, risk: -3 },
      flag: "overconfident",
    },
    {
      id: "defer",
      label: "请求延后表决，先补最关键的未知变量",
      detail: "放弃当期窗口，换取更高的信息质量。",
      effects: { evidence: 3, integrity: 3, communication: -2 },
      flag: "adaptive",
    },
  ];
}

export function buildCommitteeRounds(caseData: CommitteeCase): CommitteeRound[] {
  return [
    {
      id: "mandate",
      examiner: COMMITTEE_EXAMINERS.pm,
      question: "这项判断为什么值得占用组合风险预算？",
      context: caseData.context,
      responses: responsesFor("pm"),
    },
    {
      id: "evidence",
      examiner: COMMITTEE_EXAMINERS.fundamental,
      question: "哪条证据最可能推翻你的核心假设？",
      context: caseData.hypotheses.fundamental,
      responses: responsesFor("fundamental"),
    },
    {
      id: "model",
      examiner: COMMITTEE_EXAMINERS.quant,
      question: "收益里有多少来自方法，多少只是样本和动量？",
      context: caseData.hypotheses.quantitative,
      responses: responsesFor("quant"),
    },
    {
      id: "downside",
      examiner: COMMITTEE_EXAMINERS.risk,
      question: "判断错了以后，组合和团队会付出什么代价？",
      context: caseData.hypotheses.risk,
      responses: responsesFor("risk"),
    },
    {
      id: "source",
      examiner: COMMITTEE_EXAMINERS.compliance,
      question: "你的事实、推断和未来记忆边界分别在哪里？",
      context: caseData.futureMemory,
      responses: responsesFor("compliance"),
    },
  ];
}

function clamp(value: number, max = 20): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

function gradeFor(total: number): CommitteeScore["grade"] {
  if (total >= 90) return "S";
  if (total >= 76) return "A";
  if (total >= 62) return "B";
  if (total >= 46) return "C";
  return "D";
}

function calibrationScore(
  decision: ResearchDecision,
  commitment: ResearchCommitment,
): number {
  const reviewed = completedReviewCount(commitment);
  const quality = decisionQuality(decision);
  let score = 12 + reviewed * 2;
  if (commitment.confidence === 85 && quality === "reckless") score -= 9;
  if (commitment.confidence === 85 && reviewed < 3) score -= 5;
  if (commitment.confidence === 55 && quality === "sound") score -= 2;
  if (commitment.confidence === 70) score += 2;
  return clamp(score);
}

function verdictFor(grade: CommitteeScore["grade"], integrity: number): string {
  if (integrity <= 6) return "暂缓：表达比证据更完整，先补齐来源和失败样本。";
  if (grade === "S") return "通过：允许进入观察仓，并按失效条件逐步增加风险预算。";
  if (grade === "A") return "有条件通过：保留观察仓，补完一个关键验证后复议。";
  if (grade === "B") return "暂缓表决：框架可用，证据和边界仍需补强。";
  return "退回研究：当前陈述无法承担组合层面的后果。";
}

export function evaluateCommittee(
  decision: ResearchDecision,
  commitment: ResearchCommitment,
  rounds: CommitteeRound[],
  selectedResponseIds: string[],
): CommitteeScore {
  const dimensions: Record<CommitteeDimension, number> = {
    evidence: clamp(decision.evidenceLevel),
    clarity: clamp(decision.clarityLevel),
    risk: clamp(decision.riskAwareness),
    communication: decisionMethod(decision) === "communication" ? 13 : 9,
    integrity: decisionQuality(decision) === "reckless" ? 5 : 11,
  };
  const flags: string[] = [];

  rounds.forEach((round, index) => {
    const selected = round.responses.find((item) => item.id === selectedResponseIds[index]);
    if (!selected) return;
    for (const dimension of Object.keys(selected.effects) as CommitteeDimension[]) {
      dimensions[dimension] = clamp(dimensions[dimension] + (selected.effects[dimension] ?? 0));
    }
    if (selected.flag) flags.push(selected.flag);
  });

  const calibration = calibrationScore(decision, commitment);
  const total = clamp(
    dimensions.evidence
      + dimensions.clarity
      + dimensions.risk
      + dimensions.communication
      + dimensions.integrity
      + calibration,
    100,
  );
  const grade = gradeFor(total);
  return {
    ...dimensions,
    calibration,
    total,
    grade,
    verdict: verdictFor(grade, dimensions.integrity),
    flags,
  };
}

export function builtInCaseFromTheme(
  theme: MarketTheme,
  decisions: ResearchDecision[],
  sourceLabel: string,
): CommitteeCase {
  return {
    id: theme.id,
    title: theme.title,
    context: theme.publicContext,
    futureMemory: theme.protagonistMemory,
    hypotheses: {
      fundamental: theme.competingHypotheses?.lin ?? "从业务证据和兑现节奏验证假设。",
      quantitative: theme.competingHypotheses?.chen ?? "从量价、归因和拥挤度验证信号。",
      risk: theme.competingHypotheses?.zhou ?? "从估值、情景和退出条件验证边界。",
    },
    outcome: theme.businessOutcome ?? "业务事实仍需要后续验证。",
    decisions,
    sourceLabel,
  };
}
