# 开发示范章节

`demo` 是给内容维护者使用的开发样本，用来检查三方观点、知识卡和办公室痕迹能否在同一话中正常工作。它不出现在主菜单和年份选择器中。

## 打开方式

使用深链进入：

```text
?year=demo
```

示范内容共有 12 话，由四组主题循环组成，适合验证系统接线。正式玩家入口当前只展示 2025 年。

## 一话流程

以示范一月为例：

```text
未来记忆
  ↓
三位同事分别提出基本面、量价和风控观点
  ↓
同事递交公开材料与本话任务
  ↓
玩家选择研究方案
  ↓
结算评分、业务事实和知识卡
  ↓
办公室痕迹与研究档案更新
```

三位同事的观点在年度剧情界面中显示为三张独立卡片。每张卡只承载一位角色的姓名、方法标签和观点，避免多人台词连成一段。

## 三方观点

数据位于 `MarketTheme.competingHypotheses`，包含 `lin`、`chen` 和 `zhou` 三个字段。

`src/game/contentDemo.ts` 负责构建示范场景。`src/components/DebatePanel.tsx` 从当月主题读取三种假设，并按角色渲染观点卡。档案记录按角色保留三条观点，方便回看时确认每个人说了什么。

每种观点需要具备独立的证据路径：

- 林若宁检查客户使用、订单、留存和收入质量。
- 陈星禾检查成交结构、资金持续性、样本和归因。
- 周明昭检查估值、传导时滞、下行情景和退出条件。

## 知识卡

关键研究方案可以通过 `teaches` 直接携带一张 `KnowledgeCard`。玩家选择该方案后，结算引擎把知识卡写入 `GameState.knowledgeCards`。

知识卡会出现在本话复盘和档案抽屉的研究档案中。卡片文字使用对应角色的语气，并说明当前选择教会了玩家什么方法。

## 办公室痕迹

`GameState.office` 记录便签、白板笔迹、咖啡杯和完成月份。不同研究类别会产生不同痕迹，例如深度研究增加便签与白板笔迹，熬夜类选择增加咖啡杯。

职业模式在档案抽屉的研究室标签中显示这些积累。玩家可以整理物件并触发稳定旗标和后续回调。主舞台不叠加办公室计数装饰。

## 内容维护检查

新增或调整示范内容时确认：

- 每月都有 `knownEvent`、`businessOutcome` 和 `competingHypotheses`。
- 三种观点各自完整，不依赖另一张卡才能读懂。
- 研究方案覆盖不同方法与行为后果。
- 至少有一项方案能够产生知识卡。
- 业务事实说明生意怎样变化，不使用股价裁定研究质量。
- 对白使用中文标点，动作与说出口的话分别成段。
- `?year=demo` 可以完成 12 话，并且不出现在正常年份选择器中。

## 代码位置

- `src/game/contentDemo.ts`：示范主题、研究方案和场景装配。
- `src/game/contentDemo.test.ts`：示范内容与场景测试。
- `src/game/sceneBuilders.ts`：年份内容路由。
- `src/data/gameData.ts`：保留 `demo` 深链数据，同时让 `GAME_YEARS` 只展示 2025。
- `src/app/ImmersiveGameScreen.tsx`：年度剧情主流程。
- `src/components/DebatePanel.tsx`：三方观点卡片。
- `src/components/StoryRecapPanel.tsx`：评分、业务事实和知识卡复盘。
- `src/components/ArchiveDrawer.tsx`：本话记录、研究档案和研究室入口。
- `src/components/RebirthPanel.tsx`：研究室物件概览与整理操作。
