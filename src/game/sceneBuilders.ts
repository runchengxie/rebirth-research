import type {
  Branch,
  BranchMetaContext,
  CharacterId,
  DecisionMethod,
  GameState,
  KnowledgeCard,
  MarketTheme,
  MentorId,
  MonthScene,
  ResearchDecision,
  SceneNode,
} from "../types";
import type { SceneBeatKey } from "./narrativeSemantics";
import { decisionMethod, decisionQuality, sceneProfileFor } from "./narrativeSemantics";
import { activeBranches } from "./branching";
import { affinityNodeFor } from "./affinityBeats";
import {
  STORY_ARCS,
  YEAR_ARC_LINES,
  YEAR_ARC_MISSIONS,
  MENTOR_LENS,
  getTheme,
  type StoryArc,
} from "./storyArcs";
import { BRANCHES } from "./branches";
import { makeDecisions2025 } from "./content2025";
import { makeDecisions2023 } from "./content2023";
import { makeDecisions2024 } from "./content2024";
import { buildDemoChapter, makeDecisionsDemo } from "./contentDemo";

// ═══════════════════════════════════════════════════════════
// Knowledge cards — the "platform" payoff
// ═══════════════════════════════════════════════════════════

type Teaching = { concept: string; line: string; learningRef: string };

export const MENTOR_TEACHINGS: Record<MentorId, Partial<Record<DecisionMethod, Teaching>>> = {
  lin_ruoning: {
    fundamental_research: { concept: "产业链交叉验证", line: "别只看一个点。把上游、中游、下游的节奏差拆开，超额收益藏在断层里。", learningRef: "金融基础 · 权益估值与产业链验证" },
    field_research: { concept: "一线验证", line: "研报会说漂亮话，但经销商的库存、厂长的语气不会。去一线，比看十篇纪要都值钱。", learningRef: "金融基础 · 尽职调查与一手信息" },
    communication: { concept: "框架翻译", line: "把复杂逻辑讲成人能听懂的故事，是研究员的基本功。客户追问的那两个问题，就是你框架的漏洞。", learningRef: "金融基础 · 投资沟通" },
    risk_management: { concept: "反身性", line: "当所有人都觉得这回不一样，风险往往已经很高。及时提醒团队冷静，也是在守住风险边界。", learningRef: "金融基础 · 行为金融与反身性" },
    self_management: { concept: "判断节奏", line: "脑子不清亮的时候，任何判断都打折。先把自己救回来，研究不会跑。", learningRef: "金融基础 · 决策卫生" },
    collaboration: { concept: "模型直觉", line: "帮人改模型，也是在练自己的手感。你今天搭的每一根假设，明天都会长回你自己的框架里。", learningRef: "金融基础 · 财务建模" },
    committee_process: { concept: "假设可视化", line: "投委会需要看清你的推导过程。把概率和赔率都摆出来，比只喊方向有用。", learningRef: "金融基础 · 投资论述" },
    quantitative_research: { concept: "数据诚实", line: "数据不会替你下结论，但会揭穿你的偷懒。先问「这数怎么来的」，再问「说明什么」。", learningRef: "金融基础 · 量化与数据质量" },
  },
  chen_xinghe: {
    fundamental_research: { concept: "量价背离", line: "价格会骗人，成交量不会。量在价先，结构比方向诚实。", learningRef: "金融基础 · 市场微观结构" },
    field_research: { concept: "信号交叉", line: "一手信息能校准你的因子。别只信回测，去问圈内人信号变没变。", learningRef: "金融基础 · 另类数据与调研" },
    communication: { concept: "信号翻译", line: "把因子讲成人话，是量化员的修行。客户听得懂，才会信你的 Alpha。", learningRef: "金融基础 · 投资沟通" },
    risk_management: { concept: "因子拥挤度", line: "所有人都挤一个方向时，风险溢价趋近零。这时候还冲，是在给前人接盘。", learningRef: "金融基础 · 因子投资与拥挤度" },
    self_management: { concept: "噪声与信号", line: "连轴转会让信噪比下降。充分休息能给模型留出干净输入。", learningRef: "金融基础 · 决策卫生" },
    collaboration: { concept: "交叉验证", line: "量化和基本面打架时，真理通常在中间。你帮我校准的那一下，我也学会了怎么读生意。", learningRef: "金融基础 · 多因子融合" },
    committee_process: { concept: "因子正交", line: "把动量因子的干扰拆掉，你的净 Alpha 才纯。混着讲，等于什么都没说。", learningRef: "金融基础 · Barra 归因" },
    quantitative_research: { concept: "Barra 归因", line: "收益里多少是因子、多少是能力？归因拆不开的，都是运气。", learningRef: "金融基础 · 绩效归因" },
  },
  zhou_mingzhao: {
    fundamental_research: { concept: "估值分位", line: "别只看方向，看你在第几层估值分位上出手。赔率比胜率更长久。", learningRef: "金融基础 · 估值与安全边际" },
    field_research: { concept: "政策传导", line: "政策到订单之间隔着三层时滞。问清楚「什么时候见效」，比问「好不好」重要。", learningRef: "金融基础 · 宏观与政策传导" },
    communication: { concept: "拐点思维", line: "我看拐点不看趋势。最拥挤的地方，往往离拐点最近。", learningRef: "金融基础 · 周期与拐点" },
    risk_management: { concept: "安全边际", line: "先想清楚错了怎么办，再想对了赚多少。边界划不清，再对的判断也是赌。", learningRef: "金融基础 · 风险管理" },
    self_management: { concept: "长跑节奏", line: "研究是马拉松。把自己熬没了，再好的框架也没人跑。", learningRef: "金融基础 · 决策卫生" },
    collaboration: { concept: "情景框架", line: "把外生冲击嵌进宏观模型，是教科书学不到的。你帮我补的变量，让我的情景更真了。", learningRef: "金融基础 · 情景分析" },
    committee_process: { concept: "概率与赔率", line: "我只认一件事：你把概率和赔率都写出来了。这比喊方向专业。", learningRef: "金融基础 · 预期收益框架" },
    quantitative_research: { concept: "微观结构", line: "制度一变，价格发现机制就变。尊重规则变化，规则才不会惩罚你。", learningRef: "金融基础 · 市场微观结构" },
  },
};

