import { lazy, Suspense, useState } from "react";
import { ImmersiveGameScreen } from "./app/ImmersiveGameScreen";
import {
  canUsePixiStage,
  useGameAudio,
  useGameSession,
  useSettingsMenu,
  useThemeControl,
} from "./app/useGameController";

const Chapter1Spike = lazy(() =>
  import("./spike/pixivn/Chapter1Spike").then((module) => ({
    default: module.Chapter1Spike,
  })),
);

export default function App() {
  const audio = useGameAudio();
  const session = useGameSession(audio);
  const settings = useSettingsMenu();
  const themeControl = useThemeControl();
  const [usePixiStage] = useState(canUsePixiStage);
  const [usePixivnSpike] = useState(
    () => new URLSearchParams(window.location.search).get("pixivn") === "1",
  );

  if (usePixivnSpike) {
    return (
      <Suspense
        fallback={
          <div className="app">
            <p>加载 Pixi'VN 第一话 spike…</p>
          </div>
        }
      >
        <Chapter1Spike
          state={session.state}
          onDecision={session.makeDecisionWithSound}
          onFocus={session.selectFocusWithSound}
        />
      </Suspense>
    );
  }

  return (
    <ImmersiveGameScreen
      audio={audio}
      session={session}
      settingsOpen={settings.settingsOpen}
      settingsRef={settings.settingsRef}
      setSettingsOpen={settings.setSettingsOpen}
      themeControl={themeControl}
      usePixiStage={usePixiStage}
    />
  );
}
