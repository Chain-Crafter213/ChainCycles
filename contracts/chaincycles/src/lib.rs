// ChainCycles - On-Chain Multiplayer Game Arcade
// 6 Fully Decentralized Turn-Based Games using Linera Cross-Chain Messaging

#![allow(clippy::large_enum_variant)]

use async_graphql::{Enum, InputObject, SimpleObject, Union};
use linera_sdk::graphql::GraphQLMutationRoot;
use linera_sdk::linera_base_types::{AccountOwner, ChainId, ContractAbi, ServiceAbi, Timestamp};
use serde::{Deserialize, Serialize};

/// ABI definition for ChainCycles application
pub struct ChainCyclesAbi;

impl ContractAbi for ChainCyclesAbi {
    type Operation = Operation;
    type Response = ChainCyclesResponse;
}

impl ServiceAbi for ChainCyclesAbi {
    type Query = async_graphql::Request;
    type QueryResponse = async_graphql::Response;
}

// ============================================================================
// GAME TYPE ENUM
// ============================================================================

/// Available multiplayer games
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, Default)]
#[graphql(rename_items = "PascalCase")]
pub enum GameType {
    #[default]
    Chess,
    ConnectFour,
    Reversi,
    Gomoku,
    Battleship,
    Mancala,
}

// ============================================================================
// PLAYER ENUM
// ============================================================================

/// Player identifier in a match
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, Default)]
#[graphql(rename_items = "PascalCase")]
pub enum Player {
    #[default]
    One,
    Two,
}

impl Player {
    pub fn other(&self) -> Self {
        match self {
            Player::One => Player::Two,
            Player::Two => Player::One,
        }
    }

    pub fn index(&self) -> usize {
        match self {
            Player::One => 0,
            Player::Two => 1,
        }
    }
}

// ============================================================================
// GAME STATUS
// ============================================================================

/// Game room status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, Default)]
#[graphql(rename_items = "PascalCase")]
pub enum GameStatus {
    #[default]
    WaitingForPlayer,
    /// Active gameplay
    InProgress,
    /// Game ended with a winner
    Finished,
    /// Game ended in a draw
    Draw,
    /// A player forfeited
    Forfeited,
    /// A player left without finishing
    Abandoned,
}

// ============================================================================
// MOVE DATA - Unified input for all games
// ============================================================================

/// Unified move data for all game types
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject, InputObject)]
#[graphql(input_name = "MoveDataInput")]
pub struct MoveData {
    /// Primary move value:
    /// - ConnectFour: column (0-6)
    /// - Reversi: position (0-63)
    /// - Gomoku: position (0-224)
    /// - Battleship: position (0-99) 
    /// - Mancala: pit index (0-5)
    /// - Chess: 0 (unused, use secondary)
    pub primary: i32,
    /// Secondary move data:
    /// - Chess: move in UCI notation (e.g., "e2e4")
    /// - Battleship setup: ship placement string
    /// - Others: unused
    pub secondary: Option<String>,
}

// ============================================================================
// CHESS BOARD
// ============================================================================

/// Chess board state
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject, InputObject, Default)]
#[graphql(input_name = "ChessBoardInput")]
pub struct ChessBoard {
    /// Board state as 64 squares (a8=0, h1=63)
    /// " " = empty, uppercase = white, lowercase = black
    /// P/p = pawn, R/r = rook, N/n = knight, B/b = bishop, Q/q = queen, K/k = king
    pub board: Vec<String>,
    /// Whose turn: true = white (Player One), false = black (Player Two)
    pub white_turn: bool,
    /// Castling rights: [white_kingside, white_queenside, black_kingside, black_queenside]
    pub castling: Vec<bool>,
    /// En passant target square index (-1 if none)
    pub en_passant: i8,
    /// Halfmove clock for 50-move rule
    pub halfmove: u16,
    /// Fullmove number
    pub fullmove: u16,
    /// Move history in UCI notation
    pub moves: Vec<String>,
    /// Current FEN notation
    pub fen: String,
}

impl ChessBoard {
    /// Create initial chess board position
    pub fn new() -> Self {
        let board = vec![
            "r".into(), "n".into(), "b".into(), "q".into(), "k".into(), "b".into(), "n".into(), "r".into(), // Row 8 (a8-h8)
            "p".into(), "p".into(), "p".into(), "p".into(), "p".into(), "p".into(), "p".into(), "p".into(), // Row 7
            " ".into(), " ".into(), " ".into(), " ".into(), " ".into(), " ".into(), " ".into(), " ".into(), // Row 6
            " ".into(), " ".into(), " ".into(), " ".into(), " ".into(), " ".into(), " ".into(), " ".into(), // Row 5
            " ".into(), " ".into(), " ".into(), " ".into(), " ".into(), " ".into(), " ".into(), " ".into(), // Row 4
            " ".into(), " ".into(), " ".into(), " ".into(), " ".into(), " ".into(), " ".into(), " ".into(), // Row 3
            "P".into(), "P".into(), "P".into(), "P".into(), "P".into(), "P".into(), "P".into(), "P".into(), // Row 2
            "R".into(), "N".into(), "B".into(), "Q".into(), "K".into(), "B".into(), "N".into(), "R".into(), // Row 1 (a1-h1)
        ];
        
        Self {
            board,
            white_turn: true,
            castling: vec![true, true, true, true],
            en_passant: -1,
            halfmove: 0,
            fullmove: 1,
            moves: Vec::new(),
            fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1".to_string(),
        }
    }

