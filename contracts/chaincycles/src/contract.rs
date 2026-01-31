// ChainCycles - Contract Implementation
// Turn-based multiplayer games with cross-chain sync

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::str::FromStr;

use linera_sdk::{
    linera_base_types::{AccountOwner, ChainId, WithContractAbi},
    views::{RootView, View},
    Contract, ContractRuntime,
};

use chaincycles::{
    ChainCyclesAbi, ChainCyclesError, ChainCyclesResponse, ErrorResponse, GameRoom, GameStatus,
    GameType, InstantiationArgument, Message, MoveData, MoveResponse, Operation, Player,
    PlayerProfile, Rewards, RoomCreatedResponse, RoomJoinedResponse, SuccessResponse,
};
use state::ChainCyclesState;

pub struct ChainCyclesContract {
    state: ChainCyclesState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(ChainCyclesContract);

impl WithContractAbi for ChainCyclesContract {
    type Abi = ChainCyclesAbi;
}

impl Contract for ChainCyclesContract {
    type Message = Message;
    type InstantiationArgument = InstantiationArgument;
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = ChainCyclesState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        Self { state, runtime }
    }

    async fn instantiate(&mut self, argument: InstantiationArgument) {
        if let Some(hub_id) = argument.hub_chain_id {
            self.state.hub_chain_id.set(Some(hub_id));
        }
        self.state.is_hosting.set(false);
        self.state.recent_rooms.set(Vec::new());
    }

    async fn execute_operation(&mut self, operation: Operation) -> ChainCyclesResponse {
        // Get authenticated signer
        let owner = match self.runtime.authenticated_signer() {
            Some(signer) => AccountOwner::from(signer),
            None => return ChainCyclesError::NotAuthenticated.into_response(),
        };

        match operation {
            // === Player Management ===
            Operation::Register { username } => self.handle_register(owner, username).await,

            Operation::UpdateProfile { username } => {
                self.handle_update_profile(owner, username).await
            }

            // === Room Management ===
            Operation::CreateRoom { game_type } => {
                self.handle_create_room(owner, game_type).await
            }

            Operation::JoinRoom { host_chain_id } => {
                self.handle_join_room(owner, host_chain_id).await
            }

            Operation::LeaveRoom => self.handle_leave_room(owner).await,

            Operation::ClearRoom => self.handle_clear_room(owner).await,

            // === Gameplay ===
            Operation::MakeMove { move_data } => self.handle_make_move(owner, move_data).await,

            // === Sync ===
            Operation::SyncInbox => ChainCyclesResponse::Success(SuccessResponse {
                message: "Inbox synced".to_string(),
            }),
        }
    }

