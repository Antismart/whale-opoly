import type { Player } from '../types'

export function PlayersPanel({ players, balances, positions, currentIdx }: { players: Player[]; balances: Record<string, number>; positions: Record<string, number>; currentIdx: number }) {
  return (
    <div className="playersPanel">
      {players.map((p, i) => (
        <div key={p.id} className={`playerRow ${i===currentIdx?'active':''}`}>
          <span className="playerDot" style={{ background: p.color }} />
          <span className="playerName">{p.name}</span>
          <span className="playerPos">Tile {positions[p.id]}</span>
          <span className="playerBal">${balances[p.id]}</span>
        </div>
      ))}
    </div>
  )
}