    /// Get piece at position
    pub fn get_piece(&self, idx: usize) -> char {
        self.board.get(idx)
            .and_then(|s| s.chars().next())
            .unwrap_or(' ')
    }

    /// Set piece at position
    pub fn set_piece(&mut self, idx: usize, piece: char) {
        if idx < 64 {
            self.board[idx] = piece.to_string();
        }
    }

    /// Parse UCI move string (e.g., "e2e4") and apply it
    pub fn make_move(&mut self, uci_move: &str, is_white: bool) -> bool {
        if uci_move.len() < 4 {
            return false;
        }

        // Verify turn
        if self.white_turn != is_white {
            return false;
        }

        let chars: Vec<char> = uci_move.chars().collect();
        let from_file = (chars[0] as u8).wrapping_sub(b'a') as i32;
        let from_rank = (chars[1] as u8).wrapping_sub(b'1') as i32;
        let to_file = (chars[2] as u8).wrapping_sub(b'a') as i32;
        let to_rank = (chars[3] as u8).wrapping_sub(b'1') as i32;

        if from_file < 0 || from_file > 7 || from_rank < 0 || from_rank > 7 
            || to_file < 0 || to_file > 7 || to_rank < 0 || to_rank > 7 {
            return false;
        }

        // Convert to board indices (a8=0, h1=63)
        let from_idx = ((7 - from_rank) * 8 + from_file) as usize;
        let to_idx = ((7 - to_rank) * 8 + to_file) as usize;

        let piece = self.get_piece(from_idx);
        if piece == ' ' {
            return false;
        }

        // Verify piece belongs to current player
        let piece_is_white = piece.is_uppercase();
        if piece_is_white != is_white {
            return false;
        }

        let captured = self.get_piece(to_idx);

        // Handle castling
        let piece_lower = piece.to_ascii_lowercase();
        if piece_lower == 'k' {
            let file_diff = to_file - from_file;
            // Kingside castle
            if file_diff == 2 {
                let rook_from = from_idx + 3;
                let rook_to = from_idx + 1;
                self.set_piece(rook_to, self.get_piece(rook_from));
                self.set_piece(rook_from, ' ');
            }
            // Queenside castle
            else if file_diff == -2 {
                let rook_from = from_idx - 4;
                let rook_to = from_idx - 1;
                self.set_piece(rook_to, self.get_piece(rook_from));
                self.set_piece(rook_from, ' ');
            }

            // Remove castling rights
            if is_white {
                self.castling[0] = false;
                self.castling[1] = false;
            } else {
                self.castling[2] = false;
                self.castling[3] = false;
            }
        }

        // Handle rook moves (castling rights)
        if piece_lower == 'r' {
            if is_white {
                if from_idx == 63 { self.castling[0] = false; } // h1
                if from_idx == 56 { self.castling[1] = false; } // a1
            } else {
                if from_idx == 7 { self.castling[2] = false; }  // h8
                if from_idx == 0 { self.castling[3] = false; }  // a8
            }
        }

        // Handle en passant capture
        if piece_lower == 'p' && self.en_passant >= 0 {
            if to_idx as i8 == self.en_passant {
                // Capture en passant
                let captured_pawn_idx = if is_white {
                    to_idx + 8
                } else {
                    to_idx - 8
                };
                self.set_piece(captured_pawn_idx, ' ');
            }
        }

        // Set en passant square for next move
        self.en_passant = -1;
        if piece_lower == 'p' {
            let rank_diff = (to_rank - from_rank).abs();
            if rank_diff == 2 {
                // Double pawn push - set en passant square
                self.en_passant = ((from_idx as i32 + to_idx as i32) / 2) as i8;
            }
        }

        // Make the move
        self.set_piece(to_idx, piece);
        self.set_piece(from_idx, ' ');

        // Handle pawn promotion
        if piece_lower == 'p' {
            let promotion_rank = if is_white { 0 } else { 7 };
            if to_rank == promotion_rank || (7 - to_rank) == promotion_rank {
                let promo_piece = if uci_move.len() >= 5 {
                    chars[4]
                } else {
                    'q' // Default to queen
                };
                let promo = if is_white { promo_piece.to_ascii_uppercase() } else { promo_piece.to_ascii_lowercase() };
                self.set_piece(to_idx, promo);
            }
        }

        // Update halfmove clock
        if piece_lower == 'p' || captured != ' ' {
            self.halfmove = 0;
        } else {
            self.halfmove += 1;
        }

        // Update fullmove number
        if !is_white {
            self.fullmove += 1;
        }

        // Switch turn
        self.white_turn = !self.white_turn;

        // Record move
        self.moves.push(uci_move.to_string());

        // Update FEN
        self.update_fen();

        true
    }

