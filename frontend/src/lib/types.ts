// Type definitions matching the Rust contract types for ChainCycles Arcade
// 6 games: Chess, Connect Four, Reversi, Gomoku, Battleship, Mancala

export type Player = 'One' | 'Two';

export type GameType = 
  | 'Chess'
  | 'ConnectFour'
  | 'Reversi'
  | 'Gomoku'
  | 'Battleship'
  | 'Mancala';

export type GameStatus = 
  | 'WaitingForPlayer'
  | 'InProgress'
  | 'Finished'
  | 'Draw'
  | 'Forfeited'
  | 'Abandoned';

// ============================================================================
// MOVE DATA
// ============================================================================

export interface MoveData {
  primary: number;       // Column for C4, position for others, -1 for pass
  secondary?: string;    // UCI move for chess, ship placement for battleship
}

// ============================================================================
// GAME BOARDS
// ============================================================================

// Chess Board
export interface ChessBoard {
  board: string[];        // 64 squares: " "=empty, uppercase=white, lowercase=black
  whiteTurn: boolean;     // true = white's turn
  castling: boolean[];    // [white_K, white_Q, black_k, black_q]
  enPassant: number;      // En passant target square (-1 if none)
  halfmove: number;       // Halfmove clock for 50-move rule
  fullmove: number;       // Fullmove number
  moves: string[];        // UCI move history
  fen: string;            // Current FEN notation
}

// Connect Four Cell
export interface Cell {
  player: Player | null;
}

// Connect Four Board (7x6)
export interface ConnectFourBoard {
  cells: Cell[];          // 42 cells, row-major from bottom
  moves: number[];        // Column history
}

// Reversi Board (8x8)
export interface ReversiBoard {
  cells: number[];        // 64 cells: 0=empty, 1=P1, 2=P2
  moves: number[];        // Position history
  consecutivePasses: number;
}

// Gomoku Board (15x15)
export interface GomokuBoard {
  cells: number[];        // 225 cells: 0=empty, 1=P1, 2=P2
  moves: number[];        // Position history
}

// Battleship Board (10x10 per player)
export interface BattleshipBoard {
  p1Ships: number[];      // Player 1's ship positions (100 cells)
  p1Hits: number[];       // Hits received on P1's board
  p2Ships: number[];      // Player 2's ship positions (100 cells)
  p2Hits: number[];       // Hits received on P2's board
  setupPhase: boolean;
  p1Ready: boolean;
  p2Ready: boolean;
  moves: number[];        // Attack history
  shipsSunk: number[];    // [p1_sunk, p2_sunk]
}

// Mancala Board
// Pits layout: [P1_0..P1_5, P1_Store, P2_0..P2_5, P2_Store]
export interface MancalaBoard {
  pits: number[];         // 14 pits (6 + store for each player)
  moves: number[];        // Pit index history
}

// ============================================================================
// GAME ROOM
// ============================================================================

export interface GameRoom {
  hostChainId: string;
  playerChainIds: string[];
  playerWallets: string[];
  usernames: string[];
  gameType: GameType;
  status: GameStatus;
  currentTurn: Player;
  winner: Player | null;
  createdAt: string;       // Timestamp (BigInt as string)
  lastMoveAt: string;

  // Game-specific boards (only one is populated based on gameType)
  chessBoard: ChessBoard | null;
  connectFourBoard: ConnectFourBoard | null;
  reversiBoard: ReversiBoard | null;
  gomokuBoard: GomokuBoard | null;
  battleshipBoard: BattleshipBoard | null;
  mancalaBoard: MancalaBoard | null;
}

// ============================================================================
// PLAYER PROFILE
// ============================================================================

export interface PlayerProfile {
  username: string;
  wallet: string;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  totalGames: number;
  xp: number;
  coins: number;
  createdAt: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Get player index (0 or 1)
export function playerIndex(player: Player): number {
  return player === 'One' ? 0 : 1;
}

// Get player from index
export function indexToPlayer(index: number): Player {
  return index === 0 ? 'One' : 'Two';
}

// Get opposite player
export function otherPlayer(player: Player): Player {
  return player === 'One' ? 'Two' : 'One';
}

// ============================================================================
// CONNECT FOUR UTILITIES
// ============================================================================

// Get cell at row, col in Connect Four board
export function getConnectFourCell(board: ConnectFourBoard, row: number, col: number): Player | null {
  if (row < 0 || row > 5 || col < 0 || col > 6) return null;
  const idx = row * 7 + col;
  return board.cells[idx]?.player ?? null;
}

// Check if column is full
export function isConnectFourColumnFull(board: ConnectFourBoard, col: number): boolean {
  // Check top row (row 5)
  return board.cells[5 * 7 + col]?.player !== null;
}

// ============================================================================
// REVERSI UTILITIES
// ============================================================================

// Position to row/col (8x8)
export function reversiPosToRowCol(pos: number): [number, number] {
  return [Math.floor(pos / 8), pos % 8];
}

export function reversiRowColToPos(row: number, col: number): number {
  return row * 8 + col;
}

// Get cell value at position
export function getReversiCell(board: ReversiBoard, pos: number): number {
  return board.cells[pos] ?? 0;
}

// ============================================================================
// GOMOKU UTILITIES
// ============================================================================

// Position to row/col (15x15)
export function gomokuPosToRowCol(pos: number): [number, number] {
  return [Math.floor(pos / 15), pos % 15];
}

export function gomokuRowColToPos(row: number, col: number): number {
  return row * 15 + col;
}

// Get cell value at position
export function getGomokuCell(board: GomokuBoard, pos: number): number {
  return board.cells[pos] ?? 0;
}

// ============================================================================
// BATTLESHIP UTILITIES
// ============================================================================

// Position to row/col (10x10)
export function battleshipPosToRowCol(pos: number): [number, number] {
  return [Math.floor(pos / 10), pos % 10];
}

export function battleshipRowColToPos(row: number, col: number): number {
  return row * 10 + col;
}

// Cell values for battleship
export const BATTLESHIP_EMPTY = 0;
export const BATTLESHIP_SHIP = 1;
export const BATTLESHIP_HIT = 2;
export const BATTLESHIP_MISS = 3;

// Ship sizes
export const BATTLESHIP_SHIPS = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 },
];

