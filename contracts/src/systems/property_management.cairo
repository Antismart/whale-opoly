use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
use dojo::model::{ModelStorage};
use dojo::world::{WorldStorage};
use dojo::event::{EventStorage};

use whale_opoly::models::{
    Property, PropertyTransaction, TransactionType, PropertyGroup,
    PlayerGameState, GameCurrency, MarketEvent, MarketEventType
};

// ===== INTERFACES =====

#[starknet::interface]
pub trait IPropertyManagement<T> {
    fn initialize_properties(ref self: T, game_id: u64) -> bool;
    fn transfer_property(ref self: T, game_id: u64, property_id: u8, to_player: ContractAddress, price: u256) -> bool;
    fn auction_property(ref self: T, game_id: u64, property_id: u8, starting_bid: u256) -> bool;
    fn place_bid(ref self: T, game_id: u64, property_id: u8, bid_amount: u256) -> bool;
    fn finalize_auction(ref self: T, game_id: u64, property_id: u8) -> bool;
    fn force_sale(ref self: T, game_id: u64, player: ContractAddress) -> bool;
    fn get_property_value(self: @T, game_id: u64, property_id: u8) -> u256;
    fn get_player_properties(self: @T, game_id: u64, player: ContractAddress) -> Span<u8>;
    fn get_color_group_monopoly_status(self: @T, game_id: u64, color_group: PropertyGroup) -> Option<ContractAddress>;
    fn calculate_total_assets(self: @T, game_id: u64, player: ContractAddress) -> u256;
}