    /// Update FEN notation from current board state
    pub fn update_fen(&mut self) {
        let mut fen = String::new();

        // Board position
        for rank in 0..8 {
            let mut empty_count = 0;
            for file in 0..8 {
                let idx = rank * 8 + file;
                let piece = self.get_piece(idx);
                if piece == ' ' {
                    empty_count += 1;
                } else {
                    if empty_count > 0 {
                        fen.push_str(&empty_count.to_string());
                        empty_count = 0;
                    }
                    fen.push(piece);
                }
            }
            if empty_count > 0 {
                fen.push_str(&empty_count.to_string());
            }
            if rank < 7 {
                fen.push('/');
            }
        }

        // Turn
        fen.push(' ');
        fen.push(if self.white_turn { 'w' } else { 'b' });

        // Castling
        fen.push(' ');
        let mut castling_str = String::new();
        if self.castling.get(0).copied().unwrap_or(false) { castling_str.push('K'); }
        if self.castling.get(1).copied().unwrap_or(false) { castling_str.push('Q'); }
        if self.castling.get(2).copied().unwrap_or(false) { castling_str.push('k'); }
        if self.castling.get(3).copied().unwrap_or(false) { castling_str.push('q'); }
        if castling_str.is_empty() { castling_str.push('-'); }
        fen.push_str(&castling_str);

        // En passant
        fen.push(' ');
        if self.en_passant >= 0 {
            let ep_file = (self.en_passant % 8) as u8;
            let ep_rank = 7 - (self.en_passant / 8) as u8;
            fen.push((b'a' + ep_file) as char);
            fen.push((b'1' + ep_rank) as char);
        } else {
            fen.push('-');
        }

        // Halfmove clock
        fen.push(' ');
        fen.push_str(&self.halfmove.to_string());

        // Fullmove number
        fen.push(' ');
        fen.push_str(&self.fullmove.to_string());

        self.fen = fen;
    }
}

// ============================================================================
// CONNECT FOUR BOARD
// ============================================================================

/// Cell state for grid-based games
#[derive(Debug, Clone, Copy, Serialize, Deserialize, SimpleObject, InputObject, Default)]
#[graphql(input_name = "CellInput")]
pub struct Cell {
    pub player: Option<Player>,
}

/// Connect Four board (7 columns x 6 rows)
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject, InputObject, Default)]
#[graphql(input_name = "ConnectFourBoardInput")]
pub struct ConnectFourBoard {
    /// 42 cells stored row by row from bottom (row 0) to top (row 5)
    /// Index = row * 7 + column
    pub cells: Vec<Cell>,
    /// Move history (column numbers)
    pub moves: Vec<u8>,
}

impl ConnectFourBoard {
    pub fn new() -> Self {
        Self {
            cells: vec![Cell { player: None }; 42],
            moves: Vec::new(),
        }
    }

    /// Get cell at position
    pub fn get_cell(&self, row: i32, col: i32) -> Option<Player> {
        if row < 0 || row > 5 || col < 0 || col > 6 {
            return None;
        }
        let idx = (row * 7 + col) as usize;
        self.cells.get(idx).and_then(|c| c.player)
    }

    /// Drop piece into column, returns row it landed on or -1 if full
    pub fn drop_piece(&mut self, col: u8, player: Player) -> i32 {
        if col > 6 {
            return -1;
        }
        
        // Find lowest empty row in column
        for row in 0..6 {
            let idx = (row * 7 + col as i32) as usize;
            if self.cells[idx].player.is_none() {
                self.cells[idx].player = Some(player);
                self.moves.push(col);
                return row;
            }
        }
        -1 // Column full
    }

    /// Check for winner
    pub fn check_winner(&self) -> Option<Player> {
        // Check all starting positions
        for row in 0..6i32 {
            for col in 0..7i32 {
                if let Some(player) = self.get_cell(row, col) {
                    // Horizontal
                    if col <= 3 && self.check_line(row, col, 0, 1, player) {
                        return Some(player);
                    }
                    // Vertical
                    if row <= 2 && self.check_line(row, col, 1, 0, player) {
                        return Some(player);
                    }
                    // Diagonal up-right
                    if row <= 2 && col <= 3 && self.check_line(row, col, 1, 1, player) {
                        return Some(player);
                    }
                    // Diagonal down-right
                    if row >= 3 && col <= 3 && self.check_line(row, col, -1, 1, player) {
                        return Some(player);
                    }
                }
            }
        }
        None
    }

    /// Check if 4 in a line from starting position
    fn check_line(&self, row: i32, col: i32, dr: i32, dc: i32, player: Player) -> bool {
        for i in 1..4 {
            if self.get_cell(row + i * dr, col + i * dc) != Some(player) {
                return false;
            }
        }
        true
    }

