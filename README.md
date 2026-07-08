# 心动 K 线：重生投研部

这是一个使用 Vite、TypeScript、React 和 PixiJS 开发的中文剧情网页游戏。主线以历史金融事件为线索，讲投研部成员在市场变化中的判断、争论和成长。每个月的剧情结束后，玩家进入一个平行的实战小游戏，从 4 张实战卡里选择一条路线。系统按真实 A 股月度涨跌幅结算，并叠加日程修正，推动小金库、闪耀度、疲劳值和角色好感变化。

在线试玩：<https://runchengxie.github.io/rebirth-game/>

## 功能

- 支持 2023、2024、2025 三个年份。
- 支持自定义初始本金。
- 支持浅色模式和暗色模式，主题选择会保存在浏览器本地。
- 使用 PixiJS 绘制剧情舞台、场景背景和角色立绘，React 渲染章节标题、角色对话框、实战卡和存档回放。
- 主线先讲历史金融事件，再进入实战小游戏。金融知识通过人物对话、事件冲突和结算复盘自然出现。
- 女主只依据公开信息和当下数据判断。男主知道一部分历史走向，但只能把这些记忆整理成能说出口的研究假设。
- 第一话内置逐句推进的剧情脚本，围绕 2025 年 1 月 DeepSeek-R1 和 AI 叙事变化展开。
- 每月可选择 `熬夜研报`、`茶歇复盘`、`仓位纪律` 三种日程，改变执行修正、疲劳、闪耀和角色好感。
- 背景音乐和轻语音由浏览器音频接口生成，当前版本不依赖外部版权音频。后续可替换为授权循环音频和离线关键句语音。
- 每月选择后显示当月真实涨跌幅、参考路线、小金库变化和角色反馈。
- 选择结果会影响闪耀度、疲劳值和璃奈、美咲、芽衣好感，并在年度结束后给出最高好感路线结局。
- 展示资金曲线和月度流水。
- 可生成离线分享包，朋友解压后直接打开 `index.html` 即可游玩。

## 实战小游戏规则

- 每个月先过滤 ST、停牌、新上市未满 120 天、月初或月末不可交易的股票。
- 用月初第一个交易日和月末最后一个交易日的价格计算涨跌幅。
- 默认使用 `adj_close` 计算收益，减少除权分红对收益的影响。需要改用原始收盘价时，可在生成数据时传入 `--price-column close`。
- 在当月成交额最高的 500 只股票里找涨幅第一名，作为参考路线。
- 干扰项从涨幅排名约前 10% 到 30% 的股票中抽 3 只，让题目保持一定迷惑性。

## 项目结构

```text
rebirth-game/
├── assets/
│   ├── galgame-key-art.png
│   └── vn/
│       ├── backgrounds/
│       │   ├── briefing-room.png
│       │   ├── night-cafe.png
│       │   └── research-room.png
│       └── characters/
│           ├── mei-neutral.png
│           ├── mei-serious.png
│           ├── mei-soft.png
│           ├── misaki-excited.png
│           ├── misaki-focused.png
│           ├── misaki-neutral.png
│           ├── rina-smile.png
│           ├── rina-soft.png
│           └── rina-thinking.png
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   ├── components/
│   │   └── PixiStage.tsx
│   ├── audio/
│   │   ├── bgm.ts
│   │   └── voice.ts
│   ├── data/
│   │   └── gameData.ts
│   └── game/
│       ├── content.ts
│       └── engine.ts
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── package-lock.json
├── data/
│   ├── 2023.json
│   ├── 2024.json
│   ├── 2025.json
│   ├── game-data.js
│   └── manifest.json
├── scripts/
│   ├── build_data.py
│   ├── package.ps1
│   ├── validate_data.py
│   └── validate_frontend.js
├── docs/
│   └── maintenance.md
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── pages.yml
├── AGENTS.md
├── pyproject.toml
└── requirements.txt
```

源码需要 Node 构建。运行 `npm run build` 后会生成纯静态 `dist/`，GitHub Pages 发布的就是这个目录。

## 本地开发

```bash
npm ci
npm run dev
```

生产构建：

```bash
npm run build
```

## 数据来源

数据生成脚本默认读取本机 market-data-platform 的 A 股清洗数据：

- `a_share_daily_clean`
- `a_share_instruments`

具体本机路径在 `scripts/build_data.py` 的默认参数里。也可以通过 `--daily-clean-dir` 和 `--instruments` 覆盖。

发布后的 JSON 只保留数据集名称、数据版本和生成规则，不包含本机文件路径。

## 重新生成数据

```powershell
cd C:\Users\gbyha\code\rebirth-game
uv venv
uv pip install -r requirements.txt
.\.venv\Scripts\python.exe scripts\build_data.py
```

默认会生成 2023、2024、2025 三个年份：

- `data/2023.json`
- `data/2024.json`
- `data/2025.json`
- `data/game-data.js`
- `data/manifest.json`

常用参数：

```powershell
.\.venv\Scripts\python.exe scripts\build_data.py `
  --years 2023 2024 2025 `
  --initial-capital 10000 `
  --active-pool 500 `
  --min-listed-days 120 `
  --price-column adj_close
```

## 生成离线分享包

```powershell
cd C:\Users\gbyha\code\rebirth-game
.\scripts\package.ps1
```

生成结果：

```text
dist/rebirth-game-share.zip
```

`package.ps1` 会先运行 `npm run build`，再把 `dist/` 构建产物打包。以后新增年份后，重新生成数据再运行打包脚本即可。

压缩包会包含构建后的网页资源。游玩入口是根目录的 `index.html`。

## 本地验证

```powershell
uvx ruff check .
uvx ruff format --check .
.\.venv\Scripts\python.exe -m compileall scripts
uvx basedpyright scripts
.\.venv\Scripts\python.exe scripts\validate_data.py
node scripts\validate_frontend.js
npm run lint
npm run typecheck
npm run test:run
npm run build
```

也可以一键运行前端检查：

```bash
npm run check
```

## 音频策略

当前背景音乐和轻语音由浏览器音频接口生成，仓库不提交第三方音频文件，避免授权不清。后续如果替换为音频素材，只接受自制、CC0、公有领域或明确允许商用分发的循环音频和语音文件，并在 README 中记录来源和授权。

GitHub Actions 会在推送代码和创建拉取请求时运行同一组检查。

更多维护说明见 `docs/maintenance.md`。

## 注意

这个项目只用于游戏和复盘，不构成投资建议。
