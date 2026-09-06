const { pickRandomRoundTopic } = require("./topics");

const MIN_PLAYERS = 4;
const MAX_ROUNDS = 5;
const ROLE_REVEAL_MS = 5_000;
const DISCUSSION_MS = 90_000;
const VOTING_MS = 60_000;
const REVEAL_MS = 4_000;

/** Mirror src/types/game.ts GamePhase values. */
const PHASES = {
  Lobby: "lobby",
  RoleReveal: "role-reveal",
  Discussion: "discussion",
  Voting: "voting",
  Reveal: "reveal",
  Scoreboard: "scoreboard",
};

/**
 * @param {object} room
 * @param {string} phase
 */
function transitionPhase(room, phase) {
  room.phase = phase;
}

/**
 * @param {{ playerId: string }[]} players
 * @returns {string}
 */
function pickImposter(players) {
  const index = Math.floor(Math.random() * players.length);
  return players[index].playerId;
}

/**
 * @param {number} roundNumber
 * @param {string} topic
 * @param {string} category
 * @param {string} imposterId
 */
function createRoundState(roundNumber, topic, category, imposterId) {
  return {
    roundNumber,
    topic,
    category,
    imposterId,
    discussionEndTime: null,
    votingEndTime: null,
    revealedPlayerId: null,
    votes: {},
  };
}

/**
 * @param {object} room
 */
function resetRoundPlayerState(room) {
  for (const player of room.players) {
    player.hasSubmittedClue = false;
    player.clue = null;
    player.voteTargetPlayerId = null;
  }
}

/**
 * @param {object} room
 */
function initializeRound(room) {
  const roundNumber = (room.currentRound?.roundNumber ?? 0) + 1;
  const { category, topic } = pickRandomRoundTopic();
  const imposterId = pickImposter(room.players);

  room.currentRound = createRoundState(roundNumber, topic, category, imposterId);
  resetRoundPlayerState(room);
}

/**
 * @param {object} room
 * @param {string} eliminatedPlayerId
 */
function applyRoundScores(room, eliminatedPlayerId) {
  const round = room.currentRound;
  if (!round) return;

  const imposterCaught = eliminatedPlayerId === round.imposterId;

  for (const player of room.players) {
    if (imposterCaught && player.playerId !== round.imposterId) {
      player.score += 1;
    }
    if (!imposterCaught && player.playerId === round.imposterId) {
      player.score += 2;
    }
  }
}

/**
 * @param {Record<string, string>} votes
 * @returns {string | null}
 */
function tallyVotes(votes) {
  const counts = {};

  for (const targetId of Object.values(votes)) {
    counts[targetId] = (counts[targetId] ?? 0) + 1;
  }

  let topId = null;
  let topCount = 0;

  for (const [playerId, count] of Object.entries(counts)) {
    if (count > topCount) {
      topCount = count;
      topId = playerId;
    }
  }

  return topId;
}

/**
 * @param {object} room
 * @param {string} playerId
 */
function getPlayerRole(room, playerId) {
  if (room.phase === PHASES.Lobby || !room.currentRound) {
    return null;
  }

  return room.currentRound.imposterId === playerId ? "imposter" : "crew";
}

/**
 * @param {object} room
 * @param {string} playerId
 */
function getPlayerTopic(room, playerId) {
  const round = room.currentRound;
  if (!round || room.phase === PHASES.Lobby) {
    return null;
  }

  if (round.imposterId === playerId) {
    return null;
  }

  return round.topic;
}

/**
 * @param {object} room
 * @param {string} playerId
 */
function getPlayerView(room, playerId) {
  const round = room.currentRound;

  return {
    roomCode: room.roomCode,
    phase: room.phase,
    players: room.players,
    maxPlayers: room.maxPlayers,
    hostPlayerId: room.hostPlayerId,
    maxRounds: room.maxRounds,
    currentRound: round,
    playerId,
    role: getPlayerRole(room, playerId),
    topic: getPlayerTopic(room, playerId),
    category: round?.category ?? null,
  };
}

class GameEngine {
  /**
   * @param {(room: object) => void} [onRoomUpdated]
   */
  constructor(onRoomUpdated) {
    /** @type {Map<string, NodeJS.Timeout>} */
    this.timers = new Map();
    this.onRoomUpdated = onRoomUpdated ?? (() => {});
  }

