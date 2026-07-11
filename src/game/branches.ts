import type { Branch, CharacterId, MentorId, SceneNode } from "../types";
import { CHARACTERS, AFFINITY_GATE } from "./characters";
import { d } from "./decisionFactory";

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

// 赵承宇「分歧张力」线：把原来单次 once 的数据插话，升级成带走向的多节点弧。
// 赵现为量化组同事，张力从「研究框架 vs 交易盘口」改为「研究框架 vs 量化数据」。
// 全程不进浪漫线、不进图鉴，framework 借给陈星禾；基调是同级好兄弟「该较真较真、该兜底兜底」。

// 分歧 beat：赵承宇和你在一笔数据上意见相左。三个选项各自带 setsFlags，把「你这
// 次的立场」写进 peer_stand / peer_yield / peer_fence，并统一置 peer_tension 防重复触发。
const PEER_CLASH_BRANCH: Branch = {
  id: "peer-zhao-clash",
  label: "赵承宇和你意见相左",
  when: {
    kind: "and",
    of: [
      { kind: "flag", key: "peer_zhao_met" },
      { kind: "not", of: { kind: "flag", key: "peer_tension" } },
      { kind: "month", gte: 3 },
    ],
  },
  once: true,
  injectAt: "after-memory",
  contribute: {
    nodes: [
      {
        id: "peer-zhao-clash-setup",
        type: "dialogue",
        characterId: "zhao_chengyu",
        speaker: "赵承宇",
        role: "量化组同级同事",
        mood: "认真",
        text: "赵承宇把平板往你桌上一扣：你这因子我复算了一遍，样本区间挑得巧，幸存者偏差没剔干净。你认你的框架，我认我的数据——咱俩得对一遍才能落槌。你说怎么收？",
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
          id: "peer-clash-stand",
          label: "当场把框架摊开跟他核对：样本剔除是口径问题，先等交叉验证",
          category: "committee_defense",
          description: "你坚持框架，把数据的扰动当成噪声。他皱了眉，但点头说有道理。锚不能丢，他也记下了你的坚持。",
          to: "zhao_chengyu",
          val: 10,
          fx: { researchCredibility: 4, teamTrust: 2, fatigue: 2 },
          ev: 10, cl: 12, rk: 10, rf: 8,
          note: "框架是你的锚，但锚太硬也会错过数据里的真信号。",
          setsFlags: { peer_stand: true, peer_tension: true },
        }),
        framework: "chen_xinghe",
      },
      {
        ...d({
          id: "peer-clash-yield",
          label: "先顺他的数据看看，不急着下结论",
          category: "data_deep_dive",
          description: "你压下自己的框架，先去数据里看一眼。他挑眉：哟，研究员也会低头看回测？",
          to: "zhao_chengyu",
          val: 10,
          fx: { viewAccuracy: 4, teamTrust: 4, fatigue: 2 },
          ev: 8, cl: 10, rk: 8, rf: 8,
          note: "有时候数据比框架快半拍——但只看回测，迟早被过拟合带节奏。",
          setsFlags: { peer_yield: true, peer_tension: true },
        }),
        framework: "chen_xinghe",
      },
      {
        ...d({
          id: "peer-clash-fence",
          label: "各退半步：约好收盘一起复盘",
          category: "help_colleague",
          description: "你俩谁也说服不了谁，干脆约好收盘后对着数据和研报一起过。专业人的体面。",
          to: "zhao_chengyu",
          val: 10,
          fx: { teamTrust: 6, researchCredibility: 2, fatigue: 2 },
          ev: 8, cl: 8, rk: 8, rf: 10,
          note: "分歧不可怕，可怕的是分歧之后不再坐到一张桌上。",
          setsFlags: { peer_fence: true, peer_tension: true },
        }),
        framework: "chen_xinghe",
      },
    ],
  },
};

