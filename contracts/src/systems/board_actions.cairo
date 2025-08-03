use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
use dojo::model::{ModelStorage};
use dojo::world::{WorldStorage};
use dojo::event::{EventStorage};

use whale_opoly::models::{
    GameState, PlayerGameState, PlayerPosition, GameStatus, 
    Property, PropertyTransaction, TransactionType, PropertyGroup,
    GameCurrency
};

// ===== INTERFACES =====

#[starknet::interface]
pub trait IBoardActions<T> {
    fn roll_dice(ref self: T, game_id: u64) -> (u8, u8);
    fn move_player(ref self: T, game_id: u64, steps: u8) -> bool;
    fn buy_property(ref self: T, game_id: u64, property_id: u8) -> bool;
    fn pay_rent(ref self: T, game_id: u64, property_id: u8) -> bool;
    fn mortgage_property(ref self: T, game_id: u64, property_id: u8) -> bool;
    fn unmortgage_property(ref self: T, game_id: u64, property_id: u8) -> bool;
    fn develop_property(ref self: T, game_id: u64, property_id: u8) -> bool;
    fn end_turn(ref self: T, game_id: u64) -> bool;
    fn get_current_player(self: @T, game_id: u64) -> ContractAddress;
    fn get_player_position(self: @T, player: ContractAddress, game_id: u64) -> u8;
    fn can_buy_property(self: @T, player: ContractAddress, game_id: u64, property_id: u8) -> bool;
}

