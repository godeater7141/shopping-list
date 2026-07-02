"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getRecentEntries,
  removeRecentEntry,
  saveRecentEntry,
  type RecentEntry,
} from "@/lib/storage";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_RE = /^[A-Z2-9]{4,8}$/;

function generateCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);

  useEffect(() => {
    getRecentEntries().then(setRecentEntries).catch(() => {});
  }, []);

  const handleCreate = async () => {
    const code = generateCode();
    await saveRecentEntry(code, "").catch(() => {});
    router.push(`/list/${code}`);
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!CODE_RE.test(code)) {
      setError("Enter a valid code using 4 to 8 characters from A-Z and 2-9.");
      return;
    }
    await saveRecentEntry(code, "").catch(() => {});
    router.push(`/list/${code}`);
  };

  const handleRemoveRecent = async (code: string) => {
    await removeRecentEntry(code).catch(() => {});
    setRecentEntries((prev) => prev.filter((e) => e.code !== code));
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">🛒</div>
          <h1 className="text-3xl font-bold text-gray-800">Shopping List</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Create or join a shared list in real time.
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="w-full bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-semibold py-4 rounded-2xl text-lg transition-colors shadow-sm"
        >
          Create a new list
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-sm">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-600 mb-3">Join with a code</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="XK9B4M"
              maxLength={8}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-lg font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-300 uppercase"
            />
            <button
              onClick={handleJoin}
              className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
            >
              Join
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {recentEntries.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-500 mb-3">Recent lists</p>
            <div className="flex flex-col gap-2">
              {recentEntries.map(({ code, name }) => (
                <div key={code} className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/list/${code}`)}
                    className="flex-1 bg-white border border-gray-100 rounded-xl px-4 py-3 text-left shadow-sm hover:border-indigo-200 transition-colors"
                  >
                    <p className="font-semibold text-gray-800 truncate">
                      {name || "Untitled list"}
                    </p>
                    <p className="text-xs font-mono text-gray-400 mt-0.5">{code}</p>
                  </button>
                  <button
                    onClick={() => handleRemoveRecent(code)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-xl px-2"
                    aria-label={`Remove ${code}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