    /// Check if board is full (draw)
    pub fn is_full(&self) -> bool {
        // Check top row
        for col in 0..7 {
            if self.get_cell(5, col).is_none() {
                return false;
            }
        }
        true
    }
}

// ============================================================================
// REVERSI (OTHELLO) BOARD
// ============================================================================

/// Reversi board (8x8)
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject, InputObject, Default)]
#[graphql(input_name = "ReversiBoardInput")]
pub struct ReversiBoard {
    /// 64 cells (0 = empty, 1 = Player One/Black, 2 = Player Two/White)
    pub cells: Vec<u8>,
    /// Move history (positions)
    pub moves: Vec<u8>,
    /// Consecutive passes (game ends after 2)
    pub consecutive_passes: u8,
}

impl ReversiBoard {
    pub fn new() -> Self {
        let mut cells = vec![0u8; 64];
        // Initial setup: center 4 pieces
        cells[27] = 2; // d4 = white
        cells[28] = 1; // e4 = black
        cells[35] = 1; // d5 = black
        cells[36] = 2; // e5 = white
        
        Self {
            cells,
            moves: Vec::new(),
            consecutive_passes: 0,
        }
    }

    /// Make a move, returns number of pieces flipped (0 if invalid)
    pub fn make_move(&mut self, pos: u8, player: Player) -> u8 {
        if pos >= 64 || self.cells[pos as usize] != 0 {
            return 0;
        }

        let player_val = if player == Player::One { 1 } else { 2 };
        let opponent_val = if player == Player::One { 2 } else { 1 };

        let row = (pos / 8) as i32;
        let col = (pos % 8) as i32;

        let directions: [(i32, i32); 8] = [
            (-1, -1), (-1, 0), (-1, 1),
            (0, -1),           (0, 1),
            (1, -1),  (1, 0),  (1, 1),
        ];

        let mut to_flip: Vec<usize> = Vec::new();

        for (dr, dc) in directions.iter() {
            let mut r = row + dr;
            let mut c = col + dc;
            let mut line: Vec<usize> = Vec::new();

            // Find opponent pieces in this direction
            while r >= 0 && r < 8 && c >= 0 && c < 8 {
                let idx = (r * 8 + c) as usize;
                if self.cells[idx] == opponent_val {
                    line.push(idx);
                } else if self.cells[idx] == player_val {
                    // Found our piece - flip everything in between
                    to_flip.extend(line);
                    break;
                } else {
                    break;
                }
                r += dr;
                c += dc;
            }
        }

        if to_flip.is_empty() {
            return 0; // Invalid move - no pieces to flip
        }

        // Place piece and flip
        self.cells[pos as usize] = player_val;
        for idx in &to_flip {
            self.cells[*idx] = player_val;
        }
        let total_flipped = to_flip.len() as u8;

        self.moves.push(pos);
        self.consecutive_passes = 0;

        total_flipped
    }

    /// Check if player has any valid moves
    pub fn has_valid_moves(&self, player: Player) -> bool {
        for pos in 0..64 {
            if self.is_valid_move(pos, player) {
                return true;
            }
        }
        false
    }

    /// Check if a move is valid without making it
    pub fn is_valid_move(&self, pos: u8, player: Player) -> bool {
        if pos >= 64 || self.cells[pos as usize] != 0 {
            return false;
        }

        let player_val = if player == Player::One { 1 } else { 2 };
        let opponent_val = if player == Player::One { 2 } else { 1 };

        let row = (pos / 8) as i32;
        let col = (pos % 8) as i32;

        let directions: [(i32, i32); 8] = [
            (-1, -1), (-1, 0), (-1, 1),
            (0, -1),           (0, 1),
            (1, -1),  (1, 0),  (1, 1),
        ];

        for (dr, dc) in directions.iter() {
            let mut r = row + dr;
            let mut c = col + dc;
            let mut found_opponent = false;

            while r >= 0 && r < 8 && c >= 0 && c < 8 {
                let idx = (r * 8 + c) as usize;
                if self.cells[idx] == opponent_val {
                    found_opponent = true;
                } else if self.cells[idx] == player_val {
                    if found_opponent {
                        return true;
                    }
                    break;
                } else {
                    break;
                }
                r += dr;
                c += dc;
            }
        }

        false
    }

    /// Pass turn (when no valid moves)
    pub fn pass(&mut self) {
        self.consecutive_passes += 1;
    }

    /// Count pieces for each player, returns (player1, player2)
    pub fn count_pieces(&self) -> (u8, u8) {
        let mut p1 = 0;
        let mut p2 = 0;
        for &cell in &self.cells {
            if cell == 1 { p1 += 1; }
            else if cell == 2 { p2 += 1; }
        }
        (p1, p2)
    }

    /// Check if game is over
    pub fn is_game_over(&self) -> bool {
        self.consecutive_passes >= 2 || self.cells.iter().all(|&c| c != 0)
    }

    /// Get winner (None if draw)
    pub fn get_winner(&self) -> Option<Player> {
        let (p1, p2) = self.count_pieces();
        if p1 > p2 { Some(Player::One) }
        else if p2 > p1 { Some(Player::Two) }
        else { None }
    }
}

