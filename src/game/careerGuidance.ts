import type { DecisionMethod, ResearchDecision, RoundResult } from "../types";
import { decisionMethod } from "./narrativeSemantics";

export interface MonthlyCareerGuidance {
  goal: string;
  risk: string;
  question: string;
}

export interface DecisionPresentation {
  method: DecisionMethod;
  methodLabel: string;
  icon: string;
  tone: string;
  claim: string;
  wager: string;
  tradeoff: string;
  recommendedFocusId: "deep_research" | "team_collab" | "self_care";
  recommendedFocusLabel: string;
}

export interface GlossaryTerm {
  id: string;
  label: string;
  aliases: string[];
  explanation: string;
  relevance: string;
}

export interface CareerRecap {
  strength: string;
  risk: string;
  consequence: string;
}

const GUIDANCE_2025: MonthlyCareerGuidance[] = [
  {
    goal: "把未来记忆翻译成可以复核的证据",
    risk: "记得结果，却跳过当时能够获得的证明",
    question: "这条结论中间还缺哪一个可验证变量？",
  },
  {
    goal: "区分需求热度与真实付费意愿",
    risk: "把试用、关注和收入增长当成同一件事",
    question: "客户愿意为什么持续付费？",
  },
  {
    goal: "检查增长能否穿过成本与竞争",
    risk: "只看到调用量，没有追问利润如何分配",
    question: "规模扩大后，谁真正留下利润？",
  },
  {
    goal: "验证一季报增长的质量",
    risk: "用一次高增长公告替代交叉验证",
    question: "收入、毛利和留存是否同时改善？",
  },
  {
    goal: "识别政策与供应链冲击的传导路径",
    risk: "把主题标签直接等同于整条产业链受益",
    question: "冲击首先落在哪个环节？",
  },
  {
    goal: "在行动窗口与证据完整度之间取舍",
    risk: "为了赶时间，把不确定性藏进结论",
    question: "现在行动需要接受哪一块证据缺口？",
  },
  {
    goal: "拆开产业链不同环节的兑现速度",
    risk: "用一个仓位表达三种不同的商业周期",
    question: "上游、平台和应用应该共享同一判断吗？",
  },
  {
    goal: "让中报数据校准原有假设",
    risk: "只保留支持自己的样本",
    question: "哪条新数据最可能推翻原判断？",
  },
  {
    goal: "重新检验规则变化后的模型边界",
    risk: "沿用已经失真的交易成本和止损线",
    question: "规则改变后，旧信号还代表同一件事吗？",
  },
  {
    goal: "在回撤中区分噪声与框架失效",
    risk: "用继续坚持掩盖没有写清退出条件",
    question: "什么信号出现时必须停止辩护？",
  },
  {
    goal: "把年度观点整理成可沟通的研究框架",
    risk: "为了表达完整，抹平仍然存在的分歧",
    question: "哪些结论可以承诺，哪些仍需保留？",
  },
  {
    goal: "从全年错误中提炼可持续的方法",
    risk: "只统计命中次数，忽略身体与机会成本",
    question: "明年应该保留哪条纪律，而非哪条答案？",
  },
];

const FALLBACK_GUIDANCE: MonthlyCareerGuidance = {
  goal: "把当前判断整理成可以验证的研究假设",
  risk: "让结论跑在证据和退出条件前面",
  question: "什么事实会让你更新现在的判断？",
};

const FOCUS_LABELS = {
  deep_research: "深度研报",
  team_collab: "团队协作",
  self_care: "生活优先",
} as const;

const METHOD_PRESENTATIONS: Record<
  DecisionMethod,
  Omit<DecisionPresentation, "method" | "tradeoff" | "recommendedFocusLabel">
