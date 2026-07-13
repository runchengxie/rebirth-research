# 架构说明

本文档说明项目当前的模块边界、状态流转、数据关系和部署方式。历史调整从提交记录查看，这里只保留维护代码时需要知道的现状。

## 总体结构

项目是纯前端静态应用。React 负责页面和交互，PixiJS 负责剧情舞台，`src/game/` 负责剧情装配、状态推进和数值结算。

```text
浏览器
  │
  ├── React 单视口页面
  │     ├── 设置、年份选择和流程控制
  │     ├── 对白、观点卡、日程和研究方案
  │     └── 记录抽屉、知识卡和结局
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
        └── 按年份保存完整 GameState
```

构建产物位于 `dist/`，可以部署到 GitHub Pages，也可以通过离线分享包直接打开。

## 前端入口

`src/main.tsx` 创建 React 根节点，依次加载基础样式和单视口覆盖样式。

前端入口分为四层：

- `src/App.tsx`：顶层组合，负责默认游戏和 Pixi'VN 原型入口切换
- `src/app/useGameController.ts`：年份深链、存档恢复、场景推进、决策结算、设置、主题和音频控制
- `src/app/ImmersiveGameScreen.tsx`：单视口舞台、对白、观点卡、研究选择和档案抽屉
- `src/immersive.css`：主流程布局和响应式约束

`src/app/GameScreen.tsx` 是旧版长页面装配，当前没有从默认入口挂载，暂时保留用于对照。

应用没有路由库。年份和原型入口通过 URL 查询参数控制。

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

2023、2024、2025 的正式 JSON 都直接保存 `knownEvent`、`businessOutcome` 和 `competingHypotheses`。三个年份加载器只负责校验、循环索引和兼容性语义补全，页面直接从 `MarketTheme.competingHypotheses` 生成三张观点卡。


### 内容语义与年份叙事包

研究方案把旧版 `category`、实际研究方法、执行质量和业务结果方向分开记录。评分、知识卡和新路线统计读取方法与质量字段，避免错误选项借用正面方法类别获得奖励。

三个正式年份共享渲染器，但使用不同的叙事节拍：2023 从市场现场切入，2024 从证据整理切入，2025 从未来记忆与观点交锋切入。正式内容的事实与假设全部来自版本化 JSON；补全函数只保留给旧内容和运行时兼容。

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

- `createInitialState`：创建新周目状态
- `sceneForMonth`：根据当前状态生成场景
- `currentSceneNode`：取得当前节点
- `canAdvanceScene`：判断能否继续
- `advanceScene`：推进节点或进入下一话
- `canRewindScene`：判断能否回看上一段对白
- `rewindScene`：在结算前把游标后退一个节点
- `nextMonth`：清理本月锁定状态并进入下一月

运行时只管理流程，不计算评分和关系变化。回看在 `locked` 为 `true` 时禁用，避免撤销已经写入的结算结果。

### 状态持久化

`src/app/useGameController.ts` 以 `rebirthGameState:v2:<year>` 为键保存完整 `GameState`，并兼容读取 v1 存档。

读取存档时会先创建当前版本的初始状态，再合并可用字段。关系、旗标、类别计数、知识卡和研究室状态分别处理，旧存档缺少字段时使用当前默认值。年份、月份和剧情位置不合法时放弃该存档。剧情位置以稳定节点 id 为主，数字索引只作为旧存档迁移和运行时缓存。

每次状态变化都会写回当前年份。切换年份时优先恢复该年份存档，重新开始则创建当前年份的新状态并覆盖旧存档。

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

### 条件分支

`src/game/branching.ts` 负责判断分支条件。`src/game/branches.ts` 定义分支内容。

条件可以读取指标上下限、角色关系、决策类别累计次数、月份、旗标，以及与、或、非组合条件。命中的分支可以插入对白、追加研究方案、改写提示语并记录路线旗标。

## 数据关系

项目里有四类数据，文件名相近但用途不同。

