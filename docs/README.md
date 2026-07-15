# 文档索引

根目录 README 只保留项目介绍、快速开始和文档入口。玩法细节、工程结构和维护流程集中放在本目录，减少重复内容，也方便按用途查找。

## 第一次了解项目

建议按以下顺序阅读：

1. [`gameplay.md`](gameplay.md)：了解 2025 主线、往年档案、角色路线和当前边界。
2. [`research-commitment.md`](research-commitment.md)：了解置信度、失效条件、投委会自检、组织压力和存档转移。
3. [`platform-modes.md`](platform-modes.md)：了解独立投委会、每日挑战、内容工坊、状态机和加密云同步。
4. [`ui-system.md`](ui-system.md)：了解剧情单视口、平台滚动、深色主题、模式导航、设置和云同步界面规则。
5. [`stability-and-accessibility.md`](stability-and-accessibility.md)：了解浏览器回归、键盘焦点、错误恢复、内容包限制和发布门槛。
6. [`rebirth-system.md`](rebirth-system.md)：了解时间块调查、记忆钥匙、研究捷径和跨周目存档。
7. [`2025-source-ledger.md`](2025-source-ledger.md)：了解每个月现实事件的来源、时间和叙事改编边界。
8. [`ux.md`](ux.md)：了解单视口操作、回看、自动保存和观点交锋的界面规则。
9. [`characters.md`](characters.md)：了解角色定位、语言特点和剧情写作边界。
10. [`dialogue-writing.md`](dialogue-writing.md)：了解对白去重、回调设计、术语密度和中文表达要求。
11. [`architecture.md`](architecture.md)：了解 React、PixiJS、剧情运行时、结算引擎和数据文件之间的关系。
12. [`maintenance.md`](maintenance.md)：了解本地环境、测试命令、数据维护和发布流程。

## 按需求查找

| 需求 | 文档 |
|---|---|
| 了解玩法、年份线、角色路线和当前限制 | [`gameplay.md`](gameplay.md) |
| 了解研究承诺、置信度、失效条件和投委会自检 | [`research-commitment.md`](research-commitment.md) |
| 了解独立模式、社区内容包与云同步安全边界 | [`platform-modes.md`](platform-modes.md) |
| 了解剧情与平台页面布局、深色主题、设置和存档界面 | [`ui-system.md`](ui-system.md) |
| 了解浏览器回归、无障碍、错误恢复与内容包资源限制 | [`stability-and-accessibility.md`](stability-and-accessibility.md) |
| 了解时间块调查、记忆钥匙、研究捷径和跨周目状态 | [`rebirth-system.md`](rebirth-system.md) |
| 核对 2025 现实事件与月份映射 | [`2025-source-ledger.md`](2025-source-ledger.md) |
| 了解一屏操作、剧情回看、自动保存和档案抽屉 | [`ux.md`](ux.md) |
| 编写角色对白和维护人物设定 | [`characters.md`](characters.md) |
| 控制对白重复、回调、术语和中文表达 | [`dialogue-writing.md`](dialogue-writing.md) |
| 查找模块边界、状态流转、数据关系和常见修改位置 | [`architecture.md`](architecture.md) |
| 安装依赖、运行测试、更新数据、构建和发布 | [`maintenance.md`](maintenance.md) |
| 了解自动化助手和维护者的操作约定 | [`../AGENTS.md`](../AGENTS.md) |

## 文档分工

- 根目录 `README.md` 面向第一次接触项目的玩家和开发者。
- `gameplay.md` 记录当前可以看到和操作的功能。
- `research-commitment.md` 记录研究承诺、投委会自检、组织压力、存档转移和本地游玩数据。
- `platform-modes.md` 记录平台模式、内容包契约、客户端云同步与扩展边界。
- `ui-system.md` 记录页面滚动所有权、主题变量、模式导航、设置和云同步视觉规则。
- `stability-and-accessibility.md` 记录浏览器回归、焦点管理、错误恢复、内容包限制与 CI 发布门槛。
- `rebirth-system.md` 记录调查与跨周目系统的当前行为和存储边界。
- `2025-source-ledger.md` 记录现实事件来源和叙事改编边界。
- `ux.md` 记录主界面的操作规则和呈现约束。
- `characters.md` 记录角色定位、语言特点和剧情边界。
- `dialogue-writing.md` 记录对白去重、回调设计和中文表达要求。
- `architecture.md` 记录代码结构和技术边界。
- `maintenance.md` 记录具体命令和维护流程。
- `AGENTS.md` 记录修改项目时需要长期遵守的约定。

文档只描述当前实现。历史调整过程留在提交记录和拉取请求中，避免把维护说明写成项目考古报告。