> = {
  fundamental_research: {
    methodLabel: "基本面验证",
    icon: "▤",
    tone: "fundamental",
    claim: "先用业务兑现约束方向判断",
    wager: "订单、收入、利润与留存能够相互印证",
    recommendedFocusId: "deep_research",
  },
  field_research: {
    methodLabel: "一线验证",
    icon: "◇",
    tone: "field",
    claim: "让真实客户与产业反馈校准案头假设",
    wager: "一线样本能暴露公开材料没有写出的差异",
    recommendedFocusId: "team_collab",
  },
  communication: {
    methodLabel: "沟通表达",
    icon: "◌",
    tone: "communication",
    claim: "把研究框架尽快交给更多人检验",
    wager: "清晰表达能够换来更及时的反馈与行动",
    recommendedFocusId: "team_collab",
  },
  risk_management: {
    methodLabel: "风险管理",
    icon: "△",
    tone: "risk",
    claim: "先写清错误边界，再决定承担多少风险",
    wager: "控制损失比追求完整方向判断更重要",
    recommendedFocusId: "self_care",
  },
  self_management: {
    methodLabel: "状态管理",
    icon: "○",
    tone: "self",
    claim: "保护判断状态，避免让透支替你做决定",
    wager: "稳定节奏能提高后续研究质量",
    recommendedFocusId: "self_care",
  },
  collaboration: {
    methodLabel: "团队校准",
    icon: "◎",
    tone: "collaboration",
    claim: "让不同方法共同检查同一个结论",
    wager: "交叉验证能够减少单一框架的盲区",
    recommendedFocusId: "team_collab",
  },
  committee_process: {
    methodLabel: "投委会审查",
    icon: "□",
    tone: "committee",
    claim: "用公开追问检验概率、赔率和反例",
    wager: "把承诺写清后，研究更容易被复核",
    recommendedFocusId: "team_collab",
  },
  quantitative_research: {
    methodLabel: "量化验证",
    icon: "⌁",
    tone: "quantitative",
    claim: "用完整样本和交易结构约束直觉",
    wager: "信号在成本与拥挤调整后仍然成立",
    recommendedFocusId: "deep_research",
  },
  market_chasing: {
    methodLabel: "追逐热度",
    icon: "↗",
    tone: "chasing",
    claim: "先跟随市场方向，再补充验证",
    wager: "短期趋势会持续到足以退出的位置",
    recommendedFocusId: "deep_research",
  },
};

