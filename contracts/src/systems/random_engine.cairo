use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
use dojo::model::{ModelStorage};
use dojo::world::{WorldStorage};
use dojo::event::{EventStorage};

use whale_opoly::models::{
    RandomSeed, SecurityAlert, SecurityAlertType, AlertSeverity, GameState
};

// ===== INTERFACES =====

#[starknet::interface]
pub trait IRandomEngine<T> {
    fn initialize_game_randomness(ref self: T, game_id: u64, players: Span<ContractAddress>) -> bool;
    fn commit_randomness(ref self: T, game_id: u64, round: u64, commitment: felt252) -> bool;
    fn reveal_randomness(ref self: T, game_id: u64, round: u64, nonce: felt252) -> bool;
    fn generate_dice_roll(ref self: T, game_id: u64, player: ContractAddress) -> (u8, u8);
    fn generate_card_draw(ref self: T, game_id: u64, deck_type: DeckType) -> u8;
    fn generate_market_event(ref self: T, game_id: u64) -> MarketEventSeed;
    fn verify_randomness_integrity(self: @T, game_id: u64, round: u64) -> bool;
    fn get_entropy_pool(self: @T, game_id: u64) -> felt252;
    fn is_round_ready(self: @T, game_id: u64, round: u64) -> bool;
}

