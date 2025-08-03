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

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect)]
pub enum GameStatus {
    Lobby,
    Starting,
    Active,
    Paused,
    Completing,
    Finished,
}

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect)]
pub enum GameTier {
    Bronze,   // 0.01 ETH
    Silver,   // 0.1 ETH
    Gold,     // 1 ETH
    Platinum, // 10 ETH
}

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect)]
pub enum VerificationTier {
    Basic,
    Enhanced,
    Premium,
}

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect)]
pub enum PropertyGroup {
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

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect)]
pub enum TransactionType {
    Purchase,
    Sale,
    Rent,
    Mortgage,
    Unmortgage,
    Development,
    Tax,
}

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect)]
pub enum MarketEventType {
    Boom,
    Crash,
    Disaster,
    Policy,
    CryptoNews,
}

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect)]
pub enum BalanceType {
    HotWallet,
    WarmWallet,
    ColdStorage,
    Insurance,
    Operating,
}

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect)]
pub enum SecurityAlertType {
    SuspiciousActivity,
    LargeTransaction,
    UnusualPattern,
    SystemAnomaly,
    PermissionViolation,
}

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect)]
pub enum AlertSeverity {
    Low,
    Medium,
    High,
    Critical,
}

// ===== LEGACY COMPATIBILITY =====

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct Moves {
    #[key]
    pub player: ContractAddress,
    pub remaining: u8,
    pub last_direction: Option<Direction>,
    pub can_move: bool,
}

#[derive(Drop, Serde, Debug)]
#[dojo::model]
pub struct DirectionsAvailable {
    #[key]
    pub player: ContractAddress,
    pub directions: Array<Direction>,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct Position {
    #[key]
    pub player: ContractAddress,
    pub vec: Vec2,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct PositionCount {
    #[key]
    pub identity: ContractAddress,
    pub position: Span<(u8, u128)>,
}

#[derive(Serde, Copy, Drop, Introspect, PartialEq, Debug)]
pub enum Direction {
    Left,
    Right,
    Up,
    Down,
}

#[derive(Copy, Drop, Serde, IntrospectPacked, Debug)]
pub struct Vec2 {
    pub x: u32,
    pub y: u32,
}

#[generate_trait]
impl Vec2Impl of Vec2Trait {
    fn is_zero(self: Vec2) -> bool {
        if self.x - self.y == 0 {
            true
        } else {
            false
        }
    }

    fn is_equal(self: Vec2, b: Vec2) -> bool {
        self.x == b.x && self.y == b.y
    }
}

// ===== TESTS =====

#[cfg(test)]
mod tests {
    use super::{Vec2, Vec2Trait};

    #[test]
    #[available_gas(100000)]
    fn test_vec_is_zero() {
        assert!(Vec2Trait::is_zero(Vec2 { x: 0, y: 0 }), "not zero");
    }

    #[test]
    #[available_gas(100000)]
    fn test_vec_is_equal() {
        let position = Vec2 { x: 420, y: 0 };
        assert!(position.is_equal(Vec2 { x: 420, y: 0 }), "not equal");
    }
}


impl DirectionIntoFelt252 of Into<Direction, felt252> {
    fn into(self: Direction) -> felt252 {
        match self {
            Direction::Left => 1,
            Direction::Right => 2,
            Direction::Up => 3,
            Direction::Down => 4,
        }
    }
}

impl OptionDirectionIntoFelt252 of Into<Option<Direction>, felt252> {
    fn into(self: Option<Direction>) -> felt252 {
        match self {
            Option::None => 0,
            Option::Some(d) => d.into(),
        }
    }
}



#[cfg(test)]
mod tests {
    use super::{Vec2, Vec2Trait};

    #[test]
    fn test_vec_is_zero() {
        assert(Vec2Trait::is_zero(Vec2 { x: 0, y: 0 }), 'not zero');
    }

    #[test]
    fn test_vec_is_equal() {
        let position = Vec2 { x: 420, y: 0 };
        assert(position.is_equal(Vec2 { x: 420, y: 0 }), 'not equal');
    }
}
