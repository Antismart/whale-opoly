import type { Player, TileData } from '../types'

export function TileDetails({ tile, ownerId, players, price, houses, mortgaged }: { tile?: TileData; ownerId?: string; players: Player[]; price?: number; houses: number; mortgaged?: boolean }) {
  const ownerName = ownerId ? (players.find(p => p.id===ownerId)?.name || ownerId) : 'Unowned'
  if (!tile) return null
  return (
    <div className="tileDetails">
      <div className="tileHeader">
        <div className="colorSwatch" style={{ background: tile.color || 'transparent' }} />
        <div className="tileTitle">{tile.label}</div>
        <div className="tileKind">{tile.kind}</div>
      </div>
      {price && <div className="row"><span>Price</span><span>${price}</span></div>}
      <div className="row"><span>Owner</span><span>{ownerName}</span></div>
      {tile.kind==='property' && <div className="row"><span>Houses</span><span>{houses === 5 ? 'Hotel' : houses}</span></div>}
      {typeof mortgaged === 'boolean' && <div className="row"><span>Status</span><span>{mortgaged ? 'Mortgaged' : 'Active'}</span></div>}
    </div>
  )
}
