import type { Branch, CharacterId, CharacterProfile, FocusAction, GameState, MarketTheme, MonthScene, ResearchDecision, SceneNode, StoryArc as StoryArcType } from "../types";
import { d } from "./decisionFactory";
import { activeBranches } from "./branching";
import { THEMES_2025, makeDecisions2025 } from "./content2025";
import { THEMES_2023, makeDecisions2023 } from "./content2023";
// Re-export StoryArc for engine.ts
export type StoryArc = StoryArcType;

// ═══════════════════════════════════════════════════════════
// Characters — 中国金融职场角色
// ═══════════════════════════════════════════════════════════

export const CHARACTERS: Record<CharacterId, CharacterProfile> = {
  lin_ruoning: {
    id: "lin_ruoning",
    name: "林若宁",
    role: "基本面研究员",
    tag: "基本面主线",
    color: "pink",
    intro: "会把研报贴上便签，也会认真盯着你的研究逻辑。",
    methodology: "产业链上下游交叉验证，业绩与订单的节奏差是超额来源。",
  },
  chen_xinghe: {
    id: "chen_xinghe",
    name: "陈星禾",
    role: "量化/资金信号研究员",
    tag: "量化信号线",
    color: "blue",
    intro: "抱着平板冲进会议室，习惯把大单流向、因子拥挤度和波动率曲面说成心跳。",
    methodology: "Barra 因子拆解 + 订单流信号。成交结构先于价格，量比价诚实。",
  },
  zhou_mingzhao: {
    id: "zhou_mingzhao",
    name: "周明昭",
    role: "宏观策略师",
    tag: "周期策略线",
    color: "lavender",
    intro: "看起来很安静，但总能在大家慌乱前标出拐点。",
    methodology: "估值-流动性-风险偏好三角。看拐点不看趋势，看赔率不看方向。",
  },
};

export const PROTAGONIST = {
  name: "顾行之",
  role: "新手研究员",
  intro: "你是投研部的新人，刚转正不久。没人知道的是，你带着未来三年的记忆回到了这个时间线。你不能直接喊方向，只能把未来的碎片翻译成当下能被验证的研究假设。林若宁、陈星禾、周明昭三位同事各有各的方法论，你的每一次选择都在她们的注视下——是跟着基本面交叉验证，还是相信量价信号，还是在风控框架里找安全边际。",
};

// 好感度门槛：跨过 AFFINITY_GATE 的角色会解锁专属桥段与「默契线」结局；
// 跨过 AFFINITY_TRUE 则在职业达标时解锁「心动线」真结局。
export const AFFINITY_GATE = 60;
export const AFFINITY_TRUE = 80;

// ═══════════════════════════════════════════════════════════
// Market Themes — 12个月金融主题（2024年历史事件为原型）
// ═══════════════════════════════════════════════════════════

const THEMES_2024: MarketTheme[] = [
  {
    id: "jan-crash",
    period: "一月",
    title: "流动性冲击与雪球敲入链",
    publicContext:
      "年初市场连续下跌，雪球产品集中敲入区被反复试探，两融预警和质押风险同时发酵。公开信息能看到指数跌幅和跌停家数，杠杆盘的连锁反应还在水面以下。",
    protagonistMemory:
      "你知道这次流动性冲击会触发政策响应，但节奏不是直线。把「要反弹」拆成三问：杠杆出清到什么程度、政策工具箱何时打开、哪些行业最先恢复成交。",
    gameHook: "在恐慌里保持研究纪律：是盯着跌幅抄底，还是先搞清楚谁在卖、谁在接。",
    historicalPrototype: "2024年1月市场急跌，雪球产品集中敲入、两融余额快速下降、中证500/1000加速下跌。",
  },
  {
    id: "feb-ai-sora",
    period: "二月",
    title: "节后回流与AI叙事扩散",
    publicContext:
      "海外AI大模型发布引发国内产业链重新定价，节后北向资金回流、两融回暖，AI光模块和应用方向成交集中爆发。但产业链各环节的受益顺序完全不同。",
    protagonistMemory:
      "你知道AI叙事会从算力向应用扩散，但扩散顺序不是线性。关键是把产业链拆成三层：上游硬件、中游平台、下游场景，每层的验证节奏不同。",
    gameHook: "节后最不缺的是概念，最缺的是对产业链上下游的硬化拆解。",
    historicalPrototype: "2024年2月Sora发布，AI光模块方向领涨，北向资金单周净买入超400亿。",
  },
  {
    id: "mar-policy",
    period: "三月",
    title: "政策窗口与设备更新链",
    publicContext:
      "产业政策和财政方向成为研报关键词。一份文件里某几个词的出现频次比去年翻了三倍，市场开始押注受益产业链，但文件到订单的传导需要时间。",
    protagonistMemory:
      "你知道政策脉冲常常先涨概念再验订单。真正重要的是你能区分哪些环节有真实需求增量、哪些只是文件里的高频词，而不是你有没有读懂文件。",
    gameHook: "把政策文件拆成：关键词频次变化、受益环节先后、业绩验证时点。",
    historicalPrototype: "2024年3月两会提出大规模设备更新和消费品以旧换新，相关产业链快速反应。",
  },
  {
    id: "apr-earnings",
    period: "四月",
    title: "一季报验证与国九条",
    publicContext:
      "一季报密集披露，前期概念股进入业绩验证。新监管文件重塑分红和退市预期，市场从主题炒作转向对基本面的重新定价。",
    protagonistMemory:
      "你知道一季报会是分水岭：能兑现业绩的方向会获得第二波资金，不能兑现的会迅速冷却。但兑现不是简单的同比增速，要拆结构：毛利率、现金流、在手订单。",
    gameHook: "同事们在讨论谁是财报季的黑马，你需要在概念和业绩之间搭建验证框架。",
    historicalPrototype: "2024年4月一季报披露期+新国九条发布，市场从微盘炒作转向业绩驱动。",
  },
  {
    id: "may-rotation",
    period: "五月",
    title: "地产政策与风格再平衡",
    publicContext:
      "地产政策出台引发金融地产链快速反弹，高股息与成长的资金争夺白热化。指数不低，但行业间的估值差到了极端位置。",
    protagonistMemory:
      "你知道风格切换常常在共识最强的时候反转。决定胜负的，是你有没有在切换前识别出拥挤度的信号。",
    gameHook: "陈星禾盯因子拥挤度，周明昭看估值分位数，林若宁关心业绩持续期。三种框架打架的时候，你的判断会被加倍验证。",
    historicalPrototype: "2024年5月517地产新政，地产链快速反弹后分化，红利与成长风格剧烈切换。",
  },
  {
    id: "jun-midyear",
    period: "六月",
    title: "中报预期与半导体周期",
    publicContext:
      "半年节点临近，市场提前交易中报景气和业绩弹性。半导体库存周期出现见底信号，AI下游应用开始有实质性订单传闻。",
    protagonistMemory:
      "你知道中报预期常常先涨后验。半导体周期的拐点要同时看库存、价格和产能利用率三个指标，缺一个都被动。",
    gameHook: "日程选择决定你是深挖库存周期数据，还是先帮同事对了模型，还是把生活平衡调回来。",
    historicalPrototype: "2024年6月半导体复苏预期升温，AI手机/AI PC概念扩散，中报展望期。",
  },
  {
    id: "jul-diffusion",
    period: "七月",
    title: "自动驾驶与暑期主题扩散",
    publicContext:
      "自动驾驶商业化落地新闻引发产业链扩散行情，从整车到激光雷达到高精地图，支线题材大量涌现。但扩散意味着鱼龙混杂，真正的龙头和跟风补涨需要仔细分辨。",
    protagonistMemory:
      "你知道扩散行情最大的陷阱是把补涨当主线。真正的信号是成交额排名能不能在产业链里稳定下来。",
    gameHook: "三个角色从不同维度拆解主题质量，你的选择决定团队的研究方向。",
    historicalPrototype: "2024年7月萝卜快跑引爆自动驾驶主题，产业链从整车向传感器、高精地图扩散。",
  },
  {
    id: "aug-review",
    period: "八月",
    title: "中报落地与市场筑底",
    publicContext:
      "中报披露让市场重新审视订单和利润率。部分前期热门的产业链出现业绩miss，估值面临修正压力。成交缩量，市场进入等待模式。",
    protagonistMemory:
      "你知道兑现后的分歧才是最考验研究框架的地方。业绩miss不一定是坏事。如果miss的原因是可逆的，反而是研究机会。",
    gameHook: "复盘会看你的观点命中率，更看你在偏差面前能不能诚实记录假设错在哪里。",
    historicalPrototype: "2024年8月中报密集披露，部分AI应用方向业绩不及预期，市场整体缩量筑底。",
  },
  {
    id: "sep-pivot",
    period: "九月",
    title: "政策转向与史诗级反弹",
    publicContext:
      "密集政策信号出现：货币政策、资本市场、房地产三条线同时发力。成交量在两周内从地量冲到天量，券商和金融IT成为情绪放大器。",
    protagonistMemory:
      "你知道这种级别的政策转向极其罕见，但真正的考验是在暴涨中保持风控框架，不被情绪裹挟，不被情绪裹挟。",
    gameHook: "陈星禾盯成交量和资金结构，周明昭评估政策力度是否超过历史极值，林若宁提醒你别忘记基本面验证的滞后性。",
    historicalPrototype: "2024年9月24日国新办发布会后政策组合拳，上证单日涨幅超4%，成交额破万亿。",
  },
  {
    id: "oct-ranking",
    period: "十月",
    title: "年末排名与情绪过热",
    publicContext:
      "机构排名压力释放，强势方向被继续抱团，一部分资金开始兑现利润。市场振幅放大，分歧加大。投委会开始讨论明年配置方向。",
    protagonistMemory:
      "你知道排名行情会放大人性。那些因为排名压力追进去的方向，往往在第二年一月就开始还债。",
    gameHook: "这次选择会影响投委会对你的采纳度和团队信任，也会暴露你在压力下的判断习惯。",
    historicalPrototype: "2024年10月市场在政策亢奋后进入震荡，科技成长方向交投活跃，机构排名博弈加剧。",
  },
  {
    id: "nov-valuation",
    period: "十一月",
    title: "估值切换与海外冲击",
    publicContext:
      "市场把视线移向下一年，估值切换和业绩展望成为主线。海外政策变化引发对出口链和科技产业链的重新定价。",
    protagonistMemory:
      "你知道年末最容易被忽视的风险是汇率和海外政策。估值切换不只是换个年份，要重新假设增速、利率和风险溢价三个变量。",
    gameHook: "把明年的想象空间转成当下可验证的研究主题。周明昭会盯海外变量，陈星禾会看北向资金行为。",
    historicalPrototype: "2024年11月特朗普胜选，市场交易关税和自主可控，出口链承压，半导体设备国产化受关注。",
  },
  {
    id: "dec-review",
    period: "十二月",
    title: "年度收官与跨年配置",
    publicContext:
      "全年主线进入结算期，债券牛市延续，股票市场在跨年配置和兑现压力之间摇摆。投委会开始制定下一年策略框架。",
    protagonistMemory:
      "你知道收官是下一轮研究档案的开头，不是结束。今年做对的和做错的，都会被写进明年的假设起点。",
    gameHook: "最终选择结算全年研究可信度、团队信任、生活平衡，决定你的研究员结局线。",
    historicalPrototype: "2024年12月债市延续牛市，股市震荡整理，机构跨年配置推动红利和消费方向。",
  },
];

