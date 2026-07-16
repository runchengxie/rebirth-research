import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { CHARACTERS } from "../game/content";
import { isDebateNode } from "../game/narrativeMachine";
import type { MachineGameSession as GameSession } from "../app/useGameSessionMachine";
import type { ExperienceMode } from "../types";
import { DebateHistory } from "./DebatePanel";
import { EndingPanel } from "./EndingPanel";
import { OfficeHubPanel, RebirthArchiveSection } from "./RebirthPanel";

const loadTimelinePanel = () => import("./RebirthTimelinePanel");
const RebirthTimelinePanel = lazy(() =>
  loadTimelinePanel().then((module) => ({ default: module.RebirthTimelinePanel })),
);

type ArchiveTab = "log" | "archive" | "flow" | "office";

const CAREER_ARCHIVE_TABS: ArchiveTab[] = ["log", "archive", "flow", "office"];
const ROMANCE_ARCHIVE_TABS: ArchiveTab[] = ["log", "archive"];
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableElements(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
    .filter((element) => !element.hasAttribute("hidden"));
}

function DialogueHistory({
  session,
  experienceMode,
}: {
  session: GameSession;
  experienceMode: ExperienceMode;
}) {
  const nodes = session.scene.nodes.slice(0, session.state.sceneNodeIndex + 1);
  return (
    <section className="archive-section">
      <h3>本话记录</h3>
      <ol className="dialogue-history">
        {nodes.map((node) => (
          <li key={node.id}>
            <span>{isDebateNode(node)
              ? "观点交锋"
              : node.type === "dialogue" ? node.speaker
              : experienceMode === "romance" ? "你的选择" : "研究选择"}</span>
            {isDebateNode(node) ? (
              <DebateHistory hypotheses={session.scene.theme.competingHypotheses} />
            ) : (
              <p style={{ whiteSpace: "pre-line" }}>
                {node.type === "dialogue" ? node.text : node.decisionPrompt || node.text}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function relationshipLabel(relation: number): string {
  if (relation >= 75) return "心意相通";
  if (relation >= 55) return "认真靠近";
  if (relation >= 35) return "渐渐熟悉";
  return "故事刚开始";
}

function RelationSummary({
  session,
  experienceMode,
}: {
  session: GameSession;
  experienceMode: ExperienceMode;
}) {
  const characters = Object.values(CHARACTERS).filter((character) =>
    experienceMode === "career" || character.id !== "zhao_chengyu");
  return (
    <section className="archive-section">
      <h3>{experienceMode === "romance" ? "心动关系" : "同事关系"}</h3>
      <div className="archive-relations">
        {characters.map((character) => {
          const relation = session.state.relations[character.id] ?? 0;
          return (
            <article className={character.color} key={character.id}>
              <div>
                <strong>{character.name}</strong>
                <span>{character.role}</span>
              </div>
              <b>{experienceMode === "romance" ? relationshipLabel(relation) : relation}</b>
              <i style={{ width: `${Math.max(0, Math.min(100, relation))}%` }} />
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ResearchArchive({
  session,
  experienceMode,
}: {
  session: GameSession;
  experienceMode: ExperienceMode;
}) {
  return (
    <>
      <RelationSummary session={session} experienceMode={experienceMode} />
      <section className="archive-section">
        <h3>{experienceMode === "romance" ? "回忆札记" : "研究札记"}</h3>
        {session.state.history.length === 0 ? (
          <p className="archive-empty">
            {experienceMode === "romance"
              ? "第一次回应之后，你们共同经历的片段会留在这里。"
              : "完成第一次研究选择后，复盘会留在这里。"}
          </p>
        ) : (
          <ul className="archive-history">
            {session.state.history.map((item) => (
              <li key={item.month}>
                <span>{item.label}</span>
                <strong>{item.selected.label}</strong>
                <small>{item.outcome.title}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
      {experienceMode === "career" ? <section className="archive-section">
        <h3>知识卡</h3>
        {session.state.knowledgeCards.length === 0 ? (
          <p className="archive-empty">有方法的判断会逐渐积成你的工具书。</p>
        ) : (
          <ul className="archive-knowledge">
            {session.state.knowledgeCards.map((card) => (
              <li className={CHARACTERS[card.mentorId].color} key={card.id}>
                <strong>{card.concept}</strong>
                <span>{CHARACTERS[card.mentorId].name}：{card.mentorLine}</span>
              </li>
            ))}
          </ul>
        )}
      </section> : null}
      {experienceMode === "career" ? <RebirthArchiveSection meta={session.rebirth} /> : null}
      <EndingPanel state={session.state} experienceMode={experienceMode} />
    </>
  );
}

function TimelineFallback() {
  return (
    <section className="archive-section archive-lazy-fallback" aria-live="polite">
      <h3>因果回溯</h3>
      <p>正在展开时间线。树很多，浏览器也得先找到树根。</p>
    </section>
  );
}

function archiveTabsFor(experienceMode: ExperienceMode): ArchiveTab[] {
  return experienceMode === "romance" ? ROMANCE_ARCHIVE_TABS : CAREER_ARCHIVE_TABS;
}

function archiveTabLabel(tab: ArchiveTab, experienceMode: ExperienceMode): string {
  if (tab === "log") return "本话记录";
  if (tab === "archive") return experienceMode === "romance" ? "心动档案" : "研究档案";
  if (tab === "flow") return "因果回溯";
  return "研究室";
}

function ArchiveTabList({
  activeTab,
  experienceMode,
  onChange,
  onKeyDown,
}: {
  activeTab: ArchiveTab;
  experienceMode: ExperienceMode;
  onChange: (tab: ArchiveTab) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="archive-tabs" role="tablist" onKeyDown={onKeyDown}>
      {archiveTabsFor(experienceMode).map((tab) => {
        const isActive = activeTab === tab;
        const warmTimeline = tab === "flow" ? () => void loadTimelinePanel() : undefined;
        return (
          <button
            id={`archive-tab-${tab}`}
            aria-controls="archive-tabpanel"
            aria-selected={isActive}
            className={isActive ? "active" : ""}
            key={tab}
            role="tab"
            tabIndex={isActive ? 0 : -1}
            type="button"
            onFocus={warmTimeline}
            onPointerEnter={warmTimeline}
            onClick={() => onChange(tab)}
          >
            {archiveTabLabel(tab, experienceMode)}
          </button>
        );
      })}
    </div>
  );
}

function ArchiveTabContent({
  experienceMode,
  session,
  tab,
}: {
  experienceMode: ExperienceMode;
  session: GameSession;
  tab: ArchiveTab;
}) {
  switch (tab) {
    case "log":
      return <DialogueHistory session={session} experienceMode={experienceMode} />;
    case "archive":
      return <ResearchArchive session={session} experienceMode={experienceMode} />;
    case "flow":
      return (
        <Suspense fallback={<TimelineFallback />}>
          <RebirthTimelinePanel
            meta={session.rebirth}
            state={session.state}
            onFork={session.forkTimelineWithSound}
            onResume={session.resumeTimelineWithSound}
            onSimulate={session.simulateTimeline}
          />
        </Suspense>
      );
    case "office":
      return (
        <OfficeHubPanel
          meta={session.rebirth}
          state={session.state}
          onInspect={session.inspectOfficeWithSound}
        />
      );
  }
}

function archiveSubtitle(session: GameSession, experienceMode: ExperienceMode): string {
  if (experienceMode === "romance") return `${session.scene.label} · 剧情模式`;
  return `${session.scene.label} · 第 ${session.rebirth.cycle} 周目`;
}

export function ArchiveDrawer({
  session,
  onClose,
}: {
  session: GameSession;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<ArchiveTab>("log");
  const experienceMode = session.rebirth.experienceMode;
  const archiveTabs = archiveTabsFor(experienceMode);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const elements = focusableElements(dialog);
      if (elements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, []);

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const currentIndex = archiveTabs.indexOf(tab);
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextTab = archiveTabs[
      (currentIndex + delta + archiveTabs.length) % archiveTabs.length
    ];
    event.preventDefault();
    setTab(nextTab);
    document.getElementById(`archive-tab-${nextTab}`)?.focus();
  };

  return (
    <div className="archive-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        aria-labelledby="archive-dialog-title"
        aria-modal="true"
        className="archive-drawer"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="archive-drawer-head">
          <div>
            <span>{archiveSubtitle(session, experienceMode)}</span>
            <strong id="archive-dialog-title">{session.scene.theme.title}</strong>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="关闭档案">×</button>
        </header>
        <ArchiveTabList
          activeTab={tab}
          experienceMode={experienceMode}
          onChange={setTab}
          onKeyDown={handleTabKeyDown}
        />
        <div
          aria-labelledby={`archive-tab-${tab}`}
          className="archive-scroll"
          id="archive-tabpanel"
          role="tabpanel"
          tabIndex={0}
        >
          <ArchiveTabContent
            experienceMode={experienceMode}
            session={session}
            tab={tab}
          />
        </div>
      </div>
    </div>
  );
}
