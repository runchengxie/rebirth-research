const fs = require("fs");
const vm = require("vm");

function fail(message) {
  throw new Error(message);
}

function requireFile(path) {
  if (!fs.existsSync(path)) {
    fail(`缺少文件：${path}`);
  }
}

function requireText(path, expected) {
  const text = fs.readFileSync(path, "utf8");
  for (const item of expected) {
    if (!text.includes(item)) {
      fail(`${path} 缺少：${item}`);
    }
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
for (const [, script] of inlineScripts) {
  new Function(script);
}

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
  if (!installed) {
    fail(`package.json 缺少依赖：${dependency}`);
  }
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
  "validate:frontend",
]) {
  if (!packageJson.scripts?.[script]) {
    fail(`package.json 缺少脚本：${script}`);
  }
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
  "src/types.ts",
  "src/styles.css",
  "src/immersive.css",
  "src/components/PixiStage.tsx",
  "src/components/EndingPanel.tsx",
  "src/components/StoryRecapPanel.tsx",
  "src/audio/bgm.ts",
  "src/audio/sfx.ts",
  "src/data/gameData.ts",
  "src/data/gameData.test.ts",
  "src/game/branching.ts",
  "src/game/branches.ts",
  "src/game/characters.ts",
  "src/game/content.ts",
  "src/game/content2023.ts",
  "src/game/content2024.ts",
  "src/game/content2025.ts",
  "src/game/contentDemo.ts",
  "src/game/decisionFactory.ts",
  "src/game/engine.ts",
  "src/game/engine.test.ts",
  "src/game/narrativeSemantics.ts",
  "src/game/narrativeSemantics.test.ts",
  "src/game/runtime.ts",
  "src/game/runtime.test.ts",
  "src/game/saveState.ts",
  "src/game/saveState.test.ts",
  "src/game/sceneBuilders.ts",
  "src/game/storyArcs.ts",
  "src/game/content/schema.ts",
  "src/game/content/content.test.ts",
  "src/spike/pixivn/Chapter1Spike.tsx",
  "scripts/content-dumps/dump2023.mjs",
  "scripts/content-dumps/dump2024.mjs",
  "scripts/validate_brand_refs.mjs",
  "vite.config.ts",
  "tsconfig.json",
  "tsconfig.app.json",
  ...rasterAssets,
  ".github/workflows/pages.yml",
]) {
  requireFile(file);
}

const rasterBudgetBytes = 500 * 1024;
for (const asset of rasterAssets) {
  const size = fs.statSync(asset).size;
  if (size > rasterBudgetBytes) {
    fail(`${asset} 超过 500 KiB 资源预算：${Math.ceil(size / 1024)} KiB`);
  }
}

requireText("src/App.tsx", ["ImmersiveGameScreen", "Chapter1Spike", "pixivn"]);
requireText("src/app/ImmersiveGameScreen.tsx", [
  "DebatePanel",
  "PixiStage",
  "canGoBack",
  "记录与档案",
]);
requireText("src/app/useGameController.ts", [
  "ProceduralBgm",
  "NarrativeAudio",
  "staticStage",
  "readStoredStateFromStorage",
  "persistStoredState",
  "rewindScene",
]);
requireText("src/game/saveState.ts", [
  "SAVE_KEY_PREFIX",
  "LEGACY_SAVE_KEY_PREFIX",
  "sceneNodeId",
  "contentRevision",
]);
requireText("src/game/runtime.ts", ["canRewindScene", "rewindScene", "sceneNodeId"]);
requireText("src/game/narrativeSemantics.ts", [
  "decisionMethod",
  "decisionQuality",
  "decisionOutcomeAlignment",
  "YEAR_NARRATIVE_PROFILES",
  "sceneProfileFor",
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
  "GAME_YEARS",
  "themeReturn: 0",
]);

for (const year of ["2023", "2024", "2025"]) {
  const content = JSON.parse(
    fs.readFileSync(`src/game/content/${year}.json`, "utf8"),
  );
  if (content.year !== year) {
    fail(`src/game/content/${year}.json 的 year 字段不一致`);
  }
  if (content.contentVersion !== 2) {
    fail(`src/game/content/${year}.json 应使用 contentVersion 2`);
  }
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
if (!data || typeof data !== "object") {
  fail("data/game-data.js 没有定义 window.REBIRTH_GAME_DATA");
}

const years = Object.keys(data).sort();
if (years.length === 0) {
  fail("data/game-data.js 没有年份数据");
}
for (const year of years) {
  if (!Array.isArray(data[year].months) || data[year].months.length !== 12) {
    fail(`data/game-data.js 中的 ${year} 应包含 12 个月`);
  }
}

console.log(`前端结构校验通过。正式剧情年份：2023、2024、2025。静态数据年份：${years.join("、")}。`);
