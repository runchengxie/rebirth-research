import type { GameState } from "../types";
import {
  contradictionEntries,
  investigationClues,
  investigationNodeViews,
  isInvestigationActive,
  memoryKeyEntries,
  memorySourceNote,
  shortcutEntries,
  type InvestigationNodeId,
  type RebirthMetaState,
} from "../game/rebirth";

export function InvestigationPanel({
  meta,
  state,
  onInvestigate,
}: {
  meta: RebirthMetaState;
  state: GameState;
  onInvestigate: (nodeId: InvestigationNodeId) => void;
}) {
  if (!isInvestigationActive(meta, state)) return null;
  const investigation = meta.investigation;
  if (!investigation) return null;
  const remaining = Math.max(0, investigation.timeBudget - investigation.timeSpent);
  const nodes = investigationNodeViews(meta, state);
  const clues = investigationClues(meta);

  return (
    <section className="rebirth-investigation" aria-label="本月调查网络">
      <header className="rebirth-investigation-head">
        <div>
          <span>第 {meta.cycle} 周目 · 调查网络</span>
          <strong>把未来记忆拆成现在能验证的证据</strong>
        </div>
        <b>{remaining} / {investigation.timeBudget} 时间块</b>
      </header>

      <p className="rebirth-memory-source">{memorySourceNote(meta)}</p>

      {meta.lastCycleUnlocks.length > 0 ? (
        <div className="rebirth-unlocks" aria-label="上一周目解锁">
          <span>上一周目带回</span>
          <ul>
            {meta.lastCycleUnlocks.map((unlock) => <li key={unlock}>{unlock}</li>)}
          </ul>
        </div>
      ) : null}

      <div className="rebirth-node-grid">
        {nodes.map((node) => {
          const disabled = node.completed || Boolean(node.lockedReason);
          return (
            <button
              className={`rebirth-node ${node.completed ? "completed" : ""}`}
              disabled={disabled}
              key={node.id}
              title={node.lockedReason ?? undefined}
              type="button"
              onClick={() => onInvestigate(node.id)}
            >
              <span>{node.completed ? "已验证" : `${node.cost} 时间`}</span>
              <strong>{node.label}</strong>
              <p>{node.summary}</p>
              {node.shortcutLabel ? <small>捷径生效：{node.shortcutLabel}</small> : null}
              {node.lockedReason ? <small>{node.lockedReason}</small> : null}
              {node.completed ? <small>线索：{node.clue}</small> : null}
            </button>
          );
        })}
      </div>

      <div className="rebirth-clues">
        <span>已验证线索</span>
        {clues.length === 0 ? (
          <p>还没有。直接提交也可以，只是未来记忆会继续替你把中间步骤含糊过去。</p>
        ) : (
          <ul>
            {clues.map((clue) => (
              <li key={clue.id}>
                <strong>{clue.label}</strong>
                <span>{clue.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function RebirthArchiveSection({ meta }: { meta: RebirthMetaState }) {
  const keys = memoryKeyEntries(meta);
  const shortcuts = shortcutEntries(meta);
  const contradictions = contradictionEntries(meta);
  return (
    <section className="archive-section rebirth-archive">
      <h3>重生档案 · 第 {meta.cycle} 周目</h3>
      <p className="archive-empty">
        结局不会只清空数值。失败会留下提问方式，关系会留下研究捷径，异常会迫使你重新检查记忆来源。
      </p>

      <div className="rebirth-archive-group">
        <strong>记忆钥匙</strong>
        {keys.length === 0 ? <span>尚未获得</span> : (
          <ul>
            {keys.map((entry) => (
              <li key={entry.id}><b>{entry.label}</b><span>{entry.description}</span></li>
            ))}
          </ul>
        )}
      </div>

      <div className="rebirth-archive-group">
        <strong>研究捷径</strong>
        {shortcuts.length === 0 ? <span>尚未建立</span> : (
          <ul>
            {shortcuts.map((entry) => (
              <li key={entry.id}><b>{entry.label}</b><span>{entry.description}</span></li>
            ))}
          </ul>
        )}
      </div>

      <div className="rebirth-archive-group">
        <strong>系统异常</strong>
        {contradictions.length === 0 ? <span>档案暂时一致，令人可疑地省心。</span> : (
          <ul>
            {contradictions.map((entry) => (
              <li key={entry.id}><b>{entry.label}</b><span>{entry.description}</span></li>
            ))}
          </ul>
        )}
      </div>

      {meta.completedCycles.length > 0 ? (
        <div className="rebirth-archive-group">
          <strong>历次复盘</strong>
          <ol>
            {meta.completedCycles.map((record) => (
              <li key={`${record.cycle}-${record.endingId}`}>
                <b>第 {record.cycle} 周目 · {record.endingId}</b>
                <span>平均推理 {record.averageReasoning}，带回 {record.unlocked.length} 项。</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
