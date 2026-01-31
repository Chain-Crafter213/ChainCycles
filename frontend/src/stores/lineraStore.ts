// Zustand store for Linera connection state
// Updated to use new adapter pattern with wallet connection

import { create } from 'zustand';
import { lineraAdapter, type ConnectionState } from '../lib/linera';
import type { DynamicWallet } from '../lib/linera';
import { getCurrentPlayerProfile, registerPlayer } from '../lib/gameApi';
import type { PlayerProfile } from '../lib/types';

interface LineraState {
  // Connection state
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  
  // User data
  chainId: string | null;
  userAddress: string | null;
  autoSignerAddress: string | null;
  profile: PlayerProfile | null;
  
  // Actions
  connectWithWallet: (wallet: DynamicWallet) => Promise<void>;
  connectWithPrivateKey: () => Promise<void>;
  disconnect: () => void;
  refreshProfile: () => Promise<void>;
  register: (username: string) => Promise<void>;
  updateFromState: (state: ConnectionState) => void;
}

export const useLineraStore = create<LineraState>((set, get) => ({
  isConnecting: false,
  isConnected: false,
  error: null,
  chainId: null,
  userAddress: null,
  autoSignerAddress: null,
  profile: null,
  
  /**
   * Connect with an EVM wallet (MetaMask via Dynamic.xyz)
   */
  connectWithWallet: async (wallet: DynamicWallet) => {
    if (get().isConnecting) return;
    
    set({ isConnecting: true, error: null });
    
    try {
      const state = await lineraAdapter.connect(wallet);
      
      set({
        isConnecting: false,
        isConnected: true,
        chainId: state.chainId,
        userAddress: state.userAddress,
        autoSignerAddress: state.autoSignerAddress,
      });
      
      // Try to load profile, auto-register if needed
      try {
        let profile = await getCurrentPlayerProfile();
        if (!profile) {
          // Auto-register with default username
          const shortAddr = state.userAddress?.slice(0, 8) || 'Player';
          const defaultUsername = `Player_${shortAddr}`;
          console.log('[LineraStore] Auto-registering user:', defaultUsername);
          await registerPlayer(defaultUsername);
          profile = await getCurrentPlayerProfile();
        }
        set({ profile });
      } catch (regErr) {
        console.warn('[LineraStore] Profile/registration error:', regErr);
        // Continue even if registration fails
      }
    } catch (err) {
      set({
        isConnecting: false,
        error: err instanceof Error ? err.message : 'Failed to connect',
      });
      throw err;
    }
  },
  
  /**
   * Connect with a standalone private key (no wallet required)
   */
  connectWithPrivateKey: async () => {
    if (get().isConnecting) return;
    
    set({ isConnecting: true, error: null });
    
    try {
      const state = await lineraAdapter.connectWithPrivateKey();
      
      set({
        isConnecting: false,
        isConnected: true,
        chainId: state.chainId,
        userAddress: state.userAddress,
        autoSignerAddress: state.autoSignerAddress,
      });
      
      // Try to load profile, auto-register if needed
      try {
        let profile = await getCurrentPlayerProfile();
        if (!profile) {
          // Auto-register with default username
          const shortAddr = state.autoSignerAddress?.slice(2, 10) || 'Anon';
          const defaultUsername = `Player_${shortAddr}`;
          console.log('[LineraStore] Auto-registering user:', defaultUsername);
          await registerPlayer(defaultUsername);
          profile = await getCurrentPlayerProfile();
        }
        set({ profile });
      } catch (regErr) {
        console.warn('[LineraStore] Profile/registration error:', regErr);
        // Continue even if registration fails
      }
    } catch (err) {
      set({
        isConnecting: false,
        error: err instanceof Error ? err.message : 'Failed to connect',
      });
      throw err;
    }
  },
  
  disconnect: () => {
    lineraAdapter.disconnect();
    set({
      isConnected: false,
      chainId: null,
      userAddress: null,
      autoSignerAddress: null,
      profile: null,
      error: null,
    });
  },
  
  refreshProfile: async () => {
    try {
      const profile = await getCurrentPlayerProfile();
      set({ profile });
    } catch {
      // Ignore errors
    }
  },
  
  register: async (username: string) => {
    await registerPlayer(username);
    await get().refreshProfile();
  },
  
  updateFromState: (state: ConnectionState) => {
    set({
      isConnected: state.isConnected,
      chainId: state.chainId,
      userAddress: state.userAddress,
      autoSignerAddress: state.autoSignerAddress,
    });
  },
}));
