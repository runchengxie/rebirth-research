# 维护说明

## 环境准备

前端建议使用 Node.js 22，与 GitHub Pages 工作流保持一致。Python 工具要求 Python 3.11 或更高版本。

```bash
npm ci
uv sync --only-dev
```

启动开发服务器：

```bash
npm run dev
```

生产构建和本地预览：

```bash
npm run build
npm run preview
```

## 日常开发流程

1. 先确认改动属于界面、运行时、结算引擎、剧情内容、独立模式还是数据工具。
2. 修改源码或数据后，补充对应测试。
3. 运行一次完整本地检查。
4. 根据失败分组逐项排查。
5. 核对 README、`AGENTS.md` 和相关设计文档是否仍然准确。
6. 需要离线分享包时运行 `scripts/package.ps1`。
7. 推送后确认 GitHub Pages 构建和发布状态。

## 剧情内容维护

年份内容源位于：

- `src/game/content/2023.json`
- `src/game/content/2024.json`
- `src/game/content/2025.json`

每份文件包含 12 个月度主题和 12 组研究方案。加载器会调用 `src/game/content/schema.ts` 校验内容。修改后至少运行：

```bash
npm run test:run
npm run typecheck
npm run build
```

`npm run dump:2023` 和 `npm run dump:2024` 会通过 Vite 加载现有内容，再重写对应 JSON。它们适合做格式整理和一致性核对。运行前先提交或备份未保存的内容，运行后检查差异。

`npm run dump:content` 会依次处理 2023 和 2024。

三份 JSON 都直接保存 `knownEvent`、`businessOutcome` 和 `competingHypotheses`。`src/game/content2025.ts` 读取并校验 2025 JSON，再通过 `src/game/verified2025.ts` 叠加经过核对的月度事件锚点。修改 2025 年主题时，需要同时检查 JSON、核验台账和月份顺序。

## 社区内容包维护

社区内容包契约位于 `src/game/communityContent.ts`。当前限制包括：

- 单个 JSON 最多 256 KiB。
- 每个内容包最多 20 个案例。
- 每个案例允许 2 至 8 个研究方案。
- 案例 ID 和同一案例中的方案 ID 必须唯一。
- 文本字段有长度上限。
- `updatedAt` 必须是有效日期时间。

修改格式、限制或转换逻辑后，需要同步更新 `src/game/communityContent.test.ts`、内容工坊和 `docs/platform-modes.md`。版本迁移规则尚未加入，修改 `COMMUNITY_PACK_VERSION` 前必须提供旧格式迁移路径。

## 角色与分支维护

角色资料位于 `src/game/characters.ts`，角色语言规范见 `docs/characters.md`。

条件分支位于 `src/game/branches.ts`，条件判断位于 `src/game/branching.ts`。新增分支时需要检查：

- 分支条件是否会重复触发
- `once` 分支是否有稳定编号
- 决策写入的旗标是否有后续读取方
- 角色关系是否只累计一次
- 导师路线与赵承宇搭档路线是否保持分离
- 静态场景构建时是否仍能在没有状态参数的情况下运行

相关测试主要位于 `src/game/engine.test.ts`。

## 数据维护

### 运行时数据

`src/data/gameData.ts` 根据剧情内容生成运行时场景和市场快照。当前市场快照只提供叙事背景，真实涨跌幅没有接入结算。

正常年份选择器由 `GAME_YEARS` 控制，当前只包含 2025。2023、2024 和 `demo` 保留在 `GAME_DATA` 中，只供往年档案或开发深链访问。修改入口年份时同步更新 `src/data/gameData.test.ts`。

### 独立静态股票数据

`data/2023.json`、`data/2024.json`、`data/2025.json`、`data/game-data.js` 和 `data/manifest.json` 是一套独立静态数据。它们当前不被 React 运行时消费。

校验命令：

```bash
uv run python scripts/validate_data.py
```

校验内容包括：

- `manifest.json` 中的年份和文件清单
- 每年 12 个月是否完整并按顺序排列
- 每月是否有四个不重复选项
- 最佳选项与 `isBest` 标记是否一致
- 理论资金曲线是否可以从月度最佳收益重新计算
- `data/game-data.js` 是否与年份 JSON 完全一致
- 公开字段是否包含本机绝对路径

### 市场复盘生成器

