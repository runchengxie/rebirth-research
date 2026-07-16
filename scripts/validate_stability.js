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

function forbidText(path, forbidden) {
  const text = fs.readFileSync(path, "utf8");
  for (const item of forbidden) {
    if (text.includes(item)) fail(`${path} 不应包含旧契约：${item}`);
  }
}

for (const file of [
  "src/components/AppErrorBoundary.tsx",
  "src/components/BackToMenu.tsx",
  "src/components/DebatePanel.tsx",
  "src/components/StartMenu.tsx",
  "src/start-menu.css",
  "src/stability.css",
  "src/platform-polish.css",
  "src/platform-theme.css",
  "src/settings-polish.css",
  "src/game/communityContent.test.ts",
  "scripts/playwright.config.js",
  "scripts/check.py",
  "scripts/e2e/platform.spec.js",
  "scripts/test_check.py",
  "scripts/test_validate_text_quality.py",
  "scripts/validate_text_quality.py",
  "vitest.config.ts",
  "docs/stability-and-accessibility.md",
  "docs/ui-system.md",
]) requireFile(file);

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
for (const script of ["check", "e2e:prepare", "test:e2e", "validate:stability"]) {
  if (!packageJson.scripts?.[script]) fail(`package.json 缺少脚本：${script}`);
}
for (const [dependency, version] of [
  ["@playwright/test", "1.55.0"],
  ["@axe-core/playwright", "4.10.2"],
]) {
  if (packageJson.devDependencies?.[dependency] !== version) {
    fail(`package.json 需要固定本地测试依赖：${dependency}@${version}`);
  }
}

requireText("src/App.tsx", [
  "AppErrorBoundary",
  "skip-link",
  'id="main-content"',
  'aria-busy="true"',
  "mode-${destination}",
  "StartMenu",
  "BackToMenu",
  "appDestinationFromSearch",
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
  "DebateHistory",
  "研究室",
]);
requireText("src/components/DebatePanel.tsx", [
  '<ul className="debate-grid">',
  "<li",
  "data-character",
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
  "--platform-panel-strong",
  "--platform-text",
  "--platform-input",
  ".studio-preview",
  "overflow: visible",
]);
requireText("src/start-menu.css", [
  ".app-shell.mode-menu",
  ".start-menu-card",
  ".start-menu-hero-art",
  ".back-to-menu",
  "object-fit: cover",
  "var(--platform-text)",
  "var(--platform-panel-strong)",
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
  "主菜单把两种年度体验与独立玩法分开",
  "主菜单封面在桌面与窄屏保持清晰层级",
  "剧情模式只让玩家处理人物回应",
  "剧情模式把三位同事的观点放进独立对话框",
  "研究室物件集中在档案抽屉",
  "档案弹窗关闭后恢复焦点",
  "主菜单入口不会遮挡操作按钮",
  "都可以滚动到底部",
  "深色模式关键平台文字",
  "内容工坊保存的案例会进入投委会案例库",
  "模式代码加载失败时显示可恢复界面",
]);
requireText("scripts/check.py", [
  "PYTHON_CHECKS",
  "FRONTEND_CHECKS",
  "BROWSER_CHECKS",
  'Check("validate_stability", ("npm", "run", "validate:stability"))',
  'Check("validate_bundle", ("npm", "run", "validate:bundle"))',
  '"validate_text_quality"',
  '("npm", "run", "test:e2e")',
]);
requireText(".github/workflows/pages.yml", [
  "name: Deploy Pages",
  "branches: [main]",
  "workflow_dispatch:",
  "npm run build:pages",
  "actions/deploy-pages@v4",
  "needs: build",
]);
forbidText(".github/workflows/pages.yml", [
  "pull_request:",
  "  quality:",
  "  e2e:",
  "npm run check",
  "npm run typecheck",
  "npm run test:e2e",
  "tsc -b",
]);
requireText("vitest.config.ts", ['"scripts/e2e/**"']);

console.log("稳定性契约校验通过。本地质量入口、浏览器回归、深色对比度、焦点恢复和 Pages 发布已接入。");
