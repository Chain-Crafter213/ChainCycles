// Game API - High-level functions for ChainCycles Arcade
// 6 games: Chess, Connect Four, Reversi, Gomoku, Battleship, Mancala

import { 
  query, 
  mutate, 
  queryWithSync, 
  getChainId, 
  getWalletAddress,
} from './linera';
import type { 
  GameRoom, 
  PlayerProfile, 
  GameType, 
  MoveData,
  ChessBoard,
  ConnectFourBoard,
  ReversiBoard,
  GomokuBoard,
  BattleshipBoard,
  MancalaBoard,
} from './types';

// ============================================================================
// GRAPHQL QUERIES
// ============================================================================

const QUERIES = {
  // Room state
  GET_ROOM: `
    query GetRoom {
      room {
        hostChainId
        playerChainIds
        playerWallets
        usernames
        gameType
        status
        currentTurn
        winner
        createdAt
        lastMoveAt
        chessBoard {
          board
          whiteTurn
          castling
          enPassant
          halfmove
          fullmove
          moves
          fen
        }
        connectFourBoard {
          cells { player }
          moves
        }
        reversiBoard {
          cells
          moves
          consecutivePasses
        }
        gomokuBoard {
          cells
          moves
        }
        battleshipBoard {
          p1Ships
          p1Hits
          p2Ships
          p2Hits
          setupPhase
          p1Ready
          p2Ready
          moves
          shipsSunk
        }
        mancalaBoard {
          pits
          moves
        }
      }
    }
  `,
  
  // Check hosting status
  IS_HOSTING: `
    query IsHosting {
      isHosting
      chainId
    }
  `,
  
  // Get joined host chain
  JOINED_HOST: `
    query JoinedHost {
      joinedHostChain
    }
  `,
  
  // Get player profile
  GET_PLAYER: `
    query GetPlayer($wallet: String!) {
      player(wallet: $wallet) {
        username
        wallet
        totalWins
        totalLosses
        totalDraws
        totalGames
        xp
        coins
        createdAt
      }
    }
  `,
  
  // Get recent rooms
  RECENT_ROOMS: `
    query RecentRooms {
      recentRooms
    }
  `,
  
  // Game status
  GAME_STATUS: `
    query GameStatus {
      gameStatus
      gameType
      currentTurn
      winner
    }
  `,
  
  // Check if it's player's turn
  IS_MY_TURN: `
    query IsMyTurn($wallet: String!) {
      isMyTurn(wallet: $wallet)
    }
  `,
  
  // Check if player can move
  CAN_MOVE: `
    query CanMove($wallet: String!) {
      canMove(wallet: $wallet)
    }
  `,
  
  // Get Connect Four valid columns
  CONNECT_FOUR_VALID_COLUMNS: `
    query ConnectFourValidColumns {
      connectFourValidColumns
    }
  `,
  
  // Get Reversi valid moves
  REVERSI_VALID_MOVES: `
    query ReversiValidMoves {
      reversiValidMoves
    }
  `,
  
  // Get Mancala player pits
  MANCALA_PLAYER_PITS: `
    query MancalaPlayerPits($playerIndex: Int!) {
      mancalaPlayerPits(playerIndex: $playerIndex)
    }
  `,
  
  // Get Mancala stores
  MANCALA_STORES: `
    query MancalaStores {
      mancalaStores
    }
  `,
  
  // Get specific boards
  CHESS_BOARD: `
    query ChessBoard {
      chessBoard {
        board
        whiteTurn
        castling
        enPassant
        halfmove
        fullmove
        moves
        fen
      }
    }
  `,
  
  CONNECT_FOUR_BOARD: `
    query ConnectFourBoard {
      connectFourBoard {
        cells { player }
        moves
      }
    }
  `,
  
  REVERSI_BOARD: `
    query ReversiBoard {
      reversiBoard {
        cells
        moves
        consecutivePasses
      }
    }
  `,
  
  GOMOKU_BOARD: `
    query GomokuBoard {
      gomokuBoard {
        cells
        moves
      }
    }
  `,
  
  BATTLESHIP_BOARD: `
    query BattleshipBoard {
      battleshipBoard {
        p1Ships
        p1Hits
        p2Ships
        p2Hits
        setupPhase
        p1Ready
        p2Ready
        moves
        shipsSunk
      }
    }
  `,
  
  MANCALA_BOARD: `
    query MancalaBoard {
      mancalaBoard {
        pits
        moves
      }
    }
  `,
};

const MUTATIONS = {
  // Register player
  REGISTER: `
    mutation Register($username: String!) {
      register(username: $username)
    }
  `,
  
  // Update profile
  UPDATE_PROFILE: `
    mutation UpdateProfile($username: String) {
      updateProfile(username: $username)
    }
  `,
  
  // Create room with game type
  CREATE_ROOM: `
    mutation CreateRoom($gameType: GameType!) {
      createRoom(gameType: $gameType)
    }
  `,
  
  // Join room
  JOIN_ROOM: `
    mutation JoinRoom($hostChainId: String!) {
      joinRoom(hostChainId: $hostChainId)
    }
  `,
  
  // Leave room
  LEAVE_ROOM: `
    mutation LeaveRoom {
      leaveRoom
    }
  `,
  
  // Clear room
  CLEAR_ROOM: `
    mutation ClearRoom {
      clearRoom
    }
  `,
  
  // Make a move (unified for all games)
  MAKE_MOVE: `
    mutation MakeMove($primary: Int!, $secondary: String) {
      makeMove(primary: $primary, secondary: $secondary)
    }
  `,
  
  // Sync inbox
  SYNC_INBOX: `
    mutation SyncInbox {
      syncInbox
    }
  `,
};

