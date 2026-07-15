import { useRef, useState } from "react";
import type { GameState } from "../types";
import { CloudSyncPanel } from "./CloudSyncPanel";
import {
  clearPlaytestTelemetry,
  playtestTelemetryExport,
} from "../game/playtestTelemetry";
import {
  readSessionEnvelope,
  writeSessionEnvelope,
} from "../game/sessionEnvelope";

interface SaveBundle {
  format: "rebirth-research-save";
  version: 1;
  year: string;
  exportedAt: string;
  state: GameState;
  rebirth: unknown;
  theme: string | null;
  showExactMetrics: boolean;
}

function parseStoredJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSaveBundle(value: unknown): value is SaveBundle {
  if (!isRecord(value)) return false;
  if (value.format !== "rebirth-research-save" || value.version !== 1) return false;
  if (typeof value.year !== "string" || !isRecord(value.state)) return false;
  return value.state.year === value.year;
}

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value: string): string {
  const binary = atob(value.trim());
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function downloadText(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function readCurrentBundle(year: string): SaveBundle | null {
  const envelope = readSessionEnvelope(localStorage, year);
  const state = envelope?.state
    ?? parseStoredJson(localStorage.getItem(`rebirthGameState:v2:${year}`));
  const rebirth = envelope?.rebirth
    ?? parseStoredJson(localStorage.getItem(`rebirthMeta:v3:${year}`));
  if (!isRecord(state) || state.year !== year || rebirth === null) return null;

  return {
    format: "rebirth-research-save",
    version: 1,
    year,
    exportedAt: new Date().toISOString(),
    state: state as unknown as GameState,
    rebirth,
    theme: localStorage.getItem("rebirthGameTheme"),
    showExactMetrics: localStorage.getItem("rebirthShowExactMetrics") === "1",
  };
}

function applyBundle(bundle: SaveBundle): void {
  localStorage.setItem(`rebirthGameState:v2:${bundle.year}`, JSON.stringify(bundle.state));
  localStorage.setItem(`rebirthMeta:v3:${bundle.year}`, JSON.stringify(bundle.rebirth));
  writeSessionEnvelope(localStorage, bundle.state, bundle.rebirth);
  if (bundle.theme) localStorage.setItem("rebirthGameTheme", bundle.theme);
  localStorage.setItem("rebirthShowExactMetrics", bundle.showExactMetrics ? "1" : "0");

  const url = new URL(window.location.href);
  if (bundle.year === "2025") url.searchParams.delete("year");
  else url.searchParams.set("year", bundle.year);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  window.location.reload();
}

export function SaveTransferPanel({ year }: { year: string }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [shareCode, setShareCode] = useState("");
  const [status, setStatus] = useState("");

  const exportSave = () => {
    const bundle = readCurrentBundle(year);
    if (!bundle) {
      setStatus("当前年份还没有可导出的有效存档。");
      return;
    }
    downloadText(`rebirth-research-${year}.json`, JSON.stringify(bundle, null, 2));
    setStatus("存档已导出。浏览器这次没有把你的时间线据为己有。");
  };

  const copyShareCode = async () => {
    const bundle = readCurrentBundle(year);
    if (!bundle) {
      setStatus("当前年份还没有可复制的有效存档。");
      return;
    }
    const code = encodeBase64(JSON.stringify(bundle));
    setShareCode(code);
    try {
      await navigator.clipboard.writeText(code);
      setStatus("分享码已复制。它很长，因为人生分支通常拒绝优雅压缩。");
    } catch {
      setStatus("分享码已生成，请从文本框手动复制。");
    }
  };

  const importText = (raw: string) => {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isSaveBundle(parsed)) throw new Error("invalid save");
      if (!window.confirm(`将导入 ${parsed.year} 年存档并重新载入页面，继续吗？`)) return;
      applyBundle(parsed);
    } catch {
      setStatus("无法识别这份存档。文件可能损坏，或者它只是很努力地假装自己是 JSON。");
    }
  };

  const importShareCode = () => {
    try {
      importText(decodeBase64(shareCode));
    } catch {
      setStatus("分享码无法解码，请检查是否复制完整。");
    }
  };

  const exportPlaytest = () => {
    downloadText("rebirth-research-playtest.json", playtestTelemetryExport());
    setStatus("本地游玩记录已导出，可用于分析退出点和选择分布。");
  };

  return (
    <section className="save-transfer-panel" aria-label="存档与游玩数据">
      <div className="save-transfer-heading">
        <strong>存档与跨设备转移</strong>
        <span>数据默认只保存在本地；云同步需要玩家主动配置。</span>
      </div>
      <div className="save-transfer-actions">
        <button type="button" onClick={exportSave}>导出存档</button>
        <button type="button" onClick={copyShareCode}>复制分享码</button>
        <button type="button" onClick={() => fileInputRef.current?.click()}>导入文件</button>
        <button type="button" onClick={exportPlaytest}>导出游玩记录</button>
      </div>
      <input
        accept="application/json,.json"
        hidden
        ref={fileInputRef}
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void file.text().then(importText);
          event.currentTarget.value = "";
        }}
      />
      <label className="share-code-field">
        <span>分享码</span>
        <textarea
          placeholder="复制或粘贴存档分享码"
          rows={3}
          value={shareCode}
          onChange={(event) => setShareCode(event.target.value)}
        />
      </label>
      <div className="save-transfer-actions secondary">
        <button disabled={!shareCode.trim()} type="button" onClick={importShareCode}>导入分享码</button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("清除本地游玩记录？这不会删除游戏存档。")) {
              clearPlaytestTelemetry();
              setStatus("本地游玩记录已清除。");
            }
          }}
        >
          清除游玩记录
        </button>
      </div>
      <CloudSyncPanel year={year} />
      {status ? <p className="save-transfer-status" role="status">{status}</p> : null}
    </section>
  );
}
