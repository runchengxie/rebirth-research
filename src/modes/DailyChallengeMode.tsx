import { useMemo, useState } from "react";
import { GAME_DATA } from "../data/gameData";
import {
  buildCommitteeRounds,
  builtInCaseFromTheme,
  evaluateCommittee,
  type CommitteeCase,
  type CommitteeScore,
} from "../game/committeeMode";
import {
  currentDailyStreak,
  dailyChallengeFor,
  dailyShareText,
  readDailyResults,
  saveDailyResult,
  type DailyResult,
} from "../game/dailyChallenge";
import {
  createDefaultResearchCommitment,
  type ResearchCommitment,
} from "../game/researchCommitment";
import { ResearchCommitmentPanel } from "../components/ResearchCommitmentPanel";

function dailyCases(): CommitteeCase[] {
  return GAME_DATA["2025"].scenes.map((scene) => {
    const node = scene.nodes.find((item) => item.type === "decision");
    return builtInCaseFromTheme(scene.theme, node?.decisions ?? [], scene.label);
  });
}

export function DailyChallengeMode() {
  const cases = useMemo(() => dailyCases(), []);
  const challenge = useMemo(() => dailyChallengeFor(cases), [cases]);
  const existing = readDailyResults().find((item) => item.date === challenge.date) ?? null;
  const [decisionId, setDecisionId] = useState("");
  const [commitment, setCommitment] = useState<ResearchCommitment>(createDefaultResearchCommitment);
  const [roundIndex, setRoundIndex] = useState(-1);
  const [responses, setResponses] = useState<string[]>([]);
  const [result, setResult] = useState<DailyResult | null>(existing);
  const [practice, setPractice] = useState(false);
  const [status, setStatus] = useState("");

  const caseData = challenge.caseData;
  const decision = caseData.decisions.find((item) => item.id === decisionId) ?? null;
  const rounds = buildCommitteeRounds(caseData);
  const activeRound = roundIndex >= 0 && roundIndex < rounds.length ? rounds[roundIndex] : null;
  const results = readDailyResults();
  const streak = currentDailyStreak(results);

  const start = () => {
    if (!decision) {
      setStatus("先选研究方案。每日挑战也没有替人承担结论的服务窗口。");
      return;
    }
    setResponses([]);
    setResult(null);
    setRoundIndex(0);
    setStatus("");
  };

  const answer = (responseId: string) => {
    if (!decision) return;
    const nextResponses = [...responses, responseId];
    if (roundIndex < rounds.length - 1) {
      setResponses(nextResponses);
      setRoundIndex(roundIndex + 1);
      return;
    }
    const score: CommitteeScore = evaluateCommittee(decision, commitment, rounds, nextResponses);
    const dailyResult: DailyResult = {
      date: challenge.date,
      caseId: caseData.id,
      caseTitle: caseData.title,
      score,
      decisionLabel: decision.label,
      completedAt: new Date().toISOString(),
    };
    if (!practice) saveDailyResult(dailyResult);
    setResponses(nextResponses);
    setResult(dailyResult);
    setRoundIndex(rounds.length);
  };

  const restartPractice = () => {
    setPractice(true);
    setDecisionId("");
    setCommitment(createDefaultResearchCommitment());
    setRoundIndex(-1);
    setResponses([]);
    setResult(null);
    setStatus("练习结果不会覆盖今日首次记录。人类总算允许一次不写进绩效的重来。");
  };

  const copyShare = async () => {
    if (!result) return;
    const text = dailyShareText(result, currentDailyStreak(readDailyResults()));
    try {
      await navigator.clipboard.writeText(text);
      setStatus("每日挑战结果已复制。");
    } catch {
      setStatus(text);
    }
  };

  return (
    <main className="platform-screen daily-mode">
      <header className="platform-hero daily-hero">
        <span>{challenge.date} · 全员同题</span>
        <h1>每日研究挑战</h1>
        <p>案例由本地日期确定，同一天打开网页的玩家面对相同事件与约束，不需要服务器替大家制造排行榜焦虑。</p>
        <div className="daily-streak"><strong>{streak}</strong><span>连续完成天数</span></div>
      </header>

      <section className="platform-panel daily-card">
        <div className="daily-constraint">
          <span>{challenge.constraint.label}</span>
          <p>{challenge.constraint.description}</p>
        </div>
        <span>{caseData.sourceLabel}</span>
        <h2>{caseData.title}</h2>
        <p>{caseData.context}</p>

        {result && !practice && roundIndex < 0 ? (
          <div className="daily-complete">
            <span>今日已完成</span>
            <strong>{result.score.grade} · {result.score.total}/100</strong>
            <p>{result.score.verdict}</p>
            <div className="platform-actions">
              <button type="button" onClick={copyShare}>复制今日结果</button>
              <button type="button" onClick={restartPractice}>再次练习</button>
            </div>
          </div>
        ) : null}

        {!result && roundIndex < 0 ? (
          <>
            <div className="daily-decisions">
              {caseData.decisions.map((item) => (
                <button
                  className={decisionId === item.id ? "active" : ""}
                  key={item.id}
                  type="button"
                  onClick={() => setDecisionId(item.id)}
                >
                  <strong>{item.label}</strong>
                  <p>{item.description}</p>
                </button>
              ))}
            </div>
            <ResearchCommitmentPanel commitment={commitment} onChange={setCommitment} />
            <button className="platform-primary" type="button" onClick={start}>开始今日答辩</button>
          </>
        ) : null}

        {activeRound ? (
          <div className={`committee-room daily-room scene-${activeRound.examiner.scene}`}>
            <div className="examiner-card">
              <span>{activeRound.examiner.initials}</span>
              <div>
                <strong>{activeRound.examiner.name}</strong>
                <small>{activeRound.examiner.role} · {roundIndex + 1}/{rounds.length}</small>
              </div>
            </div>
            <blockquote>{activeRound.question}</blockquote>
            <div className="committee-responses">
              {activeRound.responses.map((response) => (
                <button key={response.id} type="button" onClick={() => answer(response.id)}>
                  <strong>{response.label}</strong>
                  <span>{response.detail}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {result && (practice || roundIndex >= rounds.length) ? (
          <div className="committee-result daily-result">
            <div className="committee-grade"><span>{result.score.grade}</span><strong>{result.score.total}/100</strong></div>
            <h2>{result.score.verdict}</h2>
            <p>{caseData.outcome}</p>
            <div className="platform-actions">
              <button type="button" onClick={copyShare}>复制结果</button>
              <button type="button" onClick={restartPractice}>重新练习</button>
            </div>
          </div>
        ) : null}
        {status ? <p className="platform-status" role="status">{status}</p> : null}
      </section>
    </main>
  );
}
