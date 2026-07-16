# 架构说明

本文档说明项目当前的模块边界、状态流转、数据关系和部署方式。历史调整从提交记录查看，这里只保留维护代码时需要知道的现状。

## 总体结构

项目是纯前端静态应用。React 负责页面和交互，PixiJS 负责剧情舞台，`src/game/` 负责剧情装配、状态推进和数值结算。

```text
浏览器
  │
  ├── React 应用外壳
  │     ├── 主菜单、继续游戏和新游戏体验选择
  │     ├── 年度剧情单视口页面
  │     ├── 投委会、每日挑战和内容工坊
  │     └── 返回主菜单、跳过导航和错误恢复
  │
  ├── 舞台层
  │     ├── PixiJS 统一角色舞台
  │     └── WebGL 失败时的静态回退
  │
  ├── 游戏层
  │     ├── 内容数据
  │     ├── 场景装配
  │     ├── 剧情运行时
  │     ├── 结算引擎
  │     └── 条件分支
  │
  └── 浏览器本地存储
        ├── 按年份保存完整 GameState
        ├── 按年份保存 RebirthMetaState 与时间线
        ├── 保存投委会、每日挑战和社区案例记录
        └── 保存原子会话存档
```

构建产物位于 `dist/`，可以部署到 GitHub Pages，也可以通过离线分享包直接打开。

## 前端入口

`src/main.tsx` 创建 React 根节点，依次加载基础样式和单视口覆盖样式。

前端入口分为以下几层：

- `src/App.tsx`：顶层组合，负责主菜单、目标路由、懒加载和 Pixi'VN 原型入口切换
- `src/components/StartMenu.tsx`：继续游戏、新游戏体验、挑战中心和内容工坊入口
- `assets/key-art.webp` 与 `src/start-menu.css`：主菜单封面和响应式布局
- `src/game/platformModes.ts`：查询参数解析、兼容深链和主菜单 URL 生成
- `src/app/useGameSessionMachine.ts`：年份深链、存档恢复、场景推进和原子状态行动
- `src/app/useGameController.ts`：主题、音频、设置菜单和舞台能力检测
- `src/app/ImmersiveGameScreen.tsx`：单视口舞台、对白、观点卡和研究选择，按需加载档案抽屉
- `src/components/DebatePanel.tsx`：把三方假设分别渲染为角色观点卡
- `src/components/ArchiveDrawer.tsx`：记录、研究档案、研究室和异步回溯入口
- `src/components/RebirthPanel.tsx`：研究室物件概览、整理操作和跨周目档案
- `src/components/RebirthTimelinePanel.tsx`：树状时间线、关键月详情和反事实推演
- `src/immersive.css`：主流程布局和响应式约束

`src/app/GameScreen.tsx` 是旧版长页面装配，当前没有从默认入口挂载，暂时保留用于对照。

应用没有路由库。无查询参数时显示主菜单，`mode` 选择年度剧情或独立平台模式，`play` 选择新存档的年度剧情体验，`new=1` 要求创建新游戏。`year`、`pixivn`、`pixi` 和 `staticStage` 作为兼容深链继续直接进入年度剧情。

`PlatformMode` 描述页面目标，包含 `story`、`committee`、`daily` 和 `studio`。`ExperienceMode` 描述年度剧情内部的规则策略，包含 `romance` 和 `career`。两种类型分开，避免把主菜单信息架构与结算规则耦合。

## 游戏模块

### 类型定义

`src/types.ts` 是跨模块类型的统一来源。角色编号、游戏状态、场景节点、研究方案、评分、分支条件和年份数据都在这里定义。

新增角色或字段时，先改类型，再检查初始状态、内容校验、资源映射和测试。

### 内容模块

`src/game/content.ts` 重新导出以下模块：

