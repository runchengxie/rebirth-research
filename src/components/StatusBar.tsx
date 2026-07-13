import { GAME_DATA } from "../data/gameData";
import type { GameState } from "../types";

function linRelationshipStage(state: GameState): string {
  if (state.year !== "2025") return "往年同事";
  if (state.flags.lin_route_committed) return "关系确认";
  if (state.flags.lin_route_slow_burn) return "认真靠近";
  if (state.flags.lin_route_regret) return "留下遗憾";
  if (state.flags.lin_professional_honest && (state.flags.lin_kept_promise || state.flags.lin_asked_for_help)) {
    return "信任深化";
  }
  if (state.flags.lin_broke_promise || state.flags.lin_used_hindsight_as_proof) return "正在失望";
  if (state.flags.lin_private_opened) return "明显在意";
  if (state.relations.lin_ruoning >= 40) return "专业默契";
  return "悄悄关注";
}

export function StatusBar({ state }: { state: GameState }) {
  const data = GAME_DATA[state.year];
  const total = data.scenes.length;
  return (
    <section className="status-band" aria-label="角色状态">
      <div className="stat">
        <span>当前话数 · 林若宁：{linRelationshipStage(state)}</span>
        <strong>
          {state.monthIndex + 1}/{total}
        </strong>
      </div>
      <div className="stat">
        <span>研究可信度</span>
        <strong>{state.researchCredibility}/100</strong>
      </div>
      <div className="stat">
        <span>团队信任</span>
        <strong>{state.teamTrust}/100</strong>
      </div>
      <div className="stat">
        <span>生活平衡</span>
        <strong>{state.lifeBalance}/100</strong>
      </div>
    </section>
  );
}
