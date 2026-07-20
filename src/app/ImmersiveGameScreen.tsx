import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { GAME_YEARS } from "../data/gameData";
import { CHARACTERS } from "../game/content";
import type { CharacterProfile, ExperienceMode, ResearchDecision, SceneNode } from "../types";
import { DebatePanel } from "../components/DebatePanel";
import { DecisionCard } from "../components/DecisionCard";
import { EndingPanel } from "../components/EndingPanel";
import { FocusSelector } from "../components/FocusSelector";
import { InvestigationPanel } from "../components/InvestigationPanel";
import { ResearchCommitmentPanel } from "../components/ResearchCommitmentPanel";
import { SaveTransferPanel } from "../components/SaveTransferPanel";
import { StatusBar } from "../components/StatusBar";
import { StoryRecapPanel } from "../components/StoryRecapPanel";
import { GlossaryDetails, GlossaryText } from "../components/GlossaryNotes";
import { completedReviewCount, createDefaultResearchCommitment, FALSIFIER_OPTIONS, type ResearchCommitment } from "../game/researchCommitment";
import { experiencePolicy } from "../game/experienceMode";
import { decisionPresentation, glossaryTermsIn } from "../game/careerGuidance";
import { focusById } from "../game/engine";
import { currentInvestigation, isInvestigationActive } from "../game/rebirth";
import { isDebateNode } from "../game/narrativeMachine";
import { recordPlaytestEvent } from "../game/playtestTelemetry";
import { writeSessionEnvelope } from "../game/sessionEnvelope";
import { stakeholderPressureFor } from "../game/stakeholderPressure";
import { buildSceneView } from "./useGameController";
import type { GameAudio, SettingsMenu, ThemeControl } from "./useGameController";
import type { MachineGameSession as GameSession } from "./useGameSessionMachine";

const PixiStage = lazy(() =>
  import("../components/PixiStage").then((module) => ({
    default: module.PixiStage,
  })),
);
const loadArchiveDrawer = () => import("../components/ArchiveDrawer");
const ArchiveDrawer = lazy(() => loadArchiveDrawer().then((module) => ({ default: module.ArchiveDrawer })));

interface ImmersiveGameScreenProps {
  audio: GameAudio;
  session: GameSession;
  settingsOpen: boolean;
  settingsRef: SettingsMenu["settingsRef"];
  setSettingsOpen: SettingsMenu["setSettingsOpen"];
  themeControl: ThemeControl;
  usePixiStage: boolean;
}

function readExactMetricPreference(): boolean {
  try {
    return localStorage.getItem("rebirthShowExactMetrics") === "1";
  } catch {
    return false;
  }
}

function relationshipSignal(value: number): string {
  if (value >= 80) return "关系已进入长期承诺";
  if (value >= 60) return "关系明显深化";
  if (value >= 40) return "专业默契形成";
  return "仍在互相观察";
}

const OPENING_PLAIN_LANGUAGE_LEADS: Record<string, string> = {
  "2025p-lin-2": "技术突破只是起点，真正要判断的是谁先赚到钱，以及什么时候能从业绩里看出来。",
  "2025p-chen-1": "眼下的上涨主要来自追涨，公司的实际经营还没有证明这个故事。",
  "2025p-chen-2": "买盘还在，但市场承接正在变薄，这个交易信号更容易突然失效。",
  "2025p-zhou-1": "好消息可能是真的，也可能早已被价格提前算进去了。",
  "2025p-chen-3": "她会盯资金是否撤退、交易是否过度拥挤，以及原来的信号是否开始失效。",
  "2025p-zhou-3": "判断错了，需要知道究竟是前提错、漏了变量，还是市场反馈改变了结果。",
};

function plainLanguageLeadFor(sceneNodeId: string): string | null {
  return OPENING_PLAIN_LANGUAGE_LEADS[sceneNodeId] ?? null;
}

