import type { Player, TileData } from '../types'

export function ActionBar({ cur, tile, canBuy, canBuild, canDraw, onBuy, onBuild, onDraw, onEndTurn, onMortgage, onUnmortgage, canMortgage, canUnmortgage, inJailTurns, onPayBail, onTrade, onAuction, balances }: {
  cur: Player;
  tile?: TileData;
  canBuy: boolean;
  canBuild: boolean;
  canDraw: boolean;
  onBuy: () => void;
  onBuild: () => void;
  onDraw: () => void;
  onEndTurn: () => void;
  onMortgage: () => void;
  onUnmortgage: () => void;
  canMortgage: boolean;
  canUnmortgage: boolean;
  inJailTurns: number;
  onPayBail: () => void;
  onTrade: () => void;
  onAuction: () => void;
  balances: Record<string, number>;
}) {
  return (
    <div className="actionBar">
      <div className="turnRow">
        <span className="playerDot" style={{ background: cur.color }} />
        <span className="turnText">{cur.name}'s turn {inJailTurns>0 && `(Jail: ${inJailTurns})`}</span>
        {tile && <span className="currentTile">• {tile.label}</span>}
        <span className="spacer" />
        <span className="balance">${balances[cur.id]}</span>
      </div>
      <div className="btnRow">
        <button className="btn glow" onClick={onEndTurn}>End Turn</button>
        {canBuy && <button className="btn outline" onClick={onBuy}>Buy</button>}
        {canBuild && <button className="btn outline" onClick={onBuild}>Build</button>}
        {canDraw && <button className="btn outline" onClick={onDraw}>Apply Card</button>}
        {canMortgage && <button className="btn outline" onClick={onMortgage}>Mortgage</button>}
        {canUnmortgage && <button className="btn outline" onClick={onUnmortgage}>Unmortgage</button>}
        {inJailTurns>0 && <button className="btn outline" onClick={onPayBail}>Pay Bail ($50)</button>}
        <button className="btn ghost" onClick={onTrade}>Trade</button>
        <button className="btn ghost" onClick={onAuction}>Auction</button>
      </div>
    </div>
  )
}
