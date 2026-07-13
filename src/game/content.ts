// ═══════════════════════════════════════════════════════════
// Content barrel — 叙事内容的编排入口
//
// 原 content.ts 是一个 ~1400 行的 god module，同时承载了「角色数据 / 叙事弧 /
// 分支逻辑 / 场景构建」四五种职责。现已按单一职责拆为多个子模块，本文件只负责
// 安装跨模块内容扩展并统一重导出：
//
//   - characters.ts  角色与静态数据（CHARACTERS / 好感门槛 / 日程 / 复盘文案）
//   - storyArcs.ts   主题与 12 章叙事弧 + 按年份轮换的寒暄/mission 镜头表
//   - branches.ts    条件分支与赵承宇 peer 弧（GRADE/DEBT/peer 全家）
//   - sceneBuilders.ts  知识卡逻辑 + 四个场景构建函数 + 决策池路由
//   - linRoute2025.ts  林若宁「早心动、慢信任」的 2025 主推关系弧
//   - supportingRoutes2025.ts  陈星禾和周明昭的行为型专属关系弧
//   - copyPolish.ts  公共台词中的重复、翻译腔和中英混杂修正
// ═══════════════════════════════════════════════════════════

import { installCopyPolish } from "./copyPolish";
import { installLinRoute2025 } from "./linRoute2025";
import { installSupportingRoutes2025 } from "./supportingRoutes2025";

installLinRoute2025();
installSupportingRoutes2025();
installCopyPolish();

export * from "./characters";
export * from "./storyArcs";
export * from "./branches";
export * from "./sceneBuilders";
export * from "./verified2025";
