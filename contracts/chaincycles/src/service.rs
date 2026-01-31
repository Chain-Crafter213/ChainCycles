// ChainCycles - GraphQL Service
// Exposes queries for frontend to read game state for all 6 games

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema};
use linera_sdk::{linera_base_types::WithServiceAbi, views::View, Service, ServiceRuntime};

use chaincycles::{
    BattleshipBoard, ChainCyclesAbi, ChessBoard, ConnectFourBoard, GameRoom, GameStatus, GameType,
    GomokuBoard, MancalaBoard, MoveData, Player, PlayerProfile, ReversiBoard,
};
use state::ChainCyclesState;

pub struct ChainCyclesService {
    state: Arc<ChainCyclesState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(ChainCyclesService);

impl WithServiceAbi for ChainCyclesService {
    type Abi = ChainCyclesAbi;
}

impl Service for ChainCyclesService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = ChainCyclesState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        Self {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                state: self.state.clone(),
                runtime: self.runtime.clone(),
            },
            MutationRoot {
                runtime: self.runtime.clone(),
            },
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

/// GraphQL Query Root
struct QueryRoot {
    state: Arc<ChainCyclesState>,
    runtime: Arc<ServiceRuntime<ChainCyclesService>>,
}

#[Object]
impl QueryRoot {
    // ========================================================================
    // CHAIN & ROOM INFO
    // ========================================================================

    /// Get current chain ID
    async fn chain_id(&self) -> String {
        self.runtime.chain_id().to_string()
    }

    /// Get current game room on this chain
    async fn room(&self) -> Option<GameRoom> {
        self.state.game_room.get().clone()
    }

    /// Check if this chain is hosting a room
    async fn is_hosting(&self) -> bool {
        *self.state.is_hosting.get()
    }

    /// Get the host chain ID if we've joined a room
    async fn joined_host_chain(&self) -> Option<String> {
        self.state.joined_host_chain.get().clone()
    }

    /// Get all recent rooms visited
    async fn recent_rooms(&self) -> Vec<String> {
        self.state.recent_rooms.get().clone()
    }

    // ========================================================================
    // GAME STATE QUERIES
    // ========================================================================

    /// Get game status
    async fn game_status(&self) -> Option<GameStatus> {
        self.state.game_room.get().as_ref().map(|r| r.status)
    }

    /// Get game type
    async fn game_type(&self) -> Option<GameType> {
        self.state.game_room.get().as_ref().map(|r| r.game_type)
    }

    /// Get current turn
    async fn current_turn(&self) -> Option<Player> {
        self.state.game_room.get().as_ref().map(|r| r.current_turn)
    }

    /// Get winner (if game finished)
    async fn winner(&self) -> Option<Player> {
        self.state.game_room.get().as_ref().and_then(|r| r.winner)
    }

    /// Get usernames [p1_username, p2_username]
    async fn usernames(&self) -> Option<Vec<String>> {
        self.state
            .game_room
            .get()
            .as_ref()
            .map(|r| r.usernames.clone())
    }

    /// Get player chain IDs [host_chain_id, joiner_chain_id]
    async fn player_chain_ids(&self) -> Option<Vec<String>> {
        self.state
            .game_room
            .get()
            .as_ref()
            .map(|r| r.player_chain_ids.clone())
    }

    /// Get player wallets
    async fn player_wallets(&self) -> Option<Vec<String>> {
        self.state
            .game_room
            .get()
            .as_ref()
            .map(|r| r.player_wallets.clone())
    }

    /// Get room creation timestamp
    async fn created_at(&self) -> Option<u64> {
        self.state.game_room.get().as_ref().map(|r| r.created_at)
    }

    /// Get last move timestamp
    async fn last_move_at(&self) -> Option<u64> {
        self.state.game_room.get().as_ref().map(|r| r.last_move_at)
    }

    // ========================================================================
    // PLAYER QUERIES
    // ========================================================================

