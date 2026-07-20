import { describe, expect, it } from "vitest";
import type { CharacterId, MentorId } from "../types";
import { CHARACTERS } from "./content";
import { MENTOR_TEACHINGS } from "./sceneBuilders";
import { GRADE_REVIEWS } from "./characters";
import { createInitialState } from "./runtime";

// 路线图 R0.7：固定角色与导师键集合。长期边界要求组织角色
// 不得进入 CharacterId / relations / 导师表，这里把边界写成回归样本。

const CHARACTER_ID_BASELINE = [
  "lin_ruoning",
  "chen_xinghe",
  "zhou_mingzhao",
  "zhao_chengyu",
] as const satisfies readonly CharacterId[];

const MENTOR_ID_BASELINE = [
  "lin_ruoning",
  "chen_xinghe",
  "zhou_mingzhao",
] as const satisfies readonly MentorId[];

// 类型级断言：基线数组必须完整覆盖联合类型，新增或删除成员都会在编译期失败。
type AssertSame<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const characterIdExhaustive: AssertSame<CharacterId, (typeof CHARACTER_ID_BASELINE)[number]> = true;
const mentorIdExhaustive: AssertSame<MentorId, (typeof MENTOR_ID_BASELINE)[number]> = true;

describe("角色与导师键集合基线", () => {
  it("类型级基线保持编译期完整覆盖", () => {
    expect(characterIdExhaustive).toBe(true);
    expect(mentorIdExhaustive).toBe(true);
  });

  it("CHARACTERS 注册表与 CharacterId 基线一致", () => {
    expect(Object.keys(CHARACTERS).sort()).toEqual([...CHARACTER_ID_BASELINE].sort());
  });

  it("初始 relations 只包含四名常驻角色", () => {
    for (const year of ["2023", "2024", "2025"]) {
      const state = createInitialState(year);
      expect(Object.keys(state.relations).sort()).toEqual([...CHARACTER_ID_BASELINE].sort());
    }
  });

  it("导师专属表不包含同级友人赵承宇", () => {
    expect(Object.keys(MENTOR_TEACHINGS).sort()).toEqual([...MENTOR_ID_BASELINE].sort());
    expect(Object.keys(GRADE_REVIEWS).sort()).toEqual([...MENTOR_ID_BASELINE].sort());
    expect(Object.keys(MENTOR_TEACHINGS)).not.toContain("zhao_chengyu");
  });
});
