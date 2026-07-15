const CLOUD_FILE_NAME = "rebirth-research-save.json";
const CLOUD_PAYLOAD_FORMAT = "rebirth-research-encrypted-save";
const CLOUD_PAYLOAD_VERSION = 1;

export interface EncryptedCloudPayload {
  format: typeof CLOUD_PAYLOAD_FORMAT;
  version: typeof CLOUD_PAYLOAD_VERSION;
  algorithm: "AES-GCM";
  kdf: "PBKDF2-SHA-256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  updatedAt: string;
}

export interface CloudSyncResult {
  gistId: string;
  updatedAt: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt as BufferSource,
      iterations,
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptCloudText(
  plaintext: string,
  passphrase: string,
): Promise<EncryptedCloudPayload> {
  if (passphrase.length < 8) throw new Error("云同步口令至少需要 8 个字符。") ;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = 180_000;
  const key = await deriveKey(passphrase, salt, iterations);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext),
  );
  return {
    format: CLOUD_PAYLOAD_FORMAT,
    version: CLOUD_PAYLOAD_VERSION,
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA-256",
    iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    updatedAt: new Date().toISOString(),
  };
}

function isEncryptedPayload(value: unknown): value is EncryptedCloudPayload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<EncryptedCloudPayload>;
  return candidate.format === CLOUD_PAYLOAD_FORMAT
    && candidate.version === CLOUD_PAYLOAD_VERSION
    && candidate.algorithm === "AES-GCM"
    && candidate.kdf === "PBKDF2-SHA-256"
    && typeof candidate.iterations === "number"
    && typeof candidate.salt === "string"
    && typeof candidate.iv === "string"
    && typeof candidate.ciphertext === "string";
}

export async function decryptCloudText(
  payload: EncryptedCloudPayload,
  passphrase: string,
): Promise<string> {
  if (!isEncryptedPayload(payload)) throw new Error("云端文件格式无效。") ;
  const salt = base64ToBytes(payload.salt);
  const iv = base64ToBytes(payload.iv);
  const key = await deriveKey(passphrase, salt, payload.iterations);
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      base64ToBytes(payload.ciphertext) as BufferSource,
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error("无法解密云端存档。请检查同步口令。") ;
  }
}

async function gistRequest(
  token: string,
  url: string,
  init?: RequestInit,
): Promise<Record<string, unknown>> {
  if (!token.trim()) throw new Error("需要 GitHub token。") ;
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token.trim()}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub Gist 请求失败（${response.status}）：${detail.slice(0, 160)}`);
  }
  return response.json() as Promise<Record<string, unknown>>;
}

export async function pushCloudSave(
  token: string,
  gistId: string | null,
  passphrase: string,
  saveText: string,
): Promise<CloudSyncResult> {
  const encrypted = await encryptCloudText(saveText, passphrase);
  const body = JSON.stringify({
    description: "重生投研部加密存档。内容需要在游戏内使用同步口令解密。",
    public: false,
    files: {
      [CLOUD_FILE_NAME]: {
        content: JSON.stringify(encrypted),
      },
    },
  });
  const result = gistId
    ? await gistRequest(token, `https://api.github.com/gists/${gistId}`, { method: "PATCH", body })
    : await gistRequest(token, "https://api.github.com/gists", { method: "POST", body });
  const id = typeof result.id === "string" ? result.id : gistId;
  if (!id) throw new Error("GitHub 没有返回 Gist ID。") ;
  return { gistId: id, updatedAt: encrypted.updatedAt };
}

export async function pullCloudSave(
  token: string,
  gistId: string,
  passphrase: string,
): Promise<string> {
  if (!gistId.trim()) throw new Error("需要 Gist ID。") ;
  const result = await gistRequest(token, `https://api.github.com/gists/${gistId.trim()}`);
  const files = result.files;
  if (typeof files !== "object" || files === null) throw new Error("Gist 没有文件。") ;
  const file = (files as Record<string, unknown>)[CLOUD_FILE_NAME];
  if (typeof file !== "object" || file === null) throw new Error("Gist 中没有重生投研部存档。") ;
  const content = (file as Record<string, unknown>).content;
  if (typeof content !== "string") throw new Error("云端存档内容无效。") ;
  const parsed: unknown = JSON.parse(content);
  if (!isEncryptedPayload(parsed)) throw new Error("云端存档不是受支持的加密格式。") ;
  return decryptCloudText(parsed, passphrase);
}
