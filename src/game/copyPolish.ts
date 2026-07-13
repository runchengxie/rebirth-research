import type { MarketTheme } from "../types";
import { BRANCHES } from "./branches";
import { THEMES_2025 } from "./content2025";
import { STORY_ARCS, YEAR_ARC_LINES, YEAR_ARC_MISSIONS } from "./storyArcs";

const MIXED_TERMS = [
  "DeepSeek-R1",
  "AI Agent",
  "SaaS",
  "ARR",
  "ToC",
  "ToB",
  "Barra",
  "Alpha",
  "IPO",
  "AI",
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function polishMixedText(text: string): string {
  let polished = text;
  for (const term of MIXED_TERMS) {
    const escaped = escapeRegExp(term);
    polished = polished
      .replace(new RegExp(`([\\u3400-\\u9fff])(${escaped})`, "g"), "$1 $2")
      .replace(new RegExp(`(${escaped})([\\u3400-\\u9fff])`, "g"), "$1 $2");
  }
  return polished.replace(/[ \t]{2,}/g, " ");
}

function polishThemeInPlace(theme: MarketTheme): void {
  theme.title = polishMixedText(theme.title);
  theme.publicContext = polishMixedText(theme.publicContext);
  theme.protagonistMemory = polishMixedText(theme.protagonistMemory);
  theme.gameHook = polishMixedText(theme.gameHook);

  if (theme.historicalPrototype !== undefined) {
    theme.historicalPrototype = polishMixedText(theme.historicalPrototype);
  }
  if (theme.knownEvent !== undefined) {
    theme.knownEvent = polishMixedText(theme.knownEvent);
  }
  if (theme.businessOutcome !== undefined) {
    theme.businessOutcome = polishMixedText(theme.businessOutcome);
  }
  if (theme.competingHypotheses?.lin !== undefined) {
    theme.competingHypotheses.lin = polishMixedText(theme.competingHypotheses.lin);
  }
  if (theme.competingHypotheses?.chen !== undefined) {
    theme.competingHypotheses.chen = polishMixedText(theme.competingHypotheses.chen);
  }
  if (theme.competingHypotheses?.zhou !== undefined) {
    theme.competingHypotheses.zhou = polishMixedText(theme.competingHypotheses.zhou);
  }
}

function replaceBranchDialogue(branchId: string, text: string): void {
  const branch = BRANCHES.find((candidate) => candidate.id === branchId);
  const node = branch?.contribute.nodes?.[0];
  if (node?.type === "dialogue") node.text = text;
}

/**
 * 集中修正旧叙事骨架里的少量重复、翻译腔和中英混杂。
 *
 * 年份内容仍保留原始事实结构，这里只处理会直接展示给玩家的公共台词。
 */
export function installCopyPolish(): void {
  const frameworkArc = STORY_ARCS.find((arc) => arc.title === "第八话：谁的框架是对的");
  if (frameworkArc) {
    frameworkArc.line =
      "电话那头停顿了很久。林若宁说：这次我不替你选。三个同事有三种框架，我看基本面，陈星禾看量化信号，周明昭看风险。你决定跟谁站在一起，也会走进谁的叙事。";
  }

  const alphaArc = STORY_ARCS.find((arc) => arc.title === "第九话：风口上的Alpha衰减");
  if (alphaArc) {
    alphaArc.title = "第九话：风口上的 Alpha 衰减";
    alphaArc.line =
      "所有群都在刷同一个方向。陈星禾把 Alpha 衰减曲线拉出来：三天前这个信号还有预测力，今天已经掉进噪声区了。你还想追吗？";
  }

  const lines2023 = YEAR_ARC_LINES["2023"];
  if (lines2023) {
    lines2023[3] =
      "雨点敲着玻璃，林若宁把一叠一季报推到桌子中间：消费复苏不及预期，一些 AI 公司的业绩也没有兑现。强预期和弱现实之间，你觉得这个矛盾该怎么解释？";
  }

  const lines2025 = YEAR_ARC_LINES["2025"];
  if (lines2025) {
    lines2025[2] =
      "午休还没开始，陈星禾就把平板推过来：两会头一回把 AI+行动写进报告，数据要素和算力基建今天盘口已经动了。但从政策到订单要时间，你觉得这波是主线的起点还是提前透支？";
    lines2025[3] =
      "雨点敲着玻璃，林若宁把一叠一季报推到桌子中间：前期受到追捧的 AI 公司开始交业绩了，可关税压力已经传到出口链。主题炒作和基本面验证之间，你觉得这个缺口该怎么填？";
  }

  const missions2025 = YEAR_ARC_MISSIONS["2025"];
  if (missions2025) {
    missions2025[2] =
      "陈星禾把因子拆解和订单流摆在你面前：AI+行动写进报告，算力基建今天盘口动了。帮她在四个方向里选一个她愿意下注的。";
  }

  replaceBranchDialogue(
    "route-research",
    "林若宁把一份还冒着热气的早餐推到你手边：这周你已经第三次半夜发研报了。我担心你先把身体熬垮。先吃点东西。这版框架确实比上个月利落。",
  );
  replaceBranchDialogue(
    "route-burnout",
    "周明昭看了你两秒，把电脑屏幕按灭：你脸色很差。研究要做很多年，今晚先停。再熬一夜也不会让错误的判断变对。",
  );

  for (const arc of STORY_ARCS) {
    arc.title = polishMixedText(arc.title);
    arc.line = polishMixedText(arc.line);
    arc.mission = polishMixedText(arc.mission);
  }
  for (const lines of Object.values(YEAR_ARC_LINES)) {
    lines.forEach((line, index) => {
      lines[index] = polishMixedText(line);
    });
  }
  for (const missions of Object.values(YEAR_ARC_MISSIONS)) {
    missions.forEach((mission, index) => {
      missions[index] = polishMixedText(mission);
    });
  }
  THEMES_2025.forEach(polishThemeInPlace);
}
