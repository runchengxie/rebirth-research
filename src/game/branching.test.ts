import { describe, expect, it } from "vitest";
import type { Branch } from "../types";
import { activeBranches, branchFlagsForMonth } from "./branching";
import { createInitialState } from "./runtime";

const routeBranch: Branch = {
  id: "route-test",
  label: "测试路线",
  when: { kind: "always" },
  contribute: {
    nodes: [
      {
        id: "route-test-node",
        type: "dialogue",
        characterId: "lin_ruoning",
        speaker: "林若宁",
        role: "基本面研究员",
        mood: "认真",
        text: "这段路线对白只应出现一次。",
        prompt: "点击继续。",
        pose: "soft",
        bg: "research-room",
        bgm: "morning-loop",
      },
    ],
    setFlags: { route_test: true },
  },
};

describe("分支对白去重", () => {
  it("路线旗标写入后隐藏已看对白，同时保留路线分支", () => {
    const state = createInitialState("2025");
    const firstActive = activeBranches(state, [routeBranch]);

    expect(firstActive).toHaveLength(1);
    expect(firstActive[0]?.contribute.nodes?.map((node) => node.id)).toEqual(["route-test-node"]);

    const flags = branchFlagsForMonth(state, [routeBranch]);
    const nextState = {
      ...state,
      flags: { ...state.flags, ...flags },
    };
    const nextActive = activeBranches(nextState, [routeBranch]);

    expect(nextActive).toHaveLength(1);
    expect(nextActive[0]?.contribute.nodes).toEqual([]);
    expect(nextActive[0]?.contribute.setFlags).toEqual({ route_test: true });
  });
});
