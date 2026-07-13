import type { DecisionMethod } from "../types";
import type { InvestigationClueId, RebirthMetaState } from "./rebirth";

export interface DecisionBonus {
  evidence: number;
  clarity: number;
  risk: number;
  reflection: number;
  fatigue: number;
}

interface DecisionBonusRule extends Partial<DecisionBonus> {
  clueId: InvestigationClueId;
  methods?: DecisionMethod[];
}

const DECISION_BONUS_RULES: DecisionBonusRule[] = [
  { clueId: "cost_drop", evidence: 1 },
  {
    clueId: "margin_gap",
    methods: ["fundamental_research", "field_research", "quantitative_research"],
    evidence: 2,
    clarity: 2,
  },
  {
    clueId: "payment_split",
    methods: ["fundamental_research", "field_research", "communication"],
    evidence: 2,
  },
  {
    clueId: "crowding_signal",
    methods: ["quantitative_research", "risk_management"],
    risk: 3,
  },
  { clueId: "competition_risk", risk: 2 },
  { clueId: "clear_head", reflection: 2, fatigue: -2 },
  { clueId: "unit_economics", evidence: 2, clarity: 2 },
  {
    clueId: "raw_factor_sample",
    methods: ["quantitative_research"],
    evidence: 2,
    risk: 2,
  },
  {
    clueId: "staged_entry",
    methods: ["risk_management", "committee_process"],
    clarity: 2,
    risk: 2,
  },
];

function hasClue(meta: RebirthMetaState, clueId: InvestigationClueId): boolean {
  return meta.investigation?.clueIds.includes(clueId) ?? false;
}

export function investigationDecisionBonus(
  meta: RebirthMetaState,
  method: DecisionMethod,
): DecisionBonus {
  return DECISION_BONUS_RULES.reduce<DecisionBonus>((bonus, rule) => {
    if (!hasClue(meta, rule.clueId)) return bonus;
    if (rule.methods && !rule.methods.includes(method)) return bonus;
    return {
      evidence: bonus.evidence + (rule.evidence ?? 0),
      clarity: bonus.clarity + (rule.clarity ?? 0),
      risk: bonus.risk + (rule.risk ?? 0),
      reflection: bonus.reflection + (rule.reflection ?? 0),
      fatigue: bonus.fatigue + (rule.fatigue ?? 0),
    };
  }, { evidence: 0, clarity: 0, risk: 0, reflection: 0, fatigue: 0 });
}
