use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
use dojo::model::{ModelStorage, ModelValueStorage};
use dojo::world::{WorldStorage, WorldStorageTrait};
use dojo::event::{EventStorage};

use whale_opoly::models::{
    GameCurrency, TreasuryBalance, BalanceType, MarketEvent, MarketEventType,
    PlayerGameState, Property, PropertyGroup, GameState
};

// ===== INTERFACES =====

#[starknet::interface]
pub trait IEconomics<T> {
    fn calculate_inflation_adjustment(self: @T, base_amount: u256, game_duration: u64) -> u256;
    fn apply_market_volatility(ref self: T, game_id: u64, event_type: MarketEventType, magnitude: u8) -> bool;
    fn calculate_bankruptcy_threshold(self: @T, game_id: u64, player: ContractAddress) -> u256;
    fn process_bank_interest(ref self: T, game_id: u64, player: ContractAddress) -> u256;
    fn calculate_property_tax(self: @T, game_id: u64, player: ContractAddress) -> u256;
    fn process_salary_payment(ref self: T, game_id: u64, player: ContractAddress) -> u256;
    fn calculate_total_wealth(self: @T, game_id: u64, player: ContractAddress) -> u256;
    fn get_economic_indicators(self: @T, game_id: u64) -> EconomicIndicators;
    fn check_economic_balance(self: @T, game_id: u64) -> bool;
    fn apply_universal_basic_income(ref self: T, game_id: u64) -> bool;
}

