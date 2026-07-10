// ═══════════════════════════════════════════════════════════
// contentDemo.ts — 一章完整示范章节（可作为独立 demo 年份游玩）
//
// 目的：把三个叙事系统串成一次真实游玩，方便评审和写手照着抄。
//   1. 三方竞争假说（competingHypotheses）→ 每月注入一个「没有标准答案」节点
//   2. 知识卡（KnowledgeCard）→ 关键决策带 teaches，复盘时同事用自己声音教一句
//   3. 办公室道具（OfficeState）→ 不同类别决策累加便签/白板/咖啡杯
//
// 这个文件不依赖 content.ts（避免循环引用），只在运行时被 content.ts
// 的 buildMonthScene 在 actualYear === "demo" 时调用。
// ═══════════════════════════════════════════════════════════

import type {
  GameState,
  KnowledgeCard,
  MarketTheme,
  MentorId,
  MonthScene,
  ResearchDecision,
  SceneNode,
} from "../types";
import { d } from "./decisionFactory";

// 三位导师的基础信息（本地化，避免与 content.ts 形成循环依赖）。
const MENTORS: Record<MentorId, { name: string; role: string }> = {
  lin_ruoning: { name: "林若宁", role: "基本面研究员" },
  chen_xinghe: { name: "陈星禾", role: "量化/资金信号研究员" },
  zhou_mingzhao: { name: "周明昭", role: "宏观策略师" },
};

// ── 示范知识卡（带 teaches 的决策会把它送进玩家的研究札记）──
const CARD_CHAIN: KnowledgeCard = {
  id: "kc_demo_chain",
  concept: "产业链交叉验证",
  mentorId: "lin_ruoning",
  mentorLine: "别只看一个点。把上游、中游、下游的节奏差拆开，超额收益藏在断层里。",
  cfaRef: "CFA · 权益估值与产业链验证",
  tier: 1,
};
const CARD_CASH: KnowledgeCard = {
  id: "kc_demo_cash",
  concept: "回款才是收入",
  mentorId: "chen_xinghe",
  mentorLine: "订单不是收入，回款才是。预收和周转拆不开的，都是纸面富贵。",
  cfaRef: "CFA · 现金流质量",
  tier: 1,
};
const CARD_MARGIN: KnowledgeCard = {
  id: "kc_demo_margin",
  concept: "降价守住毛利",
  mentorId: "zhou_mingzhao",
  mentorLine: "降级里跑出来的不是最便宜的，是平价但更好用的。守不住毛利的升级是假升级。",
  cfaRef: "CFA · 毛利与周转",
  tier: 1,
};
const CARD_YIELD: KnowledgeCard = {
  id: "kc_demo_yield",
  concept: "良率爬坡才是入场券",
  mentorId: "lin_ruoning",
  mentorLine: "验证通过只是入场券，产线良率和复购才说明生意成没成。",
  cfaRef: "CFA · 制造业爬坡曲线",
  tier: 1,
};

