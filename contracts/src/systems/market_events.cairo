use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
use dojo::model::{ModelStorage, ModelValueStorage};
use dojo::world::{WorldStorage, WorldStorageTrait};
use dojo::event::{EventStorage};

use whale_opoly::models::{
    MarketEvent, MarketEventType, Property, PropertyGroup, GameState,
    PlayerGameState, GameCurrency
};

// ===== INTERFACES =====

#[starknet::interface]
pub trait IMarketEvents<T> {
    fn trigger_market_event(ref self: T, game_id: u64, event_type: MarketEventType, magnitude: u8, target_group: Option<PropertyGroup>) -> u64;
    fn process_scheduled_events(ref self: T, game_id: u64) -> bool;
    fn resolve_market_event(ref self: T, game_id: u64, event_id: u64) -> bool;
    fn get_active_events(self: @T, game_id: u64) -> Span<u64>;
    fn calculate_event_impact(self: @T, event_id: u64, property_id: u8) -> u256;
    fn predict_next_event(self: @T, game_id: u64) -> (MarketEventType, u8); // type and probability
    fn apply_compound_events(ref self: T, game_id: u64) -> bool;
    fn create_emergency_intervention(ref self: T, game_id: u64, intervention_type: InterventionType) -> bool;
}

// ===== EVENTS =====

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct MarketEventTriggered {
    #[key]
    pub game_id: u64,
    #[key]
    pub event_id: u64,
    pub event_type: MarketEventType,
    pub magnitude: u8,
    pub target_group: Option<PropertyGroup>,
    pub duration: u64,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct MarketEventResolved {
    #[key]
    pub game_id: u64,
    #[key]
    pub event_id: u64,
    pub total_impact: u256,
    pub affected_players: Span<ContractAddress>,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct PropertyValuesUpdated {
    #[key]
    pub game_id: u64,
    pub event_id: u64,
    pub property_ids: Span<u8>,
    pub old_values: Span<u256>,
    pub new_values: Span<u256>,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct EmergencyIntervention {
    #[key]
    pub game_id: u64,
    pub intervention_type: InterventionType,
    pub triggered_by_event: Option<u64>,
    pub impact_multiplier: u16,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct CompoundEventActivated {
    #[key]
    pub game_id: u64,
    pub primary_event: u64,
    pub secondary_event: u64,
    pub compound_multiplier: u16,
    pub timestamp: u64,
}

// ===== MODELS =====

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct MarketEventSchedule {
    #[key]
    pub game_id: u64,
    pub next_event_time: u64,
    pub event_frequency: u64,      // Average seconds between events
    pub last_event_time: u64,
    pub total_events_triggered: u32,
    pub market_stability_index: u16, // 0-10000 (higher = more stable)
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct EventImpactHistory {
    #[key]
    pub game_id: u64,
    #[key]
    pub property_id: u8,
    pub cumulative_impact: i32,    // Can be negative
    pub recent_events: Span<u64>,  // Last 5 event IDs that affected this property
    pub base_value_drift: i16,     // Permanent change from base value (basis points)
    pub volatility_score: u16,     // How volatile this property has been
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct PlayerEventExposure {
    #[key]
    pub game_id: u64,
    #[key]
    pub player: ContractAddress,
    pub total_gains: u256,
    pub total_losses: u256,
    pub events_experienced: u32,
    pub risk_tolerance: u16,       // Calculated based on portfolio
    pub hedge_ratio: u16,          // How well protected against events
}

// ===== STRUCTS =====

#[derive(Copy, Drop, Serde, Debug)]
pub struct PropertyUpdate {
    pub property_id: u8,
    pub old_value: u256,
    pub new_value: u256,
    pub change_percent: i16,
}

#[derive(Copy, Drop, Serde, Debug)]
pub struct EventChain {
    pub primary_event: u64,
    pub secondary_events: Span<u64>,
    pub compound_multiplier: u16,
    pub chain_duration: u64,
}

// ===== ENUMS =====

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect)]
pub enum InterventionType {
    MarketStabilization,    // Reduce volatility
    LiquidityInjection,     // Add money to market
    PriceSupport,          // Prevent property values from falling too low
    AntiMonopoly,          // Break up large property holdings
    EmergencyBailout,      // Help bankrupt players
}

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect)]
pub enum EventTrigger {
    Scheduled,             // Regular scheduled event
    PlayerAction,          // Triggered by player behavior
    Economic,              // Triggered by economic conditions
    Random,                // Pure randomness
    Cascade,               // Triggered by another event
}

// ===== CONSTANTS =====

const BASE_EVENT_FREQUENCY: u64 = 1800; // 30 minutes between events
const MIN_EVENT_FREQUENCY: u64 = 600;   // 10 minutes minimum
const MAX_EVENT_FREQUENCY: u64 = 3600;  // 1 hour maximum

const BOOM_DURATION_RANGE: (u64, u64) = (1800, 3600);   // 30 min - 1 hour
const CRASH_DURATION_RANGE: (u64, u64) = (900, 2700);   // 15 min - 45 min
const DISASTER_DURATION_RANGE: (u64, u64) = (600, 1800); // 10 min - 30 min
const POLICY_DURATION_RANGE: (u64, u64) = (3600, 7200);  // 1-2 hours
const CRYPTO_DURATION_RANGE: (u64, u64) = (300, 1800);   // 5-30 min

// Impact multipliers (basis points)
const BOOM_IMPACT: (u16, u16) = (1100, 1500);      // 10-50% increase
const CRASH_IMPACT: (u16, u16) = (500, 900);       // 10-50% decrease
const DISASTER_IMPACT: (u16, u16) = (300, 700);    // 30-70% decrease
const POLICY_IMPACT: (u16, u16) = (900, 1100);     // ±10% change
const CRYPTO_IMPACT: (u16, u16) = (700, 1300);     // ±30% change

const COMPOUND_EVENT_THRESHOLD: u16 = 7500; // 75% probability needed
const INTERVENTION_THRESHOLD: u16 = 2000;   // Trigger intervention at 20% market stress

// ===== IMPLEMENTATION =====

#[dojo::contract]
pub mod market_events {
    use super::{
        IMarketEvents, MarketEventTriggered, MarketEventResolved, PropertyValuesUpdated,
        EmergencyIntervention, CompoundEventActivated,
        MarketEvent, MarketEventType, Property, PropertyGroup, GameState,
        PlayerGameState, GameCurrency,
        MarketEventSchedule, EventImpactHistory, PlayerEventExposure,
        PropertyUpdate, EventChain, InterventionType, EventTrigger,
        BASE_EVENT_FREQUENCY, MIN_EVENT_FREQUENCY, MAX_EVENT_FREQUENCY,
        BOOM_DURATION_RANGE, CRASH_DURATION_RANGE, DISASTER_DURATION_RANGE,
        POLICY_DURATION_RANGE, CRYPTO_DURATION_RANGE,
        BOOM_IMPACT, CRASH_IMPACT, DISASTER_IMPACT, POLICY_IMPACT, CRYPTO_IMPACT,
        COMPOUND_EVENT_THRESHOLD, INTERVENTION_THRESHOLD
    };
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use dojo::model::{ModelStorage, ModelValueStorage};
    use dojo::world::{WorldStorage, WorldStorageTrait};
    use dojo::event::{EventStorage};

    #[abi(embed_v0)]
    impl MarketEventsImpl of IMarketEvents<ContractState> {
        fn trigger_market_event(ref self: ContractState, game_id: u64, event_type: MarketEventType, magnitude: u8, target_group: Option<PropertyGroup>) -> u64 {
            let mut world = self.world_default();
            let current_time = get_block_timestamp();
            // Generate a deterministic unique id using schedule counter and timestamp (avoid unsupported bitshifts)
            let mut schedule: MarketEventSchedule = world.read_model(game_id);
            let counter_u64: u64 = schedule.total_events_triggered.into();
            let event_id: u64 = current_time * 1000_u64 + (counter_u64 + 1_u64);

            // Calculate event duration based on type
            let duration = self._calculate_event_duration(event_type, magnitude);

            // Determine affected properties
            let affected_properties = match target_group {
                Option::Some(group) => self._get_properties_in_group(group),
                Option::None => self._select_random_properties(magnitude),
            };

            // Create market event
            let market_event = MarketEvent {
                event_id,
                game_id,
                event_type,
                affected_properties,
                multiplier: self._calculate_impact_multiplier(event_type, magnitude),
                duration,
                remaining_duration: duration,
                created_at: current_time,
            };

            world.write_model(@market_event);

            // Apply immediate impact to properties
            self._apply_event_to_properties(game_id, event_id, affected_properties, market_event.multiplier);

            // Update market schedule
            schedule.last_event_time = current_time;
            schedule.total_events_triggered += 1;
            schedule.next_event_time = current_time + self._calculate_next_event_time(schedule.market_stability_index);
            world.write_model(@schedule);

            // Emit event
            world.emit_event(@MarketEventTriggered {
                game_id,
                event_id,
                event_type,
                magnitude,
                target_group,
                duration,
                timestamp: current_time,
            });

            // Check for compound events
            if self._should_trigger_compound_event(game_id) {
                self._trigger_compound_event(game_id, event_id);
            }

            event_id
        }

        fn process_scheduled_events(ref self: ContractState, game_id: u64) -> bool {
            let mut world = self.world_default();
            let current_time = get_block_timestamp();

            let schedule: MarketEventSchedule = world.read_model(game_id);

            // Check if it's time for a scheduled event
            if current_time >= schedule.next_event_time {
                // Generate random event parameters
                let event_type = self._generate_random_event_type(schedule.market_stability_index);
                let magnitude = self._generate_event_magnitude();
                let target_group = self._select_target_group(event_type);

                self.trigger_market_event(game_id, event_type, magnitude, target_group);
                return true;
            }

            // Process ongoing events (reduce remaining duration)
            self._update_ongoing_events(game_id);

            false
        }

        fn resolve_market_event(ref self: ContractState, game_id: u64, event_id: u64) -> bool {
            let mut world = self.world_default();
            let current_time = get_block_timestamp();

            let mut market_event: MarketEvent = world.read_model(event_id);
            assert!(market_event.game_id == game_id, "Event not in this game");
            assert!(market_event.remaining_duration == 0, "Event still active");

            // Calculate total impact and affected players
            let (total_impact, affected_players) = self._calculate_resolution_impact(game_id, event_id);

            // Revert some of the temporary effects (market correction)
            if market_event.event_type == MarketEventType::Boom || market_event.event_type == MarketEventType::Crash {
                self._apply_market_correction(game_id, market_event.affected_properties, market_event.multiplier);
            }

            // Update player exposures
            self._update_player_exposures(game_id, affected_players, market_event.event_type, total_impact);

            // Emit resolution event
            world.emit_event(@MarketEventResolved {
                game_id,
                event_id,
                total_impact,
                affected_players,
                timestamp: current_time,
            });

            true
        }

        fn get_active_events(self: @ContractState, game_id: u64) -> Span<u64> {
            let mut active_events = ArrayTrait::new();

            // In a full implementation, this would query all active events
            // For now, return empty array as placeholder
            active_events.span()
        }

        fn calculate_event_impact(self: @ContractState, event_id: u64, property_id: u8) -> u256 {
            let world = self.world_default();
            let market_event: MarketEvent = world.read_model(event_id);
            
            // Check if property is affected by this event
            let mut is_affected = false;
            let mut i = 0;
            while i < market_event.affected_properties.len() {
                if *market_event.affected_properties.at(i) == property_id {
                    is_affected = true;
                    break;
                }
                i += 1;
            };

            if !is_affected {
                return 0;
            }

            // Get current property to calculate impact
            let property: Property = world.read_model((market_event.game_id, property_id));
            let impact = (property.current_value * market_event.multiplier) / 10000_u256;
            
            if market_event.multiplier > 10000_u256 {
                impact - property.current_value // Positive impact
            } else {
                property.current_value - impact // Negative impact (loss)
            }
        }

        fn predict_next_event(self: @ContractState, game_id: u64) -> (MarketEventType, u8) {
            let world = self.world_default();
            let schedule: MarketEventSchedule = world.read_model(game_id);
            
            // Simple prediction based on market stability
            let event_type = if schedule.market_stability_index < 3000 {
                MarketEventType::Crash // Low stability = more crashes
            } else if schedule.market_stability_index > 7000 {
                MarketEventType::Boom // High stability = more booms
            } else {
                MarketEventType::Policy // Medium stability = policy events
            };

            // Probability calculation (0-100)
            let probability = if schedule.market_stability_index < 5000 {
                80 // High probability of events in unstable markets
            } else {
                40 // Lower probability in stable markets
            };

            (event_type, probability)
        }

        fn apply_compound_events(ref self: ContractState, game_id: u64) -> bool {
            let world = self.world_default();
            
            // Check market conditions for compound events
            let schedule: MarketEventSchedule = world.read_model(game_id);
            
            if schedule.market_stability_index < INTERVENTION_THRESHOLD {
                // Market is very unstable, trigger multiple events
                let event_type = MarketEventType::Crash;
                let magnitude = 80; // High magnitude
                
                // Trigger in different sectors
                self.trigger_market_event(game_id, event_type, magnitude, Option::Some(PropertyGroup::DarkBlue));
                self.trigger_market_event(game_id, event_type, magnitude, Option::Some(PropertyGroup::Green));
                
                return true;
            }

            false
        }

        fn create_emergency_intervention(ref self: ContractState, game_id: u64, intervention_type: InterventionType) -> bool {
            let mut world = self.world_default();
            let current_time = get_block_timestamp();

            // Apply intervention based on type
            match intervention_type {
                InterventionType::MarketStabilization => {
                    self._stabilize_market(game_id);
                },
                InterventionType::LiquidityInjection => {
                    self._inject_liquidity(game_id);
                },
                InterventionType::PriceSupport => {
                    self._support_property_prices(game_id);
                },
                InterventionType::AntiMonopoly => {
                    self._break_monopolies(game_id);
                },
                InterventionType::EmergencyBailout => {
                    self._emergency_bailout(game_id);
                },
            }

            // Emit intervention event
            world.emit_event(@EmergencyIntervention {
                game_id,
                intervention_type,
                triggered_by_event: Option::None,
                impact_multiplier: 10000, // 100% (neutral)
                timestamp: current_time,
            });

            true
        }
    }

    // ===== INTERNAL FUNCTIONS =====

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> WorldStorage {
            self.world(@"whale_opoly")
        }

        fn _calculate_event_duration(self: @ContractState, event_type: MarketEventType, magnitude: u8) -> u64 {
            // Use destructuring instead of tuple indexing and ensure typed literals
            let (min_d, max_d) = match event_type {
                MarketEventType::Boom => BOOM_DURATION_RANGE,
                MarketEventType::Crash => CRASH_DURATION_RANGE,
                MarketEventType::Disaster => DISASTER_DURATION_RANGE,
                MarketEventType::Policy => POLICY_DURATION_RANGE,
                MarketEventType::CryptoNews => CRYPTO_DURATION_RANGE,
            };
            let base_duration: u64 = (min_d + max_d) / 2_u64;

            // Adjust duration based on magnitude
            (base_duration * magnitude.into()) / 100_u64
        }

        fn _calculate_impact_multiplier(self: @ContractState, event_type: MarketEventType, magnitude: u8) -> u256 {
            let (min_impact, max_impact) = match event_type {
                MarketEventType::Boom => BOOM_IMPACT,
                MarketEventType::Crash => CRASH_IMPACT,
                MarketEventType::Disaster => DISASTER_IMPACT,
                MarketEventType::Policy => POLICY_IMPACT,
                MarketEventType::CryptoNews => CRYPTO_IMPACT,
            };

            // Interpolate between min and max based on magnitude using u256 arithmetic
            let impact_range: u16 = max_impact - min_impact;
            let impact_adjustment: u256 = (impact_range.into() * magnitude.into()) / 100_u256;
            min_impact.into() + impact_adjustment
        }

        fn _get_properties_in_group(self: @ContractState, group: PropertyGroup) -> Span<u8> {
            match group {
                PropertyGroup::Brown => array![1_u8, 3_u8].span(),
                PropertyGroup::LightBlue => array![6_u8, 8_u8, 9_u8].span(),
                PropertyGroup::Pink => array![11_u8, 13_u8, 14_u8].span(),
                PropertyGroup::Orange => array![16_u8, 18_u8, 19_u8].span(),
                PropertyGroup::Red => array![21_u8, 23_u8, 24_u8].span(),
                PropertyGroup::Yellow => array![26_u8, 27_u8, 29_u8].span(),
                PropertyGroup::Green => array![31_u8, 32_u8, 34_u8].span(),
                PropertyGroup::DarkBlue => array![37_u8, 39_u8].span(),
                PropertyGroup::Railroad => array![5_u8, 15_u8, 25_u8, 35_u8].span(),
                PropertyGroup::Utility => array![12_u8, 28_u8].span(),
                PropertyGroup::Special => array![].span(),
            }
        }

        fn _select_random_properties(self: @ContractState, magnitude: u8) -> Span<u8> {
            // Simple random selection based on magnitude
            let mut property_count: u8 = magnitude / 10_u8; // 0-25 -> 0-2 etc.
            if property_count < 1_u8 { property_count = 1_u8; }
            if property_count > 8_u8 { property_count = 8_u8; }
            
            // For simplicity, select first N properties with a step for variety
            let mut properties = ArrayTrait::new();
            let mut i: u8 = 1_u8;
            while i <= property_count && i <= 39_u8 {
                properties.append(i);
                i += 5_u8; // Skip some properties for variety
            };
            
            properties.span()
        }

        fn _apply_event_to_properties(ref self: ContractState, game_id: u64, event_id: u64, properties: Span<u8>, multiplier: u256) {
            let mut world = self.world_default();
            let mut property_ids = ArrayTrait::new();
            let mut old_values = ArrayTrait::new();
            let mut new_values = ArrayTrait::new();

            let mut i = 0;
            while i < properties.len() {
                let property_id = *properties.at(i);
                let mut property: Property = world.read_model((game_id, property_id));
                
                let old_value: u256 = property.current_value;
                property.current_value = (property.current_value * multiplier) / 10000_u256;
                
                // Ensure property doesn't go below 10% of base value
                let min_value: u256 = property.base_value / 10_u256;
                if property.current_value < min_value {
                    property.current_value = min_value;
                }

                world.write_model(@property);

                // Collect update data
                property_ids.append(property_id);
                old_values.append(old_value);
                new_values.append(property.current_value);

                i += 1;
            };

            // Emit property updates event
            world.emit_event(@PropertyValuesUpdated {
                game_id,
                event_id,
                property_ids: property_ids.span(),
                old_values: old_values.span(),
                new_values: new_values.span(),
                timestamp: get_block_timestamp(),
            });
        }

        fn _calculate_next_event_time(self: @ContractState, stability_index: u16) -> u64 {
            // More stable markets have longer intervals between events
            let frequency_multiplier: u16 = stability_index / 100_u16; // 0-100 multiplier
            let mut adjusted_frequency: u64 = BASE_EVENT_FREQUENCY + (frequency_multiplier.into() * 10_u64);
            
            if adjusted_frequency < MIN_EVENT_FREQUENCY { adjusted_frequency = MIN_EVENT_FREQUENCY; }
            if adjusted_frequency > MAX_EVENT_FREQUENCY { adjusted_frequency = MAX_EVENT_FREQUENCY; }
            adjusted_frequency
        }

        fn _should_trigger_compound_event(self: @ContractState, game_id: u64) -> bool {
            let world = self.world_default();
            let schedule: MarketEventSchedule = world.read_model(game_id);
            
            // Lower stability increases compound event probability
            let probability: u16 = 10000_u16 - schedule.market_stability_index; // Inverse relationship
            probability > COMPOUND_EVENT_THRESHOLD
        }

        fn _trigger_compound_event(ref self: ContractState, game_id: u64, primary_event_id: u64) {
            // Trigger a secondary event that compounds the primary
            let secondary_event_type = MarketEventType::Crash; // Simplified
            let magnitude: u8 = 60_u8; // Medium impact
            
            let secondary_event_id = self.trigger_market_event(game_id, secondary_event_type, magnitude, Option::None);

            // Emit compound event activation for traceability
            let mut world = self.world_default();
            world.emit_event(@CompoundEventActivated {
                game_id,
                primary_event: primary_event_id,
                secondary_event: secondary_event_id,
                compound_multiplier: 10500_u16, // +5% compounding effect notation
                timestamp: get_block_timestamp(),
            });
        }

        // Applies a partial correction after a boom/crash resolves to move prices toward base values
        fn _apply_market_correction(ref self: ContractState, game_id: u64, properties: Span<u8>, event_multiplier: u256) {
            let mut world = self.world_default();

            let mut i = 0;
            while i < properties.len() {
                let pid: u8 = *properties.at(i);
                let mut property: Property = world.read_model((game_id, pid));

                let current: u256 = property.current_value;
                let base: u256 = property.base_value;

                // Move halfway toward base value depending on boom/crash direction
                let new_value: u256 = if event_multiplier > 10000_u256 {
                    // Boom: correct downward but not below base
                    if current > base {
                        let delta: u256 = current - base;
                        let half: u256 = delta / 2_u256;
                        let corrected: u256 = current - half;
                        if corrected < base { base } else { corrected }
                    } else { current }
                } else {
                    // Crash or negative: correct upward but not above base
                    if current < base {
                        let delta: u256 = base - current;
                        let half: u256 = delta / 2_u256;
                        let corrected: u256 = current + half;
                        if corrected > base { base } else { corrected }
                    } else { current }
                };

                if new_value != current {
                    property.current_value = new_value;
                    world.write_model(@property);
                }

                i += 1;
            };
        }

        // Increase market stability and lengthen the next event timing
        fn _stabilize_market(ref self: ContractState, game_id: u64) {
            let mut world = self.world_default();
            let now = get_block_timestamp();
            let mut schedule: MarketEventSchedule = world.read_model(game_id);

            // Raise stability by 10% of the scale, capped at 10000
            let inc: u16 = 1000_u16;
            let target: u16 = schedule.market_stability_index + inc;
            schedule.market_stability_index = if target > 10000_u16 { 10000_u16 } else { target };

            // Recompute frequency based on new stability and push next event further out
            let new_freq: u64 = self._calculate_next_event_time(schedule.market_stability_index);
            schedule.event_frequency = new_freq;
            schedule.next_event_time = now + new_freq;

            world.write_model(@schedule);
        }

        fn _generate_random_event_type(self: @ContractState, stability_index: u16) -> MarketEventType {
            // Simple random based on stability
            if stability_index < 3000 {
                MarketEventType::Crash
            } else if stability_index > 7000 {
                MarketEventType::Boom
            } else {
                MarketEventType::Policy
            }
        }

        fn _generate_event_magnitude(self: @ContractState) -> u8 {
            // Random magnitude between 30-90
            let base = get_block_timestamp() % 61; // 0-60
            (base + 30).try_into().unwrap() // 30-90
        }

        fn _select_target_group(self: @ContractState, event_type: MarketEventType) -> Option<PropertyGroup> {
            match event_type {
                MarketEventType::Disaster => Option::Some(PropertyGroup::LightBlue), // Affected area
                MarketEventType::CryptoNews => Option::Some(PropertyGroup::DarkBlue), // Luxury properties
                _ => Option::None, // Affects all properties
            }
        }

        fn _update_ongoing_events(ref self: ContractState, game_id: u64) {
            // Reduce remaining duration on the most recent event based on elapsed time
            let mut world = self.world_default();
            let now = get_block_timestamp();
            let schedule: MarketEventSchedule = world.read_model(game_id);

            // Reconstruct last event id using our deterministic scheme from trigger_market_event
            if schedule.total_events_triggered == 0_u32 {
                return ();
            }
            let last_counter: u64 = schedule.total_events_triggered.into();
            let last_event_id: u64 = schedule.last_event_time * 1000_u64 + last_counter;

            let mut event: MarketEvent = world.read_model(last_event_id);
            if event.game_id != game_id {
                return ();
            }

            if event.remaining_duration == 0_u64 {
                return ();
            }

            let elapsed: u64 = if now > schedule.last_event_time { now - schedule.last_event_time } else { 0_u64 };
            if elapsed >= event.remaining_duration {
                event.remaining_duration = 0_u64;
            } else {
                event.remaining_duration = event.remaining_duration - elapsed;
            }
            world.write_model(@event);
        }

        fn _calculate_resolution_impact(self: @ContractState, game_id: u64, event_id: u64) -> (u256, Span<ContractAddress>) {
            let world = self.world_default();
            let market_event: MarketEvent = world.read_model(event_id);

            // Sum absolute impact magnitudes across affected properties
            let mut total_impact: u256 = 0;
            let mut owners: Array<ContractAddress> = ArrayTrait::new();

            let mut i = 0;
            while i < market_event.affected_properties.len() {
                let pid: u8 = *market_event.affected_properties.at(i);
                let property: Property = world.read_model((game_id, pid));

                // Track unique affected owners
                match property.owner {
                    Option::Some(owner) => {
                        // Deduplicate
                        let mut j = 0;
                        let mut seen = false;
                        while j < owners.len() {
                            if *owners.at(j) == owner { seen = true; break; }
                            j += 1;
                        };
                        if !seen { owners.append(owner); }
                    },
                    Option::None => {}
                };

                // Compute magnitude of the event's impact (same formula as calculate_event_impact)
                let after: u256 = (property.current_value * market_event.multiplier) / 10000_u256;
                let delta: u256 = if market_event.multiplier > 10000_u256 {
                    after - property.current_value
                } else {
                    property.current_value - after
                };
                total_impact = total_impact + delta;

                i += 1;
            };

            (total_impact, owners.span())
        }

        fn _update_player_exposures(ref self: ContractState, game_id: u64, players: Span<ContractAddress>, event_type: MarketEventType, impact: u256) {
            let mut world = self.world_default();
            let count: u32 = players.len().into();
            if count == 0_u32 { return (); }

            let per_player: u256 = impact / (count.into());

            let mut i = 0;
            while i < players.len() {
                let player = *players.at(i);
                let mut exposure: PlayerEventExposure = world.read_model((game_id, player));

                // Basic attribution based on event type
                match event_type {
                    MarketEventType::Boom => { exposure.total_gains = exposure.total_gains + per_player; },
                    MarketEventType::Crash => { exposure.total_losses = exposure.total_losses + per_player; },
                    MarketEventType::Disaster => { exposure.total_losses = exposure.total_losses + per_player; },
                    MarketEventType::Policy => {
                        // Split evenly for neutral policies
                        let half: u256 = per_player / 2_u256;
                        exposure.total_gains = exposure.total_gains + half;
                        exposure.total_losses = exposure.total_losses + (per_player - half);
                    },
                    MarketEventType::CryptoNews => {
                        // Treat as slightly positive on average
                        exposure.total_gains = exposure.total_gains + per_player;
                    },
                }

                exposure.events_experienced += 1_u32;
                // Keep simple heuristics for these fields
                if exposure.risk_tolerance == 0_u16 { exposure.risk_tolerance = 5000_u16; }
                if exposure.hedge_ratio == 0_u16 { exposure.hedge_ratio = 5000_u16; }

                world.write_model(@exposure);
                i += 1;
            };
        }

        fn _inject_liquidity(ref self: ContractState, game_id: u64) {
            // Distribute a small grant to all players
            let mut world = self.world_default();
            let game: GameState = world.read_model(game_id);

            let mut i = 0;
            while i < game.players.len() {
                let player = *game.players.at(i);
                let mut wallet: GameCurrency = world.read_model((game_id, player));
                let grant: u256 = wallet.starting_amount / 20_u256; // 5%
                wallet.balance = wallet.balance + grant;
                wallet.total_earned = wallet.total_earned + grant;
                world.write_model(@wallet);
                i += 1;
            };
        }

        fn _support_property_prices(ref self: ContractState, game_id: u64) {
            // Raise depressed property values to a support floor of 70% of base
            let mut world = self.world_default();
            let mut pid: u8 = 1_u8;
            while pid <= 39_u8 {
                let mut property: Property = world.read_model((game_id, pid));
                let floor: u256 = (property.base_value * 7000_u256) / 10000_u256;
                if property.current_value < floor {
                    property.current_value = floor;
                    world.write_model(@property);
                }
                pid += 1_u8;
            };
        }

        fn _break_monopolies(ref self: ContractState, game_id: u64) {
            // If a player holds too many properties, reduce rent multipliers on their holdings
            let mut world = self.world_default();
            let game: GameState = world.read_model(game_id);

            let mut i = 0;
            while i < game.players.len() {
                let player = *game.players.at(i);
                let pstate: PlayerGameState = world.read_model((player, game_id));

                // Threshold for anti-monopoly action
                if pstate.properties_owned > 12_u32 {
                    let mut pid: u8 = 1_u8;
                    while pid <= 39_u8 {
                        let mut property: Property = world.read_model((game_id, pid));
                        match property.owner {
                            Option::Some(owner) => {
                                if owner == player {
                                    // Reduce rent multiplier by 10%, but not below 50%
                                    let reduced: u256 = (property.rent_multiplier * 9000_u256) / 10000_u256;
                                    let min_mult: u256 = 5000_u256;
                                    property.rent_multiplier = if reduced < min_mult { min_mult } else { reduced };
                                    world.write_model(@property);
                                }
                            },
                            Option::None => {}
                        };
                        pid += 1_u8;
                    };
                }

                i += 1;
            };
        }

        fn _emergency_bailout(ref self: ContractState, game_id: u64) {
            // Bring struggling players up to a minimum liquidity floor (20% of starting amount)
            let mut world = self.world_default();
            let game: GameState = world.read_model(game_id);

            let mut i = 0;
            while i < game.players.len() {
                let player = *game.players.at(i);
                let mut wallet: GameCurrency = world.read_model((game_id, player));
                let mut pstate: PlayerGameState = world.read_model((player, game_id));

                let floor: u256 = wallet.starting_amount / 5_u256; // 20%
                if wallet.balance < floor {
                    let top_up: u256 = floor - wallet.balance;
                    wallet.balance = wallet.balance + top_up;
                    wallet.total_earned = wallet.total_earned + top_up;
                    world.write_model(@wallet);

                    // Clear bankruptcy if applicable
                    if pstate.is_bankrupt {
                        pstate.is_bankrupt = false;
                        world.write_model(@pstate);
                    }
                }

                i += 1;
            };
        }
    }
}
