const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { GameEngine, getPlayerView } = require("./gameEngine");
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
  START_GAME: "game:start",
  GAME_UPDATED: "game:updated",
  PHASE_CHANGED: "phase:changed",
  TIMER_UPDATED: "timer:updated",
  SUBMIT_VOTE: "vote:submit",
  ROUND_STARTED: "round:started",
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

/**
 * @param {object} room
 */
function buildTimerPayload(room) {
  const round = room.currentRound;
  return {
    roomCode: room.roomCode,
    discussionEndTime: round?.discussionEndTime ?? null,
    votingEndTime: round?.votingEndTime ?? null,
  };
}

/**
 * @param {object} room
 */
function broadcastPhaseChanged(room) {
  io.to(room.roomCode).emit(SOCKET_EVENTS.PHASE_CHANGED, {
    roomCode: room.roomCode,
    phase: room.phase,
    roundNumber: room.currentRound?.roundNumber ?? null,
  });
}

/**
 * @param {object} room
 */
function broadcastTimerUpdated(room) {
  io.to(room.roomCode).emit(SOCKET_EVENTS.TIMER_UPDATED, buildTimerPayload(room));
}

/**
 * @param {object} room
 */
function broadcastRoundStarted(room) {
  const round = room.currentRound;
  if (!round) return;

  io.to(room.roomCode).emit(SOCKET_EVENTS.ROUND_STARTED, {
    roomCode: room.roomCode,
    roundNumber: round.roundNumber,
    category: round.category,
  });
}

/**
 * @param {object} room
 */
function broadcastGameUpdated(room) {
  if (!room) return;

  for (const player of room.players) {
    const view = getPlayerView(room, player.playerId);
    io.to(player.socketId).emit(SOCKET_EVENTS.GAME_UPDATED, view);
    io.to(player.socketId).emit(SOCKET_EVENTS.ROOM_UPDATED, view);
  }
}

/**
 * @param {object} room
 */
function syncRoomBroadcast(room) {
  const prevPhase = room._sync?.phase;
  const prevRound = room._sync?.roundNumber;
  const prevDiscussion = room._sync?.discussionEndTime;
  const prevVoting = room._sync?.votingEndTime;

  const round = room.currentRound;
  const phaseChanged = prevPhase !== room.phase;
  const roundStarted =
    round != null && prevRound !== round.roundNumber;
  const timerChanged =
    prevDiscussion !== (round?.discussionEndTime ?? null) ||
    prevVoting !== (round?.votingEndTime ?? null);

  if (phaseChanged) broadcastPhaseChanged(room);
  if (roundStarted) broadcastRoundStarted(room);
  if (timerChanged) broadcastTimerUpdated(room);
  broadcastGameUpdated(room);

  room._sync = {
    phase: room.phase,
    roundNumber: round?.roundNumber ?? null,
    discussionEndTime: round?.discussionEndTime ?? null,
    votingEndTime: round?.votingEndTime ?? null,
  };
}

const game = new GameEngine((room) => syncRoomBroadcast(room));

function validateName(name) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed || trimmed.length > 20) return null;
  return trimmed;
}

function emitError(socket, message, ack) {
  socket.emit(SOCKET_EVENTS.ERROR, message);
  if (typeof ack === "function") {
    ack({ ok: false, error: message });
  }
}

function getSocketRoom(socket) {
  return rooms.findBySocketId(socket.id);
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
    syncRoomBroadcast(room);

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

    syncRoomBroadcast(room);

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on(SOCKET_EVENTS.START_GAME, (ack) => {
    const found = getSocketRoom(socket);
    if (!found) {
      emitError(socket, "Not in a room", ack);
      return;
    }

    const { room, player } = found;

    if (room.hostPlayerId !== player.playerId) {
      emitError(socket, "Only the host can start the game", ack);
      return;
    }

    const result = game.startGame(room);
    if (!result.ok) {
      emitError(socket, result.error, ack);
      return;
    }

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on(SOCKET_EVENTS.SUBMIT_VOTE, (payload, ack) => {
    const found = getSocketRoom(socket);
    if (!found) {
      emitError(socket, "Not in a room", ack);
      return;
    }

    const targetPlayerId = payload?.targetPlayerId;
    if (typeof targetPlayerId !== "string" || !targetPlayerId) {
      emitError(socket, "Invalid vote", ack);
      return;
    }

    const { room, player } = found;
    const result = game.castVote(room, player.playerId, targetPlayerId);

    if (!result.ok) {
      emitError(socket, result.error, ack);
      return;
    }

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`[socket] disconnected: ${socket.id} (${reason})`);

    const removal = rooms.removePlayer(socket.id);
    if (!removal) return;

    const { room, removedPlayer, roomCode } = removal;

    if (!room) {
      game.destroyRoom(roomCode);
      return;
    }

    io.to(roomCode).emit(SOCKET_EVENTS.PLAYER_DISCONNECTED, {
      roomCode,
      playerId: removedPlayer.playerId,
    });
    syncRoomBroadcast(room);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
