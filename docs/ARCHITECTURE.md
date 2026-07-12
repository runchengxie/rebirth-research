# 架构说明

本文档说明项目当前的模块边界、状态流转、数据关系和部署方式。历史迁移过程可以从提交记录查看，这里只保留维护代码时需要知道的现状。

## 总体结构

项目是纯前端静态应用。React 负责页面和交互，PixiJS 负责剧情舞台，`src/game/` 负责剧情装配、状态推进和数值结算。

```text
浏览器
  │
  ├── React 页面和组件
  │     ├── 设置、年份选择和流程控制
  │     ├── 对话、研究方案、评分和结局
  │     └── 研究札记、知识卡和研究室状态
  │
  ├── PixiJS 舞台
  │     ├── 场景背景
  │     ├── 角色立绘
  │     └── WebGL 失败时的静态回退
  │
  └── 游戏层
        ├── 内容数据
        ├── 场景装配
        ├── 剧情运行时
        ├── 结算引擎
        └── 条件分支
```

构建产物位于 `dist/`，可以部署到 GitHub Pages，也可以通过离线分享包直接打开。

## 前端入口

`src/main.tsx` 创建 React 根节点并加载 `src/App.tsx`。

`src/App.tsx` 负责：

- 读取年份深链和主题设置
- 初始化当前周目状态
- 取得当前场景和当前节点
- 调用运行时推进剧情
- 调用结算引擎处理研究选择
- 控制 PixiJS 舞台、背景音乐、音效和系统语音
- 组合状态栏、研究方案、复盘、札记和结局组件

应用没有路由库。年份和原型入口通过 URL 查询参数控制。

## 游戏模块

### 类型定义

`src/types.ts` 是跨模块类型的统一来源。角色编号、游戏状态、场景节点、研究方案、评分、分支条件和年份数据都在这里定义。

新增角色或字段时，先改类型，再检查初始状态、内容校验、资源映射和测试。

### 内容模块

`src/game/content.ts` 只负责重新导出以下模块：

- `characters.ts`：角色资料、关系门槛、日程和评分评语
- `storyArcs.ts`：公共故事线、年份主题入口和轮换文案
- `branches.ts`：条件分支和赵承宇搭档线
- `sceneBuilders.ts`：场景装配、知识卡和年份研究方案路由

年份内容位于 `src/game/content/*.json`。加载器分布在 `content2023.ts`、`content2024.ts` 和 `content2025.ts`。`contentDemo.ts` 保留示范章节。

`src/game/content/schema.ts` 会校验：

- 年份字段
- 12 个月度主题
- 12 组研究方案
- 研究方案类别
- 效果字段和角色编号
- 重复的研究方案编号

2025 年加载器还会补充已知事件、业务事实和三位导师的分歧假设。

### 场景装配

`src/game/sceneBuilders.ts` 根据年份、月份和当前状态生成 `MonthScene`。

场景通常包含：

1. 当月主题和人物对白。
2. 未来记忆节点。
3. 条件分支注入的额外对白。
4. 研究方案节点。
5. 关系门槛和后续旗标触发的桥段。

调用方没有提供状态时，场景仍然可以静态生成。测试和运行时都会依赖这个能力。

### 剧情运行时

`src/game/runtime.ts` 负责：

- `createInitialState`：创建新周目状态
- `sceneForMonth`：根据当前状态生成场景
- `currentSceneNode`：取得当前节点
- `canAdvanceScene`：判断能否继续
- `advanceScene`：推进节点或进入下一话
- `nextMonth`：清理本月锁定状态并进入下一月

运行时只管理流程，不计算评分和关系变化。当前状态保存在 React 内存中，没有持久化存档。

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

评分由证据、清晰度、风险意识、沟通、生活平衡、推荐跟踪和反思加成组成。短期市场价格当前不参与判断，`makeDecision` 也没有读取传入年份数据中的真实涨跌幅。

### 条件分支

`src/game/branching.ts` 负责判断分支条件。`src/game/branches.ts` 定义分支内容。

条件可以读取：

- 指标上下限
- 角色关系
- 决策类别累计次数
- 月份
- 旗标
- 与、或、非组合条件

命中的分支可以插入对白、追加研究方案、改写提示语并记录路线旗标。

## 数据关系

项目里有四类数据，文件名相近但用途不同。

| 数据 | 位置 | 当前用途 | 校验方式 |
|---|---|---|---|
| 年份剧情内容 | `src/game/content/*.json` | 前端实际使用 | `schema.ts` 和 Vitest |
| 运行时年份数据 | `src/data/gameData.ts` | 装配场景和叙事快照 | TypeScript 和 Vitest |
| 静态股票选项数据 | `data/` | 独立数据包，当前不接入 React | `validate_data.py` |
| 市场复盘生成结果 | `market-review-*.json` | 独立研究工具输出，当前不接入 React | `test_build_data.py` 覆盖生成逻辑 |

