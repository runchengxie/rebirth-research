# 心动 K 线：重生投研部

一款以投研部日常为背景的中文剧情与研究决策网页游戏。你将扮演带着未来记忆回到入职初期的顾行之，在公开信息、研究方法、组织压力、团队协作和个人生活之间做选择。

在线试玩：<https://runchengxie.github.io/rebirth-research/>

![项目主视觉](assets/key-art.webp)

## 游戏体验

- 当前正式版聚焦 2025 年线，共 12 话
- 2023、2024 保留为往年档案，可通过 `?year=2023`、`?year=2024` 深链打开
- 推进人物对白，调查证据，安排日程并提交带置信度和失效条件的研究判断
- 在基本面、量化信号和宏观风控等方法之间建立自己的研究框架
- 通过研究可信度、团队信任、疲劳、生活平衡、角色关系和关键行为记忆影响后续剧情
- 收集研究知识卡，解锁三位女性角色的关系结局与赵承宇的同级搭档结局
- 使用浅色或暗色主题，并在 PixiJS 舞台与静态回退之间自动适配

## 研究平台模式

页面底部可以切换四种模式：

- **年度剧情**：十二个月主线、重生调查、人物关系和因果时间线
- **独立投委会**：选择案例和研究方案，接受基金经理、基本面、量化、风控与合规五轮追问
- **每日挑战**：同一天面对相同案例与组织约束，在本地记录首次成绩和连续完成天数
- **内容工坊**：创建、验证、导入和导出社区研究案例，保存后直接进入投委会案例库

直接链接：

- `?mode=committee`
- `?mode=daily`
- `?mode=studio`

存档默认保存在浏览器本地，也可以导出 JSON、复制分享码，或使用玩家自己的私密 GitHub Gist 进行 AES-GCM 加密云同步。项目没有自己的账号服务器，GitHub token 不会写入本地存储。

2025 年每个月使用经过核对的现实事件作为剧情锚点，来源和叙事改编边界记录在 [`docs/2025-source-ledger.md`](docs/2025-source-ledger.md)。当前月度结算关注研究过程和业务事实，尚未接入真实月度涨跌幅。

更完整的玩法和当前功能说明见 [`docs/gameplay.md`](docs/gameplay.md)，平台模式与扩展契约见 [`docs/platform-modes.md`](docs/platform-modes.md)。

## 本地运行

建议使用 Node.js 22。

```bash
npm ci
npm run dev
```

生产构建：

```bash
npm run build
```

Python 工具、测试、数据更新和发布流程见 [`docs/maintenance.md`](docs/maintenance.md)。

## 文档

- [`docs/README.md`](docs/README.md)：文档索引和阅读顺序
- [`docs/gameplay.md`](docs/gameplay.md)：玩法、功能和当前边界
- [`docs/research-commitment.md`](docs/research-commitment.md)：研究承诺、投委会自检和存档转移
- [`docs/platform-modes.md`](docs/platform-modes.md)：独立模式、内容包、状态机与加密云同步
- [`docs/2025-source-ledger.md`](docs/2025-source-ledger.md)：2025 月度事件来源和改编说明
- [`docs/architecture.md`](docs/architecture.md)：模块结构、状态流转和数据关系
- [`docs/maintenance.md`](docs/maintenance.md)：开发、测试、数据和发布流程
- [`docs/characters.md`](docs/characters.md)：角色定位、语言特点和写作边界
- [`docs/dialogue-writing.md`](docs/dialogue-writing.md)：对白去重、回调设计和中文表达要求
- [`AGENTS.md`](AGENTS.md)：维护者和自动化助手需要遵守的项目约定

## 技术栈

`Vite + TypeScript + React + PixiJS`

构建产物是纯静态网页，可以部署到 GitHub Pages，也可以制作成离线分享包。社区内容、每日挑战和投委会都可以在纯静态部署下运行；可选云同步调用玩家自己的 GitHub Gist。

## 说明

本项目面向金融基础知识与研究方法教育，与任何金融资格认证机构不存在隶属、授权或背书关系。

本项目用于剧情体验和研究方法复盘，不提供投资建议。静态数据、市场主题和业务事实只服务于游戏叙事，不能作为交易依据。
