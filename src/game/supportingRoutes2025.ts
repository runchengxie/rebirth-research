import type { Branch, CharacterId, SceneNode } from "../types";
import { BRANCHES } from "./branches";
import { CHARACTERS } from "./characters";
import { d } from "./decisionFactory";

function line(
  id: string,
  characterId: CharacterId,
  text: string,
  mood: string,
  pose = "soft",
): SceneNode {
  const character = CHARACTERS[characterId];
  return {
    id,
    type: "dialogue",
    characterId,
    speaker: character.name,
    role: character.role,
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
const affinity = (characterId: CharacterId, gte: number) => ({
  kind: "affinity",
  characterId,
  gte,
}) as const;

const CHEN_ROUTES: Branch[] = [
  {
    id: "chen-2025-honest-run",
    label: "陈星禾要看一份不好看的回测",
    when: { kind: "and", of: [on2025, monthFrom(2), affinity("chen_xinghe", 24)] },
    once: true,
    injectAt: "after-memory",
    contribute: {
      nodes: [
        line(
          "chen-2025-honest-run",
          "chen_xinghe",
          "陈星禾把两张回测图并排放在你面前：左边那张收益漂亮，样本挑得也漂亮。右边这张把失败区间全放进来了，难看，但是真的。你准备拿哪张去开会？",
          "认真",
          "focused",
        ),
      ],
      decisions: [
        {
          ...d({
            id: "chen-show-failed-run",
            label: "把失败区间一起带进会议，主动解释模型边界",
            category: "data_deep_dive",
            method: "quantitative_research",
            quality: "sound",
            description: "你没有把噪声藏掉，也没有让一次漂亮回测替代真实的不确定性。",
            to: "chen_xinghe",
            val: 11,
            fx: { researchCredibility: 7, teamTrust: 8, committeeAdoption: 2 },
            ev: 16,
            cl: 15,
            rk: 14,
            rf: 12,
            note: "她对诚实的兴趣，比对一条完美曲线更持久。",
            setsFlags: { chen_shared_failed_run: true, chen_professional_honest: true },
          }),
          framework: "chen_xinghe" as const,
        },
        {
          ...d({
            id: "chen-polish-backtest",
            label: "先用最好看的区间拿下席位，缺口以后再补",
            category: "committee_defense",
            method: "market_chasing",
            quality: "reckless",
            description: "你把模型当成争取认可的包装，决定先赢下这一次。",
            to: "chen_xinghe",
            val: -8,
            fx: { committeeAdoption: 10, teamTrust: -7, portfolioNav: 0.012 },
            ev: 4,
            cl: 8,
            rk: 1,
            rf: 1,
            note: "数字没有撒谎，选择展示哪些数字的人撒了。",
            setsFlags: { chen_polished_backtest: true },
          }),
          framework: "chen_xinghe" as const,
        },
      ],
    },
  },
  {
    id: "chen-2025-private-error",
    label: "她把自己最难看的模型留给你看",
    when: {
      kind: "and",
      of: [on2025, monthFrom(5), affinity("chen_xinghe", 44), hasFlag("chen_shared_failed_run")],
    },
    once: true,
    injectAt: "after-memory",
    contribute: {
      nodes: [
        line(
          "chen-2025-private-error",
          "chen_xinghe",
          "陈星禾没有打开最新模型，先调出一份两年前的失败归因：我以前也把偶然相关当成能力，差点让全组替我交学费。她侧过脸笑了一下：这份东西我很少给别人看。你别拿去安慰我，拿去提醒我。",
          "坦白",
        ),
      ],
      setFlags: { chen_private_opened: true, chen_value_aligned: true },
    },
  },
  {
    id: "chen-2025-confirm",
    label: "她想和你继续跑一段更长的样本",
    when: {
      kind: "and",
      of: [
        on2025,
        monthFrom(9),
        affinity("chen_xinghe", 60),
        hasFlag("chen_shared_failed_run"),
        hasFlag("chen_private_opened"),
        noFlag("chen_polished_backtest"),
      ],
    },
    once: true,
    injectAt: "after-memory",
    contribute: {
      nodes: [
        line(
          "chen-2025-confirm",
          "chen_xinghe",
          "陈星禾把平板锁屏，难得没有用数据起头：我喜欢跟你一起跑模型，也喜欢你在模型跑错的时候还在。要不要把观察窗口拉长一点？工作以外也算。",
          "心动",
          "excited",
        ),
      ],
      decisions: [
        {
          ...d({
            id: "chen-commit-long-window",
            label: "告诉她：这次不做短周期交易，认真跑长期样本",
            category: "roadshow",
            method: "communication",
            quality: "sound",
            description: "你把喜欢说清楚，也接受关系里不会每周都有正收益。",
            to: "chen_xinghe",
            val: 15,
            fx: { teamTrust: 8, lifeBalance: 8, clientFeedback: 3 },
            ev: 6,
            cl: 16,
            rk: 10,
            rf: 14,
            note: "她要的不是永远共振，是偏离之后还愿意一起重新归因。",
            setsFlags: { chen_route_committed: true },
          }),
          framework: "chen_xinghe" as const,
        },
        {
          ...d({
            id: "chen-keep-testing",
            label: "先约定继续相处，把每次误差都诚实记下来",
            category: "help_colleague",
            method: "collaboration",
            quality: "sound",
            description: "你们没有急着给关系命名，已经开始共同维护它的样本。",
            to: "chen_xinghe",
            val: 10,
            fx: { teamTrust: 7, lifeBalance: 6, fatigue: -2 },
            ev: 8,
            cl: 12,
            rk: 10,
            rf: 14,
            note: "她不怕慢，只怕有人为了漂亮结论删掉真实数据。",
            setsFlags: { chen_route_slow_burn: true },
          }),
          framework: "chen_xinghe" as const,
        },
      ],
    },
  },
  {
    id: "chen-2025-regret",
    label: "一次漂亮回测耗掉了她的信任",
    when: {
      kind: "and",
      of: [
        on2025,
        monthFrom(9),
        affinity("chen_xinghe", 54),
        hasFlag("chen_polished_backtest"),
        noFlag("chen_route_committed"),
      ],
    },
    once: true,
    injectAt: "after-memory",
    contribute: {
      nodes: [
        line(
          "chen-2025-regret",
          "chen_xinghe",
          "陈星禾把那张最好看的曲线删掉：我确实对你上过头。可如果连失败区间都不能一起看，我不知道我们喜欢的是彼此，还是一段被筛选过的结果。",
          "失望",
          "focused",
        ),
      ],
      setFlags: { chen_route_regret: true },
      decisions: [
        {
          ...d({
            id: "chen-own-error",
            label: "承认自己筛选了结果，不要求她立即恢复信任",
            category: "self_care",
            method: "self_management",
            quality: "sound",
            description: "你承担错误，停止把道歉包装成一笔必须获得回报的交易。",
            to: "chen_xinghe",
            val: 3,
            fx: { teamTrust: 3, lifeBalance: 4 },
            ev: 3,
            cl: 10,
            rk: 12,
            rf: 15,
            note: "诚实来得太晚，仍然比继续美化结果好。",
            setsFlags: { chen_owned_error: true },
          }),
          framework: "chen_xinghe" as const,
        },
      ],
    },
  },
];

const ZHOU_ROUTES: Branch[] = [
  {
    id: "zhou-2025-boundary",
    label: "周明昭要求你先写错了怎么办",
    when: { kind: "and", of: [on2025, monthFrom(4), affinity("zhou_mingzhao", 24)] },
    once: true,
    injectAt: "after-memory",
    contribute: {
      nodes: [
        line(
          "zhou-2025-boundary",
          "zhou_mingzhao",
          "周明昭在白板上留了一大片空白：收益情景写满了，错误情景还没动。她把笔递给你：先告诉我，判断错了以后，你准备怎么活下来。",
          "观察",
          "serious",
        ),
      ],
      decisions: [
        {
          ...d({
            id: "zhou-define-boundary",
            label: "写清退出条件、最大损失和需要重新评估的变量",
            category: "risk_alert",
            method: "risk_management",
            quality: "sound",
            description: "你把边界写成可执行条件，也让她知道你不会靠勇气维持关系和组合。",
            to: "zhou_mingzhao",
            val: 11,
            fx: { researchCredibility: 6, teamTrust: 6, viewAccuracy: 5 },
            ev: 11,
            cl: 14,
            rk: 19,
            rf: 12,
            note: "她对确定性的兴趣不大，对能承担不确定性的人很有兴趣。",
            setsFlags: { zhou_respected_boundary: true, zhou_professional_reliable: true },
          }),
          framework: "zhou_mingzhao" as const,
        },
        {
          ...d({
            id: "zhou-gamble-pressure",
            label: "排名窗口只有一次，先把仓位推上去再谈边界",
            category: "risk_alert",
            method: "market_chasing",
            quality: "reckless",
            description: "你用时间压力替自己免除风险纪律。",
            to: "zhou_mingzhao",
            val: -10,
            fx: { committeeAdoption: 9, portfolioNav: 0.025, fatigue: 6, teamTrust: -6 },
            ev: 3,
            cl: 5,
            rk: 0,
            rf: 1,
            note: "一次赢面不会让越界变成熟，只会让下一次越界更容易。",
            setsFlags: { zhou_gambled_under_pressure: true },
          }),
          framework: "zhou_mingzhao" as const,
        },
      ],
    },
  },
  {
    id: "zhou-2025-private-boundary",
    label: "她解释自己为什么总先看最坏情景",
    when: {
      kind: "and",
      of: [on2025, monthFrom(6), affinity("zhou_mingzhao", 44), hasFlag("zhou_respected_boundary")],
    },
    once: true,
    injectAt: "after-memory",
    contribute: {
      nodes: [
        line(
          "zhou-2025-private-boundary",
          "zhou_mingzhao",
          "周明昭把白板擦到只剩一条回撤线：我以前见过一个很聪明的人，每次都能解释为什么这次可以破例。最后输掉的不是一笔仓位，是所有人再相信他的能力。她停了一下：所以我也会观察，你怎么对待答应过的边界。",
          "坦白",
        ),
      ],
      setFlags: { zhou_private_opened: true, zhou_value_aligned: true },
    },
  },
  {
    id: "zhou-2025-confirm",
    label: "她把长期情景里留出了你的位置",
    when: {
      kind: "and",
      of: [
        on2025,
        monthFrom(9),
        affinity("zhou_mingzhao", 60),
        hasFlag("zhou_respected_boundary"),
        hasFlag("zhou_private_opened"),
        noFlag("zhou_gambled_under_pressure"),
        { kind: "metricAtMost", key: "fatigue", lte: 68 },
      ],
    },
    once: true,
    injectAt: "after-memory",
    contribute: {
      nodes: [
        line(
          "zhou-2025-confirm",
          "zhou_mingzhao",
          "周明昭在情景树最右侧添了一条很细的线：这条没有收益率，也没有截止日期。她看向你：如果你愿意，我们可以把彼此放进长期假设里。错了也不互相惩罚，变了就重新评估。",
          "心动",
        ),
      ],
      decisions: [
        {
          ...d({
            id: "zhou-commit-long-horizon",
            label: "在她的情景树旁写下：长期持有，持续复核",
            category: "roadshow",
            method: "communication",
            quality: "sound",
            description: "你接受关系需要边界、复核和重新协商，也接受它无法提供无条件保证。",
            to: "zhou_mingzhao",
            val: 15,
            fx: { lifeBalance: 9, teamTrust: 8, fatigue: -3 },
            ev: 6,
            cl: 16,
            rk: 16,
            rf: 15,
            note: "她给出的浪漫没有保证收益，只有一起管理未知的承诺。",
            setsFlags: { zhou_route_committed: true },
          }),
          framework: "zhou_mingzhao" as const,
        },
        {
          ...d({
            id: "zhou-keep-observing",
            label: "先并肩走一段，保留随时说出不舒服的权利",
            category: "self_care",
            method: "self_management",
            quality: "sound",
            description: "你们不急着把概率写成百分之百，先确认彼此能安全地表达变化。",
            to: "zhou_mingzhao",
            val: 10,
            fx: { lifeBalance: 8, teamTrust: 5, fatigue: -4 },
            ev: 4,
            cl: 12,
            rk: 15,
            rf: 15,
            note: "稳健不等于缺少感情，它让感情有地方长期存在。",
            setsFlags: { zhou_route_slow_burn: true },
          }),
          framework: "zhou_mingzhao" as const,
        },
      ],
    },
  },
  {
    id: "zhou-2025-regret",
    label: "她不会用喜欢替你承担越界",
    when: {
      kind: "and",
      of: [
        on2025,
        monthFrom(9),
        affinity("zhou_mingzhao", 54),
        hasFlag("zhou_gambled_under_pressure"),
        noFlag("zhou_route_committed"),
      ],
    },
    once: true,
    injectAt: "after-memory",
    contribute: {
      nodes: [
        line(
          "zhou-2025-regret",
          "zhou_mingzhao",
          "周明昭把那次越界的日期圈起来：我喜欢你，也正因为喜欢，才不能把破例说成勇敢。关系里没有止损单，可边界一样需要被尊重。",
          "克制",
          "serious",
        ),
      ],
      setFlags: { zhou_route_regret: true },
      decisions: [
        {
          ...d({
            id: "zhou-accept-boundary",
            label: "接受她的边界，把破例写进自己的风险日志",
            category: "self_care",
            method: "self_management",
            quality: "sound",
            description: "你停止争辩结果，开始承担自己破坏信任的过程。",
            to: "zhou_mingzhao",
            val: 3,
            fx: { lifeBalance: 5, teamTrust: 3 },
            ev: 3,
            cl: 10,
            rk: 14,
            rf: 15,
            note: "这次复盘救不回关系，却可能救回下一次面对边界的你。",
            setsFlags: { zhou_accepted_boundary: true },
          }),
          framework: "zhou_mingzhao" as const,
        },
      ],
    },
  },
];

export const SUPPORTING_2025_BRANCHES: Branch[] = [...CHEN_ROUTES, ...ZHOU_ROUTES];

export function installSupportingRoutes2025(): void {
  for (const branch of SUPPORTING_2025_BRANCHES) {
    if (!BRANCHES.some((existing) => existing.id === branch.id)) {
      BRANCHES.push(branch);
    }
  }
}
