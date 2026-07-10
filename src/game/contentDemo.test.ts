import { describe, expect, it } from "vitest";
import { createInitialState } from "./runtime";
import { buildDemoChapter, makeDecisionsDemo, THEMES_DEMO } from "./contentDemo";

describe("demo chapter wiring (smoke)", () => {
  it("builds 12 demo months with competing node present when state passed", () => {
    const state = createInitialState("demo");
    const scene = buildDemoChapter(0, state);
    expect(scene.nodes.length).toBeGreaterThanOrEqual(3);
    const competing = scene.nodes.find((n) => n.id.includes("competing"));
    expect(competing).toBeTruthy();
    expect(competing?.text).toContain("没有哪个是标准答案");
  });

  it("each decision pool has at least one decision carrying a knowledge card", () => {
    for (let m = 0; m < 4; m++) {
      const decisions = makeDecisionsDemo(m);
      const withTeach = decisions.filter((d) => d.teaches);
      expect(withTeach.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("THEMES_DEMO covers 12 months and every theme has competing hypotheses", () => {
    expect(THEMES_DEMO).toHaveLength(12);
    for (const t of THEMES_DEMO) {
      expect(t.competingHypotheses).toBeTruthy();
      expect(t.businessOutcome).toBeTruthy();
    }
  });
});
