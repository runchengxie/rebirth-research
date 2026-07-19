import { useEffect } from "react";
import { FOCUS_ACTIONS } from "../game/content";
import { focusPresentation } from "../game/focusContext";
import type { FocusAction, GameState, MarketTheme } from "../types";

function FocusCard({
  focus,
  state,
  theme,
  monthIndex,
  onSelect,
}: {
  focus: FocusAction;
  state: GameState;
  theme: Pick<MarketTheme, "title">;
  monthIndex: number;
  onSelect: (focusId: string) => void;
}) {
  const presentation = focusPresentation(focus, theme, monthIndex);
  return (
    <button
      className={`focus-card ${state.focusId === focus.id ? "active" : ""}`}
      aria-pressed={state.focusId === focus.id}
      disabled={state.locked}
      type="button"
      onClick={() => onSelect(focus.id)}
    >
      <span className="focus-icon">{focus.icon}</span>
      <strong>{presentation.label}</strong>
      <small>{presentation.short}</small>
      <p>{presentation.detail}</p>
    </button>
  );
}

export function FocusSelector({
  state,
  theme,
  monthIndex = state.monthIndex,
  onSelect,
}: {
  state: GameState;
  theme?: MarketTheme;
  monthIndex?: number;
  onSelect: (focusId: string) => void;
}) {
  const activeTheme: Pick<MarketTheme, "title"> = theme ?? { title: "本月研究" };
  const guidedOpening = monthIndex === 0 && state.history.length === 0;
  const primaryActions = guidedOpening
    ? FOCUS_ACTIONS.filter((focus) => focus.id === "deep_research" || focus.id === "self_care")
    : FOCUS_ACTIONS;
  const additionalActions = guidedOpening
    ? FOCUS_ACTIONS.filter((focus) => !primaryActions.includes(focus))
    : [];

  useEffect(() => {
    const applyRecommendation = (event: Event) => {
      const focusId = (event as CustomEvent<{ focusId?: string }>).detail?.focusId;
      if (state.locked || !focusId || !FOCUS_ACTIONS.some((focus) => focus.id === focusId)) return;
      onSelect(focusId);
    };
    window.addEventListener("rebirth:recommended-focus", applyRecommendation);
    return () => window.removeEventListener("rebirth:recommended-focus", applyRecommendation);
  }, [onSelect, state.locked]);

  useEffect(() => {
    if (!guidedOpening) return;
    const timeoutId = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("rebirth:apply-steady-commitment"));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [guidedOpening]);

  return (
    <section className="focus-choice-section" aria-label="本话日程">
      {guidedOpening ? (
        <div className="focus-onboarding" role="note">
          <span>第一次安排日程</span>
          <strong>先感受投入与状态之间的取舍</strong>
          <p>日程会影响研究质量、疲劳与生活平衡。团队协作仍可在下方展开选择。</p>
        </div>
      ) : null}
      <div className="focus-grid">
        {primaryActions.map((focus) => (
          <FocusCard
            focus={focus}
            key={focus.id}
            monthIndex={monthIndex}
            onSelect={onSelect}
            state={state}
            theme={activeTheme}
          />
        ))}
      </div>
      {additionalActions.length > 0 ? (
        <details className="focus-additional">
          <summary>查看其他日程（{additionalActions.length}）</summary>
          <div className="focus-grid">
            {additionalActions.map((focus) => (
              <FocusCard
                focus={focus}
                key={focus.id}
                monthIndex={monthIndex}
                onSelect={onSelect}
                state={state}
                theme={activeTheme}
              />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
