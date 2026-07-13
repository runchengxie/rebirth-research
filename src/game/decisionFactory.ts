import { completeDecisionSemantics } from "./narrativeSemantics";
import type {
  CharacterId,
  CharacterRelation,
  DecisionBehaviorTag,
  DecisionCategory,
  DecisionEffects,
  DecisionMethod,
  DecisionQuality,
  OutcomeAlignment,
  ResearchDecision,
} from "../types";

// Decision factory — 用紧凑写法消除每月决策的样板重复。
// 每个决策只需给出：主要好感对象(to/val)、效果覆盖(fx)、评分(ev/cl/rk/rf)。
export type DecisionInput = {
  id: string;
  label: string;
  category: DecisionCategory;
  method?: DecisionMethod;
  quality?: DecisionQuality;
  outcomeAlignment?: OutcomeAlignment;
  behaviorTags?: DecisionBehaviorTag[];
  description: string;
  to?: CharacterId; // 主要好感对象
  val?: number; // 主要好感增量
  rx?: CharacterRelation[]; // 额外的好感对象（to 之外的角色）；与 to 合并而非互斥
  fx?: Partial<DecisionEffects>; // 效果覆盖（在零默认值之上合并）
  ev?: number; // evidenceLevel
  cl?: number; // clarityLevel
  rk?: number; // riskAwareness
  rf?: number; // reflectionValue
  note?: string; // backgroundNote
  setsFlags?: Record<string, boolean | number>; // choice-specific flags written on pick
};

export function d(input: DecisionInput): ResearchDecision {
  // to 生成主好感关系，rx 是额外好感对象；二者合并而非互斥（旧写法 to 会被 rx 吞掉）。
  const baseRelations: CharacterRelation[] = input.to
    ? [{ characterId: input.to, value: input.val ?? 0 }]
    : [];
  const characterRelations: CharacterRelation[] = input.rx
    ? [...baseRelations, ...input.rx]
    : baseRelations;

  const base: DecisionEffects = {
    researchCredibility: 0,
    committeeAdoption: 0,
    portfolioNav: 0,
    viewAccuracy: 0,
    clientFeedback: 0,
    teamTrust: 0,
    fatigue: 0,
    lifeBalance: 0,
    characterRelations,
  };
  const effects: DecisionEffects = input.fx ? { ...base, ...input.fx } : base;

  return completeDecisionSemantics({
    id: input.id,
    label: input.label,
    category: input.category,
    method: input.method,
    quality: input.quality,
    outcomeAlignment: input.outcomeAlignment,
    behaviorTags: input.behaviorTags,
    description: input.description,
    effects,
    evidenceLevel: input.ev ?? 0,
    clarityLevel: input.cl ?? 0,
    riskAwareness: input.rk ?? 0,
    reflectionValue: input.rf ?? 0,
    backgroundNote: input.note,
    setsFlags: input.setsFlags,
  });
}
