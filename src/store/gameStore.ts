import { create } from "zustand";
import type { Player, PlayerGameView } from "@/types/game";

interface GameState {
  currentPlayer: Player | null;
  currentRoom: PlayerGameView | null;
  connected: boolean;
  setPlayer: (player: Player | null) => void;
  setRoom: (room: PlayerGameView | null) => void;
  setConnected: (connected: boolean) => void;
  resetGame: () => void;
}

const initialState = {
  currentPlayer: null as Player | null,
  currentRoom: null as PlayerGameView | null,
  connected: false,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  setPlayer: (currentPlayer) => set({ currentPlayer }),
  setRoom: (currentRoom) => set({ currentRoom }),
  setConnected: (connected) => set({ connected }),
  resetGame: () => set({ ...initialState }),
}));
