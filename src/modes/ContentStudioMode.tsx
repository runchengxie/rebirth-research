import { useMemo, useRef, useState } from "react";
import type { DecisionMethod, DecisionQuality } from "../types";
import {
  createStarterCommunityPack,
  deleteCommunityPack,
  parseCommunityPack,
  readCommunityPacks,
  validateCommunityPack,
  writeCommunityPack,
  type CommunityCase,
  type CommunityDecision,
  type CommunityPack,
} from "../game/communityContent";

const METHODS: Array<{ id: DecisionMethod; label: string }> = [
  { id: "fundamental_research", label: "基本面研究" },
  { id: "field_research", label: "一线验证" },
  { id: "quantitative_research", label: "量化研究" },
  { id: "risk_management", label: "风险管理" },
  { id: "communication", label: "沟通表达" },
  { id: "collaboration", label: "团队协作" },
  { id: "committee_process", label: "投委会流程" },
  { id: "self_management", label: "自我管理" },
  { id: "market_chasing", label: "追逐热度" },
];

const QUALITIES: Array<{ id: DecisionQuality; label: string }> = [
  { id: "sound", label: "方法完整" },
  { id: "mixed", label: "证据有缺口" },
  { id: "reckless", label: "跳过验证" },
];

function downloadJson(pack: CommunityPack): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${pack.id}.rebirth-pack.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function freshDecision(): CommunityDecision {
  return {
    id: `decision-${crypto.randomUUID()}`,
    label: "新的研究方案",
    description: "写清楚玩家要做什么、为什么合理，以及它忽略了什么。",
    method: "fundamental_research",
    quality: "mixed",
    evidence: 10,
    clarity: 10,
    risk: 10,
    reflection: 5,
  };
}

function freshCase(): CommunityCase {
  return {
    id: `case-${crypto.randomUUID()}`,
    title: "新的研究案例",
    context: "描述玩家在当下能够看到的公开信息和组织压力。",
    futureMemory: "描述玩家记得的未来碎片，同时保留无法证明的部分。",
    fundamentalHypothesis: "基本面框架如何拆解同一个事件。",
    quantitativeHypothesis: "量化与资金信号如何检验同一个事件。",
    riskHypothesis: "风险框架如何定义错误情景和退出条件。",
    outcome: "描述后来显现的业务事实，避免把价格涨跌当作唯一裁判。",
    decisions: [freshDecision(), freshDecision()],
  };
}

function updateCase(
  pack: CommunityPack,
  caseIndex: number,
  updater: (caseData: CommunityCase) => CommunityCase,
): CommunityPack {
  return {
    ...pack,
    updatedAt: new Date().toISOString(),
    cases: pack.cases.map((item, index) => index === caseIndex ? updater(item) : item),
  };
}

function updateDecision(
  pack: CommunityPack,
  caseIndex: number,
  decisionIndex: number,
  updater: (decision: CommunityDecision) => CommunityDecision,
): CommunityPack {
  return updateCase(pack, caseIndex, (caseData) => ({
    ...caseData,
    decisions: caseData.decisions.map((item, index) => index === decisionIndex ? updater(item) : item),
  }));
}

