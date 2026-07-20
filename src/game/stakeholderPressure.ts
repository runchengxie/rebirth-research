import { marketPulseFor } from "./marketPulse";

export interface StakeholderPressure {
  source: string;
  title: string;
  detail: string;
  tradeoff: string;
}

const PRESSURES_2025: readonly StakeholderPressure[] = [
  {
    source: "基金经理",
    title: "开盘前需要一句能执行的判断",
    detail: "技术突破已经发生，组合端却等不了完整产业链报告。",
    tradeoff: "越快越容易获得仓位窗口，越快也越可能把未来记忆误当成证据。",
  },
  {
    source: "机构销售",
    title: "客户想听一个能传播的 AI Agent 故事",
    detail: "复杂的部署条件和付费分化很难装进一页路演材料。",
    tradeoff: "表达越顺滑，越需要主动保留模型边界和失败场景。",
  },
  {
    source: "部门负责人",
    title: "政策主题需要在晨会形成统一口径",
    detail: "文件热度已经起来，订单和财政资源仍在路上。",
    tradeoff: "团队需要方向，但过早统一口径会压掉真正有价值的分歧。",
  },
  {
    source: "合规同事",
    title: "调研信息必须说明来源和可公开边界",
    detail: "财报季与关税冲击叠加，未经核验的一线口径很容易被过度解释。",
    tradeoff: "信息速度和证据可复核性无法同时无限提高。",
  },
  {
    source: "渠道客户",
    title: "客户要求给出消费修复的第一受益方向",
    detail: "高频数据、可选消费和体验消费的传导节奏并不同步。",
    tradeoff: "明确排序有业务价值，也意味着你必须承担时点判断的责任。",
  },
  {
    source: "投委会主席",
    title: "技术突破不能只靠发布会掌声",
    detail: "大客户导入、量产良率和订单验证必须落到同一张表上。",
    tradeoff: "保守等待会错过叙事窗口，抢跑则可能买下尚未解决的工程问题。",
  },
  {
    source: "组合经理",
    title: "算力涨价和应用盈利分化需要重新配权",
    detail: "产业景气与资金偏好正在错位，简单押一端已经不够。",
    tradeoff: "重新平衡可以降低单边风险，也可能放弃最强趋势。",
  },
  {
    source: "研究总监",
    title: "中报结论要能接入下半年的策略框架",
    detail: "一次正确判断不够，部门需要可复用的变量和验证节奏。",
    tradeoff: "写成体系耗时更长，写成一句观点更容易被采用。",
  },
  {
    source: "合规与量化组",
    title: "程序化新规改变了旧因子的适用边界",
    detail: "历史回测仍然漂亮，市场结构却已经换了规则。",
    tradeoff: "继续使用旧模型可以保持连续性，承认失效则要重建样本和权限。",
  },
  {
    source: "客户服务团队",
    title: "排名压力下，客户要求解释三季报后的回撤",
    detail: "观点、仓位和客户预期已经被不同的人用不同方式表达。",
    tradeoff: "维护旧叙事能减少短期摩擦，及时修正更有利于长期信任。",
  },
  {
    source: "基金经理",
    title: "跨年配置窗口只剩几次会议",
    detail: "红利、消费和出口修复各有证据，也各有外部变量。",
    tradeoff: "集中可以形成鲜明观点，分散则承认宏观路径仍有多种可能。",
  },
  {
    source: "年度策略会",
    title: "所有人都在等你解释这一年的未来记忆",
    detail: "档案里同时存在亲历事实、媒体标题和事后归因。",
    tradeoff: "给出完整故事最容易获得掌声，承认污染最接近研究诚实。",
  },
];

export function stakeholderPressureFor(
  year: string,
  monthIndex: number,
): StakeholderPressure {
  // 行情×剧情缝合：历史级行情月的组织压力来自真实行情本身，
  // 大涨月是催加仓的组合端，大跌月是打爆的客户电话。
  const pulse = marketPulseFor(year, monthIndex);
  if (pulse) return pulse.pressure;

  if (year === "2025") {
    return PRESSURES_2025[monthIndex % PRESSURES_2025.length];
  }
  return {
    source: "研究负责人",
    title: "本月判断需要同时服务研究和执行",
    detail: "信息永远不完整，组织仍然需要在截止时间前做决定。",
    tradeoff: "行动速度、证据质量和团队共识只能取舍，无法一起拉满。",
  };
}
