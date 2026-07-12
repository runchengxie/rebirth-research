# 心动 K 线：重生投研部

一个以投研部日常为背景的中文剧情网页游戏。玩家扮演带着未来记忆回到入职初期的顾行之，在公开信息、研究方法、团队协作和个人状态之间做选择。项目使用 Vite、TypeScript、React 和 PixiJS，构建后是可以直接部署的静态网页。

在线试玩：<https://runchengxie.github.io/rebirth-research/>

## 当前状态

- 正式内容包含 2023、2024、2025 三条年份线，每条年份线有 12 话。
- `?year=demo` 可以打开保留的示范章节，年份选择器不会显示这条线路。
- 每话先推进剧情，再选择当月日程和研究方案。选择会影响研究可信度、投委会采纳度、推荐跟踪净值、观点准确度、客户反馈、团队信任、疲劳、生活平衡和角色关系。
- 月度结算采用多维评分和预先编写的业务事实。当前运行时没有接入真实月度涨跌幅，股价也不会直接判定研究结论对错。
- 三位导师分别代表基本面、量化信号和宏观风控方法。赵承宇是量化组同级同事，走友情与搭档路线。
- 剧情分支会读取关系值、累计选择、评分结果和事件旗标，影响后续节点与年度结局。
- 游戏会记录本周目的月度研究札记、知识卡和研究室变化。当前没有跨刷新保存的游戏存档，只有主题设置会保存在浏览器本地。
- 支持浅色和暗色主题。
- PixiJS 负责场景背景和角色立绘。设备无法稳定使用 WebGL 时，会自动回退到静态舞台。
- 背景音乐和提示音由浏览器音频接口生成。开启音效后，关键对白会尝试调用系统提供的中文语音朗读。
- `?pixivn=1` 可以打开基于 `@drincs/pixi-vn` 的第一话原型。该原型通过动态加载与默认流程隔离。
- 可以生成离线分享包，解压后打开 `index.html` 即可游玩。

## 玩法概览

每话包含以下环节：

1. 推进人物对白和当月市场背景。
2. 在 `深度研报`、`团队协作`、`生活优先` 三种日程中选择一种。
3. 从当月研究方案中选择一项。多数月份提供 5 至 6 个方案，条件分支还可能追加选项。
4. 查看月度评分、业务事实结算、角色反馈和新获得的知识卡。
5. 进入下一话，并让此前的关系、状态和事件旗标继续影响剧情。

年度结束时，系统会根据研究表现、生活状态、团队信任、角色关系和路线旗标给出结局。赵承宇的最佳搭档结局与三位导师的关系结局分开计算。

## 内容与数据

仓库里有几类名称相近的数据。它们目前各自独立，维护时需要先确认用途。

### 运行时剧情内容

前端实际读取以下文件：

- `src/game/content/2023.json`
- `src/game/content/2024.json`
- `src/game/content/2025.json`

这些文件包含每年的市场主题和研究方案。`src/game/content/schema.ts` 会在加载时校验字段结构、月份数量、方案类别和重复编号。2025 年的业务事实与分歧假设还会在 `src/game/content2025.ts` 中补充。

`npm run dump:2023` 和 `npm run dump:2024` 会重新整理对应年份的 JSON。当前 TypeScript 加载器已经直接读取这些 JSON，因此这两个命令主要用于规范化和核对内容，不应当被视为另一份独立内容源。

### 运行时市场快照

`src/data/gameData.ts` 根据剧情场景生成运行时数据。当前快照只提供当月公开背景，`themeReturn` 固定为 0，行业轮动和风格因子为空。游戏结算使用研究方案的效果值和编写好的业务事实。

### `data/` 静态数据

`data/2023.json`、`data/2024.json`、`data/2025.json`、`data/game-data.js` 和 `data/manifest.json` 是一套独立静态数据。每个月包含四个股票选项、一个最佳选项和理论资金曲线。`scripts/validate_data.py` 负责检查这组文件的结构、年份清单、最佳选项、资金计算和本机路径泄漏。

这组数据当前没有接入 React 运行时。`scripts/validate_frontend.js` 仍会读取 `data/game-data.js`，用于确认静态数据可以正常解析。

### 市场复盘生成器

`scripts/build_data.py` 从本地 A 股清洗数据生成另一种市场复盘文件，内容包括：

- 按月成交额排名构造的沪深 300 代理收益
- 按月成交额排名构造的中证 500 代理收益
- 行业月度成交额加权收益
- 规模与动量风格因子近似值

生成文件名为：

- `market-review-2023.json`
- `market-review-2024.json`
- `market-review-2025.json`
- `market-review-manifest.json`

这组文件使用 `benchmarks` 字段，与 `data/YYYY.json` 的股票选项格式不同，`scripts/validate_data.py` 不会校验它们。为了避免把两套输出放在同一目录，建议指定单独的输出目录：

```bash
uv run python scripts/build_data.py \
  --years 2023 2024 2025 \
  --daily-clean-dir /path/to/a_share_daily_clean \
  --instruments /path/to/a_share_instruments_latest.parquet \
  --out-dir generated/market-review \
  --price-column adj_close
```

