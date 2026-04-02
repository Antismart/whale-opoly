import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type Player = {
  id: string;        // Contract address or local ID
  name: string;
  color: string;
};

export type Lobby = {
  gameId: number;
  host: string;
  entryEth: string;
  maxPlayers: number;
  players: number;
};

export type FeedItem = {
  kind: 'good' | 'warn' | 'info';
  title: string;
  body: string;
  time: string;
};

/* ------------------------------------------------------------------ */
/*  Store interface                                                     */
/* ------------------------------------------------------------------ */

type Section = 'onboard' | 'dashboard' | 'play' | 'events';
type FeedKind = FeedItem['kind'];

interface GameStore {
  // Connection
  isOnChain: boolean;

  // Game state
  currentGameId: number | undefined;
  players: Player[];
  positions: Record<string, number>;
  balances: Record<string, number>;
  ownership: Record<number, string | undefined>;
  houses: Record<number, number>;
  currentIdx: number;
  mortgages: Record<number, boolean>;
  inJail: Record<string, number>;       // playerId -> turns remaining
  jailPasses: Record<string, number>;

  // Lobbies
  lobbies: Lobby[];
  localLobbies: Lobby[];  // Optimistic lobbies before blockchain confirms

  // UI
  section: Section;
  selected: number;       // Selected tile
  feed: FeedItem[];

  // Dice
  d1: number;
  d2: number;
  rolling: boolean;
  lastRoll: number;

  // Actions - state mutations
  setCurrentGameId: (id: number | undefined) => void;
  setSection: (s: Section) => void;
  setSelected: (tile: number) => void;
  setDice: (d1: number, d2: number) => void;
  setRolling: (rolling: boolean) => void;
  setLastRoll: (total: number) => void;

  // Game mutations
  updatePositions: (positions: Record<string, number>) => void;
  updateBalances: (balances: Record<string, number>) => void;
  setOwnership: (tileId: number, playerId: string | undefined) => void;
  setHouses: (tileId: number, count: number) => void;
  setMortgage: (tileId: number, mortgaged: boolean) => void;
  setJail: (playerId: string, turns: number) => void;
  setJailPass: (playerId: string, count: number) => void;
  advanceTurn: () => void;
  movePlayer: (playerId: string, newPosition: number) => void;
  adjustBalance: (playerId: string, amount: number) => void;

  // Lobby mutations
  setLobbies: (lobbies: Lobby[]) => void;
  addLocalLobby: (lobby: Lobby) => void;
  removeLocalLobby: (gameId: number) => void;
  updateLocalLobby: (gameId: number, update: Partial<Lobby>) => void;
  syncLobbies: (blockchainLobbies: Lobby[]) => void;

  // Feed
  log: (kind: FeedKind, title: string, body: string) => void;

  // Bulk sync from blockchain
  syncFromChain: (data: {
    players?: Player[];
    positions?: Record<string, number>;
    balances?: Record<string, number>;
    ownership?: Record<number, string | undefined>;
    houses?: Record<number, number>;
    currentIdx?: number;
  }) => void;

  // Reset for new game
  resetGame: () => void;
}

/* ------------------------------------------------------------------ */
/*  Default players & initial state                                    */
/* ------------------------------------------------------------------ */

const DEFAULT_PLAYERS: Player[] = [
  { id: 'P1', name: 'Blue',   color: '#4da3ff' },
  { id: 'P2', name: 'Red',    color: '#ff6b6b' },
  { id: 'P3', name: 'Green',  color: '#3ecf8e' },
  { id: 'P4', name: 'Yellow', color: '#ffd166' },
];

function defaultPositions(players: Player[]): Record<string, number> {
  return Object.fromEntries(players.map(p => [p.id, 0]));
}

function defaultBalances(players: Player[]): Record<string, number> {
  return Object.fromEntries(players.map(p => [p.id, 1500]));
}

const MAX_FEED = 25;

