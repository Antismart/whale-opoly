use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
use dojo::model::{ModelStorage};
use dojo::world::{WorldStorage};
use dojo::event::{EventStorage};

use whale_opoly::models::{
    TreasuryBalance, BalanceType, SecurityAlert, SecurityAlertType, AlertSeverity
};

// ===== INTERFACES =====

#[starknet::interface]
pub trait ITreasury<T> {
    fn deposit_funds(ref self: T, amount: u256, balance_type: BalanceType) -> bool;
    fn withdraw_funds(ref self: T, amount: u256, balance_type: BalanceType, recipient: ContractAddress) -> bool;
    fn transfer_between_wallets(ref self: T, from_type: BalanceType, to_type: BalanceType, amount: u256) -> bool;
    fn set_daily_limit(ref self: T, balance_type: BalanceType, new_limit: u256) -> bool;
    fn emergency_pause(ref self: T, balance_type: BalanceType) -> bool;
    fn emergency_resume(ref self: T, balance_type: BalanceType) -> bool;
    fn get_balance(self: @T, balance_type: BalanceType) -> u256;
    fn get_total_treasury(self: @T) -> u256;
    fn check_daily_limits(self: @T, balance_type: BalanceType) -> (u256, u256); // (limit, spent)
    fn is_withdrawal_allowed(self: @T, balance_type: BalanceType, amount: u256) -> bool;
}

