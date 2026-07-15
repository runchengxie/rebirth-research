const fs = require("fs");
const vm = require("vm");

function fail(message) {
  throw new Error(message);
}

function requireFile(path) {
  if (!fs.existsSync(path)) fail(`缺少文件：${path}`);
}

function requireText(path, expected) {
  const text = fs.readFileSync(path, "utf8");
  for (const item of expected) {
    if (!text.includes(item)) fail(`${path} 缺少：${item}`);
  }
  return text;
}

const html = requireText("index.html", [
  'lang="zh-CN"',
  'id="root"',
  'type="module"',
  'src="/src/main.tsx"',
]);

const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
for (const [, script] of inlineScripts) new Function(script);

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
for (const dependency of [
  "@drincs/pixi-vn",
  "@vitejs/plugin-react",
  "typescript",
  "vite",
  "vitest",
  "react",
  "react-dom",
  "pixi.js",
]) {
  const installed = packageJson.dependencies?.[dependency]
    || packageJson.devDependencies?.[dependency];
  if (!installed) fail(`package.json 缺少依赖：${dependency}`);
}

for (const script of [
  "build",
  "check",
  "dev",
  "dump:content",
  "lint",
  "lint:ci",
  "test:run",
  "typecheck",
  "validate:brand",
  "validate:bundle",
  "validate:frontend",
]) {
  if (!packageJson.scripts?.[script]) fail(`package.json 缺少脚本：${script}`);
}

const rasterAssets = [
  "assets/key-art.webp",
  "assets/vn/backgrounds/research-room.webp",
  "assets/vn/backgrounds/briefing-room.webp",
  "assets/vn/backgrounds/night-cafe.webp",
  "assets/vn/characters/rina-smile.webp",
  "assets/vn/characters/rina-thinking.webp",
  "assets/vn/characters/rina-soft.webp",
  "assets/vn/characters/misaki-neutral.webp",
  "assets/vn/characters/misaki-excited.webp",
  "assets/vn/characters/misaki-focused.webp",
  "assets/vn/characters/mei-neutral.webp",
  "assets/vn/characters/mei-serious.webp",
  "assets/vn/characters/mei-soft.webp",
  "assets/vn/characters/zhao-neutral.webp",
  "assets/vn/characters/zhao-thinking.webp",
  "assets/vn/characters/zhao-relief.webp",
];