- `characters.ts`：角色资料、关系门槛、日程和评分评语
- `storyArcs.ts`：公共故事线、年份主题入口和轮换文案
- `branches.ts`：条件分支和赵承宇搭档线
- `sceneBuilders.ts`：场景装配、知识卡和年份研究方案路由

年份内容位于 `src/game/content/*.json`。加载器分布在 `content2023.ts`、`content2024.ts` 和 `content2025.ts`。`contentDemo.ts` 保留示范章节。

`src/game/content/schema.ts` 强制校验 `contentVersion: 2`、12 个月度主题、12 组研究方案、完整业务事实、三方假设、研究方法、执行质量、结果方向、效果字段、角色编号和重复编号。

2023、2024、2025 的三份版本化 JSON 都直接保存 `knownEvent`、`businessOutcome` 和 `competingHypotheses`。三个年份加载器只负责校验、循环索引和兼容性语义补全，页面直接从 `MarketTheme.competingHypotheses` 生成三张观点卡。


### 内容语义与年份叙事包

研究方案把旧版 `category`、实际研究方法、执行质量和业务结果方向分开记录。评分、知识卡和新路线统计读取方法与质量字段，避免错误选项借用正面方法类别获得奖励。

三份年份内容共享渲染器，但使用不同的叙事节拍：2023 从市场现场切入，2024 从证据整理切入，2025 从未来记忆与观点交锋切入。当前正式入口只展示 2025，2023 和 2024 作为往年档案保留。事实与假设来自版本化 JSON，2025 还会叠加 `verified2025.ts` 中经过核对的月度事件锚点。补全函数只服务旧内容和运行时兼容。

### 场景装配

`src/game/sceneBuilders.ts` 根据年份、月份和当前状态生成 `MonthScene`。

场景通常包含：

1. 未来记忆节点。
2. 三种研究假设节点。
3. 条件分支注入的额外对白。
4. 关系门槛触发的桥段。
5. 当月同事对白。
6. 研究方案节点。

调用方没有提供状态时，场景仍然可以静态生成。测试和运行时都会依赖这个能力。

### 剧情运行时

`src/game/runtime.ts` 负责：

- `createInitialState`：按年份和体验模式创建新周目状态
- `sceneForMonth`：根据当前状态生成场景
- `currentSceneNode`：取得当前节点
- `canAdvanceScene`：判断能否继续
- `advanceScene`：推进节点或进入下一话
- `canRewindScene`：判断能否回看上一段对白
- `rewindScene`：在结算前把游标后退一个节点
- `nextMonth`：清理本月锁定状态并进入下一月

运行时只管理流程，不计算评分和关系变化。回看在 `locked` 为 `true` 时禁用，避免撤销已经写入的结算结果。

### 体验模式策略

`src/game/experienceMode.ts` 把年度剧情体验转换成显式策略。React 页面只根据策略决定是否显示职业指标、调查、研究线索、研究承诺和日程。结算前由 `sessionMachine.ts` 统一调用体验适配器，防止隐藏一组表单后仍把未填写状态当成失败。

剧情模式使用系统生成的稳健研究承诺和中性日程，并把隐藏的疲劳增量限制在不增加、生活平衡变化限制在不降低。职业模式使用玩家提交的置信度、失效条件和自检状态。两种体验最后都进入同一个 `engine.ts`，关系旗标和内容分支不需要复制。

### 状态持久化

`src/app/useGameSessionMachine.ts` 通过 `saveState.ts` 以 `rebirthGameState:v2:<year>` 为键保存完整 `GameState`，并兼容读取 v1 存档。

读取存档时会先创建当前版本的初始状态，再合并可用字段。关系、旗标、类别计数、知识卡和研究室状态分别处理，旧存档缺少字段时使用当前默认值。年份、月份和剧情位置不合法时放弃该存档。剧情位置以稳定节点 id 为主，数字索引只作为旧存档迁移和运行时缓存。

每次状态变化都会写回当前年份，并与跨周目状态一起写入原子会话存档。切换年份时优先恢复该年份存档，重新开始则保留当前体验模式并创建当前年份的新状态。

