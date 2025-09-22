import type { SchemaType as ISchemaType } from "@dojoengine/sdk";

import { CairoCustomEnum, CairoOption, CairoOptionVariant } from 'starknet';

// BigNumberish type definition for starknet v7 compatibility
export type BigNumberish = string | number | bigint;

// Type definition for `whale_opoly::models::DirectionsAvailable` struct
export interface DirectionsAvailable {
	player: string;
	directions: Array<DirectionEnum>;
}

// Type definition for `whale_opoly::models::GameCurrency` struct
export interface GameCurrency {
	game_id: BigNumberish;
	player: string;
	balance: BigNumberish;
	starting_amount: BigNumberish;
	total_earned: BigNumberish;
	total_spent: BigNumberish;
}

// Type definition for `whale_opoly::models::GameState` struct
export interface GameState {
	game_id: BigNumberish;
	players: Array<string>;
	status: GameStatusEnum;
	entry_tier: GameTierEnum;
	total_pool: BigNumberish;
	current_turn: BigNumberish;
	start_time: BigNumberish;
	turn_deadline: BigNumberish;
	winner: CairoOption<string>;
}

// Type definition for `whale_opoly::models::GlobalPlayerState` struct
export interface GlobalPlayerState {
	player: string;
	active_games: Array<BigNumberish>;
	total_staked: BigNumberish;
	total_winnings: BigNumberish;
	reputation_score: BigNumberish;
	verification_level: VerificationTierEnum;
	registration_time: BigNumberish;
}

// Type definition for `whale_opoly::models::MarketEvent` struct
export interface MarketEvent {
	event_id: BigNumberish;
	game_id: BigNumberish;
	event_type: MarketEventTypeEnum;
	affected_properties: Array<BigNumberish>;
	multiplier: BigNumberish;
	duration: BigNumberish;
	remaining_duration: BigNumberish;
	created_at: BigNumberish;
}

// Type definition for `whale_opoly::models::Moves` struct
export interface Moves {
	player: string;
	remaining: BigNumberish;
	last_direction: CairoOption<DirectionEnum>;
	can_move: boolean;
}

// Type definition for `whale_opoly::models::PlayerGameState` struct
export interface PlayerGameState {
	player: string;
	game_id: BigNumberish;
	position: BigNumberish;
	balance: BigNumberish;
	properties_owned: BigNumberish;
	is_bankrupt: boolean;
	is_in_jail: boolean;
	jail_turns: BigNumberish;
	last_action_time: BigNumberish;
}

// Type definition for `whale_opoly::models::PlayerPosition` struct
export interface PlayerPosition {
	player: string;
	game_id: BigNumberish;
	position: BigNumberish;
	last_move_time: BigNumberish;
	moves_remaining: BigNumberish;
}

// Type definition for `whale_opoly::models::Position` struct
export interface Position {
	player: string;
	vec: Vec2;
}

// Type definition for `whale_opoly::models::PositionCount` struct
export interface PositionCount {
	identity: string;
	position: Array<[BigNumberish, BigNumberish]>;
}

// Type definition for `whale_opoly::models::Property` struct
export interface Property {
	game_id: BigNumberish;
	property_id: BigNumberish;
	owner: CairoOption<string>;
	base_value: BigNumberish;
	current_value: BigNumberish;
	development_level: BigNumberish;
	rent_multiplier: BigNumberish;
	is_mortgaged: boolean;
	color_group: PropertyGroupEnum;
}