  /**
   * @param {string} roomCode
   */
  clearTimer(roomCode) {
    const timer = this.timers.get(roomCode);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(roomCode);
    }
  }

  /**
   * @param {object} room
   * @param {number} delayMs
   * @param {() => void} callback
   */
  schedule(room, delayMs, callback) {
    this.clearTimer(room.roomCode);
    const timer = setTimeout(() => {
      this.timers.delete(room.roomCode);
      callback();
      this.onRoomUpdated(room);
    }, delayMs);
    this.timers.set(room.roomCode, timer);
  }

  /**
   * @param {object} room
   */
  notify(room) {
    this.onRoomUpdated(room);
  }

  /**
   * @param {object} room
   */
  startGame(room) {
    if (room.phase !== PHASES.Lobby) {
      return { ok: false, error: "Game already started" };
    }
    if (room.players.length < MIN_PLAYERS) {
      return { ok: false, error: `Need at least ${MIN_PLAYERS} players` };
    }

    room.maxRounds = room.maxRounds ?? MAX_ROUNDS;
    this.beginRound(room);
    return { ok: true };
  }

  /**
   * @param {object} room
   */
  beginRound(room) {
    initializeRound(room);
    this.enterRoleReveal(room);
    this.notify(room);
  }

  /**
   * @param {object} room
   */
  enterRoleReveal(room) {
    transitionPhase(room, PHASES.RoleReveal);
    this.schedule(room, ROLE_REVEAL_MS, () => this.enterDiscussion(room));
  }

  /**
   * @param {object} room
   */
  enterDiscussion(room) {
    transitionPhase(room, PHASES.Discussion);

    if (room.currentRound) {
      room.currentRound.discussionEndTime = Date.now() + DISCUSSION_MS;
    }

    this.schedule(room, DISCUSSION_MS, () => this.enterVoting(room));
  }

  /**
   * @param {object} room
   */
  enterVoting(room) {
    transitionPhase(room, PHASES.Voting);

    if (room.currentRound) {
      room.currentRound.votingEndTime = Date.now() + VOTING_MS;
    }

    this.schedule(room, VOTING_MS, () => this.resolveVoting(room));
  }

  /**
   * @param {object} room
   * @param {string} voterId
   * @param {string} targetId
   */
  castVote(room, voterId, targetId) {
    if (room.phase !== PHASES.Voting) {
      return { ok: false, error: "Not in voting phase" };
    }

    const round = room.currentRound;
    if (!round) {
      return { ok: false, error: "No active round" };
    }

    const voter = room.players.find((p) => p.playerId === voterId);
    const target = room.players.find((p) => p.playerId === targetId);

    if (!voter || !target) {
      return { ok: false, error: "Invalid vote" };
    }
    if (voterId === targetId) {
      return { ok: false, error: "Cannot vote for yourself" };
    }
    if (round.votes[voterId]) {
      return { ok: false, error: "Already voted" };
    }

    round.votes[voterId] = targetId;
    voter.voteTargetPlayerId = targetId;

    const allVoted = room.players.every((p) => round.votes[p.playerId]);
    if (allVoted) {
      this.clearTimer(room.roomCode);
      this.resolveVoting(room);
    }

    this.notify(room);
    return { ok: true };
  }

  /**
   * @param {object} room
   */
  resolveVoting(room) {
    const round = room.currentRound;
    if (!round) return;

    const eliminatedPlayerId = tallyVotes(round.votes);
    round.revealedPlayerId = eliminatedPlayerId;
    applyRoundScores(room, eliminatedPlayerId);
    this.enterReveal(room);
  }

  /**
   * @param {object} room
   */
  enterReveal(room) {
    transitionPhase(room, PHASES.Reveal);
    this.schedule(room, REVEAL_MS, () => this.enterScoreboard(room));
  }

  /**
   * @param {object} room
   */
  enterScoreboard(room) {
    transitionPhase(room, PHASES.Scoreboard);
    this.notify(room);
  }

  /**
   * @param {object} room
   */
  nextRound(room) {
    if (room.phase !== PHASES.Scoreboard) {
      return { ok: false, error: "Round not finished" };
    }

    const roundNumber = room.currentRound?.roundNumber ?? 0;
    if (roundNumber >= (room.maxRounds ?? MAX_ROUNDS)) {
      return this.returnToLobby(room);
    }

    this.beginRound(room);
    return { ok: true };
  }

  /**
   * @param {object} room
   */
  returnToLobby(room) {
    this.clearTimer(room.roomCode);
    transitionPhase(room, PHASES.Lobby);
    room.currentRound = null;
    resetRoundPlayerState(room);
    this.notify(room);
    return { ok: true };
  }

  /**
   * @param {string} roomCode
   */
  destroyRoom(roomCode) {
    this.clearTimer(roomCode);
  }
}

module.exports = {
  MIN_PLAYERS,
  MAX_ROUNDS,
  PHASES,
  ROLE_REVEAL_MS,
  DISCUSSION_MS,
  VOTING_MS,
  REVEAL_MS,
  transitionPhase,
  pickImposter,
  createRoundState,
  initializeRound,
  resetRoundPlayerState,
  applyRoundScores,
  tallyVotes,
  getPlayerRole,
  getPlayerTopic,
  getPlayerView,
  GameEngine,
};

// Project by Aniket Jagtap, time: - 2026-08-28 23:15:04

// Project by Aniket Jagtap, time: - 2026-09-06 22:40:09