export const CAREER_GLOSSARY: GlossaryTerm[] = [
  {
    id: "arr",
    label: "ARR",
    aliases: ["年度经常性收入"],
    explanation:
      "把当前订阅收入按一年折算，用于观察经常性业务规模，不等同于现金或利润。",
    relevance: "用它判断客户是否真的持续付费，而非只在试用或围观。",
  },
  {
    id: "barra",
    label: "Barra 归因",
    aliases: ["Barra", "因子归因"],
    explanation:
      "把组合收益拆成市场、行业、风格因子和个股贡献，检查收益究竟来自哪里。",
    relevance: "用它区分上涨来自公司经营，还是来自市场风格和追涨。",
  },
  {
    id: "momentum-factor",
    label: "动量因子",
    aliases: ["价格动量"],
    explanation:
      "描述近期上涨的资产往往继续上涨、近期下跌的资产往往继续下跌的市场现象。",
    relevance: "它说明眼下的上涨可能主要由追涨推动，业绩尚未完成验证。",
  },
  {
    id: "fundamental-factor",
    label: "基本面因子",
    aliases: [],
    explanation: "用收入、利润、估值或质量等经营数据解释资产表现的因子。",
    relevance: "它帮助判断价格变化是否已经得到真实业务数据支持。",
  },
  {
    id: "order-book",
    label: "订单簿",
    aliases: [],
    explanation:
      "市场中尚未成交的买卖报价集合，可以观察不同价格上的承接与抛售意愿。",
    relevance: "它帮助判断价格背后的买卖力量是否稳定，而非只看最后成交价。",
  },
  {
    id: "market-depth",
    label: "盘口厚度",
    aliases: ["市场深度"],
    explanation:
      "不同价位上可成交的挂单数量；越薄，少量交易越容易造成明显价格波动。",
    relevance: "盘口变薄意味着买盘虽然还在，交易却更容易突然反转。",
  },
  {
    id: "alpha-decay",
    label: "Alpha 衰减",
    aliases: ["alpha衰减", "Alpha衰减"],
    explanation:
      "一个信号被更多人使用或市场结构改变后，能够提供的超额收益逐渐减弱。",
    relevance: "它提醒你，曾经有效的交易信号可能正在快速失效。",
  },
  {
    id: "factor-crowding",
    label: "因子拥挤度",
    aliases: ["因子拥挤", "拥挤度"],
    explanation:
      "很多资金同时持有相似暴露时，退出容易互相踩踏，历史收益也更难延续。",
    relevance: "方向越热门，集体撤退时的价格冲击通常越大。",
  },
  {
    id: "order-flow",
    label: "订单流",
    aliases: ["大单流向", "大单净买", "成交结构"],
    explanation: "观察买卖指令如何进入市场，用来判断价格变化背后的资金持续性。",
    relevance: "用它判断买盘是否还在持续，而非只看价格已经涨了多少。",
  },
  {
    id: "risk-appetite",
    label: "风险偏好",
    aliases: [],
    explanation: "市场参与者愿意承担不确定性、持有高波动资产的程度。",
    relevance: "即使消息利好，风险偏好下降也可能中断上涨。",
  },
  {
    id: "margin-of-safety",
    label: "安全边际",
    aliases: [],
    explanation: "判断价值与当前价格之间预留的缓冲，用来降低假设出错时的损失。",
    relevance: "它迫使你检查好消息是否已经被价格提前反映。",
  },
  {
    id: "liquidity",
    label: "流动性",
    aliases: [],
    explanation: "资产能否在不明显影响价格的情况下被快速买入或卖出。",
    relevance: "流动性收紧时，再合理的判断也可能被交易压力打断。",
  },
  {
    id: "reflexivity",
    label: "反身性",
    aliases: [],
    explanation:
      "市场参与者的判断会改变价格和行为，而这些变化又反过来影响原来的判断。",
    relevance: "它帮助区分假设本身出错，还是市场反馈已经改变了结果。",
  },
  {
    id: "valuation-percentile",
    label: "估值分位",
    aliases: ["估值分位数"],
    explanation:
      "当前估值在自身历史区间中的位置，只描述相对高低，不自动代表便宜或昂贵。",
    relevance: "用它检查市场已经为同一份好消息支付了多高的价格。",
  },
  {
    id: "dcf",
    label: "DCF",
    aliases: ["现金流折现", "折现现金流"],
    explanation:
      "把未来现金流折算到今天，用增长、利润、风险和折现率共同估计价值。",
    relevance: "它把对未来的想象拆成可以逐项检查的增长、利润和风险假设。",
  },
  {
    id: "unit-economics",
    label: "单位经济性",
    aliases: ["单位经济模型"],
    explanation:
      "检查每增加一个客户或一次使用带来的收入，能否覆盖对应成本与获客投入。",
    relevance: "用它判断业务规模扩大后是否真的能留下利润。",
  },
  {
    id: "sensitivity-analysis",
    label: "敏感性分析",
    aliases: ["敏感性表"],
    explanation: "改变关键假设并观察结果变化，用来识别结论最依赖哪个变量。",
    relevance: "它告诉你哪个变量一旦偏离预期，整套判断最容易失效。",
  },
];

export function monthlyCareerGuidance(
  year: string,
  monthIndex: number,
): MonthlyCareerGuidance {
  if (year !== "2025") return FALLBACK_GUIDANCE;
  return GUIDANCE_2025[monthIndex] ?? FALLBACK_GUIDANCE;
}

function tradeoffFor(
  decision: ResearchDecision,
  method: DecisionMethod,
): string {
  if (method === "market_chasing")
    return "验证不足，一旦趋势反转就缺少可靠的退出依据";
  if (method === "risk_management")
    return "可能错过短期行动窗口，谨慎本身也有机会成本";
  if (method === "self_management")
    return "本月研究推进较慢，需要接受暂时没有完整答案";
  if (decision.effects.fatigue >= 8 || decision.effects.lifeBalance <= -6) {
    return "需要额外投入，疲劳与生活节奏会承受明显压力";
  }
  if (method === "communication" || method === "committee_process") {
    return "公开表达提高行动速度，也会减少以后含糊调整的空间";
  }
  if (method === "field_research")
    return "调研需要时间，而且有限样本仍可能带来偏差";
  if (method === "collaboration")
    return "形成共识需要协调时间，独立研究深度可能受限";
  if (method === "quantitative_research")
    return "样本、成本和拥挤变化都可能让信号快速失效";
  return "等待业务数据提高了可信度，也可能错过短期价格窗口";
}