// ── 12 个月主题（4 套循环复用，保证整年可玩且各有差异）──
// 每个主题都写了 competingHypotheses / businessOutcome / knownEvent，
// 让「三方竞争假说」节点和「业务事实结算」复盘都有料。
export const THEMES_DEMO: MarketTheme[] = [
  {
    id: "demo-ai-software",
    period: "一月",
    title: "低成本推理重构软件",
    publicContext:
      "开年，一家做办公协作的软件公司放出预告，说要把推理成本打下来一个数量级。市场把它当成又一个 AI 概念，讨论热度一下起来了。",
    protagonistMemory:
      "你记得后来这件事真正改变的不是股价，而是中小公司用得起大模型这件事本身——但你现在说不出哪个月落地、落地成什么样。",
    gameHook: "把未来记忆翻译成一个说得通的研究假设，再选一个你愿意负责的方向。",
    historicalPrototype: "设计注释：参考大模型推理成本下降带动应用爆发的产业规律，不对应任何具体公司。",
    knownEvent: "年底，行业里出现了一批按月付费、单价极低的标准化推理 API，中小团队真的开始把它们接进产品。",
    businessOutcome:
      "真实发生的是：推理单价年内降了约一个数量级，原本犹豫的小客户开始规模化接入，但这家公司自己没守住入口，份额被更底层的基础设施方吃掉了。生意变了，不是账面涨跌那么简单。",
    competingHypotheses: {
      lin: "我先看它的客户是不是真把产品用进了日常流程，留存和续费比发布会热闹重要。",
      chen: "订单流和算力采购数据会先动。如果它真在铺量，大单流向和供应商账期会提前说话。",
      zhou: "我盯估值分位和融资节奏。概念最热的时候往往最挤，得留好错了怎么办的位置。",
    },
  },
  {
    id: "demo-storage-export",
    period: "二月",
    title: "储能出海的账期游戏",
    publicContext:
      "一家做储能系统的公司拿下海外大单的消息传开，券商都在算它的产能利用率。但你注意到，合同里写着很长的账期。",
    protagonistMemory:
      "你记得后来出海大单分化得很厉害：有的真成了现金流，有的卡在回款和认证上，账面漂亮、钱回不来。",
    gameHook: "别被大单数字晃了眼。想清楚这笔生意的钱什么时候真正进口袋。",
    historicalPrototype: "设计注释：参考储能/光伏出海的回款与认证周期差异。",
    knownEvent: "年末复盘，真正跑出来的几家靠的是海外本地认证和售后网络，光有订单的设备商卡在回款上。",
    businessOutcome:
      "生意的真实形态是：订单不是收入，回款才是。认证和本地服务重的公司把账做成了现金，只拼出厂价的公司卡在应收账款里。框架比方向诚实。",
    competingHypotheses: {
      lin: "我拆它的海外收入质量和认证进度，光看在手订单会骗人。",
      chen: "我看应收账款周转和预收比例，钱没进口袋前，一切都是纸面富贵。",
      zhou: "我算汇率和贸易摩擦的尾部，大单越漂亮，越要留安全边际。",
    },
  },
  {
    id: "demo-value-up",
    period: "三月",
    title: "平价里的升级",
    publicContext:
      "消费数据看着冷，但几个平价连锁品牌同店还在涨。有人说是消费降级，有人说是性价比回归。",
    protagonistMemory:
      "你记得后来跑出来的不是最便宜的，也不是最贵的，是平价但更好用那档——供应链效率高的公司吃下了中间层。",
    gameHook: "在冷数据里找结构。降级和升级可能是一件事的两面。",
    historicalPrototype: "设计注释：参考性价比消费的结构性机会。",
    knownEvent: "年末，供应链效率高、SKU 周转快的那几家用平价吃下了中间价格带，纯低价和白牌反而被挤。",
    businessOutcome:
      "真实发生的是份额向效率型平价品牌集中，不是简单的大家都不花钱。能控住周转和损耗的，把降价做成了护城河。",
    competingHypotheses: {
      lin: "我去看同店和坪效，降级里谁拿到了真实客流谁就赢了。",
      chen: "我看高频支付和会员复购信号，结构比总量诚实。",
      zhou: "我看它能不能在降价同时守住毛利，守不住的升级是假升级。",
    },
  },
  {
    id: "demo-semi-equip",
    period: "四月",
    title: "设备替换的慢变量",
    publicContext:
      "一条国产半导体设备验证通过的消息被刷屏，但真正在产线上跑起来的比例，外人很难看清。",
    protagonistMemory:
      "你记得后来真正拉开差距的不是有没有做出来，而是能在几条线上稳不稳、良率爬坡快不快。",
    gameHook: "慢变量最容易被情绪淹没。把验证、爬坡、复购拆开看。",
    historicalPrototype: "设计注释：参考半导体设备国产化从验证到规模化的爬坡规律。",
    knownEvent: "年末，能在多条产线稳定跑、良率持续爬坡的少数几家拿到了重复订单，多数停留在样机新闻。",
    businessOutcome:
      "真实形态是：发布会上的突破和产线上的稳定是两件事。复购和良率曲线，比任何标题都更能说明生意成没成。",
    competingHypotheses: {
      lin: "我盯产线良率和复购，验证通过只是入场券。",
      chen: "我看设备招标量和预付款节奏，真下单和真跑是两笔账。",
      zhou: "我看地缘和补贴退坡的尾部，慢变量最怕政策急转弯。",
    },
  },
];

// 把前四套复制两轮，凑满 12 个月（不同月份只是换角度重述，不影响系统演示）。
for (let i = 0; i < 8; i++) {
  THEMES_DEMO.push({ ...THEMES_DEMO[i % 4], id: `demo-${i}-${THEMES_DEMO[i % 4].id}` });
}

