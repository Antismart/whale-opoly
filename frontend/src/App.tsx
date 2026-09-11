
import { useState, useEffect, useMemo, useRef } from 'react'
import './App.css'
import { useDojoSDK, useEntityQuery, useModels } from "@dojoengine/sdk/react"
import { ToriiQueryBuilder, MemberClause } from "@dojoengine/sdk"
import { useAccount } from "@starknet-react/core"
import { CairoCustomEnum, RpcProvider } from "starknet"
import { useToast } from './useToast'

// Abyssal Protocol UI
import { AppShell } from './components/shell/AppShell'
import { ShellIcons } from './components/shell/shellIcons'
import { WalletMenu } from './components/wallet/WalletMenu'
import { LobbyScreen } from './screens/LobbyScreen'
import { HarborScreen } from './screens/HarborScreen'
import { ManualScreen } from './screens/ManualScreen'
import { GameBoard } from './components/board/GameBoard'
import { ControlRail } from './components/rail/ControlRail'
import { CardModal, TradeModal, AuctionModal, VictoryModal, BankruptcyModal } from './components/overlays/Modals'
import type { TradeProperty, FinalStanding } from './components/overlays/Modals'
import { ToastStack, MobileGate, NoActiveGame, WalletDisconnected, ServiceBanner } from './components/states/States'
import { useToriiStatus } from './useToriiStatus'

import { monoTiles } from './data/boardTiles'
import { money } from './format'
import { txErrorReason } from './txError'
import type { Lobby, Card, Player } from './types'

// Utility
function shuffle<T>(arr: T[]): T[] { return [...arr].sort(()=>Math.random()-0.5) }

/* ====================================================================
   CHAIN DECODING

   `useModels` in @dojoengine/sdk 1.8.13 is
   `getEntitiesByModel(ns, name).map(i => ({ [i.entityId]: i.models[ns][name] }))`
   — an ARRAY of `{ entityId: model }` wrappers, NOT an array of models.
   Reading `.status` / `.player` / `.owner` straight off a wrapper gives
   `undefined` for every field, so everything below unwraps first and then
   decodes against the real model shapes in src/bindings/models.gen.ts.
   ==================================================================== */

type ChainModel = Record<string, unknown>

function unwrapModels(wrappers: unknown): ChainModel[] {
  if (!Array.isArray(wrappers)) return []
  const out: ChainModel[] = []
  for (const wrapper of wrappers) {
    if (!wrapper || typeof wrapper !== 'object') continue
    for (const model of Object.values(wrapper as Record<string, unknown>)) {
      if (model && typeof model === 'object') out.push(model as ChainModel)
    }
  }
  return out
}

/** Active variant name of a Cairo enum (GameStatus, GameTier, …). */
function enumVariant(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') return value
  const candidate = value as { activeVariant?: () => string; variant?: Record<string, unknown> }
  if (typeof candidate.activeVariant === 'function') {
    try { return candidate.activeVariant() } catch { /* fall through to .variant */ }
  }
  const variant = candidate.variant
  if (variant && typeof variant === 'object') {
    const hit = Object.entries(variant).find(([, v]) => v !== undefined && v !== null)
    if (hit) return hit[0]
  }
  return undefined
}

/** Contents of a CairoOption, or undefined when it is None. */
function optionValue(value: unknown): string | undefined {
  if (value == null) return undefined
  if (typeof value === 'string') return value
  const candidate = value as {
    isSome?: () => boolean
    unwrap?: () => unknown
    Some?: unknown
    variant?: { Some?: unknown }
  }
  if (typeof candidate.isSome === 'function' && typeof candidate.unwrap === 'function') {
    try { return candidate.isSome() ? String(candidate.unwrap()) : undefined } catch { return undefined }
  }
  if (candidate.Some != null) return String(candidate.Some)
  if (candidate.variant?.Some != null) return String(candidate.variant.Some)
  return undefined
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') { const n = Number(value); return Number.isFinite(n) ? n : 0 }
  return 0
}

/** Padding- and case-tolerant address comparison key. */
function addressKey(value: string | undefined): string {
  if (!value) return ''
  try { return BigInt(value).toString(16) } catch { return value.toLowerCase() }
}

/** Value signature used to tell whether the chain data actually changed. */
function signature(value: unknown): string {
  try {
    return JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)) ?? ''
  } catch {
    // Unserialisable payload: fall back to "always different". The setGame
    // bail-out below still stops this turning into a render loop.
    return `~${Math.random()}`
  }
}

/* The four entry tiers. There is no other tier, and no 0.05. */
const TIER_ETH: Record<string, string> = { Bronze: '0.01', Silver: '0.1', Gold: '1', Platinum: '10' }
const TIER_BY_ENTRY: Record<string, string> = { '0.01': 'Bronze', '0.1': 'Silver', '1': 'Gold', '10': 'Platinum' }
const MAX_SEATS = 6

type ChainSnapshot = {
  lobbies: Lobby[]
  positions: Record<string, number>
  balances: Record<string, number>
  ownership: Record<number, string | undefined>
}

const EMPTY_CHAIN: ChainSnapshot = { lobbies: [], positions: {}, balances: {}, ownership: {} }

function decodeChain(
  gameStates: unknown,
  playerPositions: unknown,
  gameCurrencies: unknown,
  properties: unknown,
  gameId: number | undefined,
): ChainSnapshot {
  const inGame = (model: ChainModel) => gameId === undefined || toNumber(model.game_id) === gameId

  // GameState carries `players: Array<ContractAddress>` and an `entry_tier`
  // enum — there is no `host`, `max_players` or `entry_fee` member, and the
  // waiting status is called `Lobby`.
  const lobbies: Lobby[] = unwrapModels(gameStates)
    .filter((state) => enumVariant(state.status) === 'Lobby')
    .map((state) => {
      const seated = Array.isArray(state.players) ? (state.players as unknown[]).map(String) : []
      const tier = enumVariant(state.entry_tier) ?? 'Bronze'
      return {
        gameId: toNumber(state.game_id),
        host: seated[0] ?? 'Unknown',
        hostAddress: seated[0],
        maxPlayers: MAX_SEATS,
        players: seated.length,
        entryEth: TIER_ETH[tier] ?? TIER_ETH.Bronze,
      }
    })

  const positions: Record<string, number> = {}
  for (const model of unwrapModels(playerPositions)) {
    if (!inGame(model) || typeof model.player !== 'string') continue
    positions[model.player] = toNumber(model.position)
  }

  const balances: Record<string, number> = {}
  for (const model of unwrapModels(gameCurrencies)) {
    if (!inGame(model) || typeof model.player !== 'string') continue
    balances[model.player] = toNumber(model.balance)
  }

  const ownership: Record<number, string | undefined> = {}
  for (const model of unwrapModels(properties)) {
    if (!inGame(model)) continue
    const owner = optionValue(model.owner)
    if (owner) ownership[toNumber(model.property_id)] = owner
  }

  return { lobbies, positions, balances, ownership }
}

function sameRecord(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a)
  if (aKeys.length !== Object.keys(b).length) return false
  return aKeys.every((k) => a[k] === b[k])
}

const PLAYER_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#a78bfa', '#fb923c']
/** Fallback seat colour — --muted, so it still clears 4.5:1 as rail text. */
const NO_PLAYER_COLOR = '#7aa2c4'