// Type definition for `whale_opoly::models::PropertyTransaction` struct
export interface PropertyTransaction {
	transaction_id: BigNumberish;
	game_id: BigNumberish;
	property_id: BigNumberish;
	from_player: CairoOption<string>;
	to_player: string;
	transaction_type: TransactionTypeEnum;
	amount: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::models::RandomSeed` struct
export interface RandomSeed {
	game_id: BigNumberish;
	round: BigNumberish;
	seed: BigNumberish;
	block_hash: BigNumberish;
	player_commits: Array<BigNumberish>;
	reveal_deadline: BigNumberish;
	is_revealed: boolean;
}

// Type definition for `whale_opoly::models::SecurityAlert` struct
export interface SecurityAlert {
	alert_id: BigNumberish;
	game_id: CairoOption<BigNumberish>;
	player: CairoOption<string>;
	alert_type: SecurityAlertTypeEnum;
	severity: AlertSeverityEnum;
	description: BigNumberish;
	timestamp: BigNumberish;
	is_resolved: boolean;
}

// Type definition for `whale_opoly::models::TreasuryBalance` struct
export interface TreasuryBalance {
	balance_type: BalanceTypeEnum;
	amount: BigNumberish;
	last_updated: BigNumberish;
	daily_limit: BigNumberish;
	daily_spent: BigNumberish;
}

// Type definition for `whale_opoly::models::Vec2` struct
export interface Vec2 {
	x: BigNumberish;
	y: BigNumberish;
}

// Type definition for `whale_opoly::systems::economics::BankingOperation` struct
export interface BankingOperation {
	operation_id: BigNumberish;
	game_id: BigNumberish;
	player: string;
	operation_type: BankingOpTypeEnum;
	amount: BigNumberish;
	interest_rate: BigNumberish;
	duration: BigNumberish;
	is_active: boolean;
	created_at: BigNumberish;
	expires_at: BigNumberish;
}

// Type definition for `whale_opoly::systems::economics::EconomicState` struct
export interface EconomicState {
	game_id: BigNumberish;
	total_money_supply: BigNumberish;
	total_property_value: BigNumberish;
	inflation_rate: BigNumberish;
	interest_rate: BigNumberish;
	tax_rate: BigNumberish;
	last_economic_update: BigNumberish;
	market_volatility_index: BigNumberish;
}

// Type definition for `whale_opoly::systems::economics::PlayerEconomicData` struct
export interface PlayerEconomicData {
	game_id: BigNumberish;
	player: string;
	net_worth: BigNumberish;
	cash_flow: BigNumberish;
	debt_ratio: BigNumberish;
	property_portfolio_value: BigNumberish;
	last_interest_payment: BigNumberish;
	total_taxes_paid: BigNumberish;
	total_interest_earned: BigNumberish;
}

// Type definition for `whale_opoly::systems::market_events::EventImpactHistory` struct
export interface EventImpactHistory {
	game_id: BigNumberish;
	property_id: BigNumberish;
	cumulative_impact: BigNumberish;
	recent_events: Array<BigNumberish>;
	base_value_drift: BigNumberish;
	volatility_score: BigNumberish;
}

// Type definition for `whale_opoly::systems::market_events::MarketEventSchedule` struct
export interface MarketEventSchedule {
	game_id: BigNumberish;
	next_event_time: BigNumberish;
	event_frequency: BigNumberish;
	last_event_time: BigNumberish;
	total_events_triggered: BigNumberish;
	market_stability_index: BigNumberish;
}

// Type definition for `whale_opoly::systems::market_events::PlayerEventExposure` struct
export interface PlayerEventExposure {
	game_id: BigNumberish;
	player: string;
	total_gains: BigNumberish;
	total_losses: BigNumberish;
	events_experienced: BigNumberish;
	risk_tolerance: BigNumberish;
	hedge_ratio: BigNumberish;
}

// Type definition for `whale_opoly::systems::property_management::PropertyAuction` struct
export interface PropertyAuction {
	game_id: BigNumberish;
	property_id: BigNumberish;
	current_bid: BigNumberish;
	current_bidder: CairoOption<string>;
	auction_end_time: BigNumberish;
	is_active: boolean;
	starting_bid: BigNumberish;
}

// Type definition for `whale_opoly::systems::random_engine::DiceRollHistory` struct
export interface DiceRollHistory {
	game_id: BigNumberish;
	player: string;
	recent_rolls: Array<BigNumberish>;
	consecutive_doubles: BigNumberish;
	consecutive_identical: BigNumberish;
	last_updated: BigNumberish;
}

// Type definition for `whale_opoly::systems::random_engine::EntropyPool` struct
export interface EntropyPool {
	game_id: BigNumberish;
	accumulated_entropy: BigNumberish;
	block_hashes: Array<BigNumberish>;
	player_contributions: Array<BigNumberish>;
	external_entropy: Array<BigNumberish>;
	last_updated: BigNumberish;
	usage_count: BigNumberish;
}

// Type definition for `whale_opoly::systems::random_engine::RandomnessAudit` struct
export interface RandomnessAudit {
	audit_id: BigNumberish;
	game_id: BigNumberish;
	round: BigNumberish;
	operation_type: RandomnessOperationEnum;
	input_entropy: BigNumberish;
	output_value: BigNumberish;
	timestamp: BigNumberish;
	block_number: BigNumberish;
}

// Type definition for `whale_opoly::systems::random_engine::RandomnessCommitment` struct
export interface RandomnessCommitment {
	game_id: BigNumberish;
	round: BigNumberish;
	player: string;
	commitment_hash: BigNumberish;
	is_revealed: boolean;
	revealed_nonce: CairoOption<BigNumberish>;
	committed_at: BigNumberish;
	revealed_at: CairoOption<BigNumberish>;
}

// Type definition for `whale_opoly::systems::treasury::TreasuryAccess` struct
export interface TreasuryAccess {
	address: string;
	can_deposit: boolean;
	can_withdraw_hot: boolean;
	can_withdraw_warm: boolean;
	can_withdraw_cold: boolean;
	can_transfer: boolean;
	can_emergency: boolean;
	granted_by: string;
	granted_at: BigNumberish;
}

// Type definition for `whale_opoly::systems::treasury::TreasuryConfiguration` struct
export interface TreasuryConfiguration {
	config_id: BigNumberish;
	hot_wallet_max_ratio: BigNumberish;
	warm_wallet_max_ratio: BigNumberish;
	auto_rebalance_enabled: boolean;
	emergency_pause_enabled: boolean;
	multi_sig_threshold: BigNumberish;
	last_updated: BigNumberish;
}

// Type definition for `whale_opoly::systems::treasury::WithdrawalRequest` struct
export interface WithdrawalRequest {
	request_id: BigNumberish;
	balance_type: BalanceTypeEnum;
	amount: BigNumberish;
	recipient: string;
	requested_by: string;
	approved_by: Array<string>;
	required_approvals: BigNumberish;
	is_executed: boolean;
	is_cancelled: boolean;
	expires_at: BigNumberish;
	created_at: BigNumberish;
}

// Type definition for `whale_opoly::systems::board_actions::DiceRolled` struct
export interface DiceRolled {
	game_id: BigNumberish;
	player: string;
	dice1: BigNumberish;
	dice2: BigNumberish;
	total: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::board_actions::PlayerMoved` struct
export interface PlayerMoved {
	game_id: BigNumberish;
	player: string;
	from_position: BigNumberish;
	to_position: BigNumberish;
	passed_go: boolean;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::board_actions::PropertyPurchased` struct
export interface PropertyPurchased {
	game_id: BigNumberish;
	property_id: BigNumberish;
	buyer: string;
	price: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::board_actions::RentPaid` struct
export interface RentPaid {
	game_id: BigNumberish;
	property_id: BigNumberish;
	payer: string;
	owner: string;
	amount: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::board_actions::TurnEnded` struct
export interface TurnEnded {
	game_id: BigNumberish;
	player: string;
	next_player: string;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::economics::EconomicRebalance` struct
export interface EconomicRebalance {
	game_id: BigNumberish;
	total_money_supply: BigNumberish;
	total_property_value: BigNumberish;
	liquidity_ratio: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::economics::InflationAdjustment` struct
export interface InflationAdjustment {
	game_id: BigNumberish;
	old_base_amount: BigNumberish;
	new_amount: BigNumberish;
	inflation_rate: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::economics::InterestPaid` struct
export interface InterestPaid {
	game_id: BigNumberish;
	player: string;
	amount: BigNumberish;
	balance_before: BigNumberish;
	balance_after: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::economics::MarketVolatilityApplied` struct
export interface MarketVolatilityApplied {
	game_id: BigNumberish;
	event_type: MarketEventTypeEnum;
	affected_properties: Array<BigNumberish>;
	magnitude: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::economics::PropertyTaxAssessed` struct
export interface PropertyTaxAssessed {
	game_id: BigNumberish;
	player: string;
	total_property_value: BigNumberish;
	tax_amount: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::economics::SalaryPaid` struct
export interface SalaryPaid {
	game_id: BigNumberish;
	player: string;
	base_salary: BigNumberish;
	bonus: BigNumberish;
	total_amount: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::game_manager::GameCreated` struct
export interface GameCreated {
	game_id: BigNumberish;
	creator: string;
	tier: GameTierEnum;
	max_players: BigNumberish;
	created_at: BigNumberish;
}

// Type definition for `whale_opoly::systems::game_manager::GameEnded` struct
export interface GameEnded {
	game_id: BigNumberish;
	winner: CairoOption<string>;
	total_pool: BigNumberish;
	ended_at: BigNumberish;
}

// Type definition for `whale_opoly::systems::game_manager::GameStarted` struct
export interface GameStarted {
	game_id: BigNumberish;
	players: Array<string>;
	started_at: BigNumberish;
}

// Type definition for `whale_opoly::systems::game_manager::PlayerJoined` struct
export interface PlayerJoined {
	game_id: BigNumberish;
	player: string;
	player_count: BigNumberish;
	joined_at: BigNumberish;
}

// Type definition for `whale_opoly::systems::market_events::CompoundEventActivated` struct
export interface CompoundEventActivated {
	game_id: BigNumberish;
	primary_event: BigNumberish;
	secondary_event: BigNumberish;
	compound_multiplier: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::market_events::EmergencyIntervention` struct
export interface EmergencyIntervention {
	game_id: BigNumberish;
	intervention_type: InterventionTypeEnum;
	triggered_by_event: CairoOption<BigNumberish>;
	impact_multiplier: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::market_events::MarketEventResolved` struct
export interface MarketEventResolved {
	game_id: BigNumberish;
	event_id: BigNumberish;
	total_impact: BigNumberish;
	affected_players: Array<string>;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::market_events::MarketEventTriggered` struct
export interface MarketEventTriggered {
	game_id: BigNumberish;
	event_id: BigNumberish;
	event_type: MarketEventTypeEnum;
	magnitude: BigNumberish;
	target_group: CairoOption<PropertyGroupEnum>;
	duration: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::market_events::PropertyValuesUpdated` struct
export interface PropertyValuesUpdated {
	game_id: BigNumberish;
	event_id: BigNumberish;
	property_ids: Array<BigNumberish>;
	old_values: Array<BigNumberish>;
	new_values: Array<BigNumberish>;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::property_management::AuctionFinalized` struct
export interface AuctionFinalized {
	game_id: BigNumberish;
	property_id: BigNumberish;
	winner: CairoOption<string>;
	winning_bid: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::property_management::AuctionStarted` struct
export interface AuctionStarted {
	game_id: BigNumberish;
	property_id: BigNumberish;
	starting_bid: BigNumberish;
	auction_end_time: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::property_management::BidPlaced` struct
export interface BidPlaced {
	game_id: BigNumberish;
	property_id: BigNumberish;
	bidder: string;
	bid_amount: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::property_management::PropertyDeveloped` struct
export interface PropertyDeveloped {
	game_id: BigNumberish;
	property_id: BigNumberish;
	owner: string;
	development_level: BigNumberish;
	cost: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::property_management::PropertyTransferred` struct
export interface PropertyTransferred {
	game_id: BigNumberish;
	property_id: BigNumberish;
	from_player: string;
	to_player: string;
	price: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::random_engine::CardDrawn` struct
export interface CardDrawn {
	game_id: BigNumberish;
	deck_type: DeckTypeEnum;
	card_id: BigNumberish;
	drawn_by: string;
	entropy_used: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::random_engine::DiceGenerated` struct
export interface DiceGenerated {
	game_id: BigNumberish;
	player: string;
	dice1: BigNumberish;
	dice2: BigNumberish;
	entropy_used: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::random_engine::RandomnessCommitted` struct
export interface RandomnessCommitted {
	game_id: BigNumberish;
	round: BigNumberish;
	player: string;
	commitment_hash: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::random_engine::RandomnessIntegrityAlert` struct
export interface RandomnessIntegrityAlert {
	game_id: BigNumberish;
	round: BigNumberish;
	issue_type: IntegrityIssueEnum;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::random_engine::RandomnessRevealed` struct
export interface RandomnessRevealed {
	game_id: BigNumberish;
	round: BigNumberish;
	player: string;
	revealed_nonce: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::security_simple::SecurityAlertTriggered` struct
export interface SecurityAlertTriggered {
	game_id: BigNumberish;
	player: string;
	alert_type: BigNumberish;
	severity: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::treasury::DailyLimitUpdated` struct
export interface DailyLimitUpdated {
	balance_type: BalanceTypeEnum;
	old_limit: BigNumberish;
	new_limit: BigNumberish;
	updated_by: string;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::treasury::EmergencyAction` struct
export interface EmergencyAction {
	balance_type: BalanceTypeEnum;
	action: EmergencyActionTypeEnum;
	authorized_by: string;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::treasury::FundsDeposited` struct
export interface FundsDeposited {
	balance_type: BalanceTypeEnum;
	amount: BigNumberish;
	depositor: string;
	new_balance: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::treasury::FundsTransferred` struct
export interface FundsTransferred {
	from_type: BalanceTypeEnum;
	to_type: BalanceTypeEnum;
	amount: BigNumberish;
	authorized_by: string;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::treasury::FundsWithdrawn` struct
export interface FundsWithdrawn {
	balance_type: BalanceTypeEnum;
	amount: BigNumberish;
	recipient: string;
	authorized_by: string;
	new_balance: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::treasury::WithdrawalApproved` struct
export interface WithdrawalApproved {
	request_id: BigNumberish;
	approver: string;
	approvals_count: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::systems::treasury::WithdrawalRequested` struct
export interface WithdrawalRequested {
	request_id: BigNumberish;
	balance_type: BalanceTypeEnum;
	amount: BigNumberish;
	recipient: string;
	requested_by: string;
	required_approvals: BigNumberish;
	expires_at: BigNumberish;
	timestamp: BigNumberish;
}

// Type definition for `whale_opoly::models::AlertSeverity` enum
export const alertSeverity = [
	'Low',
	'Medium',
	'High',
	'Critical',
] as const;
export type AlertSeverity = { [key in typeof alertSeverity[number]]: string };
export type AlertSeverityEnum = CairoCustomEnum;

// Type definition for `whale_opoly::models::BalanceType` enum
export const balanceType = [
	'HotWallet',
	'WarmWallet',
	'ColdStorage',
	'Insurance',
	'Operating',
] as const;
export type BalanceType = { [key in typeof balanceType[number]]: string };
export type BalanceTypeEnum = CairoCustomEnum;

// Type definition for `whale_opoly::models::Direction` enum
export const direction = [
	'Left',
	'Right',
	'Up',
	'Down',
] as const;
export type Direction = { [key in typeof direction[number]]: string };
export type DirectionEnum = CairoCustomEnum;

// Type definition for `whale_opoly::models::GameStatus` enum
export const gameStatus = [
	'Lobby',
	'Starting',
	'Active',
	'Paused',
	'Completing',
	'Finished',
] as const;
export type GameStatus = { [key in typeof gameStatus[number]]: string };
export type GameStatusEnum = CairoCustomEnum;

// Type definition for `whale_opoly::models::GameTier` enum
export const gameTier = [
	'Bronze',
	'Silver',
	'Gold',
	'Platinum',
] as const;
export type GameTier = { [key in typeof gameTier[number]]: string };
export type GameTierEnum = CairoCustomEnum;

// Type definition for `whale_opoly::models::MarketEventType` enum
export const marketEventType = [
	'Boom',
	'Crash',
	'Disaster',
	'Policy',
	'CryptoNews',
] as const;
export type MarketEventType = { [key in typeof marketEventType[number]]: string };
export type MarketEventTypeEnum = CairoCustomEnum;

// Type definition for `whale_opoly::models::PropertyGroup` enum
export const propertyGroup = [
	'Brown',
	'LightBlue',
	'Pink',
	'Orange',
	'Red',
	'Yellow',
	'Green',
	'DarkBlue',
	'Railroad',
	'Utility',
	'Special',
] as const;
export type PropertyGroup = { [key in typeof propertyGroup[number]]: string };
export type PropertyGroupEnum = CairoCustomEnum;

// Type definition for `whale_opoly::models::SecurityAlertType` enum
export const securityAlertType = [
	'SuspiciousActivity',
	'LargeTransaction',
	'UnusualPattern',
	'SystemAnomaly',
	'PermissionViolation',
] as const;
export type SecurityAlertType = { [key in typeof securityAlertType[number]]: string };
export type SecurityAlertTypeEnum = CairoCustomEnum;

// Type definition for `whale_opoly::models::TransactionType` enum
export const transactionType = [
	'Purchase',
	'Sale',
	'Rent',
	'Mortgage',
	'Unmortgage',
	'Development',
	'Tax',
] as const;
export type TransactionType = { [key in typeof transactionType[number]]: string };
export type TransactionTypeEnum = CairoCustomEnum;

// Type definition for `whale_opoly::models::VerificationTier` enum
export const verificationTier = [
	'Basic',
	'Enhanced',
	'Premium',
] as const;
export type VerificationTier = { [key in typeof verificationTier[number]]: string };
export type VerificationTierEnum = CairoCustomEnum;

// Type definition for `whale_opoly::systems::economics::BankingOpType` enum
export const bankingOpType = [
	'Loan',
	'Mortgage',
	'Investment',
	'Insurance',
] as const;
export type BankingOpType = { [key in typeof bankingOpType[number]]: string };
export type BankingOpTypeEnum = CairoCustomEnum;

// Type definition for `whale_opoly::systems::random_engine::RandomnessOperation` enum
export const randomnessOperation = [
	'DiceRoll',
	'CardDraw',
	'MarketEvent',
	'Other',
] as const;
export type RandomnessOperation = { [key in typeof randomnessOperation[number]]: string };
export type RandomnessOperationEnum = CairoCustomEnum;

// Type definition for `whale_opoly::systems::market_events::InterventionType` enum
export const interventionType = [
	'MarketStabilization',
	'LiquidityInjection',
	'PriceSupport',
	'AntiMonopoly',
	'EmergencyBailout',
] as const;
export type InterventionType = { [key in typeof interventionType[number]]: string };
export type InterventionTypeEnum = CairoCustomEnum;

// Type definition for `whale_opoly::systems::random_engine::DeckType` enum
export const deckType = [
	'Chance',
	'CommunityChest',
] as const;
export type DeckType = { [key in typeof deckType[number]]: string };
export type DeckTypeEnum = CairoCustomEnum;

// Type definition for `whale_opoly::systems::random_engine::IntegrityIssue` enum
export const integrityIssue = [
	'MissingCommitment',
	'LateReveal',
	'InvalidReveal',
	'InsufficientEntropy',
	'TimingAttack',
] as const;
export type IntegrityIssue = { [key in typeof integrityIssue[number]]: string };
export type IntegrityIssueEnum = CairoCustomEnum;

// Type definition for `whale_opoly::systems::treasury::EmergencyActionType` enum
export const emergencyActionType = [
	'Pause',
	'Resume',
	'ForceTransfer',
	'LockAccess',
] as const;
export type EmergencyActionType = { [key in typeof emergencyActionType[number]]: string };
export type EmergencyActionTypeEnum = CairoCustomEnum;

export interface SchemaType extends ISchemaType {
	whale_opoly: {
		DirectionsAvailable: DirectionsAvailable,
		GameCurrency: GameCurrency,
		GameState: GameState,
		GlobalPlayerState: GlobalPlayerState,
		MarketEvent: MarketEvent,
		Moves: Moves,
		PlayerGameState: PlayerGameState,
		PlayerPosition: PlayerPosition,
		Position: Position,
		PositionCount: PositionCount,
		Property: Property,
		PropertyTransaction: PropertyTransaction,
		RandomSeed: RandomSeed,
		SecurityAlert: SecurityAlert,
		TreasuryBalance: TreasuryBalance,
		Vec2: Vec2,
		BankingOperation: BankingOperation,
		EconomicState: EconomicState,
		PlayerEconomicData: PlayerEconomicData,
		EventImpactHistory: EventImpactHistory,
		MarketEventSchedule: MarketEventSchedule,
		PlayerEventExposure: PlayerEventExposure,
		PropertyAuction: PropertyAuction,
		DiceRollHistory: DiceRollHistory,
		EntropyPool: EntropyPool,
		RandomnessAudit: RandomnessAudit,
		RandomnessCommitment: RandomnessCommitment,
		TreasuryAccess: TreasuryAccess,
		TreasuryConfiguration: TreasuryConfiguration,
		WithdrawalRequest: WithdrawalRequest,
		DiceRolled: DiceRolled,
		PlayerMoved: PlayerMoved,
		PropertyPurchased: PropertyPurchased,
		RentPaid: RentPaid,
		TurnEnded: TurnEnded,
		EconomicRebalance: EconomicRebalance,
		InflationAdjustment: InflationAdjustment,
		InterestPaid: InterestPaid,
		MarketVolatilityApplied: MarketVolatilityApplied,
		PropertyTaxAssessed: PropertyTaxAssessed,
		SalaryPaid: SalaryPaid,
		GameCreated: GameCreated,
		GameEnded: GameEnded,
		GameStarted: GameStarted,
		PlayerJoined: PlayerJoined,
		CompoundEventActivated: CompoundEventActivated,
		EmergencyIntervention: EmergencyIntervention,
		MarketEventResolved: MarketEventResolved,
		MarketEventTriggered: MarketEventTriggered,
		PropertyValuesUpdated: PropertyValuesUpdated,
		AuctionFinalized: AuctionFinalized,
		AuctionStarted: AuctionStarted,
		BidPlaced: BidPlaced,
		PropertyDeveloped: PropertyDeveloped,
		PropertyTransferred: PropertyTransferred,
		CardDrawn: CardDrawn,
		DiceGenerated: DiceGenerated,
		RandomnessCommitted: RandomnessCommitted,
		RandomnessIntegrityAlert: RandomnessIntegrityAlert,
		RandomnessRevealed: RandomnessRevealed,
		SecurityAlertTriggered: SecurityAlertTriggered,
		DailyLimitUpdated: DailyLimitUpdated,
		EmergencyAction: EmergencyAction,
		FundsDeposited: FundsDeposited,
		FundsTransferred: FundsTransferred,
		FundsWithdrawn: FundsWithdrawn,
		WithdrawalApproved: WithdrawalApproved,
		WithdrawalRequested: WithdrawalRequested,
	},
}
export const schema: SchemaType = {
	whale_opoly: {
		DirectionsAvailable: {
			player: "",
			directions: [new CairoCustomEnum({ 
					Left: "",
				Right: undefined,
				Up: undefined,
				Down: undefined, })],
		},
		GameCurrency: {
			game_id: 0,
			player: "",
		balance: 0,
		starting_amount: 0,
		total_earned: 0,
		total_spent: 0,
		},
		GameState: {
			game_id: 0,
			players: [""],
		status: new CairoCustomEnum({ 
					Lobby: "",
				Starting: undefined,
				Active: undefined,
				Paused: undefined,
				Completing: undefined,
				Finished: undefined, }),
		entry_tier: new CairoCustomEnum({ 
					Bronze: "",
				Silver: undefined,
				Gold: undefined,
				Platinum: undefined, }),
		total_pool: 0,
			current_turn: 0,
			start_time: 0,
			turn_deadline: 0,
		winner: new CairoOption(CairoOptionVariant.None),
		},
		GlobalPlayerState: {
			player: "",
			active_games: [0],
		total_staked: 0,
		total_winnings: 0,
			reputation_score: 0,
		verification_level: new CairoCustomEnum({ 
					Basic: "",
				Enhanced: undefined,
				Premium: undefined, }),
			registration_time: 0,
		},
		MarketEvent: {
			event_id: 0,
			game_id: 0,
		event_type: new CairoCustomEnum({ 
					Boom: "",
				Crash: undefined,
				Disaster: undefined,
				Policy: undefined,
				CryptoNews: undefined, }),
			affected_properties: [0],
		multiplier: 0,
			duration: 0,
			remaining_duration: 0,
			created_at: 0,
		},
		Moves: {
			player: "",
			remaining: 0,
		last_direction: new CairoOption(CairoOptionVariant.None),
			can_move: false,
		},
		PlayerGameState: {
			player: "",
			game_id: 0,
			position: 0,
		balance: 0,
			properties_owned: 0,
			is_bankrupt: false,
			is_in_jail: false,
			jail_turns: 0,
			last_action_time: 0,
		},
		PlayerPosition: {
			player: "",
			game_id: 0,
			position: 0,
			last_move_time: 0,
			moves_remaining: 0,
		},
		Position: {
			player: "",
		vec: { x: 0, y: 0, },
		},
		PositionCount: {
			identity: "",
			position: [[0, 0]],
		},
		Property: {
			game_id: 0,
			property_id: 0,
		owner: new CairoOption(CairoOptionVariant.None),
		base_value: 0,
		current_value: 0,
			development_level: 0,
		rent_multiplier: 0,
			is_mortgaged: false,
		color_group: new CairoCustomEnum({ 
					Brown: "",
				LightBlue: undefined,
				Pink: undefined,
				Orange: undefined,
				Red: undefined,
				Yellow: undefined,
				Green: undefined,
				DarkBlue: undefined,
				Railroad: undefined,
				Utility: undefined,
				Special: undefined, }),
		},
		PropertyTransaction: {
			transaction_id: 0,
			game_id: 0,
			property_id: 0,
		from_player: new CairoOption(CairoOptionVariant.None),
			to_player: "",
		transaction_type: new CairoCustomEnum({ 
					Purchase: "",
				Sale: undefined,
				Rent: undefined,
				Mortgage: undefined,
				Unmortgage: undefined,
				Development: undefined,
				Tax: undefined, }),
		amount: 0,
			timestamp: 0,
		},
		RandomSeed: {
			game_id: 0,
			round: 0,
			seed: 0,
			block_hash: 0,
			player_commits: [0],
			reveal_deadline: 0,
			is_revealed: false,
		},
		SecurityAlert: {
			alert_id: 0,
		game_id: new CairoOption(CairoOptionVariant.None),
		player: new CairoOption(CairoOptionVariant.None),
		alert_type: new CairoCustomEnum({ 
					SuspiciousActivity: "",
				LargeTransaction: undefined,
				UnusualPattern: undefined,
				SystemAnomaly: undefined,
				PermissionViolation: undefined, }),
		severity: new CairoCustomEnum({ 
					Low: "",
				Medium: undefined,
				High: undefined,
				Critical: undefined, }),
			description: 0,
			timestamp: 0,
			is_resolved: false,
		},
		TreasuryBalance: {
		balance_type: new CairoCustomEnum({ 
					HotWallet: "",
				WarmWallet: undefined,
				ColdStorage: undefined,
				Insurance: undefined,
				Operating: undefined, }),
		amount: 0,
			last_updated: 0,
		daily_limit: 0,
		daily_spent: 0,
		},
		Vec2: {
			x: 0,
			y: 0,
		},
		BankingOperation: {
			operation_id: 0,
			game_id: 0,
			player: "",
		operation_type: new CairoCustomEnum({ 
					Loan: "",
				Mortgage: undefined,
				Investment: undefined,
				Insurance: undefined, }),
		amount: 0,
			interest_rate: 0,
			duration: 0,
			is_active: false,
			created_at: 0,
			expires_at: 0,
		},
		EconomicState: {
			game_id: 0,
		total_money_supply: 0,
		total_property_value: 0,
			inflation_rate: 0,
			interest_rate: 0,
			tax_rate: 0,
			last_economic_update: 0,
			market_volatility_index: 0,
		},
		PlayerEconomicData: {
			game_id: 0,
			player: "",
		net_worth: 0,
			cash_flow: 0,
			debt_ratio: 0,
		property_portfolio_value: 0,
			last_interest_payment: 0,
		total_taxes_paid: 0,
		total_interest_earned: 0,
		},
		EventImpactHistory: {
			game_id: 0,
			property_id: 0,
			cumulative_impact: 0,
			recent_events: [0],
			base_value_drift: 0,
			volatility_score: 0,
		},
		MarketEventSchedule: {
			game_id: 0,
			next_event_time: 0,
			event_frequency: 0,
			last_event_time: 0,
			total_events_triggered: 0,
			market_stability_index: 0,
		},
		PlayerEventExposure: {
			game_id: 0,
			player: "",
		total_gains: 0,
		total_losses: 0,
			events_experienced: 0,
			risk_tolerance: 0,
			hedge_ratio: 0,
		},
		PropertyAuction: {
			game_id: 0,
			property_id: 0,
		current_bid: 0,
		current_bidder: new CairoOption(CairoOptionVariant.None),
			auction_end_time: 0,
			is_active: false,
		starting_bid: 0,
		},
		DiceRollHistory: {
			game_id: 0,
			player: "",
			recent_rolls: [0],
			consecutive_doubles: 0,
			consecutive_identical: 0,
			last_updated: 0,
		},
		EntropyPool: {
			game_id: 0,
			accumulated_entropy: 0,
			block_hashes: [0],
			player_contributions: [0],
			external_entropy: [0],
			last_updated: 0,
			usage_count: 0,
		},
		RandomnessAudit: {
			audit_id: 0,
			game_id: 0,
			round: 0,
		operation_type: new CairoCustomEnum({ 
					DiceRoll: "",
				CardDraw: undefined,
				MarketEvent: undefined,
				Other: undefined, }),
			input_entropy: 0,
			output_value: 0,
			timestamp: 0,
			block_number: 0,
		},
		RandomnessCommitment: {
			game_id: 0,
			round: 0,
			player: "",
			commitment_hash: 0,
			is_revealed: false,
		revealed_nonce: new CairoOption(CairoOptionVariant.None),
			committed_at: 0,
		revealed_at: new CairoOption(CairoOptionVariant.None),
		},
		TreasuryAccess: {
			address: "",
			can_deposit: false,
			can_withdraw_hot: false,
			can_withdraw_warm: false,
			can_withdraw_cold: false,
			can_transfer: false,
			can_emergency: false,
			granted_by: "",
			granted_at: 0,
		},
		TreasuryConfiguration: {
			config_id: 0,
			hot_wallet_max_ratio: 0,
			warm_wallet_max_ratio: 0,
			auto_rebalance_enabled: false,
			emergency_pause_enabled: false,
			multi_sig_threshold: 0,
			last_updated: 0,
		},
		WithdrawalRequest: {
			request_id: 0,
		balance_type: new CairoCustomEnum({ 
					HotWallet: "",
				WarmWallet: undefined,
				ColdStorage: undefined,
				Insurance: undefined,
				Operating: undefined, }),
		amount: 0,
			recipient: "",
			requested_by: "",
			approved_by: [""],
			required_approvals: 0,
			is_executed: false,
			is_cancelled: false,
			expires_at: 0,
			created_at: 0,
		},
		DiceRolled: {
			game_id: 0,
			player: "",
			dice1: 0,
			dice2: 0,
			total: 0,
			timestamp: 0,
		},
		PlayerMoved: {
			game_id: 0,
			player: "",
			from_position: 0,
			to_position: 0,
			passed_go: false,
			timestamp: 0,
		},
		PropertyPurchased: {
			game_id: 0,
			property_id: 0,
			buyer: "",
		price: 0,
			timestamp: 0,
		},
		RentPaid: {
			game_id: 0,
			property_id: 0,
			payer: "",
			owner: "",
		amount: 0,
			timestamp: 0,
		},
		TurnEnded: {
			game_id: 0,
			player: "",
			next_player: "",
			timestamp: 0,
		},
		EconomicRebalance: {
			game_id: 0,
		total_money_supply: 0,
		total_property_value: 0,
			liquidity_ratio: 0,
			timestamp: 0,
		},
		InflationAdjustment: {
			game_id: 0,
		old_base_amount: 0,
		new_amount: 0,
			inflation_rate: 0,
			timestamp: 0,
		},
		InterestPaid: {
			game_id: 0,
			player: "",
		amount: 0,
		balance_before: 0,
		balance_after: 0,
			timestamp: 0,
		},
		MarketVolatilityApplied: {
			game_id: 0,
		event_type: new CairoCustomEnum({ 
					Boom: "",
				Crash: undefined,
				Disaster: undefined,
				Policy: undefined,
				CryptoNews: undefined, }),
			affected_properties: [0],
			magnitude: 0,
			timestamp: 0,
		},
		PropertyTaxAssessed: {
			game_id: 0,
			player: "",
		total_property_value: 0,
		tax_amount: 0,
			timestamp: 0,
		},
		SalaryPaid: {
			game_id: 0,
			player: "",
		base_salary: 0,
		bonus: 0,
		total_amount: 0,
			timestamp: 0,
		},
		GameCreated: {
			game_id: 0,
			creator: "",
		tier: new CairoCustomEnum({ 
					Bronze: "",
				Silver: undefined,
				Gold: undefined,
				Platinum: undefined, }),
			max_players: 0,
			created_at: 0,
		},
		GameEnded: {
			game_id: 0,
		winner: new CairoOption(CairoOptionVariant.None),
		total_pool: 0,
			ended_at: 0,
		},
		GameStarted: {
			game_id: 0,
			players: [""],
			started_at: 0,
		},
		PlayerJoined: {
			game_id: 0,
			player: "",
			player_count: 0,
			joined_at: 0,
		},
		CompoundEventActivated: {
			game_id: 0,
			primary_event: 0,
			secondary_event: 0,
			compound_multiplier: 0,
			timestamp: 0,
		},
		EmergencyIntervention: {
			game_id: 0,
		intervention_type: new CairoCustomEnum({ 
					MarketStabilization: "",
				LiquidityInjection: undefined,
				PriceSupport: undefined,
				AntiMonopoly: undefined,
				EmergencyBailout: undefined, }),
		triggered_by_event: new CairoOption(CairoOptionVariant.None),
			impact_multiplier: 0,
			timestamp: 0,
		},
		MarketEventResolved: {
			game_id: 0,
			event_id: 0,
		total_impact: 0,
			affected_players: [""],
			timestamp: 0,
		},
		MarketEventTriggered: {
			game_id: 0,
			event_id: 0,
		event_type: new CairoCustomEnum({ 
					Boom: "",
				Crash: undefined,
				Disaster: undefined,
				Policy: undefined,
				CryptoNews: undefined, }),
			magnitude: 0,
		target_group: new CairoOption(CairoOptionVariant.None),
			duration: 0,
			timestamp: 0,
		},
		PropertyValuesUpdated: {
			game_id: 0,
			event_id: 0,
			property_ids: [0],
			old_values: [0],
			new_values: [0],
			timestamp: 0,
		},
		AuctionFinalized: {
			game_id: 0,
			property_id: 0,
		winner: new CairoOption(CairoOptionVariant.None),
		winning_bid: 0,
			timestamp: 0,
		},
		AuctionStarted: {
			game_id: 0,
			property_id: 0,
		starting_bid: 0,
			auction_end_time: 0,
			timestamp: 0,
		},
		BidPlaced: {
			game_id: 0,
			property_id: 0,
			bidder: "",
		bid_amount: 0,
			timestamp: 0,
		},
		PropertyDeveloped: {
			game_id: 0,
			property_id: 0,
			owner: "",
			development_level: 0,
		cost: 0,
			timestamp: 0,
		},
		PropertyTransferred: {
			game_id: 0,
			property_id: 0,
			from_player: "",
			to_player: "",
		price: 0,
			timestamp: 0,
		},
		CardDrawn: {
			game_id: 0,
		deck_type: new CairoCustomEnum({ 
					Chance: "",
				CommunityChest: undefined, }),
			card_id: 0,
			drawn_by: "",
			entropy_used: 0,
			timestamp: 0,
		},
		DiceGenerated: {
			game_id: 0,
			player: "",
			dice1: 0,
			dice2: 0,
			entropy_used: 0,
			timestamp: 0,
		},
		RandomnessCommitted: {
			game_id: 0,
			round: 0,
			player: "",
			commitment_hash: 0,
			timestamp: 0,
		},
		RandomnessIntegrityAlert: {
			game_id: 0,
			round: 0,
		issue_type: new CairoCustomEnum({ 
					MissingCommitment: "",
				LateReveal: undefined,
				InvalidReveal: undefined,
				InsufficientEntropy: undefined,
				TimingAttack: undefined, }),
			timestamp: 0,
		},
		RandomnessRevealed: {
			game_id: 0,
			round: 0,
			player: "",
			revealed_nonce: 0,
			timestamp: 0,
		},
		SecurityAlertTriggered: {
			game_id: 0,
			player: "",
			alert_type: 0,
			severity: 0,
			timestamp: 0,
		},
		DailyLimitUpdated: {
		balance_type: new CairoCustomEnum({ 
					HotWallet: "",
				WarmWallet: undefined,
				ColdStorage: undefined,
				Insurance: undefined,
				Operating: undefined, }),
		old_limit: 0,
		new_limit: 0,
			updated_by: "",
			timestamp: 0,
		},
		EmergencyAction: {
		balance_type: new CairoCustomEnum({ 
					HotWallet: "",
				WarmWallet: undefined,
				ColdStorage: undefined,
				Insurance: undefined,
				Operating: undefined, }),
		action: new CairoCustomEnum({ 
					Pause: "",
				Resume: undefined,
				ForceTransfer: undefined,
				LockAccess: undefined, }),
			authorized_by: "",
			timestamp: 0,
		},
		FundsDeposited: {
		balance_type: new CairoCustomEnum({ 
					HotWallet: "",
				WarmWallet: undefined,
				ColdStorage: undefined,
				Insurance: undefined,
				Operating: undefined, }),
		amount: 0,
			depositor: "",
		new_balance: 0,
			timestamp: 0,
		},
		FundsTransferred: {
		from_type: new CairoCustomEnum({ 
					HotWallet: "",
				WarmWallet: undefined,
				ColdStorage: undefined,
				Insurance: undefined,
				Operating: undefined, }),
		to_type: new CairoCustomEnum({ 
					HotWallet: "",
				WarmWallet: undefined,
				ColdStorage: undefined,
				Insurance: undefined,
				Operating: undefined, }),
		amount: 0,
			authorized_by: "",
			timestamp: 0,
		},
		FundsWithdrawn: {
		balance_type: new CairoCustomEnum({ 
					HotWallet: "",
				WarmWallet: undefined,
				ColdStorage: undefined,
				Insurance: undefined,
				Operating: undefined, }),
		amount: 0,
			recipient: "",
			authorized_by: "",
		new_balance: 0,
			timestamp: 0,
		},
		WithdrawalApproved: {
			request_id: 0,
			approver: "",
			approvals_count: 0,
			timestamp: 0,
		},
		WithdrawalRequested: {
			request_id: 0,
		balance_type: new CairoCustomEnum({ 
					HotWallet: "",
				WarmWallet: undefined,
				ColdStorage: undefined,
				Insurance: undefined,
				Operating: undefined, }),
		amount: 0,
			recipient: "",
			requested_by: "",
			required_approvals: 0,
			expires_at: 0,
			timestamp: 0,
		},
	},
};
export const ModelsMapping = {
	AlertSeverity: 'whale_opoly-AlertSeverity',
	BalanceType: 'whale_opoly-BalanceType',
	Direction: 'whale_opoly-Direction',
	DirectionsAvailable: 'whale_opoly-DirectionsAvailable',
	GameCurrency: 'whale_opoly-GameCurrency',
	GameState: 'whale_opoly-GameState',
	GameStatus: 'whale_opoly-GameStatus',
	GameTier: 'whale_opoly-GameTier',
	GlobalPlayerState: 'whale_opoly-GlobalPlayerState',
	MarketEvent: 'whale_opoly-MarketEvent',
	MarketEventType: 'whale_opoly-MarketEventType',
	Moves: 'whale_opoly-Moves',
	PlayerGameState: 'whale_opoly-PlayerGameState',
	PlayerPosition: 'whale_opoly-PlayerPosition',
	Position: 'whale_opoly-Position',
	PositionCount: 'whale_opoly-PositionCount',
	Property: 'whale_opoly-Property',
	PropertyGroup: 'whale_opoly-PropertyGroup',
	PropertyTransaction: 'whale_opoly-PropertyTransaction',
	RandomSeed: 'whale_opoly-RandomSeed',
	SecurityAlert: 'whale_opoly-SecurityAlert',
	SecurityAlertType: 'whale_opoly-SecurityAlertType',
	TransactionType: 'whale_opoly-TransactionType',
	TreasuryBalance: 'whale_opoly-TreasuryBalance',
	Vec2: 'whale_opoly-Vec2',
	VerificationTier: 'whale_opoly-VerificationTier',
	BankingOpType: 'whale_opoly-BankingOpType',
	BankingOperation: 'whale_opoly-BankingOperation',
	EconomicState: 'whale_opoly-EconomicState',
	PlayerEconomicData: 'whale_opoly-PlayerEconomicData',
	EventImpactHistory: 'whale_opoly-EventImpactHistory',
	MarketEventSchedule: 'whale_opoly-MarketEventSchedule',
	PlayerEventExposure: 'whale_opoly-PlayerEventExposure',
	PropertyAuction: 'whale_opoly-PropertyAuction',
	DiceRollHistory: 'whale_opoly-DiceRollHistory',
	EntropyPool: 'whale_opoly-EntropyPool',
	RandomnessAudit: 'whale_opoly-RandomnessAudit',
	RandomnessCommitment: 'whale_opoly-RandomnessCommitment',
	RandomnessOperation: 'whale_opoly-RandomnessOperation',
	TreasuryAccess: 'whale_opoly-TreasuryAccess',
	TreasuryConfiguration: 'whale_opoly-TreasuryConfiguration',
	WithdrawalRequest: 'whale_opoly-WithdrawalRequest',
	DiceRolled: 'whale_opoly-DiceRolled',
	PlayerMoved: 'whale_opoly-PlayerMoved',
	PropertyPurchased: 'whale_opoly-PropertyPurchased',
	RentPaid: 'whale_opoly-RentPaid',
	TurnEnded: 'whale_opoly-TurnEnded',
	EconomicRebalance: 'whale_opoly-EconomicRebalance',
	InflationAdjustment: 'whale_opoly-InflationAdjustment',
	InterestPaid: 'whale_opoly-InterestPaid',
	MarketVolatilityApplied: 'whale_opoly-MarketVolatilityApplied',
	PropertyTaxAssessed: 'whale_opoly-PropertyTaxAssessed',
	SalaryPaid: 'whale_opoly-SalaryPaid',
	GameCreated: 'whale_opoly-GameCreated',
	GameEnded: 'whale_opoly-GameEnded',
	GameStarted: 'whale_opoly-GameStarted',
	PlayerJoined: 'whale_opoly-PlayerJoined',
	CompoundEventActivated: 'whale_opoly-CompoundEventActivated',
	EmergencyIntervention: 'whale_opoly-EmergencyIntervention',
	InterventionType: 'whale_opoly-InterventionType',
	MarketEventResolved: 'whale_opoly-MarketEventResolved',
	MarketEventTriggered: 'whale_opoly-MarketEventTriggered',
	PropertyValuesUpdated: 'whale_opoly-PropertyValuesUpdated',
	AuctionFinalized: 'whale_opoly-AuctionFinalized',
	AuctionStarted: 'whale_opoly-AuctionStarted',
	BidPlaced: 'whale_opoly-BidPlaced',
	PropertyDeveloped: 'whale_opoly-PropertyDeveloped',
	PropertyTransferred: 'whale_opoly-PropertyTransferred',
	CardDrawn: 'whale_opoly-CardDrawn',
	DeckType: 'whale_opoly-DeckType',
	DiceGenerated: 'whale_opoly-DiceGenerated',
	IntegrityIssue: 'whale_opoly-IntegrityIssue',
	RandomnessCommitted: 'whale_opoly-RandomnessCommitted',
	RandomnessIntegrityAlert: 'whale_opoly-RandomnessIntegrityAlert',
	RandomnessRevealed: 'whale_opoly-RandomnessRevealed',
	SecurityAlertTriggered: 'whale_opoly-SecurityAlertTriggered',
	DailyLimitUpdated: 'whale_opoly-DailyLimitUpdated',
	EmergencyAction: 'whale_opoly-EmergencyAction',
	EmergencyActionType: 'whale_opoly-EmergencyActionType',
	FundsDeposited: 'whale_opoly-FundsDeposited',
	FundsTransferred: 'whale_opoly-FundsTransferred',
	FundsWithdrawn: 'whale_opoly-FundsWithdrawn',
	WithdrawalApproved: 'whale_opoly-WithdrawalApproved',
	WithdrawalRequested: 'whale_opoly-WithdrawalRequested',
}