function DialogueCopy({ experienceMode, prompt, sceneNodeId, text }: { experienceMode: ExperienceMode; prompt: string; sceneNodeId: string; text: string }) {
  const terms = glossaryTermsIn(text);
  const plainLanguageLead = plainLanguageLeadFor(sceneNodeId);

  return (
    <div className="immersive-dialogue-copy">
      {plainLanguageLead ? (
        <aside className="focus-onboarding dialogue-plain-summary" role="note">
          <span>先抓住重点</span>
          <strong>{plainLanguageLead}</strong>
          <p>下面保留角色的专业表达；暂时不懂术语，也不影响继续剧情。</p>
        </aside>
      ) : null}
      <p style={{ whiteSpace: "pre-line" }}>
        <GlossaryText text={text} terms={terms} />
      </p>
      <GlossaryDetails
        className="debate-glossary dialogue-glossary"
        showRelevance
        summaryLabel="本段术语"
        telemetryEvent="dialogue_glossary_expand"
        telemetryPayload={{ experienceMode, sceneNodeId }}
        terms={terms}
      />
      <small>{prompt}</small>
    </div>
  );
}

function StaticStage({ color }: { color: string }) {
  return <div className={`pixi-stage pixi-stage-fallback immersive-static character-${color}`} aria-hidden="true" />;
}

export function StageArt({
  activeCharacter,
  activePose,
  sceneBackground,
  showDebate,
  usePixiStage,
}: {
  activeCharacter: CharacterProfile;
  activePose: string;
  sceneBackground: string;
  showDebate: boolean;
  usePixiStage: boolean;
}) {
  let artwork;
  if (showDebate) {
    artwork = <div className={`debate-stage debate-stage-${sceneBackground}`} aria-hidden="true" />;
  } else if (!usePixiStage) {
    artwork = <StaticStage color={activeCharacter.color} />;
  } else {
    artwork = (
      <Suspense fallback={<StaticStage color={activeCharacter.color} />}>
        <PixiStage activeCharacter={activeCharacter} activePose={activePose} backgroundId={sceneBackground} />
      </Suspense>
    );
  }

  return artwork;
}

function ResearchBriefs({ node }: { node: SceneNode }) {
  const briefs = node.briefs ?? [];
  if (briefs.length === 0) return null;
  return (
    <div className="immersive-briefs" aria-label="研究线索">
      {briefs.map((brief) => {
        const character = CHARACTERS[brief.characterId];
        return (
          <article className={`immersive-brief ${character.color}`} key={`${brief.characterId}-${brief.label}`}>
            <span>{character.name}</span>
            <strong>{brief.label}</strong>
            <p>{brief.text}</p>
          </article>
        );
      })}
    </div>
  );
}

const NARROW_DECISION_QUERY = "(max-width: 760px)";

