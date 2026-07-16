import { describe, expect, it } from "vitest";
import { createInitialState } from "./runtime";
import { buildDemoChapter, makeDecisionsDemo, THEMES_DEMO } from "./contentDemo";

describe("开发示范内容", () => {
  it("传入状态时在场景中加入观点交锋节点", () => {
    const state = createInitialState("demo");
    const scene = buildDemoChapter(0, state);
    expect(scene.nodes.length).toBeGreaterThanOrEqual(3);
    const competing = scene.nodes.find((n) => n.id.includes("competing"));
    expect(competing).toBeTruthy();
    expect(competing?.text).toContain("选择一条证据链");
    expect(competing?.text).not.toMatch(/林若宁.*陈星禾.*周明昭/);
    expect(competing?.text).not.toMatch(/[。！？]{2,}/);
  });

  it("每组研究方案至少包含一张知识卡", () => {
    for (let m = 0; m < 4; m++) {
      const decisions = makeDecisionsDemo(m);
      const withTeach = decisions.filter((d) => d.teaches);
      expect(withTeach.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("十二个月主题都包含业务事实和三方假设", () => {
    expect(THEMES_DEMO).toHaveLength(12);
    for (const t of THEMES_DEMO) {
      expect(t.competingHypotheses).toBeTruthy();
      expect(t.businessOutcome).toBeTruthy();
    }
  });
});
