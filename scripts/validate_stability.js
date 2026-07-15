const fs = require("fs");

function fail(message) {
  throw new Error(message);
}

function requireFile(path) {
  if (!fs.existsSync(path)) fail(`缺少稳定性文件：${path}`);
}

function requireText(path, expected) {
  const text = fs.readFileSync(path, "utf8");
  for (const item of expected) {
    if (!text.includes(item)) fail(`${path} 缺少稳定性契约：${item}`);
  }
}

for (const file of [
  "src/components/AppErrorBoundary.tsx",
  "src/stability.css",
  "src/platform-polish.css",
  "src/platform-theme.css",
  "src/settings-polish.css",
  "src/game/communityContent.test.ts",
  "scripts/playwright.config.js",
  "scripts/e2e/platform.spec.js",
  "vitest.config.ts",
  "docs/stability-and-accessibility.md",
  "docs/ui-system.md",
]) requireFile(file);

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
for (const script of ["e2e:prepare", "test:e2e", "validate:stability"]) {
  if (!packageJson.scripts?.[script]) fail(`package.json 缺少脚本：${script}`);
}

requireText("src/App.tsx", [
  "AppErrorBoundary",
  "skip-link",
  'id="main-content"',
  'aria-busy="true"',
  "mode-${mode}",
  "platform-polish.css",
  "platform-theme.css",
]);
requireText("src/components/ArchiveDrawer.tsx", [
  "FOCUSABLE_SELECTOR",
  "previousFocusRef",
  'event.key === "Escape"',
  'event.key !== "Tab"',
  'aria-modal="true"',
  'role="tablist"',
]);
requireText("src/components/SaveTransferPanel.tsx", [
  "settings-disclosure",
  "本地文件",
  "分享码",
  "CloudSyncPanel",
]);
requireText("src/components/CloudSyncPanel.tsx", [
  "cloud-sync-panel",
  "cloud-sync-badge",
  "AES-GCM",
  "token 与口令均不落盘",
]);
requireText("src/platform-shell.css", [
  ".app-shell.mode-story",
  "grid-template-areas",
  ".mode-story .platform-mode-switcher",
  "--platform-disabled-text",
  "overflow: hidden",
]);
requireText("src/platform-polish.css", [
  "overflow-y: auto",
  ".committee-mode",
  ".daily-mode",
  ".studio-mode",
  "max-height: calc(100vh - 114px)",
  "--platform-input-border",
]);
requireText("src/platform-theme.css", [
  ':root[data-theme="dark"]',
  ".app-shell:not(.mode-story) .platform-mode-switcher",
  ".studio-preview",
  "overflow: visible",
]);
requireText("src/game/communityContent.ts", [
  "COMMUNITY_PACK_MAX_BYTES",
  "COMMUNITY_PACK_MAX_CASES",
  "COMMUNITY_CASE_MAX_DECISIONS",
  "存在重复 id",
  "TextEncoder",
]);
requireText("scripts/e2e/platform.spec.js", [
  "AxeBuilder",
  "waitForPageReady",
  "answerCommittee",
  "档案弹窗关闭后恢复焦点",
  "研究平台栏不会遮挡操作按钮",
  "都可以滚动到底部",
  "深色模式关键平台文字",
  "内容工坊保存的案例会进入投委会案例库",
  "模式代码加载失败时显示恢复界面",
]);
requireText(".github/workflows/pages.yml", [
  "e2e:",
  "Browser journeys and accessibility",
  "playwright-diagnostics",
  "needs: [quality, e2e]",
]);
requireText("vitest.config.ts", ['"scripts/e2e/**"']);

console.log("稳定性契约校验通过。浏览器回归、滚动边界、深色对比度、焦点恢复和内容包限制已接入。");