### 年份剧情内容

这是运行时真正消费的数据。每年包含主题和研究方案，经过 TypeScript 加载器后进入场景装配层。

### 运行时年份数据

`src/data/gameData.ts` 为每个正式年份和 `demo` 创建 12 个月场景。当前市场快照由剧情主题派生，收益字段为 0，行业和风格数据为空。

### 静态股票选项数据

`data/YYYY.json` 每月包含四个股票选项和一个最佳选项。`data/game-data.js` 是同一数据的浏览器全局变量版本。`data/manifest.json` 记录年份和文件清单。

这些文件当前只由校验脚本和前端结构检查读取。

### 市场复盘生成结果

`scripts/build_data.py` 读取本地 Parquet 数据并输出月度代理指数、行业轮动和风格因子。输出使用 `benchmarks` 字段，文件名带 `market-review-` 前缀。

生成器默认输出到 `data/`，维护时建议通过 `--out-dir generated/market-review` 使用单独目录，以免和静态股票选项数据混放。

## 舞台与资源

`src/components/PixiStage.tsx` 使用 PixiJS 加载：

- `assets/vn/backgrounds/` 下的场景背景
- `assets/vn/characters/` 下的角色立绘

`App.tsx` 会先检测 WebGL。设备不支持 WebGL、驱动不稳定或初始化失败时，页面会使用静态舞台。

可用查询参数：

- `?pixi=0`：强制使用静态舞台
- `?staticStage=1`：强制使用静态舞台
- `?pixi=1`：尝试启用 PixiJS 舞台

## 音频

`src/audio/bgm.ts` 使用 Web Audio API 生成循环和弦。

`src/audio/sfx.ts` 提供翻页、选择和结算提示音。对白节点带有录音地址时会播放录音。没有录音且节点标记为关键语音时，会尝试使用 Web Speech API 调用系统中文语音。

语音效果依赖操作系统和浏览器提供的语音列表，项目本身不下载在线语音模型。

## Pixi'VN 原型

`src/spike/pixivn/Chapter1Spike.tsx` 是第一话叙事运行时原型。

只有 URL 包含 `?pixivn=1` 时，`App.tsx` 才会动态加载该模块。默认游戏流程仍使用 `src/game/runtime.ts`。原型复用现有研究方案和结算引擎。

该入口用于验证替换叙事运行时的可行性。修改原型时不能改变默认线路行为。

## 测试边界

- `src/game/content/content.test.ts`：年份 JSON 和加载器
- `src/game/runtime.test.ts`：剧情游标和跨月流程
- `src/game/engine.test.ts`：评分、状态变化、关系、旗标、分支和结局
- `src/data/gameData.test.ts`：正式年份和 `demo` 深链约束
- `scripts/test_build_data.py`：市场复盘生成器
- `scripts/test_validate_data.py`：静态股票选项数据
- `scripts/test_docs_style.py`：说明文档风格
- `scripts/validate_frontend.js`：入口、依赖、关键文件、资源和静态数据

`npm run check` 负责前端检查。`uv run python scripts/check.py` 负责 Python 与前端联合检查。

## 构建与部署

`vite.config.ts` 将 `base` 设置为 `./`，构建产物可以从相对路径加载资源。

`.github/workflows/pages.yml` 在 `main` 分支有新提交时运行 `npm ci` 和 `npm run build`，然后发布 `dist/`。

`.github/workflows/ci.yml.disabled` 保存了停用的质量检查流程。由于文件扩展名不是 `.yml`，GitHub Actions 不会执行它。

## 常见改动位置

| 目标 | 文件 |
|---|---|
| 调整角色设定和关系门槛 | `src/game/characters.ts` |
| 调整公共故事线和年份轮换文案 | `src/game/storyArcs.ts` |
| 新增条件分支 | `src/game/branches.ts` |
| 调整场景顺序和研究方案路由 | `src/game/sceneBuilders.ts` |
| 修改年份主题和研究方案 | `src/game/content/*.json` |
| 修改 2025 年业务事实 | `src/game/content2025.ts` |
| 修改评分和状态结算 | `src/game/engine.ts` |
| 修改剧情推进 | `src/game/runtime.ts` |
| 修改页面和设置 | `src/App.tsx` |
| 修改舞台和图片映射 | `src/components/PixiStage.tsx` |
| 修改音频 | `src/audio/` |
| 更新静态股票数据校验 | `scripts/validate_data.py` |
| 更新市场复盘生成器 | `scripts/build_data.py` |
