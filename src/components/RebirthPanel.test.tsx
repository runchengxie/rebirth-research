import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createRebirthMeta } from "../game/rebirth";
import { createInitialState } from "../game/runtime";
import { OfficeHubPanel } from "./RebirthPanel";

describe("研究室概览", () => {
  it("把主舞台移出的物件集中展示在研究室", () => {
    const state = {
      ...createInitialState("2025"),
      office: { postIts: 3, whiteboardMarkers: 2, coffeeCups: 4, monthsElapsed: 5 },
    };
    const html = renderToStaticMarkup(
      <OfficeHubPanel
        meta={createRebirthMeta("2025")}
        state={state}
        onInspect={vi.fn()}
      />,
    );

    expect(html).toContain("office-room-overview");
    expect(html).toContain("3 张");
    expect(html).toContain("2 组");
    expect(html).toContain("4 只");
    expect(html.match(/class="office-room-note"/g)).toHaveLength(3);
    expect(html.match(/class="office-room-board-mark"/g)).toHaveLength(2);
    expect(html.match(/class="office-room-cup"/g)).toHaveLength(4);
    expect(html).toContain("整理便签");
    expect(html).not.toContain("office-memory-layer");
  });
});