function Field({
  label,
  value,
  multiline = false,
  onChange,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="studio-field">
      <span>{label}</span>
      {multiline ? (
        <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function NumberField({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="studio-number-field">
      <span>{label}</span>
      <input
        max={max}
        min={0}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <small>/ {max}</small>
    </label>
  );
}

function installedPacksForRevision(revision: number): CommunityPack[] {
  void revision;
  return readCommunityPacks();
}

export function ContentStudioMode() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pack, setPack] = useState<CommunityPack>(createStarterCommunityPack);
  const [caseIndex, setCaseIndex] = useState(0);
  const [status, setStatus] = useState("");
  const [importText, setImportText] = useState("");
  const [libraryRevision, setLibraryRevision] = useState(0);
  const installedPacks = useMemo(
    () => installedPacksForRevision(libraryRevision),
    [libraryRevision],
  );
  const validation = useMemo(() => validateCommunityPack(pack), [pack]);
  const activeCase = pack.cases[Math.min(caseIndex, pack.cases.length - 1)];

  const patchPack = (patch: Partial<CommunityPack>) => {
    setPack((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }));
  };

  const patchCase = (patch: Partial<CommunityCase>) => {
    setPack((current) => updateCase(current, caseIndex, (item) => ({ ...item, ...patch })));
  };

  const savePack = () => {
    try {
      writeCommunityPack(pack);
      setLibraryRevision((value) => value + 1);
      setStatus("内容包已保存到本地案例库，可以直接在投委会模式中游玩。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "内容包保存失败。");
    }
  };

  const importPack = (raw: string) => {
    try {
      const parsed = parseCommunityPack(raw);
      setPack(parsed);
      setCaseIndex(0);
      setImportText("");
      setStatus("内容包已载入编辑器。导入不会自动覆盖本地案例库。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "无法导入内容包。");
    }
  };

  const loadInstalled = (selected: CommunityPack) => {
    setPack(structuredClone(selected));
    setCaseIndex(0);
    setStatus(`已打开「${selected.title}」。`);
  };

  if (!activeCase) return null;

  return (
    <main className="platform-screen studio-mode">
      <header className="platform-hero studio-hero">
        <span>社区创作工具</span>
        <h1>研究案例内容工坊</h1>
        <p>用结构化表单编写公开信息、未来记忆、三方假设、业务事实和研究方案。内容包通过校验后可直接进入独立投委会模式。</p>
      </header>

      <section className="studio-layout">
        <aside className="platform-panel studio-library">
          <header><span>本地案例库</span><strong>{installedPacks.length}</strong></header>
          <button type="button" onClick={() => {
            setPack(createStarterCommunityPack());
            setCaseIndex(0);
            setStatus("已创建新的内容包草稿。");
          }}>新建内容包</button>
          {installedPacks.map((item) => (
            <div className="studio-library-item" key={item.id}>
              <button type="button" onClick={() => loadInstalled(item)}>
                <strong>{item.title}</strong>
                <small>{item.author} · {item.cases.length} 个案例</small>
              </button>
              <button
                aria-label={`删除 ${item.title}`}
                type="button"
                onClick={() => {
                  if (!window.confirm(`删除本地内容包「${item.title}」？`)) return;
                  deleteCommunityPack(item.id);
                  setLibraryRevision((value) => value + 1);
                }}
              >
                ×
              </button>
            </div>
          ))}
          <div className="studio-import">
            <strong>导入内容包</strong>
            <button type="button" onClick={() => fileRef.current?.click()}>选择 JSON 文件</button>
            <input
              accept="application/json,.json"
              hidden
              ref={fileRef}
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void file.text().then(importPack);
                event.currentTarget.value = "";
              }}
            />
            <textarea
              placeholder="粘贴内容包 JSON"
              rows={5}
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
            />
            <button disabled={!importText.trim()} type="button" onClick={() => importPack(importText)}>解析粘贴内容</button>
          </div>
        </aside>

        <section className="platform-panel studio-editor">
          <div className="studio-toolbar">
            <div>
              <span>内容包</span>
              <strong>{pack.title}</strong>
            </div>
            <div className="platform-actions">
              <button type="button" onClick={savePack}>保存到案例库</button>
              <button type="button" onClick={() => downloadJson(pack)}>导出 JSON</button>
            </div>
          </div>

          <div className="studio-metadata">
            <Field label="内容包标题" value={pack.title} onChange={(title) => patchPack({ title })} />
            <Field label="作者" value={pack.author} onChange={(author) => patchPack({ author })} />
            <Field label="说明" multiline value={pack.description} onChange={(description) => patchPack({ description })} />
          </div>

          <div className="studio-case-tabs">
            {pack.cases.map((item, index) => (
              <button
                className={index === caseIndex ? "active" : ""}
                key={item.id}
                type="button"
                onClick={() => setCaseIndex(index)}
              >
                {index + 1}. {item.title}
              </button>
            ))}
            <button type="button" onClick={() => {
              setPack((current) => ({ ...current, cases: [...current.cases, freshCase()] }));
              setCaseIndex(pack.cases.length);
            }}>＋ 新案例</button>
          </div>

          <div className="studio-case-fields">
            <Field label="案例标题" value={activeCase.title} onChange={(title) => patchCase({ title })} />
            <Field label="公开信息" multiline value={activeCase.context} onChange={(context) => patchCase({ context })} />
            <Field label="未来记忆" multiline value={activeCase.futureMemory} onChange={(futureMemory) => patchCase({ futureMemory })} />
            <Field label="基本面假设" multiline value={activeCase.fundamentalHypothesis} onChange={(fundamentalHypothesis) => patchCase({ fundamentalHypothesis })} />
            <Field label="量化假设" multiline value={activeCase.quantitativeHypothesis} onChange={(quantitativeHypothesis) => patchCase({ quantitativeHypothesis })} />
            <Field label="风险假设" multiline value={activeCase.riskHypothesis} onChange={(riskHypothesis) => patchCase({ riskHypothesis })} />
            <Field label="业务事实结算" multiline value={activeCase.outcome} onChange={(outcome) => patchCase({ outcome })} />
          </div>

          <div className="studio-decisions">
            <header>
              <div><span>研究方案</span><strong>{activeCase.decisions.length}</strong></div>
              <button type="button" onClick={() => patchCase({ decisions: [...activeCase.decisions, freshDecision()] })}>新增方案</button>
            </header>
            {activeCase.decisions.map((decision, decisionIndex) => (
              <article key={decision.id}>
                <div className="studio-decision-head">
                  <strong>方案 {decisionIndex + 1}</strong>
                  <button
                    disabled={activeCase.decisions.length <= 2}
                    type="button"
                    onClick={() => patchCase({ decisions: activeCase.decisions.filter((_, index) => index !== decisionIndex) })}
                  >
                    删除
                  </button>
                </div>
                <Field label="方案名称" value={decision.label} onChange={(label) => setPack((current) => updateDecision(current, caseIndex, decisionIndex, (item) => ({ ...item, label })))} />
                <Field label="方案说明" multiline value={decision.description} onChange={(description) => setPack((current) => updateDecision(current, caseIndex, decisionIndex, (item) => ({ ...item, description })))} />
                <div className="studio-select-row">
                  <label><span>研究方法</span><select value={decision.method} onChange={(event) => setPack((current) => updateDecision(current, caseIndex, decisionIndex, (item) => ({ ...item, method: event.target.value as DecisionMethod })))}>{METHODS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                  <label><span>执行质量</span><select value={decision.quality} onChange={(event) => setPack((current) => updateDecision(current, caseIndex, decisionIndex, (item) => ({ ...item, quality: event.target.value as DecisionQuality })))}>{QUALITIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                </div>
                <div className="studio-score-row">
                  <NumberField label="证据" max={20} value={decision.evidence} onChange={(evidence) => setPack((current) => updateDecision(current, caseIndex, decisionIndex, (item) => ({ ...item, evidence })))} />
                  <NumberField label="清晰" max={20} value={decision.clarity} onChange={(clarity) => setPack((current) => updateDecision(current, caseIndex, decisionIndex, (item) => ({ ...item, clarity })))} />
                  <NumberField label="风险" max={20} value={decision.risk} onChange={(risk) => setPack((current) => updateDecision(current, caseIndex, decisionIndex, (item) => ({ ...item, risk })))} />
                  <NumberField label="反思" max={15} value={decision.reflection} onChange={(reflection) => setPack((current) => updateDecision(current, caseIndex, decisionIndex, (item) => ({ ...item, reflection })))} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="platform-panel studio-preview">
          <header><span>实时预览</span><strong>{validation.valid ? "可发布" : "需修正"}</strong></header>
          <div className="studio-preview-scene">
            <span>公开信息</span><h2>{activeCase.title}</h2><p>{activeCase.context}</p>
          </div>
          <div className="studio-hypothesis fundamental"><strong>基本面</strong><p>{activeCase.fundamentalHypothesis}</p></div>
          <div className="studio-hypothesis quant"><strong>量化</strong><p>{activeCase.quantitativeHypothesis}</p></div>
          <div className="studio-hypothesis risk"><strong>风控</strong><p>{activeCase.riskHypothesis}</p></div>
          {!validation.valid ? (
            <ul className="studio-errors">{validation.errors.map((error) => <li key={error}>{error}</li>)}</ul>
          ) : (
            <p className="studio-valid">结构校验通过。保存后即可在投委会案例库中打开。</p>
          )}
          {pack.cases.length > 1 ? (
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(`删除案例「${activeCase.title}」？`)) return;
                setPack((current) => ({ ...current, cases: current.cases.filter((_, index) => index !== caseIndex) }));
                setCaseIndex(Math.max(0, caseIndex - 1));
              }}
            >
              删除当前案例
            </button>
          ) : null}
          {status ? <p className="platform-status" role="status">{status}</p> : null}
        </aside>
      </section>
    </main>
  );
}
