import { useCallback, useEffect, useRef, useState } from "react";
import { GAME_DATA, GAME_YEARS } from "../data/gameData";
import { ProceduralBgm } from "../audio/bgm";
import { NarrativeAudio } from "../audio/sfx";
import { CHARACTERS } from "../game/content";
import { focusById, makeDecision, selectFocus, storyForMonth } from "../game/engine";
import {
  advanceScene,
  canAdvanceScene,
  canRewindScene,
  createInitialState,
  currentSceneNode,
  rewindScene,
  sceneForMonth,
} from "../game/runtime";
import {
  branchMetaContext,
  completeRebirthCycle,
  createRebirthMeta,
  decisionOptionsForRebirth,
  performInvestigation,
  persistRebirthMeta,
  prepareDecisionForRebirth,
  readRebirthMeta,
  resetRebirthRun,
} from "../game/rebirth";
import {
  isSceneNodeRead,
  markSceneNodeRead,
  skipReadSceneNodes,
} from "../game/rebirthFlow";
import { inspectOfficeProp, type OfficePropId } from "../game/rebirthOffice";
import { persistStoredState, readStoredState as readStoredStateFromStorage } from "../game/saveState";
import type { CharacterId, GameState, ResearchDecision, RoundResult } from "../types";

export function canUsePixiStage(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get("pixi") === "0" || params.get("staticStage") === "1") return false;
  if (params.get("pixi") === "1") return true;

  try {
    const canvas = document.createElement("canvas");
    const contextOptions: WebGLContextAttributes = {
      antialias: false,
      failIfMajorPerformanceCaveat: true,
      powerPreference: "low-power",
    };
    const gl =
      canvas.getContext("webgl2", contextOptions) ??
      canvas.getContext("webgl", contextOptions);
    if (!gl) return false;

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info") as {
      UNMASKED_RENDERER_WEBGL: number;
      UNMASKED_VENDOR_WEBGL: number;
    } | null;
    const renderer = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
      : "";
    const vendor = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL))
      : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !`${vendor} ${renderer}`.toLowerCase().includes("nouveau");
  } catch {
    return false;
  }
}

function readTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function readYearFromUrl(): string | null {
  const year = new URLSearchParams(window.location.search).get("year");
  return year && year in GAME_DATA ? year : null;
}

function bestInitialYear(): string {
  return GAME_YEARS.includes("2025")
    ? "2025"
    : GAME_YEARS[GAME_YEARS.length - 1] || "2025";
}

function readStoredState(year: string): GameState | null {
  try {
    return readStoredStateFromStorage(localStorage, year);
  } catch {
    return null;
  }
}

function persistState(state: GameState): void {
  try {
    persistStoredState(localStorage, state);
  } catch {
    // Storage can be unavailable in strict privacy modes or full sandboxes.
  }
}

function readStoredRebirth(year: string) {
  try {
    return readRebirthMeta(localStorage, year);
  } catch {
    return createRebirthMeta(year);
  }
}

function persistRebirth(meta: ReturnType<typeof createRebirthMeta>): void {
  try {
    persistRebirthMeta(localStorage, meta);
  } catch {
    // Storage can be unavailable in strict privacy modes or full sandboxes.
  }
}

function createSessionState(year = bestInitialYear()) {
  const actualYear = readYearFromUrl() ?? year;
  return {
    state: readStoredState(actualYear) ?? createInitialState(actualYear),
    rebirth: readStoredRebirth(actualYear),
  };
}

type Scene = ReturnType<typeof sceneForMonth>;
type SceneNode = ReturnType<typeof currentSceneNode>;
type Story = ReturnType<typeof storyForMonth>;
type Theme = "light" | "dark";

export function useSettingsMenu() {
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!settingsOpen) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !settingsRef.current?.contains(target)) {
        setSettingsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSettingsOpen(false);
    }
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsOpen]);

  return { settingsOpen, settingsRef, setSettingsOpen };
}

export type SettingsMenu = ReturnType<typeof useSettingsMenu>;

