import type { Player } from '../types'
import { monoTiles } from '../data/boardTiles'

export function PlayersPanel({ players, balances, positions, currentIdx }: { players: Player[]; balances: Record<string, number>; positions: Record<string, number>; currentIdx: number }) {
  return (
    <div className="playersPanel">
      {players.map((p, i) => (
        <div key={p.id} className={`playerRow ${i===currentIdx?'active':''}`}>
          <span className="playerDot" style={{ background: p.color }} />
          <span className="playerName">{p.name}</span>
          <span className="playerPos">{monoTiles[positions[p.id]]?.label || `Tile ${positions[p.id]}`}</span>
          <span className="playerBal">${(balances[p.id] || 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}