// ===== EVENTS =====

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct RandomnessCommitted {
    #[key]
    pub game_id: u64,
    #[key]
    pub round: u64,
    pub player: ContractAddress,
    pub commitment_hash: felt252,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct RandomnessRevealed {
    #[key]
    pub game_id: u64,
    #[key]
    pub round: u64,
    pub player: ContractAddress,
    pub revealed_nonce: felt252,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct DiceGenerated {
    #[key]
    pub game_id: u64,
    #[key]
    pub player: ContractAddress,
    pub dice1: u8,
    pub dice2: u8,
    pub entropy_used: felt252,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct CardDrawn {
    #[key]
    pub game_id: u64,
    pub deck_type: DeckType,
    pub card_id: u8,
    pub drawn_by: ContractAddress,
    pub entropy_used: felt252,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct RandomnessIntegrityAlert {
    #[key]
    pub game_id: u64,
    #[key]
    pub round: u64,
    pub issue_type: IntegrityIssue,
    pub timestamp: u64,
}

// ===== MODELS =====

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct RandomnessCommitment {
    #[key]
    pub game_id: u64,
    #[key]
    pub round: u64,
    #[key]
    pub player: ContractAddress,
    pub commitment_hash: felt252,
    pub is_revealed: bool,
    pub revealed_nonce: Option<felt252>,
    pub committed_at: u64,
    pub revealed_at: Option<u64>,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct EntropyPool {
    #[key]
    pub game_id: u64,
    pub accumulated_entropy: felt252,
    pub block_hashes: Span<felt252>,
    pub player_contributions: Span<felt252>,
    pub external_entropy: Span<felt252>,
    pub last_updated: u64,
    pub usage_count: u64,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct RandomnessAudit {
    #[key]
    pub audit_id: u64,
    pub game_id: u64,
    pub round: u64,
    pub operation_type: RandomnessOperation,
    pub input_entropy: felt252,
    pub output_value: felt252,
    pub timestamp: u64,
    pub block_number: u64,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct DiceRollHistory {
    #[key]
    pub game_id: u64,
    #[key]
    pub player: ContractAddress,
    pub recent_rolls: Span<u8>,     // encoded as d1*10 + d2
    pub consecutive_doubles: u8,
    pub consecutive_identical: u8,
    pub last_updated: u64,
}

// ===== ENUMS =====

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect)]
pub enum DeckType {
    Chance,
    CommunityChest,
}

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect)]
pub enum IntegrityIssue {
    MissingCommitment,
    LateReveal,
    InvalidReveal,
    InsufficientEntropy,
    TimingAttack,
}

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect)]
pub enum RandomnessOperation {
    DiceRoll,
    CardDraw,
    MarketEvent,
    Other,
}

// ===== STRUCTS =====

#[derive(Copy, Drop, Serde, Debug)]
pub struct MarketEventSeed {
    pub event_type_seed: u8,
    pub magnitude_seed: u8,
    pub duration_seed: u8,
    pub target_seed: u8,
}

// ===== CONSTANTS =====

const COMMITMENT_REVEAL_WINDOW: u64 = 300; // 5 minutes to reveal after commit
const MIN_ENTROPY_THRESHOLD: u64 = 100; // Minimum entropy pool size
const MAX_DICE_REROLLS: u8 = 3; // Maximum consecutive identical rolls before alert
const CHANCE_CARDS_COUNT: u8 = 16;
const COMMUNITY_CHEST_CARDS_COUNT: u8 = 17;

// Hash constants for different operations
const DICE_ROLL_SALT: felt252 = 'WHALEOPOLY_DICE';
const CARD_DRAW_SALT: felt252 = 'WHALEOPOLY_CARDS';
const MARKET_EVENT_SALT: felt252 = 'WHALEOPOLY_MARKET';

// ===== IMPLEMENTATION =====

#[dojo::contract]
pub mod random_engine {
    use super::{
        IRandomEngine, RandomnessCommitted, RandomnessRevealed, DiceGenerated, CardDrawn, RandomnessIntegrityAlert,
        RandomSeed, SecurityAlert, SecurityAlertType, AlertSeverity,
        RandomnessCommitment, EntropyPool, RandomnessAudit, DeckType, IntegrityIssue, 
        RandomnessOperation, MarketEventSeed,
        COMMITMENT_REVEAL_WINDOW, MAX_DICE_REROLLS,
        CHANCE_CARDS_COUNT, COMMUNITY_CHEST_CARDS_COUNT,
        DICE_ROLL_SALT, CARD_DRAW_SALT, MARKET_EVENT_SALT,
        DiceRollHistory,
        GameState
    };
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use dojo::model::{ModelStorage, ModelValueStorage};
    use dojo::world::{WorldStorage, WorldStorageTrait};
    use dojo::event::{EventStorage};

    #[abi(embed_v0)]
    impl RandomEngineImpl of IRandomEngine<ContractState> {
        fn initialize_game_randomness(ref self: ContractState, game_id: u64, players: Span<ContractAddress>) -> bool {
            let mut world = self.world_default();
            let current_time = get_block_timestamp();
            
            // Use timestamp as seed instead of block_hash
            let timestamp_seed = current_time.into();

            // Initialize random seed for the game
            let random_seed = RandomSeed {
                game_id,
                round: 0,
                seed: timestamp_seed,
                block_hash: timestamp_seed,
                player_commits: array![].span(),
                reveal_deadline: current_time + COMMITMENT_REVEAL_WINDOW,
                is_revealed: false,
            };

            // Initialize entropy pool
            let entropy_pool = EntropyPool {
                game_id,
                accumulated_entropy: self._combine_entropy(timestamp_seed, game_id.into()),
                block_hashes: array![timestamp_seed].span(),
                player_contributions: array![].span(),
                external_entropy: array![].span(),
                last_updated: current_time,
                usage_count: 0,
            };

            world.write_model(@random_seed);
            world.write_model(@entropy_pool);

            // Initialize dice roll history for each player
            let mut i = 0;
            while i < players.len() {
                let p = *players.at(i);
                let hist = DiceRollHistory {
                    game_id,
                    player: p,
                    recent_rolls: array![].span(),
                    consecutive_doubles: 0,
                    consecutive_identical: 0,
                    last_updated: current_time,
                };
                world.write_model(@hist);
                i += 1;
            };

            true
        }

        fn commit_randomness(ref self: ContractState, game_id: u64, round: u64, commitment: felt252) -> bool {
            let mut world = self.world_default();
            let player = get_caller_address();
            let current_time = get_block_timestamp();

            // Create commitment record
            let commitment_record = RandomnessCommitment {
                game_id,
                round,
                player,
                commitment_hash: commitment,
                is_revealed: false,
                revealed_nonce: Option::None,
                committed_at: current_time,
                revealed_at: Option::None,
            };

            world.write_model(@commitment_record);

            // Update random seed with commitment
            let mut random_seed: RandomSeed = world.read_model((game_id, round));
            let mut new_commits = ArrayTrait::new();
            
            // Copy existing commits
            let mut i = 0;
            while i < random_seed.player_commits.len() {
                new_commits.append(*random_seed.player_commits.at(i));
                i += 1;
            };
            
            // Add new commitment
            new_commits.append(commitment);
            random_seed.player_commits = new_commits.span();

            world.write_model(@random_seed);

            // Emit event
            world.emit_event(@RandomnessCommitted {
                game_id,
                round,
                player,
                commitment_hash: commitment,
                timestamp: current_time,
            });

            true
        }

        fn reveal_randomness(ref self: ContractState, game_id: u64, round: u64, nonce: felt252) -> bool {
            let mut world = self.world_default();
            let player = get_caller_address();
            let current_time = get_block_timestamp();

            // Get commitment record
            let mut commitment: RandomnessCommitment = world.read_model((game_id, round, player));
            assert!(!commitment.is_revealed, "Already revealed");

            // Verify commitment matches reveal
            let commitment_hash = self._hash_commitment(nonce);
            assert!(commitment_hash == commitment.commitment_hash, "Invalid reveal");

            // Check reveal is within window
            assert!(current_time <= commitment.committed_at + COMMITMENT_REVEAL_WINDOW, "Reveal window expired");

            // Update commitment
            commitment.is_revealed = true;
            commitment.revealed_nonce = Option::Some(nonce);
            commitment.revealed_at = Option::Some(current_time);

            world.write_model(@commitment);

            // Update entropy pool with revealed randomness
            self._add_to_entropy_pool(game_id, nonce);

            // Emit event
            world.emit_event(@RandomnessRevealed {
                game_id,
                round,
                player,
                revealed_nonce: nonce,
                timestamp: current_time,
            });

            true
        }

        fn generate_dice_roll(ref self: ContractState, game_id: u64, player: ContractAddress) -> (u8, u8) {
            let mut world = self.world_default();
            let current_time = get_block_timestamp();

            // Get entropy
            let entropy = self._get_fresh_entropy(game_id, DICE_ROLL_SALT);
            
            // Convert entropy to u256 and use it for randomness
            let entropy_u256: u256 = entropy.into();
            let dice1 = ((entropy_u256.low % 6) + 1).try_into().unwrap();
            let dice2 = (((entropy_u256.low / 7) % 6) + 1).try_into().unwrap();

            // Create audit record with simple ID
            let audit_id = current_time; // Use timestamp as audit ID
            let audit = RandomnessAudit {
                audit_id,
                game_id,
                round: 0, // Current round would be determined elsewhere
                operation_type: RandomnessOperation::DiceRoll,
                input_entropy: entropy,
                output_value: (dice1.into() * 10 + dice2.into()).into(),
                timestamp: current_time,
                block_number: 0, // Simplified
            };

            world.write_model(@audit);

            // Check for suspicious patterns (too many identical rolls)
            self._check_dice_patterns(game_id, player, dice1, dice2);

            // Emit event
            world.emit_event(@DiceGenerated {
                game_id,
                player,
                dice1,
                dice2,
                entropy_used: entropy,
                timestamp: current_time,
            });

            (dice1, dice2)
        }

        fn generate_card_draw(ref self: ContractState, game_id: u64, deck_type: DeckType) -> u8 {
            let mut world = self.world_default();
            let current_time = get_block_timestamp();
            let caller = get_caller_address();

            // Get entropy
            let entropy = self._get_fresh_entropy(game_id, CARD_DRAW_SALT);

            // Generate card ID based on deck type
            let card_count = match deck_type {
                DeckType::Chance => CHANCE_CARDS_COUNT,
                DeckType::CommunityChest => COMMUNITY_CHEST_CARDS_COUNT,
            };

            let entropy_u256: u256 = entropy.into();
            let card_id = ((entropy_u256.low % card_count.into()) + 1).try_into().unwrap();

            // Create audit record
            let audit_id = current_time; // Use timestamp as audit ID
            let audit = RandomnessAudit {
                audit_id,
                game_id,
                round: 0,
                operation_type: RandomnessOperation::CardDraw,
                input_entropy: entropy,
                output_value: card_id.into(),
                timestamp: current_time,
                block_number: 0, // Simplified
            };

            world.write_model(@audit);

            // Emit event
            world.emit_event(@CardDrawn {
                game_id,
                deck_type,
                card_id,
                drawn_by: caller,
                entropy_used: entropy,
                timestamp: current_time,
            });

            card_id
        }

        fn generate_market_event(ref self: ContractState, game_id: u64) -> MarketEventSeed {
            let mut world = self.world_default();
            let current_time = get_block_timestamp();

            // Get entropy
            let entropy = self._get_fresh_entropy(game_id, MARKET_EVENT_SALT);

            // Generate different seeds for market event parameters
            let entropy_u256: u256 = entropy.into();
            let event_type_seed = ((entropy_u256.low % 5) + 1).try_into().unwrap(); // 5 event types
            let magnitude_seed = (((entropy_u256.low / 7) % 100) + 1).try_into().unwrap(); // 1-100 magnitude
            let duration_seed = (((entropy_u256.low / 11) % 10) + 1).try_into().unwrap(); // 1-10 duration
            let target_seed = (((entropy_u256.low / 13) % 8) + 1).try_into().unwrap(); // 8 property groups

            let market_seed = MarketEventSeed {
                event_type_seed,
                magnitude_seed,
                duration_seed,
                target_seed,
            };

            // Create audit record
            let audit_id = current_time; // Use timestamp as audit ID
            let audit = RandomnessAudit {
                audit_id,
                game_id,
                round: 0,
                operation_type: RandomnessOperation::MarketEvent,
                input_entropy: entropy,
                output_value: entropy, // Store full entropy for market events
                timestamp: current_time,
                block_number: 0, // Simplified
            };

            world.write_model(@audit);

            market_seed
        }

        fn verify_randomness_integrity(self: @ContractState, game_id: u64, round: u64) -> bool {
            let mut world = self.world_default();
            let now = get_block_timestamp();

            // Load seed and current players in the game
            let random_seed: RandomSeed = world.read_model((game_id, round));
            let gs: GameState = world.read_model(game_id);
            let players: Span<ContractAddress> = gs.players;

            // Must be past reveal deadline to verify integrity
            if now <= random_seed.reveal_deadline {
                return false;
            }

            // Require at least one commitment
            if random_seed.player_commits.len() == 0 {
                world.emit_event(@RandomnessIntegrityAlert {
                    game_id,
                    round,
                    issue_type: IntegrityIssue::MissingCommitment,
                    timestamp: now,
                });
                return false;
            }

            // Every player must have a revealed commitment for this round
            let mut failure_code: u8 = 0_u8; // 1=Missing, 2=Late, 3=Invalid
            let mut i = 0;
            while i < players.len() {
                let p_ref = players.at(i);
                let player: ContractAddress = *p_ref;
                let commitment: RandomnessCommitment = world.read_model((game_id, round, player));

                // Must be revealed
                if !commitment.is_revealed {
                    failure_code = 1_u8;
                    break;
                }

                // Verify reveal within window and seed deadline
                let revealed_at = commitment.revealed_at.unwrap();
                if revealed_at > commitment.committed_at + COMMITMENT_REVEAL_WINDOW || revealed_at > random_seed.reveal_deadline {
                    failure_code = 2_u8;
                    break;
                }

                // Verify reveal matches original commitment
                let revealed_nonce = commitment.revealed_nonce.unwrap();
                let expected_hash = self._hash_commitment(revealed_nonce);
                if expected_hash != commitment.commitment_hash {
                    failure_code = 3_u8;
                    break;
                }

                i += 1;
            };

            if failure_code != 0_u8 {
                let issue = if failure_code == 1_u8 {
                    IntegrityIssue::MissingCommitment
                } else {
                    if failure_code == 2_u8 { IntegrityIssue::LateReveal } else { IntegrityIssue::InvalidReveal }
                };
                world.emit_event(@RandomnessIntegrityAlert {
                    game_id,
                    round,
                    issue_type: issue,
                    timestamp: now,
                });
                return false;
            }

            // Check player-contributed entropy is sufficient (at least one per player)
            let pool: EntropyPool = world.read_model(game_id);
            if pool.player_contributions.len() < players.len() {
                world.emit_event(@RandomnessIntegrityAlert {
                    game_id,
                    round,
                    issue_type: IntegrityIssue::InsufficientEntropy,
                    timestamp: now,
                });
                return false;
            }

            true
        }

        fn get_entropy_pool(self: @ContractState, game_id: u64) -> felt252 {
            let world = self.world_default();
            let entropy_pool: EntropyPool = world.read_model(game_id);
            entropy_pool.accumulated_entropy
        }

        fn is_round_ready(self: @ContractState, game_id: u64, round: u64) -> bool {
            let world = self.world_default();
            let random_seed: RandomSeed = world.read_model((game_id, round));
            let current_time = get_block_timestamp();
            
            // Check if reveal deadline has passed
            current_time > random_seed.reveal_deadline
        }
    }

    // ===== INTERNAL FUNCTIONS =====

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> WorldStorage {
            self.world(@"whale_opoly")
        }

        fn _combine_entropy(self: @ContractState, base: felt252, additional: felt252) -> felt252 {
            // Enhanced entropy mixing: multi-round non-linear combination with fixed salts and timestamp
            let t: felt252 = get_block_timestamp().into();

            // Round 1: seed and square
            let mut x: felt252 = base + 'MIX_A'.into() + additional + t;
            let r1: felt252 = (x * x) + ('MIX_B'.into() * (base + 1));

            // Round 2: cubic non-linearity and salt
            let r2: felt252 = (r1 * r1 * r1) + ('MIX_C'.into() * (additional + 3));

            // Round 3: cross-mix base and additional with distinct salts
            let cross1: felt252 = r2 + (base * 'MIX_D'.into());
            let cross2: felt252 = r2 + (additional * 'MIX_E'.into());
            let r3: felt252 = cross1 * cross2;

            // Final diffusion
            (r3 * r3) + 'MIX_F'.into()
        }

        fn _hash_commitment(self: @ContractState, nonce: felt252) -> felt252 {
            // Strengthened hash-like mixer for commitments (placeholder for Pedersen/Poseidon)
            let t: felt252 = get_block_timestamp().into();
            let s1: felt252 = nonce + 'CMT1'.into();
            let s2: felt252 = (s1 * s1) + 'CMT2'.into() + t;
            let s3: felt252 = (s2 * s2 * s2) + ('CMT3'.into() * (nonce + 7));
            (s3 * s3) + 'CMT4'.into()
        }

        fn _get_fresh_entropy(ref self: ContractState, game_id: u64, salt: felt252) -> felt252 {
            let mut world = self.world_default();
            let mut entropy_pool: EntropyPool = world.read_model(game_id);
            
            // Combine multiple entropy sources using timestamp instead of block_hash
            let timestamp = get_block_timestamp();
            let fresh_entropy = self._combine_entropy(
                entropy_pool.accumulated_entropy,
                self._combine_entropy(timestamp.into(), salt)
            );

            // Update usage count
            entropy_pool.usage_count += 1;
            entropy_pool.last_updated = timestamp;
            
            // Add new timestamp to pool
            let mut new_block_hashes = ArrayTrait::new();
            let mut i = 0;
            while i < entropy_pool.block_hashes.len() {
                new_block_hashes.append(*entropy_pool.block_hashes.at(i));
                i += 1;
            };
            new_block_hashes.append(timestamp.into());
            entropy_pool.block_hashes = new_block_hashes.span();

            world.write_model(@entropy_pool);

            fresh_entropy
        }

        fn _add_to_entropy_pool(ref self: ContractState, game_id: u64, entropy: felt252) {
            let mut world = self.world_default();
            let mut entropy_pool: EntropyPool = world.read_model(game_id);
            
            // Add player contribution to entropy pool
            entropy_pool.accumulated_entropy = self._combine_entropy(
                entropy_pool.accumulated_entropy, 
                entropy
            );
            
            // Add to player contributions
            let mut new_contributions = ArrayTrait::new();
            let mut i = 0;
            while i < entropy_pool.player_contributions.len() {
                new_contributions.append(*entropy_pool.player_contributions.at(i));
                i += 1;
            };
            new_contributions.append(entropy);
            entropy_pool.player_contributions = new_contributions.span();
            
            entropy_pool.last_updated = get_block_timestamp();

            world.write_model(@entropy_pool);
        }

        fn _check_dice_patterns(ref self: ContractState, game_id: u64, player: ContractAddress, dice1: u8, dice2: u8) {
            let mut world = self.world_default();
            let now = get_block_timestamp();

            // Load history
            let mut hist: DiceRollHistory = world.read_model((game_id, player));

            // Encode current roll as d1*10 + d2
            let encoded: u8 = (dice1 * 10_u8) + dice2;

            // Update consecutive doubles
            if dice1 == dice2 {
                hist.consecutive_doubles = hist.consecutive_doubles + 1_u8;
            } else {
                hist.consecutive_doubles = 0_u8;
            }

            // Check identical to previous
            let mut prev_same = false;
            if hist.recent_rolls.len() > 0 {
                let prev_idx = hist.recent_rolls.len() - 1;
                let prev = *hist.recent_rolls.at(prev_idx);
                prev_same = prev == encoded;
            }
            if prev_same { hist.consecutive_identical = hist.consecutive_identical + 1_u8; }
            else { hist.consecutive_identical = 0_u8; }

            // Maintain last 10 rolls
            let mut new_recent = ArrayTrait::new();
            let len = hist.recent_rolls.len();
            let start = if len > 9 { len - 9 } else { 0 }; // keep last 9, then append current = total 10
            let mut i = start;
            while i < len {
                new_recent.append(*hist.recent_rolls.at(i));
                i += 1;
            };
            new_recent.append(encoded);
            hist.recent_rolls = new_recent.span();
            hist.last_updated = now;

            // Analyze recent patterns
            // 1) Too many doubles in a row
            if hist.consecutive_doubles >= 3_u8 {
                self._create_security_alert(
                    SecurityAlertType::UnusualPattern,
                    AlertSeverity::High,
                    'Three or more doubles in a row'
                );
            }

            // 2) Identical results repeated beyond threshold
            if hist.consecutive_identical > MAX_DICE_REROLLS {
                self._create_security_alert(
                    SecurityAlertType::UnusualPattern,
                    AlertSeverity::High,
                    'Identical dice repeated'
                );
            }

            // 3) Frequent double sixes in last 5 rolls
            let mut count_dbl6: u8 = 0_u8;
            let mut j = if hist.recent_rolls.len() > 5 { hist.recent_rolls.len() - 5 } else { 0 };
            while j < hist.recent_rolls.len() {
                if *hist.recent_rolls.at(j) == 66_u8 { count_dbl6 += 1_u8; }
                j += 1;
            };
            if count_dbl6 >= 2_u8 {
                self._create_security_alert(
                    SecurityAlertType::UnusualPattern,
                    AlertSeverity::Medium,
                    'Frequent double sixes'
                );
            }

            // 4) Extreme sums (2 or 12) appearing disproportionately in last 8 rolls
            let mut extreme_count: u8 = 0_u8;
            let mut k = if hist.recent_rolls.len() > 8 { hist.recent_rolls.len() - 8 } else { 0 };
            while k < hist.recent_rolls.len() {
                let v = *hist.recent_rolls.at(k);
                let d1 = v / 10_u8;
                let d2 = v % 10_u8;
                let sum = d1 + d2;
                if sum == 2_u8 || sum == 12_u8 { extreme_count += 1_u8; }
                k += 1;
            };
            if extreme_count >= 3_u8 {
                self._create_security_alert(
                    SecurityAlertType::UnusualPattern,
                    AlertSeverity::Medium,
                    'Extreme sums disproportionate'
                );
            }

            // Persist history
            world.write_model(@hist);
        }

        fn _create_security_alert(ref self: ContractState, alert_type: SecurityAlertType, severity: AlertSeverity, description: felt252) {
            let mut world = self.world_default();
            let alert_id = get_block_timestamp(); // Use timestamp as alert ID
            let current_time = get_block_timestamp();

            let alert = SecurityAlert {
                alert_id,
                game_id: Option::None,
                player: Option::None,
                alert_type,
                severity,
                description,
                timestamp: current_time,
                is_resolved: false,
            };

            world.write_model(@alert);
        }
    }
}