// ═══════════════════════════════════════════════════════════
// Year-specific theme arrays imported from content2023.ts / content2025.ts
// THEMES_2024 is defined locally below
// ═══════════════════════════════════════════════════════════

export const YEAR_THEMES: Record<string, MarketTheme[]> = {
  "2023": THEMES_2023,
  "2024": THEMES_2024,
  "2025": THEMES_2025,
};

export function getTheme(year: string, monthIndex: number): MarketTheme {
  const themes = YEAR_THEMES[year] || THEMES_2024;
  return themes[monthIndex % themes.length];
}

// ═══════════════════════════════════════════════════════════
// Story Arcs — 12 章剧情
// ═══════════════════════════════════════════════════════════

export const STORY_ARCS: StoryArc[] = [
  {
    characterId: "lin_ruoning",
    title: "序章：第一张便签",
    speaker: "林若宁",
    role: "投研部前辈",
    mood: "温柔",
    line: "你在年初的投研部工位醒来，屏幕旁贴着一张便签：这次的研究记录，由我来监督你哦。",
    mission: "林若宁把四个研究方向摆在桌上。选一个，再安排本话日程。",
    theme: THEMES_2024[0],
  },
  {
    characterId: "lin_ruoning",
    title: "第一话：房租与模型",
    speaker: "林若宁",
    role: "基本面研究员",
    mood: "认真",
    line: "房租、通勤和咖啡预算同时报警。林若宁敲了敲你的桌面：模型改对了，才有资格想房租的事。",
    mission: "本话选择会影响你的研究可信度，看你拿不拿得出可以被验证的判断。",
    theme: THEMES_2024[1],
  },
  {
    characterId: "chen_xinghe",
    title: "第二话：量比价诚实",
    speaker: "陈星禾",
    role: "量化/资金信号研究员",
    mood: "兴奋",
    line: "午休还没开始，陈星禾就把平板推过来：今天早盘的订单流结构很有意思。大单净买集中在三个方向，但盘口厚度同时也在收窄。你觉得这是真放量还是脉冲？",
    mission: "陈星禾把因子拆解和订单流摆在你面前，帮她在四个研究方向里选一个她愿意下单的方向。",
    theme: THEMES_2024[2],
  },
  {
    characterId: "lin_ruoning",
    title: "第三话：雨夜交叉验证",
    speaker: "林若宁",
    role: "基本面研究员",
    mood: "温柔",
    line: "雨点敲着玻璃，林若宁把一叠财报推到桌子中间：这份中报，毛利率回升但经营现金流在降。你觉得这个数据矛盾该怎么解释？",
    mission: "选择本月研究路径：你是去深挖上下游合同和订单，还是先跟陈星禾对照成交数据，还是相信第一印象？",
    theme: THEMES_2024[3],
  },
  {
    characterId: "zhou_mingzhao",
    title: "第四话：拥挤度的警告",
    speaker: "周明昭",
    role: "宏观策略师",
    mood: "沉着",
    line: "周明昭在白板上画了一条估值分位数曲线：当一个方向被所有人挂在嘴边的时候，它的风险溢价已经接近于零。你们看到的是机会，我看到的是拥挤度。",
    mission: "本话要你在三种分析框架之间做判断：基本面、资金面还是宏观风控。周明昭不会直接给你答案，但她的白板不会骗人。",
    theme: THEMES_2024[4],
  },
  {
    characterId: "lin_ruoning",
    title: "第五话：分歧中的假设",
    speaker: "林若宁",
    role: "基本面研究员",
    mood: "害羞",
    line: "末班车里很安静。林若宁望着窗外：你上一次怀疑自己的判断是什么时候？我在想你的分析框架有没有漏掉关键变量，而不是在怀疑结果。",
    mission: "本话会拉开分歧：你相信估值终将回归、相信资金流向不可逆、还是相信你自己亲手验证过的数据？",
    theme: THEMES_2024[5],
  },
  {
    characterId: "chen_xinghe",
    title: "第六话：因子不会撒谎",
    speaker: "陈星禾",
    role: "量化/资金信号研究员",
    mood: "兴奋",
    line: "半年过去，很多人从自信变成了沉默。陈星禾调出一张因子收益热力图：你看，这几个月动量因子和波动率因子的相关性在飙升。市场在同时追涨和避险，这是教科书级的矛盾信号。",
    mission: "用一笔选择回答她：你的判断到底是靠框架验证出来的，还是靠直觉撑过来的。",
    theme: THEMES_2024[6],
  },
  {
    characterId: "zhou_mingzhao",
    title: "第七话：投委会陈述",
    speaker: "周明昭",
    role: "宏观策略师",
    mood: "观察",
    line: "投委会的灯亮起来。周明昭把你的研究记录标上记号：这次你没有只讲方向，你把概率和赔率都写出来了。这条线，开始有说服力了。",
    mission: "选对了方向，你从边缘座位进入主线讨论。选错了，明天继续改演示稿。",
    theme: THEMES_2024[7],
  },
  {
    characterId: "lin_ruoning",
    title: "第八话：谁的框架是对的",
    speaker: "林若宁",
    role: "基本面研究员",
    mood: "在意",
    line: "电话那头停顿了很久。林若宁说：这次我不替你选。三个同事有三种框架，我的基本面、陈星禾的量化信号、周明昭的风控。你决定跟谁站在一起，就会走进谁的叙事，就会走进谁的叙事。",
    mission: "四个选项背后是四种研究路线，结果会反馈在各个维度上。",
    theme: THEMES_2024[8],
  },
  {
    characterId: "chen_xinghe",
    title: "第九话：风口上的Alpha衰减",
    speaker: "陈星禾",
    role: "量化/资金信号研究员",
    mood: "高涨",
    line: "所有群都在刷同一个方向。陈星禾把alpha衰减曲线拉出来：三天前这个信号的预测力还在，今天已经掉到噪音区间了。你还想冲进去吗？",
    mission: "在喧嚣里选择：跟随市场情绪、逆向下注、还是等信号重新确认。",
    theme: THEMES_2024[9],
  },
  {
    characterId: "zhou_mingzhao",
    title: "第十话：年末排名战",
    speaker: "周明昭",
    role: "宏观策略师",
    mood: "紧张",
    line: "年末排名倒计时。周明昭难得露出笑意：有人为了排名放弃了方法论，有人守住了框架但落后了排名。你今年的研究档案，会成为哪种人？",
    mission: "这次选择决定结局基调：闪耀研究员、可靠打工人，还是疲劳值爆表的研究机器。",
    theme: THEMES_2024[10],
  },
  {
    characterId: "lin_ruoning",
    title: "终章：收盘后的约定",
    speaker: "林若宁",
    role: "基本面研究员",
    mood: "心动",
    line: "最后一个月，城市灯光像一张温柔的走势图。林若宁看着你：不要说赚了多少，告诉我你今年学到的框架，够不够陪你走进下一年。",
    mission: "完成最后一次选择，结算研究可信度、团队信任、生活平衡和三位同事关系。",
    theme: THEMES_2024[11],
  },
];

// ═══════════════════════════════════════════════════════════
// Monthly Decision Pool — 每月5-6个工作/生活选择
// ═══════════════════════════════════════════════════════════

// 决策工厂已抽离到 ./decisionFactory（d 从此处导入，供 2024 决策池使用）。