// ===== EVENTS =====

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct PropertyTransferred {
    #[key]
    pub game_id: u64,
    #[key]
    pub property_id: u8,
    pub from_player: ContractAddress,
    pub to_player: ContractAddress,
    pub price: u256,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct AuctionStarted {
    #[key]
    pub game_id: u64,
    #[key]
    pub property_id: u8,
    pub starting_bid: u256,
    pub auction_end_time: u64,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct BidPlaced {
    #[key]
    pub game_id: u64,
    #[key]
    pub property_id: u8,
    pub bidder: ContractAddress,
    pub bid_amount: u256,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct AuctionFinalized {
    #[key]
    pub game_id: u64,
    #[key]
    pub property_id: u8,
    pub winner: Option<ContractAddress>,
    pub winning_bid: u256,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct PropertyDeveloped {
    #[key]
    pub game_id: u64,
    #[key]
    pub property_id: u8,
    pub owner: ContractAddress,
    pub development_level: u8,
    pub cost: u256,
    pub timestamp: u64,
}

// ===== MODELS =====

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct PropertyAuction {
    #[key]
    pub game_id: u64,
    #[key]
    pub property_id: u8,
    pub current_bid: u256,
    pub current_bidder: Option<ContractAddress>,
    pub auction_end_time: u64,
    pub is_active: bool,
    pub starting_bid: u256,
}

// ===== CONSTANTS =====

const AUCTION_DURATION: u64 = 300; // 5 minutes
const MINIMUM_BID_INCREMENT: u256 = 10000; // $10k monopoly money
const FORCE_SALE_DISCOUNT: u256 = 20; // 20% discount on forced sales

// Base property values for each color group
const BROWN_BASE_VALUES: (u256, u256) = (60000, 60000);
const LIGHT_BLUE_BASE_VALUES: (u256, u256, u256) = (100000, 100000, 120000);
const PINK_BASE_VALUES: (u256, u256, u256) = (140000, 140000, 160000);
const ORANGE_BASE_VALUES: (u256, u256, u256) = (180000, 180000, 200000);
const RED_BASE_VALUES: (u256, u256, u256) = (220000, 220000, 240000);
const YELLOW_BASE_VALUES: (u256, u256, u256) = (260000, 260000, 280000);
const GREEN_BASE_VALUES: (u256, u256, u256) = (300000, 300000, 320000);
const DARK_BLUE_BASE_VALUES: (u256, u256) = (350000, 400000);
const RAILROAD_BASE_VALUE: u256 = 200000;
const UTILITY_BASE_VALUE: u256 = 150000;

// ===== IMPLEMENTATION =====

#[dojo::contract]
pub mod property_management {
    use super::{
        IPropertyManagement, PropertyTransferred, AuctionStarted, BidPlaced, AuctionFinalized, PropertyDeveloped,
        Property, PropertyTransaction, TransactionType, PropertyGroup, PropertyAuction,
        PlayerGameState, GameCurrency, MarketEvent, MarketEventType,
        AUCTION_DURATION, MINIMUM_BID_INCREMENT, FORCE_SALE_DISCOUNT,
        BROWN_BASE_VALUES, LIGHT_BLUE_BASE_VALUES, PINK_BASE_VALUES, ORANGE_BASE_VALUES,
        RED_BASE_VALUES, YELLOW_BASE_VALUES, GREEN_BASE_VALUES, DARK_BLUE_BASE_VALUES,
        RAILROAD_BASE_VALUE, UTILITY_BASE_VALUE
    };
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use dojo::model::{ModelStorage, ModelValueStorage};
    use dojo::world::{WorldStorage, WorldStorageTrait};
    use dojo::event::{EventStorage};

    #[abi(embed_v0)]
    impl PropertyManagementImpl of IPropertyManagement<ContractState> {
        fn initialize_properties(ref self: ContractState, game_id: u64) -> bool {
            let mut world = self.world_default();
            
            // Initialize all 40 properties on the board
            self._create_property(game_id, 1, PropertyGroup::Brown, 60000, 2); // Mediterranean Ave
            self._create_property(game_id, 3, PropertyGroup::Brown, 60000, 4); // Baltic Ave
            
            self._create_property(game_id, 5, PropertyGroup::Railroad, 200000, 25); // Reading Railroad
            
            self._create_property(game_id, 6, PropertyGroup::LightBlue, 100000, 6); // Oriental Ave
            self._create_property(game_id, 8, PropertyGroup::LightBlue, 100000, 6); // Vermont Ave
            self._create_property(game_id, 9, PropertyGroup::LightBlue, 120000, 8); // Connecticut Ave
            
            self._create_property(game_id, 11, PropertyGroup::Pink, 140000, 10); // St. Charles Place
            self._create_property(game_id, 12, PropertyGroup::Utility, 150000, 4); // Electric Company
            self._create_property(game_id, 13, PropertyGroup::Pink, 140000, 10); // States Ave
            self._create_property(game_id, 14, PropertyGroup::Pink, 160000, 12); // Virginia Ave
            
            self._create_property(game_id, 15, PropertyGroup::Railroad, 200000, 25); // Pennsylvania Railroad
            
            self._create_property(game_id, 16, PropertyGroup::Orange, 180000, 14); // St. James Place
            self._create_property(game_id, 18, PropertyGroup::Orange, 180000, 14); // Tennessee Ave
            self._create_property(game_id, 19, PropertyGroup::Orange, 200000, 16); // New York Ave
            
            self._create_property(game_id, 21, PropertyGroup::Red, 220000, 18); // Kentucky Ave
            self._create_property(game_id, 23, PropertyGroup::Red, 220000, 18); // Indiana Ave
            self._create_property(game_id, 24, PropertyGroup::Red, 240000, 20); // Illinois Ave
            
            self._create_property(game_id, 25, PropertyGroup::Railroad, 200000, 25); // B&O Railroad
            
            self._create_property(game_id, 26, PropertyGroup::Yellow, 260000, 22); // Atlantic Ave
            self._create_property(game_id, 27, PropertyGroup::Yellow, 260000, 22); // Ventnor Ave
            self._create_property(game_id, 28, PropertyGroup::Utility, 150000, 4); // Water Works
            self._create_property(game_id, 29, PropertyGroup::Yellow, 280000, 24); // Marvin Gardens
            
            self._create_property(game_id, 31, PropertyGroup::Green, 300000, 26); // Pacific Ave
            self._create_property(game_id, 32, PropertyGroup::Green, 300000, 26); // North Carolina Ave
            self._create_property(game_id, 34, PropertyGroup::Green, 320000, 28); // Pennsylvania Ave
            
            self._create_property(game_id, 35, PropertyGroup::Railroad, 200000, 25); // Short Line
            
            self._create_property(game_id, 37, PropertyGroup::DarkBlue, 350000, 35); // Park Place
            self._create_property(game_id, 39, PropertyGroup::DarkBlue, 400000, 50); // Boardwalk
            
            true
        }

        fn transfer_property(ref self: ContractState, game_id: u64, property_id: u8, to_player: ContractAddress, price: u256) -> bool {
            let mut world = self.world_default();
            let from_player = get_caller_address();
            let current_time = get_block_timestamp();

            // Get and validate property
            let mut property: Property = world.read_model((game_id, property_id));
            assert!(property.owner == Option::Some(from_player), "Not property owner");
            assert!(!property.is_mortgaged, "Cannot transfer mortgaged property");

            // Get player balances
            let mut from_currency: GameCurrency = world.read_model((game_id, from_player));
            let mut to_currency: GameCurrency = world.read_model((game_id, to_player));
            
            assert!(to_currency.balance >= price, "Buyer insufficient funds");

            // Transfer ownership
            property.owner = Option::Some(to_player);

            // Transfer money
            from_currency.balance += price;
            from_currency.total_earned += price;
            to_currency.balance -= price;
            to_currency.total_spent += price;

            // Update property counts
            let mut from_game_state: PlayerGameState = world.read_model((from_player, game_id));
            let mut to_game_state: PlayerGameState = world.read_model((to_player, game_id));
            from_game_state.properties_owned -= 1;
            to_game_state.properties_owned += 1;

            // Create transaction record
            let transaction_id = (get_block_timestamp() + game_id.into()).into();
            let transaction = PropertyTransaction {
                transaction_id,
                game_id,
                property_id,
                from_player: Option::Some(from_player),
                to_player,
                transaction_type: TransactionType::Sale,
                amount: price,
                timestamp: current_time,
            };

            // Write to world
            world.write_model(@property);
            world.write_model(@from_currency);
            world.write_model(@to_currency);
            world.write_model(@from_game_state);
            world.write_model(@to_game_state);
            world.write_model(@transaction);

            // Emit event
            world.emit_event(@PropertyTransferred {
                game_id,
                property_id,
                from_player,
                to_player,
                price,
                timestamp: current_time,
            });

            true
        }

        fn auction_property(ref self: ContractState, game_id: u64, property_id: u8, starting_bid: u256) -> bool {
            let mut world = self.world_default();
            let current_time = get_block_timestamp();

            // Validate property can be auctioned
            let property: Property = world.read_model((game_id, property_id));
            assert!(property.owner.is_none(), "Property already owned");

            // Create auction
            let auction = PropertyAuction {
                game_id,
                property_id,
                current_bid: starting_bid,
                current_bidder: Option::None,
                auction_end_time: current_time + AUCTION_DURATION,
                is_active: true,
                starting_bid,
            };

            world.write_model(@auction);

            // Emit event
            world.emit_event(@AuctionStarted {
                game_id,
                property_id,
                starting_bid,
                auction_end_time: auction.auction_end_time,
                timestamp: current_time,
            });

            true
        }

        fn place_bid(ref self: ContractState, game_id: u64, property_id: u8, bid_amount: u256) -> bool {
            let mut world = self.world_default();
            let bidder = get_caller_address();
            let current_time = get_block_timestamp();

            // Get auction
            let mut auction: PropertyAuction = world.read_model((game_id, property_id));
            assert!(auction.is_active, "No active auction");
            assert!(current_time < auction.auction_end_time, "Auction ended");

            // Validate bid
            let minimum_bid = auction.current_bid + MINIMUM_BID_INCREMENT;
            assert!(bid_amount >= minimum_bid, "Bid too low");

            // Check bidder balance
            let bidder_currency: GameCurrency = world.read_model((game_id, bidder));
            assert!(bidder_currency.balance >= bid_amount, "Insufficient funds");

            // Update auction
            auction.current_bid = bid_amount;
            auction.current_bidder = Option::Some(bidder);

            world.write_model(@auction);

            // Emit event
            world.emit_event(@BidPlaced {
                game_id,
                property_id,
                bidder,
                bid_amount,
                timestamp: current_time,
            });

            true
        }

        fn finalize_auction(ref self: ContractState, game_id: u64, property_id: u8) -> bool {
            let mut world = self.world_default();
            let current_time = get_block_timestamp();

            // Get auction
            let mut auction: PropertyAuction = world.read_model((game_id, property_id));
            assert!(auction.is_active, "No active auction");
            assert!(current_time >= auction.auction_end_time, "Auction still active");

            // Close auction
            auction.is_active = false;

            if auction.current_bidder.is_some() {
                let winner = auction.current_bidder.unwrap();
                
                // Transfer property
                let mut property: Property = world.read_model((game_id, property_id));
                property.owner = Option::Some(winner);

                // Process payment
                let mut winner_currency: GameCurrency = world.read_model((game_id, winner));
                winner_currency.balance -= auction.current_bid;
                winner_currency.total_spent += auction.current_bid;

                // Update property count
                let mut winner_game_state: PlayerGameState = world.read_model((winner, game_id));
                winner_game_state.properties_owned += 1;

                // Create transaction record
                let transaction_id = (get_block_timestamp() + game_id.into()).into();
                let transaction = PropertyTransaction {
                    transaction_id,
                    game_id,
                    property_id,
                    from_player: Option::None,
                    to_player: winner,
                    transaction_type: TransactionType::Purchase,
                    amount: auction.current_bid,
                    timestamp: current_time,
                };

                // Write to world
                world.write_model(@property);
                world.write_model(@winner_currency);
                world.write_model(@winner_game_state);
                world.write_model(@transaction);
            }

            world.write_model(@auction);

            // Emit event
            world.emit_event(@AuctionFinalized {
                game_id,
                property_id,
                winner: auction.current_bidder,
                winning_bid: auction.current_bid,
                timestamp: current_time,
            });

            true
        }

        fn force_sale(ref self: ContractState, game_id: u64, player: ContractAddress) -> bool {
            let mut world = self.world_default();
            
            // Check if player is bankrupt
            let player_currency: GameCurrency = world.read_model((game_id, player));
            let player_game_state: PlayerGameState = world.read_model((player, game_id));
            
            assert!(player_game_state.is_bankrupt, "Player not bankrupt");

            // Force sell all properties at discount
            let mut property_id: u8 = 1;
            while property_id <= 39 {
                let mut property: Property = world.read_model((game_id, property_id));
                
                if property.owner == Option::Some(player) {
                    // Calculate forced sale price (80% of current value)
                    let sale_price = (property.current_value * (100 - FORCE_SALE_DISCOUNT)) / 100;
                    
                    // Remove ownership
                    property.owner = Option::None;
                    property.development_level = 0; // Remove all developments
                    property.is_mortgaged = false;
                    
                    // Add money to player (partial recovery)
                    let mut updated_currency = player_currency;
                    updated_currency.balance += sale_price;
                    updated_currency.total_earned += sale_price;
                    
                    world.write_model(@property);
                    world.write_model(@updated_currency);
                }
                
                property_id += 1;
            };

            true
        }

        fn get_property_value(self: @ContractState, game_id: u64, property_id: u8) -> u256 {
            let world = self.world_default();
            let property: Property = world.read_model((game_id, property_id));
            
            // Apply market events
            let mut value = property.current_value;
            
            // Check for active market events affecting this property
            // This would involve checking MarketEvent models
            
            value
        }

        fn get_player_properties(self: @ContractState, game_id: u64, player: ContractAddress) -> Span<u8> {
            let world = self.world_default();
            let mut properties = ArrayTrait::new();
            
            let mut property_id: u8 = 1;
            while property_id <= 39 {
                let property: Property = world.read_model((game_id, property_id));
                if property.owner == Option::Some(player) {
                    properties.append(property_id);
                }
                property_id += 1;
            };
            
            properties.span()
        }

        fn get_color_group_monopoly_status(self: @ContractState, game_id: u64, color_group: PropertyGroup) -> Option<ContractAddress> {
            let world = self.world_default();
            let property_ids = self._get_property_ids_for_group(color_group);
            
            if property_ids.len() == 0 {
                return Option::None;
            }
            
            // Check first property owner
            let first_property: Property = world.read_model((game_id, *property_ids.at(0)));
            
            if first_property.owner.is_none() {
                return Option::None;
            }
            
            let potential_owner = first_property.owner.unwrap();
            
            // Check if same owner for all properties in group
            let mut i = 1;
            let mut same_owner = true;
            while i < property_ids.len() {
                let property: Property = world.read_model((game_id, *property_ids.at(i)));
                if property.owner != Option::Some(potential_owner) {
                    same_owner = false;
                    break;
                }
                i += 1;
            };
            
            if same_owner {
                Option::Some(potential_owner)
            } else {
                Option::None
            }
        }

        fn calculate_total_assets(self: @ContractState, game_id: u64, player: ContractAddress) -> u256 {
            let world = self.world_default();
            
            // Start with cash balance
            let currency: GameCurrency = world.read_model((game_id, player));
            let mut total = currency.balance;
            
            // Add property values
            let mut property_id: u8 = 1;
            while property_id <= 39 {
                let property: Property = world.read_model((game_id, property_id));
                if property.owner == Option::Some(player) {
                    if property.is_mortgaged {
                        // Mortgaged properties count as their mortgage value minus 10% interest
                        total += (property.current_value * 45) / 100; // 50% - 10% interest
                    } else {
                        total += property.current_value;
                    }
                }
                property_id += 1;
            };
            
            total
        }
    }

    // ===== INTERNAL FUNCTIONS =====

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> WorldStorage {
            self.world(@"whale_opoly")
        }

        fn _create_property(ref self: ContractState, game_id: u64, property_id: u8, color_group: PropertyGroup, base_value: u256, rent_multiplier: u256) {
            let mut world = self.world_default();
            
            let property = Property {
                game_id,
                property_id,
                owner: Option::None,
                base_value,
                current_value: base_value,
                development_level: 0,
                rent_multiplier,
                is_mortgaged: false,
                color_group,
            };
            
            world.write_model(@property);
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
    }
}