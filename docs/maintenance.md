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

1. 先确认改动属于界面、运行时、结算引擎、剧情内容还是独立数据工具。
2. 修改源码或数据后，补充对应测试。
3. 运行前端检查和 Python 检查。
4. 核对 README、`AGENTS.md` 和相关设计文档是否仍然准确。
5. 需要离线分享包时运行 `scripts/package.ps1`。
6. 推送到 `main` 后确认 GitHub Pages 构建和线上页面。

## 剧情内容维护

正式年份内容位于：

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

2025 年的 `knownEvent`、`businessOutcome` 和 `competingHypotheses` 目前在 `src/game/content2025.ts` 中补充。修改 2025 年主题时，需要同时检查该文件中的月份顺序。

## 角色与分支维护

角色资料位于 `src/game/characters.ts`，角色语言规范见 `docs/CHARACTERS.md`。

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

正式年份列表由 `GAME_YEARS` 控制。`demo` 保留在 `GAME_DATA` 中，只供 `?year=demo` 深链访问。修改年份时同步更新 `src/data/gameData.test.ts`。

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

### 前端检查

```bash
npm run check
```

该命令包含：

- `npm run lint:ci`
- `npm run typecheck`
- `npm run test:run`
- `npm run validate:frontend`
- `npm run build`

### 联合检查

```bash
uv run python scripts/check.py
```

默认执行全部阻塞检查，其中包含 Ruff、格式化、编译、BasedPyright、ty、Pytest、静态数据校验和前端完整检查。可用参数：

```bash
uv run python scripts/check.py --python
uv run python scripts/check.py --frontend
```

`--all` 作为兼容参数保留，完整检查现已默认执行。

### 测试分工

- `scripts/test_build_data.py`：市场复盘生成器的辅助函数、参数、输出结构和文件写入
- `scripts/test_validate_data.py`：静态股票数据的结构、资金计算、路径检查和 JavaScript 数据包
- `scripts/test_docs_style.py`：说明文档的中文标点和常见表达约定
- `src/game/content/content.test.ts`：三个正式年份的内容校验和加载器
- `src/game/runtime.test.ts`：状态初始化、节点推进和跨月流程
- `src/game/engine.test.ts`：评分、关系、旗标、条件分支、延迟后果和结局
- `src/data/gameData.test.ts`：正式年份和隐藏示范线路
- `scripts/validate_frontend.js`：入口、依赖、主要模块、资源和数据文件的静态检查

## 自动化与发布

`.github/workflows/ci.yml` 会在拉取请求和 `main` 分支推送时执行全部阻塞检查：

1. 使用锁文件安装 Node.js 和 Python 依赖。
2. 运行 Ruff、格式化和 Python 编译检查。
3. 运行 BasedPyright、ty、Pytest 和静态数据校验。
4. 运行前端结构校验、零警告 ESLint、TypeScript、Vitest 和生产构建。
5. 检查失败时上传诊断日志。

`.github/workflows/pages.yml` 在 `main` 分支有新提交时执行：

1. 安装 Node.js 22。
2. 运行 `npm ci`。
3. 运行 `npm run check`。
4. 上传并发布 `dist/`。

发布后检查：

- 首页可以打开
- `dist/assets/` 资源请求成功
- 2023、2024、2025 年份可以切换
- 浅色和暗色主题可以切换
- WebGL 不可用时能看到静态舞台
- 完成一次研究选择后可以继续剧情

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

解压后直接打开 `index.html`。由于 Vite 的 `base` 为 `./`，静态资源可以使用相对路径加载。

## 文档维护

文档只描述当前实现。以下变化发生后需要同步更新说明：

- 年份、章节数、角色或结局条件变化
- 新增或移除 URL 参数
- 运行时开始读取真实市场数据
- 存档方式变化
- 音频方式变化
- 数据格式或生成命令变化
- 测试命令和工作流状态变化
- 目录结构或关键模块变化

中文说明尽量使用自然、直接的表达。命令、路径和字段名保留行内代码。减少英文小标题、粗体、中文双引号、分号、长破折号和成对否定转折句。
