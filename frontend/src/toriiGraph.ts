import { TORII_URL } from './config'

const GQL = `${TORII_URL}/graphql`

export type OpenLobby = { gameId: number; entryEth: string; maxPlayers: number; players: number; host: string }

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) throw new Error(`GraphQL ${res.status}`)

  const data = await res.json()
  if (data.errors) {
    console.error('GraphQL error:', data.errors)
    throw new Error(data.errors?.[0]?.message || 'GraphQL error')
  }
  return data.data as T
}

const TIER_TO_ETH: Record<string, string> = { Bronze: '0.01', Silver: '0.1', Gold: '1', Platinum: '10' }

export async function fetchOpenLobbies(): Promise<OpenLobby[]> {
  type Node = {
    game_id: string;
    status: string;
    entry_tier?: string;
    players?: string[];
    current_turn?: number;
  }
  type Resp = {
    whaleOpolyGameStateModels: {
      edges: { node: Node }[]
    }
  }

  const q = `query OpenLobbies($first: Int) {
    whaleOpolyGameStateModels(first: $first) {
      edges { node { game_id status entry_tier players current_turn } }
    }
  }`

  const data = await gql<Resp>(q, { first: 10 })
  const edges = data?.whaleOpolyGameStateModels?.edges || []

  return edges
    .filter(({ node }) => node.status === 'Lobby' || node.status === 'LOBBY' || node.status === 'Waiting')
    .map(({ node }) => {
      const playerList = Array.isArray(node.players) ? node.players : []
      const players = playerList.length
      const entryEth = node.entry_tier ? (TIER_TO_ETH[node.entry_tier] || '0.01') : '0.01'
      const host = playerList.length > 0
        ? `${String(playerList[0]).slice(0, 6)}...${String(playerList[0]).slice(-4)}`
        : 'unknown'
      return { gameId: Number(node.game_id), entryEth, maxPlayers: 6, players, host }
    })
}

export type WorldEvent = { id: string; createdAt: string; executedAt?: string; transactionHash?: string }

export async function fetchRecentEvents(first = 10): Promise<WorldEvent[]> {
  type Resp = { events: { edges: { node: WorldEvent }[] } }

  const q = `
    query RecentEvents($first: Int) {
      events(first: $first, order: { field: createdAt, direction: DESC }) {
        edges { node { id createdAt executedAt transactionHash } }
      }
    }`

  const data = await gql<Resp>(q, { first })
  return data.events?.edges?.map(e => e.node) || []
}
