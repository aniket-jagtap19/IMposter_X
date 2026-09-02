/** Default room capacity (see PROJECT_CONTEXT: 4–8 players). */
export const DEFAULT_MAX_PLAYERS = 8;
export const MIN_PLAYERS = 4;

export enum GamePhase {
  Lobby = "lobby",
  RoleReveal = "role-reveal",
  Discussion = "discussion",
  Voting = "voting",
  Reveal = "reveal",
  Scoreboard = "scoreboard",
}

export type PlayerRole = "imposter" | "crew";

/** voterPlayerId → targetPlayerId */
export type VoteMap = Record<string, string>;

export interface RoundState {
  roundNumber: number;
  topic: string;
  category: string;
  imposterId: string | null;
  discussionEndTime: number | null;
  votingEndTime: number | null;
  revealedPlayerId: string | null;
  votes: VoteMap;
}

export interface Player {
  /** Stable identity across reconnects within a session. */
  playerId: string;
  /** Current Socket.IO connection id (changes on reconnect). */
  socketId: string;
  name: string;
  score: number;
  isHost: boolean;
  connected: boolean;
  hasSubmittedClue: boolean;
  clue: string | null;
  voteTargetPlayerId: string | null;
}

export interface Room {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  maxPlayers: number;
  hostPlayerId: string;
  maxRounds: number;
  currentRound: RoundState | null;
}

/** Per-player room snapshot from server (role/topic visibility). */
export interface PlayerGameView extends Room {
  playerId: string;
  role: PlayerRole | null;
  /** Hidden from imposter during active phases. */
  topic: string | null;
  /** Category hint visible to all players. */
  category: string | null;
}

export interface CreateRoomInput {
  playerName: string;
  maxPlayers?: number;
}

export interface JoinRoomInput {
  roomCode: string;
  playerName: string;
}

// Project by Aniket Jagtap, time: - 2026-08-28 22:48:55

// Project by Aniket Jagtap, time: - 2026-09-02 21:27:08
