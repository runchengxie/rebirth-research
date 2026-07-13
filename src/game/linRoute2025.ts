import type { Branch, CharacterId, SceneNode } from "../types";
import { BRANCHES } from "./branches";
import { CHARACTERS } from "./characters";
import { d } from "./decisionFactory";

function line(
  id: string,
  text: string,
  mood = "温柔",
  pose = "soft",
): SceneNode {
  return {
    id,
    type: "dialogue",
    characterId: "lin_ruoning",
    speaker: CHARACTERS.lin_ruoning.name,
    role: CHARACTERS.lin_ruoning.role,
    mood,
    text,
    prompt: "点击继续。",
    pose,
    bg: "research-room",
    bgm: "morning-loop",
    voiceCue: "key",
  };
}

const on2025 = { kind: "flag", key: "year_2025" } as const;
const monthFrom = (gte: number) => ({ kind: "month", gte }) as const;
const hasFlag = (key: string) => ({ kind: "flag", key }) as const;
const noFlag = (key: string) => ({ kind: "not", of: hasFlag(key) }) as const;
const linAffinity = (gte: number) => ({
  kind: "affinity",
  characterId: "lin_ruoning" as CharacterId,
  gte,
}) as const;

export const LIN_2025_BRANCHES: Branch[] = [
  {
    id: "lin-2025-early-spark",
    label: "林若宁很早就开始在意你",
    when: { kind: "and", of: [on2025, monthFrom(1)] },
    once: true,
    injectAt: "after-memory",
    contribute: {
      nodes: [
        line(
          "lin-2025-early-spark",
          "林若宁把早餐放在你桌边，便签上写着模型要改的三处。她转身前又停了一下：咖啡我没加糖。你上次说甜的会困，我记得。",
        ),
      ],
      decisions: [
        {
          ...d({
            id: "lin-early-reciprocate",
            label: "把她的便签夹进研究档案，约她一起核对证据链",
            category: "help_colleague",
            method: "collaboration",
            quality: "sound",
            description: "不把照顾当作默认服务，用共同工作回应她的认真。",
            to: "lin_ruoning",
            val: 10,
            fx: { teamTrust: 6, researchCredibility: 4, fatigue: 2 },
            ev: 10,
            cl: 12,
            rk: 8,
            rf: 10,
            note: "她喜欢得不算慢，但她更在意你有没有认真接住。",
            setsFlags: { lin_early_reciprocated: true, lin_private_opened: true },
          }),
          framework: "lin_ruoning" as const,
        },
        {
          ...d({
            id: "lin-early-flirt",
            label: "笑着说：你送来的咖啡，今天确实特别好喝",
            category: "roadshow",
            method: "communication",
            quality: "mixed",
            description: "你把好感说得清楚，但没有要求她立刻回答。",
            to: "lin_ruoning",
            val: 8,
            fx: { lifeBalance: 3, clientFeedback: 2 },
            ev: 6,
            cl: 10,
            rk: 6,
            rf: 8,
            note: "直接表达兴趣没有问题，给她选择空间才是重点。",
            setsFlags: { lin_early_flirted: true, lin_private_opened: true },
          }),
          framework: "lin_ruoning" as const,
        },
        {
          ...d({
            id: "lin-early-rush",
            label: "顺势追问：既然这么关心我，今晚算不算约会？",
            category: "roadshow",
            method: "communication",
            quality: "mixed",
            description: "她的照顾被你迅速解释成关系许可，气氛一下变得有压力。",
            to: "lin_ruoning",
            val: -4,
            fx: { clientFeedback: 2, teamTrust: -2 },
            ev: 2,
            cl: 6,
            rk: 2,
            rf: 3,
            note: "她没有生气，只是把刚才那点柔软收了回去。",
            setsFlags: { lin_rushed_intimacy: true },
          }),
          framework: "lin_ruoning" as const,
        },
      ],
    },
  },
  {
    id: "lin-2025-health-warning",
    label: "早餐不等于赞成你透支",
    when: { kind: "and", of: [on2025, monthFrom(3), linAffinity(32)] },
    once: true,
    injectAt: "after-memory",
    contribute: {
      nodes: [
        line(
          "lin-2025-health-warning",
          "林若宁把你凌晨三点发来的版本放回桌上：我给你送早餐，不代表我赞成你每天凌晨才睡。你再这样下去，模型没坏，人先坏了。",
          "认真",
          "serious",
        ),
      ],
      decisions: [
        {
          ...d({
            id: "lin-promise-rest",
            label: "答应她：这轮结束后不再用通宵证明认真",
            category: "self_care",
            method: "self_management",
            quality: "sound",
            description: "承诺不会立刻加快研究进度，却会成为她以后判断你的证据。",
            to: "lin_ruoning",
            val: 8,
            fx: { fatigue: -8, lifeBalance: 10, teamTrust: 3 },
            ev: 4,
            cl: 8,
            rk: 12,
            rf: 14,
            note: "她没有要求你放弃野心，只要求你别把自毁当作野心。",
            setsFlags: { lin_promised_rest: true },
          }),
          framework: "lin_ruoning" as const,
        },
        {
          ...d({
            id: "lin-share-limit",
            label: "承认自己停不下来，请她帮你一起设复盘和下班线",
            category: "help_colleague",
            method: "collaboration",
            quality: "sound",
            description: "你没有给漂亮保证，而是把边界变成可以共同执行的安排。",
            to: "lin_ruoning",
            val: 9,
            fx: { fatigue: -4, lifeBalance: 7, teamTrust: 7, researchCredibility: 2 },
            ev: 8,
            cl: 10,
            rk: 12,
            rf: 14,
            note: "承认自己需要帮助，比逞强更接近长期可靠。",
            setsFlags: { lin_asked_for_help: true },
          }),
          framework: "lin_ruoning" as const,
        },
        {
          ...d({
            id: "lin-dodge-warning",
            label: "把话题岔回研报：等这次做完再说",
            category: "deep_research",
            method: "fundamental_research",
            quality: "mixed",
            description: "你继续交出漂亮工作，却拒绝回答她真正担心的问题。",
            to: "lin_ruoning",
            val: 2,
            fx: { researchCredibility: 8, fatigue: 10, lifeBalance: -8 },
            ev: 14,
            cl: 12,
            rk: 3,
            rf: 2,
            note: "她会认可这份研报，但不会把认可误认为安心。",
            setsFlags: { lin_dodged_warning: true },
          }),
          framework: "lin_ruoning" as const,
        },
      ],
    },
  },
  {
    id: "lin-2025-promise-kept",
    label: "她发现你真的调整了节奏",
    when: {
      kind: "and",
      of: [
        on2025,
        monthFrom(6),
        { kind: "or", of: [hasFlag("lin_promised_rest"), hasFlag("lin_asked_for_help")] },
        { kind: "metric", key: "lifeBalance", gte: 55 },
        { kind: "metricAtMost", key: "fatigue", lte: 60 },
        noFlag("lin_broke_promise"),
      ],
    },
    once: true,
    contribute: {
      nodes: [
        line(
          "lin-2025-promise-kept",
          "林若宁看了眼时间，先替你合上电脑：你最近真的会停了。她笑得很轻，像终于确认那天的话没有落在空气里。脑子清亮的时候，你的模型也更像你自己。",
        ),
      ],
      setFlags: { lin_kept_promise: true, lin_value_aligned: true },
    },
  },
  {
    id: "lin-2025-promise-broken",
    label: "她不再替你美化透支",
    when: {
      kind: "and",
      of: [
        on2025,
        monthFrom(6),
        hasFlag("lin_promised_rest"),
        { kind: "metric", key: "fatigue", gte: 75 },
        noFlag("lin_kept_promise"),
      ],
    },
    once: true,
    contribute: {
      nodes: [
        line(
          "lin-2025-promise-broken",
          "桌上没有早餐，只有你上次答应准时下班的便签。林若宁把它压在研报下面：我不是怪你忙。我只是不能每次都听你说，下次会不一样。",
          "失望",
          "serious",
        ),
      ],
      setFlags: { lin_broke_promise: true },
    },
  },
  {
    id: "lin-2025-truth-conflict",
    label: "喜欢不能替代证据",
    when: { kind: "and", of: [on2025, monthFrom(7), linAffinity(48)] },
    once: true,
    injectAt: "after-memory",
    contribute: {
      nodes: [
        line(
          "lin-2025-truth-conflict",
          "林若宁把你的结论圈出来：方向可能是对的，可中间这几步还是空的。她看着你，没有退开：我相信你，不代表我会替你假装证据已经存在。",
          "认真",
          "serious",
        ),
      ],
      decisions: [
        {
          ...d({
            id: "lin-admit-uncertainty",
            label: "承认自己知道方向，却还解释不全依据",
            category: "committee_defense",
            method: "committee_process",
            quality: "sound",
            description: "你把确定与不确定分开，让她第一次看见你最难说出口的缺口。",
            to: "lin_ruoning",
            val: 11,
            fx: { teamTrust: 8, researchCredibility: 5, committeeAdoption: 3 },
            ev: 10,
            cl: 16,
            rk: 14,
            rf: 15,
            note: "诚实不会让答案立刻完整，却让你们终于站在同一张纸上。",
            setsFlags: { lin_admitted_uncertainty: true, lin_professional_honest: true },
          }),
          framework: "lin_ruoning" as const,
        },
        {
          ...d({
            id: "lin-rebuild-evidence",
            label: "撤回结论，和她从反例开始重建证据链",
            category: "deep_research",
            method: "fundamental_research",
            quality: "sound",
            description: "你愿意暂时失去一个漂亮答案，换一套可以被推翻、也可以被复用的方法。",
            to: "lin_ruoning",
            val: 10,
            fx: { researchCredibility: 10, teamTrust: 6, fatigue: 5, lifeBalance: -2 },
            ev: 18,
            cl: 17,
            rk: 13,
            rf: 12,
            note: "她喜欢的从来不是你永远正确，是你肯把每一步补回来。",
            setsFlags: { lin_rebuilt_evidence: true, lin_professional_honest: true },
          }),
          framework: "lin_ruoning" as const,
        },
        {
          ...d({
            id: "lin-prove-by-result",
            label: "坚持结果会证明自己：等业务兑现，她自然会明白",
            category: "risk_alert",
            method: "market_chasing",
            quality: "reckless",
            description: "你把未来结果当作今天跳过验证的许可证。",
            to: "lin_ruoning",
            val: -12,
            fx: { committeeAdoption: 8, portfolioNav: 0.02, teamTrust: -8, fatigue: 6 },
            ev: 2,
            cl: 4,
            rk: 1,
            rf: 0,
            note: "结果也许会站在你这边，她却已经看见你开始只想证明自己正确。",
            setsFlags: { lin_used_hindsight_as_proof: true },
          }),
          framework: "lin_ruoning" as const,
        },
      ],
    },
  },
  {
    id: "lin-2025-relationship-confirm",
    label: "她愿意把下一年也交给你",
    when: {
      kind: "and",
      of: [
        on2025,
        monthFrom(9),
        linAffinity(60),
        { kind: "or", of: [hasFlag("lin_kept_promise"), hasFlag("lin_asked_for_help")] },
        { kind: "or", of: [hasFlag("lin_admitted_uncertainty"), hasFlag("lin_rebuilt_evidence")] },
        noFlag("lin_broke_promise"),
        noFlag("lin_used_hindsight_as_proof"),
      ],
    },
    once: true,
    injectAt: "after-memory",
    contribute: {
      nodes: [
        line(
          "lin-2025-relationship-confirm",
          "林若宁把年初那张便签从你屏幕边取下来，背面已经写满了日期。她没有绕弯：我很早就喜欢你。后来慢下来的，是我想确认你会不会好好对待自己，也好好对待我。现在我确认了。",
          "心动",
        ),
      ],
      decisions: [
        {
          ...d({
            id: "lin-commit-next-year",
            label: "接过便签：明年的研究和下班以后，都一起安排",
            category: "roadshow",
            method: "communication",
            quality: "sound",
            description: "关系被说清楚，也保留了两个人各自的工作和边界。",
            to: "lin_ruoning",
            val: 15,
            fx: { lifeBalance: 10, teamTrust: 8, clientFeedback: 3 },
            ev: 6,
            cl: 16,
            rk: 12,
            rf: 15,
            note: "她心动得早，你们用一整年把心动变成了可以长期生活的信任。",
            setsFlags: { lin_route_committed: true },
          }),
          framework: "lin_ruoning" as const,
        },
        {
          ...d({
            id: "lin-slow-next-year",
            label: "握住她的手：先认真走到年底，再一起决定下一年",
            category: "self_care",
            method: "self_management",
            quality: "sound",
            description: "你没有用一个浪漫瞬间替代长期关系的节奏。",
            to: "lin_ruoning",
            val: 10,
            fx: { lifeBalance: 8, teamTrust: 5, fatigue: -4 },
            ev: 4,
            cl: 12,
            rk: 12,
            rf: 15,
            note: "慢一点不是退缩，是把喜欢放进真实生活。",
            setsFlags: { lin_route_slow_burn: true },
          }),
          framework: "lin_ruoning" as const,
        },
      ],
    },
  },
  {
    id: "lin-2025-white-moon",
    label: "彼此喜欢，也可能没有走到一起",
    when: {
      kind: "and",
      of: [
        on2025,
        monthFrom(9),
        linAffinity(55),
        { kind: "or", of: [hasFlag("lin_broke_promise"), hasFlag("lin_used_hindsight_as_proof")] },
        noFlag("lin_route_committed"),
      ],
    },
    once: true,
    injectAt: "after-memory",
    contribute: {
      nodes: [
        line(
          "lin-2025-white-moon",
          "林若宁沉默了很久：我喜欢过你，现在也不是完全不喜欢。可我不能靠喜欢，一次次替你解释失约和跳过验证。她把那张旧便签留给你：这段关系原本能成功，所以我才更难装作没关系。",
          "克制",
          "serious",
        ),
      ],
      setFlags: { lin_route_regret: true },
      decisions: [
        {
          ...d({
            id: "lin-respect-goodbye",
            label: "接受她的决定，把这次失去写进自己的复盘",
            category: "self_care",
            method: "self_management",
            quality: "sound",
            description: "你不把她的拒绝当成需要继续攻克的关卡。",
            to: "lin_ruoning",
            val: 3,
            fx: { lifeBalance: 5, teamTrust: 4, fatigue: -2 },
            ev: 3,
            cl: 10,
            rk: 12,
            rf: 15,
            note: "尊重告别救不回这段关系，却保住了你们曾经真正理解过彼此。",
            setsFlags: { lin_route_regret: true, lin_respected_goodbye: true },
          }),
          framework: "lin_ruoning" as const,
        },
        {
          ...d({
            id: "lin-press-after-no",
            label: "追问她：再给我一次机会，我以后一定会改",
            category: "roadshow",
            method: "communication",
            quality: "reckless",
            description: "你把她清楚的拒绝重新变成需要她安抚你的场面。",
            to: "lin_ruoning",
            val: -10,
            fx: { teamTrust: -6, lifeBalance: -4, fatigue: 4 },
            ev: 1,
            cl: 3,
            rk: 1,
            rf: 1,
            note: "承诺在失去之后突然变得容易，正是她无法再相信的原因。",
            setsFlags: { lin_route_regret: true, lin_pressed_after_no: true },
          }),
          framework: "lin_ruoning" as const,
        },
      ],
    },
  },
];

export function installLinRoute2025(): void {
  for (const branch of LIN_2025_BRANCHES) {
    if (!BRANCHES.some((existing) => existing.id === branch.id)) {
      BRANCHES.push(branch);
    }
  }
}
