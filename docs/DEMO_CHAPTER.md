# 示范章节 · 一章怎么把三个系统串起来

这份文档给评审和写手看：一章里，三方竞争假说、知识卡、办公室道具是怎么同时工作的。它不是概念说明，是一段真的能玩到的内容（已落地为 demo 年份）。

## 怎么玩到

两种方式：

- 界面里：右上角年份选择器选 `demo`（默认还是 2025，不会一进来就进示范）。
- 深链：打开 `index.html?year=demo`。

进去后是一整年 12 个月，每月都循环演示这三个系统。下面用「示范 1 月」完整走一遍。

## 节点图（示范 1 月）

```
[记忆节点]  内心独白：未来记忆（你知道后来推理成本降了，但说不出哪月落地）
    │
    ▼
[竞争假说节点]  三方视角：林/陈/周各说各的，没有标准答案  ← 系统①三方竞争假说
    │
    ▼
[同事节点]  林若宁把材料推过来：公开信息 + 本话引导
    │
    ▼
[决策节点]  选一个研究方向  ← 这里每个选项后面都接系统②和③
    │
    ▼ （玩家选「连夜写《低成本推理对应用软件的影响》」）
    │
[复盘面板]  ← 结算后一次性呈现
    ├─ 同事评分反馈（S/A/B/C/D）
    ├─ 事后复盘（postMortem）
    ├─ 业务事实结算（businessOutcome，不是股价）  ← 系统①的落点
    └─ 本月学到 · 产业链交叉验证（林若宁用自己声音教一句）  ← 系统②知识卡
    │
[右侧栏同步更新]
    ├─ 研究室：便签 +1、白板 +1、咖啡 +1  ← 系统③办公室道具
    └─ 研究札记：多一张「产业链交叉验证」卡
```

## 三个系统分别由什么驱动

### 系统① 三方竞争假说
- 数据：`MarketTheme.competingHypotheses`（lin / chen / zhou 各一段）。
- 引擎：`contentDemo.ts` 的 `buildDemoCompetingNode` 把三段拼成一句话，demo 从第 0 月就展示（正式年份从第 2 月起）。
- 意义：玩家被迫在分歧里表态，而不是等一个标准答案。

### 系统② 知识卡
- 数据：关键决策带 `teaches: KnowledgeCard`（见 `pool0` 的 `demo-a-deep`）。
- 引擎：`engine.ts` 的 `pickKnowledgeCard` 优先用 `decision.teaches`，存入 `GameState.knowledgeCards`。
- 呈现：复盘面板的「本月学到」块 + 右侧栏「研究札记」。教学台词是角色口吻，不是弹窗教科书。

### 系统③ 办公室道具
- 数据：`engine.ts` 的 `makeDecision` 按决策类别累加 `OfficeState`（deep_research/help_colleague → 便签；deep_research/data_deep_dive/committee_defense → 白板；熬夜类 → 咖啡）。
- 呈现：右侧栏「研究室」组件，便签/白板/咖啡三个计数 + 第 X/12 月进度。
- 意义：时间有了可见的痕迹，办公室成了第四位角色。

## 玩家每一步会看到什么

1. 开场白：顾行之的内心独白，未来记忆 but 没有证据链（埋下「记忆是负债」的钩子）。
2. 三方视角：林若宁看留存、陈星禾看订单流、周明昭看估值分位。玩家意识到没有唯一正确。
3. 同事递材料：把公开信息和本话引导抛出来。
4. 决策：六个选项覆盖深研/访谈/拆数据/风险提示/帮同事/自我照顾，类别差异明显（不是程度差异）。
5. 复盘：评分 + 业务事实结算（讲生意怎么变，不讲涨跌）+ 同事教的一句知识卡。
6. 右侧栏：研究室道具 +1、研究札记 +1 张。

## 写手照抄清单

- 每月主题必须填 `competingHypotheses`（三视角）+ `businessOutcome`（业务事实，不写股价）+ `knownEvent`（未来记忆锚点）。
- 至少一条决策带 `teaches`，让复盘有东西教。
- 决策类别要分散，保证办公室三种道具都能被触发。
- 决策文案用角色的词汇（见 `docs/CHARACTERS.md`），别写成作者旁白。
- 想演示「记忆负债」：放一条 evidence/clarity 双低但总分高的选项，引擎会点亮 `parachuted_` 标记，后续相关导师语气转警惕。

## 代码落点速查

- 内容：`src/game/contentDemo.ts`（`THEMES_DEMO` / `makeDecisionsDemo` / `buildDemoChapter`）。
- 接线：`src/game/content.ts`（`YEAR_THEMES` 加 demo、`buildMonthScene` 早返回、`makeResearchDecisions` 路由）、`src/data/gameData.ts`（加 `"demo"` 年份）、`src/App.tsx`（`bestInitialYear` 保默认 2025）。
- 呈现：`src/components/StoryRecapPanel.tsx`（复盘四块）、`src/App.tsx` 的 `ResearchNotes` 与 `OfficeWidget`、`src/styles.css` 对应样式。
