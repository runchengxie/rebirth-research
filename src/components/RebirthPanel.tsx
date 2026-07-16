import type { GameState } from "../types";
import {
  contradictionEntries,
  currentInvestigation,
  currentInvestigationChapter,
  investigationClues,
  investigationNodeViews,
  isInvestigationActive,
  memoryKeyEntries,
  memorySourceNote,
  shortcutEntries,
  type InvestigationNodeId,
  type RebirthMetaState,
} from "../game/rebirth";
import { flowMapEntries, readSceneCount } from "../game/rebirthFlow";
import {
  officeDiscoveryEntries,
  officePropViews,
  type OfficePropId,
} from "../game/rebirthOffice";

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
  const investigation = currentInvestigation(meta, state);
  const chapter = currentInvestigationChapter(state);
  if (!investigation || !chapter) return null;
  const remaining = Math.max(0, investigation.timeBudget - investigation.timeSpent);
  const nodes = investigationNodeViews(meta, state);
  const clues = investigationClues(meta, state);

  return (
    <section className="rebirth-investigation" aria-label="本月调查网络">
      <header className="rebirth-investigation-head">
        <div>
          <span>第 {meta.cycle} 周目 · {chapter.title}</span>
          <strong>{chapter.thesis}</strong>
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
              <span>{node.completed ? node.reliabilityLabel : `${node.cost} 时间`}</span>
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
        <span>当前证据板</span>
        {clues.length === 0 ? (
          <p>还没有。直接提交也可以，只是未来记忆会继续替你把中间步骤含糊过去。</p>
        ) : (
          <ul>
            {clues.map((clue) => (
              <li className={`reliability-${clue.reliability}`} key={clue.id}>
                <small>{clue.reliabilityLabel}</small>
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

export function RebirthFlowPanel({
  meta,
  state,
}: {
  meta: RebirthMetaState;
  state: GameState;
}) {
  const entries = flowMapEntries(meta, state);
  const readCount = readSceneCount(meta, state.year);
  return (
    <section className="archive-section rebirth-flow" aria-label="年度流程图">
      <header className="rebirth-section-head">
        <div>
          <h3>年度因果流程图</h3>
          <p>已读剧情节点 {readCount} 个。第二周目以后可以跳过已经读过的对白。</p>
        </div>
        <b>第 {meta.cycle} 周目</b>
      </header>
      <ol>
        {entries.map((entry) => (
          <li className={`${entry.status} ${entry.keyMonth ? "key-month" : ""}`} key={entry.monthKey}>
            <div className="flow-month">
              <span>{entry.label}</span>
              {entry.keyMonth ? <b>{entry.investigationLabel}</b> : null}
            </div>
            <div className="flow-copy">
              <strong>{entry.title}</strong>
              {entry.decisionLabel ? <p>{entry.decisionLabel}</p> : null}
              {entry.investigationProgress ? <small>{entry.investigationProgress}</small> : null}
              {entry.grade ? <i>评级 {entry.grade}</i> : null}
              {entry.tags.length > 0 ? (
                <div>{entry.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function OfficeRoomOverview({ state }: { state: GameState }) {
  const postIts = Math.min(6, state.office.postIts);
  const whiteboardMarkers = Math.min(6, state.office.whiteboardMarkers);
  const coffeeCups = Math.min(5, state.office.coffeeCups);
  return (
    <section className="office-room-overview" aria-labelledby="office-room-overview-title">
      <div className="office-room-scene" aria-hidden="true">
        <div className="office-room-board">
          {Array.from({ length: whiteboardMarkers }, (_, index) => (
            <i className="office-room-board-mark" key={`office-board-mark-${index}`} />
          ))}
        </div>
        <div className="office-room-desk">
          <div className="office-room-notes">
            {Array.from({ length: postIts }, (_, index) => (
              <i className="office-room-note" key={`office-note-${index}`} />
            ))}
          </div>
          <div className="office-room-cups">
            {Array.from({ length: coffeeCups }, (_, index) => (
              <i className="office-room-cup" key={`office-cup-${index}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="office-room-copy">
        <h4 id="office-room-overview-title">本周目留下的研究痕迹</h4>
        <dl>
          <div><dt>便签</dt><dd>{state.office.postIts} 张</dd></div>
          <div><dt>白板框架</dt><dd>{state.office.whiteboardMarkers} 组</dd></div>
          <div><dt>咖啡杯</dt><dd>{state.office.coffeeCups} 只</dd></div>
        </dl>
      </div>
    </section>
  );
}

export function OfficeHubPanel({
  meta,
  state,
  onInspect,
}: {
  meta: RebirthMetaState;
  state: GameState;
  onInspect: (propId: OfficePropId) => void;
}) {
  const props = officePropViews(meta, state);
  const discoveries = officeDiscoveryEntries(meta);
  return (
    <section className="archive-section office-hub" aria-label="研究室中枢">
      <header className="rebirth-section-head">
        <div>
          <h3>研究室中枢</h3>
          <p>研究过程会在物件上留下痕迹。整理它们，可以发现关系、透支和推理线索。</p>
        </div>
        <b>{discoveries.length} 项发现</b>
      </header>
      <OfficeRoomOverview state={state} />
      <div className="office-prop-grid">
        {props.map((prop) => (
          <button
            className={prop.completed ? "completed" : ""}
            disabled={prop.completed || Boolean(prop.lockedReason)}
            key={prop.id}
            title={prop.lockedReason ?? undefined}
            type="button"
            onClick={() => onInspect(prop.id)}
          >
            <span>{prop.countLabel}</span>
            <strong>{prop.label}</strong>
            <p>{prop.discovery ?? prop.summary}</p>
            <small>
              {prop.completed ? "已整理" : prop.lockedReason ?? prop.actionLabel}
            </small>
          </button>
        ))}
      </div>
      {discoveries.length > 0 ? (
        <ul className="office-discoveries">
          {discoveries.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.label}</strong>
              <span>{entry.description}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function RebirthArchiveSection({ meta }: { meta: RebirthMetaState }) {
  const keys = memoryKeyEntries(meta);
  const shortcuts = shortcutEntries(meta);
  const contradictions = contradictionEntries(meta);
  const officeDiscoveries = officeDiscoveryEntries(meta);
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

      <div className="rebirth-archive-group">
        <strong>研究室发现</strong>
        {officeDiscoveries.length === 0 ? <span>尚未整理研究室物件</span> : (
          <ul>
            {officeDiscoveries.map((entry) => (
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