    /// Get player profile by wallet address
    async fn player(&self, wallet: String) -> Option<PlayerProfile> {
        self.state.players.get(&wallet).await.ok().flatten()
    }

    /// Check if it's a specific player's turn (by wallet)
    async fn is_my_turn(&self, wallet: String) -> bool {
        self.state
            .game_room
            .get()
            .as_ref()
            .map(|r| {
                if r.status != GameStatus::InProgress {
                    return false;
                }
                let player_index = r.player_wallets.iter().position(|w| *w == wallet);
                match player_index {
                    Some(0) => r.current_turn == Player::One,
                    Some(1) => r.current_turn == Player::Two,
                    _ => false,
                }
            })
            .unwrap_or(false)
    }

    /// Get player index (0 or 1) for a wallet
    async fn player_index(&self, wallet: String) -> Option<u8> {
        self.state.game_room.get().as_ref().and_then(|r| {
            r.player_wallets
                .iter()
                .position(|w| *w == wallet)
                .map(|i| i as u8)
        })
    }

    // ========================================================================
    // GAME-SPECIFIC BOARD QUERIES
    // ========================================================================

    /// Get Chess board state
    async fn chess_board(&self) -> Option<ChessBoard> {
        self.state
            .game_room
            .get()
            .as_ref()
            .and_then(|r| r.chess_board.clone())
    }

    /// Get Connect Four board state
    async fn connect_four_board(&self) -> Option<ConnectFourBoard> {
        self.state
            .game_room
            .get()
            .as_ref()
            .and_then(|r| r.connect_four_board.clone())
    }

    /// Get Reversi board state
    async fn reversi_board(&self) -> Option<ReversiBoard> {
        self.state
            .game_room
            .get()
            .as_ref()
            .and_then(|r| r.reversi_board.clone())
    }

    /// Get Gomoku board state
    async fn gomoku_board(&self) -> Option<GomokuBoard> {
        self.state
            .game_room
            .get()
            .as_ref()
            .and_then(|r| r.gomoku_board.clone())
    }

    /// Get Battleship board state
    async fn battleship_board(&self) -> Option<BattleshipBoard> {
        self.state
            .game_room
            .get()
            .as_ref()
            .and_then(|r| r.battleship_board.clone())
    }

    /// Get Mancala board state
    async fn mancala_board(&self) -> Option<MancalaBoard> {
        self.state
            .game_room
            .get()
            .as_ref()
            .and_then(|r| r.mancala_board.clone())
    }

    // ========================================================================
    // HELPER QUERIES
    // ========================================================================

    /// Check if player can make a move
    async fn can_move(&self, wallet: String) -> bool {
        self.state
            .game_room
            .get()
            .as_ref()
            .map(|r| {
                if r.status != GameStatus::InProgress {
                    return false;
                }

                let player_index = r.player_wallets.iter().position(|w| *w == wallet);
                let player = match player_index {
                    Some(0) => Player::One,
                    Some(1) => Player::Two,
                    _ => return false,
                };

                // In Battleship setup phase, both players can place ships
                if r.game_type == GameType::Battleship {
                    if let Some(board) = &r.battleship_board {
                        if board.setup_phase {
                            return true;
                        }
                    }
                }

                r.current_turn == player
            })
            .unwrap_or(false)
    }

    /// Get Connect Four valid columns (returns array of column indices that aren't full)
    async fn connect_four_valid_columns(&self) -> Option<Vec<u8>> {
        self.state.game_room.get().as_ref().and_then(|r| {
            r.connect_four_board.as_ref().map(|board| {
                // Check top row (row 5) of each column - if empty, column is valid
                // Index = row * 7 + col, so row 5 col X = 5 * 7 + X = 35 + X
                (0..7u8)
                    .filter(|&col| board.cells[35 + col as usize].player.is_none())
                    .collect()
            })
        })
    }

