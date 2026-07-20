import type { ReactNode } from "react";
import { recordPlaytestEvent } from "../game/playtestTelemetry";
import type { GlossaryTerm } from "../game/careerGuidance";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 在正文里给命中的术语加中性解释（悬浮提示），不提示方案优劣。
export function GlossaryText({ text, terms }: { text: string; terms: GlossaryTerm[] }) {
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

// 默认折叠的术语列表（路线图 R2.5）。只展示当前内容实际命中的术语。
export function GlossaryDetails({
  className,
  summaryLabel,
  terms,
  showRelevance = false,
  telemetryEvent,
  telemetryPayload,
}: {
  className: string;
  summaryLabel: string;
  terms: GlossaryTerm[];
  showRelevance?: boolean;
  telemetryEvent: string;
  telemetryPayload: Record<string, string | number | boolean | null>;
}) {
  if (terms.length === 0) return null;
  return (
    <details
      className={className}
      onToggle={(event) => {
        if (event.currentTarget.open) {
          recordPlaytestEvent(telemetryEvent, { ...telemetryPayload, termCount: terms.length });
        }
      }}
    >
      <summary>{summaryLabel}（{terms.length}）</summary>
      <dl>
        {terms.map((term) => (
          <div key={term.id}>
            <dt>{term.label}</dt>
            <dd>
              {term.explanation}
              {showRelevance ? (
                <>
                  <br />
                  <small>本话作用：{term.relevance}</small>
                </>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
