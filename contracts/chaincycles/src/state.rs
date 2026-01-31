// ChainCycles - State Storage
// Persistent on-chain state using Linera views

use crate::{GameRoom, PlayerProfile};
use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};

/// Root state for ChainCycles application
#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = ViewStorageContext)]
pub struct ChainCyclesState {
    /// Hub chain ID (if configured)
    pub hub_chain_id: RegisterView<Option<String>>,

    /// Current game room on this chain (one room per chain)
    /// Both host and joiner store identical room state
    /// Synchronized via GameMoveSync cross-chain messages
    pub game_room: RegisterView<Option<GameRoom>>,

    /// Player profiles indexed by wallet address string
    pub players: MapView<String, PlayerProfile>,

    /// Is this chain currently hosting a room?
    pub is_hosting: RegisterView<bool>,

    /// Host chain ID if this chain has joined another room
    pub joined_host_chain: RegisterView<Option<String>>,

    /// Recent room codes visited (for lobby feature)
    pub recent_rooms: RegisterView<Vec<String>>,
}