// ============================================================================
// MANCALA UTILITIES
// ============================================================================

// Get player pits (6 small pits)
export function getMancalaPlayerPits(board: MancalaBoard, player: Player): number[] {
  if (player === 'One') {
    return board.pits.slice(0, 6);
  } else {
    return board.pits.slice(7, 13);
  }
}

// Get player store
export function getMancalaStore(board: MancalaBoard, player: Player): number {
  return player === 'One' ? board.pits[6] : board.pits[13];
}

// Get total seeds for a player (pits + store)
export function getMancalaTotal(board: MancalaBoard, player: Player): number {
  if (player === 'One') {
    return board.pits.slice(0, 7).reduce((a, b) => a + b, 0);
  } else {
    return board.pits.slice(7, 14).reduce((a, b) => a + b, 0);
  }
}

// ============================================================================
// CHESS UTILITIES
// ============================================================================

// Parse FEN character to piece info
export function parseFenChar(char: string): { piece: string; color: 'white' | 'black' } | null {
  if (char === '' || char === ' ') return null;
  const isWhite = char === char.toUpperCase();
  return {
    piece: char.toLowerCase(),
    color: isWhite ? 'white' : 'black',
  };
}

// Square index to algebraic notation
// Contract uses: a8=0, h8=7, a1=56, h1=63
export function squareToAlgebraic(idx: number): string {
  const col = idx % 8;
  const row = 7 - Math.floor(idx / 8); // Row 8 is index 0-7, row 1 is index 56-63
  return String.fromCharCode(97 + col) + (row + 1);
}

// Algebraic notation to square index
// Contract uses: a8=0, h8=7, a1=56, h1=63
export function algebraicToSquare(notation: string): number {
  const col = notation.charCodeAt(0) - 97;
  const row = parseInt(notation[1]) - 1;
  return (7 - row) * 8 + col;
}

// Create UCI move string
export function createUciMove(from: number, to: number, promotion?: string): string {
  let move = squareToAlgebraic(from) + squareToAlgebraic(to);
  if (promotion) {
    move += promotion.toLowerCase();
  }
  return move;
}

// ============================================================================
// GAME DISPLAY INFO
// ============================================================================

export const GAME_INFO: Record<GameType, {
  name: string;
  description: string;
  players: number;
  icon: string;
  color: string;
}> = {
  Chess: {
    name: 'Chess',
    description: 'Classic strategy board game',
    players: 2,
    icon: '♟️',
    color: '#8B4513',
  },
  ConnectFour: {
    name: 'Connect Four',
    description: 'Drop discs to connect four in a row',
    players: 2,
    icon: '🔴',
    color: '#DC2626',
  },
  Reversi: {
    name: 'Reversi',
    description: 'Flip opponent pieces to dominate the board',
    players: 2,
    icon: '⚫',
    color: '#059669',
  },
  Gomoku: {
    name: 'Gomoku',
    description: 'Get five in a row to win',
    players: 2,
    icon: '⚪',
    color: '#7C3AED',
  },
  Battleship: {
    name: 'Battleship',
    description: 'Sink your opponent\'s fleet',
    players: 2,
    icon: '🚢',
    color: '#0284C7',
  },
  Mancala: {
    name: 'Mancala',
    description: 'Capture the most seeds',
    players: 2,
    icon: '🕳️',
    color: '#CA8A04',
  },
};

// ============================================================================
// REWARDS
// ============================================================================

export const REWARDS = {
  CHESS: { winner: { xp: 100, coins: 50 }, loser: { xp: 25, coins: 5 } },
  CONNECT_FOUR: { winner: { xp: 50, coins: 25 }, loser: { xp: 15, coins: 3 } },
  REVERSI: { winner: { xp: 75, coins: 35 }, loser: { xp: 20, coins: 4 } },
  GOMOKU: { winner: { xp: 60, coins: 30 }, loser: { xp: 18, coins: 4 } },
  BATTLESHIP: { winner: { xp: 80, coins: 40 }, loser: { xp: 22, coins: 5 } },
  MANCALA: { winner: { xp: 65, coins: 32 }, loser: { xp: 18, coins: 4 } },
  DRAW: { xp: 30, coins: 10 },
};
