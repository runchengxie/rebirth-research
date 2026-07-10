import type { Branch, CharacterId, CharacterProfile, DecisionCategory, FocusAction, GameState, KnowledgeCard, MarketTheme, MentorId, MonthScene, ResearchDecision, SceneNode, StoryArc as StoryArcType } from "../types";
import { d } from "./decisionFactory";
import { activeBranches } from "./branching";
import { THEMES_2025, makeDecisions2025 } from "./content2025";
import { THEMES_2023, makeDecisions2023 } from "./content2023";
import { THEMES_2024, makeDecisions2024 } from "./content2024";
import { buildDemoChapter, makeDecisionsDemo, THEMES_DEMO } from "./contentDemo";
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
  zhao_chengyu: {
    id: "zhao_chengyu",
    name: "赵承宇",
    role: "交易台同级同事",
    tag: "实战交易线",
    color: "slate",
    kind: "peer",
    intro: "交易台那边的同级同事。嘴上嫌研究员慢，真到下单前又会跑来问你这边的逻辑。",
    methodology: "成交驱动，盘中验证。研究说得再漂亮，没承接就是纸上谈兵。",
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
// Year-specific theme arrays are imported from content2023.ts /
// content2024.ts / content2025.ts (each loads + validates a JSON layer)
// ═══════════════════════════════════════════════════════════

export const YEAR_THEMES: Record<string, MarketTheme[]> = {
  "2023": THEMES_2023,
  "2024": THEMES_2024,
  "2025": THEMES_2025,
  "demo": THEMES_DEMO,
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
  if (year === "demo") {
    return makeDecisionsDemo(monthIndex);
  }
  if (year === "2025") {
    return makeDecisions2025(monthIndex);
  }
  if (year === "2023") {
    return makeDecisions2023(monthIndex);
  }
  // 2024 决策池已从 TS 抽到 content/2024.json，经 schema 校验加载（与 2023/2025 一致）
  if (year === "2024") {
    return makeDecisions2024(monthIndex);
  }
  // 已知年份都已路由；未知年份返回空池。
  return [];
}

// ═══════════════════════════════════════════════════════════
// Scene Scripts
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// Knowledge cards — the "platform" payoff
//
// Every meaningful choice leaves the player a little sharper, not just a little
// higher-scored. The teaching is delivered *in the colleague's own voice*, not
// as a pop-up textbook — so what the player learns is "how 林若宁 thinks",
// not "the factor-crowding entry". Archived into the research notebook.
// ═══════════════════════════════════════════════════════════

// In-voice teaching lines, keyed by mentor (the framework this choice engaged)
// and by the decision category. Concise on purpose — these read as a colleague
// leaning over your desk, not a lecture.
type Teaching = { concept: string; line: string; cfaRef: string };

export const MENTOR_TEACHINGS: Record<MentorId, Record<DecisionCategory, Teaching>> = {
  lin_ruoning: {
    deep_research: { concept: "产业链交叉验证", line: "别只看一个点。把上游、中游、下游的节奏差拆开，超额收益藏在断层里。", cfaRef: "CFA · 权益估值与产业链验证" },
    expert_interview: { concept: "一线验证", line: "研报会说漂亮话，但经销商的库存、厂长的语气不会。去一线，比看十篇纪要都值钱。", cfaRef: "CFA · 尽职调查与一手信息" },
    roadshow: { concept: "框架翻译", line: "把复杂逻辑讲成人能听懂的故事，是研究员的基本功。客户追问的那两个问题，就是你框架的漏洞。", cfaRef: "CFA · 投资沟通" },
    risk_alert: { concept: "反身性", line: "当所有人都觉得「这回不一样」，就是风险最大的时候。提醒冷静不是泼冷水，是替团队守住边界。", cfaRef: "CFA · 行为金融与反身性" },
    self_care: { concept: "判断节奏", line: "脑子不清亮的时候，任何判断都打折。先把自己救回来，研究不会跑。", cfaRef: "CFA · 决策卫生" },
    help_colleague: { concept: "模型直觉", line: "帮人改模型，也是在练自己的手感。你今天搭的每一根假设，明天都会长回你自己的框架里。", cfaRef: "CFA · 财务建模" },
    committee_defense: { concept: "假设可视化", line: "投委会要的不是结论，是你怎么想的。把概率和赔率都摆出来，比喊方向有用。", cfaRef: "CFA · 投资论述" },
    data_deep_dive: { concept: "数据诚实", line: "数据不会替你下结论，但会揭穿你的偷懒。先问「这数怎么来的」，再问「说明什么」。", cfaRef: "CFA · 量化与数据质量" },
  },
  chen_xinghe: {
    deep_research: { concept: "量价背离", line: "价格会骗人，成交量不会。量在价先，结构比方向诚实。", cfaRef: "CFA · 市场微观结构" },
    expert_interview: { concept: "信号交叉", line: "一手信息能校准你的因子。别只信回测，去问圈内人信号变没变。", cfaRef: "CFA · 另类数据与调研" },
    roadshow: { concept: "信号翻译", line: "把因子讲成人话，是量化员的修行。客户听得懂，才会信你的 Alpha。", cfaRef: "CFA · 投资沟通" },
    risk_alert: { concept: "因子拥挤度", line: "所有人都挤一个方向时，风险溢价趋近零。这时候还冲，是在给前人接盘。", cfaRef: "CFA · 因子投资与拥挤度" },
    self_care: { concept: "噪声 vs 信号", line: "连轴转的时候信噪比会塌。休息不是偷懒，是给模型留干净输入。", cfaRef: "CFA · 决策卫生" },
    help_colleague: { concept: "交叉验证", line: "量化和基本面打架时，真理通常在中间。你帮我校准的那一下，我也学会了怎么读生意。", cfaRef: "CFA · 多因子融合" },
    committee_defense: { concept: "因子正交", line: "把动量因子的干扰拆掉，你的净 Alpha 才纯。混着讲，等于什么都没说。", cfaRef: "CFA · Barra 归因" },
    data_deep_dive: { concept: "Barra 归因", line: "收益里多少是因子、多少是能力？归因拆不开的，都是运气。", cfaRef: "CFA · 绩效归因" },
  },
  zhou_mingzhao: {
    deep_research: { concept: "估值分位", line: "别只看方向，看你在第几层估值分位上出手。赔率比胜率更长久。", cfaRef: "CFA · 估值与安全边际" },
    expert_interview: { concept: "政策传导", line: "政策到订单之间隔着三层时滞。问清楚「什么时候见效」，比问「好不好」重要。", cfaRef: "CFA · 宏观与政策传导" },
    roadshow: { concept: "拐点思维", line: "我看拐点不看趋势。最拥挤的地方，往往离拐点最近。", cfaRef: "CFA · 周期与拐点" },
    risk_alert: { concept: "安全边际", line: "先想清楚错了怎么办，再想对了赚多少。边界划不清，再对的判断也是赌。", cfaRef: "CFA · 风险管理" },
    self_care: { concept: "长跑节奏", line: "研究是马拉松。把自己熬没了，再好的框架也没人跑。", cfaRef: "CFA · 决策卫生" },
    help_colleague: { concept: "情景框架", line: "把外生冲击嵌进宏观模型，是教科书学不到的。你帮我补的变量，让我的情景更真了。", cfaRef: "CFA · 情景分析" },
    committee_defense: { concept: "概率与赔率", line: "我只认一件事：你把概率和赔率都写出来了。这比喊方向专业。", cfaRef: "CFA · 预期收益框架" },
    data_deep_dive: { concept: "微观结构", line: "制度一变，价格发现机制就变。尊重规则变化，规则才不会惩罚你。", cfaRef: "CFA · 市场微观结构" },
  },
};

function frameworkOfLocal(decision: ResearchDecision, story: StoryArc): CharacterId {
  if (decision.framework) return decision.framework;
  return decision.effects.characterRelations[0]?.characterId ?? story.characterId;
}

// Resolve the knowledge card a decision teaches. Prefers an explicit
// `teaches` on the decision; otherwise derives one from the engaged framework
// and the decision category, so every choice — even legacy JSON — teaches.
export function pickKnowledgeCard(decision: ResearchDecision, story: StoryArc): KnowledgeCard {
  if (decision.teaches) return decision.teaches;
  const mentor = frameworkOfLocal(decision, story);
  const t = MENTOR_TEACHINGS[mentor as MentorId]?.[decision.category];
  if (!t) {
    return {
      id: `generic_${decision.category}`,
      concept: "研究方法",
      mentorId: mentor,
      mentorLine: "每一次选择都是一次练习。复盘时问自己：我这次为什么这么想？",
      tier: 1,
    };
  }
  return {
    id: `kc_${mentor}_${decision.category}`,
    concept: t.concept,
    mentorId: mentor,
    mentorLine: t.line,
    cfaRef: t.cfaRef,
    tier: 1,
  };
}

// ── In-voice monologues for the grade-driven / liability branches ──
const GRADE_MONO: Record<"respect" | "watch" | "liability", Record<MentorId, string>> = {
  respect: {
    lin_ruoning: "这条线你不是蒙对的。推导链我反复看过了——下次这种判断，我放心交给你。",
    chen_xinghe: "量价信号没骗你，你也没骗自己。这种诚实，比一次 Alpha 更值钱。",
    zhou_mingzhao: "结果之外，我更看重你给风险留的位置。能守住框架的人，才走得远。",
  },
  watch: {
    lin_ruoning: "这次我得盯紧你。结论漂亮，但中间的跳步我数不清——下个月我要看你的推导。",
    chen_xinghe: "信号你这次没读透。没关系，但再乱下结论，我就不帮你兜底了。",
    zhou_mingzhao: "风口上谁都能喊对一次。你这次边界没划清，我得看着你，别被反身性反噬。",
  },
  liability: {
    lin_ruoning: "结论对，可你是空降的——像提前看到了答案。我要的是你能把每一步讲给我听。",
    chen_xinghe: "你这结论来得比我信号还快。数据呢？把推导链摊开，我要看中间那几步。",
    zhou_mingzhao: "你跳过了验证直接给答案，这让我不安。答案会过期，能复用的方法不会。",
  },
};

const DEBT_MONO =
  "你还记得年初帮我跑因子的那次吗？下周的闭门路演，我给你留了座——自己人才能进的门。";

function monoNode(id: string, cid: CharacterId, mood: string, text: string): SceneNode {
  return {
    id,
    type: "dialogue",
    characterId: cid,
    speaker: CHARACTERS[cid].name,
    role: CHARACTERS[cid].role,
    mood,
    text,
    prompt: "点击继续。",
    pose: "soft",
    bg: "research-room",
    bgm: "morning-loop",
    voiceCue: "key",
  };
}

// Grade-driven + liability + delayed-debt branches, generated per character so
// the same flag logic serves all three colleagues. All are flag-gated, so they
// never fire in a fresh or test state (keeping node-count tests stable).
const GRADE_BRANCHES: Branch[] = (["lin_ruoning", "chen_xinghe", "zhou_mingzhao"] as MentorId[]).flatMap(
  (cid) =>
    (["respect", "watch", "liability"] as const).map((kind) => ({
      id: `grade-${kind}-${cid}`,
      label: `${kind}·${CHARACTERS[cid].name}`,
      when: {
        kind: "flag" as const,
        key: kind === "respect" ? `respect_${cid}` : kind === "watch" ? `watch_${cid}` : `parachuted_${cid}`,
      },
      once: true,
      contribute: {
        nodes: [monoNode(`g-${kind}-${cid}`, cid, "认真", GRADE_MONO[kind][cid])],
      },
    })),
);

const DEBT_BRANCH: Branch = {
  id: "debt-xinghe-seat",
  label: "迟来的闭门席位",
  when: {
    kind: "and",
    of: [{ kind: "flag", key: "helped_xinghe" }, { kind: "month", gte: 8 }],
  },
  once: true,
  contribute: {
    nodes: [monoNode("debt-xinghe-seat", "chen_xinghe", "俏皮", DEBT_MONO)],
  },
};

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

// 赵承宇（同级同事）的实战插话分支：把「研究 vs 成交」的张力摆到玩家面前。
const PEER_BRANCH: Branch = {
  id: "peer-zhao-execution",
  label: "赵承宇的盘口插话",
  when: {
    kind: "and",
    of: [
      { kind: "metric", key: "teamTrust", gte: 50 },
      { kind: "month", gte: 2 },
    ],
  },
  once: true,
  injectAt: "after-memory",
  contribute: {
    nodes: [
      {
        id: "peer-zhao-banter",
        type: "dialogue",
        characterId: "zhao_chengyu",
        speaker: "赵承宇",
        role: "交易台同级同事",
        mood: "随意",
        text: "赵承宇把椅子转过来，手里转着笔：你们研究员又在会议室拆框架了？说真的，你上次那份东西逻辑我看了，挺顺。但市场认不认，得看有没有人真金白银接。要不要我带你看看盘口怎么说话？",
        prompt: "点击继续。",
        pose: "soft",
        bg: "research-room",
        bgm: "morning-loop",
        voiceCue: "key",
      },
    ],
    decisions: [
      {
        ...d({
          id: "peer-zhao-exec-check",
          label: "跟赵承宇去交易台看一笔真实成交",
          category: "data_deep_dive",
          description: "研究说得再漂亮，没承接就是纸上谈兵。去盘口看真实买单怎么说话。代价是少了半天写研报的时间。",
          to: "zhao_chengyu",
          val: 5,
          fx: { viewAccuracy: 8, teamTrust: 8, researchCredibility: 4, fatigue: 4, lifeBalance: -2 },
          ev: 10, cl: 10, rk: 8, rf: 8,
          note: "实战派的视角：成交是研究的试金石，但别被分时图带节奏。",
        }),
        // 教学归属给陈星禾（量价信号），赵承宇本人不进知识卡图鉴。
        framework: "chen_xinghe",
      },
    ],
    setFlags: { peer_zhao_met: true },
  },
};

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
  ...GRADE_BRANCHES,
  DEBT_BRANCH,
  // 同级同事赵承宇的实战插话：不进浪漫线、不进图鉴。teamTrust 够高（你是个体面
  // 队友）且在年中之后触发一次，用盘口视角给研究做压力测试，也暴露他自己的毛病——
  // 他信成交胜过信框架，容易在热闹里追涨。framework 指给陈星禾，避免给玩家塞知识卡。
  PEER_BRANCH,
];

