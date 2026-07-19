import { useEffect, useRef, useState, type ReactNode } from "react";
import { CHARACTERS } from "../game/content";
import {
  decisionPresentation,
  glossaryTermsIn,
  type GlossaryTerm,
} from "../game/careerGuidance";
import { focusById } from "../game/engine";
import { recordPlaytestEvent } from "../game/playtestTelemetry";
import type { ExperienceMode, GameState, ResearchDecision } from "../types";

const CATEGORY_COLORS: Record<string, string> = {
  deep_research: "#4b8fe8",
  expert_interview: "#7b5ecc",
  roadshow: "#9c78e6",
  risk_alert: "#e7a735",
  self_care: "#20a978",
  help_colleague: "#e8789a",
  committee_defense: "#e07050",
  data_deep_dive: "#4ba0d8",
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function GlossaryText({ text, terms }: { text: string; terms: GlossaryTerm[] }) {
  if (terms.length === 0) return text;
  const aliases = terms
    .flatMap((term) => [term.label, ...term.aliases])
    .sort((left, right) => right.length - left.length);
  const pattern = new RegExp(`(${aliases.map(escapeRegExp).join("|")})`, "gi");
  const termByAlias = new Map<string, GlossaryTerm>();
  for (const term of terms) {
    for (const alias of [term.label, ...term.aliases]) {
      termByAlias.set(alias.toLocaleLowerCase("zh-CN"), term);
    }
  }
  return text.split(pattern).map((part, index): ReactNode => {
    const term = termByAlias.get(part.toLocaleLowerCase("zh-CN"));
    if (!term) return part;
    return (
      <abbr className="career-term" key={`${term.id}-${index}`} title={term.explanation}>
        {part}
      </abbr>
    );
  });
}

function RomanceDecision({
  decision,
  index,
  state,
  onChoose,
}: {
  decision: ResearchDecision;
  index: number;
  state: GameState;
  onChoose: (decision: ResearchDecision) => void;
}) {
  const optionLetter = String.fromCharCode(65 + index);
  const romanceLead = [...decision.effects.characterRelations]
    .filter((effect) => effect.characterId !== "zhao_chengyu")
    .sort((left, right) => right.value - left.value)[0];
  return (
    <button
      className={`option ${state.locked && state.selectedId === decision.id ? "correct" : ""}`}
      disabled={state.locked}
      type="button"
      onClick={() => onChoose(decision)}
    >
      <div className="option-kicker">
        <span style={{ borderColor: CATEGORY_COLORS[decision.category] || "#aaa" }}>回应 {optionLetter}</span>
        <span>♡ {romanceLead ? CHARACTERS[romanceLead.characterId].name : "这段关系"}会记住</span>
      </div>
      <div className="option-top">
        <div className="stock-name">
          <strong>{decision.label}</strong>
        </div>
      </div>
      <p className="analysis-note">{decision.description}</p>
    </button>
  );
}

export function DecisionCard({
  decision,
  experienceMode = "career",
  index,
  state,
  onChoose,
}: {
  decision: ResearchDecision;
  experienceMode?: ExperienceMode;
  index: number;
  state: GameState;
  onChoose: (decision: ResearchDecision) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const mountedAt = useRef(performance.now());
  const submittingRef = useRef(false);

  useEffect(() => {
    const closeOtherPreviews = (event: Event) => {
      const decisionId = (event as CustomEvent<{ decisionId?: string }>).detail?.decisionId;
      if (decisionId && decisionId !== decision.id) setConfirming(false);
    };
    window.addEventListener("rebirth:decision-preview", closeOtherPreviews);
    return () => window.removeEventListener("rebirth:decision-preview", closeOtherPreviews);
  }, [decision.id]);

  if (experienceMode === "romance") {
    return (
      <RomanceDecision
        decision={decision}
        index={index}
        onChoose={onChoose}
        state={state}
      />
    );
  }

  const optionLetter = String.fromCharCode(65 + index);
  const presentation = decisionPresentation(decision);
  const currentFocus = focusById(state.focusId);
  const terms = glossaryTermsIn(decision.label, decision.description);
  const recommendationMatched = state.focusId === presentation.recommendedFocusId;

  const preview = () => {
    if (confirming) return;
    window.dispatchEvent(new CustomEvent("rebirth:decision-preview", {
      detail: { decisionId: decision.id },
    }));
    setConfirming(true);
    recordPlaytestEvent("decision_preview", {
      year: state.year,
      month: state.monthIndex + 1,
      decisionId: decision.id,
      elapsedMs: Math.round(performance.now() - mountedAt.current),
      currentFocusId: state.focusId,
      recommendedFocusId: presentation.recommendedFocusId,
    });
  };

  const applyRecommendedFocus = () => {
    window.dispatchEvent(new CustomEvent("rebirth:recommended-focus", {
      detail: { focusId: presentation.recommendedFocusId },
    }));
    recordPlaytestEvent("recommended_focus_apply", {
      year: state.year,
      month: state.monthIndex + 1,
      decisionId: decision.id,
      focusId: presentation.recommendedFocusId,
    });
  };

  const confirm = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    recordPlaytestEvent("decision_confirm", {
      year: state.year,
      month: state.monthIndex + 1,
      decisionId: decision.id,
      focusId: state.focusId,
      recommendationMatched,
      glossaryTerms: terms.length,
    });
    onChoose(decision);
  };

  return (
    <article className={`option career-option method-${presentation.tone} ${confirming ? "is-confirming" : ""}`}>
      <button className="career-option-main" disabled={state.locked || submitting} type="button" onClick={preview}>
        <div className="option-kicker">
          <span style={{ borderColor: CATEGORY_COLORS[decision.category] || "#aaa" }}>选项 {optionLetter}</span>
          <span>{presentation.icon} {presentation.methodLabel}</span>
        </div>
        <div className="option-top">
          <div className="stock-name">
            <strong>{decision.label}</strong>
          </div>
        </div>
        <p className="analysis-note">
          <GlossaryText text={decision.description} terms={terms} />
        </p>
        <dl className="career-option-logic">
          <div>
            <dt>主张</dt>
            <dd>{presentation.claim}</dd>
          </div>
          <div>
            <dt>你押注的是</dt>
            <dd>{presentation.wager}</dd>
          </div>
          <div>
            <dt>主要代价</dt>
            <dd>{presentation.tradeoff}</dd>
          </div>
        </dl>
        <div className="career-option-schedule">
          <span>推荐日程</span>
          <strong>{presentation.recommendedFocusLabel}</strong>
        </div>
      </button>

      {terms.length > 0 ? (
        <details
          className="career-glossary"
          onToggle={(event) => {
            if (event.currentTarget.open) {
              recordPlaytestEvent("glossary_expand", {
                year: state.year,
                month: state.monthIndex + 1,
                decisionId: decision.id,
                termCount: terms.length,
              });
            }
          }}
        >
          <summary>本选项术语（{terms.length}）</summary>
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

      {confirming ? (
        <section className="decision-confirmation" aria-label={`${decision.label}提交确认`}>
          <span>提交前确认</span>
          <strong>{presentation.claim}</strong>
          <dl>
            <div>
              <dt>当前日程</dt>
              <dd>{currentFocus.label}</dd>
            </div>
            <div>
              <dt>推荐日程</dt>
              <dd>{presentation.recommendedFocusLabel}</dd>
            </div>
            <div>
              <dt>最大风险</dt>
              <dd>{presentation.tradeoff}</dd>
            </div>
          </dl>
          {!recommendationMatched ? (
            <button className="secondary-action" disabled={submitting} type="button" onClick={applyRecommendedFocus}>
              采用推荐日程
            </button>
          ) : (
            <small>当前日程已经符合这套研究方法的推荐节奏。</small>
          )}
          <div className="decision-confirmation-actions">
            <button
              className="secondary-action"
              disabled={submitting}
              type="button"
              onClick={() => {
                setConfirming(false);
                recordPlaytestEvent("decision_preview_cancel", {
                  year: state.year,
                  month: state.monthIndex + 1,
                  decisionId: decision.id,
                });
              }}
            >
              返回比较
            </button>
            <button className="primary-action" disabled={submitting} type="button" onClick={confirm}>
              {submitting ? "正在提交" : "确认提交本月判断"}
            </button>
          </div>
        </section>
      ) : null}
    </article>
  );
}