export function decisionPresentation(
  decision: ResearchDecision,
): DecisionPresentation {
  const method = decisionMethod(decision);
  const base = METHOD_PRESENTATIONS[method];
  return {
    ...base,
    method,
    tradeoff: tradeoffFor(decision, method),
    recommendedFocusLabel: FOCUS_LABELS[base.recommendedFocusId],
  };
}

export function glossaryTermsIn(
  ...texts: Array<string | undefined>
): GlossaryTerm[] {
  const source = texts.filter(Boolean).join("\n").toLocaleLowerCase("zh-CN");
  if (!source) return [];

  const matches: Array<{ index: number; term: GlossaryTerm }> = [];
  for (const term of CAREER_GLOSSARY) {
    const positions = [term.label, ...term.aliases]
      .map((alias) => source.indexOf(alias.toLocaleLowerCase("zh-CN")))
      .filter((index) => index >= 0);
    if (positions.length > 0) {
      matches.push({ index: Math.min(...positions), term });
    }
  }
  return matches
    .sort((left, right) => left.index - right.index)
    .map((match) => match.term);
}

function strongestDimension(result: RoundResult): string {
  const score = result.score;
  if (!score) return "你已经把一个明确立场交给后续事实检验。";
  const dimensions = [
    {
      value: score.evidenceScore,
      text: "证据工作最完整，结论有可以复核的事实支点。",
    },
    {
      value: score.clarityScore,
      text: "假设表达清楚，后续可以判断它究竟在哪一步失效。",
    },
    {
      value: score.riskAwarenessScore,
      text: "风险边界写得清楚，没有把不确定性藏在结果里。",
    },
    {
      value: score.communicationScore,
      text: "沟通结构清楚，团队能够理解并继续检验你的判断。",
    },
    {
      value: score.lifeBalanceScore,
      text: "你保护了判断状态，没有把透支包装成研究能力。",
    },
  ];
  return dimensions.sort((left, right) => right.value - left.value)[0].text;
}

function weakestDimension(result: RoundResult): string {
  const score = result.score;
  if (!score) return decisionPresentation(result.selected).tradeoff;
  const dimensions = [
    {
      value: score.evidenceScore,
      text: "证据链仍有缺口，方向判断可能跑在事实前面。",
    },
    {
      value: score.clarityScore,
      text: "假设边界不够清楚，后续很难判断应该更新哪一部分。",
    },
    { value: score.riskAwarenessScore, text: "最强反例和退出条件仍然偏弱。" },
    {
      value: score.communicationScore,
      text: "研究没有被充分翻译成团队可以共同检查的语言。",
    },
    {
      value: score.lifeBalanceScore,
      text: "工作节奏正在侵蚀判断状态，后续月份会继续付出代价。",
    },
  ];
  return dimensions.sort((left, right) => left.value - right.value)[0].text;
}

function consequenceFor(result: RoundResult): string {
  const focusPressure =
    result.focus.fatigueDelta >= 8 || result.focus.lifeBalanceDelta <= -6;
  if (focusPressure || result.selected.effects.fatigue >= 8) {
    return `研究可信度来到 ${result.researchCredibilityAfter}，但疲劳也升到 ${result.fatigueAfter}。`;
  }
  if (result.selected.effects.teamTrust + result.focus.teamTrustBonus >= 6) {
    return `团队信任来到 ${result.teamTrustAfter}，这次判断更容易被同事共同承担。`;
  }
  if (result.selected.effects.lifeBalance + result.focus.lifeBalanceDelta > 0) {
    return `生活平衡回到 ${result.lifeBalanceAfter}，你为后续判断保留了更新能力。`;
  }
  return `研究可信度来到 ${result.researchCredibilityAfter}，团队信任为 ${result.teamTrustAfter}。`;
}

export function careerRecap(result: RoundResult): CareerRecap {
  return {
    strength: strongestDimension(result),
    risk: weakestDimension(result),
    consequence: consequenceFor(result),
  };
}
