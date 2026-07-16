# AGENTS

这份文件供项目维护者和自动化助手使用。修改前先确认当前功能和数据边界，避免根据旧文档推断实现。

## 项目定位

这是一个使用 Vite、TypeScript、React 和 PixiJS 构建的中文静态网页游戏与研究决策平台。核心剧情、投委会、每日挑战和内容工坊可以完全离线运行。可选 GitHub Gist 云同步会调用玩家自己的 GitHub API，项目没有自建后端或账号系统。

构建产物位于 `dist/`，GitHub Pages 通过 `.github/workflows/pages.yml` 发布该目录。

主要入口：

- `src/main.tsx`：前端入口、存档恢复和全局样式加载顺序
- `src/App.tsx`：主菜单、顶层模式路由、懒加载、跳过导航和错误恢复边界
- `src/components/StartMenu.tsx`：继续游戏、新游戏体验选择、挑战中心和创作入口
- `src/app/useGameSessionMachine.ts`：默认剧情的 React 状态管理、持久化和界面适配
- `src/game/sessionMachine.ts`：单周目与跨周目状态的原子行动归并
- `src/game/experienceMode.ts`：剧情模式与职业模式的界面策略和结算适配
- `src/app/useGameController.ts`：音频、主题、设置和旧兼容类型
- `src/app/ImmersiveGameScreen.tsx`：主游戏的单视口页面，档案抽屉按需加载
- `src/components/DebatePanel.tsx`：按角色分开的三方观点卡片
- `src/components/ArchiveDrawer.tsx`：档案、研究室、焦点限制和时间线入口
- `src/components/RebirthPanel.tsx`：研究室物件概览、整理操作和跨周目档案
- `src/components/AppErrorBoundary.tsx`：顶层运行时恢复界面
- `src/modes/CommitteeMode.tsx`：独立投委会
- `src/modes/DailyChallengeMode.tsx`：每日研究挑战
- `src/modes/ContentStudioMode.tsx`：社区内容工坊
- `src/components/RebirthTimelinePanel.tsx`：按需加载的树状因果回溯界面
- `src/components/PixiStage.tsx`：常规角色的 PixiJS 舞台
- `src/game/runtime.ts`：状态初始化、剧情游标、回看和跨月推进
- `src/game/engine.ts`：评分、数值、关系、旗标和结局相关计算
- `src/game/sceneBuilders.ts`：场景和研究方案装配
- `src/game/content.ts`：叙事模块统一导出入口

## 当前功能事实

- 当前正式入口只有 2025 年，共 12 话。`GAME_YEARS` 只包含 `2025`。
- 2023、2024 作为往年档案保留，可通过 `?year=2023` 和 `?year=2024` 深链访问。
- `demo` 是开发示范内容，只通过 `?year=demo` 深链访问。往年档案和 `demo` 都不出现在年份选择器。
- 无参数访问先进入主菜单。年度剧情、投委会、每日挑战和内容工坊从主菜单进入，旧年份和原型深链仍直接打开年度剧情。
- 主菜单顶部使用 `assets/key-art.webp`。封面只负责营造氛围，必要信息和操作入口都放在独立的实色区域中。
- 年度剧情分为剧情模式与职业模式。剧情模式隐藏调查、日程、研究承诺和职业指标，由系统采用稳健研究承诺并缓和隐藏的疲劳与生活惩罚。职业模式保留完整投研与回溯压力。
- 新游戏使用 `?mode=story&play=romance&new=1` 或 `?mode=story&play=career&new=1`。`play` 只决定新存档体验，已有存档以 `RebirthMetaState.experienceMode` 为准。
- 月度结算依据研究方案、多维评分和编写好的业务事实。运行时不读取真实月度涨跌幅。
- `src/data/gameData.ts` 中的 `themeReturn` 当前固定为 0，行业轮动和风格因子为空。
- 游戏按年份保存 `GameState` 和跨周目元状态。关键月会保存回溯锚点，重新开始会暂停当前时间线并创建新路线。
- 结算前可以返回当前话的上一段对白。结算后只通过档案抽屉回看，不撤销数值和旗标。
- 背景音乐和提示音使用 Web Audio API。关键对白可以使用 Web Speech API 调用系统中文语音。
- `?pixivn=1` 会动态加载第一话 Pixi'VN 原型。默认线路不会挂载该原型。
- 赵承宇是量化组同级同事，走友情和搭档路线，不进入导师关系路线和研究图鉴。
- 社区内容包只允许受限 JSON 数据，不执行脚本、HTML 或远程资源。
- GitHub Gist 云同步使用客户端加密。令牌和口令不能写入持久化存储。

