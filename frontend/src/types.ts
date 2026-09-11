export type Player = {
  id: string;
  name: string;
  color: string;
}

export type Lobby = {
  /**
   * The contract's game id. Optimistic rows created locally before the chain
   * has assigned one carry a NEGATIVE placeholder and `pending: true`; those
   * ids are never sent to a contract call.
   */
  gameId: number;
  /** Display name of the host — a username locally, an address from chain. */
  host: string;
  /** The host's wallet address, when known. Ownership is decided on this. */
  hostAddress?: string;
  maxPlayers: number;
  players: number;
  entryEth: string;
  /** True while the table exists only locally, waiting for the indexer. */
  pending?: boolean;
  /** Hash of the create transaction, when one has been submitted. */
  transactionHash?: string;
}

// --- Card system types ---
export type CardAction =
  | { kind: 'money'; amount: number }
  | { kind: 'move'; to: number; passGo?: boolean }
  | { kind: 'move_rel'; delta: number }
  | { kind: 'goto_jail' }
  | { kind: 'jail_pass' }
  | { kind: 'collect_each'; amount: number }
  | { kind: 'pay_each'; amount: number }
  | { kind: 'nearest_rail' }
  | { kind: 'nearest_utility' }
  | { kind: 'repair'; perHouse: number; perHotel: number }

export type Card = { id: string; deck: 'chance'|'chest'; title: string; text: string; action: CardAction; keep?: boolean }

export type TileData = { id: number; kind: 'corner'|'property'|'chance'|'chest'|'tax'|'rail'|'utility'|'gotojail'|'free'|'jail'; label: string; color?: string }
