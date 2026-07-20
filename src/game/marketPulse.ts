import { HS300_MONTHLY_RETURNS, marketReturnFor } from "../data/marketReturns";
import type { StakeholderPressure } from "./stakeholderPressure";

// ═══════════════════════════════════════════════════════════
// 行情脉冲：把真实行情接进决策前的剧情（行情×剧情缝合）
// ═══════════════════════════════════════════════════════════
//
// 结算层已经用真实沪深300涨跌驱动净值与复盘文案，但决策之前的对白和
// 组织压力对行情是无感的。本模块识别历史级的行情月，在玩家做判断之前
// 让办公室先「热起来」：大涨月基金经理催加仓，大跌月客户电话打爆。
//
// 阈值是不对称的：涨要超过 8% 才会引发全办公室的踏空焦虑，而跌 5% 就
// 足以让赎回电话先于研报到达。这符合客户对回撤远比对上涨敏感的现实。
// 行情脉冲只改变叙事与组织压力的呈现，不参与研究过程评分。

export const SURGE_THRESHOLD = 0.08;
export const SLUMP_THRESHOLD = -0.05;

export type MarketPulseDirection = "surge" | "slump";

export interface MarketPulse {
  month: string;
  direction: MarketPulseDirection;
  // 例如「上涨 20.97%」，供界面或测试拼接展示。
  changeLabel: string;
  // 决策前的即景对白：写办公室与市场的众生相，两种体验模式共用。
  dialogue: string;
  // 职业模式的组织压力卡在脉冲月被真实行情压力覆盖。
  pressure: StakeholderPressure;
}

interface MarketPulseCopy {
  dialogue: string;
  pressure: StakeholderPressure;
}