// ============================================================================
// GOMOKU BOARD (15x15)
// ============================================================================

/// Gomoku board (15x15, first to 5 in a row wins)
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject, InputObject, Default)]
#[graphql(input_name = "GomokuBoardInput")]
pub struct GomokuBoard {
    /// 225 cells (0 = empty, 1 = Player One/Black, 2 = Player Two/White)
    pub cells: Vec<u8>,
    /// Move history (positions)
    pub moves: Vec<u8>,
}

impl GomokuBoard {
    pub fn new() -> Self {
        Self {
            cells: vec![0u8; 225],
            moves: Vec::new(),
        }
    }

    /// Make a move
    pub fn make_move(&mut self, pos: u8, player: Player) -> bool {
        if pos >= 225 || self.cells[pos as usize] != 0 {
            return false;
        }

        let player_val = if player == Player::One { 1 } else { 2 };
        self.cells[pos as usize] = player_val;
        self.moves.push(pos);
        true
    }

    /// Check for winner (5 in a row)
    pub fn check_winner(&self) -> Option<Player> {
        for row in 0..15i32 {
            for col in 0..15i32 {
                let idx = (row * 15 + col) as usize;
                let cell = self.cells[idx];
                if cell == 0 { continue; }

                let player = if cell == 1 { Player::One } else { Player::Two };

                // Check horizontal
                if col <= 10 && self.check_line_5(row, col, 0, 1, cell) {
                    return Some(player);
                }
                // Check vertical
                if row <= 10 && self.check_line_5(row, col, 1, 0, cell) {
                    return Some(player);
                }
                // Check diagonal down-right
                if row <= 10 && col <= 10 && self.check_line_5(row, col, 1, 1, cell) {
                    return Some(player);
                }
                // Check diagonal up-right
                if row >= 4 && col <= 10 && self.check_line_5(row, col, -1, 1, cell) {
                    return Some(player);
                }
            }
        }
        None
    }

    fn check_line_5(&self, row: i32, col: i32, dr: i32, dc: i32, player_val: u8) -> bool {
        for i in 1..5 {
            let r = row + i * dr;
            let c = col + i * dc;
            let idx = (r * 15 + c) as usize;
            if self.cells[idx] != player_val {
                return false;
            }
        }
        true
    }

    /// Check if board is full (draw)
    pub fn is_full(&self) -> bool {
        self.cells.iter().all(|&c| c != 0)
    }
}

// ============================================================================
// BATTLESHIP BOARD
// ============================================================================

/// Battleship game state (10x10 grid per player)
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject, InputObject, Default)]
#[graphql(input_name = "BattleshipBoardInput")]
pub struct BattleshipBoard {
    /// Player 1's board (ship positions): 0=water, 1-5=ship id
    pub p1_ships: Vec<u8>,
    /// Player 1's hits received: 0=unknown, 1=miss, 2=hit
    pub p1_hits: Vec<u8>,
    /// Player 2's board (ship positions)
    pub p2_ships: Vec<u8>,
    /// Player 2's hits received
    pub p2_hits: Vec<u8>,
    /// Setup phase: true until both players placed ships
    pub setup_phase: bool,
    /// Player 1 ready (placed ships)
    pub p1_ready: bool,
    /// Player 2 ready (placed ships)
    pub p2_ready: bool,
    /// Move history (attack positions)
    pub moves: Vec<u8>,
    /// Ships sunk count [p1, p2]
    pub ships_sunk: Vec<u8>,
}

impl BattleshipBoard {
    pub fn new() -> Self {
        Self {
            p1_ships: vec![0u8; 100],
            p1_hits: vec![0u8; 100],
            p2_ships: vec![0u8; 100],
            p2_hits: vec![0u8; 100],
            setup_phase: true,
            p1_ready: false,
            p2_ready: false,
            moves: Vec::new(),
            ships_sunk: vec![0, 0],
        }
    }

    /// Place ships for a player (ship_data format: "ship_id,start_pos,horizontal;...")
    /// Ships: 1=carrier(5), 2=battleship(4), 3=cruiser(3), 4=submarine(3), 5=destroyer(2)
    pub fn place_ships(&mut self, player: Player, ship_data: &str) -> bool {
        let ships = if player == Player::One { &mut self.p1_ships } else { &mut self.p2_ships };
        
        // Reset ships
        for cell in ships.iter_mut() {
            *cell = 0;
        }

        let ship_sizes: [u8; 5] = [5, 4, 3, 3, 2];
        
        for ship_str in ship_data.split(';') {
            let parts: Vec<&str> = ship_str.split(',').collect();
            if parts.len() != 3 { return false; }
            
            let ship_id: u8 = parts[0].parse().unwrap_or(0);
            let start_pos: u8 = parts[1].parse().unwrap_or(100);
            let horizontal: bool = parts[2] == "h";
            
            if ship_id < 1 || ship_id > 5 || start_pos >= 100 { return false; }
            
            let size = ship_sizes[(ship_id - 1) as usize];
            let start_row = start_pos / 10;
            let start_col = start_pos % 10;
            
            // Check bounds
            if horizontal {
                if start_col + size > 10 { return false; }
            } else {
                if start_row + size > 10 { return false; }
            }
            
            // Check overlap and place
            for i in 0..size {
                let pos = if horizontal {
                    start_pos + i
                } else {
                    start_pos + i * 10
                };
                
                if ships[pos as usize] != 0 { return false; } // Overlap
                ships[pos as usize] = ship_id;
            }
        }

        // Mark player as ready
        if player == Player::One {
            self.p1_ready = true;
        } else {
            self.p2_ready = true;
        }

        // Check if both ready
        if self.p1_ready && self.p2_ready {
            self.setup_phase = false;
        }

        true
    }

