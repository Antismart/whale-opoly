import { DojoProvider, DojoCall } from "@dojoengine/core";
import { Account, AccountInterface, BigNumberish, CairoOption, CairoCustomEnum } from "starknet";
import * as models from "./models.gen";

export function setupWorld(provider: DojoProvider) {

	const build_board_actions_buyProperty_calldata = (gameId: BigNumberish, propertyId: BigNumberish): DojoCall => {
		return {
			contractName: "board_actions",
			entrypoint: "buy_property",
			calldata: [gameId, propertyId],
		};
	};

	const board_actions_buyProperty = async (snAccount: Account | AccountInterface, gameId: BigNumberish, propertyId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_board_actions_buyProperty_calldata(gameId, propertyId),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_board_actions_canBuyProperty_calldata = (player: string, gameId: BigNumberish, propertyId: BigNumberish): DojoCall => {
		return {
			contractName: "board_actions",
			entrypoint: "can_buy_property",
			calldata: [player, gameId, propertyId],
		};
	};

	const board_actions_canBuyProperty = async (player: string, gameId: BigNumberish, propertyId: BigNumberish) => {
		try {
			return await provider.call("whale_opoly", build_board_actions_canBuyProperty_calldata(player, gameId, propertyId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_board_actions_developProperty_calldata = (gameId: BigNumberish, propertyId: BigNumberish): DojoCall => {
		return {
			contractName: "board_actions",
			entrypoint: "develop_property",
			calldata: [gameId, propertyId],
		};
	};

	const board_actions_developProperty = async (snAccount: Account | AccountInterface, gameId: BigNumberish, propertyId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_board_actions_developProperty_calldata(gameId, propertyId),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_board_actions_endTurn_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "board_actions",
			entrypoint: "end_turn",
			calldata: [gameId],
		};
	};

	const board_actions_endTurn = async (snAccount: Account | AccountInterface, gameId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_board_actions_endTurn_calldata(gameId),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_board_actions_getCurrentPlayer_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "board_actions",
			entrypoint: "get_current_player",
			calldata: [gameId],
		};
	};

	const board_actions_getCurrentPlayer = async (gameId: BigNumberish) => {
		try {
			return await provider.call("whale_opoly", build_board_actions_getCurrentPlayer_calldata(gameId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_board_actions_getPlayerPosition_calldata = (player: string, gameId: BigNumberish): DojoCall => {
		return {
			contractName: "board_actions",
			entrypoint: "get_player_position",
			calldata: [player, gameId],
		};
	};

	const board_actions_getPlayerPosition = async (player: string, gameId: BigNumberish) => {
		try {
			return await provider.call("whale_opoly", build_board_actions_getPlayerPosition_calldata(player, gameId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_board_actions_mortgageProperty_calldata = (gameId: BigNumberish, propertyId: BigNumberish): DojoCall => {
		return {
			contractName: "board_actions",
			entrypoint: "mortgage_property",
			calldata: [gameId, propertyId],
		};
	};

	const board_actions_mortgageProperty = async (snAccount: Account | AccountInterface, gameId: BigNumberish, propertyId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_board_actions_mortgageProperty_calldata(gameId, propertyId),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_board_actions_movePlayer_calldata = (gameId: BigNumberish, steps: BigNumberish): DojoCall => {
		return {
			contractName: "board_actions",
			entrypoint: "move_player",
			calldata: [gameId, steps],
		};
	};

	const board_actions_movePlayer = async (snAccount: Account | AccountInterface, gameId: BigNumberish, steps: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_board_actions_movePlayer_calldata(gameId, steps),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_board_actions_payRent_calldata = (gameId: BigNumberish, propertyId: BigNumberish): DojoCall => {
		return {
			contractName: "board_actions",
			entrypoint: "pay_rent",
			calldata: [gameId, propertyId],
		};
	};

	const board_actions_payRent = async (snAccount: Account | AccountInterface, gameId: BigNumberish, propertyId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_board_actions_payRent_calldata(gameId, propertyId),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_board_actions_rollDice_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "board_actions",
			entrypoint: "roll_dice",
			calldata: [gameId],
		};
	};

	const board_actions_rollDice = async (snAccount: Account | AccountInterface, gameId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_board_actions_rollDice_calldata(gameId),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_board_actions_unmortgageProperty_calldata = (gameId: BigNumberish, propertyId: BigNumberish): DojoCall => {
		return {
			contractName: "board_actions",
			entrypoint: "unmortgage_property",
			calldata: [gameId, propertyId],
		};
	};

	const board_actions_unmortgageProperty = async (snAccount: Account | AccountInterface, gameId: BigNumberish, propertyId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_board_actions_unmortgageProperty_calldata(gameId, propertyId),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_economics_applyMarketVolatility_calldata = (gameId: BigNumberish, eventType: CairoCustomEnum, magnitude: BigNumberish): DojoCall => {
		return {
			contractName: "economics",
			entrypoint: "apply_market_volatility",
			calldata: [gameId, eventType, magnitude],
		};
	};

	const economics_applyMarketVolatility = async (snAccount: Account | AccountInterface, gameId: BigNumberish, eventType: CairoCustomEnum, magnitude: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_economics_applyMarketVolatility_calldata(gameId, eventType, magnitude),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_economics_applyUniversalBasicIncome_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "economics",
			entrypoint: "apply_universal_basic_income",
			calldata: [gameId],
		};
	};

	const economics_applyUniversalBasicIncome = async (snAccount: Account | AccountInterface, gameId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_economics_applyUniversalBasicIncome_calldata(gameId),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_economics_calculateBankruptcyThreshold_calldata = (gameId: BigNumberish, player: string): DojoCall => {
		return {
			contractName: "economics",
			entrypoint: "calculate_bankruptcy_threshold",
			calldata: [gameId, player],
		};
	};

	const economics_calculateBankruptcyThreshold = async (gameId: BigNumberish, player: string) => {
		try {
			return await provider.call("whale_opoly", build_economics_calculateBankruptcyThreshold_calldata(gameId, player));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_economics_calculateInflationAdjustment_calldata = (baseAmount: BigNumberish, gameDuration: BigNumberish): DojoCall => {
		return {
			contractName: "economics",
			entrypoint: "calculate_inflation_adjustment",
			calldata: [baseAmount, gameDuration],
		};
	};

	const economics_calculateInflationAdjustment = async (baseAmount: BigNumberish, gameDuration: BigNumberish) => {
		try {
			return await provider.call("whale_opoly", build_economics_calculateInflationAdjustment_calldata(baseAmount, gameDuration));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_economics_calculatePropertyTax_calldata = (gameId: BigNumberish, player: string): DojoCall => {
		return {
			contractName: "economics",
			entrypoint: "calculate_property_tax",
			calldata: [gameId, player],
		};
	};

	const economics_calculatePropertyTax = async (gameId: BigNumberish, player: string) => {
		try {
			return await provider.call("whale_opoly", build_economics_calculatePropertyTax_calldata(gameId, player));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_economics_calculateTotalWealth_calldata = (gameId: BigNumberish, player: string): DojoCall => {
		return {
			contractName: "economics",
			entrypoint: "calculate_total_wealth",
			calldata: [gameId, player],
		};
	};

	const economics_calculateTotalWealth = async (gameId: BigNumberish, player: string) => {
		try {
			return await provider.call("whale_opoly", build_economics_calculateTotalWealth_calldata(gameId, player));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_economics_checkEconomicBalance_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "economics",
			entrypoint: "check_economic_balance",
			calldata: [gameId],
		};
	};

	const economics_checkEconomicBalance = async (gameId: BigNumberish) => {
		try {
			return await provider.call("whale_opoly", build_economics_checkEconomicBalance_calldata(gameId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_economics_getEconomicIndicators_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "economics",
			entrypoint: "get_economic_indicators",
			calldata: [gameId],
		};
	};

	const economics_getEconomicIndicators = async (gameId: BigNumberish) => {
		try {
			return await provider.call("whale_opoly", build_economics_getEconomicIndicators_calldata(gameId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_economics_processBankInterest_calldata = (gameId: BigNumberish, player: string): DojoCall => {
		return {
			contractName: "economics",
			entrypoint: "process_bank_interest",
			calldata: [gameId, player],
		};
	};

	const economics_processBankInterest = async (snAccount: Account | AccountInterface, gameId: BigNumberish, player: string) => {
		try {
			return await provider.execute(
				snAccount,
				build_economics_processBankInterest_calldata(gameId, player),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_economics_processSalaryPayment_calldata = (gameId: BigNumberish, player: string): DojoCall => {
		return {
			contractName: "economics",
			entrypoint: "process_salary_payment",
			calldata: [gameId, player],
		};
	};

	const economics_processSalaryPayment = async (snAccount: Account | AccountInterface, gameId: BigNumberish, player: string) => {
		try {
			return await provider.execute(
				snAccount,
				build_economics_processSalaryPayment_calldata(gameId, player),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_manager_canPlayerJoin_calldata = (player: string, gameId: BigNumberish): DojoCall => {
		return {
			contractName: "game_manager",
			entrypoint: "can_player_join",
			calldata: [player, gameId],
		};
	};

	const game_manager_canPlayerJoin = async (player: string, gameId: BigNumberish) => {
		try {
			return await provider.call("whale_opoly", build_game_manager_canPlayerJoin_calldata(player, gameId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_manager_createGame_calldata = (tier: CairoCustomEnum, maxPlayers: BigNumberish): DojoCall => {
		return {
			contractName: "game_manager",
			entrypoint: "create_game",
			calldata: [tier, maxPlayers],
		};
	};

	const game_manager_createGame = async (snAccount: Account | AccountInterface, tier: CairoCustomEnum, maxPlayers: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_manager_createGame_calldata(tier, maxPlayers),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_manager_endGame_calldata = (gameId: BigNumberish, winner: CairoOption<string>): DojoCall => {
		return {
			contractName: "game_manager",
			entrypoint: "end_game",
			calldata: [gameId, winner],
		};
	};

	const game_manager_endGame = async (snAccount: Account | AccountInterface, gameId: BigNumberish, winner: CairoOption<string>) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_manager_endGame_calldata(gameId, winner),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_manager_getGameState_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "game_manager",
			entrypoint: "get_game_state",
			calldata: [gameId],
		};
	};

	const game_manager_getGameState = async (gameId: BigNumberish) => {
		try {
			return await provider.call("whale_opoly", build_game_manager_getGameState_calldata(gameId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_manager_getPlayerGames_calldata = (player: string): DojoCall => {
		return {
			contractName: "game_manager",
			entrypoint: "get_player_games",
			calldata: [player],
		};
	};

	const game_manager_getPlayerGames = async (player: string) => {
		try {
			return await provider.call("whale_opoly", build_game_manager_getPlayerGames_calldata(player));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_manager_isGameFull_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "game_manager",
			entrypoint: "is_game_full",
			calldata: [gameId],
		};
	};

	const game_manager_isGameFull = async (gameId: BigNumberish) => {
		try {
			return await provider.call("whale_opoly", build_game_manager_isGameFull_calldata(gameId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_manager_joinGame_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "game_manager",
			entrypoint: "join_game",
			calldata: [gameId],
		};
	};

	const game_manager_joinGame = async (snAccount: Account | AccountInterface, gameId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_manager_joinGame_calldata(gameId),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_manager_startGame_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "game_manager",
			entrypoint: "start_game",
			calldata: [gameId],
		};
	};

	const game_manager_startGame = async (snAccount: Account | AccountInterface, gameId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_manager_startGame_calldata(gameId),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_market_events_applyCompoundEvents_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "market_events",
			entrypoint: "apply_compound_events",
			calldata: [gameId],
		};
	};

	const market_events_applyCompoundEvents = async (snAccount: Account | AccountInterface, gameId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_market_events_applyCompoundEvents_calldata(gameId),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_market_events_calculateEventImpact_calldata = (eventId: BigNumberish, propertyId: BigNumberish): DojoCall => {
		return {
			contractName: "market_events",
			entrypoint: "calculate_event_impact",
			calldata: [eventId, propertyId],
		};
	};

	const market_events_calculateEventImpact = async (eventId: BigNumberish, propertyId: BigNumberish) => {
		try {
			return await provider.call("whale_opoly", build_market_events_calculateEventImpact_calldata(eventId, propertyId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_market_events_createEmergencyIntervention_calldata = (gameId: BigNumberish, interventionType: CairoCustomEnum): DojoCall => {
		return {
			contractName: "market_events",
			entrypoint: "create_emergency_intervention",
			calldata: [gameId, interventionType],
		};
	};

	const market_events_createEmergencyIntervention = async (snAccount: Account | AccountInterface, gameId: BigNumberish, interventionType: CairoCustomEnum) => {
		try {
			return await provider.execute(
				snAccount,
				build_market_events_createEmergencyIntervention_calldata(gameId, interventionType),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_market_events_getActiveEvents_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "market_events",
			entrypoint: "get_active_events",
			calldata: [gameId],
		};
	};

	const market_events_getActiveEvents = async (gameId: BigNumberish) => {
		try {
			return await provider.call("whale_opoly", build_market_events_getActiveEvents_calldata(gameId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_market_events_predictNextEvent_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "market_events",
			entrypoint: "predict_next_event",
			calldata: [gameId],
		};
	};

	const market_events_predictNextEvent = async (gameId: BigNumberish) => {
		try {
			return await provider.call("whale_opoly", build_market_events_predictNextEvent_calldata(gameId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_market_events_processScheduledEvents_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "market_events",
			entrypoint: "process_scheduled_events",
			calldata: [gameId],
		};
	};

	const market_events_processScheduledEvents = async (snAccount: Account | AccountInterface, gameId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_market_events_processScheduledEvents_calldata(gameId),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_market_events_resolveMarketEvent_calldata = (gameId: BigNumberish, eventId: BigNumberish): DojoCall => {
		return {
			contractName: "market_events",
			entrypoint: "resolve_market_event",
			calldata: [gameId, eventId],
		};
	};

	const market_events_resolveMarketEvent = async (snAccount: Account | AccountInterface, gameId: BigNumberish, eventId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_market_events_resolveMarketEvent_calldata(gameId, eventId),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_market_events_triggerMarketEvent_calldata = (gameId: BigNumberish, eventType: CairoCustomEnum, magnitude: BigNumberish, targetGroup: CairoOption<CairoCustomEnum>): DojoCall => {
		return {
			contractName: "market_events",
			entrypoint: "trigger_market_event",
			calldata: [gameId, eventType, magnitude, targetGroup],
		};
	};

	const market_events_triggerMarketEvent = async (snAccount: Account | AccountInterface, gameId: BigNumberish, eventType: CairoCustomEnum, magnitude: BigNumberish, targetGroup: CairoOption<CairoCustomEnum>) => {
		try {
			return await provider.execute(
				snAccount,
				build_market_events_triggerMarketEvent_calldata(gameId, eventType, magnitude, targetGroup),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_property_management_auctionProperty_calldata = (gameId: BigNumberish, propertyId: BigNumberish, startingBid: BigNumberish): DojoCall => {
		return {
			contractName: "property_management",
			entrypoint: "auction_property",
			calldata: [gameId, propertyId, startingBid],
		};
	};

	const property_management_auctionProperty = async (snAccount: Account | AccountInterface, gameId: BigNumberish, propertyId: BigNumberish, startingBid: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_property_management_auctionProperty_calldata(gameId, propertyId, startingBid),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_property_management_calculateTotalAssets_calldata = (gameId: BigNumberish, player: string): DojoCall => {
		return {
			contractName: "property_management",
			entrypoint: "calculate_total_assets",
			calldata: [gameId, player],
		};
	};

	const property_management_calculateTotalAssets = async (gameId: BigNumberish, player: string) => {
		try {
			return await provider.call("whale_opoly", build_property_management_calculateTotalAssets_calldata(gameId, player));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_property_management_finalizeAuction_calldata = (gameId: BigNumberish, propertyId: BigNumberish): DojoCall => {
		return {
			contractName: "property_management",
			entrypoint: "finalize_auction",
			calldata: [gameId, propertyId],
		};
	};

	const property_management_finalizeAuction = async (snAccount: Account | AccountInterface, gameId: BigNumberish, propertyId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_property_management_finalizeAuction_calldata(gameId, propertyId),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_property_management_forceSale_calldata = (gameId: BigNumberish, player: string): DojoCall => {
		return {
			contractName: "property_management",
			entrypoint: "force_sale",
			calldata: [gameId, player],
		};
	};

	const property_management_forceSale = async (snAccount: Account | AccountInterface, gameId: BigNumberish, player: string) => {
		try {
			return await provider.execute(
				snAccount,
				build_property_management_forceSale_calldata(gameId, player),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_property_management_getColorGroupMonopolyStatus_calldata = (gameId: BigNumberish, colorGroup: CairoCustomEnum): DojoCall => {
		return {
			contractName: "property_management",
			entrypoint: "get_color_group_monopoly_status",
			calldata: [gameId, colorGroup],
		};
	};

	const property_management_getColorGroupMonopolyStatus = async (gameId: BigNumberish, colorGroup: CairoCustomEnum) => {
		try {
			return await provider.call("whale_opoly", build_property_management_getColorGroupMonopolyStatus_calldata(gameId, colorGroup));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_property_management_getPlayerProperties_calldata = (gameId: BigNumberish, player: string): DojoCall => {
		return {
			contractName: "property_management",
			entrypoint: "get_player_properties",
			calldata: [gameId, player],
		};
	};

	const property_management_getPlayerProperties = async (gameId: BigNumberish, player: string) => {
		try {
			return await provider.call("whale_opoly", build_property_management_getPlayerProperties_calldata(gameId, player));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_property_management_getPropertyValue_calldata = (gameId: BigNumberish, propertyId: BigNumberish): DojoCall => {
		return {
			contractName: "property_management",
			entrypoint: "get_property_value",
			calldata: [gameId, propertyId],
		};
	};

	const property_management_getPropertyValue = async (gameId: BigNumberish, propertyId: BigNumberish) => {
		try {
			return await provider.call("whale_opoly", build_property_management_getPropertyValue_calldata(gameId, propertyId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_property_management_initializeProperties_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "property_management",
			entrypoint: "initialize_properties",
			calldata: [gameId],
		};
	};

	const property_management_initializeProperties = async (snAccount: Account | AccountInterface, gameId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_property_management_initializeProperties_calldata(gameId),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_property_management_placeBid_calldata = (gameId: BigNumberish, propertyId: BigNumberish, bidAmount: BigNumberish): DojoCall => {
		return {
			contractName: "property_management",
			entrypoint: "place_bid",
			calldata: [gameId, propertyId, bidAmount],
		};
	};

	const property_management_placeBid = async (snAccount: Account | AccountInterface, gameId: BigNumberish, propertyId: BigNumberish, bidAmount: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_property_management_placeBid_calldata(gameId, propertyId, bidAmount),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_property_management_transferProperty_calldata = (gameId: BigNumberish, propertyId: BigNumberish, toPlayer: string, price: BigNumberish): DojoCall => {
		return {
			contractName: "property_management",
			entrypoint: "transfer_property",
			calldata: [gameId, propertyId, toPlayer, price],
		};
	};

	const property_management_transferProperty = async (snAccount: Account | AccountInterface, gameId: BigNumberish, propertyId: BigNumberish, toPlayer: string, price: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_property_management_transferProperty_calldata(gameId, propertyId, toPlayer, price),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_random_engine_commitRandomness_calldata = (gameId: BigNumberish, round: BigNumberish, commitment: BigNumberish): DojoCall => {
		return {
			contractName: "random_engine",
			entrypoint: "commit_randomness",
			calldata: [gameId, round, commitment],
		};
	};

	const random_engine_commitRandomness = async (snAccount: Account | AccountInterface, gameId: BigNumberish, round: BigNumberish, commitment: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_random_engine_commitRandomness_calldata(gameId, round, commitment),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_random_engine_generateCardDraw_calldata = (gameId: BigNumberish, deckType: CairoCustomEnum): DojoCall => {
		return {
			contractName: "random_engine",
			entrypoint: "generate_card_draw",
			calldata: [gameId, deckType],
		};
	};

	const random_engine_generateCardDraw = async (snAccount: Account | AccountInterface, gameId: BigNumberish, deckType: CairoCustomEnum) => {
		try {
			return await provider.execute(
				snAccount,
				build_random_engine_generateCardDraw_calldata(gameId, deckType),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_random_engine_generateDiceRoll_calldata = (gameId: BigNumberish, player: string): DojoCall => {
		return {
			contractName: "random_engine",
			entrypoint: "generate_dice_roll",
			calldata: [gameId, player],
		};
	};

	const random_engine_generateDiceRoll = async (snAccount: Account | AccountInterface, gameId: BigNumberish, player: string) => {
		try {
			return await provider.execute(
				snAccount,
				build_random_engine_generateDiceRoll_calldata(gameId, player),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_random_engine_generateMarketEvent_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "random_engine",
			entrypoint: "generate_market_event",
			calldata: [gameId],
		};
	};

	const random_engine_generateMarketEvent = async (snAccount: Account | AccountInterface, gameId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_random_engine_generateMarketEvent_calldata(gameId),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_random_engine_getEntropyPool_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "random_engine",
			entrypoint: "get_entropy_pool",
			calldata: [gameId],
		};
	};

	const random_engine_getEntropyPool = async (gameId: BigNumberish) => {
		try {
			return await provider.call("whale_opoly", build_random_engine_getEntropyPool_calldata(gameId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_random_engine_initializeGameRandomness_calldata = (gameId: BigNumberish, players: Array<string>): DojoCall => {
		return {
			contractName: "random_engine",
			entrypoint: "initialize_game_randomness",
			calldata: [gameId, players],
		};
	};

	const random_engine_initializeGameRandomness = async (snAccount: Account | AccountInterface, gameId: BigNumberish, players: Array<string>) => {
		try {
			return await provider.execute(
				snAccount,
				build_random_engine_initializeGameRandomness_calldata(gameId, players),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_random_engine_isRoundReady_calldata = (gameId: BigNumberish, round: BigNumberish): DojoCall => {
		return {
			contractName: "random_engine",
			entrypoint: "is_round_ready",
			calldata: [gameId, round],
		};
	};

	const random_engine_isRoundReady = async (gameId: BigNumberish, round: BigNumberish) => {
		try {
			return await provider.call("whale_opoly", build_random_engine_isRoundReady_calldata(gameId, round));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_random_engine_revealRandomness_calldata = (gameId: BigNumberish, round: BigNumberish, nonce: BigNumberish): DojoCall => {
		return {
			contractName: "random_engine",
			entrypoint: "reveal_randomness",
			calldata: [gameId, round, nonce],
		};
	};

	const random_engine_revealRandomness = async (snAccount: Account | AccountInterface, gameId: BigNumberish, round: BigNumberish, nonce: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_random_engine_revealRandomness_calldata(gameId, round, nonce),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_random_engine_verifyRandomnessIntegrity_calldata = (gameId: BigNumberish, round: BigNumberish): DojoCall => {
		return {
			contractName: "random_engine",
			entrypoint: "verify_randomness_integrity",
			calldata: [gameId, round],
		};
	};

	const random_engine_verifyRandomnessIntegrity = async (gameId: BigNumberish, round: BigNumberish) => {
		try {
			return await provider.call("whale_opoly", build_random_engine_verifyRandomnessIntegrity_calldata(gameId, round));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_security_simple_initializeSecurity_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "security_simple",
			entrypoint: "initialize_security",
			calldata: [gameId],
		};
	};

	const security_simple_initializeSecurity = async (snAccount: Account | AccountInterface, gameId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_security_simple_initializeSecurity_calldata(gameId),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_security_simple_validateAction_calldata = (gameId: BigNumberish, player: string, action: BigNumberish): DojoCall => {
		return {
			contractName: "security_simple",
			entrypoint: "validate_action",
			calldata: [gameId, player, action],
		};
	};

	const security_simple_validateAction = async (snAccount: Account | AccountInterface, gameId: BigNumberish, player: string, action: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_security_simple_validateAction_calldata(gameId, player, action),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_treasury_approveWithdrawal_calldata = (requestId: BigNumberish): DojoCall => {
		return {
			contractName: "treasury",
			entrypoint: "approve_withdrawal",
			calldata: [requestId],
		};
	};

	const treasury_approveWithdrawal = async (snAccount: Account | AccountInterface, requestId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_treasury_approveWithdrawal_calldata(requestId),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_treasury_checkDailyLimits_calldata = (balanceType: CairoCustomEnum): DojoCall => {
		return {
			contractName: "treasury",
			entrypoint: "check_daily_limits",
			calldata: [balanceType],
		};
	};

	const treasury_checkDailyLimits = async (balanceType: CairoCustomEnum) => {
		try {
			return await provider.call("whale_opoly", build_treasury_checkDailyLimits_calldata(balanceType));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_treasury_depositFunds_calldata = (amount: BigNumberish, balanceType: CairoCustomEnum): DojoCall => {
		return {
			contractName: "treasury",
			entrypoint: "deposit_funds",
			calldata: [amount, balanceType],
		};
	};

	const treasury_depositFunds = async (snAccount: Account | AccountInterface, amount: BigNumberish, balanceType: CairoCustomEnum) => {
		try {
			return await provider.execute(
				snAccount,
				build_treasury_depositFunds_calldata(amount, balanceType),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_treasury_emergencyPause_calldata = (balanceType: CairoCustomEnum): DojoCall => {
		return {
			contractName: "treasury",
			entrypoint: "emergency_pause",
			calldata: [balanceType],
		};
	};

	const treasury_emergencyPause = async (snAccount: Account | AccountInterface, balanceType: CairoCustomEnum) => {
		try {
			return await provider.execute(
				snAccount,
				build_treasury_emergencyPause_calldata(balanceType),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_treasury_emergencyResume_calldata = (balanceType: CairoCustomEnum): DojoCall => {
		return {
			contractName: "treasury",
			entrypoint: "emergency_resume",
			calldata: [balanceType],
		};
	};

	const treasury_emergencyResume = async (snAccount: Account | AccountInterface, balanceType: CairoCustomEnum) => {
		try {
			return await provider.execute(
				snAccount,
				build_treasury_emergencyResume_calldata(balanceType),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_treasury_getBalance_calldata = (balanceType: CairoCustomEnum): DojoCall => {
		return {
			contractName: "treasury",
			entrypoint: "get_balance",
			calldata: [balanceType],
		};
	};

	const treasury_getBalance = async (balanceType: CairoCustomEnum) => {
		try {
			return await provider.call("whale_opoly", build_treasury_getBalance_calldata(balanceType));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_treasury_getTotalTreasury_calldata = (): DojoCall => {
		return {
			contractName: "treasury",
			entrypoint: "get_total_treasury",
			calldata: [],
		};
	};

	const treasury_getTotalTreasury = async () => {
		try {
			return await provider.call("whale_opoly", build_treasury_getTotalTreasury_calldata());
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_treasury_isWithdrawalAllowed_calldata = (balanceType: CairoCustomEnum, amount: BigNumberish): DojoCall => {
		return {
			contractName: "treasury",
			entrypoint: "is_withdrawal_allowed",
			calldata: [balanceType, amount],
		};
	};

	const treasury_isWithdrawalAllowed = async (balanceType: CairoCustomEnum, amount: BigNumberish) => {
		try {
			return await provider.call("whale_opoly", build_treasury_isWithdrawalAllowed_calldata(balanceType, amount));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_treasury_requestLargeWithdrawal_calldata = (balanceType: CairoCustomEnum, amount: BigNumberish, recipient: string): DojoCall => {
		return {
			contractName: "treasury",
			entrypoint: "request_large_withdrawal",
			calldata: [balanceType, amount, recipient],
		};
	};

	const treasury_requestLargeWithdrawal = async (snAccount: Account | AccountInterface, balanceType: CairoCustomEnum, amount: BigNumberish, recipient: string) => {
		try {
			return await provider.execute(
				snAccount,
				build_treasury_requestLargeWithdrawal_calldata(balanceType, amount, recipient),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_treasury_setDailyLimit_calldata = (balanceType: CairoCustomEnum, newLimit: BigNumberish): DojoCall => {
		return {
			contractName: "treasury",
			entrypoint: "set_daily_limit",
			calldata: [balanceType, newLimit],
		};
	};

	const treasury_setDailyLimit = async (snAccount: Account | AccountInterface, balanceType: CairoCustomEnum, newLimit: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_treasury_setDailyLimit_calldata(balanceType, newLimit),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_treasury_transferBetweenWallets_calldata = (fromType: CairoCustomEnum, toType: CairoCustomEnum, amount: BigNumberish): DojoCall => {
		return {
			contractName: "treasury",
			entrypoint: "transfer_between_wallets",
			calldata: [fromType, toType, amount],
		};
	};

	const treasury_transferBetweenWallets = async (snAccount: Account | AccountInterface, fromType: CairoCustomEnum, toType: CairoCustomEnum, amount: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_treasury_transferBetweenWallets_calldata(fromType, toType, amount),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_treasury_withdrawFunds_calldata = (amount: BigNumberish, balanceType: CairoCustomEnum, recipient: string): DojoCall => {
		return {
			contractName: "treasury",
			entrypoint: "withdraw_funds",
			calldata: [amount, balanceType, recipient],
		};
	};

	const treasury_withdrawFunds = async (snAccount: Account | AccountInterface, amount: BigNumberish, balanceType: CairoCustomEnum, recipient: string) => {
		try {
			return await provider.execute(
				snAccount,
				build_treasury_withdrawFunds_calldata(amount, balanceType, recipient),
				"whale_opoly",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};



	return {
		board_actions: {
			buyProperty: board_actions_buyProperty,
			buildBuyPropertyCalldata: build_board_actions_buyProperty_calldata,
			canBuyProperty: board_actions_canBuyProperty,
			buildCanBuyPropertyCalldata: build_board_actions_canBuyProperty_calldata,
			developProperty: board_actions_developProperty,
			buildDevelopPropertyCalldata: build_board_actions_developProperty_calldata,
			endTurn: board_actions_endTurn,
			buildEndTurnCalldata: build_board_actions_endTurn_calldata,
			getCurrentPlayer: board_actions_getCurrentPlayer,
			buildGetCurrentPlayerCalldata: build_board_actions_getCurrentPlayer_calldata,
			getPlayerPosition: board_actions_getPlayerPosition,
			buildGetPlayerPositionCalldata: build_board_actions_getPlayerPosition_calldata,
			mortgageProperty: board_actions_mortgageProperty,
			buildMortgagePropertyCalldata: build_board_actions_mortgageProperty_calldata,
			movePlayer: board_actions_movePlayer,
			buildMovePlayerCalldata: build_board_actions_movePlayer_calldata,
			payRent: board_actions_payRent,
			buildPayRentCalldata: build_board_actions_payRent_calldata,
			rollDice: board_actions_rollDice,
			buildRollDiceCalldata: build_board_actions_rollDice_calldata,
			unmortgageProperty: board_actions_unmortgageProperty,
			buildUnmortgagePropertyCalldata: build_board_actions_unmortgageProperty_calldata,
		},
		economics: {
			applyMarketVolatility: economics_applyMarketVolatility,
			buildApplyMarketVolatilityCalldata: build_economics_applyMarketVolatility_calldata,
			applyUniversalBasicIncome: economics_applyUniversalBasicIncome,
			buildApplyUniversalBasicIncomeCalldata: build_economics_applyUniversalBasicIncome_calldata,
			calculateBankruptcyThreshold: economics_calculateBankruptcyThreshold,
			buildCalculateBankruptcyThresholdCalldata: build_economics_calculateBankruptcyThreshold_calldata,
			calculateInflationAdjustment: economics_calculateInflationAdjustment,
			buildCalculateInflationAdjustmentCalldata: build_economics_calculateInflationAdjustment_calldata,
			calculatePropertyTax: economics_calculatePropertyTax,
			buildCalculatePropertyTaxCalldata: build_economics_calculatePropertyTax_calldata,
			calculateTotalWealth: economics_calculateTotalWealth,
			buildCalculateTotalWealthCalldata: build_economics_calculateTotalWealth_calldata,
			checkEconomicBalance: economics_checkEconomicBalance,
			buildCheckEconomicBalanceCalldata: build_economics_checkEconomicBalance_calldata,
			getEconomicIndicators: economics_getEconomicIndicators,
			buildGetEconomicIndicatorsCalldata: build_economics_getEconomicIndicators_calldata,
			processBankInterest: economics_processBankInterest,
			buildProcessBankInterestCalldata: build_economics_processBankInterest_calldata,
			processSalaryPayment: economics_processSalaryPayment,
			buildProcessSalaryPaymentCalldata: build_economics_processSalaryPayment_calldata,
		},
		game_manager: {
			canPlayerJoin: game_manager_canPlayerJoin,
			buildCanPlayerJoinCalldata: build_game_manager_canPlayerJoin_calldata,
			createGame: game_manager_createGame,
			buildCreateGameCalldata: build_game_manager_createGame_calldata,
			endGame: game_manager_endGame,
			buildEndGameCalldata: build_game_manager_endGame_calldata,
			getGameState: game_manager_getGameState,
			buildGetGameStateCalldata: build_game_manager_getGameState_calldata,
			getPlayerGames: game_manager_getPlayerGames,
			buildGetPlayerGamesCalldata: build_game_manager_getPlayerGames_calldata,
			isGameFull: game_manager_isGameFull,
			buildIsGameFullCalldata: build_game_manager_isGameFull_calldata,
			joinGame: game_manager_joinGame,
			buildJoinGameCalldata: build_game_manager_joinGame_calldata,
			startGame: game_manager_startGame,
			buildStartGameCalldata: build_game_manager_startGame_calldata,
		},
		market_events: {
			applyCompoundEvents: market_events_applyCompoundEvents,
			buildApplyCompoundEventsCalldata: build_market_events_applyCompoundEvents_calldata,
			calculateEventImpact: market_events_calculateEventImpact,
			buildCalculateEventImpactCalldata: build_market_events_calculateEventImpact_calldata,
			createEmergencyIntervention: market_events_createEmergencyIntervention,
			buildCreateEmergencyInterventionCalldata: build_market_events_createEmergencyIntervention_calldata,
			getActiveEvents: market_events_getActiveEvents,
			buildGetActiveEventsCalldata: build_market_events_getActiveEvents_calldata,
			predictNextEvent: market_events_predictNextEvent,
			buildPredictNextEventCalldata: build_market_events_predictNextEvent_calldata,
			processScheduledEvents: market_events_processScheduledEvents,
			buildProcessScheduledEventsCalldata: build_market_events_processScheduledEvents_calldata,
			resolveMarketEvent: market_events_resolveMarketEvent,
			buildResolveMarketEventCalldata: build_market_events_resolveMarketEvent_calldata,
			triggerMarketEvent: market_events_triggerMarketEvent,
			buildTriggerMarketEventCalldata: build_market_events_triggerMarketEvent_calldata,
		},
		property_management: {
			auctionProperty: property_management_auctionProperty,
			buildAuctionPropertyCalldata: build_property_management_auctionProperty_calldata,
			calculateTotalAssets: property_management_calculateTotalAssets,
			buildCalculateTotalAssetsCalldata: build_property_management_calculateTotalAssets_calldata,
			finalizeAuction: property_management_finalizeAuction,
			buildFinalizeAuctionCalldata: build_property_management_finalizeAuction_calldata,
			forceSale: property_management_forceSale,
			buildForceSaleCalldata: build_property_management_forceSale_calldata,
			getColorGroupMonopolyStatus: property_management_getColorGroupMonopolyStatus,
			buildGetColorGroupMonopolyStatusCalldata: build_property_management_getColorGroupMonopolyStatus_calldata,
			getPlayerProperties: property_management_getPlayerProperties,
			buildGetPlayerPropertiesCalldata: build_property_management_getPlayerProperties_calldata,
			getPropertyValue: property_management_getPropertyValue,
			buildGetPropertyValueCalldata: build_property_management_getPropertyValue_calldata,
			initializeProperties: property_management_initializeProperties,
			buildInitializePropertiesCalldata: build_property_management_initializeProperties_calldata,
			placeBid: property_management_placeBid,
			buildPlaceBidCalldata: build_property_management_placeBid_calldata,
			transferProperty: property_management_transferProperty,
			buildTransferPropertyCalldata: build_property_management_transferProperty_calldata,
		},
		random_engine: {
			commitRandomness: random_engine_commitRandomness,
			buildCommitRandomnessCalldata: build_random_engine_commitRandomness_calldata,
			generateCardDraw: random_engine_generateCardDraw,
			buildGenerateCardDrawCalldata: build_random_engine_generateCardDraw_calldata,
			generateDiceRoll: random_engine_generateDiceRoll,
			buildGenerateDiceRollCalldata: build_random_engine_generateDiceRoll_calldata,
			generateMarketEvent: random_engine_generateMarketEvent,
			buildGenerateMarketEventCalldata: build_random_engine_generateMarketEvent_calldata,
			getEntropyPool: random_engine_getEntropyPool,
			buildGetEntropyPoolCalldata: build_random_engine_getEntropyPool_calldata,
			initializeGameRandomness: random_engine_initializeGameRandomness,
			buildInitializeGameRandomnessCalldata: build_random_engine_initializeGameRandomness_calldata,
			isRoundReady: random_engine_isRoundReady,
			buildIsRoundReadyCalldata: build_random_engine_isRoundReady_calldata,
			revealRandomness: random_engine_revealRandomness,
			buildRevealRandomnessCalldata: build_random_engine_revealRandomness_calldata,
			verifyRandomnessIntegrity: random_engine_verifyRandomnessIntegrity,
			buildVerifyRandomnessIntegrityCalldata: build_random_engine_verifyRandomnessIntegrity_calldata,
		},
		security_simple: {
			initializeSecurity: security_simple_initializeSecurity,
			buildInitializeSecurityCalldata: build_security_simple_initializeSecurity_calldata,
			validateAction: security_simple_validateAction,
			buildValidateActionCalldata: build_security_simple_validateAction_calldata,
		},
		treasury: {
			approveWithdrawal: treasury_approveWithdrawal,
			buildApproveWithdrawalCalldata: build_treasury_approveWithdrawal_calldata,
			checkDailyLimits: treasury_checkDailyLimits,
			buildCheckDailyLimitsCalldata: build_treasury_checkDailyLimits_calldata,
			depositFunds: treasury_depositFunds,
			buildDepositFundsCalldata: build_treasury_depositFunds_calldata,
			emergencyPause: treasury_emergencyPause,
			buildEmergencyPauseCalldata: build_treasury_emergencyPause_calldata,
			emergencyResume: treasury_emergencyResume,
			buildEmergencyResumeCalldata: build_treasury_emergencyResume_calldata,
			getBalance: treasury_getBalance,
			buildGetBalanceCalldata: build_treasury_getBalance_calldata,
			getTotalTreasury: treasury_getTotalTreasury,
			buildGetTotalTreasuryCalldata: build_treasury_getTotalTreasury_calldata,
			isWithdrawalAllowed: treasury_isWithdrawalAllowed,
			buildIsWithdrawalAllowedCalldata: build_treasury_isWithdrawalAllowed_calldata,
			requestLargeWithdrawal: treasury_requestLargeWithdrawal,
			buildRequestLargeWithdrawalCalldata: build_treasury_requestLargeWithdrawal_calldata,
			setDailyLimit: treasury_setDailyLimit,
			buildSetDailyLimitCalldata: build_treasury_setDailyLimit_calldata,
			transferBetweenWallets: treasury_transferBetweenWallets,
			buildTransferBetweenWalletsCalldata: build_treasury_transferBetweenWallets_calldata,
			withdrawFunds: treasury_withdrawFunds,
			buildWithdrawFundsCalldata: build_treasury_withdrawFunds_calldata,
		},
	};
}