// ── 每月决策池：4 套，按 monthIndex % 4 取用 ──
// 每套都覆盖多个类别，且至少一条带 teaches（知识卡），让复盘面板有东西教。
function pool0(): ResearchDecision[] {
  return [
    {
      ...d({
        id: "demo-a-deep",
        label: "连夜写《低成本推理对应用软件的影响》",
        category: "deep_research",
        description: "把上游算力、中游 API、下游应用拆成一条链，看钱到底留在哪一层。",
        to: "lin_ruoning",
        val: 4,
        fx: { researchCredibility: 12, committeeAdoption: 6, portfolioNav: 0.02, viewAccuracy: 10, fatigue: 10, lifeBalance: -6 },
        ev: 16, cl: 15, rk: 8, rf: 10,
        note: "深度研报是便签和白板一起长的时候。",
      }),
      framework: "lin_ruoning",
      teaches: CARD_CHAIN,
    },
    d({
      id: "demo-a-interview",
      label: "约一线 SaaS 创始人电话会，只问续费",
      category: "expert_interview",
      description: "研报会说漂亮话，经销商的库存和厂长的语气不会。去一线。",
      to: "lin_ruoning",
      val: 3,
      fx: { researchCredibility: 8, viewAccuracy: 8, clientFeedback: 4, fatigue: 4 },
      ev: 14, cl: 10, rk: 8, rf: 8,
    }),
    d({
      id: "demo-a-data",
      label: "拆算力采购与推理 API 调用量",
      category: "data_deep_dive",
      description: "价格会骗人，成交量不会。看真实调用量比看预告诚实。",
      to: "chen_xinghe",
      val: 4,
      fx: { researchCredibility: 9, viewAccuracy: 9, portfolioNav: 0.01, fatigue: 5 },
      ev: 15, cl: 12, rk: 8, rf: 6,
    }),
    d({
      id: "demo-a-risk",
      label: "写一份「推理成本不及预期」的风险提示",
      category: "risk_alert",
      description: "当所有人都觉得这回不一样，就是风险最大的时候。提醒冷静是守住边界。",
      to: "zhou_mingzhao",
      val: 4,
      fx: { researchCredibility: 6, committeeAdoption: 6, teamTrust: 4, fatigue: 2 },
      ev: 8, cl: 10, rk: 18, rf: 8,
    }),
    {
      ...d({
        id: "demo-a-help",
        label: "帮陈星禾校准因子输入",
        category: "help_colleague",
        description: "量化和基本面打架时，真理通常在中间。顺手帮一下，也是练自己的手感。",
        to: "chen_xinghe",
        val: 5,
        fx: { teamTrust: 8, researchCredibility: 4, fatigue: 4, lifeBalance: -2 },
        ev: 8, cl: 8, rk: 8, rf: 10,
      }),
      framework: "chen_xinghe",
    },
    d({
      id: "demo-a-rest",
      label: "准时下班，脑子留干净",
      category: "self_care",
      description: "连轴转的时候信噪比会塌。休息不是偷懒，是给模型留干净输入。",
      fx: { lifeBalance: 14, fatigue: -16, researchCredibility: 2, teamTrust: 2 },
      ev: 4, cl: 4, rk: 8, rf: 12,
    }),
    {
      ...d({
        id: "demo-a-peer",
        label: "午休时跟赵承宇去交易台看盘",
        category: "data_deep_dive",
        description: "研究说得再漂亮，没承接就是纸上谈兵。去看看真实买单怎么说话。",
        to: "zhao_chengyu",
        val: 5,
        fx: { viewAccuracy: 7, teamTrust: 8, researchCredibility: 3, fatigue: 3, lifeBalance: -2 },
        ev: 10, cl: 9, rk: 8, rf: 8,
        note: "实战派视角：成交是研究的试金石。",
      }),
      framework: "chen_xinghe",
    },
  ];
}

