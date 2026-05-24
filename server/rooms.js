const MAX_PLAYERS = 8;
const CODE_LENGTH = 6;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRoomCode(existingCodes) {
  let code = "";
  do {
    code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
  } while (existingCodes.has(code));
  return code;
}

function createPlayer(playerId, socketId, name, isHost) {
  return {
    playerId,
    socketId,
    name: name.trim(),
    score: 0,
    isHost,
    connected: true,
    hasSubmittedClue: false,
    clue: null,
    voteTargetPlayerId: null,
  };
}

function createRoomState(roomCode, hostPlayer, maxPlayers) {
  return {
    roomCode,
    phase: "lobby",
    players: [hostPlayer],
    maxPlayers,
    hostPlayerId: hostPlayer.playerId,
    maxRounds: 5,
    currentRound: null,
  };
}

function assignHost(room) {
  const next = room.players[0];
  if (!next) return;
  room.hostPlayerId = next.playerId;
  for (const player of room.players) {
    player.isHost = player.playerId === next.playerId;
  }
}

class RoomManager {
  constructor() {
    /** @type {Map<string, object>} */
    this.rooms = new Map();
  }

  /**
   * @param {string} socketId
   * @param {string} playerName
   * @param {number} [maxPlayers]
   */
  createRoom(socketId, playerName, maxPlayers = MAX_PLAYERS) {
    const name = playerName?.trim();
    if (!name) return { ok: false, error: "Invalid name" };

    const existing = this.findBySocketId(socketId);
    if (existing) return { ok: false, error: "Already in a room" };

    const cap = Math.min(Math.max(maxPlayers, 1), MAX_PLAYERS);
    const code = generateRoomCode(new Set(this.rooms.keys()));
    const host = createPlayer(socketId, socketId, name, true);
    const room = createRoomState(code, host, cap);

    this.rooms.set(code, room);
    return { ok: true, room };
  }

  /**
   * @param {string} roomCode
   * @param {string} socketId
   * @param {string} playerName
   */
  joinRoom(roomCode, socketId, playerName) {
    const code = roomCode?.trim().toUpperCase();
    const name = playerName?.trim();
    if (!code || !name) return { ok: false, error: "Invalid input" };

    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: "Room not found" };
    if (room.phase !== "lobby") {
      return { ok: false, error: "Game already started" };
    }
    if (room.players.length >= room.maxPlayers) {
      return { ok: false, error: "Room is full" };
    }

    const existing = this.findBySocketId(socketId);
    if (existing) return { ok: false, error: "Already in a room" };

    if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return { ok: false, error: "Name already taken" };
    }

    room.players.push(createPlayer(socketId, socketId, name, false));
    return { ok: true, room };
  }

  /**
   * @param {string} socketId
   */
  removePlayer(socketId) {
    const found = this.findBySocketId(socketId);
    if (!found) return null;

    const { room, player } = found;
    const roomCode = room.roomCode;
    room.players = room.players.filter((p) => p.socketId !== socketId);

    if (room.players.length === 0) {
      this.rooms.delete(roomCode);
      return { room: null, removedPlayer: player, roomCode };
    }

    if (room.hostPlayerId === player.playerId) {
      assignHost(room);
    }

    return { room, removedPlayer: player, roomCode };
  }

  /**
   * @param {string} roomCode
   */
  getRoom(roomCode) {
    const code = roomCode?.trim().toUpperCase();
    if (!code) return null;
    return this.rooms.get(code) ?? null;
  }

  /**
   * @param {string} socketId
   */
  findBySocketId(socketId) {
    for (const room of this.rooms.values()) {
      const player = room.players.find((p) => p.socketId === socketId);
      if (player) return { room, player };
    }
    return null;
  }
}

module.exports = { RoomManager, MAX_PLAYERS };