function frameworkOfLocal(decision: ResearchDecision, story: StoryArc): CharacterId {
  if (decision.framework) return decision.framework;
  return decision.effects.characterRelations[0]?.characterId ?? story.characterId;
}

export function pickKnowledgeCard(decision: ResearchDecision, story: StoryArc): KnowledgeCard {
  if (decision.teaches) return decision.teaches;
  const mentor = frameworkOfLocal(decision, story);
  const method = decisionMethod(decision);
  if (decisionQuality(decision) === "reckless" || method === "market_chasing") {
    return {
      id: `kc_${mentor}_validation_before_conclusion`,
      concept: "验证先于结论",
      mentorId: mentor,
      mentorLine: "方向猜对一次不值钱。先把证据、反例和退出条件写清楚，结论才有复用价值。",
      learningRef: "金融基础 · 证据链与风险边界",
      tier: 1,
    };
  }
  const teaching = MENTOR_TEACHINGS[mentor as MentorId]?.[method];
  if (!teaching) {
    return {
      id: `generic_${method}`,
      concept: "研究方法",
      mentorId: mentor,
      mentorLine: "每一次选择都是一次练习。复盘时问自己：我这次为什么这么想？",
      tier: 1,
    };
  }
  return {
    id: `kc_${mentor}_${method}`,
    concept: teaching.concept,
    mentorId: mentor,
    mentorLine: teaching.line,
    learningRef: teaching.learningRef,
    tier: 1,
  };
}

function makeResearchDecisions(year: string, monthIndex: number): ResearchDecision[] {
  if (year === "demo") return makeDecisionsDemo(monthIndex);
  if (year === "2025") return makeDecisions2025(monthIndex);
  if (year === "2023") return makeDecisions2023(monthIndex);
  if (year === "2024") return makeDecisions2024(monthIndex);
  return [];
}