// ============================================================================
// PLAYER OPERATIONS
// ============================================================================

/**
 * Register a new player
 */
export async function registerPlayer(username: string): Promise<void> {
  await mutate(MUTATIONS.REGISTER, { username });
}

/**
 * Get player profile
 */
export async function getPlayerProfile(wallet: string): Promise<PlayerProfile | null> {
  const result = await query<{ player: PlayerProfile | null }>(QUERIES.GET_PLAYER, { wallet });
  return result.player;
}

/**
 * Get current player's profile
 */
export async function getCurrentPlayerProfile(): Promise<PlayerProfile | null> {
  const wallet = getWalletAddress();
  return getPlayerProfile(wallet);
}

/**
 * Update player profile
 */
export async function updateProfile(username?: string): Promise<void> {
  await mutate(MUTATIONS.UPDATE_PROFILE, { username });
}

// ============================================================================
// ROOM OPERATIONS
// ============================================================================

/**
 * Create a new game room with specified game type
 */
export async function createRoom(gameType: GameType): Promise<string> {
  await mutate(MUTATIONS.CREATE_ROOM, { gameType });
  const chainId = getChainId();
  return chainId;
}

/**
 * Join an existing room by host chain ID
 */
export async function joinRoom(hostChainId: string): Promise<void> {
  await mutate(MUTATIONS.JOIN_ROOM, { hostChainId });
  
  // Add to recent rooms in localStorage
  const recent = JSON.parse(localStorage.getItem('chaincycles_recent_rooms') || '[]');
  if (!recent.includes(hostChainId)) {
    recent.unshift(hostChainId);
    if (recent.length > 10) recent.pop();
    localStorage.setItem('chaincycles_recent_rooms', JSON.stringify(recent));
  }
}

/**
 * Leave current room
 */
export async function leaveRoom(): Promise<void> {
  await mutate(MUTATIONS.LEAVE_ROOM);
}

/**
 * Clear finished room state
 */
export async function clearRoom(): Promise<void> {
  await mutate(MUTATIONS.CLEAR_ROOM);
}

/**
 * Get current room state (local, no sync)
 */
export async function getRoom(): Promise<GameRoom | null> {
  const result = await query<{ room: GameRoom | null }>(QUERIES.GET_ROOM);
  return result.room;
}

/**
 * Get current room state with sync (processes inbox first)
 * USE THIS when waiting for opponent moves or state updates
 */
export async function getRoomSynced(): Promise<GameRoom | null> {
  const result = await queryWithSync<{ room: GameRoom | null }>(QUERIES.GET_ROOM);
  return result.room;
}

/**
 * Check if this chain is hosting a room
 */
export async function isHosting(): Promise<boolean> {
  const result = await query<{ isHosting: boolean }>(QUERIES.IS_HOSTING);
  return result.isHosting;
}

/**
 * Get recent rooms from localStorage
 */
export function getRecentRooms(): string[] {
  return JSON.parse(localStorage.getItem('chaincycles_recent_rooms') || '[]');
}

/**
 * Sync inbox (process pending cross-chain messages)
 */
export async function syncInbox(): Promise<void> {
  await mutate(MUTATIONS.SYNC_INBOX);
}

// ============================================================================
// GAMEPLAY OPERATIONS - UNIFIED MAKE_MOVE
// ============================================================================

/**
 * Make a move in the current game
 * @param moveData - The move data (game-specific format)
 */
export async function makeMove(moveData: MoveData): Promise<void> {
  await mutate(MUTATIONS.MAKE_MOVE, {
    primary: moveData.primary,
    secondary: moveData.secondary ?? null,
  });
}

// ============================================================================
// GAME-SPECIFIC MOVE HELPERS
// ============================================================================

/**
 * Make a Chess move (UCI notation)
 * @param uciMove - UCI move string (e.g., "e2e4", "e7e8q" for promotion)
 */
export async function makeChessMove(uciMove: string): Promise<void> {
  await makeMove({ primary: 0, secondary: uciMove });
}

/**
 * Make a Connect Four move
 * @param column - Column index (0-6)
 */
export async function makeConnectFourMove(column: number): Promise<void> {
  await makeMove({ primary: column });
}

/**
 * Make a Reversi move
 * @param position - Board position (0-63), or -1 to pass
 */
export async function makeReversiMove(position: number): Promise<void> {
  await makeMove({ primary: position });
}

/**
 * Pass turn in Reversi (when no valid moves)
 */
export async function passReversi(): Promise<void> {
  await makeMove({ primary: -1 });
}

