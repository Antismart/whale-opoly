import { TORII_URL } from './config'

const GQL = `${TORII_URL}/graphql`

export type OpenLobby = { gameId: number; entryEth: string; maxPlayers: number; players: number; host: string }

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  try {
    console.log('GraphQL query:', query.replace(/\s+/g, ' ').trim());
    console.log('GraphQL variables:', variables);
    
    const payload = { query, variables };
    console.log('GraphQL payload:', payload);
    
    const body = JSON.stringify(payload);
    console.log('GraphQL body stringified successfully');
    
    const res = await fetch(GQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    })
    
    console.log('Fetch response status:', res.status);
    
    if (!res.ok) throw new Error(`GraphQL ${res.status}`)
    
    const data = await res.json()
    console.log('GraphQL response data:', data);
    
    if (data.errors) throw new Error(data.errors?.[0]?.message || 'GraphQL error')
    return data.data as T
  } catch (error) {
    console.error('GraphQL error details:', error);
    throw error;
  }
}

const TIER_TO_ETH: Record<string,string> = { Bronze: '0.01', Silver: '0.1', Gold: '1', Platinum: '10' }

// Try to fetch GameState entries in Lobby status
export async function fetchOpenLobbies(): Promise<OpenLobby[]> {
  type Resp = {
    whaleOpolyGameStateModels: {
      edges: { node: { game_id: string; status: string; entry_tier?: string; players?: unknown } }[]
    }
  }
  const q = `query OpenLobbies($first: Int) {
    whaleOpolyGameStateModels(first: $first) {
      edges { node { game_id status entry_tier players } }
    }
  }`
  const data = await gql<Resp>(q, { first: 10 })
  const edges = data?.whaleOpolyGameStateModels?.edges || []
  const map: OpenLobby[] = edges
    .filter(({ node }) => node.status === 'Lobby' || node.status === 'LOBBY' || node.status === 'Waiting')
    .map(({ node }) => {
      const playersCount = Array.isArray((node as Record<string, unknown>).players) ? ((node as Record<string, unknown>).players as unknown[]).length : (typeof (node as Record<string, unknown>).players_count === 'number' ? (node as Record<string, unknown>).players_count as number : 0)
      const entryEth = node.entry_tier ? (TIER_TO_ETH[node.entry_tier] || '0.10') : '0.10'
      return { gameId: Number(node.game_id), entryEth, maxPlayers: 6, players: playersCount, host: 'on-chain' }
    })
  return map
}

export type WorldEvent = { id: string; createdAt: string; executedAt?: string; transactionHash?: string }
export async function fetchRecentEvents(first = 10): Promise<WorldEvent[]> {
  type Resp = { events: { edges: { node: WorldEvent }[] } }
  const q = `
    query RecentEvents($first: Int){
      events(first: $first, order: { field: createdAt, direction: DESC }) {
        edges { node { id createdAt executedAt transactionHash } }
      }
    }`
  const data = await gql<Resp>(q, { first })
  return data.events?.edges?.map(e => e.node) || []
}