function useNarrowDecisionViewport(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(NARROW_DECISION_QUERY).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(NARROW_DECISION_QUERY);
    const onChange = () => setNarrow(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

type DecisionStepId = "investigate" | "schedule" | "viewpoint" | "confirm";

interface DecisionStepDefinition {
  id: DecisionStepId;
  label: string;
  title: string;
}

const DECISION_STEPS: Record<DecisionStepId, DecisionStepDefinition> = {
  investigate: { id: "investigate", label: "调查", title: "先看压力与线索，再决定验证什么" },
  schedule: { id: "schedule", label: "日程", title: "安排本月投入与状态的取舍" },
  viewpoint: { id: "viewpoint", label: "观点", title: "写下研究承诺，选出本月方案草案" },
  confirm: { id: "confirm", label: "确认", title: "核对草案，确认后生成本月结算" },
};

interface DecisionFlowProps {
  session: GameSession;
  commitment: ResearchCommitment;
  onCommitmentChange: (next: ResearchCommitment) => void;
  submitDecision: (decision: ResearchDecision) => void;
}

function selectFocusWithTelemetry(session: GameSession, focusId: string): void {
  recordPlaytestEvent("focus_select", {
    year: session.state.year,
    month: session.state.monthIndex + 1,
    cycle: session.rebirth.cycle,
    focusId,
  });
  session.selectFocusWithSound(focusId);
}

function StepperSummary({
  themeTitle,
  focusLabel,
  remainingTime,
  draftLabel,
}: {
  themeTitle: string;
  focusLabel: string;
  remainingTime: number | null;
  draftLabel: string | null;
}) {
  return (
    <div className="decision-step-summary" role="note">
      <strong>{themeTitle}</strong>
      <span>日程：{focusLabel}</span>
      {remainingTime !== null ? <span>剩余 {remainingTime} 时间块</span> : null}
      {draftLabel ? <span>草案：{draftLabel}</span> : null}
    </div>
  );
}

function ConfirmStep({
  session,
  commitment,
  draftDecision,
  remainingTime,
  focusLabel,
  onBack,
  submitDecision,
}: {
  session: GameSession;
  commitment: ResearchCommitment;
  draftDecision: ResearchDecision | null;
  remainingTime: number | null;
  focusLabel: string;
  onBack: () => void;
  submitDecision: (decision: ResearchDecision) => void;
}) {
  const submittingRef = useRef(false);
  const draftPresentation = draftDecision ? decisionPresentation(draftDecision) : null;
  const falsifierLabel = FALSIFIER_OPTIONS.find((option) => option.id === commitment.falsifier)?.label ?? commitment.falsifier;

  const confirmSubmit = () => {
    if (!draftDecision || submittingRef.current) return;
    submittingRef.current = true;
    recordPlaytestEvent("decision_confirm", {
      year: session.state.year,
      month: session.state.monthIndex + 1,
      decisionId: draftDecision.id,
      focusId: session.state.focusId,
      recommendationMatched: session.state.focusId === decisionPresentation(draftDecision).recommendedFocusId,
      glossaryTerms: glossaryTermsIn(draftDecision.label, draftDecision.description).length,
    });
    submitDecision(draftDecision);
  };

  return (
    <div className="decision-step-body">
      <section className="decision-confirmation decision-step-confirmation" aria-label="本月提交确认">
        <span>提交前最后核对</span>
        <strong>{draftDecision ? draftDecision.label : "还没有选择方案草案"}</strong>
        <dl>
          <div>
            <dt>本月主题</dt>
            <dd>{session.scene.theme.title}</dd>
          </div>
          {remainingTime !== null ? (
            <div>
              <dt>剩余时间块</dt>
              <dd>{remainingTime}</dd>
            </div>
          ) : null}
          <div>
            <dt>日程</dt>
            <dd>{focusLabel}</dd>
          </div>
          <div>
            <dt>置信度</dt>
            <dd>{commitment.confidence}%</dd>
          </div>
          <div>
            <dt>失效条件</dt>
            <dd>{falsifierLabel}</dd>
          </div>
          <div>
            <dt>自检完成</dt>
            <dd>{completedReviewCount(commitment)} / 3</dd>
          </div>
          {draftPresentation ? (
            <div>
              <dt>方案主张</dt>
              <dd>{draftPresentation.claim}</dd>
            </div>
          ) : null}
          {draftPresentation ? (
            <div>
              <dt>主要代价</dt>
              <dd>{draftPresentation.tradeoff}</dd>
            </div>
          ) : null}
        </dl>
        {!draftDecision ? <small>返回上一步选择一个方案草案后才能提交。</small> : null}
        <div className="decision-confirmation-actions">
          <button className="secondary-action" type="button" onClick={onBack}>
            返回修改
          </button>
          <button className="primary-action" disabled={!draftDecision} type="button" onClick={confirmSubmit}>
            确认提交本月判断
          </button>
        </div>
      </section>
    </div>
  );
}

// R1 观点步骤：三方研究线索、本话术语、研究承诺与方案草案。
function ViewpointStep({
  session,
  commitment,
  draftDecision,
  onCommitmentChange,
  onDraft,
}: {
  session: GameSession;
  commitment: ResearchCommitment;
  draftDecision: ResearchDecision | null;
  onCommitmentChange: (next: ResearchCommitment) => void;
  onDraft: (decision: ResearchDecision) => void;
}) {
  const view = buildSceneView(session);
  return (
    <div className="decision-step-body">
      {view.decisionNode ? <ResearchBriefs node={view.decisionNode} /> : null}
      <GlossaryDetails
        className="debate-glossary dialogue-glossary"
        showRelevance
        summaryLabel="本话术语"
        telemetryEvent="dialogue_glossary_expand"
        telemetryPayload={{
          experienceMode: session.rebirth.experienceMode,
          sceneNodeId: session.sceneNode.id,
        }}
        terms={glossaryTermsIn(
          view.decisionNode?.decisionPrompt,
          ...(view.decisionNode?.briefs ?? []).map((brief) => brief.text),
          ...view.topDecisions.flatMap((decision) => [decision.label, decision.description]),
        )}
      />
      <ResearchCommitmentPanel commitment={commitment} onChange={onCommitmentChange} />
      <div className="options">
        {view.topDecisions.map((decision, index) => (
          <DecisionCard
            decision={decision}
            draftMode
            draftSelected={draftDecision?.id === decision.id}
            experienceMode={session.rebirth.experienceMode}
            index={index}
            key={decision.id}
            state={session.state}
            onChoose={onDraft}
          />
        ))}
      </div>
    </div>
  );
}

// 路线图 R1：窄屏职业模式的步骤器。步骤状态只存在 React 局部状态里，
// 草案（draftDecision）在最终确认前不会触发结算。
function DecisionStepper({ session, commitment, onCommitmentChange, submitDecision }: DecisionFlowProps) {
  const investigationActive = isInvestigationActive(session.rebirth, session.state);
  const steps = useMemo(() => {
    const ids: DecisionStepId[] = investigationActive
      ? ["investigate", "schedule", "viewpoint", "confirm"]
      : ["schedule", "viewpoint", "confirm"];
    return ids.map((id) => DECISION_STEPS[id]);
  }, [investigationActive]);
  const [stepIndex, setStepIndex] = useState(0);
  const [draftDecision, setDraftDecision] = useState<ResearchDecision | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mountedRef = useRef(false);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const pressure = stakeholderPressureFor(session.state.year, session.state.monthIndex);
  const investigation = currentInvestigation(session.rebirth, session.state);
  const remainingTime = investigation
    ? Math.max(0, investigation.timeBudget - investigation.timeSpent)
    : null;
  const currentFocus = focusById(session.state.focusId);
  const guidedOpening = session.state.monthIndex === 0 && session.state.history.length === 0;

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    headingRef.current?.focus();
    recordPlaytestEvent("decision_step_view", {
      year: session.state.year,
      month: session.state.monthIndex + 1,
      step: step.id,
    });
    // 只在步骤切换时聚焦标题，与月份状态无关。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);

  useEffect(() => {
    if (step.id !== "viewpoint" || !guidedOpening) return;
    const timeoutId = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("rebirth:apply-steady-commitment"));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [step.id, guidedOpening]);

  const goToStep = (nextIndex: number) => {
    setStepIndex(Math.max(0, Math.min(steps.length - 1, nextIndex)));
  };

  const nextDisabled = step.id === "viewpoint" && !draftDecision;

  return (
    <div className="decision-stepper" aria-label="本月分步决策">
      <StepperSummary
        draftLabel={draftDecision?.label ?? null}
        focusLabel={currentFocus.label}
        remainingTime={remainingTime}
        themeTitle={session.scene.theme.title}
      />
      <ol className="decision-step-nav" aria-label="决策步骤">
        {steps.map((item, index) => (
          <li
            aria-current={item.id === step.id ? "step" : undefined}
            className={item.id === step.id ? "active" : index < stepIndex ? "done" : ""}
            key={item.id}
          >
            {item.label}
          </li>
        ))}
      </ol>
      <h3 className="decision-step-title" ref={headingRef} tabIndex={-1}>
        {step.title}
      </h3>

      {step.id === "investigate" ? (
        <div className="decision-step-body">
          <aside className="stakeholder-pressure">
            <header>
              <span>{pressure.source}</span>
              <strong>{pressure.title}</strong>
            </header>
            <p>{pressure.detail}</p>
            <small>{pressure.tradeoff}</small>
          </aside>
          <InvestigationPanel meta={session.rebirth} state={session.state} onInvestigate={session.investigateWithSound} />
          <p className="decision-step-note">已经花费的时间块不会因为返回本步骤而退还。</p>
        </div>
      ) : null}

      {step.id === "schedule" ? (
        <div className="decision-step-body">
          <FocusSelector
            monthIndex={session.state.monthIndex}
            state={session.state}
            theme={session.scene.theme}
            onSelect={(focusId) => selectFocusWithTelemetry(session, focusId)}
          />
          <p className="decision-step-note">日程在最终确认前都可以回来重新选择。</p>
        </div>
      ) : null}

      {step.id === "viewpoint" ? (
        <ViewpointStep
          commitment={commitment}
          draftDecision={draftDecision}
          session={session}
          onCommitmentChange={onCommitmentChange}
          onDraft={setDraftDecision}
        />
      ) : null}

      {step.id === "confirm" ? (
        <ConfirmStep
          commitment={commitment}
          draftDecision={draftDecision}
          focusLabel={currentFocus.label}
          remainingTime={remainingTime}
          session={session}
          submitDecision={submitDecision}
          onBack={() => goToStep(stepIndex - 1)}
        />
      ) : null}

      {step.id !== "confirm" ? (
        <div className="decision-step-actions">
          <button
            className="secondary-action"
            disabled={stepIndex === 0}
            type="button"
            onClick={() => goToStep(stepIndex - 1)}
          >
            上一步
          </button>
          <button
            className="primary-action"
            disabled={nextDisabled}
            type="button"
            onClick={() => goToStep(stepIndex + 1)}
          >
            {nextDisabled ? "先选择方案草案" : "下一步"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CareerDecisionFlow({ session, commitment, onCommitmentChange, submitDecision }: DecisionFlowProps) {
  const view = buildSceneView(session);
  const decisionNode = view.decisionNode;
  const pressure = stakeholderPressureFor(session.state.year, session.state.monthIndex);
  if (!decisionNode) return null;

  return (
    <>
      <aside className="stakeholder-pressure">
        <header>
          <span>{pressure.source}</span>
          <strong>{pressure.title}</strong>
        </header>
        <p>{pressure.detail}</p>
        <small>{pressure.tradeoff}</small>
      </aside>
      <ResearchBriefs node={decisionNode} />
      <InvestigationPanel meta={session.rebirth} state={session.state} onInvestigate={session.investigateWithSound} />
      <FocusSelector
        monthIndex={session.state.monthIndex}
        state={session.state}
        theme={session.scene.theme}
        onSelect={(focusId) => selectFocusWithTelemetry(session, focusId)}
      />
      <ResearchCommitmentPanel commitment={commitment} onChange={onCommitmentChange} />
      <div className="options">
        {view.topDecisions.map((decision, index) => (
          <DecisionCard decision={decision} index={index} key={decision.id} experienceMode={session.rebirth.experienceMode} state={session.state} onChoose={submitDecision} />
        ))}
      </div>
    </>
  );
}

function DecisionPanel({ session }: { session: GameSession }) {
  const [commitment, setCommitment] = useState(createDefaultResearchCommitment);
  const narrowViewport = useNarrowDecisionViewport();
  const policy = experiencePolicy(session.rebirth.experienceMode);
  const view = buildSceneView(session);
  const decisionNode = view.decisionNode;
  if (!decisionNode) return null;
  const result = session.state.locked ? view.last : undefined;

  if (session.state.locked) {
    return (
      <div className="decision-result" aria-live="polite">
        <div className="decision-result-copy">
          <span>本话结算</span>
          <strong>{view.resultText}</strong>
          <p>{view.resultDetail}</p>
        </div>
        <StoryRecapPanel experienceMode={session.rebirth.experienceMode} result={result} state={session.state} />
      </div>
    );
  }

  const submitDecision: GameSession["makeDecisionWithSound"] = (decision) => {
    recordPlaytestEvent("decision_submit", {
      year: session.state.year,
      month: session.state.monthIndex + 1,
      cycle: session.rebirth.cycle,
      decisionId: decision.id,
      experienceMode: session.rebirth.experienceMode,
      confidence: policy.showResearchCommitment ? commitment.confidence : "assisted",
      falsifier: policy.showResearchCommitment ? commitment.falsifier : "assisted",
      reviewChecks: policy.showResearchCommitment ? completedReviewCount(commitment) : 3,
    });
    session.makeDecisionWithSound(decision, policy.showResearchCommitment ? commitment : undefined);
  };

  return (
    <div className={`immersive-decision-panel experience-${policy.id}`}>
      <div className="decision-prompt">
        <span>{policy.id === "romance" ? "本话剧情选择" : "本话研究选择"}</span>
        <strong>{decisionNode.decisionPrompt || session.story.mission}</strong>
      </div>
      {policy.id === "romance" ? (
        <>
          <aside className="romance-assist-note">
            <span>剧情辅助已开启</span>
            <strong>研究细节会采用稳健方案，你只需要决定如何回应眼前的人。</strong>
            <small>关系中的承诺、诚实和边界仍会真实影响后续剧情。</small>
          </aside>
          <div className="options">
            {view.topDecisions.map((decision, index) => (
              <DecisionCard decision={decision} index={index} key={decision.id} experienceMode={session.rebirth.experienceMode} state={session.state} onChoose={submitDecision} />
            ))}
          </div>
        </>
      ) : narrowViewport ? (
        <DecisionStepper commitment={commitment} session={session} submitDecision={submitDecision} onCommitmentChange={setCommitment} />
      ) : (
        <CareerDecisionFlow commitment={commitment} session={session} submitDecision={submitDecision} onCommitmentChange={setCommitment} />
      )}
    </div>
  );
}

function changeYearFromSettings(session: GameSession, year: string): void {
  const url = new URL(window.location.href);
  if (year === "2025") url.searchParams.delete("year");
  else url.searchParams.set("year", year);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  session.changeYear(year);
}

interface SettingsPopoverProps extends Omit<ImmersiveGameScreenProps, "usePixiStage"> {
  showExactMetrics: boolean;
  onToggleExactMetrics: () => void;
}

function SettingsPopover({ audio, session, settingsOpen, settingsRef, setSettingsOpen, themeControl, showExactMetrics, onToggleExactMetrics }: SettingsPopoverProps) {
  const policy = experiencePolicy(session.rebirth.experienceMode);
  return (
    <div className="immersive-settings" ref={settingsRef}>
      <button
        className={`immersive-icon-button ${settingsOpen ? "active" : ""}`}
        type="button"
        aria-label="打开设置"
        aria-expanded={settingsOpen}
        onClick={() => setSettingsOpen((open) => !open)}
      >
        ☰
      </button>
      {settingsOpen ? (
        <div className="immersive-settings-popover">
          <div className="settings-row">
            <span>年份线</span>
            <div className="settings-years">
              {GAME_YEARS.map((year) => (
                <button
                  className={year === session.state.year ? "active" : ""}
                  aria-pressed={year === session.state.year}
                  key={year}
                  type="button"
                  onClick={() => changeYearFromSettings(session, year)}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-row settings-switches">
            <button type="button" onClick={themeControl.toggleTheme}>
              {themeControl.theme === "dark" ? "浅色" : "深色"}
            </button>
            <button aria-pressed={audio.musicOn} type="button" onClick={() => void audio.toggleMusic()}>
              音乐 {audio.musicOn ? "开" : "关"}
            </button>
            <button aria-pressed={audio.soundOn} type="button" onClick={() => void audio.toggleSound()}>
              音效 {audio.soundOn ? "开" : "关"}
            </button>
            {policy.showCareerMetrics ? (
              <button aria-pressed={showExactMetrics} type="button" onClick={onToggleExactMetrics}>
                指标 {showExactMetrics ? "精确" : "叙事"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                const message =
                  policy.id === "romance"
                    ? "重新开始会覆盖当前剧情进度，但不会改变本存档的体验模式。确定继续吗？"
                    : "重新开始会覆盖当前年份的本周目存档，但保留已经获得的记忆钥匙和研究捷径。确定继续吗？";
                if (window.confirm(message)) session.restart();
              }}
            >
              重新开始
            </button>
          </div>
          <small className="metric-mode-note">
            {policy.id === "romance" ? "剧情模式会协助处理职业细节，当前存档的体验模式在新游戏时确定。" : "叙事指标隐藏精确关系与职业数值。精确指标用于攻略、调试和复盘。"}
          </small>
          <SaveTransferPanel year={session.state.year} />
        </div>
      ) : null}
    </div>
  );
}

export function ImmersiveGameScreen(props: ImmersiveGameScreenProps) {
  const { session, usePixiStage } = props;
  const view = buildSceneView(session);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [showExactMetrics, setShowExactMetrics] = useState(readExactMetricPreference);
  const policy = experiencePolicy(session.rebirth.experienceMode);
  const isDebate = isDebateNode(session.sceneNode) && Boolean(session.scene.theme.competingHypotheses);
  const headerCopy = useMemo(() => {
    if (session.state.finished) return { name: "年度复盘", role: `${session.state.year} 年研究结局` };
    if (isDebate) return { name: "观点交锋", role: "同一事实，三种框架" };
    return {
      name: view.speakerName,
      role: `${view.speakerRole} · ${view.activeCharacter.tag}`,
    };
  }, [isDebate, session.state.finished, session.state.year, view.activeCharacter.tag, view.speakerName, view.speakerRole]);

  useEffect(() => {
    writeSessionEnvelope(localStorage, session.state, session.rebirth);
  }, [session.rebirth, session.state]);

  useEffect(() => {
    recordPlaytestEvent("scene_view", {
      year: session.state.year,
      month: session.state.monthIndex + 1,
      cycle: session.rebirth.cycle,
      sceneNodeId: session.sceneNode.id,
      sceneNodeType: session.sceneNode.type,
    });
  }, [session.rebirth.cycle, session.sceneNode.id, session.sceneNode.type, session.state.monthIndex, session.state.year]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("button, input, select, textarea, summary, a, [role='button']")) return;
      if (event.key === "Escape" && archiveOpen) {
        event.preventDefault();
        setArchiveOpen(false);
        return;
      }
      if (archiveOpen || props.settingsOpen) return;
      if (event.key === "ArrowLeft" && session.canGoBack) {
        event.preventDefault();
        session.goBack();
      }
      if ((event.key === "Enter" || event.key === " ") && session.sceneCanAdvance) {
        event.preventDefault();
        session.advanceCurrentScene();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [archiveOpen, props.settingsOpen, session]);

  const toggleExactMetrics = () => {
    setShowExactMetrics((current) => {
      const next = !current;
      try {
        localStorage.setItem("rebirthShowExactMetrics", next ? "1" : "0");
      } catch {
        // Storage may be unavailable in strict privacy modes.
      }
      return next;
    });
  };

  return (
    <main className={`immersive-app character-${view.activeCharacter.color}`}>
      <header className="immersive-topbar">
        <div className="immersive-brand">
          <span>重生投研部</span>
          <strong>{session.scene.theme.title}</strong>
          <small>
            {policy.id === "romance"
              ? `${session.scene.label} · ${policy.label} · 剧情 ${view.sceneProgress}`
              : `${session.scene.label} · ${policy.label} · 第 ${session.rebirth.cycle} 周目 · 剧情 ${view.sceneProgress}`}
          </small>
        </div>
        <SettingsPopover {...props} showExactMetrics={showExactMetrics} onToggleExactMetrics={toggleExactMetrics} />
      </header>
      <StatusBar experienceMode={session.rebirth.experienceMode} state={session.state} showExactMetrics={showExactMetrics} />
      <section className="immersive-workspace" aria-label="剧情舞台与操作区">
        <div className="immersive-stage" aria-hidden="true">
          <StageArt activeCharacter={view.activeCharacter} activePose={view.scenePose} sceneBackground={view.sceneBackground} showDebate={isDebate} usePixiStage={usePixiStage} />
        </div>
        <div className="immersive-stage-meta">
          {isDebate ? (
            <span>三种框架并列</span>
          ) : (
            <>
              <span>{view.activeCharacter.name}路线</span>
              <span>
                {policy.showCareerMetrics && showExactMetrics
                  ? `关系 ${session.state.relations[view.activeCharacter.id]}`
                  : relationshipSignal(session.state.relations[view.activeCharacter.id])}
              </span>
            </>
          )}
          <span>{view.sceneMood}</span>
        </div>
        <section className={`interaction-panel ${session.state.finished ? "ending-mode" : view.isDecision ? "decision-mode" : "dialogue-mode"}`}>
          <div aria-label={isDebate ? "观点内容" : view.isDecision ? "选择内容" : "对白内容"} className="interaction-scroll" tabIndex={0}>
            <div className="speaker-row">
              <span className="speaker-name">{headerCopy.name}</span>
              <span className="speaker-role">{headerCopy.role}</span>
            </div>
            {session.state.finished ? (
              <EndingPanel experienceMode={session.rebirth.experienceMode} state={session.state} />
            ) : isDebate ? (
              <DebatePanel hypotheses={session.scene.theme.competingHypotheses} />
            ) : view.isDecision ? (
              <DecisionPanel session={session} />
            ) : (
              <DialogueCopy experienceMode={session.rebirth.experienceMode} prompt={view.prompt} sceneNodeId={session.sceneNode.id} text={view.dialogue} />
            )}
          </div>
          <footer className="interaction-actions">
            <button className="secondary-action" disabled={!session.canGoBack} type="button" onClick={session.goBack}>
              ← 上一句
            </button>
            <button className="secondary-action" disabled={!session.canSkipRead} type="button" onClick={session.skipReadScene}>
              跳过已读
            </button>
            <button
              className="secondary-action"
              type="button"
              onFocus={() => void loadArchiveDrawer()}
              onPointerEnter={() => void loadArchiveDrawer()}
              onClick={() => setArchiveOpen(true)}
            >
              {policy.id === "romance" ? "剧情回顾" : "档案与研究室"}
            </button>
            <button className="primary-action" disabled={!session.sceneCanAdvance} type="button" onClick={session.advanceCurrentScene}>
              {view.advanceLabel}
            </button>
          </footer>
        </section>
      </section>
      {archiveOpen ? (
        <Suspense
          fallback={
            <div className="archive-backdrop" role="status">
              <aside className="archive-drawer">
                <div className="archive-scroll">
                  <p className="archive-empty">正在打开档案。纸很多，浏览器正在翻。</p>
                </div>
              </aside>
            </div>
          }
        >
          <ArchiveDrawer session={session} onClose={() => setArchiveOpen(false)} />
        </Suspense>
      ) : null}
    </main>
  );
}
