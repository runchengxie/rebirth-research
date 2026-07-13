import { describe, expect, it } from "vitest";
import { buildMonthScene } from "./content";
import { createInitialState } from "./runtime";
import { YEAR_NARRATIVE_PROFILES } from "./narrativeSemantics";

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
