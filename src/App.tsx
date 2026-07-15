import { lazy, Suspense, useState } from "react";
import { ImmersiveGameScreen } from "./app/ImmersiveGameScreen";
import { useGameSessionMachine } from "./app/useGameSessionMachine";
import {
  canUsePixiStage,
  useGameAudio,
  useSettingsMenu,
  useThemeControl,
} from "./app/useGameController";
import { ModeSwitcher } from "./components/ModeSwitcher";
import {
  platformModeFromSearch,
  type PlatformMode,
} from "./game/platformModes";

const Chapter1Spike = lazy(() =>
  import("./spike/pixivn/Chapter1Spike").then((module) => ({
    default: module.Chapter1Spike,
  })),
);
const CommitteeMode = lazy(() =>
  Promise.all([
    import("./modes/CommitteeMode"),
    import("./platform.css"),
  ]).then(([module]) => ({ default: module.CommitteeMode })),
);
const DailyChallengeMode = lazy(() =>
  Promise.all([
    import("./modes/DailyChallengeMode"),
    import("./platform.css"),
  ]).then(([module]) => ({ default: module.DailyChallengeMode })),
);
const ContentStudioMode = lazy(() =>
  Promise.all([
    import("./modes/ContentStudioMode"),
    import("./platform.css"),
  ]).then(([module]) => ({ default: module.ContentStudioMode })),
);

function StoryMode() {
  const audio = useGameAudio();
  const session = useGameSessionMachine(audio);
  const settings = useSettingsMenu();
  const themeControl = useThemeControl();
  const [usePixiStage] = useState(canUsePixiStage);
  const [usePixivnSpike] = useState(
    () => new URLSearchParams(window.location.search).get("pixivn") === "1",
  );

  if (usePixivnSpike) {
    return (
      <Suspense
        fallback={(
          <main className="platform-screen platform-loading" role="status">
            <strong>正在加载 Pixi'VN 第一话原型</strong>
          </main>
        )}
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

function ModeContent({ mode }: { mode: PlatformMode }) {
  if (mode === "committee") return <CommitteeMode />;
  if (mode === "daily") return <DailyChallengeMode />;
  if (mode === "studio") return <ContentStudioMode />;
  return <StoryMode />;
}

export default function App() {
  const [mode] = useState(() => platformModeFromSearch(window.location.search));
  return (
    <>
      <ModeSwitcher activeMode={mode} />
      <Suspense
        fallback={(
          <main className="platform-screen platform-loading" role="status">
            <strong>正在加载研究模式</strong>
            <p>浏览器在整理档案、会议室和人类制造的各种流程。</p>
          </main>
        )}
      >
        <ModeContent mode={mode} />
      </Suspense>
    </>
  );
}
