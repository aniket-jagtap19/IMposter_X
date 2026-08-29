import type {
  CreateRoomInput,
  GamePhase,
  JoinRoomInput,
  Player,
  PlayerGameView,
} from "./game";

/** Central registry — no magic strings in handlers or hooks. */
export const SOCKET_EVENTS = {
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
} as const;

export type SocketEventName =
  (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export interface AckResponse<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

export interface PlayerDisconnectedPayload {
  roomCode: string;
  playerId: string;
}

export interface SubmitVoteInput {
  targetPlayerId: string;
}

export interface PhaseChangedPayload {
  roomCode: string;
  phase: GamePhase;
  roundNumber: number | null;
}

export interface TimerUpdatedPayload {
  roomCode: string;
  discussionEndTime: number | null;
  votingEndTime: number | null;
}

export interface RoundStartedPayload {
  roomCode: string;
  roundNumber: number;
  category: string;
}

export interface ClientToServerEvents {
  [SOCKET_EVENTS.CREATE_ROOM]: (
    payload: CreateRoomInput,
    ack: (res: AckResponse<{ roomCode: string }>) => void,
  ) => void;
  [SOCKET_EVENTS.JOIN_ROOM]: (
    payload: JoinRoomInput,
    ack: (res: AckResponse) => void,
  ) => void;
  [SOCKET_EVENTS.START_GAME]: (
    ack: (res: AckResponse) => void,
  ) => void;
  [SOCKET_EVENTS.SUBMIT_VOTE]: (
    payload: SubmitVoteInput,
    ack: (res: AckResponse) => void,
  ) => void;
}

export interface ServerToClientEvents {
  [SOCKET_EVENTS.ROOM_UPDATED]: (view: PlayerGameView) => void;
  [SOCKET_EVENTS.GAME_UPDATED]: (view: PlayerGameView) => void;
  [SOCKET_EVENTS.PHASE_CHANGED]: (payload: PhaseChangedPayload) => void;
  [SOCKET_EVENTS.TIMER_UPDATED]: (payload: TimerUpdatedPayload) => void;
  [SOCKET_EVENTS.ROUND_STARTED]: (payload: RoundStartedPayload) => void;
  [SOCKET_EVENTS.PLAYER_CONNECTED]: (player: Player) => void;
  [SOCKET_EVENTS.PLAYER_DISCONNECTED]: (
    payload: PlayerDisconnectedPayload,
  ) => void;
  [SOCKET_EVENTS.ERROR]: (message: string) => void;
}

export interface InterServerEvents {
  _ping?: never;
}

export interface SocketData {
  playerId: string;
  roomCode: string;
}

// Automated maintenance update - 2026-08-28 22:40:34

// Project by Aniket Jagtap, time: - 2026-08-28 23:15:06

// Project by Aniket Jagtap, time: - 2026-08-29 11:49:23