function makeResearchDecisions(year: string, monthIndex: number): ResearchDecision[] {
  // Route to year-specific decision pools
  if (year === "2025") {
    return makeDecisions2025(monthIndex);
  }
  if (year === "2023") {
    return makeDecisions2023(monthIndex);
  }
  // Default: 2024 decision pool
  const allMonths: ResearchDecision[][] = [
    // ══ 一月：流动性冲击与雪球敲入链 ══
    // 一月已用 d() 工厂重写（迁移范本）；二至十二月与 content2023/2025 按计划迁移。
    [
      d({
        id: "jan-leverage",
        label: "写《雪球产品敲入规模与剩余风险》",
        category: "deep_research",
        description: "估算雪球产品的敲入存量、两融预警比例和质押风险敞口，做一份市场恐慌程度的量化画像。",
        to: "zhou_mingzhao", val: 7,
        fx: { researchCredibility: 14, committeeAdoption: 8, portfolioNav: 0.02, viewAccuracy: 8, clientFeedback: 3, teamTrust: 6, fatigue: 12, lifeBalance: -8 },
        ev: 18, cl: 16, rk: 18, rf: 8,
        note: "杠杆出清程度是判断底部的最关键变量之一。",
      }),
      d({
        id: "jan-flow",
        label: "拆每日成交数据：谁在卖、谁在接",
        category: "data_deep_dive",
        description: "把每日成交按机构/散户/北向拆开，找出真正的恐慌性卖盘和逆势承接方。",
        to: "chen_xinghe", val: 8,
        fx: { researchCredibility: 10, committeeAdoption: 5, portfolioNav: 0.01, viewAccuracy: 10, clientFeedback: 4, teamTrust: 5, fatigue: 8, lifeBalance: -4 },
        ev: 16, cl: 14, rk: 14, rf: 6,
        note: "成交结构揭示的买卖力量对比，比指数跌幅本身更值得关注。",
      }),
      d({
        id: "jan-call",
        label: "约杠杆资金渠道验证真实压力",
        category: "expert_interview",
        description: "通过券商两融部门、衍生品台和私募渠道了解杠杆资金的实际承压情况和强平线分布。",
        to: "lin_ruoning", val: 5,
        fx: { researchCredibility: 8, committeeAdoption: 10, portfolioNav: 0.005, viewAccuracy: 7, clientFeedback: 8, teamTrust: 4, fatigue: 5, lifeBalance: -3 },
        ev: 12, cl: 12, rk: 12, rf: 4,
        note: "一手信息源提供了公开数据看不到的杠杆压力分布。",
      }),
      d({
        id: "jan-risk",
        label: "写《流动性冲击的历史复盘与政策响应规律》",
        category: "risk_alert",
        description: "复盘历史上类似流动性冲击的演化和政策干预时点，给出风险边界。",
        to: "zhou_mingzhao", val: 8,
        fx: { researchCredibility: 10, committeeAdoption: 6, portfolioNav: 0.005, viewAccuracy: 5, clientFeedback: 6, teamTrust: 7, fatigue: 6, lifeBalance: -3 },
        ev: 14, cl: 14, rk: 18, rf: 6,
        note: "历史不会重复，但杠杆出清的节奏往往有相似之处。",
      }),
      d({
        id: "jan-help",
        label: "帮林若宁更新行业估值表",
        category: "help_colleague",
        description: "在市场恐慌时，帮前辈把各行业最新估值和股息率拉出来。",
        to: "lin_ruoning", val: 10,
        fx: { researchCredibility: 4, committeeAdoption: 2, viewAccuracy: 3, clientFeedback: 2, teamTrust: 10, fatigue: 3, lifeBalance: -1 },
        ev: 6, cl: 6, rk: 8, rf: 2,
        note: "在最恐慌的时候帮同事梳理估值，本身就是一种研究态度。",
      }),
      d({
        id: "jan-rest",
        label: "按时下班，在恐慌中守住节奏",
        category: "self_care",
        description: "在市场最恐慌的时候，先确认自己的状态能不能支持理性判断。",
        to: "lin_ruoning", val: 2,
        fx: { viewAccuracy: 2, teamTrust: 1, fatigue: -12, lifeBalance: 12 },
        ev: 2, cl: 4, rk: 10, rf: 10,
        note: "带着恐慌做研究，不如带着清晰的头脑推开明天的门。",
      }),
],
    // ══ 二月：节后回流与AI叙事扩散 ══
    [
      d({
        id: "feb-chain",
        label: "做《AI产业链三层拆解：硬件-平台-应用》",
        category: "deep_research",
        description: "从光模块到推理平台到应用场景，逐层分析受益顺序、业绩验证节奏和估值合理性。",
        to: "lin_ruoning", val: 8,
        fx: { researchCredibility: 15, committeeAdoption: 7, portfolioNav: 0.02, viewAccuracy: 9, clientFeedback: 4, teamTrust: 5, fatigue: 11, lifeBalance: -7 },
        ev: 18, cl: 18, rk: 10, rf: 6,
        note: "产业链拆解是区分热点和主线的最有效工具。",
      }),
      d({
        id: "feb-factor",
        label: "跑Barra归因：拆AI方向的收益来源",
        category: "data_deep_dive",
        description: "用Barra因子模型拆解AI概念股的收益来源，看是动量驱动还是基本面因子在贡献。",
        to: "chen_xinghe", val: 10,
        fx: { researchCredibility: 10, committeeAdoption: 5, portfolioNav: 0.01, viewAccuracy: 8, clientFeedback: 3, teamTrust: 4, fatigue: 8, lifeBalance: -4 },
        ev: 16, cl: 14, rk: 14, rf: 6,
        note: "Barra归因显示动量因子贡献超过60%，基本面因子贡献不足20%，这是典型的事件驱动行情。",
      }),
      d({
        id: "feb-roadshow",
        label: "准备客户路演材料：AI投资框架",
        category: "roadshow",
        description: "把产业链拆解翻译成客户能理解的投资故事和配置建议。",
        to: "lin_ruoning", val: 5,
        fx: { researchCredibility: 5, committeeAdoption: 9, portfolioNav: 0.005, viewAccuracy: 5, clientFeedback: 12, teamTrust: 6, fatigue: 5, lifeBalance: -3 },
        ev: 8, cl: 12, rk: 8, rf: 3,
        note: "好的研究故事能把产业链逻辑转成客户听得懂的语言。",
      }),
      d({
        id: "feb-risk",
        label: "写风险提示：AI概念股估值与业绩的剪刀差",
        category: "risk_alert",
        description: "提醒团队注意：股价已经跑在盈利前面很远，需要给每个环节设验证节点。",
        to: "zhou_mingzhao", val: 7,
        fx: { researchCredibility: 8, committeeAdoption: 4, viewAccuracy: 6, clientFeedback: 5, teamTrust: 7, fatigue: 4, lifeBalance: -1 },
        ev: 12, cl: 14, rk: 18, rf: 6,
        note: "在所有人都在追AI的时候提醒估值风险，需要勇气也需要证据。",
      }),
      d({
        id: "feb-help",
        label: "帮陈星禾对因子回测结果",
        category: "help_colleague",
        description: "帮她复核AI概念股的因子暴露数据，确认回测没有幸存者偏差。",
        to: "chen_xinghe", val: 8,
        fx: { researchCredibility: 3, committeeAdoption: 2, portfolioNav: 0.005, viewAccuracy: 4, clientFeedback: 2, teamTrust: 9, fatigue: 4, lifeBalance: -1 },
        ev: 8, cl: 8, rk: 10, rf: 4,
        note: "帮同事复核数据既是协作也是学习，你帮陈星禾排掉了一个样本偏差。",
      }),
      d({
        id: "feb-life",
        label: "周末去健身房，把春节后的状态调回来",
        category: "self_care",
        description: "节后综合征加上行情亢奋，主动调整状态。",
        to: "chen_xinghe", val: 3,
        fx: { viewAccuracy: 2, teamTrust: 2, fatigue: -12, lifeBalance: 10 },
        ev: 2, cl: 4, rk: 8, rf: 10,
        note: "行情亢奋的时候保持体能，比多熬一个小时更有长期价值。",
      }),
],
    // ══ 三月：政策窗口与设备更新链 ══
    [
      d({
        id: "mar-policy",
        label: "写《大规模设备更新：受益产业链与验证节奏》",
        category: "deep_research",
        description: "拆解文件关键词频次变化，按受益先后排序产业链环节，标出每个环节的业绩验证时点。",
        to: "lin_ruoning", val: 8,
        fx: { researchCredibility: 15, committeeAdoption: 10, portfolioNav: 0.02, viewAccuracy: 8, clientFeedback: 5, teamTrust: 6, fatigue: 11, lifeBalance: -7 },
        ev: 18, cl: 17, rk: 10, rf: 6,
        note: "政策文件的频次变化本身就是一个可量化的信号，比经验判断靠谱。",
      }),
      d({
        id: "mar-field",
        label: "参加行业论坛，找设备商和下游聊",
        category: "expert_interview",
        description: "在政策解读论坛上接触设备制造商、工程商和终端用户，了解真实订单节奏。",
        to: "zhou_mingzhao", val: 5,
        fx: { researchCredibility: 6, committeeAdoption: 7, portfolioNav: 0.005, viewAccuracy: 9, clientFeedback: 7, teamTrust: 8, fatigue: 4, lifeBalance: -2 },
        ev: 12, cl: 10, rk: 10, rf: 4,
        note: "和下游聊一圈后发现，文件到订单的传导比市场预期的慢一两个季度。",
      }),
      d({
        id: "mar-orderflow",
        label: "追踪设备更新链的订单流和成交结构",
        category: "data_deep_dive",
        description: "紧盯受益板块的每日大单流向、盘口深度和成交集中度。",
        to: "chen_xinghe", val: 8,
        fx: { researchCredibility: 8, committeeAdoption: 5, portfolioNav: 0.01, viewAccuracy: 7, clientFeedback: 3, teamTrust: 4, fatigue: 7, lifeBalance: -3 },
        ev: 14, cl: 10, rk: 12, rf: 4,
        note: "订单流显示机构资金在逐步进入但散户还在观望，这是典型的早期信号。",
      }),
      d({
        id: "mar-hype",
        label: "追逐政策热点，快速覆盖所有相关标的",
        category: "risk_alert",
        description: "第一时间覆盖所有文件里提到的高频词相关公司。",
        to: "lin_ruoning", val: -4,
        fx: { researchCredibility: -4, committeeAdoption: 4, portfolioNav: 0.005, viewAccuracy: -6, clientFeedback: 5, teamTrust: -2, fatigue: 10, lifeBalance: -5 },
        ev: 2, cl: 2, rk: 2, rf: 2,
        note: "热点追逐在短期获得了关注，但复盘后发现多处逻辑跳跃和事实错误。",
      }),
      d({
        id: "mar-defense",
        label: "在投委会做政策解读答辩",
        category: "committee_defense",
        description: "把你的政策分析框架拿到投委会上过一遍，接受交叉提问。",
        to: "zhou_mingzhao", val: 8,
        fx: { researchCredibility: 8, committeeAdoption: 14, portfolioNav: 0.005, viewAccuracy: 6, clientFeedback: 6, teamTrust: 8, fatigue: 6, lifeBalance: -3 },
        ev: 10, cl: 16, rk: 12, rf: 6,
        note: "投委会对你的政策拆解框架表示认可，但追问了三个验证节点，这恰好是你最有价值的收获。",
      }),
      d({
        id: "mar-rest",
        label: "请假回家看父母，政策解读不急这两天",
        category: "self_care",
        description: "在政策窗口最紧张的时候，选择回家。",
        to: "lin_ruoning", val: 3,
        fx: { committeeAdoption: -3, teamTrust: -1, fatigue: -15, lifeBalance: 15 },
        ev: 2, cl: 2, rk: 6, rf: 10,
        note: "错过了政策解读的第一波讨论，但带着更清晰的头脑回到了周一晨会。",
      }),
],
    // ══ 四月：一季报验证与国九条 ══
    [
      d({
        id: "apr-cross",
        label: "做一季报交叉验证：毛利率×经营现金流×在手订单",
        category: "deep_research",
        description: "不只看同比增速，拆成三个维度交叉验证。把前期研究假设和实际财报逐条对照。",
        to: "lin_ruoning", val: 10,
        fx: { researchCredibility: 16, committeeAdoption: 8, portfolioNav: 0.02, viewAccuracy: 12, clientFeedback: 4, teamTrust: 6, fatigue: 10, lifeBalance: -5 },
        ev: 18, cl: 18, rk: 12, rf: 8,
        note: "交叉验证是区分真实业绩和会计调节的最有效方法。",
      }),
      d({
        id: "apr-dividend",
        label: "做新规下的分红与退市预期专题",
        category: "data_deep_dive",
        description: "按新监管文件的标准筛选可能受影响的标的，做出分红可持续性评估模型。",
        to: "zhou_mingzhao", val: 7,
        fx: { researchCredibility: 12, committeeAdoption: 10, portfolioNav: 0.01, viewAccuracy: 7, clientFeedback: 6, teamTrust: 5, fatigue: 8, lifeBalance: -4 },
        ev: 16, cl: 14, rk: 14, rf: 6,
        note: "新规重塑的不只是退市规则，更是市场对「好公司」的定义。",
      }),
      d({
        id: "apr-present",
        label: "在晨会上做业绩回顾与框架对照",
        category: "roadshow",
        description: "把一季度验证结果用简洁的方式呈现给团队，标注每一个假设的验证状态。",
        to: "zhou_mingzhao", val: 5,
        fx: { researchCredibility: 6, committeeAdoption: 10, portfolioNav: 0.005, viewAccuracy: 6, clientFeedback: 6, teamTrust: 8, fatigue: 4, lifeBalance: -2 },
        ev: 8, cl: 14, rk: 8, rf: 6,
        note: "清晰的汇报让团队对你的研究框架有了更强的信任。",
      }),
      d({
        id: "apr-skip",
        label: "扫一眼净利润增速就下判断",
        category: "risk_alert",
        description: "一季报太细碎了，先看净利润增速排名再说。",
        to: "lin_ruoning", val: -6,
        fx: { researchCredibility: -6, committeeAdoption: 2, portfolioNav: -0.01, viewAccuracy: -10, clientFeedback: -2, teamTrust: -3, fatigue: -2, lifeBalance: 2 },
        ev: 2, cl: 2, rk: 2, rf: 2,
        note: "只看净利润增速漏掉了毛利率下滑和现金流恶化，这是最典型的韭菜式研究。",
      }),
      d({
        id: "apr-help",
        label: "帮周明昭跑宏观变量对行业利润率的回归",
        category: "help_colleague",
        description: "帮她把宏观指标（利率、汇率、PPI）和各行业毛利率的历史回归跑出来。",
        to: "zhou_mingzhao", val: 9,
        fx: { researchCredibility: 4, committeeAdoption: 3, viewAccuracy: 5, clientFeedback: 2, teamTrust: 10, fatigue: 5, lifeBalance: -1 },
        ev: 10, cl: 10, rk: 8, rf: 4,
        note: "帮周明昭跑回归的同时，你也在建立宏观和行业的映射框架。",
      }),
      d({
        id: "apr-life",
        label: "周末和朋友短途旅行，财报季也喘口气",
        category: "self_care",
        description: "财报季压力最大的时候，给自己放两天假。",
        to: "chen_xinghe", val: 4,
        fx: { committeeAdoption: -2, clientFeedback: -1, teamTrust: -1, fatigue: -14, lifeBalance: 14 },
        ev: 2, cl: 4, rk: 6, rf: 12,
        note: "在所有人都在加班看财报的时候离开两天，需要勇气，也需要对自己的节奏有信心。",
      }),
],
    // ══ 五月：地产政策与风格再平衡 ══
    [
      d({
        id: "may-style",
        label: "做风格轮动专题：红利vs成长的历史剪刀差",
        category: "deep_research",
        description: "分析历史上红利和成长风格剪刀差的极端值回归规律，当前处于什么分位，回归的触发条件是什么。",
        to: "zhou_mingzhao", val: 8,
        fx: { researchCredibility: 12, committeeAdoption: 8, portfolioNav: 0.015, viewAccuracy: 8, clientFeedback: 5, teamTrust: 5, fatigue: 9, lifeBalance: -5 },
        ev: 16, cl: 16, rk: 14, rf: 6,
        note: "风格剪刀差已经到了历史极端，均值回归的概率在积累，但触发时点不确定。",
      }),
      d({
        id: "may-crowding",
        label: "跑因子拥挤度分析：哪个风格已经人满为患",
        category: "data_deep_dive",
        description: "用持仓集中度、换手率加速和因子波动率三个指标评估各风格的拥挤程度。",
        to: "chen_xinghe", val: 10,
        fx: { researchCredibility: 10, committeeAdoption: 6, portfolioNav: 0.01, viewAccuracy: 9, clientFeedback: 4, teamTrust: 4, fatigue: 7, lifeBalance: -3 },
        ev: 16, cl: 12, rk: 18, rf: 6,
        note: "因子拥挤度显示红利因子已经处在历史最高拥挤区间，反转风险在累积。",
      }),
      d({
        id: "may-debate",
        label: "组织内部风格辩论会：三框架交叉验证",
        category: "roadshow",
        description: "邀请基本面、量化和宏观三个视角的同事碰撞观点。",
        to: "chen_xinghe", val: 6,
        fx: { researchCredibility: 6, committeeAdoption: 8, portfolioNav: 0.005, viewAccuracy: 6, clientFeedback: 4, teamTrust: 12, fatigue: 4, lifeBalance: -2 },
        ev: 10, cl: 12, rk: 10, rf: 6,
        note: "三个框架碰撞出的共识比任何单个框架都更可靠，但共识本身也可能是拥挤的信号。",
      }),
      d({
        id: "may-fomo",
        label: "追最强的风格，不管因子逻辑",
        category: "risk_alert",
        description: "哪个风格涨得好就跟哪个。",
        to: "zhou_mingzhao", val: -6,
        fx: { researchCredibility: -6, committeeAdoption: 2, portfolioNav: 0.005, viewAccuracy: -12, clientFeedback: 1, teamTrust: -4, fatigue: 6, lifeBalance: -3 },
        ev: 2, cl: 2, rk: 2, rf: 2,
        note: "追最强势风格是散户的反射，不是研究员的判断。",
      }),
      d({
        id: "may-field",
        label: "调研地产链上下游真实成交和库存",
        category: "expert_interview",
        description: "不靠新闻标题判断，去一线了解真实成交、去化率和库存周期。",
        to: "lin_ruoning", val: 7,
        fx: { researchCredibility: 8, committeeAdoption: 6, portfolioNav: 0.005, viewAccuracy: 10, clientFeedback: 7, teamTrust: 5, fatigue: 6, lifeBalance: -3 },
        ev: 14, cl: 12, rk: 10, rf: 4,
        note: "一线调研显示政策传导比市场预期的慢一两个季度，但方向在改善。",
      }),
      d({
        id: "may-life",
        label: "下班后去学一门新技能，风格混乱时投资自己",
        category: "self_care",
        description: "在风格混乱的月份，投资自己。",
        to: "chen_xinghe", val: 4,
        fx: { researchCredibility: 2, viewAccuracy: 2, fatigue: -8, lifeBalance: 10 },
        ev: 2, cl: 4, rk: 6, rf: 12,
        note: "风格切换时最危险的是瞎动。有时候最好的交易是不交易，最好的研究是投资自己。",
      }),
],
    // ══ 六月-十二月见下方（模板模式相同） ══
    // 六月：中报预期与半导体周期
    [
      d({
        id: "jun-cycle",
        label: "做半导体库存周期专题：量价利三维验证",
        category: "deep_research",
        description: "同时看库存水位、价格走势和产能利用率，三个指标缺一不可。",
        to: "lin_ruoning", val: 8,
        fx: { researchCredibility: 14, committeeAdoption: 8, portfolioNav: 0.02, viewAccuracy: 9, clientFeedback: 5, teamTrust: 6, fatigue: 10, lifeBalance: -6 },
        ev: 18, cl: 18, rk: 12, rf: 6,
        note: "半导体周期的拐点要三个指标同时确认，单看任何一个都可能出错。",
      }),
      d({
        id: "jun-flow",
        label: "做产业链上下游订单流穿透分析",
        category: "data_deep_dive",
        description: "从设备商订单到晶圆厂利用率到芯片出货量，逐层穿透。",
        to: "chen_xinghe", val: 9,
        fx: { researchCredibility: 10, committeeAdoption: 6, portfolioNav: 0.01, viewAccuracy: 8, clientFeedback: 3, teamTrust: 5, fatigue: 8, lifeBalance: -4 },
        ev: 16, cl: 12, rk: 12, rf: 4,
        note: "订单流穿透是最直接的产业验证手段，订单不会说谎。",
      }),
      d({
        id: "jun-client",
        label: "给重点客户做一对一沟通，对齐中报预期",
        category: "roadshow",
        description: "在中报前与客户对齐预期，展示你的研究框架。",
        to: "zhou_mingzhao", val: 5,
        fx: { researchCredibility: 5, committeeAdoption: 7, portfolioNav: 0.005, viewAccuracy: 5, clientFeedback: 12, teamTrust: 6, fatigue: 5, lifeBalance: -3 },
        ev: 6, cl: 12, rk: 8, rf: 4,
        note: "客户对你的框架表示认可，但也追问了两个你的假设还没覆盖的风险点。",
      }),
      d({
        id: "jun-overconfident",
        label: "过度自信，重仓押注单一链条",
        category: "risk_alert",
        description: "觉得自己看准了半导体周期底部，把推荐集中在一个方向。",
        to: "lin_ruoning", val: -5,
        fx: { researchCredibility: -4, portfolioNav: -0.015, viewAccuracy: -6, clientFeedback: -4, teamTrust: -5, fatigue: 6, lifeBalance: -4 },
        ev: 2, cl: 2, rk: 2, rf: 4,
        note: "集中推荐在验证不通过时的损失会被放大。分散是对不确定性的尊重。",
      }),
      d({
        id: "jun-defense",
        label: "投委会答辩：半导体周期的买入信号",
        category: "committee_defense",
        description: "把你的半导体周期分析框架拿到投委会，接受交叉提问。",
        to: "zhou_mingzhao", val: 8,
        fx: { researchCredibility: 8, committeeAdoption: 12, portfolioNav: 0.005, viewAccuracy: 6, clientFeedback: 5, teamTrust: 7, fatigue: 6, lifeBalance: -3 },
        ev: 10, cl: 16, rk: 12, rf: 8,
        note: "投委会认可了你的框架逻辑，但要求补充下游订单验证数据，这是有价值的反馈。",
      }),
      d({
        id: "jun-life",
        label: "周末带家人去郊游，半年过去了",
        category: "self_care",
        description: "半年过去了，陪陪家人。",
        to: "lin_ruoning", val: 4,
        fx: { viewAccuracy: 2, fatigue: -12, lifeBalance: 14 },
        ev: 2, cl: 4, rk: 6, rf: 12,
        note: "半年复盘比多熬一个夜更有价值。家人的一句「你最近看起来好累」本身就是信号。",
      }),
],
    // 七月：自动驾驶与暑期主题扩散
    [
      d({
        id: "jul-chain",
        label: "做自动驾驶产业链深度拆解：从整车到传感器",
        category: "deep_research",
        description: "从上游传感器到中游平台到下游运营，逐层分析技术壁垒、竞争格局和受益确定性。",
        to: "lin_ruoning", val: 8,
        fx: { researchCredibility: 14, committeeAdoption: 7, portfolioNav: 0.02, viewAccuracy: 8, clientFeedback: 4, teamTrust: 6, fatigue: 10, lifeBalance: -5 },
        ev: 18, cl: 18, rk: 10, rf: 6,
        note: "产业链拆解发现激光雷达环节的技术壁垒最高，但估值也已经最贵。",
      }),
      d({
        id: "jul-signal",
        label: "做扩散行情真伪识别：量价信号过滤",
        category: "data_deep_dive",
        description: "用成交额稳定性、大单占比和换手率趋势三个指标，过滤掉蹭概念的伪扩散。",
        to: "chen_xinghe", val: 10,
        fx: { researchCredibility: 10, committeeAdoption: 5, portfolioNav: 0.015, viewAccuracy: 10, clientFeedback: 3, teamTrust: 5, fatigue: 7, lifeBalance: -3 },
        ev: 16, cl: 12, rk: 14, rf: 4,
        note: "陈星禾的量价过滤模型帮你排掉了至少三四个蹭概念的伪扩散标的。",
      }),
      d({
        id: "jul-share",
        label: "组织团队分享会，交叉验证各支线判断",
        category: "roadshow",
        description: "让每个人分享自己覆盖的支线，交叉验证。",
        to: "chen_xinghe", val: 7, rx: [{ characterId: "lin_ruoning", value: 5 }],
        fx: { researchCredibility: 6, committeeAdoption: 6, portfolioNav: 0.005, viewAccuracy: 6, clientFeedback: 4, teamTrust: 12, fatigue: 4, lifeBalance: -1 },
        ev: 8, cl: 10, rk: 10, rf: 6,
        note: "三个人的覆盖范围交叉后，发现了两个被市场忽视的子环节。",
      }),
      d({
        id: "jul-chase",
        label: "追着涨幅最大的支线跑",
        category: "risk_alert",
        description: "哪条支线涨得最猛就研究哪条。",
        to: "zhou_mingzhao", val: -5,
        fx: { researchCredibility: -6, committeeAdoption: 2, portfolioNav: 0.005, viewAccuracy: -8, clientFeedback: 2, teamTrust: -3, fatigue: 8, lifeBalance: -4 },
        ev: 2, cl: 2, rk: 2, rf: 2,
        note: "追涨是交易员的工作，研究员的任务是找到涨的理由，或者找到不应该涨的理由。",
      }),
      d({
        id: "jul-field",
        label: "调研自动驾驶运营方的真实数据和成本",
        category: "expert_interview",
        description: "去一线了解自动驾驶的商业化进度、单车成本和运营效率。",
        to: "lin_ruoning", val: 6,
        fx: { researchCredibility: 7, committeeAdoption: 5, portfolioNav: 0.005, viewAccuracy: 10, clientFeedback: 6, teamTrust: 5, fatigue: 5, lifeBalance: -2 },
        ev: 14, cl: 10, rk: 10, rf: 4,
        note: "一线调研发现运营成本比市场预期的要高30%，这是公开信息不会告诉你的。",
      }),
      d({
        id: "jul-life",
        label: "暑假请年假去海边，在扩散行情中保持清醒",
        category: "self_care",
        description: "市场在扩散，你在度假。",
        to: "chen_xinghe", val: 4,
        fx: { researchCredibility: -1, committeeAdoption: -3, viewAccuracy: 2, teamTrust: -2, fatigue: -16, lifeBalance: 16 },
        ev: 2, cl: 4, rk: 8, rf: 14,
        note: "在所有人都在追扩散的时候度假，需要勇气。回来时你发现真正的主线比离开前更清晰了。",
      }),
],
    // 八月-十二月使用相似的5-6选模板
    // 八月：中报落地与市场筑底
    [
      d({
        id: "aug-review",
        label: "写详细中报复盘报告：假设对照与偏差记录",
        category: "deep_research",
        description: "逐条对照预期和实际，诚实记录每一个判断偏差和偏差的原因。",
        to: "lin_ruoning", val: 10,
        fx: { researchCredibility: 16, committeeAdoption: 8, portfolioNav: 0.01, viewAccuracy: 14, clientFeedback: 5, teamTrust: 7, fatigue: 8, lifeBalance: -4 },
        ev: 18, cl: 18, rk: 14, rf: 14,
        note: "复盘的意义是把今年的偏差变成明年的假设起点，而不是自责。",
      }),
      d({
        id: "aug-bargain",
        label: "找业绩miss但逻辑未破的错杀标的",
        category: "data_deep_dive",
        description: "在中报miss的公司里，筛选出miss原因可逆、长期逻辑未破的标的。",
        to: "chen_xinghe", val: 7,
        fx: { researchCredibility: 12, committeeAdoption: 6, portfolioNav: 0.015, viewAccuracy: 9, clientFeedback: 4, teamTrust: 5, fatigue: 8, lifeBalance: -4 },
        ev: 16, cl: 14, rk: 12, rf: 6,
        note: "错杀是研究员最好的朋友，但前提是你能证明它被错杀而不是该杀。",
      }),
      d({
        id: "aug-present",
        label: "在投委会做中报复盘汇报",
        category: "committee_defense",
        description: "把你的复盘结论呈现给决策者，接受交叉提问。",
        to: "zhou_mingzhao", val: 8,
        fx: { researchCredibility: 9, committeeAdoption: 14, portfolioNav: 0.005, viewAccuracy: 7, clientFeedback: 7, teamTrust: 8, fatigue: 5, lifeBalance: -3 },
        ev: 10, cl: 16, rk: 12, rf: 10,
        note: "投委会对你的复盘框架表示认可，「诚实比正确更重要」让你在团队中赢得了尊重。",
      }),
      d({
        id: "aug-blame",
        label: "把失误归咎于市场不可预测",
        category: "risk_alert",
        description: "不反思自己的研究框架，把锅甩给市场。",
        to: "lin_ruoning", val: -8,
        fx: { researchCredibility: -10, committeeAdoption: -6, portfolioNav: -0.005, viewAccuracy: -5, clientFeedback: -6, teamTrust: -10, fatigue: 1 },
        ev: 2, cl: 2, rk: 2, rf: 0,
        note: "甩锅是职业生涯最快的退步方式。市场永远是对的，但研究框架可以越来越好。",
      }),
      d({
        id: "aug-help",
        label: "帮林若宁重建中报后的估值模型",
        category: "help_colleague",
        description: "中报后很多公司的估值假设需要更新，帮前辈把核心覆盖标的的模型跑一遍。",
        to: "lin_ruoning", val: 12,
        fx: { researchCredibility: 5, committeeAdoption: 3, portfolioNav: 0.005, viewAccuracy: 5, clientFeedback: 3, teamTrust: 12, fatigue: 5, lifeBalance: -2 },
        ev: 8, cl: 8, rk: 6, rf: 6,
        note: "帮她改模型的过程，也是你在学习她的估值框架，这是最好的在职培训。",
      }),
      d({
        id: "aug-life",
        label: "下班后不再看行情，去散步",
        category: "self_care",
        description: "中报季结束了，给自己一个真正的休息。",
        to: "zhou_mingzhao", val: 3,
        fx: { viewAccuracy: 3, fatigue: -10, lifeBalance: 12 },
        ev: 2, cl: 4, rk: 6, rf: 12,
        note: "中报季后如果不休息，疲劳会一路带到四季度，那时候才是真正的马拉松。",
      }),
],
    // 九月：政策转向与史诗级反弹
    [
      d({
        id: "sep-policy",
        label: "写政策组合拳深度拆解：力度×节奏×传导",
        category: "deep_research",
        description: "把货币、资本市场、地产三条线的政策拆开，量化评估力度是否超过历史极值，模拟传导路径和时间。",
        to: "zhou_mingzhao", val: 10,
        fx: { researchCredibility: 15, committeeAdoption: 12, portfolioNav: 0.03, viewAccuracy: 8, clientFeedback: 5, teamTrust: 7, fatigue: 12, lifeBalance: -7 },
        ev: 18, cl: 18, rk: 14, rf: 8,
        note: "这次政策的力度和密度都是历史级别的。真正的考验是在亢奋中保持冷静。",
      }),
      d({
        id: "sep-orderflow",
        label: "盯成交额和资金结构：天量背后的质量",
        category: "data_deep_dive",
        description: "把天量成交拆成机构、游资、散户和北向，看谁在主导这波反弹。",
        to: "chen_xinghe", val: 10,
        fx: { researchCredibility: 10, committeeAdoption: 7, portfolioNav: 0.02, viewAccuracy: 9, clientFeedback: 4, teamTrust: 5, fatigue: 8, lifeBalance: -4 },
        ev: 16, cl: 12, rk: 14, rf: 6,
        note: "天量成交结构显示游资和散户是主力，机构在第二周才开始加仓，这既是风险信号，也是机会信号。",
      }),
      d({
        id: "sep-roadshow",
        label: "紧急准备客户沟通：反弹框架和风险边界",
        category: "roadshow",
        description: "客户在暴涨中情绪分裂，有人狂喜有人恐慌，你需要给出冷静的框架。",
        to: "lin_ruoning", val: 6,
        fx: { researchCredibility: 7, committeeAdoption: 8, portfolioNav: 0.01, viewAccuracy: 6, clientFeedback: 14, teamTrust: 8, fatigue: 7, lifeBalance: -4 },
        ev: 8, cl: 14, rk: 12, rf: 6,
        note: "在你最需要冷静的时候，客户最需要框架。给出框架的人，最终会被记住。",
      }),
      d({
        id: "sep-fomo",
        label: "满仓追涨，不管风险",
        category: "risk_alert",
        description: "市场在暴涨，怕踏空比怕亏损更难受。",
        to: "zhou_mingzhao", val: -8,
        fx: { researchCredibility: -8, committeeAdoption: 3, portfolioNav: 0.015, viewAccuracy: -10, clientFeedback: -3, teamTrust: -5, fatigue: 8, lifeBalance: -6 },
        ev: 2, cl: 2, rk: 0, rf: 0,
        note: "在史诗级反弹中踏空确实痛苦，但满仓追涨之后的回撤会让你怀疑自己的职业判断。",
      }),
      d({
        id: "sep-defense",
        label: "投委会紧急会议：这次反弹能持续多久",
        category: "committee_defense",
        description: "投委会需要你给出冷静的分析：反弹的持续时间、空间和风险点。",
        to: "zhou_mingzhao", val: 10,
        fx: { researchCredibility: 10, committeeAdoption: 14, portfolioNav: 0.01, viewAccuracy: 7, clientFeedback: 6, teamTrust: 8, fatigue: 8, lifeBalance: -5 },
        ev: 12, cl: 16, rk: 16, rf: 8,
        note: "在所有人都在喊牛市的时候，敢于在投委会给出风险边界的人，才是真正的风控意识。",
      }),
      d({
        id: "sep-life",
        label: "市场暴涨时按时下班，守住节奏",
        category: "self_care",
        description: "在所有人都兴奋得睡不着的时候，你选择按时下班。",
        to: "lin_ruoning", val: 4,
        fx: { committeeAdoption: -2, viewAccuracy: 3, clientFeedback: -1, teamTrust: 1, fatigue: -12, lifeBalance: 10 },
        ev: 2, cl: 4, rk: 12, rf: 10,
        note: "在暴涨中保持作息，说明你对市场波动有了抗体。这是研究员最稀缺的心理素质。",
      }),
],
    // 十月：年末排名与情绪过热
    [
      d({
        id: "oct-ranking",
        label: "做排名博弈专题：机构持仓与抱团方向",
        category: "deep_research",
        description: "分析机构持仓结构、排名压力和可能的抱团推升方向。",
        to: "zhou_mingzhao", val: 7,
        fx: { researchCredibility: 11, committeeAdoption: 8, portfolioNav: 0.015, viewAccuracy: 7, clientFeedback: 6, teamTrust: 5, fatigue: 9, lifeBalance: -5 },
        ev: 16, cl: 14, rk: 12, rf: 6,
        note: "排名行情是A股最可靠的短期规律之一，但也是最容易被反噬的规律。",
      }),
      d({
        id: "oct-crowding",
        label: "跑因子拥挤度：抱团方向还有多少空间",
        category: "data_deep_dive",
        description: "用持仓集中度、换手率趋势和估值分位三个指标，评估抱团方向的风险收益比。",
        to: "chen_xinghe", val: 9,
        fx: { researchCredibility: 10, committeeAdoption: 7, portfolioNav: 0.01, viewAccuracy: 9, clientFeedback: 4, teamTrust: 5, fatigue: 7, lifeBalance: -3 },
        ev: 16, cl: 12, rk: 16, rf: 4,
        note: "因子拥挤度显示两个最热方向已经接近历史极值。不是说要马上卖，但要知道风险在哪。",
      }),
      d({
        id: "oct-align",
        label: "与基金经理对齐年度目标与排名预期",
        category: "roadshow",
        description: "了解投资端对年末排名的真实态度和可能的行为。",
        to: "lin_ruoning", val: 6,
        fx: { researchCredibility: 5, committeeAdoption: 10, portfolioNav: 0.005, viewAccuracy: 6, clientFeedback: 10, teamTrust: 7, fatigue: 4, lifeBalance: -2 },
        ev: 6, cl: 10, rk: 10, rf: 4,
        note: "了解基金经理的真实想法后，你对年末排名行情的判断有了更准确的锚。",
      }),
      d({
        id: "oct-gamble",
        label: "为了排名好看，不管逻辑先推了再说",
        category: "risk_alert",
        description: "排名焦虑压倒一切。",
        to: "zhou_mingzhao", val: -7,
        fx: { researchCredibility: -10, committeeAdoption: 2, portfolioNav: 0.005, viewAccuracy: -12, clientFeedback: -3, teamTrust: -5, fatigue: 8, lifeBalance: -5 },
        ev: 2, cl: 2, rk: 0, rf: 2,
        note: "为了排名放弃框架的研究员，排名结束后会发现自己一无所有。",
      }),
      d({
        id: "oct-help",
        label: "帮陈星禾复核排名交易模型的回测",
        category: "help_colleague",
        description: "她的排名博弈量化模型需要一个基本面视角的交叉验证。",
        to: "chen_xinghe", val: 10,
        fx: { researchCredibility: 5, committeeAdoption: 4, portfolioNav: 0.005, viewAccuracy: 6, clientFeedback: 2, teamTrust: 10, fatigue: 5, lifeBalance: -1 },
        ev: 10, cl: 10, rk: 10, rf: 6,
        note: "量化和基本面的交叉验证，是你和陈星禾之间最有默契的工作方式。",
      }),
      d({
        id: "oct-life",
        label: "按时下班，保持稳定节奏不被排名焦虑裹挟",
        category: "self_care",
        description: "排名焦虑最大的时候，保持自己的节奏。",
        to: "lin_ruoning", val: 5,
        fx: { researchCredibility: 2, committeeAdoption: -1, viewAccuracy: 4, clientFeedback: 1, teamTrust: 3, fatigue: -8, lifeBalance: 10 },
        ev: 2, cl: 4, rk: 10, rf: 12,
        note: "不被排名焦虑裹挟的人，才能做出对明年更有价值的研究。",
      }),
],
    // 十一月：估值切换与海外冲击
    [
      d({
        id: "nov-forward",
        label: "做下一年度展望模型：增速×利率×风险溢价三维定价",
        category: "deep_research",
        description: "把估值切换到明年，重新假设三个变量的合理范围。",
        to: "lin_ruoning", val: 8,
        fx: { researchCredibility: 14, committeeAdoption: 10, portfolioNav: 0.02, viewAccuracy: 8, clientFeedback: 7, teamTrust: 7, fatigue: 10, lifeBalance: -6 },
        ev: 18, cl: 18, rk: 12, rf: 8,
        note: "估值切换的本质是重新假设未来，而假设的质量决定了结论的质量。",
      }),
      d({
        id: "nov-tariff",
        label: "做海外政策冲击对出口链的量化评估",
        category: "data_deep_dive",
        description: "量化评估关税变化对出口链各环节的利润影响，做情景分析。",
        to: "zhou_mingzhao", val: 8,
        fx: { researchCredibility: 12, committeeAdoption: 8, portfolioNav: 0.01, viewAccuracy: 10, clientFeedback: 6, teamTrust: 6, fatigue: 9, lifeBalance: -5 },
        ev: 16, cl: 14, rk: 16, rf: 6,
        note: "关税冲击不是非黑即白。有些环节受益于国产替代，有些环节确实会被直接冲击。",
      }),
      d({
        id: "nov-strategy",
        label: "给投委会写年度策略框架建议",
        category: "committee_defense",
        description: "把你的研究框架写成正式的年度策略建议。",
        to: "zhou_mingzhao", val: 8,
        fx: { researchCredibility: 10, committeeAdoption: 16, portfolioNav: 0.01, viewAccuracy: 7, clientFeedback: 8, teamTrust: 8, fatigue: 6, lifeBalance: -3 },
        ev: 12, cl: 18, rk: 14, rf: 10,
        note: "年度策略是研究员一年中最重要的输出之一，它会被收入档案，明年此时会被拿出来对照。",
      }),
      d({
        id: "nov-extrapolate",
        label: "简单外推今年趋势到明年",
        category: "risk_alert",
        description: "不做深度研究，直接把今年涨幅线性外推。",
        to: "lin_ruoning", val: -6,
        fx: { researchCredibility: -8, committeeAdoption: -3, portfolioNav: -0.01, viewAccuracy: -10, clientFeedback: -4, teamTrust: -4, fatigue: -1, lifeBalance: 1 },
        ev: 2, cl: 2, rk: 2, rf: 2,
        note: "线性外推是研究员最容易踩的坑。今年的冠军行业，明年大概率不是冠军。",
      }),
      d({
        id: "nov-field",
        label: "调研出口链企业的订单调整和备选方案",
        category: "expert_interview",
        description: "去一线了解出口企业在关税变化下的真实应对。",
        to: "lin_ruoning", val: 7,
        fx: { researchCredibility: 7, committeeAdoption: 5, portfolioNav: 0.005, viewAccuracy: 10, clientFeedback: 6, teamTrust: 5, fatigue: 5, lifeBalance: -3 },
        ev: 14, cl: 10, rk: 12, rf: 4,
        note: "一线调研发现头部出口企业的海外产能布局进度比市场预期的快，这改变了关税冲击的严重程度。",
      }),
      d({
        id: "nov-life",
        label: "年底前整理全年工作日志",
        category: "self_care",
        description: "在忙碌中留出时间，回顾自己一年的成长。",
        to: "lin_ruoning", val: 5,
        fx: { researchCredibility: 3, committeeAdoption: 1, viewAccuracy: 5, clientFeedback: 3, teamTrust: 2, fatigue: -6, lifeBalance: 10 },
        ev: 4, cl: 8, rk: 8, rf: 14,
        note: "整理工作日志的时候你会发现：今年的很多判断偏差，其实在半年前的某次选择里就已经有了苗头。",
      }),
],
    // 十二月：年度收官与跨年配置
    [
      d({
        id: "dec-report",
        label: "写年度研究报告：十二个月的研究札记整合",
        category: "deep_research",
        description: "把全年的研究记录整合成一份完整的年度报告，标注每一个假设的验证结果和偏差原因。",
        to: "lin_ruoning", val: 12,
        fx: { researchCredibility: 18, committeeAdoption: 10, portfolioNav: 0.015, viewAccuracy: 12, clientFeedback: 10, teamTrust: 8, fatigue: 8, lifeBalance: -4 },
        ev: 18, cl: 18, rk: 14, rf: 14,
        note: "年度报告是你一年研究的最好答卷。林若宁会在上面贴一张新的便签。",
      }),
      d({
        id: "dec-annual",
        label: "在年度策略会上做主题演讲",
        category: "committee_defense",
        description: "站在全部门面前，分享你的研究框架和年度复盘。",
        to: "zhou_mingzhao", val: 10,
        fx: { researchCredibility: 12, committeeAdoption: 18, portfolioNav: 0.01, viewAccuracy: 8, clientFeedback: 12, teamTrust: 12, fatigue: 6, lifeBalance: -3 },
        ev: 12, cl: 18, rk: 14, rf: 12,
        note: "站在全部门面前演讲的那一刻，你发现今年最大的收获是你知道每个判断为什么对、为什么错。",
      }),
      d({
        id: "dec-help",
        label: "帮两个同事改年度模型的最后细节",
        category: "help_colleague",
        description: "年末模型更新压力大，帮林若宁和陈星禾把最后的细节磨完。",
        to: "lin_ruoning", val: 8, rx: [{ characterId: "chen_xinghe", value: 8 }],
        fx: { researchCredibility: 4, committeeAdoption: 4, portfolioNav: 0.005, viewAccuracy: 5, clientFeedback: 3, teamTrust: 16, fatigue: 5, lifeBalance: -1 },
        ev: 6, cl: 8, rk: 6, rf: 8,
        note: "你在帮同事改模型的同时，也重新审视了自己的框架。教学是最好的学习。",
      }),
      d({
        id: "dec-coast",
        label: "年末摸鱼，等明年再说",
        category: "risk_alert",
        description: "反正马上过年了，先躺平。",
        to: "lin_ruoning", val: -10,
        fx: { researchCredibility: -10, committeeAdoption: -10, portfolioNav: -0.005, viewAccuracy: -6, clientFeedback: -6, teamTrust: -7, fatigue: -10, lifeBalance: 5 },
        ev: 0, cl: 0, rk: 0, rf: 0,
        note: "十二月摸的鱼，会在下一年一月的复盘里变成深深的后悔。",
      }),
      d({
        id: "dec-party",
        label: "和同事们一起年末聚餐",
        category: "self_care",
        description: "一年结束了，和团队一起庆祝。",
        to: "lin_ruoning", val: 8, rx: [{ characterId: "chen_xinghe", value: 8 }, { characterId: "zhou_mingzhao", value: 8 }],
        fx: { researchCredibility: 3, committeeAdoption: 3, viewAccuracy: 3, clientFeedback: 6, teamTrust: 18, fatigue: -8, lifeBalance: 12 },
        ev: 2, cl: 4, rk: 6, rf: 10,
        note: "年末聚餐上每个人都说了自己今年最大的判断失误。这一刻你发现，诚实比正确更有力量。",
      }),
],
  ];

  return allMonths[monthIndex % allMonths.length];
}

