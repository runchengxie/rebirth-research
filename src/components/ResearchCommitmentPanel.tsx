import {
  CONFIDENCE_OPTIONS,
  FALSIFIER_OPTIONS,
  REVIEW_CHECK_OPTIONS,
  commitmentWarning,
  completedReviewCount,
  createSteadyResearchCommitment,
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
  const fullyReviewed = completedReviewCount(commitment) === REVIEW_CHECK_OPTIONS.length;
  const steadyTemplateActive = commitment.confidence === 70 && fullyReviewed;
  const falsifierLabel = FALSIFIER_OPTIONS.find((option) => option.id === commitment.falsifier)?.label;

  return (
    <section className="research-commitment" aria-label="提交前研究承诺">
      <div className="research-commitment-heading">
        <div>
          <span>投委会审查</span>
          <strong>先写清你愿意被什么推翻</strong>
        </div>
        <p>结论可以错，置信度、反例和退出条件不能靠月末结算替你补写。</p>
      </div>

      <aside className="research-assist" aria-label="研究助理">
        <span>研究助理</span>
        <strong>用稳健模板跳过重复确认</strong>
        <p>采用 70% 基准判断，失效信号保留为“{falsifierLabel}”，并完成证据、反例与退出条件自检。</p>
        <button
          aria-pressed={steadyTemplateActive}
          className="secondary-action"
          type="button"
          onClick={() => onChange(createSteadyResearchCommitment(commitment.falsifier))}
        >
          {steadyTemplateActive ? "稳健模板已采用" : "采用稳健模板"}
        </button>
      </aside>

      <details className="research-commitment-manual">
        <summary>手动调整研究承诺</summary>
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
      </details>

      <p className="commitment-warning" aria-live="polite">
        {commitmentWarning(commitment)}
      </p>
    </section>
  );
}
