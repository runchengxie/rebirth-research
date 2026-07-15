export type PlatformMode = "story" | "committee" | "daily" | "studio";

export const PLATFORM_MODES: ReadonlyArray<{
  id: PlatformMode;
  label: string;
  short: string;
}> = [
  { id: "story", label: "年度剧情", short: "十二个月主线" },
  { id: "committee", label: "投委会", short: "独立答辩模式" },
  { id: "daily", label: "每日挑战", short: "全员同题" },
  { id: "studio", label: "内容工坊", short: "创作社区案例" },
];

export function platformModeFromSearch(search: string): PlatformMode {
  const mode = new URLSearchParams(search).get("mode");
  return PLATFORM_MODES.some((item) => item.id === mode)
    ? mode as PlatformMode
    : "story";
}

export function platformModeUrl(mode: PlatformMode): string {
  const url = new URL(window.location.href);
  if (mode === "story") url.searchParams.delete("mode");
  else url.searchParams.set("mode", mode);
  url.searchParams.delete("pixivn");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function navigatePlatformMode(mode: PlatformMode): void {
  window.location.assign(platformModeUrl(mode));
}