// 结算 beat：按 peer_clash 的取向，分流成 和解 / 认同 / 中性 三种走向。
// 每条 only 在对应立场旗标为真、且进入下半年（month>=7）时触发一次。
const PEER_RESOLVE_STAND: Branch = {
  id: "peer-zhao-resolve-stand",
  label: "赵承宇认了你的框架",
  when: { kind: "and", of: [{ kind: "flag", key: "peer_stand" }, { kind: "month", gte: 7 }] },
  once: true,
  injectAt: "after-memory",
  contribute: {
    nodes: [
      monoNode(
        "peer-zhao-resolve-stand",
        "zhao_chengyu",
        "认真",
        "赵承宇靠在门框上：上次那票，回测一跑，居然真是样本偏差。你那套框架，拦住了我一次。以后你认框架、我认数据，咱俩分开看、合起来用。",
      ),
    ],
    decisions: [
      {
        ...d({
          id: "peer-resolve-stand-close",
          label: "和他碰个拳，约好下一笔一起盯",
          category: "help_colleague",
          description: "研究认框架、数据认回测，你们成了投研部最稳的一对眼睛。",
          to: "zhao_chengyu",
          val: 10,
          fx: { teamTrust: 6, researchCredibility: 2 },
          ev: 6, cl: 8, rk: 8, rf: 8,
          note: "一个看框架，一个看数据——组合里回撤最可控的几笔，都写着你们俩。",
        }),
        framework: "chen_xinghe",
      },
    ],
  },
};

const PEER_RESOLVE_YIELD: Branch = {
  id: "peer-zhao-resolve-yield",
  label: "赵承宇乐了，但你也稳",
  when: { kind: "and", of: [{ kind: "flag", key: "peer_yield" }, { kind: "month", gte: 7 }] },
  once: true,
  injectAt: "after-memory",
  contribute: {
    nodes: [
      monoNode(
        "peer-zhao-resolve-yield",
        "zhao_chengyu",
        "兴奋",
        "赵承宇敲着你桌子：服不服？那次数据真给了信号，比你框架快半拍。不过他也挠头：没你那套框架兜底，我那会儿早冲进过拟合里去了。咱俩，一个快一个稳。",
      ),
    ],
    decisions: [
      {
        ...d({
          id: "peer-resolve-yield-close",
          label: "笑着拍他肩：下次你快、我稳，搭档着来",
          category: "help_colleague",
          description: "数据认快、框架认稳，你们把长短板拼成了一张完整的图。",
          to: "zhao_chengyu",
          val: 10,
          fx: { teamTrust: 6, viewAccuracy: 2 },
          ev: 6, cl: 8, rk: 8, rf: 8,
          note: "他快你稳，搭档着来，谁也不抢谁的风头。",
        }),
        framework: "chen_xinghe",
      },
    ],
  },
};

const PEER_RESOLVE_FENCE: Branch = {
  id: "peer-zhao-resolve-fence",
  label: "你们真的坐到了一张桌上",
  when: { kind: "and", of: [{ kind: "flag", key: "peer_fence" }, { kind: "month", gte: 7 }] },
  once: true,
  injectAt: "after-memory",
  contribute: {
    nodes: [
      monoNode(
        "peer-zhao-resolve-fence",
        "zhao_chengyu",
        "随意",
        "赵承宇把复盘笔记推过来：上次约的复盘，咱真坐下了。数据和研究头一回在一张桌上对完——没谁服谁，但下一次，咱会先对一遍再出数。",
      ),
    ],
    decisions: [
      {
        ...d({
          id: "peer-resolve-fence-close",
          label: "和他击掌：下笔之前先对一遍",
          category: "help_colleague",
          description: "分歧没消，但你们建起了先对齐再动手的默契。",
          to: "zhao_chengyu",
          val: 10,
          fx: { teamTrust: 6, researchCredibility: 2 },
          ev: 6, cl: 8, rk: 8, rf: 8,
          note: "专业人的体面：可以不认同，但先对齐再动手。",
        }),
        framework: "chen_xinghe",
      },
    ],
  },
};

// ── 赵承宇（量化组同级同事）全年「在场」+ 延迟后果弧 ──
// 三处分支共同构成一条干净的 peer 线：第一话求助（埋种）→ 年中数据压力测试
// （再加一次在场）→ 第九话还人情（延迟后果兑现）。全部不进浪漫线、不进图鉴，
// framework 一律借给陈星禾；基调是同级好兄弟之间「记人情、互相兜底」的正向友谊。

