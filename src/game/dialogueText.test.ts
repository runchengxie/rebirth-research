import { describe, expect, it } from "vitest";
import { dialogueParagraphs, dialogueText } from "./dialogueText";

describe("对白分段", () => {
  it("使用空行连接动作和对白，并能恢复为独立段落", () => {
    const text = dialogueText(
      "林若宁把你的结论圈出来。",
      "方向可能是对的，可中间这几步还是空的。",
      "她看着你，没有退开。",
      "我相信你。证据缺口还在，这几步必须由你补出来。",
    );

    expect(text).toContain("\n\n");
    expect(dialogueParagraphs(text)).toEqual([
      "林若宁把你的结论圈出来。",
      "方向可能是对的，可中间这几步还是空的。",
      "她看着你，没有退开。",
      "我相信你。证据缺口还在，这几步必须由你补出来。",
    ]);
  });

  it("忽略空段并保留普通单段文本", () => {
    expect(dialogueText("动作。", "", "  ", "对白。")).toBe("动作。\n\n对白。");
    expect(dialogueParagraphs("普通对白。 ")).toEqual(["普通对白。。"]);
  });
});