// 每个脉冲月的文案手写维护，检测由数据阈值驱动。
// marketPulse.test.ts 会校验两边完全一致：新增数据越过阈值而没有文案，
// 或文案对应的月份不再越过阈值，都会在测试中失败。
const PULSE_COPY: Record<string, MarketPulseCopy> = {
  "2023-05": {
    dialogue:
      "沪深300 这个月又跌了 5.72%，弱预期正在变成更弱的现实。客服同事抱着记录本挨个工位确认话术，走廊里能听到她压低声音安抚电话那头的客户。你看了一眼自己的研究清单，行情越冷，越不能把安抚客户的话当成研究结论。",
    pressure: {
      source: "渠道客户",
      title: "赎回电话比研报先到",
      detail: "经济数据全面回落叠加连月阴跌，渠道端的赎回意向单已经排到了下周。",
      tradeoff: "顺着情绪给出止损建议最省事，坚持证据节奏则要先承受客户的失望。",
    },
  },
  "2023-08": {
    dialogue:
      "印花税减半的消息冲高只维持了一个早盘，月底指数还是收跌 6.21%。会议室白板上写着政策底三个字，后面跟着一个很大的问号。客服的电话没有停过，每个人都想知道市场底还有多远。你提醒自己，政策是事实，见底时间只是猜测。",
    pressure: {
      source: "客户服务团队",
      title: "政策四箭齐发之后，客户要一个市场底的说法",
      detail: "利好落地行情反而走低，客户的疑问从为什么跌变成了你们为什么还不动。",
      tradeoff: "给出明确的见底时间能安抚情绪，但那是研究给不出的承诺。",
    },
  },
  "2024-01": {
    dialogue:
      "开年第一个月指数就跌掉 6.29%，雪球产品的敲入线被反复试探，微盘股的流动性像被抽干一样。交易室的门今天一直开着，有人快步进出，有人对着屏幕沉默。电话铃声一个接一个，全是问敞口和赎回的。你知道杠杆盘的连锁反应还在水面之下，先把风险敞口数清楚，比任何观点都重要。",
    pressure: {
      source: "基金经理",
      title: "雪球敲入连环触发，先回答我们的敞口在哪",
      detail: "客户电话已经打爆，组合端需要在今天说清楚持仓与微盘流动性链条的距离。",
      tradeoff: "紧急排查会挤掉本月的研究时间，不排查则可能带着未知的敞口过夜。",
    },
  },
  "2024-02": {
    dialogue:
      "节后第一周，V 型反弹把上个月的恐慌翻了面，这个月指数涨了 9.35%。量化组的同事还在修复上个月被打穿的模型，AI 板块的成交额却已经刷出新高。晨会上有人开始用踏空来形容仓位，你能感觉到，办公室里的每一个判断都在被行情催促。",
    pressure: {
      source: "基金经理",
      title: "V 型反转第二周，仓位窗口等不了完整报告",
      detail: "流动性冲击平息后资金回流迅猛，AI 产业链的定价窗口按天计算。",
      tradeoff: "现在追进去能抓住贝塔，但你还说不清反弹里有多少是可验证的基本面。",
    },
  },
  "2024-09": {
    dialogue:
      "交易大厅的电视音量比平时大了一倍，主持人的声音都在发颤。沪深300 一个月涨了 20.97%，成交量两周内从地量冲到天量，营业部门口重新排起开户的队伍。走廊里每一部电话都在响，有人在喊加仓，有人在问现在上车还来得及吗。你握着自己的研究清单深吸一口气，行情越热，越要分清哪些是证据，哪些只是情绪。",
    pressure: {
      source: "基金经理",
      title: "单月上涨 20.97%，加仓指令在等你的方向",
      detail: "政策组合拳点燃了史诗级反弹，踏空的资金每天都在追进来，组合端要求立刻给出加仓方向。",
      tradeoff: "跟着情绪加仓最容易，但你比谁都清楚这轮趋势里混着多少未经验证的预期。",
    },
  },
  "2025-08": {
    dialogue:
      "中报刚披露完，指数这个月直接涨了 10.33%。上午还在讨论业绩修正，下午群里已经全是慢牛的截图。机构销售的消息一条比一条急，客户从要解释变成了要方向。你把中报数据摊在桌上提醒自己，行情替你把故事讲完了一半，剩下那一半还是要靠证据。",
    pressure: {
      source: "基金经理",
      title: "指数单月上涨 10.33%，中报还没读完仓位窗口就来了",
      detail: "业绩修正与政策预期同时发力，组合端要求在主升浪里尽快明确加仓线索。",
      tradeoff: "追着涨幅调仓能贴住排名，但中报里的证据链还没有走完。",
    },
  },
};

function pulseKeyFor(year: string, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function isPulseReturn(monthReturn: number): boolean {
  return monthReturn >= SURGE_THRESHOLD || monthReturn <= SLUMP_THRESHOLD;
}

// 由真实数据驱动的脉冲月清单，测试用它对照文案覆盖。
export function pulseMonthKeys(): string[] {
  const keys: string[] = [];
  for (const [year, months] of Object.entries(HS300_MONTHLY_RETURNS)) {
    months.forEach((monthReturn, monthIndex) => {
      if (isPulseReturn(monthReturn)) keys.push(pulseKeyFor(year, monthIndex));
    });
  }
  return keys;
}

export function marketPulseFor(year: string, monthIndex: number): MarketPulse | null {
  const monthReturn = marketReturnFor(year, monthIndex);
  if (!isPulseReturn(monthReturn)) return null;
  const copy = PULSE_COPY[pulseKeyFor(year, monthIndex)];
  if (!copy) return null;
  const direction: MarketPulseDirection = monthReturn > 0 ? "surge" : "slump";
  const percent = (Math.abs(monthReturn) * 100).toFixed(2);
  return {
    month: pulseKeyFor(year, monthIndex),
    direction,
    changeLabel: `${direction === "surge" ? "上涨" : "下跌"} ${percent}%`,
    dialogue: copy.dialogue,
    pressure: copy.pressure,
  };
}
