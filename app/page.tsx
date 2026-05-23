"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  const handleCreate = () => {
    const code = generateCode();
    router.push(`/list/${code}`);
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (!CODE_RE.test(code)) {
      setError("有効なコードを入力してください（4〜8文字の英数字）");
      return;
    }
    router.push(`/list/${code}`);
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
      </div>
    </main>
  );
}
