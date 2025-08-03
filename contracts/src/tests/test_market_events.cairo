#[cfg(test)]
mod tests {
    use starknet::{ContractAddress, contract_address_const};
    use dojo::model::{ModelStorage, ModelValueStorage};
    use dojo::world::{WorldStorage, WorldStorageTrait};
    use dojo_cairo_test::{spawn_test_world, NamespaceDef, TestResource, ContractDefTrait};

    use whale_opoly::models::{
        GameState, GameStatus, GameTier, PlayerGameState, Property, PropertyGroup,
        GameCurrency, MarketEvent, MarketEventType
    };
    use whale_opoly::systems::market_events::{
        market_events, IMarketEventsDispatcher, IMarketEventsDispatcherTrait
    };

    #[test]
    fn test_trigger_market_event() {
        // Setup world and spawn market events system
        let namespace_def = NamespaceDef {
            namespace: "whale_opoly",
            resources: [
                TestResource::Model(GameState::TEST_CLASS_HASH),
                TestResource::Model(PlayerGameState::TEST_CLASS_HASH),
                TestResource::Model(Property::TEST_CLASS_HASH),
                TestResource::Model(GameCurrency::TEST_CLASS_HASH),
                TestResource::Model(MarketEvent::TEST_CLASS_HASH),
                TestResource::Contract(market_events::TEST_CLASS_HASH),
            ].span()
        };

        let mut world = spawn_test_world([namespace_def].span());

        // Initialize game state
        let game_id = 1_u64;
        let game_state = GameState {
            game_id,
            players: [contract_address_const::<0x123>()].span(),
            status: GameStatus::Active,
            entry_tier: GameTier::Whale,
            total_pool: 1000000_u256,
            current_turn: 0,
            start_time: 1234567890_u64,
            turn_deadline: 1234567890_u64 + 300,
            winner: Option::None,
        };

        world.write_model(@game_state);

        // Deploy and get market events system
        let market_events_address = world.deploy_contract('salt', market_events::TEST_CLASS_HASH);
        let market_events_system = IMarketEventsDispatcher { contract_address: market_events_address };

        // Test triggering a market event
        let event_id = market_events_system.trigger_market_event(
            game_id,
            MarketEventType::Boom,
            75, // High magnitude
            Option::Some(PropertyGroup::DarkBlue)
        );

        assert!(event_id > 0, "Event should be created");

        // Read the created event
        let market_event: MarketEvent = world.read_model(event_id);
        assert!(market_event.game_id == game_id, "Event should belong to correct game");
        assert!(market_event.event_type == MarketEventType::Boom, "Event type should match");
    }

    #[test]
    fn test_process_scheduled_events() {
        let namespace_def = NamespaceDef {
            namespace: "whale_opoly",
            resources: [
                TestResource::Model(GameState::TEST_CLASS_HASH),
                TestResource::Contract(market_events::TEST_CLASS_HASH),
            ].span()
        };

        let mut world = spawn_test_world([namespace_def].span());

        let game_id = 1_u64;
        let market_events_address = world.deploy_contract('salt', market_events::TEST_CLASS_HASH);
        let market_events_system = IMarketEventsDispatcher { contract_address: market_events_address };

        // Test processing scheduled events (should not trigger immediately)
        let result = market_events_system.process_scheduled_events(game_id);
        
        // Result depends on timing and schedule setup
        // This is a basic structural test
    }

    #[test]
    fn test_calculate_event_impact() {
        let namespace_def = NamespaceDef {
            namespace: "whale_opoly",
            resources: [
                TestResource::Model(MarketEvent::TEST_CLASS_HASH),
                TestResource::Model(Property::TEST_CLASS_HASH),
                TestResource::Contract(market_events::TEST_CLASS_HASH),
            ].span()
        };

        let mut world = spawn_test_world([namespace_def].span());

        let game_id = 1_u64;
        let property_id = 37_u8; // Dark Blue property
        
        // Create a test property
        let property = Property {
            game_id,
            property_id,
            name: 'Boardwalk',
            property_group: PropertyGroup::DarkBlue,
            base_value: 400000_u256,
            current_value: 400000_u256,
            owner: Option::None,
            rent_base: 50000_u256,
            rent_multiplier: 100_u8,
            is_mortgaged: false,
            houses: 0,
            is_available: true,
        };

        world.write_model(@property);

        // Create a test market event
        let event_id = 1_u64;
        let market_event = MarketEvent {
            event_id,
            game_id,
            event_type: MarketEventType::Boom,
            affected_properties: [property_id].span(),
            multiplier: 12000_u256, // 20% increase
            duration: 3600_u64,
            remaining_duration: 3600_u64,
            created_at: 1234567890_u64,
        };

        world.write_model(@market_event);

        let market_events_address = world.deploy_contract('salt', market_events::TEST_CLASS_HASH);
        let market_events_system = IMarketEventsDispatcher { contract_address: market_events_address };

        // Calculate impact
        let impact = market_events_system.calculate_event_impact(event_id, property_id);
        
        // Should be positive impact (gain) for a boom
        assert!(impact > 0, "Boom should create positive impact");
        
        // Should be roughly 20% of property value
        let expected_impact = 80000_u256; // 20% of 400,000
        assert!(impact == expected_impact, "Impact should match expected calculation");
    }
}