设置菜单可以把单周目状态、跨周目状态和原子会话存档打包为 JSON 或分享码。可选云同步由 `src/game/cloudSync.ts` 在浏览器内加密，再调用玩家自己的私密 GitHub Gist。项目没有自建账号或存档服务器，访问令牌与同步口令不写入持久化存储。

### 跨周目状态与时间线

`src/game/rebirth.ts` 以 `rebirthMeta:v4:<year>` 为键保存体验模式、周目编号、记忆钥匙、研究捷径、调查进度、已读节点、系统异常、研究室发现和时间线。读取时依次兼容 v3、v2 与 v1。v3 缺少体验模式时迁移为职业模式，旧存档不会伪造缺失的历史锚点，会从恢复后的当前进度开始记录。

关键月份调查数据位于 `rebirthInvestigationData.ts`，调查解锁方案位于 `rebirthSpecialDecisions.ts`，线索评分规则位于 `rebirthDecisionBonus.ts`。已读跳过由 `rebirthFlow.ts` 负责，研究室物件由 `rebirthOffice.ts` 负责。

时间线模块分为三层：

- `rebirthTimelineState.ts` 定义快照、分支、事件、推演和恢复规则。
- `rebirthTimeline.ts` 负责锚点捕获、事件写入、分叉、暂停、恢复和周目衔接。
- `rebirthTimelineInsights.ts` 负责流程视图、因果注释和反事实推演。

关键月月初保存 `GameState`、调查进度和当时可用的跨周目信息。分支头保存该路线最近状态。原路线完成后仍保留，分叉只创建新的活跃路线。

单周目 `GameState` 和跨周目 `RebirthMetaState` 分别持久化。重新开始会暂停当前路线并创建新路线。完成年度结局会封存当前路线并创建下一周目路线。

### 构建拆包

`vite.config.ts` 把 React 运行库拆成稳定的 `react-vendor` 缓存块。档案抽屉通过动态导入加载，因果回溯面板在抽屉内再次动态导入。`src/timeline.css` 由回溯组件导入，因此不会进入首屏 CSS。

`scripts/validate_bundle_size.mjs` 在生产构建后检查：单个 JavaScript 代码块不超过 500000 字节，首屏入口不超过 150000 字节，档案和回溯异步面板各不超过 25000 字节，时间线异步样式不超过 20000 字节。

### 结算引擎

`src/game/engine.ts` 负责研究选择后的状态变化，包括：

- 研究可信度、投委会采纳度、推荐跟踪净值和观点准确度
- 客户反馈、团队信任、疲劳和生活平衡
- 角色关系
- 决策类别累计
- 关系门槛和路线旗标
- 知识卡收集
- 月度评分和业务事实结算
- 导师关系路线和赵承宇最佳搭档结局判定

评分由证据、清晰度、风险意识、沟通、生活平衡、推荐跟踪和反思加成组成。短期市场价格当前不参与判断。

`src/game/sessionMachine.ts` 在进入结算引擎前依次应用体验模式适配和跨周目调查加成。这样剧情模式的辅助承诺、职业模式的玩家承诺与重生调查都通过同一个原子行动写入状态和时间线。

### 条件分支

`src/game/branching.ts` 负责判断分支条件。`src/game/branches.ts` 定义分支内容。

条件可以读取指标上下限、角色关系、决策类别累计次数、月份、周目、记忆钥匙、旗标，以及与、或、非组合条件。命中的分支可以插入对白、追加研究方案、改写提示语并记录路线旗标。

## 数据关系

项目里有四类数据，文件名相近但用途不同。

