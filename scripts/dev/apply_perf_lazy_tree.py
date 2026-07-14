#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"{path} 缺少待替换片段：{old[:120]!r}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


def replace_between(path: str, start: str, end: str, replacement: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    start_index = text.find(start)
    end_index = text.find(end, start_index)
    if start_index < 0 or end_index < 0:
        raise RuntimeError(f"{path} 无法定位替换范围：{start!r} -> {end!r}")
    target.write_text(
        text[:start_index] + replacement + text[end_index:],
        encoding="utf-8",
    )


replace_once(
    "src/app/ImmersiveGameScreen.tsx",
    '''import {
  InvestigationPanel,
  OfficeHubPanel,
  RebirthArchiveSection,
} from "../components/RebirthPanel";
import { RebirthTimelinePanel } from "../components/RebirthTimelinePanel";''',
    'import { InvestigationPanel } from "../components/InvestigationPanel";',
)
replace_once(
    "src/app/ImmersiveGameScreen.tsx",
    '''const PixiStage = lazy(() =>
  import("../components/PixiStage").then((module) => ({ default: module.PixiStage })),
);
''',
    '''const PixiStage = lazy(() =>
  import("../components/PixiStage").then((module) => ({ default: module.PixiStage })),
);
const loadArchiveDrawer = () => import("../components/ArchiveDrawer");
const ArchiveDrawer = lazy(() =>
  loadArchiveDrawer().then((module) => ({ default: module.ArchiveDrawer })),
);
''',
)
replace_between(
    "src/app/ImmersiveGameScreen.tsx",
    "function DialogueHistory",
    "function SettingsPopover",
    "function SettingsPopover",
)
replace_once(
    "src/app/ImmersiveGameScreen.tsx",
    '''            <button className="secondary-action" type="button" onClick={() => setArchiveOpen(true)}>
              记录与档案
            </button>''',
    '''            <button
              className="secondary-action"
              type="button"
              onFocus={() => void loadArchiveDrawer()}
              onPointerEnter={() => void loadArchiveDrawer()}
              onClick={() => setArchiveOpen(true)}
            >
              记录与档案
            </button>''',
)
replace_once(
    "src/app/ImmersiveGameScreen.tsx",
    '''      <ArchiveDrawer open={archiveOpen} session={session} onClose={() => setArchiveOpen(false)} />''',
    '''      {archiveOpen ? (
        <Suspense fallback={(
          <div className="archive-backdrop" role="status">
            <aside className="archive-drawer">
              <div className="archive-scroll">
                <p className="archive-empty">正在打开档案。纸很多，浏览器正在翻。</p>
              </div>
            </aside>
          </div>
        )}>
          <ArchiveDrawer session={session} onClose={() => setArchiveOpen(false)} />
        </Suspense>
      ) : null}''',
)

replace_once("src/main.tsx", 'import "./timeline.css";\n', "")

replace_between(
    "src/timeline.css",
    ".timeline-branch-list {",
    ".timeline-month-graph {",
    '''.timeline-tree {
  display: grid;
  gap: 9px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  overflow-x: auto;
}

.timeline-tree-legend {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  color: var(--muted);
  font-size: 10px;
}

.timeline-tree-legend span {
  display: inline-flex;
  gap: 5px;
  align-items: center;
}

.timeline-tree-legend i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--line);
}

.timeline-tree-legend i.root { background: var(--ink); }
.timeline-tree-legend i.fork { background: var(--gold); }
.timeline-tree-legend i.active { background: var(--pink); }

.timeline-tree ol {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.timeline-tree > ol {
  min-width: 300px;
}

.timeline-tree-item {
  position: relative;
}

.timeline-tree-item > ol {
  position: relative;
  margin: 8px 0 0 18px;
  padding-left: 18px;
  border-left: 1px solid color-mix(in srgb, var(--pink) 28%, var(--line));
}

.timeline-tree-item > ol > .timeline-tree-item::before {
  content: "";
  position: absolute;
  top: 24px;
  left: -18px;
  width: 18px;
  border-top: 1px solid color-mix(in srgb, var(--pink) 28%, var(--line));
}

.timeline-tree-item article {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--surface-strong);
}

.timeline-tree-item article::before {
  content: "";
  position: absolute;
  top: 12px;
  left: -4px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--line);
}

.timeline-tree-item.active article::before { background: var(--pink); }
.timeline-tree-item.completed article::before { background: var(--green); }
.timeline-tree-item.paused article::before { background: var(--gold); }

.timeline-tree-item article.selected {
  border-color: var(--pink);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pink) 26%, transparent);
}

.timeline-tree-item.completed > article {
  background: color-mix(in srgb, var(--surface-strong) 90%, var(--green-soft) 10%);
}

.timeline-tree-item article > button:first-child {
  display: grid;
  gap: 3px;
  width: 100%;
  padding: 2px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}

.timeline-tree-item span,
.timeline-tree-item small {
  color: var(--muted);
  font-size: 10px;
  line-height: 1.4;
}

.timeline-tree-item strong {
  font-size: 13px;
}

.timeline-resume {
  min-height: 30px;
  padding: 0 9px;
  border: 1px solid var(--pink);
  border-radius: 8px;
  background: var(--pink-soft);
  color: var(--pink);
  font-size: 11px;
  font-weight: 900;
}

.timeline-path-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.timeline-path-head div {
  display: grid;
  gap: 2px;
}

.timeline-path-head span {
  color: var(--muted);
  font-size: 10px;
}

.timeline-path-head strong {
  font-size: 13px;
}

.timeline-path-head button {
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font-size: 10px;
  font-weight: 800;
}

.timeline-month-graph {''',
)
replace_once(
    "src/timeline.css",
    '''  .timeline-mode-strip,
  .timeline-branch-list,
  .timeline-annotation-list,''',
    '''  .timeline-mode-strip,
  .timeline-annotation-list,''',
)

replace_once(
    "vite.config.ts",
    '''          groups: [
            {
              name: "tone",
              test: /node_modules[\\/]tone[\\/]/,
            },
          ],''',
    '''          groups: [
            {
              name: "react-vendor",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            },
            {
              name: "tone",
              test: /node_modules[\\/]tone[\\/]/,
            },
          ],''',
)

replace_once(
    "package.json",
    '"check": "npm run lint:ci && npm run typecheck && npm run test:run && npm run validate:frontend && npm run validate:brand && npm run build",',
    '"check": "npm run lint:ci && npm run typecheck && npm run test:run && npm run validate:frontend && npm run validate:brand && npm run build && npm run validate:bundle",',
)
replace_once(
    "package.json",
    '"validate:brand": "node scripts/validate_brand_refs.mjs"',
    '"validate:brand": "node scripts/validate_brand_refs.mjs",\n    "validate:bundle": "node scripts/validate_bundle_size.mjs"',
)

replace_once(
    "scripts/validate_frontend.js",
    '  "validate:brand",\n  "validate:frontend",',
    '  "validate:brand",\n  "validate:bundle",\n  "validate:frontend",',
)
replace_once(
    "scripts/validate_frontend.js",
    '  "src/components/EndingPanel.tsx",\n  "src/components/RebirthTimelinePanel.tsx",',
    '  "src/components/ArchiveDrawer.tsx",\n  "src/components/EndingPanel.tsx",\n  "src/components/InvestigationPanel.tsx",\n  "src/components/RebirthTimelinePanel.tsx",',
)
replace_once(
    "scripts/validate_frontend.js",
    '  "scripts/validate_brand_refs.mjs",',
    '  "scripts/validate_brand_refs.mjs",\n  "scripts/validate_bundle_size.mjs",',
)
replace_between(
    "scripts/validate_frontend.js",
    'requireText("src/app/ImmersiveGameScreen.tsx", [',
    'requireText("src/app/useGameController.ts", [',
    '''const immersiveScreen = requireText("src/app/ImmersiveGameScreen.tsx", [
  "DebatePanel",
  "PixiStage",
  "loadArchiveDrawer",
  "ArchiveDrawer",
  "InvestigationPanel",
  "canGoBack",
  "跳过已读",
  "记录与档案",
]);
if (immersiveScreen.includes("RebirthTimelinePanel")) {
  fail("主界面不应同步导入因果回溯面板");
}
requireText("src/components/ArchiveDrawer.tsx", [
  "loadTimelinePanel",
  "RebirthTimelinePanel",
  "OfficeHubPanel",
  "因果回溯",
]);
requireText("src/components/RebirthTimelinePanel.tsx", [
  'import "../timeline.css"',
  "timeline-tree",
  "显示全部月份",
]);
const mainEntry = requireText("src/main.tsx", ["createRoot", "rebirth-v2.css"]);
if (mainEntry.includes("timeline.css")) {
  fail("时间线样式应由异步回溯组件加载");
}
requireText("vite.config.ts", ["react-vendor", "tone"]);
requireText("src/app/useGameController.ts", [''',
)

print("performance lazy tree patch applied")
