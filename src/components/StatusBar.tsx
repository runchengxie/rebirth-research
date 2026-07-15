import { GAME_DATA } from "../data/gameData";
import { CHARACTERS } from "../game/content";
import type { GameState, MentorId } from "../types";

function linStage(state: GameState): string {
  if (state.flags.lin_route_committed) return "关系确认";
  if (state.flags.lin_route_slow_burn) return "认真靠近";
  if (state.flags.lin_route_regret) return "留下遗憾";
  if (state.flags.lin_professional_honest && (state.flags.lin_kept_promise || state.flags.lin_asked_for_help)) {
    return "信任深化";
  }
  if (state.flags.lin_broke_promise || state.flags.lin_used_hindsight_as_proof) return "正在失望";
  if (state.flags.lin_private_opened) return "明显在意";
  return state.relations.lin_ruoning >= 40 ? "专业默契" : "悄悄关注";
}

function chenStage(state: GameState): string {
  if (state.flags.chen_route_committed) return "关系确认";
  if (state.flags.chen_route_slow_burn) return "继续测试";
  if (state.flags.chen_route_regret) return "信任失配";
  if (state.flags.chen_polished_backtest) return "数据存疑";
  if (state.flags.chen_private_opened) return "私下坦白";
  if (state.flags.chen_shared_failed_run) return "诚实共振";
  return state.relations.chen_xinghe >= 40 ? "专业共振" : "快速观察";
}

function zhouStage(state: GameState): string {
  if (state.flags.zhou_route_committed) return "关系确认";
  if (state.flags.zhou_route_slow_burn) return "稳健靠近";
  if (state.flags.zhou_route_regret) return "边界告警";
  if (state.flags.zhou_gambled_under_pressure) return "边界受损";
  if (state.flags.zhou_private_opened) return "长期观察";
  if (state.flags.zhou_respected_boundary) return "边界共识";
  return state.relations.zhou_mingzhao >= 40 ? "风险默契" : "保持距离";
}

const STAGES: Record<MentorId, (state: GameState) => string> = {
  lin_ruoning: linStage,
  chen_xinghe: chenStage,
  zhou_mingzhao: zhouStage,
};

function relationshipSummary(state: GameState): string {
  if (state.year !== "2025") return "往年同事关系";
  const mentors = (Object.keys(STAGES) as MentorId[]).sort((left, right) =>
    state.relations[right] - state.relations[left]);
  const lead = mentors[0];
  return `${CHARACTERS[lead].name}：${STAGES[lead](state)}`;
}

function researchLabel(value: number): string {
  if (value >= 80) return "框架可托付";
  if (value >= 60) return "研究稳定可信";
  if (value >= 40) return "证据链成形";
  return "推导仍有缺口";
}

function trustLabel(value: number): string {
  if (value >= 80) return "团队愿意共同担责";
  if (value >= 60) return "协作稳定";
  if (value >= 40) return "正在建立默契";
  return "仍在观察";
}

function balanceLabel(value: number): string {
  if (value >= 75) return "节奏清醒";
  if (value >= 50) return "尚能维持";
  if (value >= 30) return "透支开始显形";
  return "状态接近失控";
}

function metricValue(
  value: number,
  showExactMetrics: boolean,
  labelFor: (metric: number) => string,
): string {
  return showExactMetrics ? `${value}/100` : labelFor(value);
}

export function StatusBar({
  state,
  showExactMetrics = false,
}: {
  state: GameState;
  showExactMetrics?: boolean;
}) {
  const data = GAME_DATA[state.year];
  const total = data.scenes.length;
  return (
    <section className="status-band" aria-label="角色状态">
      <div className="stat">
        <span>当前话数 · {relationshipSummary(state)}</span>
        <strong>
          {state.monthIndex + 1}/{total}
        </strong>
      </div>
      <div className="stat">
        <span>研究可信度</span>
        <strong>{metricValue(state.researchCredibility, showExactMetrics, researchLabel)}</strong>
      </div>
      <div className="stat">
        <span>团队信任</span>
        <strong>{metricValue(state.teamTrust, showExactMetrics, trustLabel)}</strong>
      </div>
      <div className="stat">
        <span>生活平衡</span>
        <strong>{metricValue(state.lifeBalance, showExactMetrics, balanceLabel)}</strong>
      </div>
    </section>
  );
}