`scripts/build_data.py` 从本地清洗行情生成 `market-review-YYYY.json` 和 `market-review-manifest.json`。输出字段为 `benchmarks`，与 `data/YYYY.json` 的 `months` 格式不同。

推荐使用单独目录：

```bash
uv run python scripts/build_data.py \
  --years 2023 2024 2025 \
  --daily-clean-dir /path/to/a_share_daily_clean \
  --instruments /path/to/a_share_instruments_latest.parquet \
  --out-dir generated/market-review \
  --price-column adj_close
```

也可以设置：

```bash
export REBIRTH_DAILY_CLEAN_DIR=/path/to/a_share_daily_clean
export REBIRTH_INSTRUMENTS_FILE=/path/to/a_share_instruments_latest.parquet
```

生成器当前不会把结果接入前端，也不会由 `scripts/validate_data.py` 校验。更新算法或输出格式时，应同步更新 `scripts/test_build_data.py` 和说明文档。

## 测试与检查

### 完整本地检查

```bash
npm run check
```

这是提交前的单一入口。它通过 `scripts/check.py` 依次运行 Python、前端和浏览器三组阻塞检查。生产构建和包体预算归在前端分组中。

Python 分组包括 Ruff 规则与格式、编译、ty、Pytest、静态数据校验和文本质量检查。前端分组包括：

- `npm run lint:ci`
- `npm run typecheck`
- `npm run test:run`
- `npm run validate:frontend`
- `npm run validate:stability`
- `npm run validate:brand`
- `npm run build`
- `npm run validate:bundle`

`npm run validate:bundle` 读取 `dist/assets`，检查首屏入口、异步档案、回溯面板和时间线样式的体积预算。它必须在生产构建之后运行。

`npm run validate:stability` 检查错误边界、主菜单、跳过导航、档案焦点规则、社区内容限制、本地质量入口、浏览器测试文件和仅用于 Pages 发布的工作流是否仍然存在。

### 复杂度与可维护性基线

项目使用两类复杂度门禁：

- `pyproject.toml` 启用 Ruff C901，Python 圈复杂度上限为 15。
- `eslint.config.mjs` 对 `src/` 下 TypeScript 和 TSX 启用 `complexity`，上限为 15。`npm run lint:ci` 以零警告执行，复杂度警告会让检查失败。

Python 可维护性脚本还会统计长行、长函数、大文件和 C901 忽略项：

```bash
uv run python scripts/dev/maintainability_metrics.py
uv run python scripts/dev/maintainability_metrics.py --json
uv run python scripts/dev/maintainability_metrics.py --ratchet
```

`scripts/test_maintainability_metrics.py` 会在 Pytest 阶段核对 `DEFAULT_RATCHET_BUDGETS`。当前基线允许已有的两个百行以上 Python 函数，其余受管指标必须保持现值或下降。重构后可以收紧基线。新增债务时不能通过放宽预算、增加 C901 忽略项或跳过测试来绕过门禁。

### 浏览器回归

`npm ci` 会从开发依赖安装固定版本的 Playwright 与 axe。首次运行或浏览器版本变化后，用以下命令准备 Chromium：

```bash
npm run e2e:prepare
```

单独重跑浏览器用例：

```bash
npm run test:e2e
```

浏览器测试位于 `scripts/e2e/`，配置位于 `scripts/playwright.config.js`。测试运行器会启动 Vite 开发服务器，并检查：

- 主菜单、新游戏体验和兼容深链
- 主菜单封面加载、宽屏分栏、窄屏顺序和横向溢出
- 年度剧情跳过导航和档案焦点恢复
- 剧情模式与职业模式的界面策略
- 三位同事的观点卡分开显示，窄屏可滚动阅读
- 研究室物件离开主舞台，并在档案抽屉内完整呈现
- 投委会完整答辩和历史保存
- 每日挑战首次记录和练习模式
- 内容工坊与投委会案例库联动
- 模式加载失败恢复界面
- 主菜单与四种玩法的严重和致命 axe 问题
- 新增观点卡和研究室在浅色、深色主题下的文字对比度

通用 axe 扫描不包含配色对比度。关键深色界面另有显式对比度回归，人工审计范围见 `docs/stability-and-accessibility.md`。

完整检查会自动执行 `e2e:prepare`。已安装的浏览器不会重复下载。

### 分组排查

```bash
uv run python scripts/check.py
```

