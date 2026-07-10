import { CHARACTERS } from "../game/content";
import { gradeReviewText, postMortem } from "../game/engine";
import type { GameState, RoundResult } from "../types";

export function StoryRecapPanel({ result, state }: { result: RoundResult | undefined; state: GameState }) {
  if (!result) return null;
  const character = CHARACTERS[result.characterId];
  const gradeReview = result.score ? gradeReviewText(result.characterId, result.score.grade) : "";
  const pm = postMortem(result.selected, result.label);

  const card = result.knowledgeCardId
    ? state.knowledgeCards.find((k) => k.id === result.knowledgeCardId)
    : undefined;

  return (
    <div className={`story-recap ${character.color}`} aria-label="同事复盘">
      <span>{character.name}的复盘</span>
      <p>{gradeReview}</p>
      <p className="story-recap-detail">{pm}</p>
      {result.businessVerdict ? (
        <div className="business-verdict">
          <strong>业务事实结算</strong>
          <p>{result.businessVerdict}</p>
        </div>
      ) : null}
      {card ? (
        <div className={`knowledge-card ${CHARACTERS[card.mentorId].color}`}>
          <strong>本月学到 · {card.concept}</strong>
          <p>{CHARACTERS[card.mentorId].name}：{card.mentorLine}</p>
          {card.cfaRef ? <small>{card.cfaRef}</small> : null}
        </div>
      ) : null}
    </div>
  );
}
