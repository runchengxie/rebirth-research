import { describe, expect, it } from "vitest";
import { buildMonthScene } from "./content";
import { d } from "./decisionFactory";
import { createInitialState } from "./runtime";
import {
  decisionBehaviorTags,
  decisionMethod,
  decisionQuality,
  YEAR_NARRATIVE_PROFILES,
} from "./narrativeSemantics";

describe("年份叙事包", () => {
  it("三个正式年份使用不同的剧情节拍", () => {
    const ids = ["2023", "2024", "2025"].map((year) => YEAR_NARRATIVE_PROFILES[year].id);
    expect(new Set(ids).size).toBe(3);
  });

  it("2023 从市场现场切入，2025 从未来记忆与观点交锋切入", () => {
    const scene2023 = buildMonthScene(2, "2023", { ...createInitialState("2023"), monthIndex: 2 });
    const scene2025 = buildMonthScene(2, "2025", { ...createInitialState("2025"), monthIndex: 2 });
    expect(scene2023.nodes[0].id).toBe("m2-colleague");
    expect(scene2025.nodes[0].id).toBe("m2-memory");
    expect(scene2025.nodes[1].id).toBe("m2-competing");
  });
});

describe("研究方案语义", () => {
  it("生活管理不会因为研究证据分低而被判成冒进", () => {
    const rest = d({
      id: "test-rest",
      label: "回家吃饭并休息",
      category: "self_care",
      description: "恢复判断节奏。",
      fx: { fatigue: -12, lifeBalance: 12 },
      ev: 2,
      cl: 2,
      rk: 4,
      rf: 10,
    });
    expect(decisionMethod(rest)).toBe("self_management");
    expect(decisionQuality(rest)).toBe("sound");
    expect(decisionBehaviorTags(rest)).toEqual(["reflective"]);
  });

  it("跳过验证追涨仍属于市场追逐和冒进选择", () => {
    const chase = d({
      id: "test-chase",
      label: "先上车再说",
      category: "risk_alert",
      description: "跳过验证追涨。",
      fx: { researchCredibility: -5, viewAccuracy: -6 },
      ev: 2,
      cl: 2,
      rk: 0,
      rf: 2,
    });
    expect(decisionMethod(chase)).toBe("market_chasing");
    expect(decisionQuality(chase)).toBe("reckless");
    expect(decisionBehaviorTags(chase)).toEqual(["momentum_chasing", "thin_evidence"]);
  });
});