export function useGameAudio() {
  const [musicOn, setMusicOn] = useState(false);
  const [volume, setVolume] = useState(0.22);
  const [soundOn, setSoundOn] = useState(false);
  const [soundVolume, setSoundVolume] = useState(0.18);
  const bgmRef = useRef<ProceduralBgm | null>(null);
  const audioRef = useRef<NarrativeAudio | null>(null);
  const lastLineVoiceRef = useRef("");

  useEffect(() => {
    const controller = bgmRef.current ?? new ProceduralBgm();
    bgmRef.current = controller;
    controller.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    const controller = audioRef.current ?? new NarrativeAudio();
    audioRef.current = controller;
    controller.setVolume(soundVolume);
  }, [soundVolume]);

  useEffect(() => {
    return () => {
      bgmRef.current?.stop();
      audioRef.current?.stop();
    };
  }, []);

  const toggleMusic = useCallback(async () => {
    const controller = bgmRef.current ?? new ProceduralBgm();
    bgmRef.current = controller;
    if (musicOn) {
      controller.stop();
      setMusicOn(false);
      return;
    }
    await controller.start();
    controller.setVolume(volume);
    setMusicOn(true);
  }, [musicOn, volume]);

  const toggleSound = useCallback(async () => {
    const controller = audioRef.current ?? new NarrativeAudio();
    audioRef.current = controller;
    if (soundOn) {
      controller.stop();
      lastLineVoiceRef.current = "";
      setSoundOn(false);
      return;
    }
    await controller.start();
    controller.setVolume(soundVolume);
    lastLineVoiceRef.current = "";
    controller.playPreview();
    setSoundOn(true);
  }, [soundOn, soundVolume]);

  const resetLineVoice = useCallback(() => {
    lastLineVoiceRef.current = "";
  }, []);

  const playLineVoice = useCallback((lineVoiceKey: string, sceneNode: SceneNode) => {
    if (!soundOn || !lineVoiceKey) return;
    if (lastLineVoiceRef.current === lineVoiceKey) return;
    lastLineVoiceRef.current = lineVoiceKey;
    if (sceneNode.type === "dialogue") audioRef.current?.playVoiceLine(sceneNode);
  }, [soundOn]);

  const playAdvance = useCallback(() => {
    if (soundOn) audioRef.current?.playAdvance();
  }, [soundOn]);

  const playChoice = useCallback(() => {
    if (soundOn) audioRef.current?.playChoice();
  }, [soundOn]);

  const playResult = useCallback((tone: "success" | "miss") => {
    if (soundOn) audioRef.current?.playResult(tone);
  }, [soundOn]);

  return {
    musicOn,
    playAdvance,
    playChoice,
    playLineVoice,
    playResult,
    resetLineVoice,
    setSoundVolume,
    setVolume,
    soundOn,
    soundVolume,
    toggleMusic,
    toggleSound,
    volume,
  };
}

export type GameAudio = ReturnType<typeof useGameAudio>;

function useLineVoice(state: GameState, sceneNode: SceneNode, audio: GameAudio): void {
  const { playLineVoice } = audio;
  const lineVoiceKey =
    sceneNode.type === "dialogue"
      && !sceneNode.id.endsWith("-competing")
      && sceneNode.voiceCue !== "silent"
      ? `${state.year}-${state.monthIndex}-${sceneNode.id}`
      : "";

  useEffect(() => {
    playLineVoice(lineVoiceKey, sceneNode);
  }, [lineVoiceKey, playLineVoice, sceneNode]);
}