function buildCompetingNode(story: StoryArc, monthIndex: number): SceneNode {
  return {
    id: `m${monthIndex}-competing`,
    type: "dialogue",
    characterId: story.characterId,
    speaker: story.speaker,
    role: story.role,
    mood: "认真",
    text: "三位同事给出了各自的判断。选择一条证据链，也要留意它暂时解释不了的部分。",
    prompt: "点击继续，进入本月研究选择。",
    pose: "thinking",
    bg: "research-room",
    bgm: "morning-loop",
    voiceCue: "key",
  };
}

type BranchContributions = {
  afterMemory: SceneNode[];
  beforeDecision: SceneNode[];
  decisions: ResearchDecision[];
  overrideDecision: Branch["contribute"]["overrideDecision"];
};

function collectBranchContributions(
  state?: GameState,
  branchMeta?: BranchMetaContext,
): BranchContributions {
  const contributions: BranchContributions = {
    afterMemory: [],
    beforeDecision: [],
    decisions: [],
    overrideDecision: undefined,
  };
  const branches = state ? activeBranches(state, BRANCHES, branchMeta) : [];
  for (const branch of branches) {
    const target = branch.injectAt === "after-memory"
      ? contributions.afterMemory
      : contributions.beforeDecision;
    target.push(...(branch.contribute.nodes ?? []));
    contributions.decisions.push(...(branch.contribute.decisions ?? []));
    contributions.overrideDecision = {
      ...contributions.overrideDecision,
      ...branch.contribute.overrideDecision,
    };
  }
  return contributions;
}

function competingNodeFor(
  state: GameState | undefined,
  story: StoryArc,
  theme: MarketTheme,
  monthIndex: number,
): SceneNode | null {
  const enabled = Boolean(state && monthIndex >= 1 && theme.competingHypotheses);
  return enabled ? buildCompetingNode(story, monthIndex) : null;
}

