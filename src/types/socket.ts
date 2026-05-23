import type {
  CreateRoomInput,
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

export interface ClientToServerEvents {
  [SOCKET_EVENTS.CREATE_ROOM]: (
    payload: CreateRoomInput,
    ack: (res: AckResponse<{ roomCode: string }>) => void,
  ) => void;
  [SOCKET_EVENTS.JOIN_ROOM]: (
    payload: JoinRoomInput,
    ack: (res: AckResponse) => void,
  ) => void;
}

export interface ServerToClientEvents {
  [SOCKET_EVENTS.ROOM_UPDATED]: (view: PlayerGameView) => void;
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
