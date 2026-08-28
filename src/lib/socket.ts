import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
});

// Automated maintenance update - 2026-08-28 22:40:32