function App() {
  // --- Official Dojo SDK integration ---
  const { client } = useDojoSDK();

  /* The SDK's entity hooks return void, so an unreachable indexer is
     indistinguishable from an empty world. Probe it directly. */
  const torii = useToriiStatus();
  const [currentGameId, setCurrentGameId] = useState<number | undefined>();

  // Local state for lobbies (optimistic updates)
  const [localLobbies, setLocalLobbies] = useState<Lobby[]>([]);
  /** Placeholder ids for optimistic rows. Negative, so a real game id can
      never collide with one and no contract call can ever receive one. */
  const pendingIdRef = useRef(-1);

  // Subscribe to game states using official SDK
  useEntityQuery(
    new ToriiQueryBuilder()
      .withClause(MemberClause("whale_opoly-GameState", "status", "Eq", "Active").build())
      .includeHashedKeys()
  );

  // Subscribe to player positions
  useEntityQuery(
    new ToriiQueryBuilder()
      .withClause(MemberClause("whale_opoly-PlayerPosition", "position", "Gte", 0).build())
      .includeHashedKeys()
  );

  // Subscribe to game currencies
  useEntityQuery(
    new ToriiQueryBuilder()
      .withClause(MemberClause("whale_opoly-GameCurrency", "balance", "Gte", 0).build())
      .includeHashedKeys()
  );

  // Subscribe to properties
  useEntityQuery(
    new ToriiQueryBuilder()
      .withClause(MemberClause("whale_opoly-Property", "property_id", "Gte", 0).build())
      .includeHashedKeys()
  );

  // Get data from Dojo Zustand store
  const gameStates = useModels("whale_opoly-GameState");
  const playerPositions = useModels("whale_opoly-PlayerPosition");
  const gameCurrencies = useModels("whale_opoly-GameCurrency");
  const properties = useModels("whale_opoly-Property");

  // Local game state — the single source of truth for the UI.
  // When Dojo entity subscriptions start returning real data, the
  // useEffect below will sync chain state into this local state.
  const [game, setGame] = useState({
    players: [] as { id: string; name: string; color: string }[],
    currentIdx: 0,
    positions: {} as Record<string, number>,
    ownership: {} as Record<number, string | undefined>,
    balances: {} as Record<string, number>,
    houses: {} as Record<number, number>,
  });

  /* Every `useModels` call builds a fresh array of fresh objects, so all four
     selector results have a NEW IDENTITY on every render. Keying the decode
     on a value signature gives the sync effect below a dependency that only
     changes when the data itself changes — without it, effect → setState →
     render → effect is an unbounded loop the moment Torii returns anything. */
  const chainRef = useRef<{ key: string; data: ChainSnapshot }>({ key: '', data: EMPTY_CHAIN });
  const chainKey = signature([gameStates, playerPositions, gameCurrencies, properties, currentGameId ?? null]);
  if (chainKey !== chainRef.current.key) {
    chainRef.current = {
      key: chainKey,
      data: decodeChain(gameStates, playerPositions, gameCurrencies, properties, currentGameId),
    };
  }
  const chain = chainRef.current.data;

  // Sync from blockchain when Dojo entities become available.
  useEffect(() => {
    const { positions, balances, ownership } = chain;
    if (
      Object.keys(positions).length === 0 &&
      Object.keys(balances).length === 0 &&
      Object.keys(ownership).length === 0
    ) return;

    // Returning `prev` unchanged lets React bail out of the re-render, which
    // is the second half of the loop guard above.
    setGame(prev => {
      const nextPositions = { ...prev.positions, ...positions };
      const nextBalances = { ...prev.balances, ...balances };
      const nextOwnership = { ...prev.ownership, ...ownership };
      if (
        sameRecord(prev.positions, nextPositions) &&
        sameRecord(prev.balances, nextBalances) &&
        sameRecord(prev.ownership as Record<string, unknown>, nextOwnership as Record<string, unknown>)
      ) return prev;
      return { ...prev, positions: nextPositions, balances: nextBalances, ownership: nextOwnership };
    });
  }, [chain]);

  /* Merge chain tables with the optimistic rows this browser created.
     A pending row has no real game id yet, so it is reconciled by HOST
     ADDRESS: the moment a chain table hosted by this wallet appears, that
     row IS this table, carrying the id the contract actually assigned. */
  const lobbies: Lobby[] = useMemo(() => {
    const chainHosts = new Set(chain.lobbies.map(l => addressKey(l.hostAddress)));
    const unconfirmed = localLobbies.filter(local =>
      local.pending
        ? !chainHosts.has(addressKey(local.hostAddress))
        : !chain.lobbies.some(remote => remote.gameId === local.gameId)
    );
    return [...chain.lobbies, ...unconfirmed];
  }, [chain, localLobbies]);

  /* Garbage-collect optimistic rows the chain has caught up with. This
     replaces a 30-second interval that captured the first render's closure
     and therefore filtered against a permanently empty array. */
  useEffect(() => {
    if (chain.lobbies.length === 0) return;
    const chainHosts = new Set(chain.lobbies.map(l => addressKey(l.hostAddress)));
    setLocalLobbies(prev => {
      const next = prev.filter(local =>
        local.pending
          ? !chainHosts.has(addressKey(local.hostAddress))
          : !chain.lobbies.some(remote => remote.gameId === local.gameId)
      );
      return next.length === prev.length ? prev : next;
    });
  }, [chain]);

  // Get wallet account
  const { account } = useAccount();
  
  // Real Dojo contract actions
  const createLobby = async (maxPlayers: number, host: string, entryEth: string) => {
    if (!account) {
      toastError('Connect a wallet first');
      return null;
    }
    if (!client) {
      toastError('The Dojo client is not ready yet');
      return null;
    }

    setActionLoading('creating');

    /* The CONTRACT assigns the game id — this row only holds a negative
       placeholder until the indexer hands the real one back, and is marked
       pending so join / start / cancel stay disabled on it. Nothing here is
       ever passed to a contract call. */
    const placeholderId = pendingIdRef.current--;
    const optimisticLobby: Lobby = {
      gameId: placeholderId,
      host,
      hostAddress: account.address,
      maxPlayers,
      players: 1, // Creator takes the first seat
      entryEth,
      pending: true,
    };

    setLocalLobbies(prev => [optimisticLobby, ...prev]);

    try {
      const tierName = TIER_BY_ENTRY[entryEth] ?? 'Bronze';
      const tier = new CairoCustomEnum({ [tierName]: {} });
      const result = await client.game_manager.createGame(account, tier, maxPlayers);

      setActionLoading(null);
      toastSuccess('Table created on-chain', result.transaction_hash);

      // Add creator as first player in local game state
      const creatorId = account.address;
      setGame(prev => {
        if (prev.players.some(p => p.id === creatorId)) return prev;
        const color = PLAYER_COLORS[prev.players.length % PLAYER_COLORS.length];
        return {
          ...prev,
          players: [...prev.players, { id: creatorId, name: host, color }],
          positions: { ...prev.positions, [creatorId]: 0 },
          balances: { ...prev.balances, [creatorId]: 1500 },
        };
      });

      log('good', 'Table created', `${tierName} table, up to ${maxPlayers} players, ${entryEth} ETH entry`);

      // Keep the transaction hash on the row until the chain row replaces it
      setLocalLobbies(prev =>
        prev.map(lobby =>
          lobby.gameId === placeholderId
            ? { ...lobby, transactionHash: result.transaction_hash }
            : lobby
        )
      );

      return { success: true, transactionHash: result.transaction_hash };
    } catch (error) {
      console.error('Create game failed:', error);
      setActionLoading(null);
      toastError(txErrorReason(error, 'Could not create the table'));

      // Remove the optimistic lobby on failure
      setLocalLobbies(prev => prev.filter(lobby => lobby.gameId !== placeholderId));

      return null;
    }
  };

  const joinLobby = async (gameId: number, username: string) => {
    if (!account || !client) { toastError('Connect a wallet first'); return null; }
    if (gameId < 0) { toastError('This table is still being confirmed on-chain'); return null; }
    setActionLoading('joining');

    // Check if user already in this game
    if (game.players.some(p => p.id === account.address)) {
      log('warn', 'Already seated', 'You already hold a seat at this table');
      setActionLoading(null);
      return null;
    }

    // Optimistically update the lobby player count
    setLocalLobbies(prev => 
      prev.map(lobby => 
        lobby.gameId === gameId 
          ? { ...lobby, players: lobby.players + 1 }
          : lobby
      )
    );
    
    try {
      const joinResult = await client.game_manager.joinGame(account, gameId);
      setActionLoading(null);
      toastSuccess('Seat taken', joinResult?.transaction_hash);

      // Add joiner to local game state
      const joinerId = account.address;
      setGame(prev => {
        if (prev.players.some(p => p.id === joinerId)) return prev;
        const color = PLAYER_COLORS[prev.players.length % PLAYER_COLORS.length];
        return {
          ...prev,
          players: [...prev.players, { id: joinerId, name: username, color }],
          positions: { ...prev.positions, [joinerId]: 0 },
          balances: { ...prev.balances, [joinerId]: 1500 },
        };
      });

      log('good', 'Seat taken', `Joined table #${gameId} as ${username}`);
      return { success: true };
    } catch (error) {
      console.error('Join game failed:', error);
      setActionLoading(null);
      toastError(txErrorReason(error, 'Could not join the table'));

      // Revert the optimistic update on failure
      setLocalLobbies(prev => 
        prev.map(lobby => 
          lobby.gameId === gameId 
            ? { ...lobby, players: Math.max(1, lobby.players - 1) }
            : lobby
        )
      );
      
      log('warn', 'Could not join the table', 'The transaction did not go through — try again.');
      return null;
    }
  };
  
  const rollDiceAction = async () => {
    if (!account || !client || !currentGameId) return null;
    try {
      const result = await client.board_actions.rollDice(account, currentGameId);

      // Parse dice values from the transaction receipt's DiceRolled event
      if (result?.transaction_hash) {
        try {
          const rpc = new RpcProvider({ nodeUrl: 'https://api.cartridge.gg/x/starknet/sepolia' });
          const receipt = await rpc.waitForTransaction(result.transaction_hash);

          // DiceRolled event has: game_id, player (keys), dice1, dice2, total, timestamp (data)
          if ('events' in receipt && Array.isArray(receipt.events) && receipt.events.length > 0) {
            for (const event of receipt.events) {
              // Event data contains dice values — dice1 and dice2 are the first two data fields
              if (event.data && event.data.length >= 4) {
                const dice1 = Number(BigInt(event.data[0]));
                const dice2 = Number(BigInt(event.data[1]));
                if (dice1 >= 1 && dice1 <= 6 && dice2 >= 1 && dice2 <= 6) {
                  return { dice1, dice2, success: true };
                }
              }
            }
          }
        } catch (receiptError) {
          console.error('Failed to parse dice from receipt:', receiptError);
        }
      }

      // Fallback: if receipt parsing fails, use local random
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      return { dice1, dice2, success: true };
    } catch (error) {
      console.error('Roll dice failed:', error);
      toastError(txErrorReason(error, 'The dice roll did not go through'));
      return null;
    }
  };

  const buyPropertyAction = async (propertyId: number) => {
    if (!account || !client || !currentGameId) return null;
    setActionLoading('buying');
    try {
      const result = await client.board_actions.buyProperty(account, currentGameId, propertyId);
      setActionLoading(null);
      toastSuccess('Property bought', result?.transaction_hash);
      return { success: true };
    } catch (error) {
      console.error('Buy property failed:', error);
      setActionLoading(null);
      toastError(txErrorReason(error, 'The purchase did not go through'));
      return null;
    }
  };

  const startGame = async (gameId: number) => {
    if (!account || !client) { toastError('Connect a wallet first'); return null; }
    if (gameId < 0) { toastError('This table is still being confirmed on-chain'); return null; }
    setActionLoading('starting');
    // Tracked separately: currentGameId is not set until the transaction
    // resolves, so it cannot tell the Harbor rows which table is starting.
    setStartingId(gameId);
    try {
      const result = await client.game_manager.startGame(account, gameId);
      toastSuccess('Table started', result?.transaction_hash);
      setCurrentGameId(gameId);
      // Switch to play section
      setSection('play');
      log('good', 'Table started', `Table #${gameId} is now in play`);
      return { success: true };
    } catch (error) {
      console.error('Start game failed:', error);
      toastError(txErrorReason(error, 'Could not start the table'));
      return null;
    } finally {
      setActionLoading(null);
      setStartingId(null);
    }
  };

  // Update local game state — all game logic flows through this function.
  const updateGame = (updater: (prev: typeof game) => typeof game) => {
    setGame(updater);
  };
  
  // --- Toast & loading state ---
  const { toasts, success: toastSuccess, error: toastError, info: toastInfo, removeToast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null) // 'creating' | 'joining' | 'rolling' | 'buying' | null
  /** The table id whose start transaction is in flight, if any. */
  const [startingId, setStartingId] = useState<number | null>(null)

  // --- Core state ---
  const [section, setSection] = useState<'onboard'|'dashboard'|'play'|'manual'>('onboard')
  const [selected, setSelected] = useState(0)
  const [d1, setD1] = useState(1)
  const [d2, setD2] = useState(1)
  const [rolling, setRolling] = useState(false)
  const [feed, setFeed] = useState<{kind:'good'|'warn'|'info'; title:string; body:string; time:string}[]>([])
  const [mortgages, setMortgages] = useState<Record<number, boolean>>({})
  const [inJail, setInJail] = useState<Record<string, number>>({})
  const [lastRoll, setLastRoll] = useState(0)
  const [doublesCount, setDoublesCount] = useState(0)
  const [turnCount, setTurnCount] = useState(0)
  const [tradeOpen, setTradeOpen] = useState(false)
  const [tradeOffer, setTradeOffer] = useState<{ toPlayer: string; propertyId: number; price: number } | null>(null)
  const [auctionOpen, setAuctionOpen] = useState(false)
  const [auctionBid, setAuctionBid] = useState(0)
  // lobbies come from blockchain entities merged with local optimistic state
  const [gameOver, setGameOver] = useState<{ winner: typeof game.players[0] } | null>(null);
  const [bankruptcy, setBankruptcy] = useState<{
    player: Player
    debt: number
    creditor: Player | null
    propertiesTransferred: number
  } | null>(null);
  const gameOverRef = useRef(false);
  const [openCard, setOpenCard] = useState<Card | undefined>()
  const [chanceDeck, setChanceDeck] = useState<Card[]>(() => shuffle([
    { id:'c1', deck:'chance', title:'Advance to Start', text:'Collect $200', action:{ kind:'move', to:0, passGo:true } },
    { id:'c2', deck:'chance', title:'Bank error', text:'Collect $75', action:{ kind:'money', amount:75 } },
    { id:'c3', deck:'chance', title:'Pay fine', text:'Pay $50', action:{ kind:'money', amount:-50 } },
    { id:'c4', deck:'chance', title:'Speeding fine', text:'Pay $15', action:{ kind:'money', amount:-15 } },
    { id:'c5', deck:'chance', title:'Go to Jail', text:'Go directly to Jail', action:{ kind:'goto_jail' } },
    { id:'c6', deck:'chance', title:'Get Out of Jail Free', text:'Keep until needed', action:{ kind:'jail_pass' }, keep:true },
    { id:'c7', deck:'chance', title:'Advance 3', text:'Move forward 3 tiles', action:{ kind:'move_rel', delta:3 } },
    { id:'c8', deck:'chance', title:'Go Back 2', text:'Move back 2 tiles', action:{ kind:'move_rel', delta:-2 } },
    { id:'c9', deck:'chance', title:'Nearest Rail', text:'Advance to nearest rail & pay rent', action:{ kind:'nearest_rail' } },
    { id:'c10', deck:'chance', title:'Nearest Utility', text:'Advance to nearest utility', action:{ kind:'nearest_utility' } },
    { id:'c11', deck:'chance', title:'Repairs', text:'Pay $25 per house / $100 per hotel', action:{ kind:'repair', perHouse:25, perHotel:100 } },
    { id:'c12', deck:'chance', title:'Collect from each', text:'Collect $10 from each player', action:{ kind:'collect_each', amount:10 } },
  ]))
  const [chestDeck, setChestDeck] = useState<Card[]>(() => shuffle([
    { id:'h1', deck:'chest', title:'Consulting fee', text:'Collect $25', action:{ kind:'money', amount:25 } },
    { id:'h2', deck:'chest', title:'Doctor fee', text:'Pay $50', action:{ kind:'money', amount:-50 } },
    { id:'h3', deck:'chest', title:'Tax refund', text:'Collect $20', action:{ kind:'money', amount:20 } },
    { id:'h4', deck:'chest', title:'Get Out of Jail Free', text:'Keep until needed', action:{ kind:'jail_pass' }, keep:true },
    { id:'h5', deck:'chest', title:'Advance to Start', text:'Collect $200', action:{ kind:'move', to:0, passGo:true } },
    { id:'h6', deck:'chest', title:'Birthday', text:'Collect $10 from each player', action:{ kind:'collect_each', amount:10 } },
    { id:'h7', deck:'chest', title:'School fees', text:'Pay $50', action:{ kind:'money', amount:-50 } },
    { id:'h8', deck:'chest', title:'Hospital fees', text:'Pay $100', action:{ kind:'money', amount:-100 } },
    { id:'h9', deck:'chest', title:'You inherit', text:'Collect $100', action:{ kind:'money', amount:100 } },
    { id:'h10', deck:'chest', title:'Charity donation', text:'Pay $20', action:{ kind:'money', amount:-20 } },
    { id:'h11', deck:'chest', title:'Repair assets', text:'Pay $40 per house / $115 per hotel', action:{ kind:'repair', perHouse:40, perHotel:115 } },
    { id:'h12', deck:'chest', title:'Move forward 1', text:'Advance 1 tile', action:{ kind:'move_rel', delta:1 } },
  ]))
  const [jailPasses, setJailPasses] = useState<Record<string, number>>({})
  const [lastCreditor, setLastCreditor] = useState<string | null>(null)


  // Prices
  const price: Record<number, number> = { 1:60,3:60,6:100,8:100,9:120,11:140,13:140,14:160,16:180,18:180,19:200,21:220,23:220,24:240,26:260,27:260,29:280,31:300,32:300,34:320,37:350,39:400, 5:200,15:200,25:200,35:200, 12:150,28:150 }
  const houseCost: Record<number, number> = { 1:50,3:50,6:50,8:50,9:50,11:100,13:100,14:100,16:100,18:100,19:100,21:150,23:150,24:150,26:150,27:150,29:150,31:200,32:200,34:200,37:200,39:200 }

  function now(){ return new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) }
  function log(kind:'good'|'warn'|'info', title:string, body:string){ setFeed(f=>[{kind,title,body,time:now()},...f].slice(0,25)) }

  const groups: Record<string, number[]> = { lightblue:[1,3], green:[6,8,9], purple:[11,13,14], orange:[16,18,19], teal:[21,23,24], salmon:[26,27,29], blue:[31,32,34], darkblue:[37,39] }
  function groupFor(id:number){ return Object.keys(groups).find(k=>groups[k].includes(id)) }
  function ownsGroup(pid:string, id:number){ const g=groupFor(id); if(!g) return false; return groups[g].every(tid=>game.ownership[tid]===pid) }

  /* Draw the top card.
     A card the player does NOT keep is consumed, so "12 cards left" in the
     rail and on the Harbor screen is true rather than pinned at 12 forever.
     A `keep` card goes to the back of the deck because the player banks a
     copy of it. `setOpenCard` is called from here, not from inside the deck
     updater — an impure updater is double-invoked under StrictMode. */
  function drawCard(deck:'chance'|'chest') {
    if (openCard) return
    const source = deck === 'chance' ? chanceDeck : chestDeck
    if (source.length === 0) return
    const [card, ...rest] = source
    const nextDeck = rest.length ? (card.keep ? [...rest, card] : rest) : [card]
    if (deck === 'chance') setChanceDeck(nextDeck)
    else setChestDeck(nextDeck)
    setOpenCard(card)
  }
  function nearest(id:number, list:number[]){ for(let i=1;i<=40;i++){ const t=(id+i)%40; if(list.includes(t)) return t } return id }

  function applyCard(card: Card){
    const cur = game.players[game.currentIdx]; if(!cur) return; const pid = cur.id
    const action = card.action
    switch(action.kind){
      case 'money': { const amt=action.amount; updateGame(g=>({...g, balances:{...g.balances,[pid]:(g.balances[pid]||0)+amt}})); log(amt>=0?'good':'warn', card.title, `${amt>=0?'+':'−'}${money(Math.abs(amt))}`); break }
      case 'move': { const from=game.positions[pid]; const passGo=action.passGo && (from>action.to); updateGame(g=>({...g, positions:{...g.positions,[pid]:action.to}, balances: passGo?{...g.balances,[pid]:g.balances[pid]+200}:g.balances})); setSelected(action.to); if(passGo) log('good','Passed Start',`+${money(200)}`); log('info',card.title,card.text); break }
      case 'move_rel': { const from=game.positions[pid]; const to=(from+action.delta+40)%40; updateGame(g=>({...g, positions:{...g.positions,[pid]:to}})); setSelected(to); log('info',card.title,card.text); break }
      case 'goto_jail': { updateGame(g=>({...g, positions:{...g.positions,[pid]:10}})); setInJail(j=>({...j,[pid]:3})); setSelected(10); log('warn','Sent to Jail',`Three turns, or post ${money(50)} bail`); break }
      case 'jail_pass': { setJailPasses(p=>({...p,[pid]:(p[pid]||0)+1})); log('good','Jail pass banked','Held until you use it'); break }
      case 'collect_each': { updateGame(g=>{ let delta=0; const up={...g.balances}; g.players.forEach(pl=>{ if(pl.id!==pid){ up[pl.id]-=action.amount; delta+=action.amount } }); up[pid]+=delta; return {...g, balances:up} }); log('good',card.title,`+${money(action.amount)} from every other player`); break }
      case 'pay_each': { updateGame(g=>{ let cost=0; g.players.forEach(pl=>{ if(pl.id!==pid) cost+=action.amount }); return {...g, balances:{...g.balances,[pid]:g.balances[pid]-cost}} }); log('warn',card.title,`−${money(action.amount)} to every other player`); break }
      case 'nearest_rail': { const to=nearest(game.positions[pid],[5,15,25,35]); updateGame(g=>({...g, positions:{...g.positions,[pid]:to}})); setSelected(to); log('info',card.title,`Moved to Rail ${to}`); break }
      case 'nearest_utility': { const to=nearest(game.positions[pid],[12,28]); updateGame(g=>({...g, positions:{...g.positions,[pid]:to}})); setSelected(to); log('info',card.title,`Moved to Utility ${to}`); break }
      case 'repair': { const housesCount=Object.entries(game.houses).reduce((a,[,c])=>a+(c&&c<5?c:0),0); const hotelsCount=Object.entries(game.houses).reduce((a,[,c])=>a+(c===5?1:0),0); const cost=housesCount*action.perHouse+hotelsCount*action.perHotel; if(cost>0) updateGame(g=>({...g, balances:{...g.balances,[pid]:g.balances[pid]-cost}})); log('warn',card.title,`−${money(cost)}`); break }
    }
    /* Always close. `keep` decides whether the pass is BANKED, not whether
       the dialog dismisses — leaving it open let a player press Apply
       repeatedly and mint unlimited jail passes. */
    setOpenCard(undefined)
  }
  function useJailPass(){ const cur=game.players[game.currentIdx]; if(!cur) return; if((inJail[cur.id]||0)===0) return; if((jailPasses[cur.id]||0)<=0) return; setJailPasses(p=>({...p,[cur.id]:p[cur.id]-1})); setInJail(j=>({...j,[cur.id]:0})); log('good','Jail pass used','Out of Jail') }

  async function handleGameOver(winner: typeof game.players[0]) {
    // The bankruptcy effect can be double-invoked under StrictMode; settling
    // the pot is not something to do twice.
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setGameOver({ winner });
    log('good', 'Table complete', `${winner.name} wins the table`);

    // Call contract to end the game
    if (account && client && currentGameId) {
      try {
        const { CairoOption, CairoOptionVariant } = await import('starknet');
        await client.game_manager.endGame(
          account,
          currentGameId,
          new CairoOption(CairoOptionVariant.Some, winner.id)
        );
        toastSuccess(`${winner.name} wins the table — the pot is settled by the contract.`);
      } catch (error) {
        console.error('End game contract call failed:', error);
        toastError(txErrorReason(error, 'That action may not have synced to the chain'));
      }
    }
  }

  /* Bankruptcy is evaluated against the CURRENT balances, from an effect
     keyed on game state. It used to run from a `setTimeout` that closed over
     the pre-deduction render, so `balance < 0` was never true on the payment
     that actually caused it — elimination always fired one action late, off a
     stale roster. */
  useEffect(() => {
    if (gameOver) return;
    const broke = game.players.find(p => (game.balances[p.id] ?? 0) < 0);
    if (!broke) return;

    const debt = Math.abs(game.balances[broke.id] ?? 0);
    const creditor = lastCreditor ? game.players.find(p => p.id === lastCreditor) ?? null : null;
    const transferred = Object.values(game.ownership).filter(o => o === broke.id).length;

    log('warn', 'Player bankrupt', `${broke.name} cannot cover ${money(debt)} and is out of the table`);
    setBankruptcy({ player: broke, debt, creditor, propertiesTransferred: transferred });

    updateGame(g => {
      const removedIdx = g.players.findIndex(p => p.id === broke.id);
      if (removedIdx === -1) return g;
      const newPlayers = g.players.filter(p => p.id !== broke.id);

      // Adjust currentIdx if the removed player was before or at current turn
      let newIdx = g.currentIdx;
      if (newPlayers.length === 0) {
        newIdx = 0;
      } else if (removedIdx < g.currentIdx) {
        newIdx = g.currentIdx - 1;
      } else if (removedIdx === g.currentIdx) {
        // Current player went bankrupt — the same index now points at the
        // next player, so only the wrap-around needs handling.
        newIdx = g.currentIdx % newPlayers.length;
      }
      if (newIdx >= newPlayers.length) newIdx = 0;

      return {
        ...g,
        players: newPlayers,
        currentIdx: newIdx,
        ownership: Object.fromEntries(
          Object.entries(g.ownership).map(([tid, propOwner]) =>
            [tid, propOwner === broke.id ? (lastCreditor || undefined) : propOwner]
          )
        ),
        houses: Object.fromEntries(
          Object.entries(g.houses).map(([tid, count]) =>
            [tid, g.ownership[Number(tid)] === broke.id ? 0 : count]
          )
        ),
      };
    });

    // The table is over when one player is left standing.
    const remainingPlayers = game.players.filter(p => p.id !== broke.id);
    if (remainingPlayers.length === 1) handleGameOver(remainingPlayers[0]);
    // handleGameOver / log / updateGame are stable enough for this check;
    // re-running on any game change is what makes it see fresh balances.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, lastCreditor, gameOver]);

  function moveAndResolve(steps:number, diceA?:number, diceB?:number){
    const cur=game.players[game.currentIdx]; if(!cur) return;
    if((inJail[cur.id]||0)>0){
      // In jail — check if player rolled doubles to escape
      if(diceA !== undefined && diceB !== undefined && diceA === diceB) {
        // Doubles! Escape jail and move
        setInJail(j=>({...j,[cur.id]:0}));
        setDoublesCount(0); // Reset doubles — no extra turn from jail escape
        log('good',`${cur.name} rolled doubles!`,'Escaped from Jail!');
        // Continue with normal movement below (don't return)
      } else {
        log('warn',`${cur.name} is in Jail`,`No doubles — ${inJail[cur.id]} turn${(inJail[cur.id]||0)>1?'s':''} left. Pay bail or use pass.`);
        return;
      }
    }
    const from=game.positions[cur.id] || 0; const to=(from+steps)%40; const passGo=from+steps>=40
    updateGame(g=>({...g, positions:{...g.positions,[cur.id]:to}, balances: passGo?{...g.balances,[cur.id]:(g.balances[cur.id]||0)+200}:g.balances }))
    if(passGo) log('good',`${cur.name} passed Start`,`+${money(200)}`)
    setSelected(to)
    const tile=monoTiles[to]; if(!tile) return
    if(tile.kind==='chance'){ drawCard('chance'); return }
    if(tile.kind==='chest'){ drawCard('chest'); return }
    if(tile.kind==='tax'){
      const taxAmount = to === 38 ? 75 : 200; // Tile 38 = Luxury Tax ($75), Tile 4 = Income Tax ($200)
      updateGame(g=>({...g, balances:{...g.balances,[cur.id]:(g.balances[cur.id]||0)-taxAmount}}));
      log('warn',`${cur.name} paid ${tile.label}`,`−${money(taxAmount)}`);
      return;
    }
    if(tile.kind==='gotojail'){ updateGame(g=>({...g, positions:{...g.positions,[cur.id]:10}})); setInJail(j=>({...j,[cur.id]:3})); setSelected(10); log('warn',`${cur.name} went to Jail`,`Three turns, or post ${money(50)} bail`); return }
    if(['property','rail','utility'].includes(tile.kind)){
      const owner=game.ownership[to]; if(owner && owner!==cur.id && !mortgages[to]){
        const baseRent = Math.max(10, Math.floor((price[to]||100) * 0.1));
        const houseCount = game.houses[to] || 0;
        const multipliers = [1, 5, 15, 45, 62, 75];
        let rent = baseRent * (multipliers[houseCount] || 1);
        if([5,15,25,35].includes(to)){ const count=[5,15,25,35].filter(r=>game.ownership[r]===owner).length; rent=[0,25,50,100,200][count] }
        if([12,28].includes(to)){ const count=[12,28].filter(u=>game.ownership[u]===owner).length; rent=(count===2?10:4)*Math.max(2,lastRoll||7) }
        updateGame(g=>({...g, balances:{...g.balances, [cur.id]:g.balances[cur.id]-rent, [owner]:(g.balances[owner]||0)+rent }}))
        if (account && client && currentGameId) {
          client.board_actions.payRent(account, currentGameId, to).catch((err: unknown) => {
            console.error('Pay rent contract call failed:', err);
          });
        }
        setLastCreditor(owner);
        log('info',`${cur.name} paid rent`, `−${money(rent)} to ${game.players.find(p=>p.id===owner)?.name ?? 'the owner'}`)
      }
    }
    // Bankruptcy is picked up by the effect keyed on `game`, which sees the
    // post-deduction balances rather than this render's stale closure.
  }
  function handleDoublesAndMove(dice1: number, dice2: number) {
    setD1(dice1);
    setD2(dice2);
    setLastRoll(dice1 + dice2);

    const isDoubles = dice1 === dice2;
    if (isDoubles) {
      const newCount = doublesCount + 1;
      setDoublesCount(newCount);
      if (newCount >= 3) {
        // Three doubles = jail
        setDoublesCount(0);
        updateGame(g => ({...g, positions: {...g.positions, [game.players[game.currentIdx].id]: 10}}));
        setInJail(j => ({...j, [game.players[game.currentIdx].id]: 3}));
        setSelected(10);
        log('warn', 'Three doubles', `${game.players[game.currentIdx].name} rolled doubles three times and goes to Jail`);
        setRolling(false);
        return;
      }
      log('info', 'Doubles', `${game.players[game.currentIdx].name} rolled doubles and rolls again`);
    } else {
      setDoublesCount(0);
    }

    setRolling(false);
    moveAndResolve(dice1 + dice2, dice1, dice2);
  }

  async function rollDice(){
    if(rolling||openCard) return;
    if(!isMyTurn) { toastError("It is not your turn"); return; }
    setRolling(true);
    setLastCreditor(null);

    try {
      // Use real Dojo contract for dice roll
      const dojoResult = await rollDiceAction();
      if (dojoResult?.dice1 && dojoResult?.dice2) {
        // After rolling dice, also call move_player on contract
        if (account && client && currentGameId) {
          try {
            await client.board_actions.movePlayer(account, currentGameId);
          } catch (error) {
            console.error('Move player contract call failed:', error);
            toastError(txErrorReason(error, 'That action may not have synced to the chain'));
          }
        }
        setTimeout(() => handleDoublesAndMove(dojoResult.dice1, dojoResult.dice2), 420);
        return;
      }
    } catch (error) {
      console.error('Dojo dice roll failed:', error);
    }

    // Fallback to local dice roll if contract call fails
    const r1=1+Math.floor(Math.random()*6);
    const r2=1+Math.floor(Math.random()*6);
    setTimeout(() => handleDoublesAndMove(r1, r2), 420);
  }

  function isCurrentPlayer() { return !!account && game.players[game.currentIdx]?.id === account.address; }

  async function buyProperty(id:number){
    if(!isCurrentPlayer()) { toastError("It is not your turn"); return; }
    const t=monoTiles[id];
    if(!t) return;
    if(!['property','rail','utility'].includes(t.kind)) return;
    const cur=game.players[game.currentIdx]; 
    if(!cur) return;
    if(game.ownership[id]) return log('warn','Already owned','Someone already holds this property'); 
    const cost=price[id]||0; 
    if((game.balances[cur.id] || 0)<cost) return log('warn','Not enough cash',`This costs ${money(cost)}`); 
    
    try {
      // Use real Dojo contract
      const dojoResult = await buyPropertyAction(id);
      if (dojoResult?.success) {
        // Update local state to reflect the purchase
        updateGame(g => ({
          ...g,
          ownership: { ...g.ownership, [id]: cur.id },
          balances: { ...g.balances, [cur.id]: (g.balances[cur.id] || 0) - cost },
        }));
        log('good','Property bought',`${t.label} for ${money(cost)}`);
        return;
      }
    } catch (error) {
      console.error('Dojo buy property failed:', error);
    }

    // Fallback: update locally even if contract call failed
    updateGame(g => ({
      ...g,
      ownership: { ...g.ownership, [id]: cur.id },
      balances: { ...g.balances, [cur.id]: (g.balances[cur.id] || 0) - cost },
    }));
    log('good','Property bought',`${t.label} for ${money(cost)}`);
  }
  async function buildHouse(id:number){ if(!isCurrentPlayer()) { toastError("It is not your turn"); return; } const t=monoTiles[id]; if(!t||t.kind!=='property') return; const cur=game.players[game.currentIdx]; if(!cur) return; if(game.ownership[id]!==cur.id) return log('warn','You do not own this property',''); if(!ownsGroup(cur.id,id)) return log('warn','Own every property in the group first',''); const current=game.houses[id]||0; if(current>=5) return log('warn','This property already has a hotel',''); const cost=current===4?houseCost[id]*2:houseCost[id]; if((game.balances[cur.id]||0)<cost) return log('warn','Not enough cash',`This costs ${money(cost)}`); if (account && client && currentGameId) { try { await client.board_actions.developProperty(account, currentGameId, id); } catch (error) { console.error('Develop property contract call failed:', error); toastError(txErrorReason(error, 'That action may not have synced to the chain')); } } updateGame(g=>({...g, houses:{...g.houses,[id]:current+1}, balances:{...g.balances,[cur.id]:(g.balances[cur.id]||0)-cost}})); log('good', current===4?'Hotel built':'House built', `−${money(cost)}`) }
  async function mortgageProperty(id:number){ if(!isCurrentPlayer()) { toastError("It is not your turn"); return; } if(mortgages[id]) return log('warn','Already mortgaged','This property is already mortgaged'); const cur=game.players[game.currentIdx]; if(!cur) return; if(game.ownership[id]!==cur.id) return log('warn','You do not own this property',''); const val=Math.floor((price[id]||0)/2); if (account && client && currentGameId) { try { await client.board_actions.mortgageProperty(account, currentGameId, id); } catch (error) { console.error('Mortgage contract call failed:', error); toastError(txErrorReason(error, 'That action may not have synced to the chain')); } } setMortgages(m=>({...m,[id]:true})); updateGame(g=>({...g, balances:{...g.balances,[cur.id]:(g.balances[cur.id]||0)+val}})); log('info','Mortgaged',`+${money(val)}`) }
  async function unmortgageProperty(id:number){ if(!isCurrentPlayer()) { toastError("It is not your turn"); return; } if(!mortgages[id]) return; const cur=game.players[game.currentIdx]; if(!cur) return; const val=Math.floor((price[id]||0)/2)*1.1; if((game.balances[cur.id]||0)<val) return log('warn','Not enough cash',`Lifting this mortgage costs ${money(val)}`); if (account && client && currentGameId) { try { await client.board_actions.unmortgageProperty(account, currentGameId, id); } catch (error) { console.error('Unmortgage contract call failed:', error); toastError(txErrorReason(error, 'That action may not have synced to the chain')); } } setMortgages(m=>{const n={...m}; delete n[id]; return n}); updateGame(g=>({...g, balances:{...g.balances,[cur.id]:(g.balances[cur.id]||0)-val}})); log('info','Unmortgaged',`−${money(val)}`) }
  async function payBail(){ if(!isCurrentPlayer()) { toastError("It is not your turn"); return; } const cur=game.players[game.currentIdx]; if(!cur) return; if((inJail[cur.id]||0)===0) return; if((game.balances[cur.id]||0)<50) return log('warn','Not enough cash',`Bail is ${money(50)}`); if (account && client && currentGameId) { try { await client.board_actions.payBail(account, currentGameId); } catch (error) { console.error('Pay bail contract call failed:', error); toastError(txErrorReason(error, 'That action may not have synced to the chain')); } } updateGame(g=>({...g, balances:{...g.balances,[cur.id]:(g.balances[cur.id]||0)-50}})); setInJail(j=>({...j,[cur.id]:0})); log('good','Bail paid','Out of Jail') }
  async function endTurn(){
    if(!isCurrentPlayer()) { toastError("It is not your turn"); return; }
    if(openCard) return log('warn','Resolve the open card first','Apply it, then end your turn');

    // If player rolled doubles, don't advance turn (they go again)
    if (doublesCount > 0 && !openCard) {
      log('info', 'Extra roll', `${curPlayer.name} rolled doubles and rolls again`);
      return; // Don't advance — player rolls again
    }
    setDoublesCount(0);

    // Turn limit check
    const newTurnCount = turnCount + 1;
    setTurnCount(newTurnCount);

    if (newTurnCount >= 100) {
      // Game over — highest balance wins
      const winner = [...game.players].sort((a, b) => (game.balances[b.id] || 0) - (game.balances[a.id] || 0))[0];
      if (winner) {
        handleGameOver(winner);
        log('warn', 'Turn limit reached', `100 turns played — ${winner.name} wins on balance`);
        return;
      }
    }

    if (account && client && currentGameId) { try { await client.board_actions.endTurn(account, currentGameId); } catch (error) { console.error('End turn contract call failed:', error); toastError(txErrorReason(error, 'That action may not have synced to the chain')); } }
    updateGame(g=>({...g, currentIdx:(g.currentIdx+1)%g.players.length }));
    setInJail(j => {
      const n = {...j};
      Object.keys(n).forEach(k => {
        if(n[k] > 0) {
          n[k] -= 1;
          if(n[k] === 0) {
            // Released from jail — force $50 bail payment
            updateGame(g => ({
              ...g,
              balances: { ...g.balances, [k]: (g.balances[k] || 0) - 50 }
            }));
            log('warn', 'Released from Jail', `${game.players.find(p=>p.id===k)?.name || k} served three turns — ${money(50)} bail taken`);
          }
        }
      });
      return n;
    });
  }

  // Derived
  const curPlayer = game.players[game.currentIdx] || { id: '', name: 'No player', color: NO_PLAYER_COLOR }
  const isMyTurn = !!account && curPlayer.id === account.address
  const tile = monoTiles[selected]
  const owner = game.ownership[selected]
  const canBuy = isMyTurn && tile && ['property','rail','utility'].includes(tile.kind) && !owner
  const canBuild = isMyTurn && tile && tile.kind==='property' && owner===curPlayer.id && ownsGroup(curPlayer.id, selected)
  const canDrawCard = isMyTurn && tile && ['chance','chest'].includes(tile.kind) && !openCard
  const hasJailPass = curPlayer.id ? (jailPasses[curPlayer.id]||0)>0 : false
  const isMortgaged = !!mortgages[selected]

  /* ------------------------------------------------------------------
     Presentation-only derived values.
     Nothing below mutates game state — it formats what already exists.
     ETH appears ONLY on the table entry stake and the pot; every board
     figure is game dollars.
     ------------------------------------------------------------------ */
  const activeLobby = currentGameId !== undefined ? lobbies.find(l => l.gameId === currentGameId) : undefined
  const entryEthNum = activeLobby ? Number(activeLobby.entryEth) || 0 : 0
  const seatsFilled = activeLobby ? activeLobby.players : game.players.length
  const potEthLabel = `${Math.round(entryEthNum * seatsFilled * 1e6) / 1e6} ETH`
  const activeTable = activeLobby
    ? {
        tableId: activeLobby.gameId,
        seatsFilled: activeLobby.players,
        seatsTotal: activeLobby.maxPlayers,
        tier: TIER_BY_ENTRY[activeLobby.entryEth] ?? 'Bronze',
        entry: `${entryEthNum} ETH`,
        pot: potEthLabel,
      }
    : null

  // The jail pass is player state, not a board action — it rides in the
  // shell's sidebar tray so it never covers a tile.
  const canUseJailPass = section === 'play' && hasJailPass && !!curPlayer.id && (inJail[curPlayer.id] || 0) > 0

  const navItems = [
    { id: 'onboard', label: 'Lobby', icon: ShellIcons.lobby, badge: lobbies.length > 0 ? lobbies.length : undefined },
    { id: 'dashboard', label: 'Harbor', icon: ShellIcons.harbor },
    { id: 'play', label: 'Play', icon: ShellIcons.play },
    { id: 'manual', label: 'Manual', icon: ShellIcons.manual },
  ]

  const tradePropertyFor = (tileId: number): TradeProperty | undefined => {
    const t = monoTiles[tileId]
    if (!t) return undefined
    return {
      tileId,
      name: t.label,
      groupColor: t.color,
      price: price[tileId] ?? 0,
      houses: game.houses[tileId] ?? 0,
      mortgaged: !!mortgages[tileId],
    }
  }
  const propertiesOwnedBy = (pid: string): TradeProperty[] =>
    Object.entries(game.ownership)
      .filter(([, o]) => !!pid && o === pid)
      .map(([tid]) => tradePropertyFor(Number(tid)))
      .filter((p): p is TradeProperty => !!p)
  const boardProperties: TradeProperty[] = monoTiles
    .filter(t => t.kind === 'property')
    .map(t => ({ tileId: t.id, name: t.label, groupColor: t.color, price: price[t.id] ?? 0 }))

  const standings: FinalStanding[] = gameOver
    ? [...game.players]
        .sort((a, b) => {
          if (a.id === gameOver.winner.id) return -1
          if (b.id === gameOver.winner.id) return 1
          return (game.balances[b.id] || 0) - (game.balances[a.id] || 0)
        })
        .map(p => ({
          id: p.id,
          name: p.name,
          color: p.color,
          properties: Object.values(game.ownership).filter(o => o === p.id).length,
          balance: game.balances[p.id] || 0,
        }))
    : []

  // --- JSX ---
  return (
    <>
      <MobileGate />

      <AppShell
        section={section}
        navItems={navItems}
        onNavigate={(id) => setSection(id as typeof section)}
        walletSlot={<WalletMenu onCopyAddress={() => toastSuccess('Address copied')} />}
        activeTable={activeTable}
        sidebarFooterSlot={canUseJailPass ? (
          <button type="button" className="btn btn-outline jailpass-action" onClick={useJailPass}>
            Use jail pass
            <span className="chip chip-sm chip-value num">{jailPasses[curPlayer.id] || 0}</span>
          </button>
        ) : undefined}
        onOpenRulebook={() => setSection('manual')}
      >
        {torii.status === 'gone' || torii.status === 'error' ? (
          <ServiceBanner
            tone={torii.status === 'gone' ? 'danger' : 'warn'}
            title={
              torii.status === 'gone'
                ? 'Live game data is offline'
                : 'Live game data is having trouble'
            }
            detail={
              torii.status === 'gone'
                ? 'The indexer for this world is no longer deployed, so tables and board state cannot load. Existing games are unaffected on-chain — the service in front of them needs redeploying.'
                : 'The indexer is responding with errors. Tables and board state may be missing or out of date.'
            }
            actionLabel="Check again"
            onAction={() => void torii.recheck()}
            busy={torii.checking}
          />
        ) : null}

        {section === 'onboard' && (
          <LobbyScreen
            lobbies={lobbies}
            dataUnavailable={torii.status === 'gone' || torii.status === 'error'}
            isConnected={!!account}
            currentAddress={account?.address}
            actionLoading={actionLoading}
            onCreate={async (maxPlayers, host, entryEth) => {
              try {
                const result = await createLobby(maxPlayers, host, entryEth);
                if (result?.success && result?.transactionHash) {
                  log('info','Table is live', 'Other players can find it in the Lobby and take a seat.');
                } else {
                  throw new Error('Failed to create lobby');
                }
              } catch (error) {
                console.error('Failed to create lobby:', error);
                log('warn','Could not create the table', 'Check your wallet connection and try again.');
              }
            }}
            onJoin={async (gameId, username) => {
              try {
                const result = await joinLobby(gameId, username);
                if (result?.success) {
                  log('good','Seat taken', `${username} joined table #${gameId}`);
                  setCurrentGameId(gameId);
                  setSection('play');
                } else {
                  throw new Error('Failed to join lobby');
                }
              } catch (error) {
                console.error('Failed to join lobby:', error);
                log('warn','Could not join the table', 'Check your wallet connection and try again.');
              }
            }}
            onStart={async (gameId) => {
              try {
                const result = await startGame(gameId);
                if (!result?.success) {
                  throw new Error('Failed to start game');
                }
              } catch (error) {
                console.error('Failed to start game:', error);
                log('warn','Could not start the table', 'Check your wallet connection and try again.');
              }
            }}
            onCancel={async (gameId) => {
              if (!account || !client) return;
              try {
                await client.game_manager.cancelGame(account, gameId);
                toastSuccess('Table cancelled');
                setLocalLobbies(prev => prev.filter(l => l.gameId !== gameId));
                log('info', 'Table cancelled', `Table #${gameId} was cancelled and the stake refunded`);
              } catch (error) {
                console.error('Cancel game failed:', error);
                toastError('Only the host can cancel this table');
              }
            }}
          />
        )}

        {section === 'dashboard' && (
          <HarborScreen
            stats={{
              openTables: lobbies.length,
              players: game.players.length,
              ownedTiles: Object.values(game.ownership).filter(Boolean).length,
              housesBuilt: Object.values(game.houses).reduce((a, c) => a + (c || 0), 0),
              cashTotal: Object.values(game.balances).reduce((a: number, c) => a + (Number(c) || 0), 0),
              chanceLeft: chanceDeck.length,
              chestLeft: chestDeck.length,
            }}
            lobbies={lobbies}
            players={game.players}
            balances={game.balances}
            positions={game.positions}
            currentIdx={game.currentIdx}
            ownership={game.ownership}
            inJail={inJail}
            jailPasses={jailPasses}
            myPlayerId={account?.address}
            feed={feed}
            hasActiveGame={game.players.length > 0}
            onGoToBoard={() => setSection('play')}
            onGoToLobby={() => setSection('onboard')}
            onStart={startGame}
            startingGameId={startingId}
            seatsTotal={activeTable ? activeTable.seatsTotal : undefined}
          />
        )}

        {section === 'play' && !account && (
          <WalletDisconnected
            action={<WalletMenu onCopyAddress={() => toastSuccess('Address copied')} />}
            secondaryLabel="Read the rulebook"
            onSecondary={() => setSection('manual')}
          />
        )}

        {section === 'play' && !!account && game.players.length === 0 && (
          <NoActiveGame
            onGoToLobby={() => setSection('onboard')}
            secondaryLabel="Read the rulebook"
            onSecondary={() => setSection('manual')}
          />
        )}

        {section === 'play' && !!account && game.players.length > 0 && (
          <div className="play-layout">
            <div className="play-board">
              <GameBoard
                players={game.players}
                positions={game.positions}
                ownership={game.ownership}
                houses={game.houses}
                selected={selected}
                onSelect={setSelected}
                d1={d1}
                d2={d2}
                rolling={rolling}
                onRoll={rollDice}
                mortgages={mortgages}
                currentPlayerIdx={game.currentIdx}
                prices={price}
                lastRoll={lastRoll}
                isMyTurn={isMyTurn}
                canRoll={!openCard}
                potEth={activeTable ? activeTable.pot : undefined}
              />
            </div>

            <ControlRail
              cur={curPlayer}
              isMyTurn={isMyTurn}
              myId={account?.address}
            seatsTotal={activeTable ? activeTable.seatsTotal : undefined}
              tile={tile}
              price={price[selected]}
              canBuy={!!canBuy}
              canBuild={!!canBuild}
              canDraw={!!canDrawCard}
              canMortgage={!!(owner === curPlayer.id && !isMortgaged && tile && ['property','rail','utility'].includes(tile.kind))}
              canUnmortgage={!!(owner === curPlayer.id && isMortgaged)}
              inJailTurns={inJail[curPlayer.id] || 0}
              inJail={inJail}
              jailPasses={jailPasses}
              onBuy={() => buyProperty(selected)}
              onBuild={() => buildHouse(selected)}
              onDraw={() => tile?.kind === 'chance' ? drawCard('chance') : tile?.kind === 'chest' ? drawCard('chest') : undefined}
              onEndTurn={endTurn}
              onMortgage={() => mortgageProperty(selected)}
              onUnmortgage={() => unmortgageProperty(selected)}
              onPayBail={payBail}
              onTrade={() => setTradeOpen(true)}
              onAuction={() => {
                if (!canBuy) { toastInfo('Select an unowned property to auction'); return; }
                setAuctionBid(price[selected] || 100);
                setAuctionOpen(true);
              }}
              canForceSkip={!!account && game.players[game.currentIdx]?.id !== account.address}
              onForceSkip={async () => {
                if (!account || !client || !currentGameId) return;
                try {
                  await client.board_actions.forceSkipTurn(account, currentGameId);
                  toastSuccess('Turn skipped');
                  log('info', 'Turn skipped', 'The timed-out player was skipped');
                } catch (error) {
                  console.error('Force skip failed:', error);
                  toastError('That turn has not timed out yet');
                }
              }}
              balances={game.balances}
              players={game.players}
              positions={game.positions}
              ownership={game.ownership}
              houses={game.houses}
              mortgages={mortgages}
              currentIdx={game.currentIdx}
              chanceLeft={chanceDeck.length}
              chestLeft={chestDeck.length}
              feed={feed}
            />

          </div>
        )}

        {section === 'manual' && <ManualScreen onBackToBoard={() => setSection('play')} />}
      </AppShell>

      {/* Chance / Community Chest card */}
      <CardModal
        open={!!openCard}
        card={openCard}
        drawnBy={{ name: curPlayer.name, color: curPlayer.color }}
        tileLookup={(tileId) => monoTiles[tileId]?.label}
        onApply={applyCard}
        onClose={() => setOpenCard(undefined)}
      />

      {/* Trade */}
      <TradeModal
        open={tradeOpen}
        players={game.players}
        myId={curPlayer.id}
        myProperties={propertiesOwnedBy(curPlayer.id)}
        theirProperties={propertiesOwnedBy(tradeOffer?.toPlayer || '')}
        tileLookup={tradePropertyFor}
        boardProperties={boardProperties}
        myBalance={game.balances[curPlayer.id] || 0}
        value={tradeOffer ?? { toPlayer: '', propertyId: 0, price: 0 }}
        onChange={setTradeOffer}
        onClose={() => { setTradeOpen(false); setTradeOffer(null); }}
        onSubmit={async () => {
          if (!tradeOffer?.toPlayer || !tradeOffer?.propertyId) return;
          const cur = game.players[game.currentIdx];
          if (!cur) return;

          if (account && client && currentGameId) {
            try {
              await client.property_management.transferProperty(
                account, currentGameId, tradeOffer.propertyId, tradeOffer.toPlayer, tradeOffer.price
              );
              toastSuccess('Trade completed');
            } catch (error) {
              console.error('Trade contract call failed:', error);
              toastError(txErrorReason(error, 'That action may not have synced to the chain'));
            }
          }

          updateGame(g => ({
            ...g,
            ownership: { ...g.ownership, [tradeOffer.propertyId]: tradeOffer.toPlayer },
            balances: {
              ...g.balances,
              [cur.id]: (g.balances[cur.id] || 0) + tradeOffer.price,
              [tradeOffer.toPlayer]: (g.balances[tradeOffer.toPlayer] || 0) - tradeOffer.price,
            }
          }));

          const tradeTile = monoTiles[tradeOffer.propertyId];
          log('good', 'Trade completed', `${tradeTile?.label || 'Property'} sold for ${money(tradeOffer.price)}`);
          setTradeOpen(false);
          setTradeOffer(null);
        }}
      />

      {/* Auction */}
      <AuctionModal
        open={auctionOpen}
        propertyName={monoTiles[selected]?.label || `Tile ${selected}`}
        groupColor={monoTiles[selected]?.color}
        startingPrice={price[selected] || 0}
        value={auctionBid}
        onChange={setAuctionBid}
        maxBid={game.balances[curPlayer.id] || 0}
        onPass={() => setAuctionOpen(false)}
        onClose={() => setAuctionOpen(false)}
        onBid={async () => {
          if (account && client && currentGameId) {
            try {
              await client.property_management.auctionProperty(account, currentGameId, selected, auctionBid);
              toastSuccess('Bid accepted');
            } catch (error) {
              console.error('Auction contract call failed:', error);
              toastError(txErrorReason(error, 'The bid may not have synced to the chain'));
            }
          }
          updateGame(g => ({
            ...g,
            ownership: { ...g.ownership, [selected]: curPlayer.id },
            balances: { ...g.balances, [curPlayer.id]: (g.balances[curPlayer.id] || 0) - auctionBid },
          }));
          log('good', 'Auction won', `${monoTiles[selected]?.label || 'Property'} bought for ${money(auctionBid)}`);
          setAuctionOpen(false);
        }}
      />

      {/* Bankruptcy — a real event in the engine, so it gets a real surface */}
      {bankruptcy && (
        <BankruptcyModal
          open
          player={{ name: bankruptcy.player.name, color: bankruptcy.player.color }}
          debt={bankruptcy.debt}
          creditor={bankruptcy.creditor ? { name: bankruptcy.creditor.name, color: bankruptcy.creditor.color } : null}
          propertiesTransferred={bankruptcy.propertiesTransferred}
          onContinue={() => setBankruptcy(null)}
          onClose={() => setBankruptcy(null)}
        />
      )}

      {/* Victory */}
      {gameOver && (
        <VictoryModal
          open
          winner={gameOver.winner}
          finalBalance={game.balances[gameOver.winner.id] || 0}
          standings={standings}
          pot={activeTable ? activeTable.pot : undefined}
          onNewGame={() => { gameOverRef.current = false; setGameOver(null); setSection('onboard'); }}
          onClose={() => setGameOver(null)}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={removeToast} />
    </>
  )
}

export default App
