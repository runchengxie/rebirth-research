import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CHARACTERS } from "../game/content";
import { StageArt } from "./ImmersiveGameScreen";

describe("剧情主舞台", () => {
  it("只渲染当前场景，不再叠加研究室物件", () => {
    const html = renderToStaticMarkup(
      <StageArt
        activeCharacter={CHARACTERS.lin_ruoning}
        activePose="thinking"
        sceneBackground="research-room"
        showDebate={false}
        usePixiStage={false}
      />,
    );

    expect(html).toContain("immersive-static");
    expect(html).not.toContain("office-memory-layer");
    expect(html).not.toContain("office-postit");
  });
});
