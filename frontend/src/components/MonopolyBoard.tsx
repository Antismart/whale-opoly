import React from 'react'
import type { Player } from '../types'
import { monoTiles } from '../data/boardTiles'
import './Board.css'

/* ------------------------------------------------------------------ */
/*  Grid placement helper — maps tile index 0-39 to 11×11 board       */
/* ------------------------------------------------------------------ */
function toGrid(i: number): { row: number; col: number; side: 'bottom' | 'left' | 'top' | 'right' } {
  if (i >= 0 && i <= 10) return { row: 11, col: 11 - i, side: 'bottom' }
  if (i >= 11 && i <= 20) return { row: 11 - (i - 10), col: 1, side: 'left' }
  if (i >= 21 && i <= 30) return { row: 1, col: i - 19, side: 'top' }
  return { row: i - 29, col: 11, side: 'right' }
}

/* ------------------------------------------------------------------ */
/*  Dice pip layout lookup                                             */
/* ------------------------------------------------------------------ */
const PIP_MAP: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface MonopolyBoardProps {
  players: Player[]
  positions: Record<string, number>
  ownership: Record<number, string | undefined>
  houses: Record<number, number>
  selected: number
  onSelect: (id: number) => void
  d1: number
  d2: number
  rolling: boolean
  onRoll: () => void
  mortgages?: Record<number, boolean>
  currentPlayerIdx?: number
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function MonopolyBoard({
  players,
  positions,
  ownership,
  houses,
  selected,
  onSelect,
  d1,
  d2,
  rolling,
  onRoll,
  mortgages,
  currentPlayerIdx,
}: MonopolyBoardProps) {
  const activePlayerId = currentPlayerIdx != null ? players[currentPlayerIdx]?.id : undefined

  return (
    <div className="boardWrap">
      <div className="boardMono">
        {/* --- Tiles --- */}
        {monoTiles.map((t) => {
          const { row, col, side } = toGrid(t.id)
          const isCorner = t.id === 0 || t.id === 10 || t.id === 20 || t.id === 30
          const isMort = !!(mortgages && mortgages[t.id])

          const classNames = [
            'monoTile',
            side,
            isCorner ? 'corner' : '',
            selected === t.id ? 'selected' : '',
            isMort ? 'mortgaged' : '',
            `kind-${t.kind}`,
          ]
            .filter(Boolean)
            .join(' ')

          // Grid placement + optional property color tint (15% opacity for visible group identity)
          const tint = t.color ? `linear-gradient(to bottom, ${t.color}26, transparent)` : undefined
          const style: React.CSSProperties = {
            gridRow: row,
            gridColumn: col,
            ...(tint ? { background: tint } : {}),
          }

          const ownerId = ownership[t.id]
          const ownerPlayer = ownerId ? players.find((p) => p.id === ownerId) : undefined
          const tileHouses = houses[t.id] || 0
          const tilePlayers = players.filter((p) => positions[p.id] === t.id)

          return (
            <button
              key={t.id}
              className={classNames}
              style={style}
              onClick={() => onSelect(t.id)}
              data-id={t.id}
              data-side={side}
              data-kind={t.kind}
            >
              {/* Color bar — bold, full-opacity strip */}
              {t.color && (
                <span
                  className="colorBar"
                  style={{
                    background: t.color,
                    boxShadow: `0 0 8px ${t.color}55`,
                    ...(side === 'top' || side === 'bottom'
                      ? { minHeight: 12 }
                      : { minWidth: 10 }),
                  }}
                />
              )}

              {/* Label */}
              <span className="label">{t.label}</span>

              {/* Owner stripe */}
              {ownerPlayer && (
                <span
                  className="ownerStripe"
                  style={{ background: ownerPlayer.color }}
                />
              )}

              {/* Houses / Hotel */}
              {t.kind === 'property' && tileHouses > 0 && (
                <span className="houses">
                  {tileHouses < 5
                    ? Array.from({ length: tileHouses }).map((_, i) => (
                        <span key={i} className="house" />
                      ))
                    : <span className="hotel" />}
                </span>
              )}

              {/* Player tokens */}
              {tilePlayers.length > 0 && (
                <span className="tokensWrap">
                  {tilePlayers.map((p) => {
                    const isActive = p.id === activePlayerId
                    return (
                      <span
                        key={p.id}
                        className={`token${isActive ? ' token-active' : ''}`}
                        style={{
                          background: p.color,
                          boxShadow: `0 0 10px ${p.color}88`,
                          color: p.color, /* for currentColor in animation */
                        }}
                      />
                    )
                  })}
                </span>
              )}
            </button>
          )
        })}

        {/* --- Center --- */}
        <div className="boardCenter">
          <img
            className="centerLogo"
            src="/whaleopoly%20transparent.png"
            alt="Whaleopoly logo"
          />
        </div>

        {/* --- Dice Tray --- */}
        <div className="diceTray">
          <div className={`die${rolling ? ' rolling' : ''}`} aria-label={`die ${d1}`}>
            {(PIP_MAP[d1] || []).map((pos) => (
              <span key={pos} className={`pip pos-${pos}`} />
            ))}
          </div>
          <div className={`die${rolling ? ' rolling' : ''}`} aria-label={`die ${d2}`}>
            {(PIP_MAP[d2] || []).map((pos) => (
              <span key={pos} className={`pip pos-${pos}`} />
            ))}
          </div>
          <button className="btn glow rollBtn" onClick={onRoll} disabled={rolling}>
            {rolling ? 'Rolling\u2026' : 'Roll'}
          </button>
        </div>
      </div>
    </div>
  )
}