function pool1(): ResearchDecision[] {
  return [
    d({
      id: "demo-b-data",
      label: "拆应收账款周转和预收比例",
      category: "data_deep_dive",
      description: "钱没进口袋前，一切都是纸面富贵。先看周转，再看热闹。",
      to: "chen_xinghe",
      val: 4,
      fx: { researchCredibility: 10, viewAccuracy: 9, portfolioNav: 0.01, fatigue: 5 },
      ev: 15, cl: 13, rk: 10, rf: 6,
    }),
    d({
      id: "demo-b-interview",
      label: "问海外认证进度，而不是订单数字",
      category: "expert_interview",
      description: "认证和本地服务重的公司，才把账做成了现金。",
      to: "lin_ruoning",
      val: 3,
      fx: { researchCredibility: 8, viewAccuracy: 8, clientFeedback: 4, fatigue: 4 },
      ev: 14, cl: 10, rk: 8, rf: 8,
    }),
    {
      ...d({
        id: "demo-b-scenario",
        label: "把汇率与贸易摩擦嵌进情景模型",
        category: "deep_research",
        description: "大单越漂亮，越要留安全边际。把外生冲击写进模型，情景才真。",
        to: "zhou_mingzhao",
        val: 4,
        fx: { researchCredibility: 10, committeeAdoption: 6, portfolioNav: 0.015, fatigue: 8, lifeBalance: -4 },
        ev: 14, cl: 14, rk: 12, rf: 8,
      }),
      framework: "zhou_mingzhao",
      teaches: CARD_CASH,
    },
    d({
      id: "demo-b-risk",
      label: "写账期拉长导致的回款风险提示",
      category: "risk_alert",
      description: "先想清楚错了怎么办，再想对了赚多少。边界划不清，再对的判断也是赌。",
      to: "zhou_mingzhao",
      val: 4,
      fx: { researchCredibility: 6, committeeAdoption: 6, teamTrust: 4, fatigue: 2 },
      ev: 8, cl: 10, rk: 18, rf: 8,
    }),
    d({
      id: "demo-b-roadshow",
      label: "跟销售去路演，讲清楚账期结构",
      category: "roadshow",
      description: "把复杂逻辑讲成人能听懂的故事，是基本功。客户追问的那两个问题，就是框架的漏洞。",
      to: "lin_ruoning",
      val: 3,
      fx: { researchCredibility: 7, committeeAdoption: 5, clientFeedback: 6, fatigue: 5 },
      ev: 12, cl: 16, rk: 8, rf: 6,
    }),
    d({
      id: "demo-b-help",
      label: "帮林若宁补海外收入质量数据",
      category: "help_colleague",
      description: "帮人改模型，也是在练自己的手感。你今天搭的假设，明天会长回自己的框架里。",
      to: "lin_ruoning",
      val: 5,
      fx: { teamTrust: 8, researchCredibility: 4, fatigue: 4, lifeBalance: -2 },
      ev: 8, cl: 8, rk: 8, rf: 10,
    }),
  ];
}

function pool2(): ResearchDecision[] {
  return [
    {
      ...d({
        id: "demo-c-deep",
        label: "拆同店、坪效与周转，找结构",
        category: "deep_research",
        description: "降级和升级可能是一件事的两面。谁拿到真实客流，谁就赢了。",
        to: "lin_ruoning",
        val: 4,
        fx: { researchCredibility: 11, committeeAdoption: 5, portfolioNav: 0.015, viewAccuracy: 9, fatigue: 8, lifeBalance: -4 },
        ev: 15, cl: 14, rk: 8, rf: 8,
      }),
      framework: "lin_ruoning",
      teaches: CARD_MARGIN,
    },
    d({
      id: "demo-c-data",
      label: "看高频支付与会员复购信号",
      category: "data_deep_dive",
      description: "结构比总量诚实。复购曲线不会替你下结论，但会揭穿偷懒。",
      to: "chen_xinghe",
      val: 4,
      fx: { researchCredibility: 9, viewAccuracy: 9, portfolioNav: 0.01, fatigue: 5 },
      ev: 15, cl: 12, rk: 8, rf: 6,
    }),
    d({
      id: "demo-c-defense",
      label: "投委会上把概率和赔率都写出来",
      category: "committee_defense",
      description: "我只认一件事：你把概率和赔率都写出来了。这比喊方向专业。",
      to: "zhou_mingzhao",
      val: 4,
      fx: { researchCredibility: 7, committeeAdoption: 8, teamTrust: 4, fatigue: 4 },
      ev: 12, cl: 14, rk: 12, rf: 6,
    }),
    d({
      id: "demo-c-risk",
      label: "写「降价是否守住毛利」的风险提示",
      category: "risk_alert",
      description: "守不住毛利的升级是假升级。边界划不清，再对的判断也是赌。",
      to: "zhou_mingzhao",
      val: 3,
      fx: { researchCredibility: 6, committeeAdoption: 5, teamTrust: 3, fatigue: 2 },
      ev: 8, cl: 10, rk: 18, rf: 8,
    }),
    d({
      id: "demo-c-interview",
      label: "走访平价连锁的供应链负责人",
      category: "expert_interview",
      description: "能控住周转和损耗的，把降价做成了护城河。去问怎么做到的。",
      to: "lin_ruoning",
      val: 3,
      fx: { researchCredibility: 8, viewAccuracy: 8, clientFeedback: 4, fatigue: 4 },
      ev: 14, cl: 10, rk: 8, rf: 8,
    }),
    d({
      id: "demo-c-rest",
      label: "准时下班，脑子留干净",
      category: "self_care",
      description: "研究是马拉松。把自己熬没了，再好的框架也没人跑。",
      fx: { lifeBalance: 14, fatigue: -16, researchCredibility: 2, teamTrust: 2 },
      ev: 4, cl: 4, rk: 8, rf: 12,
    }),
  ];
}

