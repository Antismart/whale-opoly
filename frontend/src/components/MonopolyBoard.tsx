import React from 'react'
import type { Player } from '../types'
import { monoTiles } from '../data/boardTiles'

function toGrid(i: number): { row: number; col: number; side: 'bottom'|'left'|'top'|'right' } {
  if (i >= 0 && i <= 10) {
    return { row: 11, col: 11 - i, side: 'bottom' }
  }
  if (i >= 11 && i <= 20) {
    return { row: 11 - (i - 10), col: 1, side: 'left' }
  }
  if (i >= 21 && i <= 30) {
    return { row: 1, col: i - 19, side: 'top' }
  }
  // 31..39
  return { row: i - 29, col: 11, side: 'right' }
}

export function MonopolyBoard({ players, positions, ownership, houses, selected, onSelect, d1, d2, rolling, onRoll, mortgages }:{
  players: Player[];
  positions: Record<string, number>;
  ownership: Record<number, string | undefined>;
  houses: Record<number, number>;
  selected: number;
  onSelect: (id: number) => void;
  d1: number; d2: number; rolling: boolean; onRoll: () => void;
  mortgages?: Record<number, boolean>;
}) {
  function tileStyle(id: number, side: 'bottom'|'left'|'top'|'right', baseRow: number, baseCol: number) {
    const isCorner = id === 0 || id === 10 || id === 20 || id === 30
    if (isCorner) {
      // Use single-cell corners to avoid any crossing with side tiles
      if (id === 0) return { gridRow: 11, gridColumn: 11 } as React.CSSProperties
      if (id === 10) return { gridRow: 11, gridColumn: 1 } as React.CSSProperties
      if (id === 20) return { gridRow: 1, gridColumn: 1 } as React.CSSProperties
      return { gridRow: 1, gridColumn: 11 } as React.CSSProperties
    }
    // Place sides on outermost single row/column
    if (side === 'bottom') return { gridRow: 11, gridColumn: baseCol } as React.CSSProperties
    if (side === 'top') return { gridRow: 1, gridColumn: baseCol } as React.CSSProperties
    if (side === 'left') return { gridRow: baseRow, gridColumn: 1 } as React.CSSProperties
    return { gridRow: baseRow, gridColumn: 11 } as React.CSSProperties
  }

  return (
    <div className="boardWrap">
      <div className="boardMono">
        {monoTiles.map((t) => {
          const { row, col, side } = toGrid(t.id)
          const isCorner = t.id === 0 || t.id === 10 || t.id === 20 || t.id === 30
          const isMort = !!(mortgages && mortgages[t.id])
          const classNames = ['monoTile', side, isCorner ? 'corner' : '', selected===t.id?'selected':'', isMort?'mortgaged':'', `kind-${t.kind}`].filter(Boolean).join(' ')
          const style = tileStyle(t.id, side, row, col)
          const ownerId = ownership[t.id]
          const tileHouses = houses[t.id] || 0
          const tilePlayers = players.filter(p => positions[p.id] === t.id)
          return (
            <button
              key={t.id}
              className={classNames}
              style={style}
              onClick={() => onSelect(t.id)}
              data-id={t.id}
              data-corner={isCorner ? t.label : undefined}
              data-side={side}
              data-kind={t.kind}
            >
              {t.color && <span className="colorBar" style={{ background: t.color }} />}
              <span className="index">{t.id}</span>
              <span className="label">{t.label}</span>
              {ownerId && <span className="ownerStripe" style={{ background: players.find(p => p.id===ownerId)?.color }} />}
              {t.kind==='property' && tileHouses>0 && (
                <span className="houses">
                  {tileHouses < 5
                    ? Array.from({length: tileHouses}).map((_,i)=>(<span key={i} className="house" />))
                    : <span className="hotel" />}
                </span>
              )}
              {tilePlayers.length>0 && (
                <span className="tokensWrap">
                  {tilePlayers.map((p,i)=>(<span key={p.id} className="token" style={{ background: p.color, transform: `translateX(${i*12}px)` }} />))}
                </span>
              )}
            </button>
          )
        })}
        <div className="boardCenter">
          <img className="centerLogo" src="/whaleopoly%20transparent.png" alt="Whaleopoly logo" />
        </div>
        <div className="diceTray">
          <div className={`die ${rolling ? 'rolling' : ''}`} aria-label={`die ${d1}`}>
            {[1,2,3,4,5,6,7,8,9].filter(pos => [1,2,3,4,5,6].includes(pos)).map(()=>null) /* placeholder to keep grid */}
            {[1,2,3,4,5,6,7,8,9].filter(p=>({1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]} as Record<number, number[]>)[d1].includes(p)).map((p)=>(<span key={p} className={`pip pos-${p}`} />))}
          </div>
          <div className={`die ${rolling ? 'rolling' : ''}`} aria-label={`die ${d2}`}>
            {[1,2,3,4,5,6,7,8,9].filter(pos => [1,2,3,4,5,6].includes(pos)).map(()=>null)}
            {[1,2,3,4,5,6,7,8,9].filter(p=>({1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]} as Record<number, number[]>)[d2].includes(p)).map((p)=>(<span key={p} className={`pip pos-${p}`} />))}
          </div>
          <button className="btn glow rollBtn" onClick={onRoll} disabled={rolling}>{rolling ? 'Rolling\u2026' : 'Roll'}</button>
        </div>
      </div>
      {/* removed external diceRow to keep everything within board square */}
    </div>
  )
}
