import type { Player, TileData } from '../types'

export function TileDetails({ tile, ownerId, players, price, houses, mortgaged }: { tile?: TileData; ownerId?: string; players: Player[]; price?: number; houses: number; mortgaged?: boolean }) {
  const ownerPlayer = ownerId ? players.find(p => p.id === ownerId) : undefined
  const ownerName = ownerPlayer ? ownerPlayer.name : ownerId ? `${ownerId.slice(0, 6)}...${ownerId.slice(-4)}` : 'Unowned'
  if (!tile) return null
  return (
    <div className="tileDetails">
      <div className="tileHeader">
        <div className="colorSwatch" style={{ background: tile.color || 'transparent' }} />
        <div className="tileTitle">{tile.label}</div>
        <div className="tileKind">{tile.kind}</div>
      </div>
      {price != null && <div className="row"><span>Price</span><span>${price.toLocaleString()}</span></div>}
      <div className="row"><span>Owner</span><span>{ownerName}</span></div>
      {tile.kind==='property' && <div className="row"><span>Houses</span><span>{houses === 5 ? 'Hotel' : houses}</span></div>}
      {typeof mortgaged === 'boolean' && <div className="row"><span>Status</span><span>{mortgaged ? 'Mortgaged' : 'Active'}</span></div>}
    </div>
  )
}
