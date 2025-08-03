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
    pub property_updates: Span<PropertyUpdate>,
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
            let event_id = world.uuid();

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
            let mut schedule: MarketEventSchedule = world.read_model(game_id);
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
            let world = self.world_default();
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
            let impact = (property.current_value * market_event.multiplier.into()) / 10000;
            
            if market_event.multiplier > 10000 {
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
            let base_duration = match event_type {
                MarketEventType::Boom => (BOOM_DURATION_RANGE.0 + BOOM_DURATION_RANGE.1) / 2,
                MarketEventType::Crash => (CRASH_DURATION_RANGE.0 + CRASH_DURATION_RANGE.1) / 2,
                MarketEventType::Disaster => (DISASTER_DURATION_RANGE.0 + DISASTER_DURATION_RANGE.1) / 2,
                MarketEventType::Policy => (POLICY_DURATION_RANGE.0 + POLICY_DURATION_RANGE.1) / 2,
                MarketEventType::CryptoNews => (CRYPTO_DURATION_RANGE.0 + CRYPTO_DURATION_RANGE.1) / 2,
            };

            // Adjust duration based on magnitude
            (base_duration * magnitude.into()) / 100
        }

        fn _calculate_impact_multiplier(self: @ContractState, event_type: MarketEventType, magnitude: u8) -> u256 {
            let (min_impact, max_impact) = match event_type {
                MarketEventType::Boom => BOOM_IMPACT,
                MarketEventType::Crash => CRASH_IMPACT,
                MarketEventType::Disaster => DISASTER_IMPACT,
                MarketEventType::Policy => POLICY_IMPACT,
                MarketEventType::CryptoNews => CRYPTO_IMPACT,
            };

            // Interpolate between min and max based on magnitude
            let impact_range = max_impact - min_impact;
            let impact_adjustment = (impact_range.into() * magnitude.into()) / 100;
            
            (min_impact.into() + impact_adjustment).into()
        }

        fn _get_properties_in_group(self: @ContractState, group: PropertyGroup) -> Span<u8> {
            match group {
                PropertyGroup::Brown => array![1, 3].span(),
                PropertyGroup::LightBlue => array![6, 8, 9].span(),
                PropertyGroup::Pink => array![11, 13, 14].span(),
                PropertyGroup::Orange => array![16, 18, 19].span(),
                PropertyGroup::Red => array![21, 23, 24].span(),
                PropertyGroup::Yellow => array![26, 27, 29].span(),
                PropertyGroup::Green => array![31, 32, 34].span(),
                PropertyGroup::DarkBlue => array![37, 39].span(),
                PropertyGroup::Railroad => array![5, 15, 25, 35].span(),
                PropertyGroup::Utility => array![12, 28].span(),
                PropertyGroup::Special => array![].span(),
            }
        }

        fn _select_random_properties(self: @ContractState, magnitude: u8) -> Span<u8> {
            // Simple random selection based on magnitude
            let property_count = (magnitude / 10).max(1).min(8); // 1-8 properties
            
            // For simplicity, select first N properties
            let mut properties = ArrayTrait::new();
            let mut i = 1;
            while i <= property_count.into() && i <= 39 {
                properties.append(i.try_into().unwrap());
                i += 5; // Skip some properties for variety
            };
            
            properties.span()
        }

        fn _apply_event_to_properties(ref self: ContractState, game_id: u64, event_id: u64, properties: Span<u8>, multiplier: u256) {
            let mut world = self.world_default();
            let mut property_updates = ArrayTrait::new();

            let mut i = 0;
            while i < properties.len() {
                let property_id = *properties.at(i);
                let mut property: Property = world.read_model((game_id, property_id));
                
                let old_value = property.current_value;
                property.current_value = (property.current_value * multiplier) / 10000;
                
                // Ensure property doesn't go below 10% of base value
                let min_value = property.base_value / 10;
                if property.current_value < min_value {
                    property.current_value = min_value;
                }

                world.write_model(@property);

                // Record the update
                let change_percent = if old_value > 0 {
                    ((property.current_value.into() - old_value.into()) * 100 / old_value.into()).try_into().unwrap_or(0)
                } else {
                    0
                };

                property_updates.append(PropertyUpdate {
                    property_id,
                    old_value,
                    new_value: property.current_value,
                    change_percent,
                });

                i += 1;
            };

            // Emit property updates event
            world.emit_event(@PropertyValuesUpdated {
                game_id,
                event_id,
                property_updates: property_updates.span(),
                timestamp: get_block_timestamp(),
            });
        }

        fn _calculate_next_event_time(self: @ContractState, stability_index: u16) -> u64 {
            // More stable markets have longer intervals between events
            let frequency_multiplier = stability_index / 100; // 0-100 multiplier
            let adjusted_frequency = BASE_EVENT_FREQUENCY + (frequency_multiplier.into() * 10);
            
            adjusted_frequency.max(MIN_EVENT_FREQUENCY).min(MAX_EVENT_FREQUENCY)
        }

        fn _should_trigger_compound_event(self: @ContractState, game_id: u64) -> bool {
            let world = self.world_default();
            let schedule: MarketEventSchedule = world.read_model(game_id);
            
            // Lower stability increases compound event probability
            let probability = 10000 - schedule.market_stability_index; // Inverse relationship
            probability > COMPOUND_EVENT_THRESHOLD
        }

        fn _trigger_compound_event(ref self: ContractState, game_id: u64, primary_event_id: u64) {
            // Trigger a secondary event that compounds the primary
            let secondary_event_type = MarketEventType::Crash; // Simplified
            let magnitude = 60; // Medium impact
            
            let secondary_event_id = self.trigger_market_event(game_id, secondary_event_type, magnitude, Option::None);
            
            let world = self.world_default();
            world.emit_event(@CompoundEventActivated {
                game_id,
                primary_event: primary_event_id,
                secondary_event: secondary_event_id,
                compound_multiplier: 1500, // 50% additional impact
                timestamp: get_block_timestamp(),
            });
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
            // Implementation would update all active events' remaining duration
            // This is a placeholder for the concept
        }

        fn _calculate_resolution_impact(self: @ContractState, game_id: u64, event_id: u64) -> (u256, Span<ContractAddress>) {
            // Calculate total impact and return affected players
            // Placeholder implementation
            (0, array![].span())
        }

        fn _apply_market_correction(ref self: ContractState, game_id: u64, properties: Span<u8>, original_multiplier: u256) {
            // Apply partial reversion of temporary effects
            let correction_multiplier = if original_multiplier > 10000 {
                10500 // Partial reversion of boom
            } else {
                9500 // Partial reversion of crash
            };

            self._apply_event_to_properties(game_id, 0, properties, correction_multiplier);
        }

        fn _update_player_exposures(ref self: ContractState, game_id: u64, players: Span<ContractAddress>, event_type: MarketEventType, impact: u256) {
            // Update player exposure tracking
            // Placeholder implementation
        }

        fn _stabilize_market(ref self: ContractState, game_id: u64) {
            // Intervention to stabilize market
            let mut world = self.world_default();
            let mut schedule: MarketEventSchedule = world.read_model(game_id);
            schedule.market_stability_index = (schedule.market_stability_index + 1000).min(10000);
            world.write_model(@schedule);
        }

        fn _inject_liquidity(ref self: ContractState, game_id: u64) {
            // Add liquidity to the market
            // Implementation would add money to player balances
        }

        fn _support_property_prices(ref self: ContractState, game_id: u64) {
            // Prevent property values from falling too low
            // Implementation would set minimum property values
        }

        fn _break_monopolies(ref self: ContractState, game_id: u64) {
            // Anti-monopoly intervention
            // Implementation would force sale of excess properties
        }

        fn _emergency_bailout(ref self: ContractState, game_id: u64) {
            // Emergency bailout for struggling players
            // Implementation would provide emergency funds
        }
    }
}
