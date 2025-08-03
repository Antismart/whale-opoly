#[cfg(test)]
mod tests {
    use starknet::{ContractAddress, contract_address_const};
    use dojo::model::{ModelStorage, ModelValueStorage};
    use dojo::world::{WorldStorage, WorldStorageTrait};
    use dojo_cairo_test::{spawn_test_world, NamespaceDef, TestResource, ContractDefTrait};

    use whale_opoly::models::{
        GameState, GameStatus, GameTier, PlayerGameState
    };
    use whale_opoly::systems::security::{
        security, ISecurityDispatcher, ISecurityDispatcherTrait,
        SecurityStatus, ActionType, Transaction, TransactionType,
        ValidationResult, QuarantineReason
    };

    #[test]
    fn test_get_security_status() {
        // Setup world and spawn security system
        let namespace_def = NamespaceDef {
            namespace: "whale_opoly",
            resources: [
                TestResource::Model(GameState::TEST_CLASS_HASH),
                TestResource::Contract(security::TEST_CLASS_HASH),
            ].span()
        };

        let mut world = spawn_test_world([namespace_def].span());

        let game_id = 1_u64;
        let security_address = world.deploy_contract('salt', security::TEST_CLASS_HASH);
        let security_system = ISecurityDispatcher { contract_address: security_address };

        // Test getting security status for a new game
        let status = security_system.get_security_status(game_id);
        
        // Should have some default security status
        // Exact status depends on initialization
    }

    #[test]
    fn test_validate_transaction() {
        let namespace_def = NamespaceDef {
            namespace: "whale_opoly",
            resources: [
                TestResource::Model(GameState::TEST_CLASS_HASH),
                TestResource::Model(PlayerGameState::TEST_CLASS_HASH),
                TestResource::Contract(security::TEST_CLASS_HASH),
            ].span()
        };

        let mut world = spawn_test_world([namespace_def].span());

        let game_id = 1_u64;
        let player = contract_address_const::<0x123>();
        
        // Initialize player state
        let player_state = PlayerGameState {
            player,
            game_id,
            position: 0,
            balance: 1500000_u256,
            properties_owned: 0,
            is_bankrupt: false,
            is_in_jail: false,
            jail_turns: 0,
            last_action_time: 1234567890_u64,
        };

        world.write_model(@player_state);

        let security_address = world.deploy_contract('salt', security::TEST_CLASS_HASH);
        let security_system = ISecurityDispatcher { contract_address: security_address };

        // Test validating a normal transaction
        let transaction = Transaction {
            player,
            transaction_type: TransactionType::PropertyPurchase,
            amount: 200000_u256,
            target: Option::None,
            metadata: 'property_1',
        };

        let result = security_system.validate_transaction(game_id, transaction);
        
        // Normal transaction should be valid
        assert!(result.is_valid, "Normal transaction should be valid");
        assert!(result.risk_score < 5000, "Normal transaction should have low risk");
    }

    #[test]
    fn test_detect_anomalies() {
        let namespace_def = NamespaceDef {
            namespace: "whale_opoly",
            resources: [
                TestResource::Model(GameState::TEST_CLASS_HASH),
                TestResource::Model(PlayerGameState::TEST_CLASS_HASH),
                TestResource::Contract(security::TEST_CLASS_HASH),
            ].span()
        };

        let mut world = spawn_test_world([namespace_def].span());

        let game_id = 1_u64;
        let player = contract_address_const::<0x123>();

        let security_address = world.deploy_contract('salt', security::TEST_CLASS_HASH);
        let security_system = ISecurityDispatcher { contract_address: security_address };

        // Test anomaly detection for a player
        let has_anomalies = security_system.detect_anomalies(game_id, player);
        
        // For a new player, should typically have no anomalies
        // Result depends on the specific anomaly detection logic
    }

    #[test]
    fn test_enforce_rate_limits() {
        let namespace_def = NamespaceDef {
            namespace: "whale_opoly",
            resources: [
                TestResource::Contract(security::TEST_CLASS_HASH),
            ].span()
        };

        let mut world = spawn_test_world([namespace_def].span());

        let player = contract_address_const::<0x123>();
        let security_address = world.deploy_contract('salt', security::TEST_CLASS_HASH);
        let security_system = ISecurityDispatcher { contract_address: security_address };

        // Test rate limiting - first few actions should be allowed
        let result1 = security_system.enforce_rate_limits(player, ActionType::DiceRoll);
        assert!(result1, "First action should be allowed");

        let result2 = security_system.enforce_rate_limits(player, ActionType::DiceRoll);
        assert!(result2, "Second action should be allowed");

        // After many rapid actions, should be rate limited
        // This would require setting up the rate limit tracker state
    }

    #[test]
    fn test_quarantine_suspicious_activity() {
        let namespace_def = NamespaceDef {
            namespace: "whale_opoly",
            resources: [
                TestResource::Model(GameState::TEST_CLASS_HASH),
                TestResource::Contract(security::TEST_CLASS_HASH),
            ].span()
        };

        let mut world = spawn_test_world([namespace_def].span());

        let game_id = 1_u64;
        let player = contract_address_const::<0x123>();
        
        let security_address = world.deploy_contract('salt', security::TEST_CLASS_HASH);
        let security_system = ISecurityDispatcher { contract_address: security_address };

        // Test quarantining a player
        let result = security_system.quarantine_suspicious_activity(
            game_id,
            player,
            QuarantineReason::SuspiciousActivity
        );

        assert!(result, "Quarantine should succeed");
    }

    #[test]
    fn test_monitor_game_integrity() {
        let namespace_def = NamespaceDef {
            namespace: "whale_opoly",
            resources: [
                TestResource::Model(GameState::TEST_CLASS_HASH),
                TestResource::Contract(security::TEST_CLASS_HASH),
            ].span()
        };

        let mut world = spawn_test_world([namespace_def].span());

        let game_id = 1_u64;
        let security_address = world.deploy_contract('salt', security::TEST_CLASS_HASH);
        let security_system = ISecurityDispatcher { contract_address: security_address };

        // Test monitoring game integrity
        let report = security_system.monitor_game_integrity(game_id);
        
        assert!(report.game_id == game_id, "Report should be for correct game");
        assert!(report.generated_at > 0, "Report should have timestamp");
    }
}