export function useGameSession(audio: GameAudio) {
  const { playAdvance, playChoice, resetLineVoice } = audio;
  const [initialSession] = useState(createSessionState);
  const [state, setState] = useState<GameState>(initialSession.state);
  const [rebirth, setRebirth] = useState(initialSession.rebirth);
  const data = GAME_DATA[state.year];
  const branchMeta = branchMetaContext(rebirth);
  const scene = sceneForMonth(state, branchMeta);
  const sceneNode = currentSceneNode(state, branchMeta);
  const story = storyForMonth(state.monthIndex, state.year);
  const sceneCanAdvance = canAdvanceScene(state, branchMeta);
  const canGoBack = canRewindScene(state, branchMeta);
  const canSkipRead = rebirth.cycle >= 2
    && sceneNode.type === "dialogue"
    && !state.locked
    && isSceneNodeRead(rebirth, state, sceneNode.id);

  useLineVoice(state, sceneNode, audio);

  useEffect(() => {
    persistState(state);
  }, [state]);

  useEffect(() => {
    persistRebirth(rebirth);
  }, [rebirth]);

  const changeYear = useCallback((year: string) => {
    resetLineVoice();
    setState(readStoredState(year) ?? createInitialState(year));
    setRebirth(readStoredRebirth(year));
  }, [resetLineVoice]);

  const restart = useCallback(() => {
    resetLineVoice();
    setState(createInitialState(state.year));
    setRebirth((current) => resetRebirthRun(current));
  }, [resetLineVoice, state.year]);

  const advanceCurrentScene = useCallback(() => {
    if (!sceneCanAdvance) return;
    playAdvance();
    if (sceneNode.type === "dialogue") {
      setRebirth((current) => markSceneNodeRead(current, state, sceneNode.id));
    }
    const isCycleEnd = state.finished && state.sceneNodeIndex >= scene.nodes.length - 1;
    if (isCycleEnd) {
      const nextRebirth = completeRebirthCycle(rebirth, state);
      setRebirth(nextRebirth);
      setState(createInitialState(state.year));
      resetLineVoice();
      return;
    }
    setState((current) => advanceScene(current, data, branchMetaContext(rebirth)));
  }, [
    data,
    playAdvance,
    rebirth,
    resetLineVoice,
    scene.nodes.length,
    sceneCanAdvance,
    sceneNode,
    state,
  ]);

  const goBack = useCallback(() => {
    if (!canGoBack) return;
    resetLineVoice();
    setState((current) => rewindScene(current, branchMetaContext(rebirth)));
  }, [canGoBack, rebirth, resetLineVoice]);

  const skipReadScene = useCallback(() => {
    if (!canSkipRead) return;
    resetLineVoice();
    setState((current) => skipReadSceneNodes(
      rebirth,
      current,
      data,
      branchMetaContext(rebirth),
    ));
  }, [canSkipRead, data, rebirth, resetLineVoice]);

  const inspectOfficeWithSound = useCallback((propId: OfficePropId) => {
    const result = inspectOfficeProp(rebirth, state, propId);
    if (!result.changed) return;
    playChoice();
    setRebirth(result.meta);
    setState(result.state);
  }, [playChoice, rebirth, state]);

  const selectFocusWithSound = useCallback((focusId: string) => {
    playChoice();
    setState((current) => selectFocus(current, focusId));
  }, [playChoice]);

  const investigateWithSound = useCallback((nodeId: Parameters<typeof performInvestigation>[2]) => {
    const result = performInvestigation(rebirth, state, nodeId);
    if (!result.changed) return;
    playChoice();
    setRebirth(result.meta);
    setState(result.state);
  }, [playChoice, rebirth, state]);

  const makeDecisionWithSound = useCallback((decision: ResearchDecision) => {
    playChoice();
    setState((current) => {
      const prepared = prepareDecisionForRebirth(rebirth, current, decision);
      return makeDecision(current, data, prepared, branchMetaContext(rebirth));
    });
  }, [data, playChoice, rebirth]);

  return {
    advanceCurrentScene,
    canGoBack,
    canSkipRead,
    changeYear,
    data,
    goBack,
    inspectOfficeWithSound,
    investigateWithSound,
    makeDecisionWithSound,
    rebirth,
    restart,
    scene,
    sceneCanAdvance,
    sceneNode,
    selectFocusWithSound,
    skipReadScene,
    state,
    story,
  };
}

export type GameSession = ReturnType<typeof useGameSession>;

export function useThemeControl() {
  const [theme, setTheme] = useState<Theme>(readTheme());
  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("rebirthGameTheme", next);
    } catch {
      // Storage can be unavailable in strict privacy modes.
    }
  }, [theme]);
  return { theme, toggleTheme };
}

export type ThemeControl = ReturnType<typeof useThemeControl>;

function speakerNameFor(
  state: GameState,
  sceneNode: SceneNode,
  story: Story,
  last: RoundResult | undefined,
): string {
  if (state.locked && sceneNode.type === "decision" && last) return story.speaker;
  return sceneNode.type === "dialogue" ? sceneNode.speaker : story.speaker;
}

