import { describe, expect, it } from "vitest";
import type { RoundResult } from "../types";
import { createRebirthMeta } from "./rebirth";
import {
  inspectOfficeProp,
  officeDiscoveryEntries,
  officePropViews,
} from "./rebirthOffice";
import { createInitialState } from "./runtime";

function developedOfficeState() {
  const state = createInitialState("2025");
  return {
    ...state,
    office: {
      postIts: 2,
      whiteboardMarkers: 2,
      coffeeCups: 3,
      monthsElapsed: 4,
    },
    history: Array.from({ length: 3 }, () => ({} as RoundResult)),
  };
}

describe("研究室中枢", () => {
  it("办公室物件根据本周目积累开放", () => {
    const state = developedOfficeState();
    const meta = createRebirthMeta("2025");
    const views = officePropViews(meta, state);

    expect(views.find((entry) => entry.id === "postits")?.lockedReason).toBeNull();
    expect(views.find((entry) => entry.id === "whiteboard")?.lockedReason).toBeNull();
    expect(views.find((entry) => entry.id === "coffee")?.lockedReason).toBeNull();
    expect(views.find((entry) => entry.id === "archive")?.lockedReason).toBeNull();
    expect(views.find((entry) => entry.id === "shortcuts")?.lockedReason)
      .toContain("研究捷径");
  });

  it("整理档案写入十二月调查需要的旗标", () => {
    const state = developedOfficeState();
    const result = inspectOfficeProp(createRebirthMeta("2025"), state, "archive");

    expect(result.changed).toBe(true);
    expect(result.state.flags.office_archive_reviewed).toBe(true);
    expect(result.meta.officeDiscoveries).toContain("archive_thread");
  });

  it("第二周目整理白板时发现未重置字迹并写入异常档案", () => {
    const state = developedOfficeState();
    const meta = { ...createRebirthMeta("2025"), cycle: 2 };
    const result = inspectOfficeProp(meta, state, "whiteboard");

    expect(result.changed).toBe(true);
    expect(result.meta.contradictions).toContain("office_residue");
    expect(result.meta.officeDiscoveries).toContain("whiteboard_residue");
    expect(officeDiscoveryEntries(result.meta)
      .some((entry) => entry.description.includes("调用量涨得比利润快")))
      .toBe(true);
  });

  it("研究捷径板把跨周目关系资产可视化", () => {
    const state = developedOfficeState();
    const meta = {
      ...createRebirthMeta("2025"),
      shortcuts: ["zhao_factor_pipeline"] as const,
    };
    const view = officePropViews(meta, state).find((entry) => entry.id === "shortcuts");
    expect(view?.lockedReason).toBeNull();

    const result = inspectOfficeProp(meta, state, "shortcuts");
    expect(result.changed).toBe(true);
    expect(result.state.teamTrust).toBe(state.teamTrust + 1);
  });
});
