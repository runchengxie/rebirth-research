import { useEffect } from "react";
import { careerRecap } from "../game/careerGuidance";
import { CHARACTERS } from "../game/content";
import { gradeReviewText, postMortem } from "../game/engine";
import { recordPlaytestEvent } from "../game/playtestTelemetry";
import type { DecisionScore, ExperienceMode, GameState, RoundResult } from "../types";

type ScoreMetricKey = Exclude<keyof DecisionScore, "grade">;

const SCORE_LABELS: Array<{ key: ScoreMetricKey; label: string }> = [
  { key: "evidenceScore", label: "证据" },
  { key: "clarityScore", label: "清晰" },
  { key: "riskAwarenessScore", label: "风险" },
  { key: "communicationScore", label: "沟通" },
  { key: "lifeBalanceScore", label: "生活" },
  { key: "portfolioScore", label: "组合" },
  { key: "qualityBonus", label: "方法质量" },
  { key: "outcomeScore", label: "业务结果" },
];

export function StoryRecapPanel({
  experienceMode = "career",
  result,
  state,
}: {
  experienceMode?: ExperienceMode;
  result: RoundResult | undefined;
  state: GameState;
}) {
  useEffect(() => {
    if (experienceMode !== "career" || !result || result.month !== "2025-01") return;
    recordPlaytestEvent("first_month_complete", {
      year: state.year,
      grade: result.score?.grade ?? null,
      reasoningScore: result.score?.reasoningScore ?? null,
      focusId: result.focus.id,
      decisionId: result.selected.id,
    });
  }, [experienceMode, result, state.year]);

  if (!result) return null;
  const character = CHARACTERS[result.characterId];
  const gradeReview = result.score ? gradeReviewText(result.characterId, result.score.grade) : "";
  const pm = postMortem(result.selected, result.label);
  const recap = careerRecap(result);
  const card = result.knowledgeCardId
    ? state.knowledgeCards.find((knowledge) => knowledge.id === result.knowledgeCardId)
    : undefined;

  return (
    <div className={`story-recap ${character.color}`} aria-label="同事复盘">
      <span>{character.name}的复盘</span>
      {experienceMode === "romance" ? (
        <p>{result.outcome.dialogue}</p>
      ) : (
        <>
          <div className="career-causal-recap" aria-label="本月行动因果">
            <article>
              <span>做得好的地方</span>
              <p>{recap.strength}</p>
            </article>
            <article>
              <span>留下的风险</span>
              <p>{recap.risk}</p>
            </article>
            <article>
              <span>产生的后果</span>
              <p>{recap.consequence}</p>
            </article>
          </div>
          <details
            className="career-full-recap"
            onToggle={(event) => {
              if (event.currentTarget.open) {
                recordPlaytestEvent("score_breakdown_expand", {
                  year: state.year,
                  month: result.month,
                  grade: result.score?.grade ?? null,
                });
              }
            }}
          >
            <summary>查看完整评分复盘{result.score ? ` · ${result.score.grade} 级` : ""}</summary>
            {result.score ? (
              <dl className="career-score-breakdown" aria-label="评分维度">
                {SCORE_LABELS.map(({ key, label }) => (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>{result.score?.[key]}</dd>
                  </div>
                ))}
                <div className="score-reasoning">
                  <dt>推理摘要</dt>
                  <dd>{result.score.reasoningScore}/25</dd>
                </div>
                <div className="score-total">
                  <dt>总分</dt>
                  <dd>{result.score.total} · {result.score.grade} 级</dd>
                </div>
              </dl>
            ) : null}
            <p>{gradeReview}</p>
            <p className="story-recap-detail">{pm}</p>
          </details>
        </>
      )}
      {experienceMode === "career" && result.businessVerdict ? (
        <div className="business-verdict">
          <strong>业务事实结算</strong>
          <p>{result.businessVerdict}</p>
        </div>
      ) : null}
      {experienceMode === "career" && card ? (
        <div className={`knowledge-card ${CHARACTERS[card.mentorId].color}`}>
          <strong>本月学到 · {card.concept}</strong>
          <p>{CHARACTERS[card.mentorId].name}：{card.mentorLine}</p>
          {card.learningRef ? <small>{card.learningRef}</small> : null}
        </div>
      ) : null}
    </div>
  );
}