function pool3(): ResearchDecision[] {
  return [
    {
      ...d({
        id: "demo-d-deep",
        label: "盯产线良率和复购，而不是验证新闻",
        category: "deep_research",
        description: "验证通过只是入场券，良率和复购才说明生意成没成。",
        to: "lin_ruoning",
        val: 4,
        fx: { researchCredibility: 12, committeeAdoption: 6, portfolioNav: 0.02, viewAccuracy: 10, fatigue: 9, lifeBalance: -5 },
        ev: 16, cl: 15, rk: 8, rf: 8,
      }),
      framework: "lin_ruoning",
      teaches: CARD_YIELD,
    },
    d({
      id: "demo-d-data",
      label: "拆设备招标量和预付款节奏",
      category: "data_deep_dive",
      description: "真下单和真跑是两笔账。预付款节奏比标题诚实。",
      to: "chen_xinghe",
      val: 4,
      fx: { researchCredibility: 9, viewAccuracy: 9, portfolioNav: 0.01, fatigue: 5 },
      ev: 15, cl: 12, rk: 8, rf: 6,
    }),
    d({
      id: "demo-d-interview",
      label: "问产线工程师爬坡曲线",
      category: "expert_interview",
      description: "良率爬坡快不快，工程师比新闻知道得早。去一线。",
      to: "lin_ruoning",
      val: 3,
      fx: { researchCredibility: 8, viewAccuracy: 8, clientFeedback: 4, fatigue: 4 },
      ev: 14, cl: 10, rk: 8, rf: 8,
    }),
    d({
      id: "demo-d-risk",
      label: "写补贴退坡与地缘尾部风险",
      category: "risk_alert",
      description: "慢变量最怕政策急转弯。先想清楚错了怎么办。",
      to: "zhou_mingzhao",
      val: 4,
      fx: { researchCredibility: 6, committeeAdoption: 6, teamTrust: 4, fatigue: 2 },
      ev: 8, cl: 10, rk: 18, rf: 8,
    }),
    d({
      id: "demo-d-help",
      label: "帮陈星禾校准招标量因子",
      category: "help_colleague",
      description: "量化和基本面打架时，真理通常在中间。顺手帮一下。",
      to: "chen_xinghe",
      val: 5,
      fx: { teamTrust: 8, researchCredibility: 4, fatigue: 4, lifeBalance: -2 },
      ev: 8, cl: 8, rk: 8, rf: 10,
    }),
    d({
      id: "demo-d-defense",
      label: "投委会陈述：用复购证明稳定",
      category: "committee_defense",
      description: "把概率和赔率都摆出来，比喊突破有用。",
      to: "zhou_mingzhao",
      val: 4,
      fx: { researchCredibility: 7, committeeAdoption: 8, teamTrust: 4, fatigue: 4 },
      ev: 12, cl: 14, rk: 12, rf: 6,
    }),
  ];
}

export function makeDecisionsDemo(monthIndex: number): ResearchDecision[] {
  switch (monthIndex % 4) {
    case 0:
      return pool0();
    case 1:
      return pool1();
    case 2:
      return pool2();
    case 3:
      return pool3();
    default:
      return pool0();
  }
}

// 三方竞争假说节点：demo 从第 0 月就展示，把「没有标准答案」直接顶到玩家面前。
function buildDemoCompetingNode(theme: MarketTheme, monthIndex: number): SceneNode {
  const ch = theme.competingHypotheses;
  const parts: string[] = [];
  if (ch?.lin) parts.push(`林若宁的基本面说：${ch.lin}`);
  if (ch?.chen) parts.push(`陈星禾的量价说：${ch.chen}`);
  if (ch?.zhou) parts.push(`周明昭的风控说：${ch.zhou}`);
  const body = parts.length > 0
    ? `${parts.join("；")}。没有哪个是标准答案——你站哪边，哪边就认你，哪边也会在后面盯着你。`
    : "三种框架摆在你面前，没有哪个是标准答案——你站哪边，哪边就认你，哪边也会在后面盯着你。";
  return {
    id: `demo-m${monthIndex}-competing`,
    type: "dialogue",
    characterId: "lin_ruoning",
    speaker: "三方视角",
    role: "没有标准答案",
    mood: "认真",
    text: body,
    prompt: "点击继续，进入本月研究选择。",
    pose: "thinking",
    bg: "research-room",
    bgm: "morning-loop",
    voiceCue: "key",
  };
}

