import {
  CONFIDENCE_OPTIONS,
  FALSIFIER_OPTIONS,
  REVIEW_CHECK_OPTIONS,
  commitmentWarning,
  type ConfidenceLevel,
  type FalsifierId,
  type ResearchCommitment,
  type ReviewCheckId,
} from "../game/researchCommitment";

export function ResearchCommitmentPanel({
  commitment,
  onChange,
}: {
  commitment: ResearchCommitment;
  onChange: (next: ResearchCommitment) => void;
}) {
  const setConfidence = (confidence: ConfidenceLevel) => {
    onChange({ ...commitment, confidence });
  };
  const setFalsifier = (falsifier: FalsifierId) => {
    onChange({ ...commitment, falsifier });
  };
  const toggleCheck = (id: ReviewCheckId) => {
    onChange({
      ...commitment,
      reviewChecks: {
        ...commitment.reviewChecks,
        [id]: !commitment.reviewChecks[id],
      },
    });
  };

  return (
    <section className="research-commitment" aria-label="提交前研究承诺">
      <div className="research-commitment-heading">
        <div>
          <span>投委会审查</span>
          <strong>先写清你愿意被什么推翻</strong>
        </div>
        <p>结论可以错，置信度、反例和退出条件不能靠月末结算替你补写。</p>
      </div>

      <fieldset className="commitment-confidence">
        <legend>判断置信度</legend>
        <div className="commitment-choice-grid">
          {CONFIDENCE_OPTIONS.map((option) => (
            <button
              aria-pressed={commitment.confidence === option.value}
              className={commitment.confidence === option.value ? "active" : ""}
              key={option.value}
              onClick={() => setConfidence(option.value)}
              type="button"
            >
              <strong>{option.value}% · {option.label}</strong>
              <span>{option.detail}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <label className="commitment-falsifier">
        <span>最先让原判断失效的信号</span>
        <select
          value={commitment.falsifier}
          onChange={(event) => setFalsifier(event.target.value as FalsifierId)}
        >
          {FALSIFIER_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        <small>
          {FALSIFIER_OPTIONS.find((option) => option.id === commitment.falsifier)?.detail}
        </small>
      </label>

      <fieldset className="commitment-review-checks">
        <legend>三项自检</legend>
        {REVIEW_CHECK_OPTIONS.map((option) => (
          <label key={option.id}>
            <input
              checked={commitment.reviewChecks[option.id]}
              onChange={() => toggleCheck(option.id)}
              type="checkbox"
            />
            <span>
              <strong>{option.label}</strong>
              <small>{option.detail}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <p className="commitment-warning" aria-live="polite">
        {commitmentWarning(commitment)}
      </p>
    </section>
  );
}
