export type Player = {
  id: string;
  name: string;
  color: string;
}

export type Lobby = {
  gameId: number;
  host: string;
  maxPlayers: number;
  players: number;
  entryEth: string;
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