// The three colleagues each form a defensible hypothesis from the same future
// memory. Showing them side by side is the core "plural truths" beat — there is
// no single correct answer, only frameworks you choose to stand behind.
function buildCompetingNode(story: StoryArc, theme: MarketTheme, monthIndex: number): SceneNode {
  const ch = theme.competingHypotheses;
  const parts: string[] = [];
  if (ch?.lin) parts.push(`林若宁的基本面说：${ch.lin}`);
  if (ch?.chen) parts.push(`陈星禾的量价说：${ch.chen}`);
  if (ch?.zhou) parts.push(`周明昭的风控说：${ch.zhou}`);
  const body = parts.length > 0
    ? `${parts.join("；")}。没有哪个是标准答案——你站哪边，哪边就认你，哪边也会在后面盯着你。`
    : "三种框架摆在你面前，没有哪个是标准答案——你站哪边，哪边就认你，哪边也会在后面盯着你。";
  return {
    id: `m${monthIndex}-competing`,
    type: "dialogue",
    characterId: story.characterId,
    speaker: story.speaker,
    role: story.role,
    mood: "认真",
    text: body,
    prompt: "点击继续，进入本月研究选择。",
    pose: "thinking",
    bg: "research-room",
    bgm: "morning-loop",
    voiceCue: "key",
  };
}

export function buildMonthScene(
  monthIndex: number,
  year?: string,
  state?: GameState,
): MonthScene {
  const actualYear = year || "2025";
  if (actualYear === "demo") return buildDemoChapter(monthIndex, state);
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

  const competingNode: SceneNode | null =
    state && monthIndex >= 1 && theme.competingHypotheses
      ? buildCompetingNode(story, theme, monthIndex)
      : null;

  const nodes: SceneNode[] = [
    memoryNode,
    ...(competingNode ? [competingNode] : []),
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
      text: `我知道一个具体的事实：${theme.knownEvent ?? "有些事会真的发生，但不是以价格告诉我的方式。"}
但我不能直接喊方向——我得把它翻译成当下能验证的研究假设，再选一个框架去落地。`,
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

export const GRADE_REVIEWS: Record<MentorId, Record<string, string[]>> = {
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