// ═══════════════════════════════════════════════════════════
// Scene Scripts
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// Conditional branching — the "real multi-route" layer
//
// Each branch is evaluated against the live GameState (affection, career
// metrics, which decision categories the player keeps favouring, story flags).
// A matched branch injects scene nodes, appends decision options, can rewrite
// the decision prompt, and marks a `route_*` flag. This sits on top of the
// affinity-gate bridge node and the affection-driven endings — together they
// make the player's accumulated choices visibly reshape the story.
// ═══════════════════════════════════════════════════════════

export const BRANCHES: Branch[] = [
  {
    id: "route-research",
    label: "研究狂热线",
    when: {
      kind: "or",
      of: [
        { kind: "categoryStreak", category: "deep_research", gte: 4 },
        { kind: "categoryStreak", category: "data_deep_dive", gte: 4 },
      ],
    },
    contribute: {
      nodes: [
        {
          id: "route-research-node",
          type: "dialogue",
          characterId: "lin_ruoning",
          speaker: "林若宁",
          role: "投研部前辈",
          mood: "认真",
          text: "林若宁把一份还冒热气的早餐推到你手边：你这一周第三次半夜把研报发我了。我不是嫌烦——我是怕你先把身体熬没了。不过…你这版框架，确实比上个月利落。",
          prompt: "点击继续。",
          pose: "soft",
          bg: "research-room",
          bgm: "morning-loop",
          voiceCue: "key",
        },
      ],
      decisions: [
        d({
          id: "research-route-confidential",
          label: "接下组里加密的专项深度课题",
          category: "deep_research",
          description: "有个不能写进公开报告的课题，点名要你。回报是研究可信度大涨，代价是更深的熬夜。",
          to: "lin_ruoning",
          val: 3,
          fx: { researchCredibility: 16, committeeAdoption: 6, portfolioNav: 0.02, viewAccuracy: 6, fatigue: 14, lifeBalance: -10 },
          ev: 18, cl: 16, rk: 10, rf: 6,
          note: "越深的课题越孤独，但也越早被大佬看见。",
        }),
      ],
      setFlags: { route_research: true },
    },
  },
  {
    id: "route-burnout",
    label: "过度透支线",
    when: { kind: "metric", key: "fatigue", gte: 75 },
    contribute: {
      nodes: [
        {
          id: "route-burnout-node",
          type: "dialogue",
          characterId: "zhou_mingzhao",
          speaker: "周明昭",
          role: "宏观策略师",
          mood: "警觉",
          text: "周明昭盯着你看了两秒：你脸色比上周的回撤还难看。研究是长跑，不是拿命填K线。我见过太多聪明人，栽在「再熬一夜就出成果」上。",
          prompt: "点击继续。",
          pose: "serious",
          bg: "research-room",
          bgm: "morning-loop",
          voiceCue: "key",
        },
      ],
      overrideDecision: {
        text: "你盯着屏幕，眼睛发酸。也许今天该先把自己救回来，再谈研究。",
        prompt: "先安排本话日程——这一次，别再无视身体。",
        decisionPrompt: "这一话，要不要给自己留一条退路？",
      },
      decisions: [
        d({
          id: "burnout-route-rest",
          label: "今天准时下班，强制休息",
          category: "self_care",
          description: "把电脑合上。明天的清醒，比今晚多敲两千字值钱。",
          fx: { lifeBalance: 14, fatigue: -18, researchCredibility: 2, teamTrust: 2 },
          ev: 4, cl: 4, rk: 8, rf: 12,
          note: "休息不是偷懒，是给判断力续命。",
        }),
      ],
      setFlags: { route_burnout: true },
    },
  },
  {
    id: "route-relation",
    label: "关系深耕线",
    when: {
      kind: "and",
      of: [
        { kind: "affinityAny", gte: AFFINITY_GATE },
        {
          kind: "or",
          of: [
            { kind: "categoryStreak", category: "help_colleague", gte: 3 },
            { kind: "categoryStreak", category: "roadshow", gte: 3 },
          ],
        },
      ],
    },
    contribute: {
      nodes: [
        {
          id: "route-relation-node",
          type: "dialogue",
          characterId: "chen_xinghe",
          speaker: "陈星禾",
          role: "量化/资金信号研究员",
          mood: "俏皮",
          text: "陈星禾压低声音：你帮我把那版模型兜底之后，我欠你一个人情。下周的闭门路演，我偷偷给你留了个席位——别声张，算是「自己人」的待遇。",
          prompt: "点击继续。",
          pose: "excited",
          bg: "research-room",
          bgm: "morning-loop",
          voiceCue: "key",
        },
      ],
      decisions: [
        d({
          id: "relation-route-insight",
          label: "赴约闭门路演，混个「自己人」",
          category: "roadshow",
          description: "不是正式路演，是圈内人的小范围交流。信息密度高，人情也重。",
          to: "chen_xinghe",
          val: 5,
          fx: { researchCredibility: 8, committeeAdoption: 4, clientFeedback: 4, teamTrust: 8, fatigue: 6, lifeBalance: -4 },
          ev: 10, cl: 10, rk: 8, rf: 8,
          note: "圈子的门，往往是被「顺手帮的忙」悄悄推开。",
        }),
      ],
      setFlags: { route_relation: true },
    },
  },
  {
    id: "route-balanced",
    label: "平衡生活线",
    when: {
      kind: "and",
      of: [
        { kind: "metric", key: "lifeBalance", gte: 60 },
        { kind: "metricAtMost", key: "fatigue", lte: 50 },
      ],
    },
    contribute: {
      nodes: [
        {
          id: "route-balanced-node",
          type: "dialogue",
          characterId: "lin_ruoning",
          speaker: "林若宁",
          role: "投研部前辈",
          mood: "温柔",
          text: "林若宁笑了笑：你最近状态不太一样，不像上个月那样绷着。下午茶的时候你突然说「其实动量因子在退潮」，我愣了一下——那是只有脑子清亮的人才看得到的缝。",
          prompt: "点击继续。",
          pose: "smile",
          bg: "research-room",
          bgm: "morning-loop",
          voiceCue: "key",
        },
      ],
      decisions: [
        d({
          id: "balanced-route-insight",
          label: "顺着清亮的脑子，写一份冷静的周度观察",
          category: "data_deep_dive",
          description: "不追热点，只把本周信号理清楚。状态好的时候，这种冷静最有杀伤力。",
          fx: { viewAccuracy: 10, researchCredibility: 8, portfolioNav: 0.015, lifeBalance: 2, fatigue: 4 },
          ev: 12, cl: 14, rk: 10, rf: 10,
          note: "生活平衡不是研究的对立面，它是判断力的底色。",
        }),
      ],
      setFlags: { route_balanced: true },
    },
  },
];