不带参数时执行全部阻塞检查。需要缩小失败范围时使用：

```bash
uv run python scripts/check.py --python
uv run python scripts/check.py --frontend
uv run python scripts/check.py --e2e
```

`--all` 作为兼容参数保留，完整检查现已默认执行。多个分组参数可以组合。

### 测试分工

- `scripts/test_build_data.py`：市场复盘生成器的辅助函数、参数、输出结构和文件写入
- `scripts/test_validate_data.py`：静态股票数据的结构、资金计算、路径检查和 JavaScript 数据包
- `scripts/test_docs_style.py`：说明文档的中文标点和常见表达约定
- `scripts/validate_text_quality.py`：说明文档、JSON 与 TypeScript 台词的标点、括号和多人拼接检查
- `scripts/test_validate_text_quality.py`：文本提取与质量规则的低误报回归
- `scripts/test_check.py`：本地质量入口、固定浏览器依赖和仅用于 Pages 发布的工作流契约
- `src/game/content/content.test.ts`：三份版本化年份内容的校验和加载器
- `src/game/communityContent.test.ts`：社区内容包资源、格式和唯一性边界
- `src/game/runtime.test.ts`：状态初始化、节点推进和跨月流程
- `src/game/engine.test.ts`：评分、关系、旗标、条件分支、延迟后果和结局
- `src/components/DebatePanel.test.tsx`：三方观点数据、独立角色卡和档案回看
- `src/components/RebirthPanel.test.tsx`：研究室概览、物件数量和视觉形状
- `src/app/ImmersiveGameScreen.test.tsx`：主舞台不叠加研究室物件
- `src/data/gameData.test.ts`：2025 正式入口、往年档案和隐藏示范线路
- `scripts/e2e/platform.spec.js`：关键浏览器旅程、焦点恢复、错误边界和自动无障碍检查
- `scripts/validate_frontend.js`：入口、依赖、主要模块、资源和数据文件的静态检查
- `scripts/validate_stability.js`：稳定性文件和自动化契约检查

Vitest 通过 `vitest.config.ts` 排除 `scripts/e2e/`，避免与 Playwright 重复收集测试。

## 本地质量与发布

代码质量和浏览器回归只在本地运行。`.github/workflows/pages.yml` 不响应拉取请求，只在 `main` 更新或手动触发时发布。

Pages 任务执行：

1. 安装 Node.js 22 和锁定依赖。
2. 运行 `npm run build:pages`，只执行 Vite 打包。
3. 上传 `dist/` Pages 产物。
4. 部署 GitHub Pages。

Actions 不运行 TypeScript 检查、lint、单元测试、Python 检查、契约校验、包体预算或 Playwright。维护者应在推送前运行 `npm run check`。本地 Playwright 失败诊断写入 `test-results/`。

发布后检查：

- 首页可以打开
- `dist/assets/` 资源请求成功
- 2025 主入口可以打开，2023 和 2024 深链也能分别进入往年内容
- 主菜单可以进入两种年度剧情体验、投委会、每日挑战和内容工坊
- 浅色和暗色主题可以切换
- WebGL 不可用时能看到静态舞台
- 完成一次研究选择后可以继续剧情
- 档案抽屉可以通过键盘关闭并恢复焦点

线上地址：

<https://runchengxie.github.io/rebirth-research/>

## 离线分享包

在 PowerShell 中运行：

```powershell
.\scripts\package.ps1
```

脚本会先构建项目，再把 `index.html`、`assets/` 和 README 打包到：

```text
dist/rebirth-research-share.zip
```

解压后直接打开 `index.html`。由于 Vite 的 `base` 为 `./`，静态资源可以使用相对路径加载。GitHub Gist 云同步在离线状态下不可用，其余核心模式可以离线运行。

## 文档维护

文档只描述当前实现。以下变化发生后需要同步更新说明：

- 年份、章节数、角色或结局条件变化
- 新增或移除 URL 参数和平台模式
- 运行时开始读取真实市场数据
- 存档或云同步方式变化
- 社区内容包格式和资源限制变化
- 音频方式变化
- 数据格式或生成命令变化
- 测试命令和工作流状态变化
- 目录结构或关键模块变化

中文说明尽量使用自然、直接的表达。命令、路径和字段名保留行内代码。减少英文小标题、粗体、中文双引号、分号、长破折号和成对否定转折句。
