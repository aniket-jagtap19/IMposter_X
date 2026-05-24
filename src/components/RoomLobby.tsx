"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/store/gameStore";
import { SOCKET_EVENTS } from "@/types/socket";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type LobbyMode = "create" | "join";

export function RoomLobby() {
  const connected = useGameStore((s) => s.connected);
  const currentRoom = useGameStore((s) => s.currentRoom);
  const setConnected = useGameStore((s) => s.setConnected);
  const setRoom = useGameStore((s) => s.setRoom);
  const resetGame = useGameStore((s) => s.resetGame);

  const [mode, setMode] = useState<LobbyMode>("create");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectNow = useCallback(() => {
    if (socket.connected) return;
    setError(null);
    socket.connect();
  }, []);

  const disconnectNow = useCallback(() => {
    socket.disconnect();
  }, []);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => {
      setConnected(false);
      resetGame();
    };
    const onRoomUpdated = (view: any) => {
      setRoom(view);
      setError(null);
      setBusy(false);
    };
    const onError = (message: string) => {
      setError(message);
      setBusy(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on(SOCKET_EVENTS.ROOM_UPDATED, onRoomUpdated);
    socket.on(SOCKET_EVENTS.ERROR, onError);
    socket.on("connect_error", (e) => onError(e.message));

    if (socket.connected) {
      setConnected(true);
    } else {
      connectNow();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(SOCKET_EVENTS.ROOM_UPDATED, onRoomUpdated);
      socket.off(SOCKET_EVENTS.ERROR, onError);
      socket.off("connect_error");
    };
  }, [connectNow, resetGame, setConnected, setRoom]);

  const players = currentRoom?.players ?? [];
  const hostId = currentRoom?.hostPlayerId ?? null;

  const canSubmit = useMemo(() => {
    const nameOk = playerName.trim().length > 0 && playerName.trim().length <= 20;
    if (!nameOk) return false;
    if (mode === "create") return true;
    return roomCode.trim().length >= 4;
  }, [mode, playerName, roomCode]);

  const createRoom = useCallback(() => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    connectNow();
    socket.emit(
      SOCKET_EVENTS.CREATE_ROOM,
      { playerName: playerName.trim() },
      (res: any) => {
        if (!res?.ok) {
          setBusy(false);
          setError(res?.error ?? "Failed to create room");
        }
      },
    );
  }, [canSubmit, connectNow, playerName]);

  const joinRoom = useCallback(() => {
    if (!canSubmit) return;
    const code = roomCode.trim().toUpperCase();
    setBusy(true);
    setError(null);
    connectNow();
    socket.emit(
      SOCKET_EVENTS.JOIN_ROOM,
      { roomCode: code, playerName: playerName.trim() },
      (res: any) => {
        if (!res?.ok) {
          setBusy(false);
          setError(res?.error ?? "Failed to join room");
        }
      },
    );
  }, [canSubmit, connectNow, playerName, roomCode]);

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col items-center justify-center overflow-hidden px-5 py-10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(139,92,246,0.40),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_115%,rgba(236,72,153,0.12),transparent)]"
        aria-hidden
      />

      <main className="relative z-10 w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/80">
            Realtime lobby
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Imposter
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Create a room, invite friends, and verify everyone is connected.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/40 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  connected ? "bg-emerald-400" : "bg-zinc-500",
                )}
                aria-hidden
              />
              <p className="text-sm font-medium text-zinc-100">
                {connected ? "Connected" : "Disconnected"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={connectNow}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/10"
              >
                Connect
              </button>
              <button
                type="button"
                onClick={disconnectNow}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/10"
              >
                Disconnect
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-zinc-300">
                Your name
              </span>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="e.g. Nova"
                className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-zinc-100 outline-none ring-1 ring-transparent transition placeholder:text-zinc-600 focus:ring-violet-500/40"
                inputMode="text"
                autoComplete="off"
              />
            </label>

            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-1">
              <button
                type="button"
                onClick={() => setMode("create")}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition",
                  mode === "create"
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setMode("join")}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition",
                  mode === "join"
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                Join
              </button>
            </div>

            {mode === "join" ? (
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold text-zinc-300">
                  Room code
                </span>
                <input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 font-mono text-sm tracking-widest text-zinc-100 outline-none ring-1 ring-transparent transition placeholder:text-zinc-600 focus:ring-violet-500/40"
                  inputMode="text"
                  autoComplete="off"
                />
              </label>
            ) : null}

            {error ? (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
              >
                {error}
              </motion.p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={createRoom}
                disabled={busy || !canSubmit}
                className="h-12 w-full rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Create room
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={joinRoom}
                disabled={busy || !canSubmit || mode !== "join"}
                className="h-12 w-full rounded-xl border border-white/15 bg-white/5 text-sm font-semibold text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Join room
              </motion.button>
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-100">Players</p>
              <p className="font-mono text-xs text-zinc-500">
                {currentRoom?.roomCode ? currentRoom.roomCode : "—"}
              </p>
            </div>

            <div className="mt-3 grid gap-2">
              {players.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Create or join a room to see players here.
                </p>
              ) : (
                players.map((p) => (
                  <motion.div
                    key={p.playerId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-100">
                        {p.name}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {p.connected ? "Online" : "Offline"} • Score {p.score}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {p.playerId === hostId ? (
                        <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-semibold text-violet-200">
                          Host
                        </span>
                      ) : null}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center font-mono text-xs text-zinc-600">
          Server: localhost:4000
        </p>
      </main>
    </div>
  );
}