    /// Attack a position, returns (hit, sunk_ship_id)
    pub fn attack(&mut self, attacker: Player, pos: u8) -> (bool, u8) {
        if pos >= 100 || self.setup_phase { return (false, 0); }

        let (target_ships, target_hits) = if attacker == Player::One {
            (&self.p2_ships, &mut self.p2_hits)
        } else {
            (&self.p1_ships, &mut self.p1_hits)
        };

        // Already attacked this position
        if target_hits[pos as usize] != 0 {
            return (false, 0);
        }

        self.moves.push(pos);

        if target_ships[pos as usize] != 0 {
            // Hit!
            target_hits[pos as usize] = 2;
            let ship_id = target_ships[pos as usize];
            
            // Check if ship is sunk
            let mut sunk = true;
            for i in 0..100 {
                if target_ships[i] == ship_id && target_hits[i] != 2 {
                    sunk = false;
                    break;
                }
            }
            
            if sunk {
                let sunk_idx = if attacker == Player::One { 1 } else { 0 };
                self.ships_sunk[sunk_idx] += 1;
                return (true, ship_id);
            }
            
            (true, 0)
        } else {
            // Miss
            target_hits[pos as usize] = 1;
            (false, 0)
        }
    }

    /// Check if game is over (all ships sunk)
    pub fn check_winner(&self) -> Option<Player> {
        if self.ships_sunk[0] >= 5 { return Some(Player::Two); } // P1's ships all sunk
        if self.ships_sunk[1] >= 5 { return Some(Player::One); } // P2's ships all sunk
        None
    }
}

// ============================================================================
// MANCALA BOARD
// ============================================================================

/// Mancala board (6 pits per side + 2 stores)
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject, InputObject, Default)]
#[graphql(input_name = "MancalaBoardInput")]
pub struct MancalaBoard {
    /// Pits: [p1_pit0..p1_pit5, p1_store, p2_pit0..p2_pit5, p2_store]
    /// Total 14 positions
    pub pits: Vec<u8>,
    /// Move history
    pub moves: Vec<u8>,
}

impl MancalaBoard {
    pub fn new() -> Self {
        let mut pits = vec![4u8; 14]; // 4 stones per pit
        pits[6] = 0;  // P1 store
        pits[13] = 0; // P2 store
        
        Self {
            pits,
            moves: Vec::new(),
        }
    }

    /// Make a move from pit_idx (0-5 for current player), returns true if player gets another turn
    pub fn make_move(&mut self, pit_idx: u8, player: Player) -> Option<bool> {
        // Validate pit index (0-5)
        if pit_idx > 5 { return None; }
        
        // Calculate actual index based on player
        let actual_idx = if player == Player::One {
            pit_idx as usize
        } else {
            (pit_idx + 7) as usize
        };

        // Can't move from empty pit
        if self.pits[actual_idx] == 0 { return None; }

        let stones = self.pits[actual_idx];
        self.pits[actual_idx] = 0;
        self.moves.push(actual_idx as u8);

        let my_store = if player == Player::One { 6 } else { 13 };
        let opp_store = if player == Player::One { 13 } else { 6 };

        let mut current_idx = actual_idx;
        let mut remaining = stones;

        while remaining > 0 {
            current_idx = (current_idx + 1) % 14;
            
            // Skip opponent's store
            if current_idx == opp_store { continue; }
            
            self.pits[current_idx] += 1;
            remaining -= 1;
        }

        // Check for capture (last stone in empty pit on own side)
        let last_idx = current_idx;
        let is_own_pit = if player == Player::One {
            last_idx < 6
        } else {
            last_idx >= 7 && last_idx < 13
        };

        if is_own_pit && self.pits[last_idx] == 1 {
            // Calculate opposite pit
            let opposite_idx = 12 - last_idx;
            if self.pits[opposite_idx] > 0 {
                // Capture!
                let captured = self.pits[opposite_idx] + 1;
                self.pits[opposite_idx] = 0;
                self.pits[last_idx] = 0;
                self.pits[my_store] += captured;
            }
        }

        // Return true if last stone landed in own store (gets another turn)
        Some(last_idx == my_store)
    }

