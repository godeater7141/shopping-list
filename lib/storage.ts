const KEY_STORAGE = "sl_key";
const RECENT_STORAGE = "sl_recent";
const MAX_RECENT = 5;

interface EncryptedEntry {
  iv: string;
  ct: string;
}

export interface RecentEntry {
  code: string;
  name: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Array.from(atob(b64), (c) => c.charCodeAt(0)));
}

async function getOrCreateKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(KEY_STORAGE);
  if (stored) {
    return crypto.subtle.importKey(
      "raw",
      base64ToBytes(stored),
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
  }
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const raw = await crypto.subtle.exportKey("raw", key);
  localStorage.setItem(KEY_STORAGE, bytesToBase64(new Uint8Array(raw)));
  return key;
}

async function encryptEntry(key: CryptoKey, text: string): Promise<EncryptedEntry> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(text)
  );
  return { iv: bytesToBase64(iv), ct: bytesToBase64(new Uint8Array(ct)) };
}

async function decryptEntry(key: CryptoKey, entry: EncryptedEntry): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(entry.iv) },
    key,
    base64ToBytes(entry.ct)
  );
  return new TextDecoder().decode(pt);
}

function parseEntry(raw: string): RecentEntry | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && typeof parsed.code === "string") return parsed;
    // 旧フォーマット（コード文字列のみ）の移行
    if (typeof parsed === "string") return { code: parsed, name: "" };
    return null;
  } catch {
    return null;
  }
}

export async function saveRecentEntry(code: string, name: string): Promise<void> {
  const key = await getOrCreateKey();
  const raw = localStorage.getItem(RECENT_STORAGE);
  const entries: EncryptedEntry[] = raw ? JSON.parse(raw) : [];

  const decrypted = await Promise.all(
    entries.map((e) => decryptEntry(key, e).then(parseEntry).catch(() => null))
  );
  const filtered = entries.filter((_, i) => decrypted[i] !== null && decrypted[i]?.code !== code);
  const newEntry = await encryptEntry(key, JSON.stringify({ code, name }));
  localStorage.setItem(
    RECENT_STORAGE,
    JSON.stringify([newEntry, ...filtered].slice(0, MAX_RECENT))
  );
}

export async function getRecentEntries(): Promise<RecentEntry[]> {
  const key = await getOrCreateKey();
  const raw = localStorage.getItem(RECENT_STORAGE);
  if (!raw) return [];
  const entries: EncryptedEntry[] = JSON.parse(raw);
  const results = await Promise.all(
    entries.map((e) => decryptEntry(key, e).then(parseEntry).catch(() => null))
  );
  return results.filter((r): r is RecentEntry => r !== null);
}

export async function removeRecentEntry(code: string): Promise<void> {
  const key = await getOrCreateKey();
  const raw = localStorage.getItem(RECENT_STORAGE);
  if (!raw) return;
  const entries: EncryptedEntry[] = JSON.parse(raw);
  const decrypted = await Promise.all(
    entries.map((e) => decryptEntry(key, e).then(parseEntry).catch(() => null))
  );
  const filtered = entries.filter((_, i) => decrypted[i]?.code !== code);
  localStorage.setItem(RECENT_STORAGE, JSON.stringify(filtered));
}
