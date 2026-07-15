import {
  navigatePlatformMode,
  PLATFORM_MODES,
  type PlatformMode,
} from "../game/platformModes";

export function ModeSwitcher({ activeMode }: { activeMode: PlatformMode }) {
  return (
    <nav className="platform-mode-switcher" aria-label="游戏模式">
      <strong>研究平台</strong>
      <div>
        {PLATFORM_MODES.map((mode) => (
          <button
            aria-current={mode.id === activeMode ? "page" : undefined}
            className={mode.id === activeMode ? "active" : ""}
            key={mode.id}
            type="button"
            onClick={() => navigatePlatformMode(mode.id)}
          >
            <span>{mode.label}</span>
            <small>{mode.short}</small>
          </button>
        ))}
      </div>
    </nav>
  );
}
