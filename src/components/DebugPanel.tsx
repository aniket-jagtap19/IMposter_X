"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/store/gameStore";

export function DebugPanel() {
  const connected = useGameStore((s) => s.connected);
  const currentRoom = useGameStore((s) => s.currentRoom);
  const [socketId, setSocketId] = useState<string | null>(socket.id ?? null);

  useEffect(() => {
    const syncId = () => setSocketId(socket.id ?? null);
    const onDisconnect = () => setSocketId(null);

    socket.on("connect", syncId);
    socket.on("disconnect", onDisconnect);
    syncId();

    return () => {
      socket.off("connect", syncId);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  const players = currentRoom?.players ?? [];
  const roomCode = currentRoom?.roomCode ?? "—";

  return (
    <aside
      className="fixed bottom-3 right-3 z-50 w-56 rounded border border-zinc-700/80 bg-zinc-950/95 p-3 font-mono text-[10px] leading-relaxed text-zinc-400 shadow-lg backdrop-blur-sm"
      aria-label="Debug panel"
    >
      <p className="mb-2 border-b border-zinc-800 pb-1.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
        Debug
      </p>

      <dl className="space-y-1">
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-600">socket</dt>
          <dd className={connected ? "text-emerald-500" : "text-zinc-500"}>
            {connected ? "connected" : "disconnected"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-600">id</dt>
          <dd className="truncate text-zinc-300" title={socketId ?? undefined}>
            {socketId ?? "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-600">room</dt>
          <dd className="text-zinc-300">{roomCode}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-600">count</dt>
          <dd className="text-zinc-300">{players.length}</dd>
        </div>
      </dl>

      {players.length > 0 ? (
        <ul className="mt-2 space-y-0.5 border-t border-zinc-800 pt-2">
          {players.map((p) => (
            <li key={p.playerId} className="truncate text-zinc-500">
              {p.isHost ? "* " : "  "}
              {p.name}
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}