// 第一话：赵承宇卡在一笔因子回测上，玩家可抽半天帮一把。选了则好感给赵承宇，
// 并在引擎里埋下 helped_zhao 旗标（第九话还人情）。month gte 1 = 第一话（序章为 0）。
const PEER_HELP_BRANCH: Branch = {
  id: "peer-zhao-help",
  label: "赵承宇卡在因子回测上",
  when: { kind: "month", gte: 1 },
  once: true,
  injectAt: "after-memory",
  contribute: {
    nodes: [
      {
        id: "peer-zhao-help-setup",
        type: "dialogue",
        characterId: "zhao_chengyu",
        speaker: "赵承宇",
        role: "量化组同级同事",
        mood: "随意",
        text: "赵承宇端着咖啡蹭到你工位：有个因子回测卡住了，分组收益怎么都对不齐基准。你们研究员最会抠这种细节，对吧？帮我把这口气顺了，下回你那份研报要过投委会，我帮你把数据先核一遍。",
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
          id: "peer-zhao-help-offer",
          label: "抽半天帮赵承宇顺一遍因子回测",
          category: "help_colleague",
          description: "同事卡住了，顺手帮一把。代价是少了半天写研报的时间，但量化组欠你一次人情。",
          to: "zhao_chengyu",
          val: 10,
          fx: { teamTrust: 6, researchCredibility: 2, fatigue: 4, lifeBalance: -2 },
          ev: 8, cl: 8, rk: 6, rf: 6,
          note: "数据人的账本记在回测上：你帮过他，他就会记得。",
        }),
        // 教学归属借给陈星禾（量价/因子），赵承宇本人不进知识卡图鉴。
        framework: "chen_xinghe",
      },
    ],
    setFlags: { peer_zhao_met: true },
  },
};

// 年中：在 PEER_BRANCH 之外，给夏天再加一次「在场」。把研究 vs 数据的张力再摆
// 一次，也暴露他信数据胜过框架、容易在拥挤里追涨的毛病。
const PEER_MID_BRANCH: Branch = {
  id: "peer-zhao-mid",
  label: "赵承宇的量化喊话",
  when: {
    kind: "and",
    of: [
      { kind: "flag", key: "peer_zhao_met" },
      { kind: "month", gte: 5 },
    ],
  },
  once: true,
  injectAt: "after-memory",
  contribute: {
    nodes: [
      {
        id: "peer-zhao-mid-banter",
        type: "dialogue",
        characterId: "zhao_chengyu",
        speaker: "赵承宇",
        role: "量化组同级同事",
        mood: "兴奋",
        text: "赵承宇隔着工位喊：你上回那份推演，今早数据真给面子——分组收益站上去了。不过别飘，动量因子拥挤第三天最容易是回撤。要信框架，也要留根风控的绳子，别学我光顾着冲。",
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
          id: "peer-zhao-mid-check",
          label: "跟赵承宇对照一次数据与研究的偏差",
          category: "data_deep_dive",
          description: "研究说向好，因子却在拥挤。去量化组看一眼真实分布，免得在热闹里追涨。代价是半天案头时间。",
          to: "zhao_chengyu",
          val: 10,
          fx: { viewAccuracy: 8, teamTrust: 6, researchCredibility: 4, fatigue: 4, lifeBalance: -2 },
          ev: 10, cl: 10, rk: 8, rf: 8,
          note: "他信数据胜过框架，但你俩合起来，研究才不被噪声带节奏。",
        }),
        framework: "chen_xinghe",
      },
    ],
    setFlags: { peer_zhao_mid: true },
  },
};

// 第九话：呼应第一话的 helped_zhao 旗标，做延迟后果兑现。只在玩家真的帮过他时
// 触发。基调是同级同事之间「记人情、互相兜底」的正向友情，不进浪漫线、不进图鉴。
const PEER_DEBT_BRANCH: Branch = {
  id: "peer-zhao-payback",
  label: "赵承宇的人情返还",
  when: {
    kind: "and",
    of: [{ kind: "flag", key: "helped_zhao" }, { kind: "month", gte: 8 }],
  },
  once: true,
  contribute: {
    nodes: [
      monoNode(
        "peer-zhao-payback",
        "zhao_chengyu",
        "认真",
        "你还记得年初帮我顺因子那次吗？上个月投委会临时要人顶一个席位，我点了你的名——能扛住研究、也看得懂数据的人，量化组认。以后这种门，我给你留着。",
      ),
    ],
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
  // 同级同事赵承宇（量化组）的在场弧：不进浪漫线、不进图鉴。teamTrust 够高（你是个体面
  // 队友）且在年中之后触发一次，用数据视角给研究做压力测试，也暴露他自己的毛病——
  // 他信数据胜过信框架，容易在拥挤里追涨。framework 指给陈星禾，避免给玩家塞知识卡。
  PEER_HELP_BRANCH,
  PEER_MID_BRANCH,
  PEER_DEBT_BRANCH,
  PEER_CLASH_BRANCH,
  PEER_RESOLVE_STAND,
  PEER_RESOLVE_YIELD,
  PEER_RESOLVE_FENCE,
];