function speakerRoleFor(
  state: GameState,
  sceneNode: SceneNode,
  story: Story,
  last: RoundResult | undefined,
): string {
  if (state.locked && sceneNode.type === "decision" && last) return story.role;
  return sceneNode.type === "dialogue" ? sceneNode.role : story.role;
}

function resultCopyFor(
  state: GameState,
  sceneNode: SceneNode,
  scene: Scene,
  sceneProgress: string,
  last: RoundResult | undefined,
): { resultText: string; resultDetail: string } {
  if (sceneNode.type === "decision") {
    if (state.locked && last) {
      return { resultText: last.outcome.title, resultDetail: last.outcome.detail };
    }
    return {
      resultText: "选择研究方向",
      resultDetail: `${scene.label} · 选择你的研究方向和工作方式。`,
    };
  }
  if (state.locked && last) {
    return {
      resultText: "结算后剧情",
      resultDetail: `${last.outcome.title} · 剧情节点 ${sceneProgress}。`,
    };
  }
  return {
    resultText: "剧情推进中",
    resultDetail: `${scene.theme.title} · 剧情节点 ${sceneProgress}，继续后会进入本月研究选择。`,
  };
}

function dialogueFor(
  state: GameState,
  sceneNode: SceneNode,
  last: RoundResult | undefined,
): string {
  if (sceneNode.type === "dialogue") return sceneNode.text;
  if (state.locked && last) return last.outcome.dialogue;
  return "四个研究方向已经摆在桌上。先安排本话日程，再选出你要负责的方向。";
}

function promptFor(state: GameState, sceneNode: SceneNode, story: Story): string {
  if (sceneNode.type === "dialogue") return sceneNode.prompt || "点击继续剧情。";
  if (state.locked) return "结算完成，点击继续剧情。";
  return sceneNode.decisionPrompt || story.mission;
}

function advanceLabelFor(
  state: GameState,
  sceneNode: SceneNode,
  isLastSceneNode: boolean,
): string {
  if (sceneNode.type === "decision" && !state.locked) return "先选择研究方向";
  if (state.finished && isLastSceneNode) return "带着记忆重生";
  if (state.locked && isLastSceneNode) return "下一话";
  if (sceneNode.type === "decision" && state.locked) return "继续剧情";
  return "继续";
}

export function buildSceneView(session: GameSession) {
  const { scene, sceneNode, state, story } = session;
  const last = state.history[state.history.length - 1];
  const sceneProgress = `${Math.min(state.sceneNodeIndex + 1, scene.nodes.length)}/${scene.nodes.length}`;
  const isLastSceneNode = state.sceneNodeIndex >= scene.nodes.length - 1;
  const lineCharacterId: CharacterId =
    sceneNode.type === "dialogue" ? sceneNode.characterId : story.characterId;
  const result = resultCopyFor(state, sceneNode, scene, sceneProgress, last);
  const baseDecisions = sceneNode.type === "decision" ? sceneNode.decisions || [] : [];

  return {
    activeCharacter: CHARACTERS[lineCharacterId],
    activeFocus: focusById(state.focusId),
    advanceLabel: advanceLabelFor(state, sceneNode, isLastSceneNode),
    decisionNode: sceneNode.type === "decision" ? sceneNode : null,
    dialogue: dialogueFor(state, sceneNode, last),
    isDecision: sceneNode.type === "decision",
    last,
    prompt: promptFor(state, sceneNode, story),
    resultDetail: result.resultDetail,
    resultText: result.resultText,
    sceneBackground:
      sceneNode.type === "dialogue"
        ? sceneNode.bg || "research-room"
        : sceneNode.bg || "briefing-room",
    sceneMood: sceneNode.type === "dialogue" ? sceneNode.mood : story.mood,
    scenePose: sceneNode.type === "dialogue" ? sceneNode.pose || "neutral" : "thinking",
    sceneProgress,
    speakerName: speakerNameFor(state, sceneNode, story, last),
    speakerRole: speakerRoleFor(state, sceneNode, story, last),
    topDecisions: decisionOptionsForRebirth(session.rebirth, state, baseDecisions),
  };
}

export type SceneView = ReturnType<typeof buildSceneView>;
