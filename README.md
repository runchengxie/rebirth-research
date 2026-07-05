# Rebirth Stock Game

一个本地单页重生选股游戏：从 1 万元开始，每个月在 4 个标的里选 1 个，按该股票当月真实涨跌幅复利滚动，看看一年结束能到多少钱。

在线地址：<https://runchengxie.github.io/rebirth-game/>

## 数据来源

默认读取本机 Z 盘清洗后的 A 股日线层：

`Z:\market-data-platform\assets\tushare\a_share\daily\a_share_all_20150101_20260703_daily_clean`

脚本还会读取股票名称、行业、上市日期：

`Z:\market-data-platform\assets\tushare\a_share\instruments\a_share_all_instruments_latest.parquet`

## 规则

- 每个月先过滤 ST、停牌、新上市未满 120 天、月初或月末不可交易的股票。
- 用月初第一个交易日和月末最后一个交易日的价格计算涨跌幅。
- 默认使用 `adj_close` 计算收益，避免除权分红造成收益失真；可用 `--price-column close` 改成原始收盘价。
- 在当月成交额最高的 500 只股票里找涨幅第一名作为正确答案。
- 干扰项从涨幅排名约前 10% 到 30% 的股票中抽 3 只，避免题目太明显。

## 生成数据

```powershell
cd C:\Users\gbyha\code\rebirth-game
uv venv
uv pip install -r requirements.txt
.\.venv\Scripts\python.exe scripts\build_data.py --years 2023 2024 2025
```

生成结果：

- `data/2023.json`
- `data/2024.json`
- `data/2025.json`
- `data/game-data.js`

`index.html` 直接引用 `data/game-data.js`，所以可以直接用浏览器打开，不需要前端构建步骤。

## 分享给朋友

朋友玩游戏只需要这些文件：

- `index.html`
- `data/game-data.js`
- `data/2023.json`
- `data/2024.json`
- `data/2025.json`
- `data/manifest.json`

可以生成一个离线压缩包：

```powershell
cd C:\Users\gbyha\code\rebirth-game
.\scripts\package.ps1
```

生成结果在 `dist/rebirth-game-share.zip`。解压后直接打开 `index.html` 即可玩，不需要 Z 盘数据。

## 调整玩法

常用参数：

```powershell
.\.venv\Scripts\python.exe scripts\build_data.py `
  --years 2023 2024 2025 `
  --initial-capital 10000 `
  --active-pool 500 `
  --min-listed-days 120 `
  --price-column adj_close
```

这个项目只用于游戏和复盘，不构成投资建议。
