import { create } from "zustand";
import type {
  GamePhase,
  Player,
  PlayerGameView,
  RoundState,
} from "@/types/game";

export interface GameTimer {
  discussionEndTime: number | null;
  votingEndTime: number | null;
}

interface GameState {
  currentPlayer: Player | null;
  currentRoom: PlayerGameView | null;
  currentPhase: GamePhase | null;
  roundState: RoundState | null;
  timer: GameTimer;
  connected: boolean;
  setPlayer: (player: Player | null) => void;
  setRoom: (room: PlayerGameView | null) => void;
  setPhase: (phase: GamePhase | null) => void;
  setRoundState: (roundState: RoundState | null) => void;
  setTimer: (timer: GameTimer) => void;
  setConnected: (connected: boolean) => void;
  resetGame: () => void;
}

const initialTimer: GameTimer = {
  discussionEndTime: null,
  votingEndTime: null,
};

const initialState = {
  currentPlayer: null as Player | null,
  currentRoom: null as PlayerGameView | null,
  currentPhase: null as GamePhase | null,
  roundState: null as RoundState | null,
  timer: initialTimer,
  connected: false,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  setPlayer: (currentPlayer) => set({ currentPlayer }),
  setRoom: (currentRoom) => set({ currentRoom }),
  setPhase: (currentPhase) => set({ currentPhase }),
  setRoundState: (roundState) => set({ roundState }),
  setTimer: (timer) => set({ timer }),
  setConnected: (connected) => set({ connected }),
  resetGame: () => set({ ...initialState, timer: { ...initialTimer } }),
}));
