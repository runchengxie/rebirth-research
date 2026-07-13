import { describe, expect, it } from "vitest";
import { GAME_DATA, GAME_YEARS } from "./gameData";

describe("GAME_YEARS / GAME_DATA 不变量", () => {
  it("2025 是当前唯一正式入口", () => {
    expect(GAME_YEARS).toEqual(["2025"]);
  });

  it("2023、2024 与 demo 仍保留深链数据", () => {
    expect("2023" in GAME_DATA).toBe(true);
    expect("2024" in GAME_DATA).toBe(true);
    expect("demo" in GAME_DATA).toBe(true);
  });

  it("往年档案和 demo 不进入年份选择器", () => {
    expect(GAME_YEARS).not.toContain("2023");
    expect(GAME_YEARS).not.toContain("2024");
    expect(GAME_YEARS).not.toContain("demo");
  });

  it("选择器里的每个年份都在 GAME_DATA 里有对应数据", () => {
    for (const year of GAME_YEARS) {
      expect(year in GAME_DATA).toBe(true);
    }
  });
});