| 数据 | 位置 | 当前用途 | 校验方式 |
|---|---|---|---|
| 年份剧情内容 | `src/game/content/*.json` | 前端实际使用 | `schema.ts` 和 Vitest |
| 运行时年份数据 | `src/data/gameData.ts` | 装配场景和叙事快照 | TypeScript 和 Vitest |
| 静态股票选项数据 | `data/` | 独立数据包，当前不接入 React | `validate_data.py` |
| 市场复盘生成结果 | `market-review-*.json` | 独立研究工具输出，当前不接入 React | `test_build_data.py` |

`src/data/gameData.ts` 为每个正式年份和 `demo` 创建 12 个月场景。当前市场快照由剧情主题派生，收益字段为 0，行业和风格数据为空。

`data/YYYY.json`、`data/game-data.js` 和 `data/manifest.json` 当前只由校验脚本和前端结构检查读取。

`scripts/build_data.py` 读取本地 Parquet 数据并输出月度代理指数、行业轮动和风格因子。维护时建议通过 `--out-dir generated/market-review` 使用单独目录。

## 舞台与资源

`src/components/PixiStage.tsx` 统一加载背景和四位角色的透明立绘。角色资源使用 WebP，舞台负责姿势映射、缩放、底部锚点、色调和阴影。系统要求减少动态效果时，舞台不创建漂浮星点。`src/app/useGameController.ts` 会先检测 WebGL，失败时页面使用同一批 WebP 资源组成静态舞台。

`scripts/validate_frontend.js` 对发布位图执行 500 KiB 单文件预算检查。`vite.config.ts` 把 Pixi'VN 原型间接使用的 Tone.js 拆成独立异步块，避免单个 JavaScript 产物超过 Vite 的默认提醒阈值。

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

- `src/game/content/content.test.ts`：年份 JSON 和加载器
- `src/game/runtime.test.ts`：剧情游标、回看和跨月流程
- `src/game/engine.test.ts`：评分、状态变化、关系、旗标、分支和结局
- `src/data/gameData.test.ts`：正式年份和 `demo` 深链约束
- `scripts/test_build_data.py`：市场复盘生成器
- `scripts/test_validate_data.py`：静态股票选项数据
- `scripts/test_docs_style.py`：说明文档风格
- `scripts/validate_frontend.js`：入口、依赖、关键文件、资源和静态数据

`npm run check` 负责前端检查。`uv run python scripts/check.py` 负责 Python 与前端联合检查。

## 构建与部署

`vite.config.ts` 将 `base` 设置为 `./`，构建产物可以从相对路径加载资源。

仓库当前没有拉取请求代码检查工作流。维护者需要在提交前本地运行 `npm run check` 和 `uv run python scripts/check.py`。`scripts/check.py` 中的 BasedPyright 和 ty 当前作为非阻塞诊断。

`.github/workflows/pages.yml` 在 `main` 分支有新提交时运行 `npm ci` 和 `npm run check`，通过 lint、类型检查、测试、资源预算校验和生产构建后发布 `dist/`。

## 常见改动位置

| 目标 | 文件 |
|---|---|
| 调整角色设定和关系门槛 | `src/game/characters.ts` |
| 调整公共故事线和年份轮换文案 | `src/game/storyArcs.ts` |
| 新增条件分支 | `src/game/branches.ts` |
| 调整场景顺序和研究方案路由 | `src/game/sceneBuilders.ts` |
| 修改年份主题和研究方案 | `src/game/content/*.json` |
| 修改 2025 年业务事实和分歧假设 | `src/game/content2025.ts` |
| 修改评分和状态结算 | `src/game/engine.ts` |
| 修改剧情推进和回看 | `src/game/runtime.ts` |
| 修改状态持久化和控制器 | `src/app/useGameController.ts` |
| 修改主页面展示 | `src/app/ImmersiveGameScreen.tsx` |
| 修改单视口布局 | `src/immersive.css` |
| 修改角色立绘和姿势映射 | `src/components/PixiStage.tsx` |
| 修改顶层入口和原型切换 | `src/App.tsx` |