export function buildMonthScene(
  monthIndex: number,
  year?: string,
  state?: GameState,
): MonthScene {
  const actualYear = year || "2025";
  const story = STORY_ARCS[monthIndex % STORY_ARCS.length];
  const monthNum = monthIndex + 1;
  const month = `${actualYear}-${String(monthNum).padStart(2, "0")}`;
  const label = `${actualYear}年${monthNum}月`;
  const theme = getTheme(actualYear, monthIndex);

  if (actualYear === "2025" && monthIndex === 0) {
    return build2025Prologue(month, label, theme);
  }

  // Affinity gate: if the month's arc character has crossed the relationship
  // threshold, inject a "relationship moment" node. Now reads the live state.
  const affinityNode: SceneNode | null =
    state && (state.relations[story.characterId] ?? 0) >= AFFINITY_GATE
      ? buildAffinityMoment(story, monthIndex)
      : null;

  // Evaluate route branches against the live state.
  const branches = state ? activeBranches(state, BRANCHES) : [];
  const branchNodesAfterMemory: SceneNode[] = [];
  const branchNodesBeforeDecision: SceneNode[] = [];
  const extraDecisions: ResearchDecision[] = [];
  let decisionOverride: Branch["contribute"]["overrideDecision"] | undefined;
  for (const b of branches) {
    const at = b.injectAt ?? "before-decision";
    if (at === "after-memory") branchNodesAfterMemory.push(...(b.contribute.nodes ?? []));
    else branchNodesBeforeDecision.push(...(b.contribute.nodes ?? []));
    extraDecisions.push(...(b.contribute.decisions ?? []));
    if (b.contribute.overrideDecision) {
      decisionOverride = { ...decisionOverride, ...b.contribute.overrideDecision };
    }
  }

  // Default scene for non-prologue months
  const decisions = makeResearchDecisions(actualYear, monthIndex);

  const memoryNode: SceneNode = {
    id: `m${monthIndex}-memory`,
    type: "dialogue",
    characterId: story.characterId,
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

  const colleagueNode: SceneNode = {
    id: `m${monthIndex}-colleague`,
    type: "dialogue",
    characterId: story.characterId,
    speaker: story.speaker,
    role: story.role,
    mood: story.mood,
    text: `${story.line} ${theme.publicContext}`,
    prompt: "点击继续，进入本月研究选择。",
    pose: "soft",
    bg: "research-room",
    bgm: "morning-loop",
    voiceCue: "key",
  };

  const decisionNode: SceneNode = {
    id: `m${monthIndex}-decision`,
    type: "decision",
    characterId: story.characterId,
    speaker: story.speaker,
    role: story.role,
    mood: story.mood,
    text: `先安排本话日程，然后选择一个你愿意负责到底的研究方向。`,
    prompt: story.mission,
    pose: "smile",
    bg: "briefing-room",
    bgm: "morning-loop",
    voiceCue: "key",
    decisions: [...decisions, ...extraDecisions],
    decisionPrompt: story.mission,
    briefTitle: `${theme.period}：${theme.title}`,
    briefs: [
      { characterId: "lin_ruoning", label: "基本面视角", text: theme.publicContext.split("。")[0] + "。" },
      { characterId: "chen_xinghe", label: "量化信号", text: "成交结构和大单流向会先于价格给出方向确认，量比价诚实。" },
      { characterId: "zhou_mingzhao", label: "宏观风控", text: "别只盯机会。能说清楚风险边界、估值分位和反身性，才有资格入场。" },
    ],
  };

  if (decisionOverride) {
    Object.assign(decisionNode, decisionOverride);
  }

  const nodes: SceneNode[] = [
    memoryNode,
    ...branchNodesAfterMemory,
    ...(affinityNode ? [affinityNode] : []),
    colleagueNode,
    ...branchNodesBeforeDecision,
    decisionNode,
  ];

  return { id: `${year || "default"}-m${monthIndex}`, year, monthIndex, month, label, theme, nodes };
}

function buildAffinityMoment(story: StoryArc, monthIndex: number): SceneNode {
  const name = CHARACTERS[story.characterId].name;
  return {
    id: `m${monthIndex}-affinity`,
    type: "dialogue",
    characterId: story.characterId,
    speaker: story.speaker,
    role: story.role,
    mood: "心动",
    text: `${name}的声音放轻了些：你最近总在我卡住的时候，递来那条对的线索。这种默契，比任何一份研报都难得。`,
    prompt: "点击继续。",
    pose: "soft",
    bg: "research-room",
    bgm: "morning-loop",
    voiceCue: "key",
  };
}

function build2025Prologue(month: string, label: string, theme: MarketTheme): MonthScene {
  const decisions = makeResearchDecisions("2025", 0);
  const nodes: SceneNode[] = [
    {
      id: "2025p-memory",
      type: "dialogue",
      characterId: "lin_ruoning",
      speaker: "内心独白",
      role: "只有你知道",
      mood: "警觉",
      text: "我知道 2025 年 1 月会很不平静。某国产低成本推理模型发布后，市场会重新讨论 AI 应用、推理成本和国产算力的关系。但我不能直接说「要涨」，只能把它拆成可验证的假设。",
      prompt: "点击继续，把未来记忆压成可以说出口的研究假设。",
      pose: "thinking",
      bg: "research-room",
      bgm: "morning-loop",
      voiceCue: "silent",
    },
    {
      id: "2025p-lin-1",
      type: "dialogue",
      characterId: "lin_ruoning",
      speaker: "林若宁",
      role: "投研部前辈",
      mood: "温柔",
      text: "林若宁站在你桌边，把一张便签贴到显示器边缘：你今天来得好早。AI 这条线，你昨晚又看到凌晨了吗？",
      pose: "soft",
      bg: "research-room",
      bgm: "morning-loop",
      voiceCue: "key",
    },
    {
      id: "2025p-lin-2",
      type: "dialogue",
      characterId: "lin_ruoning",
      speaker: "林若宁",
      role: "基本面研究员",
      mood: "认真",
      text: "她把一杯热咖啡推到你手边：如果你想说服大家，预感还不够。低成本推理、应用扩散、算力适配，至少要拆成三条可验证假设。我给你一个框架：先看产业链上下游谁先受益，再看业绩验证的节奏差。",
      pose: "thinking",
      bg: "research-room",
      bgm: "morning-loop",
    },
    {
      id: "2025p-chen-1",
      type: "dialogue",
      characterId: "chen_xinghe",
      speaker: "陈星禾",
      role: "量化/资金信号研究员",
      mood: "俏皮",
      text: "陈星禾抱着平板冲进会议室：早盘Barra归因跑完了！AI应用方向的收益里，动量因子贡献了超过六成，基本面因子的贡献还不到两成。换句话说，现在涨的更多是情绪溢价和拥挤交易，不是业绩验证。你们的基本面故事还没被市场真正定价。",
      pose: "excited",
      bg: "research-room",
      bgm: "morning-loop",
      voiceCue: "key",
    },
    {
      id: "2025p-chen-2",
      type: "dialogue",
      characterId: "chen_xinghe",
      speaker: "陈星禾",
      role: "资金信号研究员",
      mood: "高涨",
      text: "她点开大单流向分布：我只信成交量和订单簿。AI方向的盘口厚度在收窄但大单净买还在流入，这是典型的「量在价先、但供给也在积聚」的信号。短期内动量还能跑，但Alpha衰减速度比上周快了一倍。如果你要做研究推荐，最好等成交结构重新确认。",
      pose: "focused",
      bg: "research-room",
      bgm: "morning-loop",
    },
    {
      id: "2025p-zhou-1",
      type: "dialogue",
      characterId: "zhou_mingzhao",
      speaker: "周明昭",
      role: "宏观策略师",
      mood: "沉着",
      text: "周明昭在会议室白板上圈出两个日期：技术突破和交易方向之间隔着三层东西：风险偏好能不能持续、估值有没有安全边际、兑现节奏会不会被流动性打断。你们现在讨论的都是「事件是不是利好」，但真正的问题是「这个利好已经被定价了多少」。",
      pose: "serious",
      bg: "briefing-room",
      bgm: "morning-loop",
      voiceCue: "key",
    },
    {
      id: "2025p-zhou-2",
      type: "dialogue",
      characterId: "zhou_mingzhao",
      speaker: "周明昭",
      role: "宏观策略师",
      mood: "观察",
      text: "她补上一行小字：公开信息只能证明事件发生了，不能证明交易方向。如果你要提前布局，就要解释这次热度能持续多久，以及如果持续不了，回撤的风险边界在哪里。",
      pose: "neutral",
      bg: "briefing-room",
      bgm: "morning-loop",
    },
    {
      id: "2025p-lin-3",
      type: "dialogue",
      characterId: "lin_ruoning",
      speaker: "林若宁",
      role: "基本面研究员",
      mood: "认真",
      text: "林若宁翻开笔记：好，三个框架都摆出来了。我的基本面验证、陈星禾的量化信号、周明昭的风控。没有哪个框架是完美的，但三个框架重叠的地方就是你最该出手的方向。",
      pose: "thinking",
      bg: "briefing-room",
      bgm: "morning-loop",
    },
    {
      id: "2025p-chen-3",
      type: "dialogue",
      characterId: "chen_xinghe",
      speaker: "陈星禾",
      role: "资金信号研究员",
      mood: "俏皮",
      text: "陈星禾把平板转向你：我负责盯信号。大单流向、因子拥挤度、Alpha衰减速度，这三个指标如果同时变脸，我就拉警报。在那之前，你只管做你的研究。量比价诚实，信我。",
      pose: "excited",
      bg: "briefing-room",
      bgm: "morning-loop",
    },
    {
      id: "2025p-zhou-3",
      type: "dialogue",
      characterId: "zhou_mingzhao",
      speaker: "周明昭",
      role: "宏观策略师",
      mood: "沉着",
      text: "周明昭轻轻敲了敲杯沿：我负责风控边界。别只盯着收益率，想想你的研究推荐如果错了，错在哪一层：是假设错了、变量漏了、还是反身性没算进去。把错误的位置标出来，比把方向猜对更重要。",
      pose: "serious",
      bg: "briefing-room",
      bgm: "morning-loop",
    },
    {
      id: "2025p-decision",
      type: "decision",
      characterId: "lin_ruoning",
      speaker: "林若宁",
      role: "投研部前辈",
      mood: "温柔",
      text: "林若宁把研究选项排成一列：先决定今天怎么安排日程，再选一个你愿意负责到底的方向。结果会结算，研究札记也会留下。",
      prompt: "安排本话日程，然后选择一个研究方向。",
      pose: "smile",
      bg: "briefing-room",
      bgm: "morning-loop",
      voiceCue: "key",
      decisions,
      decisionPrompt: "安排本话日程，然后选择一个研究方向。",
      briefTitle: "第一次研究会议：三个框架，四条路径",
      briefs: [
        { characterId: "lin_ruoning", label: "基本面", text: "先把产业链拆成三层：硬件、平台、应用。每层有自己的受益逻辑和验证节奏。不要被概念带走。" },
        { characterId: "chen_xinghe", label: "量化信号", text: "Barra归因显示动量因子主导。大单流向还在净买，但盘口厚度在收窄。量比价诚实，但信号在衰减。" },
        { characterId: "zhou_mingzhao", label: "宏观风控", text: "三个框架重叠的地方最安全。如果事件只是脉冲而没有业绩接力，估值和拥挤度会在月末反噬。" },
      ],
    },
  ];

  return { id: "2025-scene-prologue", year: "2025", monthIndex: 0, month, label, theme, nodes };
}

// ═══════════════════════════════════════════════════════════
// Year-specific scene overrides
// ═══════════════════════════════════════════════════════════

export const YEAR_SCENE_BUILDERS: Record<string, (monthIndex: number) => MonthScene> = {
  "2023": (monthIndex: number) => buildMonthScene(monthIndex, "2023"),
  "2024": (monthIndex: number) => buildMonthScene(monthIndex, "2024"),
  "2025": (monthIndex: number) => buildMonthScene(monthIndex, "2025"),
};

// ═══════════════════════════════════════════════════════════
// Focus Actions — 日程选择
// ═══════════════════════════════════════════════════════════

export const FOCUS_ACTIONS: FocusAction[] = [
  {
    id: "deep_research",
    label: "深度研报",
    icon: "✦",
    short: "研究可信度 +14，疲劳 +10",
    detail: "今晚加两小时班，把研究假设落实到数据和逻辑上。研究质量会提升，但疲劳值会上升。",
    researchCredibilityBonus: 14,
    fatigueDelta: 10,
    lifeBalanceDelta: -6,
    teamTrustBonus: 3,
  },
  {
    id: "team_collab",
    label: "团队协作",
    icon: "♢",
    short: "团队信任 +8，疲劳 +3",
    detail: "和同事一起讨论研究框架，交叉验证观点。协作能提升团队信任，研究深度略有不如。",
    researchCredibilityBonus: 6,
    fatigueDelta: 3,
    lifeBalanceDelta: -2,
    teamTrustBonus: 8,
  },
  {
    id: "self_care",
    label: "生活优先",
    icon: "♡",
    short: "生活平衡 +12，疲劳 -10",
    detail: "按时下班，把今晚的时间留给自己。研究进度会受影响，但你的状态会更好。",
    researchCredibilityBonus: 0,
    fatigueDelta: -10,
    lifeBalanceDelta: 12,
    teamTrustBonus: 0,
  },
];

// ═══════════════════════════════════════════════════════════
// Grade Reviews — 评分等级复盘文案
// ═══════════════════════════════════════════════════════════

export const GRADE_REVIEWS: Record<CharacterId, Record<string, string[]>> = {
  lin_ruoning: {
    S: ["这条路线把事件、数据和逻辑完整串起来了，你的研究框架经得起任何复盘。", "完美的判断。你不仅在正确的时间做了正确的选择，更重要的是你知道为什么对。"],
    A: ["逻辑扎实，证据链完整。下次可以考虑更早在分歧点入场。", "这次研究做到了交叉验证，只是还差一点超额认知。继续打磨框架。"],
    B: ["方向对了，但有几处逻辑跳跃。下次先问一句：这个变量有没有被交叉验证过。", "结果不差，但你没有把判断依据完全写清楚。研究笔记再仔细一点。"],
    C: ["勉强及格。直觉不能代替证据，下次把假设写下来再去验证。", "这次更多是靠运气。复盘的时候要诚实记录：哪些判断有数据支撑，哪些只是感觉。"],
    D: ["失败了也没关系。失败的研究笔记有时候比成功的更有价值，因为它标出了你的盲区。", "这次需要老老实实复盘。先写清楚风险从哪冒出来的，再从框架里找偏差。"],
  },
  chen_xinghe: {
    S: ["量价信号和基本面共振！这就是我一直在说的：当大单流向和产业链逻辑指向同一个方向，Alpha的持续性最强。", "你这次同时盯对了因子拥挤度和订单流结构。Barra归因不会说谎，你的判断也不会。"],
    A: ["方向对了，但信号的持续性还需要更长时间窗口来确认。Alpha衰减速度在下周会是关键。", "不错的结果！下次可以再看一眼因子正交化，排除掉那个动量因子的干扰，你的净Alpha会更纯。"],
    B: ["成交量结构看起来还行，但大单净买的分布不够集中。下次等成交结构重新收敛再下判断。", "因子暴露对了一次，但你没有把各种因子的贡献度拆开。拆开才知道是运气还是框架。"],
    C: ["这次信号的噪音比太高了。信噪比掉到接近于1的时候，任何判断都只是抛硬币。", "我信你下次会更好。这次的订单流复盘留给我，我想看看信号在哪一层走偏了。"],
    D: ["因子收益全错了，但这种「全错」的样本比侥幸正确更能训练模型。", "没关系！每一次错误都在为下一次alpha发现做数据标注。只要别犯同样的错。"],
  },
  zhou_mingzhao: {
    S: ["方向正确，风控到位，而且在最拥挤的时候保持了逆向思维的勇气。这就是职业判断的标杆。", "你不仅选对了，还守住了风险边界。能在高回报里不放弃风控框架的人，才有长期生存权。"],
    A: ["结果不错，但我更想知道：这次判断里有没有你在无意中冒险的环节。把风险日志补上。", "收益和风控还算均衡。下次试着更早判断拐点，拐点前的赔率往往最高。"],
    B: ["中规中矩。但「中规中矩」在风控上是对的，在判断上还需要更主动。", "这次偏离了你的方法论。回头看看是哪个变量让你改了主意，那个变量值得写进研究日志。"],
    C: ["风险释放比逻辑兑现快，这次你被市场推着走了。下次入场前先写好：最多承受多少判断错误。", "把今天的结果记下来，标注「被波动率反噬」。下一次波动率飙升的时候，你会感谢今天的记录。"],
    D: ["这次没有守住底线。别自责。市场不会因为你没判断对就否定你。把失误写下来，它会变成下一次的起点。", "回头看的时候你会发现，这次是某个关键假设出了问题。找到那个假设，修好它。"],
  },
};
