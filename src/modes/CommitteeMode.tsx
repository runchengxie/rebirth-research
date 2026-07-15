import { useEffect, useMemo, useState } from "react";
import { GAME_DATA } from "../data/gameData";
import type { ResearchDecision } from "../types";
import {
  buildCommitteeRounds,
  builtInCaseFromTheme,
  evaluateCommittee,
  type CommitteeCase,
  type CommitteeScore,
} from "../game/committeeMode";
import {
  communityDecisionToResearchDecision,
  readCommunityPacks,
} from "../game/communityContent";
import {
  createDefaultResearchCommitment,
  type ResearchCommitment,
} from "../game/researchCommitment";
import { ResearchCommitmentPanel } from "../components/ResearchCommitmentPanel";

interface CommitteeHistoryItem {
  id: string;
  completedAt: string;
  caseTitle: string;
  decisionLabel: string;
  score: CommitteeScore;
}

const HISTORY_KEY = "rebirthCommitteeHistory:v1";

function builtInCases(): CommitteeCase[] {
  return GAME_DATA["2025"].scenes.map((scene) => {
    const decisionNode = scene.nodes.find((node) => node.type === "decision");
    return builtInCaseFromTheme(
      scene.theme,
      decisionNode?.decisions ?? [],
      `${scene.label} 主线案例`,
    );
  });
}

function communityCases(): CommitteeCase[] {
  return readCommunityPacks().flatMap((pack) => pack.cases.map((caseData) => ({
    id: `${pack.id}:${caseData.id}`,
    title: caseData.title,
    context: caseData.context,
    futureMemory: caseData.futureMemory,
    hypotheses: {
      fundamental: caseData.fundamentalHypothesis,
      quantitative: caseData.quantitativeHypothesis,
      risk: caseData.riskHypothesis,
    },
    outcome: caseData.outcome,
    decisions: caseData.decisions.map(communityDecisionToResearchDecision),
    sourceLabel: `${pack.title} · ${pack.author}`,
  })));
}

function readHistory(): CommitteeHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as CommitteeHistoryItem[] : [];
  } catch {
    return [];
  }
}

