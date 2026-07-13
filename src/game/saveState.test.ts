import { describe, expect, it } from "vitest";
import { CONTENT_REVISION } from "./narrativeSemantics";
import { createInitialState, sceneForMonth } from "./runtime";
import { restoreStoredState } from "./saveState";

describe("存档迁移", () => {
  it("把旧数字游标迁移为稳定节点 id", () => {
    const legacy = { ...createInitialState("2024"), sceneNodeId: undefined, contentRevision: undefined };
    const restored = restoreStoredState("2024", legacy);
    expect(restored?.sceneNodeId).toBe(sceneForMonth(restored!).nodes[restored!.sceneNodeIndex].id);
    expect(restored?.contentRevision).toBe(CONTENT_REVISION);
  });

  it("节点增删后优先恢复保存的节点 id", () => {
    const base = { ...createInitialState("2025"), monthIndex: 3 };
    const scene = sceneForMonth(base);
    const index = scene.nodes.findIndex((node) => node.id === "m3-colleague");
    const restored = restoreStoredState("2025", {
      ...base,
      sceneNodeIndex: index,
      sceneNodeId: "m3-colleague",
      flags: { peer_zhao_met: true },
    });
    expect(restored?.sceneNodeId).toBe("m3-colleague");
    expect(sceneForMonth(restored!).nodes[restored!.sceneNodeIndex].id).toBe("m3-colleague");
  });

  it("旧知识卡引用会迁移到中性学习主题字段", () => {
    const legacyKey = ["c", "f", "a", "Ref"].join("");
    const restored = restoreStoredState("2024", {
      ...createInitialState("2024"),
      knowledgeCards: [{
        id: "legacy-card",
        concept: "风险边界",
        mentorId: "zhou_mingzhao",
        mentorLine: "先写清楚错了怎么办。",
        tier: 1,
        [legacyKey]: "旧课程 · 风险管理",
      }],
    });
    expect(restored?.knowledgeCards[0].learningRef).toContain("金融基础");
    expect(legacyKey in (restored?.knowledgeCards[0] ?? {})).toBe(false);
  });
});