// ===== EVENTS =====

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct FundsDeposited {
    #[key]
    pub balance_type: BalanceType,
    pub amount: u256,
    pub depositor: ContractAddress,
    pub new_balance: u256,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct FundsWithdrawn {
    #[key]
    pub balance_type: BalanceType,
    pub amount: u256,
    pub recipient: ContractAddress,
    pub authorized_by: ContractAddress,
    pub new_balance: u256,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct FundsTransferred {
    #[key]
    pub from_type: BalanceType,
    #[key]
    pub to_type: BalanceType,
    pub amount: u256,
    pub authorized_by: ContractAddress,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct DailyLimitUpdated {
    #[key]
    pub balance_type: BalanceType,
    pub old_limit: u256,
    pub new_limit: u256,
    pub updated_by: ContractAddress,
    pub timestamp: u64,
}

#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct EmergencyAction {
    #[key]
    pub balance_type: BalanceType,
    pub action: EmergencyActionType,
    pub authorized_by: ContractAddress,
    pub timestamp: u64,
}

// ===== MODELS =====

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct TreasuryAccess {
    #[key]
    pub address: ContractAddress,
    pub can_deposit: bool,
    pub can_withdraw_hot: bool,
    pub can_withdraw_warm: bool,
    pub can_withdraw_cold: bool,
    pub can_transfer: bool,
    pub can_emergency: bool,
    pub granted_by: ContractAddress,
    pub granted_at: u64,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct TreasuryConfiguration {
    #[key]
    pub config_id: felt252,
    pub hot_wallet_max_ratio: u8,    // Max % of total funds in hot wallet
    pub warm_wallet_max_ratio: u8,   // Max % of total funds in warm wallet
    pub auto_rebalance_enabled: bool,
    pub emergency_pause_enabled: bool,
    pub multi_sig_threshold: u8,     // Number of signatures required
    pub last_updated: u64,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct WithdrawalRequest {
    #[key]
    pub request_id: u64,
    pub balance_type: BalanceType,
    pub amount: u256,
    pub recipient: ContractAddress,
    pub requested_by: ContractAddress,
    pub approved_by: Span<ContractAddress>,
    pub required_approvals: u8,
    pub is_executed: bool,
    pub is_cancelled: bool,
    pub expires_at: u64,
    pub created_at: u64,
}

// ===== ENUMS =====

#[derive(Copy, Drop, Serde, Debug, PartialEq, Introspect)]
pub enum EmergencyActionType {
    Pause,
    Resume,
    ForceTransfer,
    LockAccess,
}

// ===== CONSTANTS =====

const HOT_WALLET_MAX_RATIO: u8 = 5;   // 5% max in hot wallet
const WARM_WALLET_MAX_RATIO: u8 = 15; // 15% max in warm wallet
const MULTI_SIG_THRESHOLD: u8 = 3;    // 3 signatures required for large operations
const LARGE_WITHDRAWAL_THRESHOLD: u256 = 1000000000000000000; // 1 ETH equivalent

const DEFAULT_HOT_WALLET_DAILY_LIMIT: u256 = 100000000000000000; // 0.1 ETH
const DEFAULT_WARM_WALLET_DAILY_LIMIT: u256 = 1000000000000000000; // 1 ETH
const DEFAULT_COLD_STORAGE_DAILY_LIMIT: u256 = 10000000000000000000; // 10 ETH

const WITHDRAWAL_REQUEST_EXPIRY: u64 = 86400; // 24 hours

// ===== IMPLEMENTATION =====

#[dojo::contract]
pub mod treasury {
    use super::{
        ITreasury, FundsDeposited, FundsWithdrawn, FundsTransferred, DailyLimitUpdated, EmergencyAction,
        TreasuryBalance, BalanceType, SecurityAlert, SecurityAlertType, AlertSeverity,
        TreasuryAccess, TreasuryConfiguration, WithdrawalRequest, EmergencyActionType,
        HOT_WALLET_MAX_RATIO, WARM_WALLET_MAX_RATIO, MULTI_SIG_THRESHOLD, LARGE_WITHDRAWAL_THRESHOLD,
        DEFAULT_HOT_WALLET_DAILY_LIMIT, DEFAULT_WARM_WALLET_DAILY_LIMIT, DEFAULT_COLD_STORAGE_DAILY_LIMIT,
        WITHDRAWAL_REQUEST_EXPIRY
    };
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use dojo::model::{ModelStorage, ModelValueStorage};
    use dojo::world::{WorldStorage, WorldStorageTrait};
    use dojo::event::{EventStorage};

    #[abi(embed_v0)]
    impl TreasuryImpl of ITreasury<ContractState> {
        fn deposit_funds(ref self: ContractState, amount: u256, balance_type: BalanceType) -> bool {
            let mut world = self.world_default();
            let depositor = get_caller_address();
            let current_time = get_block_timestamp();

            // Check access permissions
            let access: TreasuryAccess = world.read_model(depositor);
            assert!(access.can_deposit, "No deposit permission");

            // Get current balance
            let mut balance: TreasuryBalance = world.read_model(balance_type);
            
            // Update balance
            balance.amount += amount;
            balance.last_updated = current_time;

            // Check wallet ratio limits after deposit
            if balance_type == BalanceType::HotWallet || balance_type == BalanceType::WarmWallet {
                let total_treasury = self._get_total_treasury_internal();
                self._validate_wallet_ratios(balance_type, balance.amount, total_treasury);
            }

            // Write updated balance
            world.write_model(@balance);

            // Log large deposits as security alerts
            if amount >= LARGE_WITHDRAWAL_THRESHOLD {
                self._create_security_alert(
                    SecurityAlertType::LargeTransaction,
                    AlertSeverity::Medium,
                    'Large deposit detected'
                );
            }

            // Emit event
            world.emit_event(@FundsDeposited {
                balance_type,
                amount,
                depositor,
                new_balance: balance.amount,
                timestamp: current_time,
            });

            true
        }

        fn withdraw_funds(ref self: ContractState, amount: u256, balance_type: BalanceType, recipient: ContractAddress) -> bool {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let current_time = get_block_timestamp();

            // Check access permissions
            let access: TreasuryAccess = world.read_model(caller);
            let can_withdraw = match balance_type {
                BalanceType::HotWallet => access.can_withdraw_hot,
                BalanceType::WarmWallet => access.can_withdraw_warm,
                BalanceType::ColdStorage => access.can_withdraw_cold,
                _ => false,
            };
            assert!(can_withdraw, "No withdrawal permission");

            // Get current balance
            let mut balance: TreasuryBalance = world.read_model(balance_type);
            assert!(balance.amount >= amount, "Insufficient funds");

            // Check daily limits
            assert!(self._check_daily_limit(balance_type, amount), "Daily limit exceeded");

            // For large withdrawals, require multi-sig
            if amount >= LARGE_WITHDRAWAL_THRESHOLD {
                // In a full implementation, this would check for required signatures
                // For now, we'll just log an alert
                self._create_security_alert(
                    SecurityAlertType::LargeTransaction,
                    AlertSeverity::High,
                    'Large withdrawal requested'
                );
            }

            // Update balance and daily spent
            balance.amount -= amount;
            balance.daily_spent += amount;
            balance.last_updated = current_time;

            // Write updated balance
            world.write_model(@balance);

            // Emit event
            world.emit_event(@FundsWithdrawn {
                balance_type,
                amount,
                recipient,
                authorized_by: caller,
                new_balance: balance.amount,
                timestamp: current_time,
            });

            true
        }

        fn transfer_between_wallets(ref self: ContractState, from_type: BalanceType, to_type: BalanceType, amount: u256) -> bool {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let current_time = get_block_timestamp();

            // Check access permissions
            let access: TreasuryAccess = world.read_model(caller);
            assert!(access.can_transfer, "No transfer permission");

            // Get balances
            let mut from_balance: TreasuryBalance = world.read_model(from_type);
            let mut to_balance: TreasuryBalance = world.read_model(to_type);

            assert!(from_balance.amount >= amount, "Insufficient funds in source wallet");

            // Perform transfer
            from_balance.amount -= amount;
            from_balance.last_updated = current_time;
            to_balance.amount += amount;
            to_balance.last_updated = current_time;

            // Validate wallet ratios after transfer
            let total_treasury = self._get_total_treasury_internal();
            if to_type == BalanceType::HotWallet || to_type == BalanceType::WarmWallet {
                self._validate_wallet_ratios(to_type, to_balance.amount, total_treasury);
            }

            // Write updated balances
            world.write_model(@from_balance);
            world.write_model(@to_balance);

            // Emit event
            world.emit_event(@FundsTransferred {
                from_type,
                to_type,
                amount,
                authorized_by: caller,
                timestamp: current_time,
            });

            true
        }

        fn set_daily_limit(ref self: ContractState, balance_type: BalanceType, new_limit: u256) -> bool {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let current_time = get_block_timestamp();

            // Only admin can set limits (would be checked via access control)
            let access: TreasuryAccess = world.read_model(caller);
            assert!(access.can_emergency, "Admin permission required");

            // Get current balance
            let mut balance: TreasuryBalance = world.read_model(balance_type);
            let old_limit = balance.daily_limit;

            // Update limit
            balance.daily_limit = new_limit;
            balance.last_updated = current_time;

            // Reset daily spent if new limit is higher
            if new_limit > old_limit {
                balance.daily_spent = 0;
            }

            world.write_model(@balance);

            // Emit event
            world.emit_event(@DailyLimitUpdated {
                balance_type,
                old_limit,
                new_limit,
                updated_by: caller,
                timestamp: current_time,
            });

            true
        }

        fn emergency_pause(ref self: ContractState, balance_type: BalanceType) -> bool {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let current_time = get_block_timestamp();

            // Check emergency permissions
            let access: TreasuryAccess = world.read_model(caller);
            assert!(access.can_emergency, "Emergency permission required");

            // Set daily limit to 0 to effectively pause
            let mut balance: TreasuryBalance = world.read_model(balance_type);
            balance.daily_limit = 0;
            balance.last_updated = current_time;

            world.write_model(@balance);

            // Create security alert
            self._create_security_alert(
                SecurityAlertType::SystemAnomaly,
                AlertSeverity::Critical,
                'Emergency pause activated'
            );

            // Emit event
            world.emit_event(@EmergencyAction {
                balance_type,
                action: EmergencyActionType::Pause,
                authorized_by: caller,
                timestamp: current_time,
            });

            true
        }

        fn emergency_resume(ref self: ContractState, balance_type: BalanceType) -> bool {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let current_time = get_block_timestamp();

            // Check emergency permissions
            let access: TreasuryAccess = world.read_model(caller);
            assert!(access.can_emergency, "Emergency permission required");

            // Restore default daily limits
            let mut balance: TreasuryBalance = world.read_model(balance_type);
            let default_limit = match balance_type {
                BalanceType::HotWallet => DEFAULT_HOT_WALLET_DAILY_LIMIT,
                BalanceType::WarmWallet => DEFAULT_WARM_WALLET_DAILY_LIMIT,
                BalanceType::ColdStorage => DEFAULT_COLD_STORAGE_DAILY_LIMIT,
                _ => 0,
            };

            balance.daily_limit = default_limit;
            balance.daily_spent = 0; // Reset daily spending
            balance.last_updated = current_time;

            world.write_model(@balance);

            // Emit event
            world.emit_event(@EmergencyAction {
                balance_type,
                action: EmergencyActionType::Resume,
                authorized_by: caller,
                timestamp: current_time,
            });

            true
        }

        fn get_balance(self: @ContractState, balance_type: BalanceType) -> u256 {
            let world = self.world_default();
            let balance: TreasuryBalance = world.read_model(balance_type);
            balance.amount
        }

        fn get_total_treasury(self: @ContractState) -> u256 {
            self._get_total_treasury_internal()
        }

        fn check_daily_limits(self: @ContractState, balance_type: BalanceType) -> (u256, u256) {
            let world = self.world_default();
            let balance: TreasuryBalance = world.read_model(balance_type);
            (balance.daily_limit, balance.daily_spent)
        }

        fn is_withdrawal_allowed(self: @ContractState, balance_type: BalanceType, amount: u256) -> bool {
            let world = self.world_default();
            let balance: TreasuryBalance = world.read_model(balance_type);
            
            // Check sufficient funds
            if balance.amount < amount {
                return false;
            }

            // Check daily limit
            if balance.daily_spent + amount > balance.daily_limit {
                return false;
            }

            true
        }
    }

    // ===== INTERNAL FUNCTIONS =====

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> WorldStorage {
            self.world(@"whale_opoly")
        }

        fn _get_total_treasury_internal(self: @ContractState) -> u256 {
            let world = self.world_default();
            
            let hot: TreasuryBalance = world.read_model(BalanceType::HotWallet);
            let warm: TreasuryBalance = world.read_model(BalanceType::WarmWallet);
            let cold: TreasuryBalance = world.read_model(BalanceType::ColdStorage);
            let insurance: TreasuryBalance = world.read_model(BalanceType::Insurance);
            let operating: TreasuryBalance = world.read_model(BalanceType::Operating);

            hot.amount + warm.amount + cold.amount + insurance.amount + operating.amount
        }

        fn _validate_wallet_ratios(self: @ContractState, balance_type: BalanceType, wallet_amount: u256, total_treasury: u256) {
            if total_treasury == 0 {
                return;
            }

            let ratio_percent = (wallet_amount * 100) / total_treasury;

            match balance_type {
                BalanceType::HotWallet => {
                    assert!(ratio_percent.try_into().unwrap() <= HOT_WALLET_MAX_RATIO, "Hot wallet ratio exceeded");
                },
                BalanceType::WarmWallet => {
                    assert!(ratio_percent.try_into().unwrap() <= WARM_WALLET_MAX_RATIO, "Warm wallet ratio exceeded");
                },
                _ => {}, // No ratio limits for other wallet types
            }
        }

        fn _check_daily_limit(self: @ContractState, balance_type: BalanceType, amount: u256) -> bool {
            let world = self.world_default();
            let balance: TreasuryBalance = world.read_model(balance_type);
            
            // Reset daily spent if it's a new day (simplified check)
            let current_time = get_block_timestamp();
            let seconds_per_day = 86400;
            let last_update_day = balance.last_updated / seconds_per_day;
            let current_day = current_time / seconds_per_day;

            if current_day > last_update_day {
                // It's a new day, reset daily spent
                return amount <= balance.daily_limit;
            }

            balance.daily_spent + amount <= balance.daily_limit
        }

        fn _create_security_alert(ref self: ContractState, alert_type: SecurityAlertType, severity: AlertSeverity, description: felt252) {
            let mut world = self.world_default();
            let alert_id = (get_block_timestamp()).into();
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