## 数据边界

项目中的数据分为五类：

1. `src/game/content/*.json` 是前端实际使用的年份剧情内容，由 `src/game/content/schema.ts` 校验。
2. `src/data/gameData.ts` 负责把剧情场景装配成运行时年份数据。
3. `src/game/communityContent.ts` 定义本地社区内容包格式、资源限制和案例转换。
4. `data/*.json`、`data/game-data.js` 和 `data/manifest.json` 是独立静态股票选项数据，由 `scripts/validate_data.py` 校验，当前不接入 React 运行时。
5. `scripts/build_data.py` 生成 `market-review-YYYY.json` 和 `market-review-manifest.json`，格式与 `data/YYYY.json` 不同，也不会被 `scripts/validate_data.py` 校验。

运行 `scripts/build_data.py` 时优先使用单独的输出目录，例如 `generated/market-review`。发布文件不能包含本机绝对路径。

## 修改位置

- 角色资料、关系门槛、日程和评分评语：`src/game/characters.ts`
- 年份公共故事线和轮换文案：`src/game/storyArcs.ts`
- 条件分支和赵承宇搭档线：`src/game/branches.ts`
- 场景装配、知识卡和年份路由：`src/game/sceneBuilders.ts`
- 各年份主题与研究方案：`src/game/content/*.json`
- 2025 年主题、业务事实和分歧假设：`src/game/content/2025.json`
- 2025 年加载与核验事件叠加：`src/game/content2025.ts` 和 `src/game/verified2025.ts`
- 数值结算和旗标：`src/game/engine.ts`
- 剧情推进、回看和初始状态：`src/game/runtime.ts`
- 原子游戏行动：`src/game/sessionMachine.ts`
- 年度剧情体验策略：`src/game/experienceMode.ts`
- 顶层模式路由和恢复界面：`src/App.tsx`
- 主菜单和入口信息架构：`src/components/StartMenu.tsx`、`src/game/platformModes.ts` 和 `src/start-menu.css`
- 主页面展示：`src/app/ImmersiveGameScreen.tsx`
- 主页面覆盖样式：`src/immersive.css`
- 稳定性和跳过导航样式：`src/stability.css`
- 音频、设置和主题控制：`src/app/useGameController.ts`
- 常规舞台资源、姿势和调色：`src/components/PixiStage.tsx`
- 音频：`src/audio/bgm.ts` 和 `src/audio/sfx.ts`
- 回溯时间线：`src/game/rebirthTimelineState.ts`、`src/game/rebirthTimeline.ts` 和 `src/game/rebirthTimelineInsights.ts`
- 投委会评分和追问：`src/game/committeeMode.ts`
- 每日挑战：`src/game/dailyChallenge.ts`
- 社区内容包：`src/game/communityContent.ts`
- 加密云同步：`src/game/cloudSync.ts`

新增玩法逻辑时优先放在 `src/game/`，React 组件只负责展示和交互。修改角色编号或类型时，以 `src/types.ts` 为唯一类型来源，并同步检查 JSON 校验器、关系初始值、资源映射和测试。

## 本地准备

```bash
npm ci
uv sync --only-dev
```

前端建议使用 Node.js 22。Python 版本要求见 `pyproject.toml`，当前为 3.11 或更高版本。

## 提交前检查

完整本地检查：

```bash
npm run check
```

`npm run check` 会通过 `scripts/check.py` 依次运行 Python、前端和 Chromium 浏览器回归。首次运行浏览器测试前需要下载 Chromium：

```bash
npm run e2e:prepare
npm run test:e2e
```

也可以直接运行同一检查入口：

```bash
uv run python scripts/check.py
```

联合检查使用 ty 作为阻塞 Python 类型检查。`--all` 仅作为旧命令的兼容参数保留。需要缩小范围时可以使用 `--python`、`--frontend` 或 `--e2e`。

复杂度检查分为两层：

- Ruff 的 C901 规则把 Python 圈复杂度上限设为 15。
- ESLint 的 `complexity` 规则把 `src/` 下 TypeScript 与 TSX 的圈复杂度上限设为 15。`lint:ci` 以零警告运行，因此超限会阻塞提交。
- `scripts/dev/maintainability_metrics.py` 统计 Python 长行、长函数、大文件和 C901 忽略项。`scripts/test_maintainability_metrics.py` 将当前值与 `DEFAULT_RATCHET_BUDGETS` 对照，防止指标变差。

