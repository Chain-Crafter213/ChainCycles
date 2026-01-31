// Zustand store for game state - ChainCycles Arcade
// Supports 6 games: Chess, Connect Four, Reversi, Gomoku, Battleship, Mancala

import { create } from 'zustand';
import type { GameRoom, GameType, MoveData } from '../lib/types';
import { 
  createRoom, 
  joinRoom, 
  leaveRoom, 
  getRoom, 
  getRoomSynced,
  makeMove,
  pollRoomUpdates,
} from '../lib/gameApi';

interface GameState {
  // Room state
  room: GameRoom | null;
  isLoading: boolean;
  error: string | null;
  
  // Polling
  pollCanceller: (() => void) | null;
  
  // Actions
  setRoom: (room: GameRoom | null) => void;
  setError: (error: string | null) => void;
  
  // Room operations
  createNewRoom: (gameType: GameType) => Promise<string>;
  joinExistingRoom: (hostChainId: string) => Promise<void>;
  leaveCurrentRoom: () => Promise<void>;
  
  // Gameplay - unified move action
  submitMove: (moveData: MoveData) => Promise<void>;
  
  // Polling
  startPolling: () => void;
  stopPolling: () => void;
  syncRoom: () => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  room: null,
  isLoading: false,
  error: null,
  pollCanceller: null,
  
  setRoom: (room) => set({ room }),
  
  setError: (error) => set({ error }),
  
  createNewRoom: async (gameType: GameType) => {
    set({ isLoading: true, error: null });
    try {
      const hostChainId = await createRoom(gameType);
      const room = await getRoom();
      set({ room, isLoading: false });
      return hostChainId;
    } catch (err) {
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to create room' 
      });
      throw err;
    }
  },
  
  joinExistingRoom: async (hostChainId) => {
    set({ isLoading: true, error: null });
    try {
      await joinRoom(hostChainId);
      // Start polling for GameStateSync message
      get().startPolling();
      set({ isLoading: false });
    } catch (err) {
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to join room' 
      });
      throw err;
    }
  },
  
  leaveCurrentRoom: async () => {
    set({ isLoading: true, error: null });
    try {
      get().stopPolling();
      await leaveRoom();
      set({ room: null, isLoading: false });
    } catch (err) {
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to leave room' 
      });
    }
  },
  
  submitMove: async (moveData: MoveData) => {
    set({ isLoading: true, error: null });
    try {
      await makeMove(moveData);
      // Sync to get updated state after move
      await get().syncRoom();
      set({ isLoading: false });
    } catch (err) {
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to make move' 
      });
      throw err;
    }
  },
  
  startPolling: () => {
    // Stop any existing polling
    get().stopPolling();
    
    // Start new polling
    pollRoomUpdates((room) => {
      set({ room });
    }).then((canceller) => {
      set({ pollCanceller: canceller });
    });
  },
  
  stopPolling: () => {
    const canceller = get().pollCanceller;
    if (canceller) {
      canceller();
      set({ pollCanceller: null });
    }
  },
  
  syncRoom: async () => {
    try {
      const room = await getRoomSynced();
      set({ room });
    } catch (err) {
      console.error('Failed to sync room:', err);
    }
  },
}));
