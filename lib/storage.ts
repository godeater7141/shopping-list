const KEY_STORAGE = "sl_key";
const RECENT_STORAGE = "sl_recent";
const MAX_RECENT = 5;

interface EncryptedEntry {
  iv: string;
  ct: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
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

export async function saveRecentCode(code: string): Promise<void> {
  const key = await getOrCreateKey();
  const raw = localStorage.getItem(RECENT_STORAGE);
  const entries: EncryptedEntry[] = raw ? JSON.parse(raw) : [];

  const decrypted = await Promise.all(
    entries.map((e) => decryptEntry(key, e).catch(() => null))
  );
  // 既存の同一コードを除去してから先頭に追加（重複排除）
  const filtered = entries.filter((_, i) => decrypted[i] !== null && decrypted[i] !== code);
  const newEntry = await encryptEntry(key, code);
  localStorage.setItem(
    RECENT_STORAGE,
    JSON.stringify([newEntry, ...filtered].slice(0, MAX_RECENT))
  );
}

export async function getRecentCodes(): Promise<string[]> {
  const key = await getOrCreateKey();
  const raw = localStorage.getItem(RECENT_STORAGE);
  if (!raw) return [];
  const entries: EncryptedEntry[] = JSON.parse(raw);
  const results = await Promise.all(
    entries.map((e) => decryptEntry(key, e).catch(() => null))
  );
  return results.filter((c): c is string => c !== null);
}

export async function removeRecentCode(code: string): Promise<void> {
  const key = await getOrCreateKey();
  const raw = localStorage.getItem(RECENT_STORAGE);
  if (!raw) return;
  const entries: EncryptedEntry[] = JSON.parse(raw);
  const decrypted = await Promise.all(
    entries.map((e) => decryptEntry(key, e).catch(() => null))
  );
  const filtered = entries.filter((_, i) => decrypted[i] !== code);
  localStorage.setItem(RECENT_STORAGE, JSON.stringify(filtered));
}
