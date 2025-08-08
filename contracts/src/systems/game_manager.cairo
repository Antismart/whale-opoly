use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
use dojo::model::{ModelStorage};
use dojo::world::{WorldStorage};
use dojo::event::{EventStorage};

use whale_opoly::models::{
    GameState, PlayerGameState, GlobalPlayerState, GameStatus, GameTier, 
    VerificationTier, TreasuryBalance, BalanceType
};

// ===== INTERFACES =====

#[starknet::interface]
pub trait IGameManager<T> {
    fn create_game(ref self: T, tier: GameTier, max_players: u8) -> u64;
    fn join_game(ref self: T, game_id: u64) -> bool;
    fn start_game(ref self: T, game_id: u64) -> bool;
    fn end_game(ref self: T, game_id: u64, winner: Option<ContractAddress>) -> bool;
    fn get_game_state(self: @T, game_id: u64) -> GameState;
    fn get_player_games(self: @T, player: ContractAddress) -> Span<u64>;
    fn is_game_full(self: @T, game_id: u64) -> bool;
    fn can_player_join(self: @T, player: ContractAddress, game_id: u64) -> bool;
}

// ===== EVENTS =====

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct GameCreated {
    #[key]
    pub game_id: u64,
    #[key]
    pub creator: ContractAddress,
    pub tier: GameTier,
    pub max_players: u8,
    pub created_at: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct PlayerJoined {
    #[key]
    pub game_id: u64,
    #[key]
    pub player: ContractAddress,
    pub player_count: u8,
    pub joined_at: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct GameStarted {
    #[key]
    pub game_id: u64,
    pub players: Span<ContractAddress>,
    pub started_at: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct GameEnded {
    #[key]
    pub game_id: u64,
    pub winner: Option<ContractAddress>,
    pub total_pool: u256,
    pub ended_at: u64,
}

// ===== CONSTANTS =====

const MAX_PLAYERS_PER_GAME: u8 = 6;
const MIN_PLAYERS_PER_GAME: u8 = 2;
const GAME_START_DELAY: u64 = 30; // 30 seconds delay before game starts
const MAX_CONCURRENT_GAMES: u8 = 3; // Max games per player

// Game entry fees in wei (approximate values)
const BRONZE_ENTRY_FEE: u256 = 10000000000000000; // 0.01 ETH
const SILVER_ENTRY_FEE: u256 = 100000000000000000; // 0.1 ETH  
const GOLD_ENTRY_FEE: u256 = 1000000000000000000; // 1 ETH
const PLATINUM_ENTRY_FEE: u256 = 10000000000000000000; // 10 ETH

// Starting balances for each tier
const BRONZE_STARTING_BALANCE: u256 = 1500000; // $1.5M monopoly money
const SILVER_STARTING_BALANCE: u256 = 1500000;
const GOLD_STARTING_BALANCE: u256 = 1500000;
const PLATINUM_STARTING_BALANCE: u256 = 1500000;

// ===== IMPLEMENTATION =====

#[dojo::contract]
pub mod game_manager {
    use super::{
        IGameManager, GameCreated, PlayerJoined, GameStarted, GameEnded,
        GameState, PlayerGameState, GlobalPlayerState, GameStatus, GameTier,
        VerificationTier, TreasuryBalance, BalanceType,
        MAX_PLAYERS_PER_GAME, MIN_PLAYERS_PER_GAME, GAME_START_DELAY, MAX_CONCURRENT_GAMES,
        BRONZE_ENTRY_FEE, SILVER_ENTRY_FEE, GOLD_ENTRY_FEE, PLATINUM_ENTRY_FEE,
        BRONZE_STARTING_BALANCE, SILVER_STARTING_BALANCE, GOLD_STARTING_BALANCE, PLATINUM_STARTING_BALANCE
    };
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use dojo::model::{ModelStorage, ModelValueStorage};
    use dojo::world::{WorldStorage, WorldStorageTrait};
    use dojo::event::{EventStorage};

    #[abi(embed_v0)]
    impl GameManagerImpl of IGameManager<ContractState> {
        fn create_game(ref self: ContractState, tier: GameTier, max_players: u8) -> u64 {
            let mut world = self.world_default();
            let creator = get_caller_address();
            let current_time = get_block_timestamp();

            // Validate input parameters
            assert!(max_players >= MIN_PLAYERS_PER_GAME, "Too few players");
            assert!(max_players <= MAX_PLAYERS_PER_GAME, "Too many players");

            // Check player verification level for high-tier games
            let player_state: GlobalPlayerState = world.read_model(creator);
            self._validate_tier_access(tier, player_state.verification_level);

            // Check player doesn't have too many active games
            assert!(player_state.active_games.len() < MAX_CONCURRENT_GAMES.into(), "Too many active games");

            // Generate unique game ID
            let game_id = (get_block_timestamp()).into();

            // Calculate entry fee and starting balance
            let (entry_fee, starting_balance) = self._get_tier_parameters(tier);

            // Create game state
            let game_state = GameState {
                game_id,
                players: array![creator].span(),
                status: GameStatus::Lobby,
                entry_tier: tier,
                total_pool: entry_fee,
                current_turn: 0,
                start_time: 0,
                turn_deadline: 0,
                winner: Option::None,
            };

            // Create player game state
            let player_game_state = PlayerGameState {
                player: creator,
                game_id,
                position: 0,
                balance: starting_balance,
                properties_owned: 0,
                is_bankrupt: false,
                is_in_jail: false,
                jail_turns: 0,
                last_action_time: current_time,
            };

            // Update global player state
            let mut updated_player_state = player_state;
            let mut new_active_games = ArrayTrait::new();
            let mut i = 0;
            while i < player_state.active_games.len() {
                new_active_games.append(*player_state.active_games.at(i));
                i += 1;
            };
            new_active_games.append(game_id);
            updated_player_state.active_games = new_active_games.span();

            // Write to world
            world.write_model(@game_state);
            world.write_model(@player_game_state);
            world.write_model(@updated_player_state);

            // Update treasury
            self._update_treasury_balance(entry_fee);

            // Emit event
            world.emit_event(@GameCreated {
                game_id,
                creator,
                tier,
                max_players,
                created_at: current_time,
            });

            game_id
        }

        fn join_game(ref self: ContractState, game_id: u64) -> bool {
            let mut world = self.world_default();
            let player = get_caller_address();
            let current_time = get_block_timestamp();

            // Get game state
            let mut game_state: GameState = world.read_model(game_id);
            
            // Validate game can be joined
            assert!(game_state.status == GameStatus::Lobby, "Game not in lobby");
            assert!(game_state.players.len() < MAX_PLAYERS_PER_GAME.into(), "Game full");
            assert!(!self._is_player_in_game(game_state.players, player), "Already joined");

            // Get player state
            let player_state: GlobalPlayerState = world.read_model(player);
            
            // Validate player can join
            self._validate_tier_access(game_state.entry_tier, player_state.verification_level);
            assert!(player_state.active_games.len() < MAX_CONCURRENT_GAMES.into(), "Too many active games");

            // Calculate entry fee and starting balance
            let (entry_fee, starting_balance) = self._get_tier_parameters(game_state.entry_tier);

            // Add player to game
            let mut new_players = ArrayTrait::new();
            let mut i = 0;
            while i < game_state.players.len() {
                new_players.append(*game_state.players.at(i));
                i += 1;
            };
            new_players.append(player);
            
            game_state.players = new_players.span();
            game_state.total_pool += entry_fee;

            // Create player game state
            let player_game_state = PlayerGameState {
                player,
                game_id,
                position: 0,
                balance: starting_balance,
                properties_owned: 0,
                is_bankrupt: false,
                is_in_jail: false,
                jail_turns: 0,
                last_action_time: current_time,
            };

            // Update global player state
            let mut updated_player_state = player_state;
            let mut new_active_games = ArrayTrait::new();
            let mut i = 0;
            while i < player_state.active_games.len() {
                new_active_games.append(*player_state.active_games.at(i));
                i += 1;
            };
            new_active_games.append(game_id);
            updated_player_state.active_games = new_active_games.span();

            // Write to world
            world.write_model(@game_state);
            world.write_model(@player_game_state);
            world.write_model(@updated_player_state);

            // Update treasury
            self._update_treasury_balance(entry_fee);

            // Emit event
            world.emit_event(@PlayerJoined {
                game_id,
                player,
                player_count: game_state.players.len().try_into().unwrap(),
                joined_at: current_time,
            });

            true
        }

        fn start_game(ref self: ContractState, game_id: u64) -> bool {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let current_time = get_block_timestamp();

            // Get game state
            let mut game_state: GameState = world.read_model(game_id);
            
            // Validate game can be started
            assert!(game_state.status == GameStatus::Lobby, "Game not in lobby");
            assert!(game_state.players.len() >= MIN_PLAYERS_PER_GAME.into(), "Not enough players");
            assert!(self._is_player_in_game(game_state.players, caller), "Not a player");

            // Update game state
            game_state.status = GameStatus::Active;
            game_state.start_time = current_time + GAME_START_DELAY;
            game_state.turn_deadline = current_time + GAME_START_DELAY + 60; // 1 minute per turn
            game_state.current_turn = 0;

            // Write to world
            world.write_model(@game_state);

            // Emit event
            world.emit_event(@GameStarted {
                game_id,
                players: game_state.players,
                started_at: game_state.start_time,
            });

            true
        }

        fn end_game(ref self: ContractState, game_id: u64, winner: Option<ContractAddress>) -> bool {
            let mut world = self.world_default();
            let current_time = get_block_timestamp();

            // Get game state
            let mut game_state: GameState = world.read_model(game_id);
            
            // Validate game can be ended
            assert!(game_state.status == GameStatus::Active || game_state.status == GameStatus::Paused, "Game not active");

            // Update game state
            game_state.status = GameStatus::Finished;
            game_state.winner = winner;

            // Calculate and distribute prizes
            self._distribute_prizes(game_id, game_state.players, winner, game_state.total_pool);

            // Remove game from all players' active games
            self._cleanup_player_states(game_state.players, game_id);

            // Write to world
            world.write_model(@game_state);

            // Emit event
            world.emit_event(@GameEnded {
                game_id,
                winner,
                total_pool: game_state.total_pool,
                ended_at: current_time,
            });

            true
        }

        fn get_game_state(self: @ContractState, game_id: u64) -> GameState {
            let world = self.world_default();
            world.read_model(game_id)
        }

        fn get_player_games(self: @ContractState, player: ContractAddress) -> Span<u64> {
            let world = self.world_default();
            let player_state: GlobalPlayerState = world.read_model(player);
            player_state.active_games
        }

        fn is_game_full(self: @ContractState, game_id: u64) -> bool {
            let world = self.world_default();
            let game_state: GameState = world.read_model(game_id);
            game_state.players.len() >= MAX_PLAYERS_PER_GAME.into()
        }

        fn can_player_join(self: @ContractState, player: ContractAddress, game_id: u64) -> bool {
            let world = self.world_default();
            let game_state: GameState = world.read_model(game_id);
            let player_state: GlobalPlayerState = world.read_model(player);

            // Check basic conditions
            if game_state.status != GameStatus::Lobby {
                return false;
            }
            if game_state.players.len() >= MAX_PLAYERS_PER_GAME.into() {
                return false;
            }
            if self._is_player_in_game(game_state.players, player) {
                return false;
            }
            if player_state.active_games.len() >= MAX_CONCURRENT_GAMES.into() {
                return false;
            }

            // Check verification level
            self._can_access_tier(game_state.entry_tier, player_state.verification_level)
        }
    }

    // ===== INTERNAL FUNCTIONS =====

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> WorldStorage {
            self.world(@"whale_opoly")
        }

        fn _validate_tier_access(self: @ContractState, tier: GameTier, verification: VerificationTier) {
            match tier {
                GameTier::Bronze => {}, // No verification required
                GameTier::Silver => {
                    assert!(verification != VerificationTier::Basic, "Insufficient verification");
                },
                GameTier::Gold => {
                    assert!(verification == VerificationTier::Premium, "Premium verification required");
                },
                GameTier::Platinum => {
                    assert!(verification == VerificationTier::Premium, "Premium verification required");
                },
            }
        }

        fn _can_access_tier(self: @ContractState, tier: GameTier, verification: VerificationTier) -> bool {
            match tier {
                GameTier::Bronze => true,
                GameTier::Silver => verification != VerificationTier::Basic,
                GameTier::Gold => verification == VerificationTier::Premium,
                GameTier::Platinum => verification == VerificationTier::Premium,
            }
        }

        fn _get_tier_parameters(self: @ContractState, tier: GameTier) -> (u256, u256) {
            match tier {
                GameTier::Bronze => (BRONZE_ENTRY_FEE, BRONZE_STARTING_BALANCE),
                GameTier::Silver => (SILVER_ENTRY_FEE, SILVER_STARTING_BALANCE),
                GameTier::Gold => (GOLD_ENTRY_FEE, GOLD_STARTING_BALANCE),
                GameTier::Platinum => (PLATINUM_ENTRY_FEE, PLATINUM_STARTING_BALANCE),
            }
        }

        fn _is_player_in_game(self: @ContractState, players: Span<ContractAddress>, player: ContractAddress) -> bool {
            let mut i = 0;
            let mut found = false;
            while i < players.len() {
                if *players.at(i) == player {
                    found = true;
                    break;
                }
                i += 1;
            };
            found
        }

        fn _update_treasury_balance(ref self: ContractState, amount: u256) {
            let mut world = self.world_default();
            let mut hot_wallet: TreasuryBalance = world.read_model(BalanceType::HotWallet);
            
            hot_wallet.amount += amount;
            hot_wallet.last_updated = get_block_timestamp();
            
            world.write_model(@hot_wallet);
        }

        fn _distribute_prizes(ref self: ContractState, game_id: u64, players: Span<ContractAddress>, winner: Option<ContractAddress>, total_pool: u256) {
            let mut world = self.world_default();
            if players.len() == 0 { return (); }

            // Split pool: Winner 60%, Runner-up 25%, Third 10%, Platform 3%, Insurance 2%
            let winner_amt: u256 = (total_pool * 60_u256) / 100_u256;
            let runner_amt: u256 = (total_pool * 25_u256) / 100_u256;
            let third_amt: u256 = (total_pool * 10_u256) / 100_u256;
            let platform_amt: u256 = (total_pool * 3_u256) / 100_u256;
            let insurance_amt: u256 = (total_pool * 2_u256) / 100_u256;

            // Determine podium by final in-game balances as tiebreaker (if winner not provided)
            // Find winner address
            let mut winner_addr_opt = winner;
            if winner_addr_opt.is_none() {
                let mut i = 0;
                let mut best_balance: u256 = 0;
                let mut best_addr: ContractAddress = *players.at(0);
                while i < players.len() {
                    let addr = *players.at(i);
                    let pstate: PlayerGameState = world.read_model((addr, game_id));
                    if pstate.balance > best_balance { best_balance = pstate.balance; best_addr = addr; }
                    i += 1;
                };
                winner_addr_opt = Option::Some(best_addr);
            }

            // Determine runner-up and third based on remaining balances
            let winner_addr = winner_addr_opt.unwrap();
            let mut runner_addr_opt: Option<ContractAddress> = Option::None;
            let mut third_addr_opt: Option<ContractAddress> = Option::None;

            // Runner-up
            let mut i = 0;
            let mut best2_balance: u256 = 0;
            let mut best2_addr: ContractAddress = winner_addr; // placeholder
            while i < players.len() {
                let addr = *players.at(i);
                if addr != winner_addr {
                    let pstate: PlayerGameState = world.read_model((addr, game_id));
                    if pstate.balance > best2_balance { best2_balance = pstate.balance; best2_addr = addr; }
                }
                i += 1;
            };
            if best2_balance > 0 { runner_addr_opt = Option::Some(best2_addr); }

            // Third
            let mut i2 = 0;
            let mut best3_balance: u256 = 0;
            let mut best3_addr: ContractAddress = winner_addr; // placeholder
            while i2 < players.len() {
                let addr = *players.at(i2);
                if addr != winner_addr && (runner_addr_opt.is_none() || addr != runner_addr_opt.unwrap()) {
                    let pstate: PlayerGameState = world.read_model((addr, game_id));
                    if pstate.balance > best3_balance { best3_balance = pstate.balance; best3_addr = addr; }
                }
                i2 += 1;
            };
            if best3_balance > 0 { third_addr_opt = Option::Some(best3_addr); }

            // Reallocate missing shares to winner to ensure 100%
            let mut w_amt = winner_amt;
            let mut r_amt = runner_amt;
            let mut t_amt = third_amt;
            if runner_addr_opt.is_none() { w_amt = w_amt + r_amt; r_amt = 0; }
            if third_addr_opt.is_none() { w_amt = w_amt + t_amt; t_amt = 0; }

            // Credit player winnings (global state aggregator)
            let now = get_block_timestamp();
            // Winner
            let mut g_winner: GlobalPlayerState = world.read_model(winner_addr);
            g_winner.total_winnings = g_winner.total_winnings + w_amt;
            world.write_model(@g_winner);
            // Runner
            match runner_addr_opt {
                Option::Some(addr) => {
                    let mut g_runner: GlobalPlayerState = world.read_model(addr);
                    g_runner.total_winnings = g_runner.total_winnings + r_amt;
                    world.write_model(@g_runner);
                },
                Option::None => {}
            };
            // Third
            match third_addr_opt {
                Option::Some(addr) => {
                    let mut g_third: GlobalPlayerState = world.read_model(addr);
                    g_third.total_winnings = g_third.total_winnings + t_amt;
                    world.write_model(@g_third);
                },
                Option::None => {}
            };

            // Move treasury allocations:
            // - Winners' shares -> WarmWallet (queued for payout)
            // - Platform share -> Operating
            // - Insurance share -> Insurance
            let winners_total: u256 = w_amt + r_amt + t_amt;
            let mut hot: TreasuryBalance = world.read_model(BalanceType::HotWallet);
            let mut warm: TreasuryBalance = world.read_model(BalanceType::WarmWallet);
            let mut operating: TreasuryBalance = world.read_model(BalanceType::Operating);
            let mut insurance: TreasuryBalance = world.read_model(BalanceType::Insurance);

            let total_deduction: u256 = winners_total + platform_amt + insurance_amt;
            assert!(hot.amount >= total_deduction, "Treasury hot wallet insufficient");

            hot.amount = hot.amount - total_deduction;
            warm.amount = warm.amount + winners_total;
            operating.amount = operating.amount + platform_amt;
            insurance.amount = insurance.amount + insurance_amt;

            hot.last_updated = now;
            warm.last_updated = now;
            operating.last_updated = now;
            insurance.last_updated = now;

            world.write_model(@hot);
            world.write_model(@warm);
            world.write_model(@operating);
            world.write_model(@insurance);
        }

        fn _cleanup_player_states(ref self: ContractState, players: Span<ContractAddress>, game_id: u64) {
            let mut world = self.world_default();
            let mut i = 0;
            
            while i < players.len() {
                let player = *players.at(i);
                let mut player_state: GlobalPlayerState = world.read_model(player);
                
                // Remove game_id from active_games
                let mut new_active_games = ArrayTrait::new();
                let mut j = 0;
                while j < player_state.active_games.len() {
                    let active_game = *player_state.active_games.at(j);
                    if active_game != game_id {
                        new_active_games.append(active_game);
                    }
                    j += 1;
                };
                
                player_state.active_games = new_active_games.span();
                world.write_model(@player_state);
                i += 1;
            };
        }
    }
}