/**
 * Make a Gomoku move
 * @param position - Board position (0-224 for 15x15)
 */
export async function makeGomokuMove(position: number): Promise<void> {
  await makeMove({ primary: position });
}

/**
 * Place ships in Battleship (setup phase)
 * @param shipData - JSON string describing ship placements
 * Format: [{ shipSize: number, startPos: number, horizontal: boolean }, ...]
 */
export async function placeBattleshipShips(shipData: string): Promise<void> {
  await makeMove({ primary: 0, secondary: shipData });
}

/**
 * Attack in Battleship
 * @param position - Target position (0-99)
 */
export async function attackBattleship(position: number): Promise<void> {
  await makeMove({ primary: position });
}

/**
 * Make a Mancala move
 * @param pitIndex - Pit index (0-5 for current player's pits)
 */
export async function makeMancalaMove(pitIndex: number): Promise<void> {
  await makeMove({ primary: pitIndex });
}

// ============================================================================
// STATE HELPERS
// ============================================================================

/**
 * Check if it's the current player's turn
 */
export async function isMyTurn(): Promise<boolean> {
  const wallet = getWalletAddress();
  const result = await query<{ isMyTurn: boolean }>(QUERIES.IS_MY_TURN, { wallet });
  return result.isMyTurn;
}

/**
 * Check if current player can make a move
 */
export async function canMove(): Promise<boolean> {
  const wallet = getWalletAddress();
  const result = await query<{ canMove: boolean }>(QUERIES.CAN_MOVE, { wallet });
  return result.canMove;
}

/**
 * Get valid columns for Connect Four
 */
export async function getConnectFourValidColumns(): Promise<number[]> {
  const result = await query<{ connectFourValidColumns: number[] | null }>(QUERIES.CONNECT_FOUR_VALID_COLUMNS);
  return result.connectFourValidColumns ?? [];
}

/**
 * Get valid moves for Reversi
 */
export async function getReversiValidMoves(): Promise<number[]> {
  const result = await query<{ reversiValidMoves: number[] | null }>(QUERIES.REVERSI_VALID_MOVES);
  return result.reversiValidMoves ?? [];
}

// ============================================================================
// BOARD GETTERS
// ============================================================================

export async function getChessBoard(): Promise<ChessBoard | null> {
  const result = await query<{ chessBoard: ChessBoard | null }>(QUERIES.CHESS_BOARD);
  return result.chessBoard;
}

export async function getConnectFourBoard(): Promise<ConnectFourBoard | null> {
  const result = await query<{ connectFourBoard: ConnectFourBoard | null }>(QUERIES.CONNECT_FOUR_BOARD);
  return result.connectFourBoard;
}

export async function getReversiBoard(): Promise<ReversiBoard | null> {
  const result = await query<{ reversiBoard: ReversiBoard | null }>(QUERIES.REVERSI_BOARD);
  return result.reversiBoard;
}

export async function getGomokuBoard(): Promise<GomokuBoard | null> {
  const result = await query<{ gomokuBoard: GomokuBoard | null }>(QUERIES.GOMOKU_BOARD);
  return result.gomokuBoard;
}

export async function getBattleshipBoard(): Promise<BattleshipBoard | null> {
  const result = await query<{ battleshipBoard: BattleshipBoard | null }>(QUERIES.BATTLESHIP_BOARD);
  return result.battleshipBoard;
}

export async function getMancalaBoard(): Promise<MancalaBoard | null> {
  const result = await query<{ mancalaBoard: MancalaBoard | null }>(QUERIES.MANCALA_BOARD);
  return result.mancalaBoard;
}

// ============================================================================
// POLLING HELPERS
// ============================================================================

/**
 * Poll for room updates with exponential backoff
 */
export async function pollRoomUpdates(
  callback: (room: GameRoom | null) => void,
  interval: number = 2000,
  maxInterval: number = 5000,
  maxPolls: number = 100,
): Promise<() => void> {
  let currentInterval = interval;
  let lastRoom: string | null = null;
  let running = true;
  let pollCount = 0;
  
  const poll = async () => {
    if (!running) return;
    
    pollCount++;
    if (pollCount > maxPolls) {
      console.log('[Poll] Max polls reached, stopping');
      running = false;
      return;
    }
    
    try {
      const room = await getRoomSynced();
      const roomStr = JSON.stringify(room);
      
      // Only call callback if room changed
      if (roomStr !== lastRoom) {
        console.log('[Poll] Room state changed:', room ? room.status : 'null');
        lastRoom = roomStr;
        currentInterval = interval; // Reset interval on change
        callback(room);
      } else {
        // Increase interval if no change (backoff)
        currentInterval = Math.min(currentInterval * 1.5, maxInterval);
      }
    } catch (e) {
      console.error('[Poll] Error:', e);
    }
    
    if (running) {
      setTimeout(poll, currentInterval);
    }
  };
  
  poll();
  
  // Return cancel function
  return () => {
    running = false;
  };
}

// ============================================================================
// EXPORTS FOR BACKWARD COMPATIBILITY
// ============================================================================

export { getChainId, getWalletAddress } from './linera';