function timeStamp(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useGameStore = create<GameStore>()(
  immer((set) => ({
    // ---- Connection ----
    isOnChain: false,

    // ---- Game state ----
    currentGameId: undefined,
    players: DEFAULT_PLAYERS,
    positions: defaultPositions(DEFAULT_PLAYERS),
    balances: defaultBalances(DEFAULT_PLAYERS),
    ownership: {},
    houses: {},
    currentIdx: 0,
    mortgages: {},
    inJail: {},
    jailPasses: {},

    // ---- Lobbies ----
    lobbies: [],
    localLobbies: [],

    // ---- UI ----
    section: 'onboard',
    selected: 0,
    feed: [],

    // ---- Dice ----
    d1: 1,
    d2: 1,
    rolling: false,
    lastRoll: 0,

    /* ============================================================== */
    /*  Simple setters                                                 */
    /* ============================================================== */

    setCurrentGameId: (id) =>
      set((state) => {
        state.currentGameId = id;
      }),

    setSection: (s) =>
      set((state) => {
        state.section = s;
      }),

    setSelected: (tile) =>
      set((state) => {
        state.selected = tile;
      }),

    setDice: (d1, d2) =>
      set((state) => {
        state.d1 = d1;
        state.d2 = d2;
      }),

    setRolling: (rolling) =>
      set((state) => {
        state.rolling = rolling;
      }),

    setLastRoll: (total) =>
      set((state) => {
        state.lastRoll = total;
      }),

    /* ============================================================== */
    /*  Game mutations                                                 */
    /* ============================================================== */

    updatePositions: (positions) =>
      set((state) => {
        Object.assign(state.positions, positions);
      }),

    updateBalances: (balances) =>
      set((state) => {
        Object.assign(state.balances, balances);
      }),

    setOwnership: (tileId, playerId) =>
      set((state) => {
        state.ownership[tileId] = playerId;
      }),

    setHouses: (tileId, count) =>
      set((state) => {
        state.houses[tileId] = count;
      }),

    setMortgage: (tileId, mortgaged) =>
      set((state) => {
        state.mortgages[tileId] = mortgaged;
      }),

    setJail: (playerId, turns) =>
      set((state) => {
        if (turns <= 0) {
          delete state.inJail[playerId];
        } else {
          state.inJail[playerId] = turns;
        }
      }),

    setJailPass: (playerId, count) =>
      set((state) => {
        state.jailPasses[playerId] = count;
      }),

    advanceTurn: () =>
      set((state) => {
        const len = state.players.length;
        if (len === 0) return;
        state.currentIdx = (state.currentIdx + 1) % len;

        // Decrement jail turns for every jailed player
        for (const pid of Object.keys(state.inJail)) {
          state.inJail[pid] -= 1;
          if (state.inJail[pid] <= 0) {
            delete state.inJail[pid];
          }
        }
      }),

    movePlayer: (playerId, newPosition) =>
      set((state) => {
        state.positions[playerId] = newPosition;
      }),

    adjustBalance: (playerId, amount) =>
      set((state) => {
        state.balances[playerId] = (state.balances[playerId] ?? 0) + amount;
      }),

    /* ============================================================== */
    /*  Lobby mutations                                                */
    /* ============================================================== */

    setLobbies: (lobbies) =>
      set((state) => {
        state.lobbies = lobbies;
      }),

    addLocalLobby: (lobby) =>
      set((state) => {
        state.localLobbies.push(lobby);
      }),

    removeLocalLobby: (gameId) =>
      set((state) => {
        state.localLobbies = state.localLobbies.filter(l => l.gameId !== gameId);
      }),

    updateLocalLobby: (gameId, update) =>
      set((state) => {
        const lobby = state.localLobbies.find(l => l.gameId === gameId);
        if (lobby) {
          Object.assign(lobby, update);
        }
      }),

    syncLobbies: (blockchainLobbies) =>
      set((state) => {
        // Blockchain lobbies take priority
        const chainIds = new Set(blockchainLobbies.map(l => l.gameId));

        // Keep local lobbies that have NOT yet appeared on-chain
        state.localLobbies = state.localLobbies.filter(l => !chainIds.has(l.gameId));

        // Merge: blockchain first, then remaining local optimistic ones
        state.lobbies = [...blockchainLobbies, ...state.localLobbies];

        // If we got real data from chain, mark as on-chain
        if (blockchainLobbies.length > 0) {
          state.isOnChain = true;
        }
      }),

    /* ============================================================== */
    /*  Feed                                                           */
    /* ============================================================== */

    log: (kind, title, body) =>
      set((state) => {
        const item: FeedItem = { kind, title, body, time: timeStamp() };
        state.feed.unshift(item);
        if (state.feed.length > MAX_FEED) {
          state.feed.length = MAX_FEED;
        }
      }),

    /* ============================================================== */
    /*  Bulk sync from blockchain                                      */
    /* ============================================================== */

    syncFromChain: (data) =>
      set((state) => {
        if (data.players !== undefined)    state.players    = data.players;
        if (data.positions !== undefined)  state.positions  = data.positions;
        if (data.balances !== undefined)   state.balances   = data.balances;
        if (data.ownership !== undefined)  state.ownership  = data.ownership;
        if (data.houses !== undefined)     state.houses     = data.houses;
        if (data.currentIdx !== undefined) state.currentIdx = data.currentIdx;
        state.isOnChain = true;
      }),

    /* ============================================================== */
    /*  Reset for new game                                             */
    /* ============================================================== */

    resetGame: () =>
      set((state) => {
        state.currentGameId = undefined;
        state.players       = DEFAULT_PLAYERS;
        state.positions     = defaultPositions(DEFAULT_PLAYERS);
        state.balances      = defaultBalances(DEFAULT_PLAYERS);
        state.ownership     = {};
        state.houses        = {};
        state.currentIdx    = 0;
        state.mortgages     = {};
        state.inJail        = {};
        state.jailPasses    = {};
        state.d1            = 1;
        state.d2            = 1;
        state.rolling       = false;
        state.lastRoll      = 0;
        state.selected      = 0;
        state.feed          = [];
        state.isOnChain     = false;
      }),
  }))
);
