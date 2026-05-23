const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { RoomManager } = require("./rooms");

const PORT = 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";

/** Mirror src/types/socket.ts — keep in sync. */
const SOCKET_EVENTS = {
  CREATE_ROOM: "room:create",
  JOIN_ROOM: "room:join",
  ROOM_UPDATED: "room:updated",
  PLAYER_CONNECTED: "player:connected",
  PLAYER_DISCONNECTED: "player:disconnected",
  ERROR: "game:error",
};

const rooms = new RoomManager();

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN },
});

function validateName(name) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed || trimmed.length > 20) return null;
  return trimmed;
}

function toPlayerView(room, playerId) {
  return {
    roomCode: room.roomCode,
    phase: room.phase,
    players: room.players,
    maxPlayers: room.maxPlayers,
    hostPlayerId: room.hostPlayerId,
    round: room.round,
    maxRounds: room.maxRounds,
    phaseEndsAt: room.phaseEndsAt,
    imposterPlayerId: room.imposterPlayerId,
    eliminatedPlayerId: room.eliminatedPlayerId,
    playerId,
    role: null,
    topic: null,
  };
}

function emitError(socket, message, ack) {
  socket.emit(SOCKET_EVENTS.ERROR, message);
  if (typeof ack === "function") {
    ack({ ok: false, error: message });
  }
}

function broadcastRoom(room) {
  if (!room) return;
  for (const player of room.players) {
    io.to(player.socketId).emit(
      SOCKET_EVENTS.ROOM_UPDATED,
      toPlayerView(room, player.playerId),
    );
  }
}

async function joinSocketToRoom(socket, roomCode) {
  await socket.join(roomCode);
}

io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  socket.on(SOCKET_EVENTS.CREATE_ROOM, async (payload, ack) => {
    const playerName = validateName(payload?.playerName);
    if (!playerName) {
      emitError(socket, "Invalid name", ack);
      return;
    }

    const result = rooms.createRoom(
      socket.id,
      playerName,
      payload?.maxPlayers,
    );
    if (!result.ok) {
      emitError(socket, result.error, ack);
      return;
    }

    const { room } = result;
    await joinSocketToRoom(socket, room.roomCode);
    broadcastRoom(room);

    if (typeof ack === "function") {
      ack({ ok: true, data: { roomCode: room.roomCode } });
    }
  });

  socket.on(SOCKET_EVENTS.JOIN_ROOM, async (payload, ack) => {
    const playerName = validateName(payload?.playerName);
    const roomCode =
      typeof payload?.roomCode === "string"
        ? payload.roomCode.trim().toUpperCase()
        : "";

    if (!playerName || !roomCode) {
      emitError(socket, "Invalid input", ack);
      return;
    }

    const result = rooms.joinRoom(roomCode, socket.id, playerName);
    if (!result.ok) {
      emitError(socket, result.error, ack);
      return;
    }

    const { room } = result;
    const joinedPlayer = room.players.find((p) => p.socketId === socket.id);
    await joinSocketToRoom(socket, room.roomCode);

    socket
      .to(room.roomCode)
      .emit(SOCKET_EVENTS.PLAYER_CONNECTED, joinedPlayer);

    broadcastRoom(room);

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`[socket] disconnected: ${socket.id} (${reason})`);

    const removal = rooms.removePlayer(socket.id);
    if (!removal) return;

    const { room, removedPlayer } = removal;

    if (!room) {
      return;
    }

    io.to(room.roomCode).emit(SOCKET_EVENTS.PLAYER_DISCONNECTED, {
      roomCode: room.roomCode,
      playerId: removedPlayer.playerId,
    });
    broadcastRoom(room);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