function buildMemoryNode(story: StoryArc, theme: MarketTheme, monthIndex: number): SceneNode {
  return {
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
}

function buildColleagueNode(
  story: StoryArc,
  theme: MarketTheme,
  arcLine: string,
  monthIndex: number,
): SceneNode {
  return {
    id: `m${monthIndex}-colleague`,
    type: "dialogue",
    characterId: story.characterId,
    speaker: story.speaker,
    role: story.role,
    mood: story.mood,
    text: `${arcLine} ${theme.publicContext}`,
    prompt: "点击继续，进入本月研究选择。",
    pose: "soft",
    bg: "research-room",
    bgm: "morning-loop",
    voiceCue: "key",
  };
}

function buildDecisionNode(
  story: StoryArc,
  theme: MarketTheme,
  monthIndex: number,
  arcMission: string,
  decisions: ResearchDecision[],
  overrideDecision: Branch["contribute"]["overrideDecision"],
): SceneNode {
  return {
    id: `m${monthIndex}-decision`,
    type: "decision",
    characterId: story.characterId,
    speaker: story.speaker,
    role: story.role,
    mood: story.mood,
    text: "先安排本话日程，然后选择一个你愿意负责到底的研究方向。",
    prompt: arcMission,
    pose: "smile",
    bg: "briefing-room",
    bgm: "morning-loop",
    voiceCue: "key",
    decisions,
    decisionPrompt: arcMission,
    briefTitle: `${theme.period}：${theme.title}`,
    briefs: [
      { characterId: "lin_ruoning", label: "基本面视角", text: theme.competingHypotheses?.lin ?? `${theme.publicContext.split("。")[0]}。` },
      { characterId: "chen_xinghe", label: "量化信号", text: theme.competingHypotheses?.chen ?? MENTOR_LENS[monthIndex % MENTOR_LENS.length].chen },
      { characterId: "zhou_mingzhao", label: "宏观风控", text: theme.competingHypotheses?.zhou ?? MENTOR_LENS[monthIndex % MENTOR_LENS.length].zhou },
    ],
    ...overrideDecision,
  };
}

function optionalNode(node: SceneNode | null): SceneNode[] {
  return node ? [node] : [];
}

export function buildMonthScene(
  monthIndex: number,
  year?: string,
  state?: GameState,
  branchMeta?: BranchMetaContext,
): MonthScene {
  const actualYear = year || "2025";
  if (actualYear === "demo") return buildDemoChapter(monthIndex, state);

  const story = STORY_ARCS[monthIndex % STORY_ARCS.length];
  const arcLine = YEAR_ARC_LINES[actualYear]?.[monthIndex] ?? story.line;
  const arcMission = YEAR_ARC_MISSIONS[actualYear]?.[monthIndex] ?? story.mission;
  const monthNumber = monthIndex + 1;
  const month = `${actualYear}-${String(monthNumber).padStart(2, "0")}`;
  const label = `${actualYear}年${monthNumber}月`;
  const theme = getTheme(actualYear, monthIndex);

  if (actualYear === "2025" && monthIndex === 0) {
    return build2025Prologue(month, label, theme);
  }

  const branch = collectBranchContributions(state, branchMeta);
  const decisionNode = buildDecisionNode(
    story,
    theme,
    monthIndex,
    arcMission,
    [...makeResearchDecisions(actualYear, monthIndex), ...branch.decisions],
    branch.overrideDecision,
  );
  const nodeGroups: Record<SceneBeatKey, SceneNode[]> = {
    memory: [buildMemoryNode(story, theme, monthIndex)],
    competing: optionalNode(competingNodeFor(state, story, theme, monthIndex)),
    afterMemory: branch.afterMemory,
    affinity: optionalNode(affinityNodeFor(state, story.characterId, monthIndex)),
    colleague: [buildColleagueNode(story, theme, arcLine, monthIndex)],
    beforeDecision: branch.beforeDecision,
    decision: [decisionNode],
  };
  const nodes = sceneProfileFor(actualYear).beats.flatMap((beat) => nodeGroups[beat]);

  return {
    id: `${year || "default"}-m${monthIndex}`,
    year,
    monthIndex,
    month,
    label,
    theme,
    nodes,
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
      text: `我知道一个具体的事实：${theme.knownEvent ?? "有些事确实会发生，只是价格不会直接告诉我答案。"}
但我不能直接喊方向，我得把它翻译成当下能验证的研究假设，再选一个框架去落地。`,
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
      text: "陈星禾抱着平板冲进会议室：早盘 Barra 归因跑完了！AI 应用方向的收益里，动量因子贡献了超过六成，基本面因子的贡献还不到两成。换句话说，现在涨的更多是情绪溢价和拥挤交易，业绩还没有得到验证。你们的基本面故事还没被市场真正定价。",
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
      text: "她点开大单流向分布：我只信成交量和订单簿。AI 方向的盘口厚度在收窄，但大单净买还在流入。这说明成交量先动，供给也在积聚。短期内动量还能跑，但 Alpha 衰减速度比上周快了一倍。如果你要做研究推荐，最好等成交结构重新确认。",
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
      text: "陈星禾把平板转向你：我负责盯信号。大单流向、因子拥挤度、Alpha 衰减速度，这三个指标如果同时变脸，我就拉警报。在那之前，你只管做你的研究。量比价诚实，信我。",
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
        { characterId: "chen_xinghe", label: "量化信号", text: "Barra 归因显示动量因子主导。大单流向还在净买，但盘口厚度在收窄。量比价诚实，但信号在衰减。" },
        { characterId: "zhou_mingzhao", label: "宏观风控", text: "三个框架重叠的地方最安全。如果事件只是脉冲而没有业绩接力，估值和拥挤度会在月末反噬。" },
      ],
    },
  ];

  return { id: "2025-scene-prologue", year: "2025", monthIndex: 0, month, label, theme, nodes };
}

export const YEAR_SCENE_BUILDERS: Record<string, (monthIndex: number) => MonthScene> = {
  "2023": (monthIndex: number) => buildMonthScene(monthIndex, "2023"),
  "2024": (monthIndex: number) => buildMonthScene(monthIndex, "2024"),
  "2025": (monthIndex: number) => buildMonthScene(monthIndex, "2025"),
};