    /// Check if game is over (one side empty)
    pub fn is_game_over(&self) -> bool {
        let p1_empty = self.pits[0..6].iter().all(|&p| p == 0);
        let p2_empty = self.pits[7..13].iter().all(|&p| p == 0);
        p1_empty || p2_empty
    }

    /// Collect remaining stones and determine winner
    pub fn finalize(&mut self) -> Option<Player> {
        // Move remaining stones to stores
        let p1_remaining: u8 = self.pits[0..6].iter().sum();
        let p2_remaining: u8 = self.pits[7..13].iter().sum();
        
        self.pits[6] += p1_remaining;
        self.pits[13] += p2_remaining;
        
        // Clear pits
        for i in 0..6 { self.pits[i] = 0; }
        for i in 7..13 { self.pits[i] = 0; }

        // Determine winner
        if self.pits[6] > self.pits[13] { Some(Player::One) }
        else if self.pits[13] > self.pits[6] { Some(Player::Two) }
        else { None }
    }

    /// Get scores (p1_store, p2_store)
    pub fn get_scores(&self) -> (u8, u8) {
        (self.pits[6], self.pits[13])
    }
}

// ============================================================================
// MULTIPLAYER GAME ROOM
// ============================================================================

/// Main game room state
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject, Default)]
pub struct GameRoom {
    // === Identity ===
    /// Host chain ID (room code)
    pub host_chain_id: String,
    /// Player chain IDs [host, joiner]
    pub player_chain_ids: Vec<String>,
    /// Player wallet owners [host, joiner]
    pub player_wallets: Vec<String>,
    /// Player usernames [host, joiner]
    pub usernames: Vec<String>,

    // === Game Type ===
    pub game_type: GameType,

    // === Game Boards (only one will be Some based on game_type) ===
    pub chess_board: Option<ChessBoard>,
    pub connect_four_board: Option<ConnectFourBoard>,
    pub reversi_board: Option<ReversiBoard>,
    pub gomoku_board: Option<GomokuBoard>,
    pub battleship_board: Option<BattleshipBoard>,
    pub mancala_board: Option<MancalaBoard>,

    // === Game Status ===
    pub status: GameStatus,
    pub current_turn: Player,
    pub winner: Option<Player>,
    pub end_reason: Option<String>,

    // === Timestamps ===
    pub created_at: u64,
    pub last_move_at: u64,
}

impl GameRoom {
    /// Create a new room
    pub fn new(
        host_chain_id: ChainId,
        host_wallet: AccountOwner,
        host_username: String,
        game_type: GameType,
        created_at: Timestamp,
    ) -> Self {
        let mut room = Self {
            host_chain_id: host_chain_id.to_string(),
            player_chain_ids: vec![host_chain_id.to_string()],
            player_wallets: vec![format!("{:?}", host_wallet)],
            usernames: vec![host_username],
            game_type,
            chess_board: None,
            connect_four_board: None,
            reversi_board: None,
            gomoku_board: None,
            battleship_board: None,
            mancala_board: None,
            status: GameStatus::WaitingForPlayer,
            current_turn: Player::One,
            winner: None,
            end_reason: None,
            created_at: created_at.micros(),
            last_move_at: 0,
        };

        // Initialize the appropriate board
        match game_type {
            GameType::Chess => room.chess_board = Some(ChessBoard::new()),
            GameType::ConnectFour => room.connect_four_board = Some(ConnectFourBoard::new()),
            GameType::Reversi => room.reversi_board = Some(ReversiBoard::new()),
            GameType::Gomoku => room.gomoku_board = Some(GomokuBoard::new()),
            GameType::Battleship => room.battleship_board = Some(BattleshipBoard::new()),
            GameType::Mancala => room.mancala_board = Some(MancalaBoard::new()),
        }

        room
    }

    /// Add joiner as player two
    pub fn add_joiner(
        &mut self,
        joiner_chain_id: String,
        joiner_wallet: String,
        joiner_username: String,
        now: Timestamp,
    ) {
        self.player_chain_ids.push(joiner_chain_id);
        self.player_wallets.push(joiner_wallet);
        self.usernames.push(joiner_username);
        self.status = GameStatus::InProgress;
        self.last_move_at = now.micros();
    }
}

/// Player profile stored per-chain
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject, Default)]
pub struct PlayerProfile {
    pub username: String,
    pub wallet: String,
    pub total_wins: u64,
    pub total_losses: u64,
    pub total_draws: u64,
    pub total_games: u64,
    pub xp: u64,
    pub coins: u64,
    pub created_at: u64,
}

// ============================================================================
// OPERATIONS (Frontend -> Contract)
// ============================================================================

/// Operations that can be submitted to the contract
#[derive(Debug, Clone, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum Operation {
    // === Player Management ===
    /// Register a new player profile
    Register { username: String },
    /// Update profile settings
    UpdateProfile { username: Option<String> },

    // === Room Management ===
    /// Create a new game room
    CreateRoom { game_type: GameType },
    /// Join an existing room by host chain ID
    JoinRoom { host_chain_id: String },
    /// Leave the current room
    LeaveRoom,
    /// Clear finished room state
    ClearRoom,

    // === Gameplay ===
    /// Make a move (turn-based, direct - no commit/reveal)
    MakeMove { move_data: MoveData },

    // === Sync ===
    /// Process inbox (no-op mutation to trigger block proposal)
    SyncInbox,
}