查看当前可维护性指标或单独执行棘轮检查：

```bash
uv run python scripts/dev/maintainability_metrics.py
uv run python scripts/dev/maintainability_metrics.py --ratchet
```

基线只能在确认代码结构已经改善后收紧。不要为了让检查通过而放宽预算或添加 C901 忽略项。

需要逐项排查时运行：

```bash
uv run ruff check .
uv run ruff format --check .
uv run python -m compileall scripts
uv run pytest scripts/ -v
uv run ty check scripts
uv run python scripts/validate_data.py
uv run python scripts/validate_text_quality.py
node scripts/validate_frontend.js
node scripts/validate_stability.js
npm run lint:ci
npm run typecheck
npm run test:run
npm run build
npm run validate:bundle
npm run test:e2e
```

代码质量和浏览器回归只在本地运行。GitHub Actions 不再承担测试 CI，`.github/workflows/pages.yml` 只在 `main` 更新或手动触发时安装依赖，通过 `npm run build:pages` 执行 Vite 打包并发布 GitHub Pages。

## 测试要求

修改以下内容时应同步补测试：

- 评分、关系、旗标和结局：`src/game/engine.test.ts`
- 状态初始化和剧情推进：`src/game/runtime.test.ts`
- 原子状态转换：为 `src/game/sessionMachine.ts` 增加或更新对应测试
- 年份内容和 JSON 校验：`src/game/content/content.test.ts`
- 社区内容包格式和安全边界：`src/game/communityContent.test.ts`
- 2025 正式入口、往年档案与示范线路：`src/data/gameData.test.ts`
- 主菜单、封面布局、用户旅程、体验模式、焦点、深色对比度、窄屏溢出和无障碍：`scripts/e2e/platform.spec.js`
- Python 数据生成：`scripts/test_build_data.py`
- 静态数据校验：`scripts/test_validate_data.py`
- 文档风格：`scripts/test_docs_style.py`
- 中文说明、游戏台词、重复标点和多人台词拼接：`scripts/validate_text_quality.py` 与 `scripts/test_validate_text_quality.py`

Vitest 不得收集 `scripts/e2e/`。浏览器测试使用 `scripts/playwright.config.js`。修复缺陷时，先加入能复现问题的测试，再改实现。测试名称应说明业务行为。

## 文档要求

- 根目录 `README.md` 面向第一次接触项目的玩家和开发者，只保留项目介绍、在线试玩、核心体验、快速开始、文档入口和必要边界。
- 玩法和当前功能写入 `docs/gameplay.md`，操作体验写入 `docs/ux.md`，工程细节写入 `docs/architecture.md`，操作命令写入 `docs/maintenance.md`。
- 浏览器回归、焦点管理、错误恢复和自动无障碍边界写入 `docs/stability-and-accessibility.md`。
- `docs/README.md` 负责提供文档索引和阅读顺序。
- 文档以中文为主，使用中文标点。
- 命令、路径、参数、代码符号和字段名保留行内代码格式。
- 直接写结论，减少翻译腔、口号和迁移历史。
- 少用英文小标题。专业缩写确有必要时可以保留，例如 API、JSON、WebGL。
- 避免粗体强调、中文双引号、分号、长破折号和成对否定转折句。
- 文档只描述当前行为。历史决策放在提交记录或拉取请求中。
- 修改功能、数据格式、脚本命令、自动化状态或目录结构后，更新对应的 `docs/` 文档。只有面向新读者的入口信息发生变化时才更新根目录 README。

## 发布和资源

- `dist/`、`dist-package/`、`playwright-report/` 和 `test-results/` 不提交到 Git。
- 离线包由 `scripts/package.ps1` 生成。
- 第三方音频只有在授权明确时才能加入仓库，并在相关说明文档中记录来源和授权。
- 角色图片和背景图片放在 `assets/vn/`，新增资源后同步更新舞台组件和 `scripts/validate_frontend.js`。
- 主菜单封面位于 `assets/key-art.webp`，只在主菜单顶部使用。
- 舞台位图使用 WebP，单个发布资源不得超过 500 KiB。角色立绘需要保留透明通道。
- 核心页面运行时不能依赖作者本机路径、本地 Python 环境或项目自建外部服务。可选 GitHub API 功能必须在离线时明确降级。