也可以通过环境变量提供本地数据路径：

```bash
export REBIRTH_DAILY_CLEAN_DIR=/path/to/a_share_daily_clean
export REBIRTH_INSTRUMENTS_FILE=/path/to/a_share_instruments_latest.parquet
uv run python scripts/build_data.py --out-dir generated/market-review
```

`--seed` 目前只作为兼容参数保留，不参与计算。

## 项目结构

```text
rebirth-research/
├── assets/
│   ├── galgame-key-art.png
│   └── vn/
│       ├── backgrounds/
│       └── characters/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   ├── types.ts
│   ├── audio/
│   ├── components/
│   ├── data/
│   │   ├── gameData.ts
│   │   └── gameData.test.ts
│   ├── game/
│   │   ├── branching.ts
│   │   ├── branches.ts
│   │   ├── characters.ts
│   │   ├── content.ts
│   │   ├── content2023.ts
│   │   ├── content2024.ts
│   │   ├── content2025.ts
│   │   ├── contentDemo.ts
│   │   ├── decisionFactory.ts
│   │   ├── engine.ts
│   │   ├── engine.test.ts
│   │   ├── runtime.ts
│   │   ├── runtime.test.ts
│   │   ├── sceneBuilders.ts
│   │   ├── storyArcs.ts
│   │   └── content/
│   └── spike/
│       └── pixivn/
├── data/
│   ├── 2023.json
│   ├── 2024.json
│   ├── 2025.json
│   ├── game-data.js
│   └── manifest.json
├── scripts/
│   ├── build_data.py
│   ├── check.py
│   ├── package.ps1
│   ├── test_build_data.py
│   ├── test_docs_style.py
│   ├── test_validate_data.py
│   ├── validate_data.py
│   ├── validate_frontend.js
│   └── content-dumps/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CHARACTERS.md
│   └── maintenance.md
├── .github/workflows/
│   ├── ci.yml.disabled
│   └── pages.yml
├── AGENTS.md
├── package.json
├── pyproject.toml
└── vite.config.ts
```

## 开发环境

前端建议使用 Node.js 22，与 GitHub Pages 工作流保持一致。Python 工具需要 Python 3.11 或更高版本，并通过 `uv` 管理依赖。

安装前端依赖：

```bash
npm ci
```

安装 Python 开发依赖：

```bash
uv sync --only-dev
```

启动开发服务器：

```bash
npm run dev
```

生产构建：

```bash
npm run build
```

本地预览构建产物：

```bash
npm run preview
```

## 测试与检查

前端完整检查：

```bash
npm run check
```

该命令依次运行 ESLint、TypeScript 类型检查、Vitest、前端结构校验和生产构建。

Python 与前端联合检查：

```bash
uv run python scripts/check.py
```

只检查一侧：

```bash
uv run python scripts/check.py --python
uv run python scripts/check.py --frontend
```

加入非阻塞类型检查：

```bash
uv run python scripts/check.py --all
```

常用单项命令：

```bash
uv run ruff check .
uv run ruff format --check .
uv run python -m compileall scripts
uv run pytest scripts/ -v
uv run python scripts/validate_data.py
node scripts/validate_frontend.js
npm run lint
npm run typecheck
npm run test:run
npm run build
```

测试覆盖以下范围：

- Python 数据辅助函数、参数解析、市场复盘输出和静态数据校验
- 年份内容结构与加载器
- 游戏状态初始化和剧情推进
- 评分、关系、条件分支、延迟后果和结局判定
- 正式年份与隐藏示范线路的约束
- 说明文档的中文标点和常见表达约定
- Vite 入口、依赖、主要源码、图片资源和静态数据结构

## 自动化状态

`.github/workflows/pages.yml` 会在 `main` 分支有新提交时使用 Node.js 22 构建并发布 `dist/`。

质量检查工作流当前保存在 `.github/workflows/ci.yml.disabled`，GitHub Actions 不会自动运行它。提交前需要在本地运行 `npm run check` 和 `uv run python scripts/check.py`。恢复自动质量检查时，应先将该文件改回 `.github/workflows/ci.yml`，再核对其中的命令是否与本节一致。

## 离线分享包

在 PowerShell 中运行：

```powershell
.\scripts\package.ps1
```

脚本会先执行 `npm run build`，再生成：

```text
dist/rebirth-research-share.zip
```

压缩包包含构建后的 `index.html`、`assets/` 和 README。解压后可以直接打开 `index.html`。

## 维护文档

- `AGENTS.md`：给维护者和自动化助手的操作约定
- `docs/maintenance.md`：日常开发、数据更新、测试和发布流程
- `docs/ARCHITECTURE.md`：模块边界、状态流转和数据关系
- `docs/CHARACTERS.md`：角色定位、语言特点和写作边界

## 说明

本项目用于剧情体验和研究方法复盘，不提供投资建议。静态数据、市场主题和业务事实只服务于游戏叙事，不能作为交易依据。