// ============================================================================
// CROSS-CHAIN MESSAGES
// ============================================================================

/// Messages sent between chains
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    /// Joiner requests to join host's room
    JoinRequest {
        joiner_chain_id: String,
        joiner_wallet: String,
        joiner_username: String,
    },

    /// Host sends full game state to joiner (on join and after moves)
    GameStateSync { room: GameRoom },

    /// Active player sends move to opponent's chain
    GameMoveSync { room: GameRoom },

    /// Match ended notification
    MatchEnded {
        winner: Option<Player>,
        reason: String,
        final_room: GameRoom,
    },

    /// Player left notification
    PlayerLeft {
        player_chain_id: String,
        player_wallet: String,
    },

    /// Reward sync (XP/coins)
    RewardSync {
        player_wallet: String,
        xp_earned: u64,
        coins_earned: u64,
        is_winner: bool,
    },
}

// ============================================================================
// RESPONSES
// ============================================================================

/// Success response for room creation
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct RoomCreatedResponse {
    pub host_chain_id: String,
    pub room: GameRoom,
}

/// Success response for joining
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct RoomJoinedResponse {
    pub host_chain_id: String,
    pub message: String,
}

/// Success response for moves
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct MoveResponse {
    pub success: bool,
    pub game_ended: bool,
    pub winner: Option<Player>,
    pub message: String,
}

/// Generic success response
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct SuccessResponse {
    pub message: String,
}

/// Error response
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct ErrorResponse {
    pub error: String,
}

/// Union of all possible responses
#[derive(Debug, Clone, Serialize, Deserialize, Union)]
pub enum ChainCyclesResponse {
    RoomCreated(RoomCreatedResponse),
    RoomJoined(RoomJoinedResponse),
    Move(MoveResponse),
    Success(SuccessResponse),
    Error(ErrorResponse),
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/// Application errors
#[derive(Debug, Clone)]
pub enum ChainCyclesError {
    NotAuthenticated,
    NotRegistered,
    AlreadyRegistered,
    RoomAlreadyExists,
    RoomNotFound,
    RoomFull,
    GameNotInProgress,
    NotYourTurn,
    InvalidMove,
    NotInRoom,
    CannotJoinOwnRoom,
    GameAlreadyStarted,
    InternalError(String),
}

impl ChainCyclesError {
    pub fn into_response(self) -> ChainCyclesResponse {
        ChainCyclesResponse::Error(ErrorResponse {
            error: format!("{:?}", self),
        })
    }
}

// ============================================================================
// INSTANTIATION
// ============================================================================

/// Arguments for contract instantiation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstantiationArgument {
    /// Optional hub chain ID for coordination
    pub hub_chain_id: Option<String>,
}

// ============================================================================
// REWARDS CONFIGURATION
// ============================================================================

/// Reward amounts for game outcomes
pub struct Rewards;

impl Rewards {
    pub const CHESS_WINNER_XP: u64 = 150;
    pub const CHESS_WINNER_COINS: u64 = 100;
    pub const CHESS_LOSER_XP: u64 = 50;
    pub const CHESS_LOSER_COINS: u64 = 15;

    pub const CONNECT_FOUR_WINNER_XP: u64 = 75;
    pub const CONNECT_FOUR_WINNER_COINS: u64 = 40;
    pub const CONNECT_FOUR_LOSER_XP: u64 = 30;
    pub const CONNECT_FOUR_LOSER_COINS: u64 = 8;

    pub const REVERSI_WINNER_XP: u64 = 100;
    pub const REVERSI_WINNER_COINS: u64 = 60;
    pub const REVERSI_LOSER_XP: u64 = 40;
    pub const REVERSI_LOSER_COINS: u64 = 12;

    pub const GOMOKU_WINNER_XP: u64 = 80;
    pub const GOMOKU_WINNER_COINS: u64 = 45;
    pub const GOMOKU_LOSER_XP: u64 = 30;
    pub const GOMOKU_LOSER_COINS: u64 = 10;

    pub const BATTLESHIP_WINNER_XP: u64 = 120;
    pub const BATTLESHIP_WINNER_COINS: u64 = 70;
    pub const BATTLESHIP_LOSER_XP: u64 = 45;
    pub const BATTLESHIP_LOSER_COINS: u64 = 15;

    pub const MANCALA_WINNER_XP: u64 = 80;
    pub const MANCALA_WINNER_COINS: u64 = 50;
    pub const MANCALA_LOSER_XP: u64 = 30;
    pub const MANCALA_LOSER_COINS: u64 = 10;

    pub const DRAW_XP: u64 = 50;
    pub const DRAW_COINS: u64 = 25;
}
