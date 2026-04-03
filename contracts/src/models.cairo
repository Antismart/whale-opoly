use starknet::ContractAddress;

// ===== GAME MANAGEMENT MODELS =====

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct GameState {
    #[key]
    pub game_id: u64,
    pub players: Span<ContractAddress>,
    pub status: GameStatus,
    pub entry_tier: GameTier,
    pub total_pool: u256,
    pub current_turn: u8,
    pub start_time: u64,
    pub turn_deadline: u64,
    pub winner: Option<ContractAddress>,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct PlayerGameState {
    #[key]
    pub player: ContractAddress,
    #[key]
    pub game_id: u64,
    pub position: u8,
    pub balance: u256,
    pub properties_owned: u32,
    pub is_bankrupt: bool,
    pub is_in_jail: bool,
    pub jail_turns: u8,
    pub last_action_time: u64,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct GlobalPlayerState {
    #[key]
    pub player: ContractAddress,
    pub active_games: Span<u64>,
    pub total_staked: u256,
    pub total_winnings: u256,
    pub reputation_score: u32,
    pub verification_level: VerificationTier,
    pub registration_time: u64,
}

// ===== BOARD AND PROPERTY MODELS =====

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct Property {
    #[key]
    pub game_id: u64,
    #[key]
    pub property_id: u8,
    pub owner: Option<ContractAddress>,
    pub base_value: u256,
    pub current_value: u256,
    pub development_level: u8,
    pub rent_multiplier: u256,
    pub is_mortgaged: bool,
    pub color_group: PropertyGroup,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct PlayerPosition {
    #[key]
    pub player: ContractAddress,
    #[key]
    pub game_id: u64,
    pub position: u8,
    pub last_move_time: u64,
    pub moves_remaining: u8,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct PropertyTransaction {
    #[key]
    pub transaction_id: u64,
    pub game_id: u64,
    pub property_id: u8,
    pub from_player: Option<ContractAddress>,
    pub to_player: ContractAddress,
    pub transaction_type: TransactionType,
    pub amount: u256,
    pub timestamp: u64,
}

// ===== ECONOMIC MODELS =====

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct GameCurrency {
    #[key]
    pub game_id: u64,
    #[key]
    pub player: ContractAddress,
    pub balance: u256,
    pub starting_amount: u256,
    pub total_earned: u256,
    pub total_spent: u256,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct MarketEvent {
    #[key]
    pub event_id: u64,
    pub game_id: u64,
    pub event_type: MarketEventType,
    pub affected_properties: Span<u8>,
    pub multiplier: u256,
    pub duration: u64,
    pub remaining_duration: u64,
    pub created_at: u64,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct TreasuryBalance {
    #[key]
    pub balance_type: BalanceType,
    pub amount: u256,
    pub last_updated: u64,
    pub daily_limit: u256,
    pub daily_spent: u256,
}

// ===== GAME COUNTER MODEL =====

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct GameCounter {
    #[key]
    pub id: felt252, // always 'game_counter'
    pub next_id: u64,
}

// ===== RANDOMNESS AND SECURITY MODELS =====

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct RandomSeed {
    #[key]
    pub game_id: u64,
    #[key]
    pub round: u64,
    pub seed: felt252,
    pub block_hash: felt252,
    pub player_commits: Span<felt252>,
    pub reveal_deadline: u64,
    pub is_revealed: bool,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct SecurityAlert {
    #[key]
    pub alert_id: u64,
    pub game_id: Option<u64>,
    pub player: Option<ContractAddress>,
    pub alert_type: SecurityAlertType,
    pub severity: AlertSeverity,
    pub description: felt252,
    pub timestamp: u64,
    pub is_resolved: bool,
}

// ===== ENUMS =====

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect, DojoStore, Default)]
pub enum GameStatus {
    #[default]
    Lobby,
    Starting,
    Active,
    Paused,
    Completing,
    Finished,
}

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect, DojoStore, Default)]
pub enum GameTier {
    #[default]
    Bronze,   // 0.01 ETH
    Silver,   // 0.1 ETH
    Gold,     // 1 ETH
    Platinum, // 10 ETH
}

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect, DojoStore, Default)]
pub enum VerificationTier {
    #[default]
    Basic,
    Enhanced,
    Premium,
}

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect, DojoStore, Default)]
pub enum PropertyGroup {
    #[default]
    Brown,
    LightBlue,
    Pink,
    Orange,
    Red,
    Yellow,
    Green,
    DarkBlue,
    Railroad,
    Utility,
    Special,
}

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect, DojoStore, Default)]
pub enum TransactionType {
    #[default]
    Purchase,
    Sale,
    Rent,
    Mortgage,
    Unmortgage,
    Development,
    Tax,
}

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect, DojoStore, Default)]
pub enum MarketEventType {
    #[default]
    Boom,
    Crash,
    Disaster,
    Policy,
    CryptoNews,
}

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect, DojoStore, Default)]
pub enum BalanceType {
    #[default]
    HotWallet,
    WarmWallet,
    ColdStorage,
    Insurance,
    Operating,
}

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect, DojoStore, Default)]
pub enum SecurityAlertType {
    #[default]
    SuspiciousActivity,
    LargeTransaction,
    UnusualPattern,
    SystemAnomaly,
    PermissionViolation,
}

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect, DojoStore, Default)]
pub enum AlertSeverity {
    #[default]
    Low,
    Medium,
    High,
    Critical,
}