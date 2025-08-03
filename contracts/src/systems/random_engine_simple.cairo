use starknet::{ContractAddress, get_caller_address, get_block_timestamp, get_block_info};
use dojo::model::{ModelStorage};
use dojo::world::{WorldStorage};
use dojo::event::{EventStorage};

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct RandomnessCommitted {
    #[key]
    pub game_id: u64,
    #[key]
    pub player: ContractAddress,
    pub commitment: felt252,
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
    pub timestamp: u64,
}

#[starknet::interface]
trait IRandomEngine<TContractState> {
    fn commit_randomness(ref self: TContractState, game_id: u64, commitment: felt252) -> bool;
    fn reveal_randomness(ref self: TContractState, game_id: u64, nonce: felt252) -> bool;
    fn generate_dice_roll(ref self: TContractState, game_id: u64, player: ContractAddress) -> (u8, u8);
}

#[dojo::contract]
mod random_engine {
    use super::{IRandomEngine, RandomnessCommitted, DiceGenerated};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp, get_block_info};
    use dojo::model::{ModelStorage};
    use dojo::world::{WorldStorage};
    use dojo::event::{EventStorage};
    use whale_opoly::models::{RandomSeed};

    #[abi(embed_v0)]
    impl RandomEngineImpl of IRandomEngine<ContractState> {
        fn commit_randomness(ref self: ContractState, game_id: u64, commitment: felt252) -> bool {
            let mut world = self.world(@"whale_opoly");
            let player = get_caller_address();
            let timestamp = get_block_timestamp();
            
            world.emit_event(@RandomnessCommitted {
                game_id,
                player,
                commitment,
                timestamp,
            });
            
            true
        }

        fn reveal_randomness(ref self: ContractState, game_id: u64, nonce: felt252) -> bool {
            // Basic reveal implementation
            true
        }

        fn generate_dice_roll(ref self: ContractState, game_id: u64, player: ContractAddress) -> (u8, u8) {
            let mut world = self.world(@"whale_opoly");
            let timestamp = get_block_timestamp();
            let block_info = get_block_info();
            
            // Simple entropy generation
            let entropy = timestamp + block_info.block_number.into() + game_id.into();
            
            // Generate dice (1-6)
            let dice1: u8 = ((entropy % 6) + 1).try_into().unwrap();
            let dice2: u8 = (((entropy / 6) % 6) + 1).try_into().unwrap();
            
            world.emit_event(@DiceGenerated {
                game_id,
                player,
                dice1,
                dice2,
                timestamp,
            });
            
            (dice1, dice2)
        }
    }
}
