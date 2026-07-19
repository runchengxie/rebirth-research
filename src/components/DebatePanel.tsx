import { glossaryTermsIn } from "../game/careerGuidance";
import { CHARACTERS } from "../game/content";
import { recordPlaytestEvent } from "../game/playtestTelemetry";
import type { CompetingHypotheses } from "../types";
import { debateItems } from "./debateItems";

export function DebatePanel({ hypotheses }: { hypotheses: CompetingHypotheses | undefined }) {
  const items = debateItems(hypotheses);
  const terms = glossaryTermsIn(...items.map((item) => item.text));
  return (
    <section className="debate-panel" aria-label="三位同事的观点交锋">
      <header className="debate-intro">
        <p>三位同事从同一段信息出发，各自给出判断。</p>
      </header>
      <ul className="debate-grid">
        {items.map((item) => {
          const character = CHARACTERS[item.characterId];
          const titleId = `debate-${item.characterId}-title`;
          return (
            <li
              aria-labelledby={titleId}
              className={`debate-card ${character.color}`}
              data-character={item.characterId}
              key={item.characterId}
            >
              <header>
                <span aria-hidden="true" className="debate-avatar">
                  {character.name.slice(0, 1)}
                </span>
                <div>
                  <h3 id={titleId}>{character.name}</h3>
                  <span>{item.label}</span>
                </div>
              </header>
              <p>{item.text}</p>
            </li>
          );
        })}
      </ul>
      {terms.length > 0 ? (
        <details
          className="debate-glossary"
          onToggle={(event) => {
            if (event.currentTarget.open) {
              recordPlaytestEvent("debate_glossary_expand", { termCount: terms.length });
            }
          }}
        >
          <summary>本话术语（{terms.length}）</summary>
          <dl>
            {terms.map((term) => (
              <div key={term.id}>
                <dt>{term.label}</dt>
                <dd>{term.explanation}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
      <p className="debate-conclusion">
        每套框架都有证据和盲区。选择一条证据链，也要留意它暂时解释不了的部分。
      </p>
    </section>
  );
}

export function DebateHistory({ hypotheses }: { hypotheses: CompetingHypotheses | undefined }) {
  return (
    <div className="dialogue-history-debate" aria-label="三位同事的观点">
      {debateItems(hypotheses).map((item) => {
        const character = CHARACTERS[item.characterId];
        return (
          <article className={character.color} data-character={item.characterId} key={item.characterId}>
            <strong>{character.name} · {item.label}</strong>
            <p>{item.text}</p>
          </article>
        );
      })}
    </div>
  );
}