| 数据 | 位置 | 当前用途 | 校验方式 |
|---|---|---|---|
| 年份剧情内容 | `src/game/content/*.json` | 前端实际使用 | `schema.ts` 和 Vitest |
| 运行时年份数据 | `src/data/gameData.ts` | 装配场景和叙事快照 | TypeScript 和 Vitest |
| 静态股票选项数据 | `data/` | 独立数据包，当前不接入 React | `validate_data.py` |
| 市场复盘生成结果 | `market-review-*.json` | 独立研究工具输出，当前不接入 React | `test_build_data.py` |

`src/data/gameData.ts` 为 2023、2024、2025 和 `demo` 创建 12 个月场景。`GAME_YEARS` 当前只包含 2025。2023、2024 和 `demo` 只能通过深链打开。当前市场快照由剧情主题派生，收益字段为 0，行业和风格数据为空。

`data/YYYY.json`、`data/game-data.js` 和 `data/manifest.json` 当前只由校验脚本和前端结构检查读取。

`scripts/build_data.py` 读取本地 Parquet 数据并输出月度代理指数、行业轮动和风格因子。维护时建议通过 `--out-dir generated/market-review` 使用单独目录。

## 舞台与资源

`src/components/PixiStage.tsx` 统一加载背景和四位角色的透明立绘。角色资源使用 WebP，舞台负责姿势映射、缩放、底部锚点、色调和阴影。系统要求减少动态效果时，舞台不创建漂浮星点。`src/app/useGameController.ts` 会先检测 WebGL，失败时页面使用同一批 WebP 资源组成静态舞台。

便签、白板、咖啡杯、档案柜和研究捷径板集中显示在档案抽屉的研究室标签中。主舞台不根据计数叠加办公室物件，避免人物背景与状态提示争夺视觉注意力。

`scripts/validate_frontend.js` 对发布位图执行 500 KiB 单文件预算检查。`vite.config.ts` 把 Pixi'VN 原型间接使用的 Tone.js 拆成独立异步块，避免单个 JavaScript 产物超过 Vite 的默认提醒阈值。

主菜单封面使用 `assets/key-art.webp`。`StartMenu` 在桌面端把文案与封面分栏，840px 以下改为上下排列。图片带固定宽高并优先加载，模式卡片继续使用实色背景。

可用查询参数：

- `?pixi=0`：强制使用静态舞台
- `?staticStage=1`：强制使用静态舞台
- `?pixi=1`：尝试启用 PixiJS 舞台

## 音频

`src/audio/bgm.ts` 使用 Web Audio API 生成循环和弦。

`src/audio/sfx.ts` 提供翻页、选择和结算提示音。对白节点带有录音地址时会播放录音。没有录音且节点标记为关键语音时，会尝试使用 Web Speech API 调用系统中文语音。

观点交锋节点由页面显示三张观点卡，控制器不会让当前角色朗读拼接后的三人对白。

## Pixi'VN 原型

`src/spike/pixivn/Chapter1Spike.tsx` 是第一话叙事运行时原型。

只有 URL 包含 `?pixivn=1` 时，`App.tsx` 才会动态加载该模块。默认游戏流程仍使用 `src/game/runtime.ts`。原型复用现有研究方案和结算引擎。

## 测试边界

- `src/game/platformModes.test.ts`：主菜单目标、兼容深链、新游戏 URL 和继续游戏体验恢复
- `src/game/experienceMode.test.ts`：体验策略、辅助承诺和隐藏职业效果
- `src/game/content/content.test.ts`：年份 JSON 和加载器
- `src/game/runtime.test.ts`：剧情游标、回看和跨月流程
- `src/game/engine.test.ts`：评分、状态变化、关系、旗标、分支和结局
- `src/components/DebatePanel.test.tsx`：三方观点数据、角色卡和档案回看
- `src/components/RebirthPanel.test.tsx`：研究室物件概览和视觉形状
- `src/app/ImmersiveGameScreen.test.tsx`：主舞台不叠加研究室物件
- `src/game/rebirthTimeline.test.ts`：锚点、事件、分叉、恢复、推演和迁移
- `src/game/rebirthTimelineGuards.test.ts`：内容版本与分支数量边界
- `src/data/gameData.test.ts`：2025 正式入口、往年档案和 `demo` 深链约束
- `scripts/test_build_data.py`：市场复盘生成器
- `scripts/test_validate_data.py`：静态股票选项数据
- `scripts/test_docs_style.py`：说明文档风格
- `scripts/validate_text_quality.py`：说明文档与游戏台词的机械文本检查
- `scripts/e2e/platform.spec.js`：主菜单、关键旅程、体验模式、焦点、深色对比度和 axe 检查
- `scripts/validate_frontend.js`：入口、依赖、关键文件、资源和静态数据

