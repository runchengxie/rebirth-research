import { useState } from "react";
import type { GameState } from "../types";
import { pullCloudSave, pushCloudSave } from "../game/cloudSync";
import { readSessionEnvelope, writeSessionEnvelope } from "../game/sessionEnvelope";
import {
  LEGACY_REBIRTH_META_V3_KEY_PREFIX,
  REBIRTH_META_KEY_PREFIX,
} from "../game/rebirth";

interface CloudSaveBundle {
  format: "rebirth-research-save";
  version: 1;
  year: string;
  exportedAt: string;
  state: GameState;
  rebirth: unknown;
  theme: string | null;
  showExactMetrics: boolean;
}

function parseJson(raw: string | null): unknown {
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

function isCloudSaveBundle(value: unknown): value is CloudSaveBundle {
  if (!isRecord(value)) return false;
  if (value.format !== "rebirth-research-save" || value.version !== 1) return false;
  if (typeof value.year !== "string" || !isRecord(value.state)) return false;
  return value.state.year === value.year && value.rebirth !== null;
}

function currentSaveText(year: string): string {
  const envelope = readSessionEnvelope(localStorage, year);
  const state = envelope?.state ?? parseJson(localStorage.getItem(`rebirthGameState:v2:${year}`));
  const rebirth = envelope?.rebirth
    ?? parseJson(localStorage.getItem(`${REBIRTH_META_KEY_PREFIX}${year}`))
    ?? parseJson(localStorage.getItem(`${LEGACY_REBIRTH_META_V3_KEY_PREFIX}${year}`));
  if (!isRecord(state) || state.year !== year || rebirth === null) {
    throw new Error("当前年份还没有可同步的有效存档。");
  }
  const bundle: CloudSaveBundle = {
    format: "rebirth-research-save",
    version: 1,
    year,
    exportedAt: new Date().toISOString(),
    state: state as unknown as GameState,
    rebirth,
    theme: localStorage.getItem("rebirthGameTheme"),
    showExactMetrics: localStorage.getItem("rebirthShowExactMetrics") === "1",
  };
  return JSON.stringify(bundle);
}

function applyCloudSave(raw: string): CloudSaveBundle {
  const parsed: unknown = JSON.parse(raw);
  if (!isCloudSaveBundle(parsed)) throw new Error("解密后的云端内容不是有效存档。");
  localStorage.setItem(`rebirthGameState:v2:${parsed.year}`, JSON.stringify(parsed.state));
  localStorage.setItem(`${REBIRTH_META_KEY_PREFIX}${parsed.year}`, JSON.stringify(parsed.rebirth));
  writeSessionEnvelope(localStorage, parsed.state, parsed.rebirth);
  if (parsed.theme) localStorage.setItem("rebirthGameTheme", parsed.theme);
  localStorage.setItem("rebirthShowExactMetrics", parsed.showExactMetrics ? "1" : "0");
  return parsed;
}

function gistStorageKey(year: string): string {
  return `rebirthCloudGistId:${year}`;
}

function initialGistId(year: string): string {
  try {
    return localStorage.getItem(gistStorageKey(year)) ?? "";
  } catch {
    return "";
  }
}

export function CloudSyncPanel({ year }: { year: string }) {
  const [token, setToken] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [gistId, setGistId] = useState(() => initialGistId(year));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const push = async () => {
    setBusy(true);
    setStatus("");
    try {
      const result = await pushCloudSave(
        token,
        gistId.trim() || null,
        passphrase,
        currentSaveText(year),
      );
      setGistId(result.gistId);
      localStorage.setItem(gistStorageKey(year), result.gistId);
      setStatus(`加密存档已同步。Gist ID：${result.gistId}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "云同步失败。");
    } finally {
      setBusy(false);
    }
  };

  const pull = async () => {
    setBusy(true);
    setStatus("");
    try {
      const raw = await pullCloudSave(token, gistId, passphrase);
      const bundle = applyCloudSave(raw);
      localStorage.setItem(gistStorageKey(bundle.year), gistId.trim());
      setStatus(`已拉取 ${bundle.year} 年云端存档。确认后重新载入页面。`);
      if (window.confirm(`云端 ${bundle.year} 年存档已写入本地，立即重新载入吗？`)) {
        window.location.reload();
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "云端存档拉取失败。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="cloud-sync-panel">
      <summary>
        <span className="cloud-sync-mark" aria-hidden="true">锁</span>
        <span className="cloud-sync-copy">
          <strong>加密云同步</strong>
          <small>私密 GitHub Gist，token 与口令均不落盘</small>
        </span>
        <span className="cloud-sync-badge">AES-GCM</span>
      </summary>
      <div className="cloud-sync-body">
        <div className="cloud-sync-grid">
          <label>
            <span>GitHub token</span>
            <input
              autoComplete="off"
              placeholder="需要 Gist 读写权限"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </label>
          <label>
            <span>同步口令</span>
            <input
              autoComplete="new-password"
              placeholder="至少 8 个字符，请自行妥善保存"
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
            />
          </label>
          <label>
            <span>Gist ID</span>
            <input
              placeholder="首次上传后自动生成"
              value={gistId}
              onChange={(event) => setGistId(event.target.value)}
            />
          </label>
        </div>
        <div className="save-transfer-actions">
          <button disabled={busy || !token.trim() || passphrase.length < 8} type="button" onClick={() => void push()}>
            {gistId.trim() ? "更新云端存档" : "创建云端存档"}
          </button>
          <button disabled={busy || !token.trim() || !gistId.trim() || passphrase.length < 8} type="button" onClick={() => void pull()}>
            拉取并解密
          </button>
        </div>
        <small className="cloud-sync-warning">
          GitHub 访问令牌仅存在于当前输入框。同步口令无法找回。Gist 文件即使被看到，也只包含加密密文。
        </small>
        {status ? <p className="save-transfer-status" role="status">{status}</p> : null}
      </div>
    </details>
  );
}