function saveHistory(item: CommitteeHistoryItem): void {
  const next = [item, ...readHistory()].slice(0, 30);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

function scoreRows(score: CommitteeScore) {
  return [
    ["证据", score.evidence],
    ["清晰", score.clarity],
    ["风险", score.risk],
    ["沟通", score.communication],
    ["诚信", score.integrity],
    ["校准", score.calibration],
  ] as const;
}

function casesForRevision(revision: number): CommitteeCase[] {
  void revision;
  return [...builtInCases(), ...communityCases()];
}

export function CommitteeMode() {
  const [libraryRevision, setLibraryRevision] = useState(0);
  const cases = useMemo(
    () => casesForRevision(libraryRevision),
    [libraryRevision],
  );
  const [caseId, setCaseId] = useState(cases[0]?.id ?? "");
  const [decisionId, setDecisionId] = useState("");
  const [commitment, setCommitment] = useState<ResearchCommitment>(createDefaultResearchCommitment);
  const [roundIndex, setRoundIndex] = useState(-1);
  const [responses, setResponses] = useState<string[]>([]);
  const [score, setScore] = useState<CommitteeScore | null>(null);
  const [history, setHistory] = useState(readHistory);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const handleChange = () => setLibraryRevision((value) => value + 1);
    window.addEventListener("rebirth-community-packs-changed", handleChange);
    return () => window.removeEventListener("rebirth-community-packs-changed", handleChange);
  }, []);

  const caseData = cases.find((item) => item.id === caseId) ?? cases[0];
  const decision = caseData?.decisions.find((item) => item.id === decisionId) ?? null;
  const rounds = caseData ? buildCommitteeRounds(caseData) : [];
  const activeRound = roundIndex >= 0 ? rounds[roundIndex] : null;

  const resetHearing = (nextCaseId = caseId) => {
    setCaseId(nextCaseId);
    setDecisionId("");
    setCommitment(createDefaultResearchCommitment());
    setRoundIndex(-1);
    setResponses([]);
    setScore(null);
    setStatus("");
  };

  const startHearing = () => {
    if (!decision) {
      setStatus("先选择一项愿意在投委会负责到底的研究方案。");
      return;
    }
    setResponses([]);
    setScore(null);
    setRoundIndex(0);
    setStatus("");
  };

  const answerRound = (responseId: string) => {
    if (!decision || !caseData) return;
    const nextResponses = [...responses, responseId];
    if (roundIndex < rounds.length - 1) {
      setResponses(nextResponses);
      setRoundIndex(roundIndex + 1);
      return;
    }
    const nextScore = evaluateCommittee(decision, commitment, rounds, nextResponses);
    const historyItem: CommitteeHistoryItem = {
      id: crypto.randomUUID(),
      completedAt: new Date().toISOString(),
      caseTitle: caseData.title,
      decisionLabel: decision.label,
      score: nextScore,
    };
    saveHistory(historyItem);
    setHistory(readHistory());
    setResponses(nextResponses);
    setScore(nextScore);
    setRoundIndex(rounds.length);
  };

  const copyResult = async () => {
    if (!score || !caseData || !decision) return;
    const text = [
      "重生投研部 · 独立投委会",
      caseData.title,
      decision.label,
      `评级 ${score.grade} · ${score.total}/100`,
      score.verdict,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setStatus("答辩摘要已复制。终于有一种会议纪要不会在会后神秘失踪。");
    } catch {
      setStatus(text);
    }
  };

  if (!caseData) {
    return <main className="platform-screen"><p>没有可用案例。</p></main>;
  }

  return (
    <main className="platform-screen committee-mode">
      <header className="platform-hero committee-hero">
        <span>独立模式</span>
        <h1>投委会答辩室</h1>
        <p>选定研究方案，声明置信度和失效条件，再接受基金经理、基本面、量化、风控与合规五轮追问。</p>
      </header>

      <section className="platform-grid committee-layout">
        <aside className="platform-panel case-library">
          <header>
            <span>案例库</span>
            <strong>{cases.length} 个案例</strong>
          </header>
          <div className="case-list">
            {cases.map((item) => (
              <button
                className={item.id === caseData.id ? "active" : ""}
                key={item.id}
                type="button"
                onClick={() => resetHearing(item.id)}
              >
                <strong>{item.title}</strong>
                <small>{item.sourceLabel}</small>
              </button>
            ))}
          </div>
          <div className="committee-history">
            <strong>最近答辩</strong>
            {history.slice(0, 5).map((item) => (
              <div key={item.id}>
                <span>{item.score.grade}</span>
                <p>{item.caseTitle}</p>
                <small>{item.score.total}/100</small>
              </div>
            ))}
          </div>
        </aside>

        <section className="platform-panel committee-workspace">
          <div className="case-brief">
            <span>{caseData.sourceLabel}</span>
            <h2>{caseData.title}</h2>
            <p>{caseData.context}</p>
            <details>
              <summary>未来记忆与三种假设</summary>
              <p>{caseData.futureMemory}</p>
              <ul>
                <li><strong>基本面：</strong>{caseData.hypotheses.fundamental}</li>
                <li><strong>量化：</strong>{caseData.hypotheses.quantitative}</li>
                <li><strong>风控：</strong>{caseData.hypotheses.risk}</li>
              </ul>
            </details>
          </div>

          {roundIndex < 0 ? (
            <>
              <div className="committee-decisions">
                {caseData.decisions.map((item: ResearchDecision) => (
                  <button
                    className={item.id === decisionId ? "active" : ""}
                    key={item.id}
                    type="button"
                    onClick={() => setDecisionId(item.id)}
                  >
                    <strong>{item.label}</strong>
                    <p>{item.description}</p>
                    <small>证据 {item.evidenceLevel}/20 · 风险 {item.riskAwareness}/20</small>
                  </button>
                ))}
              </div>
              <ResearchCommitmentPanel commitment={commitment} onChange={setCommitment} />
              <button className="platform-primary" type="button" onClick={startHearing}>
                进入五轮答辩
              </button>
            </>
          ) : null}

          {activeRound ? (
            <div className={`committee-room scene-${activeRound.examiner.scene}`}>
              <div className="examiner-card">
                <span>{activeRound.examiner.initials}</span>
                <div>
                  <strong>{activeRound.examiner.name}</strong>
                  <small>{activeRound.examiner.role} · 第 {roundIndex + 1}/{rounds.length} 轮</small>
                </div>
              </div>
              <blockquote>{activeRound.question}</blockquote>
              <p>{activeRound.context}</p>
              <div className="committee-responses">
                {activeRound.responses.map((response) => (
                  <button key={response.id} type="button" onClick={() => answerRound(response.id)}>
                    <strong>{response.label}</strong>
                    <span>{response.detail}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {score ? (
            <div className="committee-result">
              <div className="committee-grade">
                <span>{score.grade}</span>
                <strong>{score.total}/100</strong>
              </div>
              <h2>{score.verdict}</h2>
              <div className="committee-score-grid">
                {scoreRows(score).map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}/20</strong>
                    <i><b style={{ width: `${value * 5}%` }} /></i>
                  </div>
                ))}
              </div>
              <details open>
                <summary>业务事实复盘</summary>
                <p>{caseData.outcome}</p>
              </details>
              <div className="platform-actions">
                <button type="button" onClick={copyResult}>复制答辩摘要</button>
                <button type="button" onClick={() => resetHearing()}>重新答辩</button>
              </div>
            </div>
          ) : null}
          {status ? <p className="platform-status" role="status">{status}</p> : null}
        </section>
      </section>
    </main>
  );
}