复杂度和可维护性由两套规则共同约束：

- Ruff C901 与 ESLint `complexity` 都把圈复杂度上限设为 15。
- `scripts/dev/maintainability_metrics.py` 统计 Python 长行、长函数、大文件和 C901 忽略项。
- `scripts/test_maintainability_metrics.py` 在本地 Pytest 中核对当前基线与棘轮预算，指标增加时阻止检查通过。

`npm run check` 与 `uv run python scripts/check.py` 指向同一套完整本地检查，覆盖 Python、前端静态检查、Vitest、生产构建、包体预算和 Chromium 回归。按范围排查时使用 `scripts/check.py --python`、`--frontend` 或 `--e2e`。

## 构建与部署

`vite.config.ts` 将 `base` 设置为 `./`，构建产物可以从相对路径加载资源。

仓库当前没有拉取请求代码检查工作流。维护者需要在提交前本地运行一次 `npm run check`。`uv run python scripts/check.py` 是同一入口的直接调用方式，ty 是其中的阻塞类型检查。

`.github/workflows/pages.yml` 只在 `main` 分支有新提交或手动触发时运行 `npm ci` 与 `npm run build:pages`，随后发布 `dist/`。`build:pages` 只执行 Vite 打包，GitHub Actions 不再运行 TypeScript、lint、Vitest、Python 或 Playwright。发布构建用于生成静态站点，不能替代本地完整检查。

## 常见改动位置

| 目标 | 文件 |
|---|---|
| 调整角色设定和关系门槛 | `src/game/characters.ts` |
| 调整公共故事线和年份轮换文案 | `src/game/storyArcs.ts` |
| 新增条件分支 | `src/game/branches.ts` |
| 调整场景顺序和研究方案路由 | `src/game/sceneBuilders.ts` |
| 修改年份主题和研究方案 | `src/game/content/*.json` |
| 修改 2025 年主题、业务事实和分歧假设 | `src/game/content/2025.json` |
| 修改 2025 年核验事件锚点 | `src/game/verified2025.ts` 和 `docs/2025-source-ledger.md` |
| 修改评分和状态结算 | `src/game/engine.ts` |
| 修改剧情推进和回看 | `src/game/runtime.ts` |
| 修改因果回溯、分叉和推演 | `src/game/rebirthTimeline*.ts` |
| 修改状态持久化和会话行动 | `src/app/useGameSessionMachine.ts`、`src/game/sessionMachine.ts` |
| 修改音频、主题和设置控制 | `src/app/useGameController.ts` |
| 修改体验模式策略 | `src/game/experienceMode.ts` |
| 修改主菜单和 URL 入口 | `src/components/StartMenu.tsx`、`src/game/platformModes.ts` |
| 修改主页面展示 | `src/app/ImmersiveGameScreen.tsx` |
| 修改三方观点卡 | `src/components/DebatePanel.tsx` |
| 修改研究室物件概览 | `src/components/RebirthPanel.tsx` 和 `src/components/ArchiveDrawer.tsx` |
| 修改单视口布局 | `src/immersive.css` |
| 修改角色立绘和姿势映射 | `src/components/PixiStage.tsx` |
| 修改顶层入口和原型切换 | `src/App.tsx` |
