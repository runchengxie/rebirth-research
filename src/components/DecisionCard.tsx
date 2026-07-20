import { useEffect, useRef, useState } from "react";
import { CHARACTERS } from "../game/content";
import {
  decisionPresentation,
  glossaryTermsIn,
} from "../game/careerGuidance";
import { focusById } from "../game/engine";
import { recordPlaytestEvent } from "../game/playtestTelemetry";
import type { ExperienceMode, GameState, ResearchDecision } from "../types";
import { GlossaryDetails, GlossaryText } from "./GlossaryNotes";

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

function DecisionConfirmation({
  decision,
  presentation,
  currentFocusLabel,
  recommendationMatched,
  submitting,
  onApplyRecommendedFocus,
  onCancel,
  onConfirm,
}: {
  decision: ResearchDecision;
  presentation: ReturnType<typeof decisionPresentation>;
  currentFocusLabel: string;
  recommendationMatched: boolean;
  submitting: boolean;
  onApplyRecommendedFocus: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <section className="decision-confirmation" aria-label={`${decision.label}提交确认`}>
      <span>提交前确认</span>
      <strong>{presentation.claim}</strong>
      <dl>
        <div>
          <dt>当前日程</dt>
          <dd>{currentFocusLabel}</dd>
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
        <button className="secondary-action" disabled={submitting} type="button" onClick={onApplyRecommendedFocus}>
          采用推荐日程
        </button>
      ) : (
        <small>当前日程已经符合这套研究方法的推荐节奏。</small>
      )}
      <div className="decision-confirmation-actions">
        <button className="secondary-action" disabled={submitting} type="button" onClick={onCancel}>
          返回比较
        </button>
        <button className="primary-action" disabled={submitting} type="button" onClick={onConfirm}>
          {submitting ? "正在提交" : "确认提交本月判断"}
        </button>
      </div>
    </section>
  );
}

export function DecisionCard({
  decision,
  experienceMode = "career",
  index,
  state,
  onChoose,
  draftMode = false,
  draftSelected = false,
}: {
  decision: ResearchDecision;
  experienceMode?: ExperienceMode;
  index: number;
  state: GameState;
  // 桌面纵向流程里 onChoose 触发结算；窄屏步骤器（draftMode）里只记录草案。
  onChoose: (decision: ResearchDecision) => void;
  draftMode?: boolean;
  draftSelected?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const mountedAt = useRef<number | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    mountedAt.current = performance.now();
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

  const draft = () => {
    recordPlaytestEvent("decision_draft", {
      year: state.year,
      month: state.monthIndex + 1,
      decisionId: decision.id,
      currentFocusId: state.focusId,
      recommendedFocusId: presentation.recommendedFocusId,
    });
    onChoose(decision);
  };

  const preview = () => {
    if (confirming) return;
    const now = performance.now();
    window.dispatchEvent(new CustomEvent("rebirth:decision-preview", {
      detail: { decisionId: decision.id },
    }));
    setConfirming(true);
    recordPlaytestEvent("decision_preview", {
      year: state.year,
      month: state.monthIndex + 1,
      decisionId: decision.id,
      elapsedMs: Math.round(now - (mountedAt.current ?? now)),
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
    <article className={`option career-option method-${presentation.tone} ${confirming ? "is-confirming" : ""} ${draftSelected ? "is-draft-selected" : ""}`}>
      <button
        aria-pressed={draftMode ? draftSelected : undefined}
        className="career-option-main"
        disabled={state.locked || submitting}
        type="button"
        onClick={draftMode ? draft : preview}
      >
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

      <GlossaryDetails
        className="career-glossary"
        summaryLabel="本选项术语"
        telemetryEvent="glossary_expand"
        telemetryPayload={{
          year: state.year,
          month: state.monthIndex + 1,
          decisionId: decision.id,
        }}
        terms={terms}
      />

      {confirming && !draftMode ? (
        <DecisionConfirmation
          currentFocusLabel={currentFocus.label}
          decision={decision}
          presentation={presentation}
          recommendationMatched={recommendationMatched}
          submitting={submitting}
          onApplyRecommendedFocus={applyRecommendedFocus}
          onCancel={() => {
            setConfirming(false);
            recordPlaytestEvent("decision_preview_cancel", {
              year: state.year,
              month: state.monthIndex + 1,
              decisionId: decision.id,
            });
          }}
          onConfirm={confirm}
        />
      ) : null}
    </article>
  );
}