export function buildDemoChapter(monthIndex: number, state?: GameState): MonthScene {
  const theme = THEMES_DEMO[monthIndex % THEMES_DEMO.length];
  // 叙述者按月轮换三位导师，让 demo 整年都能听到不同声音。
  const narratorOrder: MentorId[] = ["lin_ruoning", "chen_xinghe", "zhou_mingzhao"];
  const narrator = narratorOrder[monthIndex % narratorOrder.length];
  const m = MENTORS[narrator];

  const monthNum = monthIndex + 1;
  const year = "demo";
  const month = `${year}-${String(monthNum).padStart(2, "0")}`;
  const label = `示范 ${monthNum} 月`;

  const memoryNode: SceneNode = {
    id: `demo-m${monthIndex}-memory`,
    type: "dialogue",
    characterId: narrator,
    speaker: "内心独白",
    role: "只有你知道",
    mood: "判断",
    text: theme.protagonistMemory,
    prompt: "点击继续，把未来记忆整理成当下说得通的研究假设。",
    pose: "thinking",
    bg: "research-room",
    bgm: "morning-loop",
    voiceCue: "silent",
  };

  const competingNode: SceneNode | null =
    state && theme.competingHypotheses ? buildDemoCompetingNode(theme, monthIndex) : null;

  const colleagueNode: SceneNode = {
    id: `demo-m${monthIndex}-colleague`,
    type: "dialogue",
    characterId: narrator,
    speaker: m.name,
    role: m.role,
    mood: "认真",
    text: `${m.name}把一叠材料推到你手边：${theme.publicContext} ${theme.gameHook}`,
    prompt: "点击继续，进入本月研究选择。",
    pose: "soft",
    bg: "research-room",
    bgm: "morning-loop",
    voiceCue: "key",
  };

  // 同级同事赵承宇的插话：demo 章节从第一话就让他露面，证明投研部不只有女同事。
  // 他走友谊线、不进图鉴，framework 指给陈星禾避免塞知识卡。
  const peerNode: SceneNode = {
    id: `demo-m${monthIndex}-peer`,
    type: "dialogue",
    characterId: "zhao_chengyu",
    speaker: "赵承宇",
    role: "交易台同级同事",
    mood: "随意",
    text: "交易台那边的赵承宇探进头来：顾研究员，你又在会议室拆框架啦？你那套逻辑我信一半——另一半得看盘口认不认。回头带你看笔真实成交？",
    prompt: "点击继续，进入本月研究选择。",
    pose: "soft",
    bg: "research-room",
    bgm: "morning-loop",
    voiceCue: "key",
  };

  const decisions = makeDecisionsDemo(monthIndex);

  const decisionNode: SceneNode = {
    id: `demo-m${monthIndex}-decision`,
    type: "decision",
    characterId: narrator,
    speaker: m.name,
    role: m.role,
    mood: "认真",
    text: "先安排本话日程，然后选择一个你愿意负责到底的研究方向。选完后，同事会就你这一手教一句，研究室也会悄悄多一样东西。",
    prompt: theme.gameHook,
    pose: "smile",
    bg: "briefing-room",
    bgm: "morning-loop",
    voiceCue: "key",
    decisions,
    decisionPrompt: theme.gameHook,
    briefTitle: `${theme.period}：${theme.title}`,
    briefs: [
      { characterId: "lin_ruoning", label: "基本面视角", text: "看客户有没有真把产品用进日常，留存和续费比热闹重要。" },
      { characterId: "chen_xinghe", label: "量化信号", text: "成交量、订单流和周转会先于价格给出确认，量比价诚实。" },
      { characterId: "zhou_mingzhao", label: "宏观风控", text: "别只盯机会。能说清风险边界、估值分位和赔率，才有资格入场。" },
    ],
  };

  const nodes: SceneNode[] = [
    memoryNode,
    ...(competingNode ? [competingNode] : []),
    colleagueNode,
    peerNode,
    decisionNode,
  ];

  return { id: `demo-m${monthIndex}`, year, monthIndex, month, label, theme, nodes };
}