for (const file of [
  "src/main.tsx",
  "src/App.tsx",
  "src/app/GameScreen.tsx",
  "src/app/ImmersiveGameScreen.tsx",
  "src/app/useGameController.ts",
  "src/app/useGameSessionMachine.ts",
  "src/types.ts",
  "src/styles.css",
  "src/immersive.css",
  "src/rebirth.css",
  "src/rebirth-v2.css",
  "src/research-ux.css",
  "src/platform.css",
  "src/timeline.css",
  "src/components/PixiStage.tsx",
  "src/components/ArchiveDrawer.tsx",
  "src/components/CloudSyncPanel.tsx",
  "src/components/EndingPanel.tsx",
  "src/components/InvestigationPanel.tsx",
  "src/components/ModeSwitcher.tsx",
  "src/components/RebirthTimelinePanel.tsx",
  "src/components/ResearchCommitmentPanel.tsx",
  "src/components/SaveTransferPanel.tsx",
  "src/components/StatusBar.tsx",
  "src/components/StoryRecapPanel.tsx",
  "src/modes/CommitteeMode.tsx",
  "src/modes/ContentStudioMode.tsx",
  "src/modes/DailyChallengeMode.tsx",
  "src/audio/bgm.ts",
  "src/audio/sfx.ts",
  "src/data/gameData.ts",
  "src/data/gameData.test.ts",
  "src/game/branching.ts",
  "src/game/branches.ts",
  "src/game/characters.ts",
  "src/game/cloudSync.ts",
  "src/game/committeeMode.ts",
  "src/game/communityContent.ts",
  "src/game/content.ts",
  "src/game/content2023.ts",
  "src/game/content2024.ts",
  "src/game/content2025.ts",
  "src/game/contentDemo.ts",
  "src/game/dailyChallenge.ts",
  "src/game/decisionFactory.ts",
  "src/game/engine.ts",
  "src/game/engine.test.ts",
  "src/game/linRoute2025.ts",
  "src/game/linRoute2025.test.ts",
  "src/game/narrativeMachine.ts",
  "src/game/narrativeSemantics.ts",
  "src/game/narrativeSemantics.test.ts",
  "src/game/platformModes.ts",
  "src/game/rebirth.ts",
  "src/game/rebirth.test.ts",
  "src/game/rebirthBranches.ts",
  "src/game/rebirthBranching.test.ts",
  "src/game/rebirthDecisionBonus.ts",
  "src/game/rebirthFlow.ts",
  "src/game/rebirthFlow.test.ts",
  "src/game/rebirthInvestigationData.ts",
  "src/game/rebirthOffice.ts",
  "src/game/rebirthOffice.test.ts",
  "src/game/rebirthSpecialDecisions.ts",
  "src/game/rebirthTimeline.ts",
  "src/game/rebirthTimeline.test.ts",
  "src/game/rebirthTimelineGuards.test.ts",
  "src/game/rebirthTimelineInsights.ts",
  "src/game/rebirthTimelineState.ts",
  "src/game/researchCommitment.ts",
  "src/game/runtime.ts",
  "src/game/runtime.test.ts",
  "src/game/saveState.ts",
  "src/game/saveState.test.ts",
  "src/game/sceneBuilders.ts",
  "src/game/sessionEnvelope.ts",
  "src/game/sessionMachine.ts",
  "src/game/supportingRoutes2025.ts",
  "src/game/supportingRoutes2025.test.ts",
  "src/game/storyArcs.ts",
  "src/game/verified2025.ts",
  "src/game/content/schema.ts",
  "src/game/content/content.test.ts",
  "src/spike/pixivn/Chapter1Spike.tsx",
  "scripts/content-dumps/dump2023.mjs",
  "scripts/content-dumps/dump2024.mjs",
  "scripts/validate_brand_refs.mjs",
  "scripts/validate_bundle_size.mjs",
  "vite.config.ts",
  "tsconfig.json",
  "tsconfig.app.json",
  ...rasterAssets,
  ".github/workflows/pages.yml",
]) requireFile(file);

const rasterBudgetBytes = 500 * 1024;
for (const asset of rasterAssets) {
  const size = fs.statSync(asset).size;
  if (size > rasterBudgetBytes) {
    fail(`${asset} 超过 500 KiB 资源预算：${Math.ceil(size / 1024)} KiB`);
  }
}