    /// Get Reversi valid moves for current player
    async fn reversi_valid_moves(&self) -> Option<Vec<u8>> {
        self.state.game_room.get().as_ref().and_then(|r| {
            r.reversi_board.as_ref().map(|board| {
                let player = r.current_turn;
                (0..64u8)
                    .filter(|&pos| board.is_valid_move(pos, player))
                    .collect()
            })
        })
    }

    /// Get Mancala player pits (returns the 6 pits for given player: 0=P1, 1=P2)
    async fn mancala_player_pits(&self, player_index: u8) -> Option<Vec<u8>> {
        self.state.game_room.get().as_ref().and_then(|r| {
            r.mancala_board.as_ref().map(|board| {
                if player_index == 0 {
                    board.pits[0..6].to_vec()
                } else {
                    board.pits[7..13].to_vec()
                }
            })
        })
    }

    /// Get Mancala stores [p1_store, p2_store]
    async fn mancala_stores(&self) -> Option<Vec<u8>> {
        self.state.game_room.get().as_ref().and_then(|r| {
            r.mancala_board
                .as_ref()
                .map(|board| vec![board.pits[6], board.pits[13]])
        })
    }
}

/// Mutation root - schedules operations to be processed by contract
struct MutationRoot {
    runtime: Arc<ServiceRuntime<ChainCyclesService>>,
}

#[Object]
impl MutationRoot {
    // ========================================================================
    // PLAYER MANAGEMENT
    // ========================================================================

    /// Register a new player
    async fn register(&self, username: String) -> [u8; 0] {
        use chaincycles::Operation;
        self.runtime
            .schedule_operation(&Operation::Register { username });
        []
    }

    /// Update player profile
    async fn update_profile(&self, username: Option<String>) -> [u8; 0] {
        use chaincycles::Operation;
        self.runtime
            .schedule_operation(&Operation::UpdateProfile { username });
        []
    }

    // ========================================================================
    // ROOM MANAGEMENT
    // ========================================================================

    /// Create a new game room with specified game type
    async fn create_room(&self, game_type: GameType) -> [u8; 0] {
        use chaincycles::Operation;
        self.runtime
            .schedule_operation(&Operation::CreateRoom { game_type });
        []
    }

    /// Join a room by host chain ID
    async fn join_room(&self, host_chain_id: String) -> [u8; 0] {
        use chaincycles::Operation;
        self.runtime
            .schedule_operation(&Operation::JoinRoom { host_chain_id });
        []
    }

    /// Leave current room
    async fn leave_room(&self) -> [u8; 0] {
        use chaincycles::Operation;
        self.runtime.schedule_operation(&Operation::LeaveRoom);
        []
    }

    /// Clear finished room
    async fn clear_room(&self) -> [u8; 0] {
        use chaincycles::Operation;
        self.runtime.schedule_operation(&Operation::ClearRoom);
        []
    }

    // ========================================================================
    // GAMEPLAY
    // ========================================================================

    /// Make a move (unified for all games)
    /// - Chess: primary ignored, secondary = UCI move string (e.g., "e2e4")
    /// - Connect Four: primary = column (0-6), secondary ignored
    /// - Reversi: primary = position (0-63), secondary ignored (-1 to pass)
    /// - Gomoku: primary = position (0-224 for 15x15), secondary ignored
    /// - Battleship setup: secondary = ship placement JSON
    /// - Battleship attack: primary = target position (0-99)
    /// - Mancala: primary = pit index (0-5 for current player)
    async fn make_move(&self, primary: i32, secondary: Option<String>) -> [u8; 0] {
        use chaincycles::Operation;
        let move_data = MoveData { primary, secondary };
        self.runtime
            .schedule_operation(&Operation::MakeMove { move_data });
        []
    }

    // ========================================================================
    // SYNC
    // ========================================================================

    /// Sync inbox (process pending cross-chain messages)
    async fn sync_inbox(&self) -> [u8; 0] {
        use chaincycles::Operation;
        self.runtime.schedule_operation(&Operation::SyncInbox);
        []
    }
}
