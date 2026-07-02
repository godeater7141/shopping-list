"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ref, onValue, push, update, remove, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { saveRecentEntry } from "@/lib/storage";

const CODE_RE = /^[A-Z2-9]{4,8}$/;
const ITEM_NAME_MAX = 200;
const ROOM_NAME_MAX = 50;

interface Item {
  id: string;
  name: string;
  checked: boolean;
  createdAt: number;
}

function describeFirebaseError(error: { code?: string; message: string }): string {
  switch (error.code) {
    case "PERMISSION_DENIED":
      return "Firebase Realtime Database rules are blocking read/write access for this list code.";
    case "UNAVAILABLE":
      return "The database endpoint is unreachable. Check the database URL, region, or network access.";
    case "NETWORK_ERROR":
      return "A network error prevented Firebase from connecting.";
    case "DISCONNECTED":
      return "Firebase disconnected before the initial data snapshot arrived.";
    default:
      return `${error.code}: ${error.message}`;
  }
}

export default function ListPage() {
  const params = useParams<{ code: string }>();
  const code = typeof params.code === "string" ? params.code : "";
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState("");
  const [addError, setAddError] = useState("");
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connTimeout, setConnTimeout] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [roomName, setRoomName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    if (!CODE_RE.test(code)) {
      router.replace("/");
      return;
    }

    const timeoutId = setTimeout(() => setConnTimeout(true), 8000);

    const itemsRef = ref(db, `lists/${code}/items`);
    const unsubscribeItems = onValue(
      itemsRef,
      (snapshot) => {
        setConnected(true);
        setConnTimeout(false);
        setConnectionError("");
        clearTimeout(timeoutId);

        const data = snapshot.val();
        if (data) {
          const loaded: Item[] = Object.entries(data).map(([id, val]) => ({
            id,
            ...(val as Omit<Item, "id">),
          }));
          loaded.sort((a, b) => a.createdAt - b.createdAt);
          setItems(loaded);
        } else {
          setItems([]);
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        setConnected(false);
        setConnectionError(describeFirebaseError(error));
      }
    );

    const nameRef = ref(db, `lists/${code}/name`);
    const unsubscribeName = onValue(nameRef, (snapshot) => {
      const name = snapshot.val();
      if (typeof name === "string") {
        setRoomName(name);
        saveRecentEntry(code, name).catch(() => {});
      } else {
        saveRecentEntry(code, "").catch(() => {});
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribeItems();
      unsubscribeName();
    };
  }, [code, router]);

  const addItem = async () => {
    const name = newItem.trim().slice(0, ITEM_NAME_MAX);
    if (!name) return;

    try {
      const listRef = ref(db, `lists/${code}/items`);
      await push(listRef, { name, checked: false, createdAt: Date.now() });
      setNewItem("");
      setAddError("");
    } catch {
      setAddError("Could not add the item. Please check your connection and try again.");
    }
  };

  const toggleItem = async (item: Item) => {
    const itemRef = ref(db, `lists/${code}/items/${item.id}`);
    await update(itemRef, { checked: !item.checked });
  };

  const deleteItem = async (itemId: string) => {
    const itemRef = ref(db, `lists/${code}/items/${itemId}`);
    await remove(itemRef);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startEditingName = () => {
    setEditingName(roomName);
    setIsEditingName(true);
  };

  const saveName = async () => {
    setIsEditingName(false);
    const name = editingName.trim().slice(0, ROOM_NAME_MAX);
    if (name === roomName) return;

    const nameRef = ref(db, `lists/${code}/name`);
    await set(nameRef, name || null);
    await saveRecentEntry(code, name).catch(() => {});
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const connectionBanner = connectionError || (connTimeout && !connected ? "Firebase connection timed out before the first snapshot arrived." : "");

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-8">
      <div className="w-full max-w-sm">
        {connectionBanner && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            <p className="font-semibold mb-1">Firebase connection problem</p>
            <p>{connectionBanner}</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-red-600">
              <li>Check that the Realtime Database URL points to the correct project and region.</li>
              <li>If the code above says PERMISSION_DENIED, update the database rules or test auth.</li>
            </ul>
          </div>
        )}

        <div className="flex items-center mb-6">
          <button
            onClick={() => router.push("/")}
            className="text-gray-400 hover:text-gray-600 mr-3 text-xl"
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") setIsEditingName(false);
                }}
                autoFocus
                maxLength={ROOM_NAME_MAX}
                placeholder="Enter room name"
                className="w-full text-xl font-bold text-gray-800 border-b-2 border-indigo-400 focus:outline-none bg-transparent"
              />
            ) : (
              <button
                onClick={startEditingName}
                className="flex items-center gap-1.5 group w-full text-left"
              >
                <h1 className="text-xl font-bold text-gray-800 truncate">
                  {roomName || "Untitled shopping list"}
                </h1>
                <span className="text-gray-300 group-hover:text-gray-500 text-sm flex-shrink-0">
                  ✎
                </span>
              </button>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  connected ? "bg-green-400" : "bg-gray-300"
                }`}
              />
              <span className="text-xs text-gray-400">
                {connected ? "Connected" : "Connecting..."}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={copyCode}
          className="w-full bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-6 flex items-center justify-between group hover:border-indigo-200 transition-colors"
        >
          <div className="text-left">
            <p className="text-xs text-gray-400 mb-1">Share code</p>
            <p className="text-2xl font-mono font-bold tracking-widest text-gray-800">
              {code}
            </p>
          </div>
          <span className="text-2xl">{copied ? "✓" : "⧉"}</span>
        </button>

        {items.length > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>
                {checkedCount} / {items.length} done
              </span>
              <span>{Math.round((checkedCount / items.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-400 rounded-full transition-all duration-300"
                style={{ width: `${(checkedCount / items.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          {items.length === 0 ? (
            <div className="py-12 text-center text-gray-300">
              <div className="text-4xl mb-2">🧺</div>
              <p className="text-sm">No items yet.</p>
            </div>
          ) : (
            <ul>
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className={`flex items-center px-4 py-3.5 ${
                    index !== items.length - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  <button
                    onClick={() => toggleItem(item)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 flex-shrink-0 transition-colors ${
                      item.checked
                        ? "bg-indigo-500 border-indigo-500"
                        : "border-gray-300 hover:border-indigo-300"
                    }`}
                  >
                    {item.checked && <span className="text-white text-xs">✓</span>}
                  </button>
                  <span
                    className={`flex-1 text-base ${
                      item.checked ? "line-through text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {item.name}
                  </span>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-gray-200 hover:text-red-400 transition-colors ml-2 text-lg"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => {
              setNewItem(e.target.value);
              setAddError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="Add an item..."
            maxLength={ITEM_NAME_MAX}
            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-700"
          />
          <button
            onClick={addItem}
            disabled={!newItem.trim()}
            className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
          >
            Add
          </button>
        </div>
        {addError && <p className="text-red-500 text-sm mt-2">{addError}</p>}
      </div>
    </main>
  );
}