    async fn execute_message(&mut self, message: Message) {
        match message {
            Message::JoinRequest {
                joiner_chain_id,
                joiner_wallet,
                joiner_username,
            } => {
                self.handle_join_request(joiner_chain_id, joiner_wallet, joiner_username)
                    .await;
            }

            Message::GameStateSync { room } => {
                // Joiner receives initial game state from host
                self.state.game_room.set(Some(room));
            }

            Message::GameMoveSync { room } => {
                // Receive move sync from opponent - update local state
                self.state.game_room.set(Some(room));
            }

            Message::MatchEnded {
                winner: _,
                reason: _,
                final_room,
            } => {
                self.state.game_room.set(Some(final_room));
            }

            Message::PlayerLeft {
                player_chain_id: _,
                player_wallet: _,
            } => {
                // Handle opponent leaving
                if let Some(mut room) = self.state.game_room.get().clone() {
                    if room.status == GameStatus::InProgress {
                        room.status = GameStatus::Abandoned;
                        self.state.game_room.set(Some(room));
                    }
                }
            }

            Message::RewardSync {
                player_wallet,
                xp_earned,
                coins_earned,
                is_winner: _,
            } => {
                self.apply_rewards(&player_wallet, xp_earned, coins_earned)
                    .await;
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl ChainCyclesContract {
    // ========================================================================
    // PLAYER MANAGEMENT
    // ========================================================================

    async fn handle_register(
        &mut self,
        owner: AccountOwner,
        username: String,
    ) -> ChainCyclesResponse {
        let wallet_key = format!("{:?}", owner);

        // Check if already registered
        if self
            .state
            .players
            .get(&wallet_key)
            .await
            .ok()
            .flatten()
            .is_some()
        {
            return ChainCyclesError::AlreadyRegistered.into_response();
        }

        let now = self.runtime.system_time().micros();
        let profile = PlayerProfile {
            username,
            wallet: wallet_key.clone(),
            total_wins: 0,
            total_losses: 0,
            total_draws: 0,
            total_games: 0,
            xp: 0,
            coins: 100, // Starting coins
            created_at: now,
        };

        self.state.players.insert(&wallet_key, profile).unwrap();

        ChainCyclesResponse::Success(SuccessResponse {
            message: "Player registered successfully".to_string(),
        })
    }

    async fn handle_update_profile(
        &mut self,
        owner: AccountOwner,
        username: Option<String>,
    ) -> ChainCyclesResponse {
        let wallet_key = format!("{:?}", owner);

        let mut profile = match self.state.players.get(&wallet_key).await.ok().flatten() {
            Some(p) => p,
            None => return ChainCyclesError::NotRegistered.into_response(),
        };

        if let Some(name) = username {
            profile.username = name;
        }

        self.state.players.insert(&wallet_key, profile).unwrap();

        ChainCyclesResponse::Success(SuccessResponse {
            message: "Profile updated".to_string(),
        })
    }

    // ========================================================================
    // ROOM MANAGEMENT
    // ========================================================================

    async fn handle_create_room(
        &mut self,
        owner: AccountOwner,
        game_type: GameType,
    ) -> ChainCyclesResponse {
        // Check if already hosting
        if *self.state.is_hosting.get() {
            return ChainCyclesError::RoomAlreadyExists.into_response();
        }

        let wallet_key = format!("{:?}", owner);
        let profile = match self.state.players.get(&wallet_key).await.ok().flatten() {
            Some(p) => p,
            None => return ChainCyclesError::NotRegistered.into_response(),
        };

        let now = self.runtime.system_time();
        let chain_id = self.runtime.chain_id();

        let room = GameRoom::new(chain_id, owner, profile.username.clone(), game_type, now);

        self.state.game_room.set(Some(room.clone()));
        self.state.is_hosting.set(true);

        ChainCyclesResponse::RoomCreated(RoomCreatedResponse {
            host_chain_id: chain_id.to_string(),
            room,
        })
    }

    async fn handle_join_room(
        &mut self,
        owner: AccountOwner,
        host_chain_id: String,
    ) -> ChainCyclesResponse {
        let wallet_key = format!("{:?}", owner);
        let profile = match self.state.players.get(&wallet_key).await.ok().flatten() {
            Some(p) => p,
            None => return ChainCyclesError::NotRegistered.into_response(),
        };

        // Can't join own room
        let my_chain = self.runtime.chain_id().to_string();
        if my_chain == host_chain_id {
            return ChainCyclesError::CannotJoinOwnRoom.into_response();
        }

        // Parse host chain ID
        let target_chain = match ChainId::from_str(&host_chain_id) {
            Ok(c) => c,
            Err(_) => {
                return ChainCyclesResponse::Error(ErrorResponse {
                    error: "Invalid chain ID format".to_string(),
                })
            }
        };

        // Send join request to host chain
        let join_request = Message::JoinRequest {
            joiner_chain_id: my_chain.clone(),
            joiner_wallet: wallet_key,
            joiner_username: profile.username,
        };

        self.runtime
            .prepare_message(join_request)
            .with_authentication()
            .send_to(target_chain);

        // Store that we're joining this room
        self.state.joined_host_chain.set(Some(host_chain_id.clone()));

        // Add to recent rooms
        let mut recent = self.state.recent_rooms.get().clone();
        if !recent.contains(&host_chain_id) {
            recent.insert(0, host_chain_id.clone());
            if recent.len() > 10 {
                recent.pop();
            }
            self.state.recent_rooms.set(recent);
        }

        ChainCyclesResponse::RoomJoined(RoomJoinedResponse {
            host_chain_id,
            message: "Join request sent".to_string(),
        })
    }

    /// Host receives join request
    async fn handle_join_request(
        &mut self,
        joiner_chain_id: String,
        joiner_wallet: String,
        joiner_username: String,
    ) {
        let mut room = match self.state.game_room.get().clone() {
            Some(r) => r,
            None => return,
        };

        // Room must be waiting for player
        if room.status != GameStatus::WaitingForPlayer {
            return;
        }

        // Already have 2 players
        if room.player_chain_ids.len() >= 2 {
            return;
        }

        let now = self.runtime.system_time();

        // Add joiner
        room.add_joiner(joiner_chain_id.clone(), joiner_wallet, joiner_username, now);

        // Save updated room
        self.state.game_room.set(Some(room.clone()));

        // Send game state to joiner
        if let Ok(joiner_chain) = ChainId::from_str(&joiner_chain_id) {
            let sync_msg = Message::GameStateSync { room };
            self.runtime
                .prepare_message(sync_msg)
                .with_authentication()
                .send_to(joiner_chain);
        }
    }

    async fn handle_leave_room(&mut self, owner: AccountOwner) -> ChainCyclesResponse {
        let wallet_key = format!("{:?}", owner);

        if let Some(room) = self.state.game_room.get().clone() {
            let my_chain = self.runtime.chain_id().to_string();

            if *self.state.is_hosting.get() {
                // Host leaving - notify joiner if exists
                if room.player_chain_ids.len() > 1 {
                    if let Ok(joiner_chain) = ChainId::from_str(&room.player_chain_ids[1]) {
                        let leave_msg = Message::PlayerLeft {
                            player_chain_id: my_chain,
                            player_wallet: wallet_key,
                        };
                        self.runtime
                            .prepare_message(leave_msg)
                            .with_authentication()
                            .send_to(joiner_chain);
                    }
                }
                self.state.is_hosting.set(false);
            } else if let Some(host_chain_str) = self.state.joined_host_chain.get().clone() {
                // Joiner leaving - notify host
                if let Ok(host_chain) = ChainId::from_str(&host_chain_str) {
                    let leave_msg = Message::PlayerLeft {
                        player_chain_id: my_chain,
                        player_wallet: wallet_key,
                    };
                    self.runtime
                        .prepare_message(leave_msg)
                        .with_authentication()
                        .send_to(host_chain);
                }
                self.state.joined_host_chain.set(None);
            }

            self.state.game_room.set(None);
        }

        ChainCyclesResponse::Success(SuccessResponse {
            message: "Left room".to_string(),
        })
    }

    async fn handle_clear_room(&mut self, _owner: AccountOwner) -> ChainCyclesResponse {
        self.state.game_room.set(None);
        self.state.is_hosting.set(false);
        self.state.joined_host_chain.set(None);

        ChainCyclesResponse::Success(SuccessResponse {
            message: "Room cleared".to_string(),
        })
    }

    // ========================================================================
    // GAMEPLAY - DIRECT MOVES WITH CROSS-CHAIN SYNC
    // ========================================================================

    async fn handle_make_move(
        &mut self,
        owner: AccountOwner,
        move_data: MoveData,
    ) -> ChainCyclesResponse {
        let wallet_key = format!("{:?}", owner);

        // Get current room state
        let mut room = match self.state.game_room.get().clone() {
            Some(r) => r,
            None => return ChainCyclesError::RoomNotFound.into_response(),
        };

        // Verify game is in progress
        if room.status != GameStatus::InProgress {
            return ChainCyclesError::GameNotInProgress.into_response();
        }

        // Determine which player is making the move
        let player_index = room
            .player_wallets
            .iter()
            .position(|w| *w == wallet_key);

        let player = match player_index {
            Some(0) => Player::One,
            Some(1) => Player::Two,
            _ => return ChainCyclesError::NotInRoom.into_response(),
        };

        // Verify it's this player's turn (except for Battleship setup)
        let is_battleship_setup = room.game_type == GameType::Battleship
            && room.battleship_board.as_ref().map(|b| b.setup_phase).unwrap_or(false);

        if !is_battleship_setup && room.current_turn != player {
            return ChainCyclesError::NotYourTurn.into_response();
        }

        // Process move based on game type
        let (game_ended, winner, switch_turn) = match room.game_type {
            GameType::Chess => self.process_chess_move(&mut room, player, &move_data),
            GameType::ConnectFour => self.process_connect_four_move(&mut room, player, &move_data),
            GameType::Reversi => self.process_reversi_move(&mut room, player, &move_data),
            GameType::Gomoku => self.process_gomoku_move(&mut room, player, &move_data),
            GameType::Battleship => self.process_battleship_move(&mut room, player, &move_data),
            GameType::Mancala => self.process_mancala_move(&mut room, player, &move_data),
        };

        let (game_ended, winner, switch_turn) = match (game_ended, winner, switch_turn) {
            (Ok(ended), Ok(w), Ok(switch)) => (ended, w, switch),
            _ => return ChainCyclesError::InvalidMove.into_response(),
        };

        // Update turn if needed
        if switch_turn && !game_ended {
            room.current_turn = room.current_turn.other();
        }

        // Update game status if ended
        if game_ended {
            if winner.is_some() {
                room.status = GameStatus::Finished;
                room.winner = winner;
            } else {
                room.status = GameStatus::Draw;
            }
        }

        // Update timestamp
        room.last_move_at = self.runtime.system_time().micros();

        // Save updated room
        self.state.game_room.set(Some(room.clone()));

        // Send move sync to opponent's chain
        let opponent_chain_str = if player == Player::One {
            room.player_chain_ids.get(1)
        } else {
            room.player_chain_ids.get(0)
        };

        if let Some(chain_str) = opponent_chain_str {
            if let Ok(opponent_chain) = ChainId::from_str(chain_str) {
                let sync_msg = Message::GameMoveSync { room: room.clone() };
                self.runtime
                    .prepare_message(sync_msg)
                    .with_authentication()
                    .send_to(opponent_chain);
            }
        }

        // Distribute rewards if game ended
        if game_ended {
            self.distribute_rewards(&room).await;
        }

        ChainCyclesResponse::Move(MoveResponse {
            success: true,
            game_ended,
            winner,
            message: if game_ended {
                "Game ended".to_string()
            } else {
                "Move accepted".to_string()
            },
        })
    }

    // ========================================================================
    // GAME-SPECIFIC MOVE PROCESSING
    // ========================================================================

    fn process_chess_move(
        &self,
        room: &mut GameRoom,
        player: Player,
        move_data: &MoveData,
    ) -> (Result<bool, ()>, Result<Option<Player>, ()>, Result<bool, ()>) {
        let uci_move = match &move_data.secondary {
            Some(m) => m,
            None => return (Err(()), Err(()), Err(())),
        };

        let board = match &mut room.chess_board {
            Some(b) => b,
            None => return (Err(()), Err(()), Err(())),
        };

        let is_white = player == Player::One;
        if !board.make_move(uci_move, is_white) {
            return (Err(()), Err(()), Err(()));
        }

        // Chess doesn't have automatic win detection - rely on resignation/timeout
        // For now, game continues until manual end
        (Ok(false), Ok(None), Ok(true))
    }

    fn process_connect_four_move(
        &self,
        room: &mut GameRoom,
        player: Player,
        move_data: &MoveData,
    ) -> (Result<bool, ()>, Result<Option<Player>, ()>, Result<bool, ()>) {
        let col = move_data.primary as u8;

        let board = match &mut room.connect_four_board {
            Some(b) => b,
            None => return (Err(()), Err(()), Err(())),
        };

        let row = board.drop_piece(col, player);
        if row < 0 {
            return (Err(()), Err(()), Err(())); // Invalid move
        }

        // Check for winner
        if let Some(winner) = board.check_winner() {
            return (Ok(true), Ok(Some(winner)), Ok(false));
        }

        // Check for draw
        if board.is_full() {
            return (Ok(true), Ok(None), Ok(false));
        }

        (Ok(false), Ok(None), Ok(true))
    }

    fn process_reversi_move(
        &self,
        room: &mut GameRoom,
        player: Player,
        move_data: &MoveData,
    ) -> (Result<bool, ()>, Result<Option<Player>, ()>, Result<bool, ()>) {
        let board = match &mut room.reversi_board {
            Some(b) => b,
            None => return (Err(()), Err(()), Err(())),
        };

        // Check if this is a pass (primary = -1)
        if move_data.primary < 0 {
            if board.has_valid_moves(player) {
                // Can't pass if you have valid moves
                return (Err(()), Err(()), Err(()));
            }
            board.pass();
        } else {
            let pos = move_data.primary as u8;
            let flipped = board.make_move(pos, player);
            if flipped == 0 {
                return (Err(()), Err(()), Err(())); // Invalid move
            }
        }

        // Check for game over
        if board.is_game_over() {
            let winner = board.get_winner();
            return (Ok(true), Ok(winner), Ok(false));
        }

        // Check if next player has moves, if not they must pass
        let next_player = player.other();
        let switch = board.has_valid_moves(next_player);
        
        (Ok(false), Ok(None), Ok(switch))
    }

    fn process_gomoku_move(
        &self,
        room: &mut GameRoom,
        player: Player,
        move_data: &MoveData,
    ) -> (Result<bool, ()>, Result<Option<Player>, ()>, Result<bool, ()>) {
        let pos = move_data.primary as u8;

        let board = match &mut room.gomoku_board {
            Some(b) => b,
            None => return (Err(()), Err(()), Err(())),
        };

        if !board.make_move(pos, player) {
            return (Err(()), Err(()), Err(())); // Invalid move
        }

        // Check for winner (5 in a row)
        if let Some(winner) = board.check_winner() {
            return (Ok(true), Ok(Some(winner)), Ok(false));
        }

        // Check for draw
        if board.is_full() {
            return (Ok(true), Ok(None), Ok(false));
        }

        (Ok(false), Ok(None), Ok(true))
    }

    fn process_battleship_move(
        &self,
        room: &mut GameRoom,
        player: Player,
        move_data: &MoveData,
    ) -> (Result<bool, ()>, Result<Option<Player>, ()>, Result<bool, ()>) {
        let board = match &mut room.battleship_board {
            Some(b) => b,
            None => return (Err(()), Err(()), Err(())),
        };

        // Setup phase - place ships
        if board.setup_phase {
            let ship_data = match &move_data.secondary {
                Some(s) => s,
                None => return (Err(()), Err(()), Err(())),
            };

            if !board.place_ships(player, ship_data) {
                return (Err(()), Err(()), Err(()));
            }

            // During setup, don't switch turns (both players place simultaneously)
            // Game starts when both are ready
            let game_started = !board.setup_phase;
            return (Ok(false), Ok(None), Ok(game_started));
        }

        // Attack phase
        let pos = move_data.primary as u8;
        let (hit, _sunk) = board.attack(player, pos);
        if !hit && board.moves.last() != Some(&pos) {
            // Attack failed but wasn't recorded - invalid
            return (Err(()), Err(()), Err(()));
        }

        // Check for winner
        if let Some(winner) = board.check_winner() {
            return (Ok(true), Ok(Some(winner)), Ok(false));
        }

        (Ok(false), Ok(None), Ok(true))
    }

    fn process_mancala_move(
        &self,
        room: &mut GameRoom,
        player: Player,
        move_data: &MoveData,
    ) -> (Result<bool, ()>, Result<Option<Player>, ()>, Result<bool, ()>) {
        let pit_idx = move_data.primary as u8;

        let board = match &mut room.mancala_board {
            Some(b) => b,
            None => return (Err(()), Err(()), Err(())),
        };

        // Make move - returns Some(true) if player gets another turn
        let another_turn = match board.make_move(pit_idx, player) {
            Some(t) => t,
            None => return (Err(()), Err(()), Err(())), // Invalid move
        };

        // Check for game over
        if board.is_game_over() {
            let winner = board.finalize();
            return (Ok(true), Ok(winner), Ok(false));
        }

        // In Mancala, landing in your store gives another turn
        (Ok(false), Ok(None), Ok(!another_turn))
    }

    // ========================================================================
    // REWARDS
    // ========================================================================

    async fn distribute_rewards(&mut self, room: &GameRoom) {
        let (winner_xp, winner_coins, loser_xp, loser_coins) = match room.game_type {
            GameType::Chess => (
                Rewards::CHESS_WINNER_XP,
                Rewards::CHESS_WINNER_COINS,
                Rewards::CHESS_LOSER_XP,
                Rewards::CHESS_LOSER_COINS,
            ),
            GameType::ConnectFour => (
                Rewards::CONNECT_FOUR_WINNER_XP,
                Rewards::CONNECT_FOUR_WINNER_COINS,
                Rewards::CONNECT_FOUR_LOSER_XP,
                Rewards::CONNECT_FOUR_LOSER_COINS,
            ),
            GameType::Reversi => (
                Rewards::REVERSI_WINNER_XP,
                Rewards::REVERSI_WINNER_COINS,
                Rewards::REVERSI_LOSER_XP,
                Rewards::REVERSI_LOSER_COINS,
            ),
            GameType::Gomoku => (
                Rewards::GOMOKU_WINNER_XP,
                Rewards::GOMOKU_WINNER_COINS,
                Rewards::GOMOKU_LOSER_XP,
                Rewards::GOMOKU_LOSER_COINS,
            ),
            GameType::Battleship => (
                Rewards::BATTLESHIP_WINNER_XP,
                Rewards::BATTLESHIP_WINNER_COINS,
                Rewards::BATTLESHIP_LOSER_XP,
                Rewards::BATTLESHIP_LOSER_COINS,
            ),
            GameType::Mancala => (
                Rewards::MANCALA_WINNER_XP,
                Rewards::MANCALA_WINNER_COINS,
                Rewards::MANCALA_LOSER_XP,
                Rewards::MANCALA_LOSER_COINS,
            ),
        };

        for (i, chain_id_str) in room.player_chain_ids.iter().enumerate() {
            let (xp, coins, is_winner) = match room.winner {
                Some(w) if w.index() == i => (winner_xp, winner_coins, true),
                Some(_) => (loser_xp, loser_coins, false),
                None => (Rewards::DRAW_XP, Rewards::DRAW_COINS, false),
            };

            // Send reward sync to player's chain
            if let Ok(player_chain) = ChainId::from_str(chain_id_str) {
                let reward_msg = Message::RewardSync {
                    player_wallet: room.player_wallets[i].clone(),
                    xp_earned: xp,
                    coins_earned: coins,
                    is_winner,
                };
                self.runtime
                    .prepare_message(reward_msg)
                    .with_authentication()
                    .send_to(player_chain);
            }
        }
    }

    async fn apply_rewards(&mut self, wallet: &str, xp: u64, coins: u64) {
        if let Ok(Some(mut profile)) = self.state.players.get(&wallet.to_string()).await {
            profile.xp += xp;
            profile.coins += coins;
            profile.total_games += 1;
            // Note: wins/losses/draws would need to be tracked separately
            let _ = self.state.players.insert(&wallet.to_string(), profile);
        }
    }
}