requireText("src/App.tsx", [
  "ImmersiveGameScreen",
  "useGameSessionMachine",
  "ModeSwitcher",
  "CommitteeMode",
  "DailyChallengeMode",
  "ContentStudioMode",
]);
const immersiveScreen = requireText("src/app/ImmersiveGameScreen.tsx", [
  "DebatePanel",
  "PixiStage",
  "loadArchiveDrawer",
  "ArchiveDrawer",
  "InvestigationPanel",
  "ResearchCommitmentPanel",
  "SaveTransferPanel",
  "canGoBack",
  "跳过已读",
  "记录与档案",
]);
if (immersiveScreen.includes("RebirthTimelinePanel")) {
  fail("主界面不应同步导入因果回溯面板");
}
requireText("src/app/useGameSessionMachine.ts", [
  "useReducer",
  "gameSessionReducer",
  "writeSessionEnvelope",
  "narrativeFrameFor",
]);
requireText("src/game/sessionMachine.ts", [
  "GameSessionAction",
  "reduceAdvance",
  "reduceDecision",
  "simulate-timeline",
]);
requireText("src/game/narrativeMachine.ts", [
  "NarrativePhase",
  "narrativeFrameFor",
  "isDebateNode",
]);
requireText("src/game/committeeMode.ts", [
  "COMMITTEE_EXAMINERS",
  "buildCommitteeRounds",
  "evaluateCommittee",
]);
requireText("src/game/communityContent.ts", [
  "rebirth-research-community-pack",
  "validateCommunityPack",
  "communityDecisionToResearchDecision",
]);
requireText("src/game/dailyChallenge.ts", [
  "dailyChallengeFor",
  "currentDailyStreak",
  "dailyShareText",
]);
requireText("src/game/cloudSync.ts", [
  "AES-GCM",
  "PBKDF2",
  "pushCloudSave",
  "pullCloudSave",
]);
requireText("src/components/ArchiveDrawer.tsx", [
  "loadTimelinePanel",
  "RebirthTimelinePanel",
  "OfficeHubPanel",
  "因果回溯",
]);
requireText("src/components/RebirthTimelinePanel.tsx", [
  'import "../timeline.css"',
  "timeline-tree",
  "显示全部月份",
]);
const mainEntry = requireText("src/main.tsx", ["createRoot", "rebirth-v2.css", "platform.css"]);
if (mainEntry.includes("timeline.css")) fail("时间线样式应由异步回溯组件加载");
requireText("vite.config.ts", ["react-vendor", "tone"]);
requireText("src/app/useGameController.ts", [
  "ProceduralBgm",
  "NarrativeAudio",
  "staticStage",
  "readStoredStateFromStorage",
  "persistStoredState",
  "readRebirthMeta",
  "skipReadSceneNodes",
  "inspectOfficeProp",
  "rewindScene",
]);
requireText("src/game/saveState.ts", [
  "SAVE_KEY_PREFIX",
  "LEGACY_SAVE_KEY_PREFIX",
  "sceneNodeId",
  "contentRevision",
]);
requireText("src/game/runtime.ts", ["canRewindScene", "rewindScene", "sceneNodeId", "year_2025"]);
requireText("src/game/narrativeSemantics.ts", [
  "decisionMethod",
  "decisionQuality",
  "decisionOutcomeAlignment",
  "YEAR_NARRATIVE_PROFILES",
  "sceneProfileFor",
]);
requireText("src/game/linRoute2025.ts", [
  "LIN_2025_BRANCHES",
  "lin_route_committed",
  "lin_route_regret",
  "lin_used_hindsight_as_proof",
]);
requireText("src/game/supportingRoutes2025.ts", [
  "SUPPORTING_2025_BRANCHES",
  "chen_route_committed",
  "zhou_route_committed",
]);
requireText("src/game/verified2025.ts", [
  "VERIFIED_2025_TIMELINE",
  "applyVerified2025Timeline",
  "2025-08-26",
]);
requireText("src/components/PixiStage.tsx", [
  "pixi.js",
  "backgroundAssets",
  "characterAssets",
  "zhao_chengyu",
]);
requireText("src/audio/sfx.ts", ["speechSynthesis", "SpeechSynthesisUtterance"]);
requireText("src/data/gameData.ts", [
  '"2023"',
  '"2024"',
  '"2025"',
  '"demo"',
  'GAME_YEARS = ["2025"]',
  "themeReturn: 0",
]);

for (const year of ["2023", "2024", "2025"]) {
  const content = JSON.parse(fs.readFileSync(`src/game/content/${year}.json`, "utf8"));
  if (content.year !== year) fail(`src/game/content/${year}.json 的 year 字段不一致`);
  if (content.contentVersion !== 2) fail(`src/game/content/${year}.json 应使用 contentVersion 2`);
  if (!Array.isArray(content.themes) || content.themes.length !== 12) {
    fail(`src/game/content/${year}.json 应包含 12 个主题`);
  }
  if (!Array.isArray(content.decisions) || content.decisions.length !== 12) {
    fail(`src/game/content/${year}.json 应包含 12 组研究方案`);
  }
}

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync("data/game-data.js", "utf8"), sandbox);
const data = sandbox.window.REBIRTH_GAME_DATA;
if (!data || typeof data !== "object") fail("data/game-data.js 没有定义 window.REBIRTH_GAME_DATA");

const years = Object.keys(data).sort();
if (years.length === 0) fail("data/game-data.js 没有年份数据");
for (const year of years) {
  if (!Array.isArray(data[year].months) || data[year].months.length !== 12) {
    fail(`data/game-data.js 中的 ${year} 应包含 12 个月`);
  }
}

console.log(`前端结构校验通过。模式：年度剧情、投委会、每日挑战、内容工坊。静态数据年份：${years.join("、")}。`);
