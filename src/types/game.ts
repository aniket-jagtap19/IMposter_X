/** Default room capacity (see PROJECT_CONTEXT: 4–8 players). */
export const DEFAULT_MAX_PLAYERS = 8;
export const MIN_PLAYERS = 4;

export enum GamePhase {
  Lobby = "lobby",
  Clues = "clues",
  Discussion = "discussion",
  Voting = "voting",
  Reveal = "reveal",
  RoundEnd = "round-end",
  GameOver = "game-over",
}

export type PlayerRole = "imposter" | "crew";

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
  round: number;
  maxRounds: number;
  phaseEndsAt: number | null;
  imposterPlayerId: string | null;
  eliminatedPlayerId: string | null;
}

/** Per-player room snapshot from server (role/topic visibility). */
export interface PlayerGameView extends Room {
  playerId: string;
  role: PlayerRole | null;
  topic: string | null;
}

export interface CreateRoomInput {
  playerName: string;
  maxPlayers?: number;
}

export interface JoinRoomInput {
  roomCode: string;
  playerName: string;
}
