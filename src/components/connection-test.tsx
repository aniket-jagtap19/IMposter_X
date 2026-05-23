"use client";

import { useCallback, useEffect, useState } from "react";
import { socket } from "@/lib/socket";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

const statusConfig: Record<
  ConnectionStatus,
  { label: string; dot: string; ring: string }
> = {
  disconnected: {
    label: "Disconnected",
    dot: "bg-zinc-500",
    ring: "ring-zinc-500/30",
  },
  connecting: {
    label: "Connecting…",
    dot: "bg-amber-400 animate-pulse",
    ring: "ring-amber-400/40",
  },
  connected: {
    label: "Connected",
    dot: "bg-emerald-400",
    ring: "ring-emerald-400/40",
  },
  error: {
    label: "Connection error",
    dot: "bg-rose-500",
    ring: "ring-rose-500/40",
  },
};

export function ConnectionTest() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (socket.connected) {
      setStatus("connected");
    }

    const onConnect = () => {
      setStatus("connected");
      setErrorMessage(null);
    };
    const onDisconnect = () => setStatus("disconnected");
    const onConnectError = (err: Error) => {
      setStatus("error");
      setErrorMessage(err.message);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, []);

  const connect = useCallback(() => {
    if (socket.connected) return;
    setStatus("connecting");
    setErrorMessage(null);
    socket.connect();
  }, []);

  const disconnect = useCallback(() => {
    socket.disconnect();
    setStatus("disconnected");
    setErrorMessage(null);
  }, []);

  const { label, dot, ring } = statusConfig[status];
  const isConnected = status === "connected";
  const isBusy = status === "connecting";

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col items-center justify-center overflow-hidden px-5 py-10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(139,92,246,0.35),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_110%,rgba(244,63,94,0.12),transparent)]"
        aria-hidden
      />

      <main className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/80">
            Imposter
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Connection test
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Verify realtime link to the game server before playing.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur-md">
          <div
            className={`flex items-center gap-3 rounded-xl border border-white/5 bg-black/30 px-4 py-3 ring-1 ${ring}`}
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-100">{label}</p>
              {socket.id && isConnected ? (
                <p className="truncate font-mono text-xs text-zinc-500">
                  {socket.id}
                </p>
              ) : null}
              {errorMessage ? (
                <p className="mt-0.5 text-xs text-rose-400">{errorMessage}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={connect}
              disabled={isConnected || isBusy}
              className="h-12 w-full rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Connect
            </button>
            <button
              type="button"
              onClick={disconnect}
              disabled={!isConnected && !isBusy}
              className="h-12 w-full rounded-xl border border-white/15 bg-white/5 text-sm font-semibold text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Disconnect
            </button>
          </div>
        </div>

        <p className="mt-6 text-center font-mono text-xs text-zinc-600">
          localhost:4000
        </p>
      </main>
    </div>
  );
}
