"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveRecentCode, getRecentCodes, removeRecentCode } from "@/lib/storage";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_RE = /^[A-Z2-9]{4,8}$/;

function generateCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  // CODE_CHARS.length === 32, and 256 / 32 === 8 exactly, so no modulo bias
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [recentCodes, setRecentCodes] = useState<string[]>([]);

  useEffect(() => {
    getRecentCodes().then(setRecentCodes).catch(() => {});
  }, []);

  const handleCreate = async () => {
    const code = generateCode();
    await saveRecentCode(code).catch(() => {});
    router.push(`/list/${code}`);
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!CODE_RE.test(code)) {
      setError("有効なコードを入力してください（4〜8文字の英数字）");
      return;
    }
    await saveRecentCode(code).catch(() => {});
    router.push(`/list/${code}`);
  };

  const handleRemoveRecent = async (code: string) => {
    await removeRecentCode(code).catch(() => {});
    setRecentCodes((prev) => prev.filter((c) => c !== code));
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">🛒</div>
          <h1 className="text-3xl font-bold text-gray-800">買い物リスト</h1>
          <p className="text-gray-500 mt-2 text-sm">リアルタイムで2人で共有</p>
        </div>

        {/* 新規作成 */}
        <button
          onClick={handleCreate}
          className="w-full bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-semibold py-4 rounded-2xl text-lg transition-colors shadow-sm"
        >
          ＋ 新しいリストを作る
        </button>

        {/* 区切り */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-sm">または</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* コードで参加 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-600 mb-3">コードで参加する</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="例: XK9B4M"
              maxLength={8}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-lg font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-300 uppercase"
            />
            <button
              onClick={handleJoin}
              className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
            >
              参加
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* 最近のリスト */}
        {recentCodes.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-500 mb-3">最近のリスト</p>
            <div className="flex flex-col gap-2">
              {recentCodes.map((code) => (
                <div key={code} className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/list/${code}`)}
                    className="flex-1 bg-white border border-gray-100 rounded-xl px-4 py-3 text-left font-mono font-bold tracking-widest text-gray-800 hover:border-indigo-200 transition-colors shadow-sm"
                  >
                    {code}
                  </button>
                  <button
                    onClick={() => handleRemoveRecent(code)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-xl px-2"
                    aria-label={`${code} を削除`}
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
