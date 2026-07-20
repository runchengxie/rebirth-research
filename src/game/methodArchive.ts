import type { DecisionQuality, RoundResult } from "../types";
import { decisionPresentation } from "./careerGuidance";

const QUALITY_LABELS: Record<DecisionQuality, string> = {
  sound: "方法完整",
  mixed: "证据有缺口",
  reckless: "跳过验证",
};

// 路线图 R2.15 / R2.18：方法档案摘要，旧存档缺字段时提供稳定降级文案。
export function methodSummaryFor(item: RoundResult): string {
  const methodLabel = item.method
    ? decisionPresentation(item.selected).methodLabel
    : "早期存档未记录方法";
  const qualityLabel = item.quality ? QUALITY_LABELS[item.quality] : "执行质量未记录";
  const reasoning = item.score ? `推理 ${item.score.reasoningScore}/25` : "推理分未记录";
  return `${methodLabel} · ${qualityLabel} · 日程 ${item.focus.label} · ${reasoning}`;
}
