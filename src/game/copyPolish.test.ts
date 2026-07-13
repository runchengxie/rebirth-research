import { describe, expect, it } from "vitest";
import { BRANCHES, STORY_ARCS, YEAR_ARC_LINES, YEAR_ARC_MISSIONS } from "./content";
import { THEMES_2025 } from "./content2025";

function branchDialogue(branchId: string): string | undefined {
  return BRANCHES.find((branch) => branch.id === branchId)?.contribute.nodes?.[0]?.text;
}

describe("公共台词润色", () => {
  it("删除叙事骨架中的重复短句并统一 Alpha 大小写", () => {
    const frameworkArc = STORY_ARCS.find((arc) => arc.title === "第八话：谁的框架是对的");
    const alphaArc = STORY_ARCS.find((arc) => arc.title === "第九话：风口上的 Alpha 衰减");

    expect(frameworkArc?.line).toContain("也会走进谁的叙事");
    expect(frameworkArc?.line.match(/走进谁的叙事/g)).toHaveLength(1);
    expect(alphaArc?.line).toContain("Alpha 衰减曲线");
    expect(alphaArc?.line).not.toContain("alpha衰减");
  });

  it("把行业黑话改成自然中文", () => {
    expect(YEAR_ARC_LINES["2023"]?.[3]).toContain("AI 公司的业绩也没有兑现");
    expect(YEAR_ARC_LINES["2023"]?.[3]).not.toMatch(/AI 票|miss/);
    expect(YEAR_ARC_LINES["2025"]?.[3]).toContain("受到追捧的 AI 公司");
    expect(YEAR_ARC_LINES["2025"]?.[2]).toContain("AI+行动");
    expect(YEAR_ARC_MISSIONS["2025"]?.[2]).toContain("AI+行动");
  });

  it("让关心和疲劳提醒先像人在说话", () => {
    expect(branchDialogue("route-research")).toContain("我担心你先把身体熬垮");
    expect(branchDialogue("route-research")).not.toContain("我不是嫌烦");
    expect(branchDialogue("route-burnout")).toContain("今晚先停");
    expect(branchDialogue("route-burnout")).not.toMatch(/长跑|填 K 线|再熬一夜就出成果/);
  });
});

describe("2025 中英文排版", () => {
  it("在核验后的标题和主题文字中为英文术语保留必要空格", () => {
    expect(THEMES_2025[0]?.title).toBe("DeepSeek-R1 发布与推理成本重估");
    expect(THEMES_2025[2]?.title).toBe("政府工作报告深化 AI+与具身智能");
    expect(THEMES_2025[0]?.publicContext).toContain("DeepSeek-R1 在一月发布");
    expect(THEMES_2025[6]?.protagonistMemory).toContain("可持续 Alpha");
  });
});
