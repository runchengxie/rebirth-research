import { describe, expect, it } from "vitest";
import { FOCUS_ACTIONS } from "./content";
import {
  advanceScene,
  chooseOption,
  createInitialState,
  currentSceneNode,
  nextMonth,
  sceneForMonth,
  selectFocus,
} from "./engine";
import type { GameDataYear, StockOption } from "../types";

const best: StockOption = {
  id: "best",
  tsCode: "000001.SZ",
  name: "闪光股份",
  industry: "甜点科技",
  market: "主板",
  activeRank: 12,
  returnRank: 1,
  returnRate: 0.2,
  tradingDays: 20,
  isBest: true,
};

const other: StockOption = {
  id: "other",
  tsCode: "000002.SZ",
  name: "支线股份",
  industry: "粉蓝制造",
  market: "主板",
  activeRank: 80,
  returnRank: 60,
  returnRate: 0.08,
  tradingDays: 20,
  isBest: false,
};

const fixture: GameDataYear = {
  year: 2025,
  initialCapital: 10000,
  targetCapital: 100000000,
  perfectCapital: 12000,
  months: [
    {
      month: "2025-01",
      label: "2025年1月",
      marketStart: "20250102",
      marketEnd: "20250131",
      candidateCount: 500,
      best,
      options: [best, other],
    },
    {
      month: "2025-02",
      label: "2025年2月",
      marketStart: "20250203",
      marketEnd: "20250228",
      candidateCount: 500,
      best,
      options: [best, other],
    },
  ],
};

describe("game engine", () => {
  it("creates the initial route state", () => {
    const state = createInitialState("2025", fixture);

    expect(state.capital).toBe(10000);
    expect(state.focusId).toBe("research");
    expect(state.affection.rina).toBeGreaterThan(state.affection.mei);
    expect(state.locked).toBe(false);
  });

  it("selects a focus before locking the round", () => {
    const state = createInitialState("2025", fixture);
    const next = selectFocus(state, "date");

    expect(next.focusId).toBe("date");
  });

  it("applies stock return, focus modifiers, and route affection", () => {
    const state = selectFocus(createInitialState("2025", fixture), "research");
    const result = chooseOption(state, fixture, best);
    const research = FOCUS_ACTIONS.find((item) => item.id === "research");

    expect(result.locked).toBe(true);
    expect(result.selectedId).toBe(best.id);
    expect(result.history).toHaveLength(1);
    expect(result.history[0].finalRate).toBeCloseTo(best.returnRate + (research?.returnBonus ?? 0));
    expect(result.capital).toBeCloseTo(12150);
    expect(result.affection.rina).toBeGreaterThan(state.affection.rina);
  });

  it("moves to the next month only after a locked round", () => {
    const state = createInitialState("2025", fixture);
    const unlocked = nextMonth(state, fixture);
    const locked = chooseOption(state, fixture, other);
    const advanced = nextMonth(locked, fixture);

    expect(unlocked.monthIndex).toBe(0);
    expect(advanced.monthIndex).toBe(1);
    expect(advanced.locked).toBe(false);
    expect(advanced.selectedId).toBeNull();
  });

  it("walks scripted dialogue into the stock round node", () => {
    const scene = sceneForMonth(0);
    const stockRoundIndex = scene.nodes.findIndex((node) => node.type === "stockRound");
    let state = createInitialState("2025", fixture);

    expect(currentSceneNode(state).type).toBe("line");
    for (let index = 0; index < stockRoundIndex; index += 1) {
      state = advanceScene(state, fixture);
    }

    expect(currentSceneNode(state).type).toBe("stockRound");
    expect(advanceScene(state, fixture).sceneNodeIndex).toBe(state.sceneNodeIndex);
  });

  it("continues post-choice dialogue before moving to the next month", () => {
    const scene = sceneForMonth(0);
    const stockRoundIndex = scene.nodes.findIndex((node) => node.type === "stockRound");
    let state = createInitialState("2025", fixture);

    for (let index = 0; index < stockRoundIndex; index += 1) {
      state = advanceScene(state, fixture);
    }

    const locked = chooseOption(state, fixture, best);
    const postChoice = advanceScene(locked, fixture);

    expect(currentSceneNode(postChoice).type).toBe("line");
    expect(postChoice.monthIndex).toBe(0);
    expect(postChoice.sceneNodeIndex).toBe(stockRoundIndex + 1);
  });
});
