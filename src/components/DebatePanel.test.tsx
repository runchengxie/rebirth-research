import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DebateHistory, DebatePanel } from "./DebatePanel";
import { debateItems } from "./debateItems";

const HYPOTHESES = {
  lin: "先看付费和留存。",
  chen: "再看成交结构。",
  zhou: "最后检查下行情景。",
};

describe("观点交锋", () => {
  it("把三位角色的观点整理成三条独立数据", () => {
    expect(debateItems(HYPOTHESES)).toEqual([
      { characterId: "lin_ruoning", label: "基本面", text: HYPOTHESES.lin },
      { characterId: "chen_xinghe", label: "量价", text: HYPOTHESES.chen },
      { characterId: "zhou_mingzhao", label: "风控", text: HYPOTHESES.zhou },
    ]);
  });

  it("为每位角色渲染带姓名和方法标签的专属对话框", () => {
    const html = renderToStaticMarkup(<DebatePanel hypotheses={HYPOTHESES} />);

    expect(html.match(/<li/g)).toHaveLength(3);
    expect(html).toContain('data-character="lin_ruoning"');
    expect(html).toContain('data-character="chen_xinghe"');
    expect(html).toContain('data-character="zhou_mingzhao"');
    expect(html).toContain("林若宁");
    expect(html).toContain("陈星禾");
    expect(html).toContain("周明昭");
    expect(html).toContain("基本面");
    expect(html).toContain("量价");
    expect(html).toContain("风控");
  });

  it("档案回看继续保留三位角色的独立观点", () => {
    const html = renderToStaticMarkup(<DebateHistory hypotheses={HYPOTHESES} />);

    expect(html.match(/<article/g)).toHaveLength(3);
    expect(html).toContain('aria-label="三位同事的观点"');
    expect(html).toContain('data-character="lin_ruoning"');
    expect(html).toContain('data-character="chen_xinghe"');
    expect(html).toContain('data-character="zhou_mingzhao"');
  });
});