// ===== EVENTS =====

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct DiceRolled {
    #[key]
    pub game_id: u64,
    #[key]
    pub player: ContractAddress,
    pub dice1: u8,
    pub dice2: u8,
    pub total: u8,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct PlayerMoved {
    #[key]
    pub game_id: u64,
    #[key]
    pub player: ContractAddress,
    pub from_position: u8,
    pub to_position: u8,
    pub passed_go: bool,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct PropertyPurchased {
    #[key]
    pub game_id: u64,
    #[key]
    pub property_id: u8,
    pub buyer: ContractAddress,
    pub price: u256,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct RentPaid {
    #[key]
    pub game_id: u64,
    #[key]
    pub property_id: u8,
    pub payer: ContractAddress,
    pub owner: ContractAddress,
    pub amount: u256,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct TurnEnded {
    #[key]
    pub game_id: u64,
    pub player: ContractAddress,
    pub next_player: ContractAddress,
    pub timestamp: u64,
}

// ===== CONSTANTS =====

const BOARD_SIZE: u8 = 40;
const GO_POSITION: u8 = 0;
const GO_SALARY: u256 = 200000; // $200k monopoly money
const JAIL_POSITION: u8 = 10;
const TURN_TIMEOUT: u64 = 300; // 5 minutes per turn

// Property positions on the board (simplified Monopoly layout)
const BROWN_PROPERTIES: (u8, u8) = (1, 3);
const LIGHT_BLUE_PROPERTIES: (u8, u8, u8) = (6, 8, 9);
const PINK_PROPERTIES: (u8, u8, u8) = (11, 13, 14);
const ORANGE_PROPERTIES: (u8, u8, u8) = (16, 18, 19);
const RED_PROPERTIES: (u8, u8, u8) = (21, 23, 24);
const YELLOW_PROPERTIES: (u8, u8, u8) = (26, 27, 29);
const GREEN_PROPERTIES: (u8, u8, u8) = (31, 32, 34);
const DARK_BLUE_PROPERTIES: (u8, u8) = (37, 39);

// ===== IMPLEMENTATION =====

#[dojo::contract]
pub mod board_actions {
    use super::{
        IBoardActions, DiceRolled, PlayerMoved, PropertyPurchased, RentPaid, TurnEnded,
        GameState, PlayerGameState, PlayerPosition, GameStatus, 
        Property, PropertyTransaction, TransactionType, PropertyGroup, GameCurrency,
        BOARD_SIZE, GO_POSITION, GO_SALARY, JAIL_POSITION, TURN_TIMEOUT
    };
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use dojo::model::{ModelStorage, ModelValueStorage};
    use dojo::world::{WorldStorage, WorldStorageTrait};
    use dojo::event::{EventStorage};

    #[abi(embed_v0)]
    impl BoardActionsImpl of IBoardActions<ContractState> {
        fn roll_dice(ref self: ContractState, game_id: u64) -> (u8, u8) {
            let mut world = self.world_default();
            let player = get_caller_address();
            let current_time = get_block_timestamp();

            // Validate game state and turn
            let game_state: GameState = world.read_model(game_id);
            assert!(game_state.status == GameStatus::Active, "Game not active");
            
            let current_player = self._get_current_player_internal(game_state.players, game_state.current_turn);
            assert!(player == current_player, "Not your turn");

            // Check turn timeout
            assert!(current_time <= game_state.turn_deadline, "Turn timed out");

            // Generate pseudo-random dice roll
            // In production, this would use secure randomness
            let seed = current_time + game_id;
            let dice1 = ((seed % 6) + 1).try_into().unwrap();
            let dice2 = (((seed / 7) % 6) + 1).try_into().unwrap();
            let total = dice1 + dice2;

            // Emit event
            world.emit_event(@DiceRolled {
                game_id,
                player,
                dice1,
                dice2,
                total,
                timestamp: current_time,
            });

            (dice1, dice2)
        }

        fn move_player(ref self: ContractState, game_id: u64, steps: u8) -> bool {
            let mut world = self.world_default();
            let player = get_caller_address();
            let current_time = get_block_timestamp();

            // Validate game state and turn
            let game_state: GameState = world.read_model(game_id);
            assert!(game_state.status == GameStatus::Active, "Game not active");
            
            let current_player = self._get_current_player_internal(game_state.players, game_state.current_turn);
            assert!(player == current_player, "Not your turn");

            // Get current position
            let mut player_position: PlayerPosition = world.read_model((player, game_id));
            let from_position = player_position.position;
            
            // Calculate new position
            let mut to_position = from_position + steps;
            let mut passed_go = false;
            
            if to_position >= BOARD_SIZE {
                to_position = to_position - BOARD_SIZE;
                passed_go = true;
                
                // Pay GO salary
                let mut player_currency: GameCurrency = world.read_model((game_id, player));
                player_currency.balance += GO_SALARY;
                player_currency.total_earned += GO_SALARY;
                world.write_model(@player_currency);
            }

            // Update position
            player_position.position = to_position;
            player_position.last_move_time = current_time;
            world.write_model(@player_position);

            // Emit event
            world.emit_event(@PlayerMoved {
                game_id,
                player,
                from_position,
                to_position,
                passed_go,
                timestamp: current_time,
            });

            true
        }

        fn buy_property(ref self: ContractState, game_id: u64, property_id: u8) -> bool {
            let mut world = self.world_default();
            let player = get_caller_address();
            let current_time = get_block_timestamp();

            // Validate game state
            let game_state: GameState = world.read_model(game_id);
            assert!(game_state.status == GameStatus::Active, "Game not active");

            // Get property and validate
            let mut property: Property = world.read_model((game_id, property_id));
            assert!(property.owner.is_none(), "Property already owned");

            // Check player position
            let player_position: PlayerPosition = world.read_model((player, game_id));
            assert!(player_position.position == property_id, "Not on property");

            // Check player balance
            let mut player_currency: GameCurrency = world.read_model((game_id, player));
            assert!(player_currency.balance >= property.current_value, "Insufficient funds");

            // Process purchase
            player_currency.balance -= property.current_value;
            player_currency.total_spent += property.current_value;
            property.owner = Option::Some(player);

            // Update property count
            let mut player_game_state: PlayerGameState = world.read_model((player, game_id));
            player_game_state.properties_owned += 1;

            // Create transaction record
            let transaction_id = (get_block_timestamp() + game_id.into()).into();
            let transaction = PropertyTransaction {
                transaction_id,
                game_id,
                property_id,
                from_player: Option::None,
                to_player: player,
                transaction_type: TransactionType::Purchase,
                amount: property.current_value,
                timestamp: current_time,
            };

            // Write to world
            world.write_model(@property);
            world.write_model(@player_currency);
            world.write_model(@player_game_state);
            world.write_model(@transaction);

            // Emit event
            world.emit_event(@PropertyPurchased {
                game_id,
                property_id,
                buyer: player,
                price: property.current_value,
                timestamp: current_time,
            });

            true
        }

        fn pay_rent(ref self: ContractState, game_id: u64, property_id: u8) -> bool {
            let mut world = self.world_default();
            let player = get_caller_address();
            let current_time = get_block_timestamp();

            // Get property
            let property: Property = world.read_model((game_id, property_id));
            assert!(property.owner.is_some(), "Property not owned");
            assert!(!property.is_mortgaged, "Property is mortgaged");

            let owner = property.owner.unwrap();
            assert!(owner != player, "Cannot pay rent to yourself");

            // Calculate rent
            let rent_amount = self._calculate_rent(property, game_id);

            // Get player balances
            let mut payer_currency: GameCurrency = world.read_model((game_id, player));
            let mut owner_currency: GameCurrency = world.read_model((game_id, owner));

            assert!(payer_currency.balance >= rent_amount, "Insufficient funds for rent");

            // Transfer rent
            payer_currency.balance -= rent_amount;
            payer_currency.total_spent += rent_amount;
            owner_currency.balance += rent_amount;
            owner_currency.total_earned += rent_amount;

            // Create transaction record
            let transaction_id = (get_block_timestamp() + game_id.into()).into();
            let transaction = PropertyTransaction {
                transaction_id,
                game_id,
                property_id,
                from_player: Option::Some(player),
                to_player: owner,
                transaction_type: TransactionType::Rent,
                amount: rent_amount,
                timestamp: current_time,
            };

            // Write to world
            world.write_model(@payer_currency);
            world.write_model(@owner_currency);
            world.write_model(@transaction);

            // Emit event
            world.emit_event(@RentPaid {
                game_id,
                property_id,
                payer: player,
                owner,
                amount: rent_amount,
                timestamp: current_time,
            });

            true
        }

        fn mortgage_property(ref self: ContractState, game_id: u64, property_id: u8) -> bool {
            let mut world = self.world_default();
            let player = get_caller_address();

            // Get property and validate ownership
            let mut property: Property = world.read_model((game_id, property_id));
            assert!(property.owner == Option::Some(player), "Not property owner");
            assert!(!property.is_mortgaged, "Already mortgaged");
            assert!(property.development_level == 0, "Cannot mortgage developed property");

            // Calculate mortgage value (50% of property value)
            let mortgage_value = property.current_value / 2;

            // Update property
            property.is_mortgaged = true;

            // Update player balance
            let mut player_currency: GameCurrency = world.read_model((game_id, player));
            player_currency.balance += mortgage_value;
            player_currency.total_earned += mortgage_value;

            // Write to world
            world.write_model(@property);
            world.write_model(@player_currency);

            true
        }

        fn unmortgage_property(ref self: ContractState, game_id: u64, property_id: u8) -> bool {
            let mut world = self.world_default();
            let player = get_caller_address();

            // Get property and validate ownership
            let mut property: Property = world.read_model((game_id, property_id));
            assert!(property.owner == Option::Some(player), "Not property owner");
            assert!(property.is_mortgaged, "Property not mortgaged");

            // Calculate unmortgage cost (55% of property value - includes 10% interest)
            let unmortgage_cost = (property.current_value * 55) / 100;

            // Check player balance
            let mut player_currency: GameCurrency = world.read_model((game_id, player));
            assert!(player_currency.balance >= unmortgage_cost, "Insufficient funds");

            // Update property
            property.is_mortgaged = false;

            // Update player balance
            player_currency.balance -= unmortgage_cost;
            player_currency.total_spent += unmortgage_cost;

            // Write to world
            world.write_model(@property);
            world.write_model(@player_currency);

            true
        }

        fn develop_property(ref self: ContractState, game_id: u64, property_id: u8) -> bool {
            let mut world = self.world_default();
            let player = get_caller_address();

            // Get property and validate
            let mut property: Property = world.read_model((game_id, property_id));
            assert!(property.owner == Option::Some(player), "Not property owner");
            assert!(!property.is_mortgaged, "Property is mortgaged");
            assert!(property.development_level < 5, "Maximum development reached");

            // Check if player owns the entire color group
            assert!(self._owns_color_group(player, game_id, property.color_group), "Must own entire color group");

            // Calculate development cost
            let development_cost = self._get_development_cost(property.color_group);

            // Check player balance
            let mut player_currency: GameCurrency = world.read_model((game_id, player));
            assert!(player_currency.balance >= development_cost, "Insufficient funds");

            // Update property
            property.development_level += 1;
            property.current_value = (property.current_value * 110) / 100; // 10% increase

            // Update player balance
            player_currency.balance -= development_cost;
            player_currency.total_spent += development_cost;

            // Write to world
            world.write_model(@property);
            world.write_model(@player_currency);

            true
        }

        fn end_turn(ref self: ContractState, game_id: u64) -> bool {
            let mut world = self.world_default();
            let player = get_caller_address();
            let current_time = get_block_timestamp();

            // Validate turn
            let mut game_state: GameState = world.read_model(game_id);
            assert!(game_state.status == GameStatus::Active, "Game not active");
            
            let current_player = self._get_current_player_internal(game_state.players, game_state.current_turn);
            assert!(player == current_player, "Not your turn");

            // Move to next player
            let next_turn = (game_state.current_turn + 1) % game_state.players.len().try_into().unwrap();
            let next_player = self._get_current_player_internal(game_state.players, next_turn);

            // Update game state
            game_state.current_turn = next_turn;
            game_state.turn_deadline = current_time + TURN_TIMEOUT;

            // Write to world
            world.write_model(@game_state);

            // Emit event
            world.emit_event(@TurnEnded {
                game_id,
                player,
                next_player,
                timestamp: current_time,
            });

            true
        }

        fn get_current_player(self: @ContractState, game_id: u64) -> ContractAddress {
            let world = self.world_default();
            let game_state: GameState = world.read_model(game_id);
            self._get_current_player_internal(game_state.players, game_state.current_turn)
        }

        fn get_player_position(self: @ContractState, player: ContractAddress, game_id: u64) -> u8 {
            let world = self.world_default();
            let player_position: PlayerPosition = world.read_model((player, game_id));
            player_position.position
        }

        fn can_buy_property(self: @ContractState, player: ContractAddress, game_id: u64, property_id: u8) -> bool {
            let world = self.world_default();
            
            // Check property availability
            let property: Property = world.read_model((game_id, property_id));
            if property.owner.is_some() {
                return false;
            }

            // Check player position
            let player_position: PlayerPosition = world.read_model((player, game_id));
            if player_position.position != property_id {
                return false;
            }

            // Check player balance
            let player_currency: GameCurrency = world.read_model((game_id, player));
            player_currency.balance >= property.current_value
        }
    }

    // ===== INTERNAL FUNCTIONS =====

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> WorldStorage {
            self.world(@"whale_opoly")
        }

        fn _get_current_player_internal(self: @ContractState, players: Span<ContractAddress>, current_turn: u8) -> ContractAddress {
            *players.at(current_turn.into())
        }

        fn _calculate_rent(self: @ContractState, property: Property, game_id: u64) -> u256 {
            let base_rent = (property.current_value * property.rent_multiplier) / 100;
            
            // Apply development multiplier
            let development_multiplier = match property.development_level {
                0 => 1,
                1 => 5,
                2 => 15,
                3 => 45,
                4 => 62,
                5 => 75, // Hotel
                _ => 1,
            };
            
            base_rent * development_multiplier.into()
        }

        fn _owns_color_group(self: @ContractState, player: ContractAddress, game_id: u64, color_group: PropertyGroup) -> bool {
            let world = self.world_default();
            
            // Get all property IDs for this color group
            let property_ids = self._get_property_ids_for_group(color_group);
            
            // Check if player owns all properties in the group
            let mut i = 0;
            let mut owns_all = true;
            while i < property_ids.len() {
                let property_id = *property_ids.at(i);
                let property: Property = world.read_model((game_id, property_id));
                
                if property.owner != Option::Some(player) {
                    owns_all = false;
                    break;
                }
                i += 1;
            };
            
            owns_all
        }

        fn _get_property_ids_for_group(self: @ContractState, color_group: PropertyGroup) -> Span<u8> {
            match color_group {
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

        fn _get_development_cost(self: @ContractState, color_group: PropertyGroup) -> u256 {
            match color_group {
                PropertyGroup::Brown => 50000,     // $50k
                PropertyGroup::LightBlue => 50000,
                PropertyGroup::Pink => 100000,     // $100k
                PropertyGroup::Orange => 100000,
                PropertyGroup::Red => 150000,      // $150k
                PropertyGroup::Yellow => 150000,
                PropertyGroup::Green => 200000,    // $200k
                PropertyGroup::DarkBlue => 200000,
                _ => 0, // Non-developable properties
            }
        }
    }
}