// ===== EVENTS =====

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct InflationAdjustment {
    #[key]
    pub game_id: u64,
    pub old_base_amount: u256,
    pub new_amount: u256,
    pub inflation_rate: u16,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct MarketVolatilityApplied {
    #[key]
    pub game_id: u64,
    pub event_type: MarketEventType,
    pub affected_properties: Span<u8>,
    pub magnitude: u8,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct InterestPaid {
    #[key]
    pub game_id: u64,
    #[key]
    pub player: ContractAddress,
    pub amount: u256,
    pub balance_before: u256,
    pub balance_after: u256,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct PropertyTaxAssessed {
    #[key]
    pub game_id: u64,
    #[key]
    pub player: ContractAddress,
    pub total_property_value: u256,
    pub tax_amount: u256,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct SalaryPaid {
    #[key]
    pub game_id: u64,
    #[key]
    pub player: ContractAddress,
    pub base_salary: u256,
    pub bonus: u256,
    pub total_amount: u256,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct EconomicRebalance {
    #[key]
    pub game_id: u64,
    pub total_money_supply: u256,
    pub total_property_value: u256,
    pub liquidity_ratio: u16,
    pub timestamp: u64,
}

// ===== MODELS =====

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct EconomicState {
    #[key]
    pub game_id: u64,
    pub total_money_supply: u256,
    pub total_property_value: u256,
    pub inflation_rate: u16,        // Basis points (100 = 1%)
    pub interest_rate: u16,         // Basis points
    pub tax_rate: u16,              // Basis points
    pub last_economic_update: u64,
    pub market_volatility_index: u16,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct PlayerEconomicData {
    #[key]
    pub game_id: u64,
    #[key]
    pub player: ContractAddress,
    pub net_worth: u256,
    pub cash_flow: i256,            // Can be negative
    pub debt_ratio: u16,            // Basis points
    pub property_portfolio_value: u256,
    pub last_interest_payment: u64,
    pub total_taxes_paid: u256,
    pub total_interest_earned: u256,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct BankingOperation {
    #[key]
    pub operation_id: u64,
    pub game_id: u64,
    pub player: ContractAddress,
    pub operation_type: BankingOpType,
    pub amount: u256,
    pub interest_rate: u16,
    pub duration: u64,
    pub is_active: bool,
    pub created_at: u64,
    pub expires_at: u64,
}

// ===== STRUCTS =====

#[derive(Copy, Drop, Serde, Debug)]
pub struct EconomicIndicators {
    pub money_velocity: u16,
    pub property_price_index: u16,
    pub wealth_distribution_gini: u16,
    pub liquidity_ratio: u16,
    pub market_activity_score: u16,
}

// ===== ENUMS =====

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect)]
pub enum BankingOpType {
    Loan,
    Mortgage,
    Investment,
    Insurance,
}

// ===== CONSTANTS =====

const BASE_INFLATION_RATE: u16 = 200; // 2% per game hour
const BASE_INTEREST_RATE: u16 = 500; // 5% per transaction
const BASE_TAX_RATE: u16 = 100; // 1% property tax
const GO_SALARY_BASE: u256 = 200000; // $200k base salary
const UBI_THRESHOLD: u256 = 50000; // UBI kicks in when below $50k
const UBI_AMOUNT: u256 = 25000; // $25k UBI payment

const BANKRUPTCY_THRESHOLD_RATIO: u16 = 500; // 5% of average player wealth
const WEALTH_REDISTRIBUTION_THRESHOLD: u16 = 8000; // Gini coefficient of 0.8

// Market volatility impact multipliers (basis points)
const BOOM_MULTIPLIER: u16 = 1200; // 20% increase
const CRASH_MULTIPLIER: u16 = 800;  // 20% decrease
const DISASTER_MULTIPLIER: u16 = 700; // 30% decrease
const POLICY_MULTIPLIER_RANGE: (u16, u16) = (900, 1100); // ±10%

// ===== IMPLEMENTATION =====

#[dojo::contract]
pub mod economics {
    use super::{
        IEconomics, InflationAdjustment, MarketVolatilityApplied, InterestPaid, PropertyTaxAssessed,
        SalaryPaid, EconomicRebalance,
        GameCurrency, TreasuryBalance, BalanceType, MarketEvent, MarketEventType,
        PlayerGameState, Property, PropertyGroup, GameState,
        EconomicState, PlayerEconomicData, BankingOperation, EconomicIndicators, BankingOpType,
        BASE_INFLATION_RATE, BASE_INTEREST_RATE, BASE_TAX_RATE, GO_SALARY_BASE,
        UBI_THRESHOLD, UBI_AMOUNT, BANKRUPTCY_THRESHOLD_RATIO, WEALTH_REDISTRIBUTION_THRESHOLD,
        BOOM_MULTIPLIER, CRASH_MULTIPLIER, DISASTER_MULTIPLIER, POLICY_MULTIPLIER_RANGE
    };
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use dojo::model::{ModelStorage, ModelValueStorage};
    use dojo::world::{WorldStorage, WorldStorageTrait};
    use dojo::event::{EventStorage};

    #[abi(embed_v0)]
    impl EconomicsImpl of IEconomics<ContractState> {
        fn calculate_inflation_adjustment(self: @ContractState, base_amount: u256, game_duration: u64) -> u256 {
            // Calculate inflation based on game duration (simplified model)
            let hours_elapsed = game_duration / 3600; // Convert seconds to hours
            let total_inflation_bp = BASE_INFLATION_RATE * hours_elapsed.try_into().unwrap();
            
            // Apply inflation: new_amount = base_amount * (1 + inflation_rate)
            let inflation_multiplier = 10000 + total_inflation_bp; // Add to 100% base
            (base_amount * inflation_multiplier.into()) / 10000
        }

        fn apply_market_volatility(ref self: ContractState, game_id: u64, event_type: MarketEventType, magnitude: u8) -> bool {
            let mut world = self.world_default();
            let current_time = get_block_timestamp();

            // Determine volatility multiplier based on event type
            let base_multiplier = match event_type {
                MarketEventType::Boom => BOOM_MULTIPLIER,
                MarketEventType::Crash => CRASH_MULTIPLIER,
                MarketEventType::Disaster => DISASTER_MULTIPLIER,
                MarketEventType::Policy => {
                    // Random between range
                    let range_size = POLICY_MULTIPLIER_RANGE.1 - POLICY_MULTIPLIER_RANGE.0;
                    let random_offset = magnitude.into() % range_size.into();
                    POLICY_MULTIPLIER_RANGE.0 + random_offset.try_into().unwrap()
                },
                MarketEventType::CryptoNews => {
                    // Crypto news can be positive or negative
                    if magnitude > 50 { BOOM_MULTIPLIER } else { CRASH_MULTIPLIER }
                },
            };

            // Magnitude affects the intensity (50-150% of base effect)
            let magnitude_factor = 50 + magnitude.into(); // 50-150%
            let final_multiplier = (base_multiplier.into() * magnitude_factor) / 100;

            // Apply to all properties (simplified - in reality would be more targeted)
            let mut affected_properties = ArrayTrait::new();
            let mut property_id: u8 = 1;
            
            while property_id <= 39 {
                let mut property: Property = world.read_model((game_id, property_id));
                
                // Only affect owned properties
                if property.owner.is_some() {
                    let old_value = property.current_value;
                    property.current_value = (property.current_value * final_multiplier.into()) / 10000;
                    
                    // Ensure property value doesn't go below 10% of base value
                    let minimum_value = property.base_value / 10;
                    if property.current_value < minimum_value {
                        property.current_value = minimum_value;
                    }
                    
                    world.write_model(@property);
                    affected_properties.append(property_id);
                }
                
                property_id += 1;
            };

            // Update economic state
            let mut economic_state: EconomicState = world.read_model(game_id);
            economic_state.market_volatility_index = magnitude.into();
            economic_state.last_economic_update = current_time;
            world.write_model(@economic_state);

            // Emit event
            world.emit_event(@MarketVolatilityApplied {
                game_id,
                event_type,
                affected_properties: affected_properties.span(),
                magnitude,
                timestamp: current_time,
            });

            true
        }

        fn calculate_bankruptcy_threshold(self: @ContractState, game_id: u64, player: ContractAddress) -> u256 {
            let world = self.world_default();
            
            // Calculate average player wealth in the game
            let game_state: GameState = world.read_model(game_id);
            let mut total_wealth: u256 = 0;
            let mut player_count = 0;
            
            let mut i = 0;
            while i < game_state.players.len() {
                let other_player = *game_state.players.at(i);
                let wealth = self.calculate_total_wealth(game_id, other_player);
                total_wealth += wealth;
                player_count += 1;
                i += 1;
            };
            
            if player_count == 0 {
                return UBI_THRESHOLD; // Fallback threshold
            }
            
            let average_wealth = total_wealth / player_count.into();
            
            // Bankruptcy threshold is percentage of average wealth
            (average_wealth * BANKRUPTCY_THRESHOLD_RATIO.into()) / 10000
        }

        fn process_bank_interest(ref self: ContractState, game_id: u64, player: ContractAddress) -> u256 {
            let mut world = self.world_default();
            let current_time = get_block_timestamp();

            // Get player's economic data
            let mut player_econ: PlayerEconomicData = world.read_model((game_id, player));
            let mut player_currency: GameCurrency = world.read_model((game_id, player));

            // Calculate interest based on current balance and time since last payment
            let time_diff = current_time - player_econ.last_interest_payment;
            let hours_elapsed = time_diff / 3600;
            
            if hours_elapsed == 0 {
                return 0; // No interest for less than an hour
            }

            // Simple interest calculation: balance * rate * time
            let interest_amount = (player_currency.balance * BASE_INTEREST_RATE.into() * hours_elapsed.into()) / (10000 * 24); // Daily rate
            
            // Only pay interest if positive balance
            if player_currency.balance > 0 && interest_amount > 0 {
                let balance_before = player_currency.balance;
                player_currency.balance += interest_amount;
                player_currency.total_earned += interest_amount;
                
                player_econ.last_interest_payment = current_time;
                player_econ.total_interest_earned += interest_amount;
                
                // Write updates
                world.write_model(@player_currency);
                world.write_model(@player_econ);

                // Emit event
                world.emit_event(@InterestPaid {
                    game_id,
                    player,
                    amount: interest_amount,
                    balance_before,
                    balance_after: player_currency.balance,
                    timestamp: current_time,
                });

                return interest_amount;
            }

            0
        }

        fn calculate_property_tax(self: @ContractState, game_id: u64, player: ContractAddress) -> u256 {
            let world = self.world_default();
            let mut total_property_value: u256 = 0;

            // Calculate total value of all properties owned by player
            let mut property_id: u8 = 1;
            while property_id <= 39 {
                let property: Property = world.read_model((game_id, property_id));
                if property.owner == Option::Some(player) && !property.is_mortgaged {
                    total_property_value += property.current_value;
                }
                property_id += 1;
            };

            // Apply tax rate
            (total_property_value * BASE_TAX_RATE.into()) / 10000
        }

        fn process_salary_payment(ref self: ContractState, game_id: u64, player: ContractAddress) -> u256 {
            let mut world = self.world_default();
            let current_time = get_block_timestamp();

            // Get game start time for inflation calculation
            let game_state: GameState = world.read_model(game_id);
            let game_duration = current_time - game_state.start_time;

            // Calculate inflation-adjusted salary
            let base_salary = self.calculate_inflation_adjustment(GO_SALARY_BASE, game_duration);

            // Calculate bonus based on player's economic performance
            let player_econ: PlayerEconomicData = world.read_model((game_id, player));
            let bonus = if player_econ.cash_flow >= 0 {
                base_salary / 10 // 10% bonus for positive cash flow
            } else {
                0
            };

            let total_salary = base_salary + bonus;

            // Pay salary
            let mut player_currency: GameCurrency = world.read_model((game_id, player));
            player_currency.balance += total_salary;
            player_currency.total_earned += total_salary;
            world.write_model(@player_currency);

            // Emit event
            world.emit_event(@SalaryPaid {
                game_id,
                player,
                base_salary,
                bonus,
                total_amount: total_salary,
                timestamp: current_time,
            });

            total_salary
        }

        fn calculate_total_wealth(self: @ContractState, game_id: u64, player: ContractAddress) -> u256 {
            let world = self.world_default();
            
            // Start with cash
            let currency: GameCurrency = world.read_model((game_id, player));
            let mut total_wealth = currency.balance;

            // Add property values
            let mut property_id: u8 = 1;
            while property_id <= 39 {
                let property: Property = world.read_model((game_id, property_id));
                if property.owner == Option::Some(player) {
                    if property.is_mortgaged {
                        // Mortgaged properties: current value minus mortgage debt
                        let mortgage_debt = property.current_value / 2;
                        if property.current_value > mortgage_debt {
                            total_wealth += property.current_value - mortgage_debt;
                        }
                    } else {
                        total_wealth += property.current_value;
                    }
                }
                property_id += 1;
            };

            total_wealth
        }

        fn get_economic_indicators(self: @ContractState, game_id: u64) -> EconomicIndicators {
            let world = self.world_default();
            let economic_state: EconomicState = world.read_model(game_id);
            let game_state: GameState = world.read_model(game_id);

            // Calculate money velocity (simplified)
            let money_velocity = if economic_state.total_money_supply > 0 {
                ((economic_state.total_property_value * 100) / economic_state.total_money_supply).try_into().unwrap_or(100)
            } else {
                100
            };

            // Property price index (relative to base values)
            let property_price_index = economic_state.market_volatility_index;

            // Wealth distribution (simplified Gini coefficient)
            let wealth_gini = self._calculate_wealth_distribution(game_id, game_state.players);

            // Liquidity ratio
            let liquidity_ratio = if economic_state.total_property_value > 0 {
                ((economic_state.total_money_supply * 100) / economic_state.total_property_value).try_into().unwrap_or(100)
            } else {
                100
            };

            // Market activity score (based on recent transactions)
            let market_activity_score = economic_state.market_volatility_index;

            EconomicIndicators {
                money_velocity,
                property_price_index,
                wealth_distribution_gini: wealth_gini,
                liquidity_ratio,
                market_activity_score,
            }
        }

        fn check_economic_balance(self: @ContractState, game_id: u64) -> bool {
            let indicators = self.get_economic_indicators(game_id);
            
            // Check if economy is within acceptable parameters
            let is_balanced = indicators.wealth_distribution_gini < WEALTH_REDISTRIBUTION_THRESHOLD
                && indicators.liquidity_ratio > 20 // At least 20% liquidity
                && indicators.liquidity_ratio < 500; // Not more than 500% liquidity

            is_balanced
        }

        fn apply_universal_basic_income(ref self: ContractState, game_id: u64) -> bool {
            let mut world = self.world_default();
            let current_time = get_block_timestamp();

            let game_state: GameState = world.read_model(game_id);
            let mut payments_made = 0;

            // Check each player's wealth and pay UBI if below threshold
            let mut i = 0;
            while i < game_state.players.len() {
                let player = *game_state.players.at(i);
                let wealth = self.calculate_total_wealth(game_id, player);
                
                if wealth < UBI_THRESHOLD {
                    let mut player_currency: GameCurrency = world.read_model((game_id, player));
                    player_currency.balance += UBI_AMOUNT;
                    player_currency.total_earned += UBI_AMOUNT;
                    world.write_model(@player_currency);
                    payments_made += 1;
                }
                
                i += 1;
            };

            payments_made > 0
        }
    }

    // ===== INTERNAL FUNCTIONS =====

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> WorldStorage {
            self.world(@"whale_opoly")
        }

        fn _calculate_wealth_distribution(self: @ContractState, game_id: u64, players: Span<ContractAddress>) -> u16 {
            // Simplified Gini coefficient calculation
            if players.len() <= 1 {
                return 0; // Perfect equality with 0-1 players
            }

            let mut total_wealth: u256 = 0;
            let mut wealth_values = ArrayTrait::new();

            // Collect all wealth values
            let mut i = 0;
            while i < players.len() {
                let player = *players.at(i);
                let wealth = self.calculate_total_wealth(game_id, player);
                wealth_values.append(wealth);
                total_wealth += wealth;
                i += 1;
            };

            if total_wealth == 0 {
                return 0; // Perfect equality when everyone has 0
            }

            // Simplified Gini calculation (returns value in basis points)
            // This is a rough approximation - full implementation would sort and use proper Gini formula
            let average_wealth = total_wealth / players.len().into();
            let mut deviation_sum: u256 = 0;

            let mut i = 0;
            while i < wealth_values.len() {
                let wealth = *wealth_values.at(i);
                let deviation = if wealth > average_wealth {
                    wealth - average_wealth
                } else {
                    average_wealth - wealth
                };
                deviation_sum += deviation;
                i += 1;
            };

            // Convert to basis points (0-10000, where 10000 = 1.0 Gini coefficient)
            if average_wealth > 0 {
                ((deviation_sum * 10000) / (total_wealth * 2)).try_into().unwrap_or(10000)
            } else {
                0
            }
        }
    }
}
