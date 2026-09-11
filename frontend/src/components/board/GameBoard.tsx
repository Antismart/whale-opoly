import { useMemo } from 'react'
import { LogoMark } from '../brand/Logo'
import type { CSSProperties, ReactNode } from 'react'
import type { Player, TileData } from '../../types'
import { monoTiles } from '../../data/boardTiles'
import { money } from '../../format'
import './board.css'

/* ==================================================================== */
/*  Props — superset of the original MonopolyBoard props.               */
/*  Everything added is optional, so the existing call site in App.tsx  */
/*  keeps working unchanged.                                            */
/* ==================================================================== */
export type GameBoardProps = {
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
  /** Game-dollar purchase price per tile id. Falls back to the standard board. */
  prices?: Record<number, number>
  /** Total of the last dice roll — used for utility rent. */
  lastRoll?: number
  /** Pre-formatted table pot WITH unit, e.g. '4 ETH'. The only ETH value on the board. */
  potEth?: string
  /** False disables the roll button with a reason. Defaults to true. */
  isMyTurn?: boolean
  /** False disables the roll button with a reason (e.g. a card is open). Defaults to true. */
  canRoll?: boolean
}

/* ==================================================================== */
/*  Board constants                                                     */
/* ==================================================================== */

/** Standard board prices in GAME DOLLARS — mirrors the price map in App.tsx. */
const DEFAULT_PRICES: Record<number, number> = {
  1: 60, 3: 60, 6: 100, 8: 100, 9: 120, 11: 140, 13: 140, 14: 160,
  16: 180, 18: 180, 19: 200, 21: 220, 23: 220, 24: 240, 26: 260, 27: 260,
  29: 280, 31: 300, 32: 300, 34: 320, 37: 350, 39: 400,
  5: 200, 15: 200, 25: 200, 35: 200,
  12: 150, 28: 150,
}

const RAIL_IDS = [5, 15, 25, 35]
const UTILITY_IDS = [12, 28]
const CORNER_IDS = [0, 10, 20, 30]
/** Rent multiplier by house count (index 5 = hotel) — mirrors App.tsx. */
const HOUSE_RENT_MULTIPLIER = [1, 5, 15, 45, 62, 75]
/** Rail rent by number of rails held by the owner. */
const RAIL_RENT = [0, 25, 50, 100, 200]

const INCOME_TAX = 200
const LUXURY_TAX = 75

type Side = 'bottom' | 'left' | 'top' | 'right'

/** Tile index 0-39 → 11x11 grid cell. Tile 0 is bottom-right, running anticlockwise. */
function toGrid(i: number): { row: number; col: number; side: Side } {
  if (i >= 0 && i <= 10) return { row: 11, col: 11 - i, side: 'bottom' }
  if (i >= 11 && i <= 20) return { row: 11 - (i - 10), col: 1, side: 'left' }
  if (i >= 21 && i <= 30) return { row: 1, col: i - 19, side: 'top' }
  return { row: i - 29, col: 11, side: 'right' }
}

const PIP_MAP: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
}

/* ==================================================================== */
/*  Formatting                                                          */
/* ==================================================================== */

/* Approximate advance width of each uppercase Outfit glyph, in em.
   Used to shrink a tile name just enough that its longest word never
   clips — tile names are static data, so this resolves deterministically. */
const GLYPH_EM: Record<string, number> = {
  A: 0.68, B: 0.68, C: 0.7, D: 0.7, E: 0.62, F: 0.6, G: 0.72, H: 0.7,
  I: 0.3, J: 0.52, K: 0.66, L: 0.57, M: 0.95, N: 0.7, O: 0.73, P: 0.65,
  Q: 0.73, R: 0.68, S: 0.62, T: 0.62, U: 0.7, V: 0.68, W: 0.96, X: 0.66,
  Y: 0.64, Z: 0.62,
}
const GLYPH_EM_FALLBACK = 0.68
/** Matches the letter-spacing set on .wb-name. */
const NAME_TRACKING_EM = 0.03
/** Em budget for the widest word: (usable tile width) / (base name font-size). */
const NAME_EM_BUDGET = 4.7
/** Never shrink past this — below it the name stops being scannable. */
const NAME_MIN_SCALE = 0.66

function widestWordEm(label: string): number {
  let widest = 0
  for (const word of label.split(/[\s|/-]+/)) {
    if (!word) continue
    let em = 0
    for (const ch of word.toUpperCase()) {
      em += (GLYPH_EM[ch] ?? GLYPH_EM_FALLBACK) + NAME_TRACKING_EM
    }
    if (em > widest) widest = em
  }
  return widest
}

/** Shrinks the name only as far as its longest word actually requires. */
function nameScale(label: string): number {
  const widest = widestWordEm(label)
  if (widest <= 0) return 1
  return Math.min(1, Math.max(NAME_MIN_SCALE, Number((NAME_EM_BUDGET / widest).toFixed(3))))
}

function purchasePrice(t: TileData, prices: Record<number, number>): number | undefined {
  if (t.kind === 'property' || t.kind === 'rail' || t.kind === 'utility') return prices[t.id]
  return undefined
}

/** The small number printed under the tile name. Always game dollars. */
function tileSubLabel(t: TileData, prices: Record<number, number>): string | null {
  const p = purchasePrice(t, prices)
  if (p != null) return money(p)
  if (t.kind === 'tax') return money(t.id === 38 ? LUXURY_TAX : INCOME_TAX)
  return null
}

/** Rent as it would actually be charged — mirrors the engine in App.tsx. */
function rentLabel(
  id: number,
  prices: Record<number, number>,
  ownership: Record<number, string | undefined>,
  houses: Record<number, number>,
  lastRoll: number,
): string {
  const owner = ownership[id]

  if (RAIL_IDS.includes(id)) {
    if (!owner) return '$25 – $200'
    const held = RAIL_IDS.filter((r) => ownership[r] === owner).length
    return money(RAIL_RENT[held] ?? 0)
  }

  if (UTILITY_IDS.includes(id)) {
    if (!owner) return '4x or 10x roll'
    const held = UTILITY_IDS.filter((u) => ownership[u] === owner).length
    const mult = held === 2 ? 10 : 4
    return `${mult}x roll — ${money(mult * Math.max(2, lastRoll || 7))}`
  }

  const t = monoTiles[id]
  if (!t || t.kind !== 'property') {
    if (t && t.kind === 'tax') return money(id === 38 ? LUXURY_TAX : INCOME_TAX)
    return '—'
  }

  const base = Math.max(10, Math.floor((prices[id] || 100) * 0.1))
  const built = houses[id] || 0
  const rent = base * (HOUSE_RENT_MULTIPLIER[built] ?? 1)
  if (built === 5) return `${money(rent)} · hotel`
  if (built > 0) return `${money(rent)} · ${built} ${built === 1 ? 'house' : 'houses'}`
  return money(rent)
}

/* ==================================================================== */
/*  Inline icons — 20x20 viewBox, currentColor, no fonts, no emoji      */
/* ==================================================================== */

const iconProps = {
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

/** Rail — sleepers and two running rails. */
const RailIcon = (
  <svg {...iconProps} className="wb-icon">
    <path d="M7 2.5v15M13 2.5v15" />
    <path d="M4.5 6h11M4.5 10h11M4.5 14h11" />
  </svg>
)

/** Power Plant — bolt. */
const PowerIcon = (
  <svg {...iconProps} className="wb-icon">
    <path d="M11.2 2.5 5.5 11h4l-.7 6.5L14.5 9h-4z" />
  </svg>
)

/** Water Works — droplet with a current line. */
const WaterIcon = (
  <svg {...iconProps} className="wb-icon">
    <path d="M10 2.6c2.9 3.2 4.6 5.6 4.6 7.9a4.6 4.6 0 0 1-9.2 0c0-2.3 1.7-4.7 4.6-7.9z" />
    <path d="M7.6 11.2c.9.9 2.2.9 3 0" />
  </svg>
)

/** Income Tax — coin stack with a downward arrow. */
const TaxIcon = (
  <svg {...iconProps} className="wb-icon">
    <ellipse cx="10" cy="14.4" rx="5.4" ry="2.1" />
    <path d="M4.6 14.4v-3.2c0-1.16 2.42-2.1 5.4-2.1s5.4.94 5.4 2.1v3.2" />
    <path d="M10 2.5v4.4M8 5.1 10 7.2l2-2.1" />
  </svg>
)

/** Luxury Tax — cut gem. */
const LuxuryIcon = (
  <svg {...iconProps} className="wb-icon">
    <path d="M5.4 3.5h9.2l2.6 4-7.2 9-7.2-9z" />
    <path d="M2.8 7.5h14.4M7.4 7.5 10 16.5l2.6-9-2.6-4z" />
  </svg>
)

/** Chance — compass rose. */
const ChanceIcon = (
  <svg {...iconProps} className="wb-icon">
    <circle cx="10" cy="10" r="7.2" />
    <path d="m12.9 7.1-1.5 4.3-4.3 1.5 1.5-4.3z" />
  </svg>
)

/** Community Chest — treasure chest. */
const ChestIcon = (
  <svg {...iconProps} className="wb-icon">
    <path d="M3 8.4a7 7 0 0 1 14 0v7.1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    <path d="M3 11.4h14" />
    <path d="M8.9 11.4h2.2v2.4H8.9z" />
  </svg>
)

/** Start — chevrons pointing the direction of travel (leftward along the bottom row). */
const StartIcon = (
  <svg {...iconProps} className="wb-icon wb-icon-lg" strokeWidth={1.7}>
    <path d="m11.5 4.5-5.5 5.5 5.5 5.5" />
    <path d="m16 4.5-5.5 5.5L16 15.5" />
  </svg>
)

/** Jail — barred window. */
const JailIcon = (
  <svg {...iconProps} className="wb-icon">
    <rect x="3.4" y="3.4" width="13.2" height="13.2" rx="1.6" />
    <path d="M7.6 3.4v13.2M12.4 3.4v13.2" />
  </svg>
)

/** Free Stop — anchor at rest. */
const FreeIcon = (
  <svg {...iconProps} className="wb-icon wb-icon-lg">
    <circle cx="10" cy="4" r="1.8" />
    <path d="M10 5.8v11.4" />
    <path d="M6.3 8.2h7.4" />
    <path d="M3.6 11.6c0 3.3 2.9 5.6 6.4 5.6s6.4-2.3 6.4-5.6" />
  </svg>
)

/** Go To Jail — barred window with an arrow driving into it. */
const GoToJailIcon = (
  <svg {...iconProps} className="wb-icon wb-icon-lg">
    <rect x="7.6" y="3.4" width="9" height="13.2" rx="1.6" />
    <path d="M12.1 3.4v13.2" />
    <path d="M2.6 10h4.2M4.9 7.8 7.1 10l-2.2 2.2" />
  </svg>
)

function tileIcon(t: TileData): ReactNode {
  switch (t.kind) {
    case 'rail':
      return RailIcon
    case 'utility':
      return t.id === 12 ? PowerIcon : WaterIcon
    case 'tax':
      return t.id === 38 ? LuxuryIcon : TaxIcon
    case 'chance':
      return ChanceIcon
    case 'chest':
      return ChestIcon
    default:
      return null
  }
}

/* ==================================================================== */
/*  Small building blocks                                               */
/* ==================================================================== */

function Die({ value, rolling, label }: { value: number; rolling: boolean; label: string }) {
  const pips = PIP_MAP[value] ?? []
  return (
    <div className={`wb-die${rolling ? ' is-rolling' : ''}`} role="img" aria-label={label}>
      {pips.map((pos) => (
        <span key={pos} className={`wb-pip wb-pip-${pos}`} />
      ))}
    </div>
  )
}

function TokenCluster({
  tokens,
  activeId,
}: {
  tokens: Player[]
  activeId: string | undefined
}) {
  if (tokens.length === 0) return null
  return (
    <span className="wb-tokens" data-count={tokens.length}>
      {tokens.map((p) => {
        const isActive = p.id === activeId
        return (
          <span
            key={p.id}
            className={`wb-token${isActive ? ' is-active' : ''}`}
            style={{ '--wb-token-color': p.color } as CSSProperties}
            title={p.name}
          />
        )
      })}
    </span>
  )
}

/* ==================================================================== */
/*  Component                                                           */
/* ==================================================================== */

export function GameBoard({
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
  prices,
  lastRoll,
  potEth,
  isMyTurn = true,
  canRoll = true,
}: GameBoardProps) {
  const priceMap = prices ?? DEFAULT_PRICES
  const activePlayer = currentPlayerIdx != null ? players[currentPlayerIdx] : undefined
  const activePlayerId = activePlayer?.id

  const tokensByTile = useMemo(() => {
    const map = new Map<number, Player[]>()
    for (const p of players) {
      const pos = positions[p.id]
      if (pos == null) continue
      const list = map.get(pos)
      if (list) list.push(p)
      else map.set(pos, [p])
    }
    return map
  }, [players, positions])

  const selectedTile = monoTiles[selected]
  const selectedOwnerId = ownership[selected]
  const selectedOwner = selectedOwnerId ? players.find((p) => p.id === selectedOwnerId) : undefined
  const selectedPrice = selectedTile ? purchasePrice(selectedTile, priceMap) : undefined
  const selectedRent = selectedTile
    ? rentLabel(selected, priceMap, ownership, houses, lastRoll ?? 0)
    : '—'
  const selectedMortgaged = !!mortgages?.[selected]

  const total = d1 + d2
  /* d1/d2 rest at 1 so the dice always show a face, which means they can
     never say whether anyone has actually rolled. lastRoll is 0 until the
     first roll resolves, so that is what the readout is driven from. */
  const hasRolled = (lastRoll ?? 0) > 0

  const rollDisabled = rolling || !isMyTurn || !canRoll
  const rollReason = rolling
    ? 'Dice are in the air'
    : !isMyTurn
      ? `Waiting on ${activePlayer?.name ?? 'the current player'}`
      : !canRoll
        ? 'Resolve the open action first'
        : ''

  return (
    <div className="wb-board-wrap">
      <div className="wb-board" role="group" aria-label="Game board">
        {monoTiles.map((t) => {
          const { row, col, side } = toGrid(t.id)
          const isCorner = CORNER_IDS.includes(t.id)
          const isSelected = selected === t.id
          const isMortgaged = !!mortgages?.[t.id]
          const ownerId = ownership[t.id]
          const owner = ownerId ? players.find((p) => p.id === ownerId) : undefined
          const built = houses[t.id] || 0
          const tokens = tokensByTile.get(t.id) ?? []
          const sub = tileSubLabel(t, priceMap)

          const style: CSSProperties = {
            gridRow: row,
            gridColumn: col,
            ...(t.color ? ({ '--wb-group': t.color } as CSSProperties) : {}),
            ...({ '--wb-name-scale': nameScale(t.label) } as CSSProperties),
          }

          const ariaParts = [
            t.label,
            sub ? `price ${sub}` : '',
            owner ? `owned by ${owner.name}` : '',
            isMortgaged ? 'mortgaged' : '',
            built === 5 ? 'hotel' : built > 0 ? `${built} houses` : '',
            tokens.length ? `players here: ${tokens.map((p) => p.name).join(', ')}` : '',
          ].filter(Boolean)

          return (
            <button
              key={t.id}
              type="button"
              className={[
                'wb-tile',
                `wb-kind-${t.kind}`,
                isCorner ? 'wb-tile-corner' : '',
                isSelected ? 'is-selected' : '',
                isMortgaged ? 'is-mortgaged' : '',
                t.color ? 'has-group' : '',
                tokens.length ? 'has-tokens' : '',
                tokens.length > 3 ? 'has-tokens-many' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={style}
              data-side={side}
              data-id={t.id}
              aria-pressed={isSelected}
              aria-label={ariaParts.join(', ')}
              onClick={() => onSelect(t.id)}
            >
              <span className="wb-face">
                {/* Corner faces ------------------------------------------ */}
                {isCorner ? (
                  t.id === 10 ? (
                    <span className="wb-jail">
                      <span className="wb-jail-outer" />
                      <span className="wb-jail-inner" />
                      <span className="wb-jail-cell">
                        {JailIcon}
                        <span className="wb-jail-cell-label">Jail</span>
                      </span>
                      <span className="wb-jail-visiting">
                        Just
                        <br />
                        Visiting
                      </span>
                      <span className="wb-corner-tokens">
                        <TokenCluster tokens={tokens} activeId={activePlayerId} />
                      </span>
                    </span>
                  ) : (
                    <span className="wb-corner-body">
                      <span className="wb-corner-icon">
                        {t.id === 0 ? StartIcon : t.id === 20 ? FreeIcon : GoToJailIcon}
                      </span>
                      <span className="wb-corner-name">
                        {t.id === 0 ? 'Start' : t.id === 20 ? 'Free Stop' : 'Go To Jail'}
                      </span>
                      <span className="wb-corner-sub num">
                        {t.id === 0 ? 'Collect $200' : t.id === 20 ? 'No charge' : 'Move to Jail'}
                      </span>
                      <TokenCluster tokens={tokens} activeId={activePlayerId} />
                    </span>
                  )
                ) : (
                  /* Standard tile face ---------------------------------- */
                  <>
                    {t.color && <span className="wb-groupbar" aria-hidden="true" />}

                    {built > 0 && t.kind === 'property' && (
                      <span className="wb-build" aria-hidden="true">
                        {built >= 5 ? (
                          <span className="wb-hotel" />
                        ) : (
                          Array.from({ length: built }, (_, i) => (
                            <span key={i} className="wb-house" />
                          ))
                        )}
                      </span>
                    )}

                    {t.kind !== 'property' && (
                      <span className="wb-tile-icon">{tileIcon(t)}</span>
                    )}

                    <span className="wb-name">{t.label}</span>

                    {sub && <span className="wb-sub num">{sub}</span>}

                    {isMortgaged && (
                      <span className="wb-mortgaged-tag">
                        <span className="wb-mort-full">Mortgaged</span>
                        <span className="wb-mort-short" aria-hidden="true">Mtg</span>
                      </span>
                    )}

                    <TokenCluster tokens={tokens} activeId={activePlayerId} />

                    {owner && (
                      <span
                        className="wb-owner"
                        style={{ '--wb-owner-color': owner.color } as CSSProperties}
                        aria-hidden="true"
                      />
                    )}
                  </>
                )}
              </span>
            </button>
          )
        })}

        {/* ============================ CENTRE HUD ======================= */}
        <div className="wb-centre">
          <span className="wb-watermark" aria-hidden="true">
            <LogoMark size={340} title="" />
          </span>

          <svg className="wb-sonar" viewBox="0 0 200 200" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="wb-grid" width="12.5" height="12.5" patternUnits="userSpaceOnUse">
                <path d="M12.5 0H0V12.5" fill="none" stroke="rgba(14,165,233,0.055)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="200" height="200" fill="url(#wb-grid)" />
            <circle cx="100" cy="100" r="38" fill="none" stroke="rgba(14,165,233,0.10)" strokeWidth="0.6" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(14,165,233,0.075)" strokeWidth="0.6" strokeDasharray="3 5" />
            <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(20,184,166,0.06)" strokeWidth="0.6" />
            <path d="M100 14v172M14 100h172" stroke="rgba(14,165,233,0.05)" strokeWidth="0.5" />
          </svg>

          <div className="wb-hud">
            {/* --- top strip: pot + turn ticker --- */}
            <div className="wb-hud-top">
              <div className="wb-pot">
                <span className="wb-pot-label">Table pot</span>
                <span className="wb-pot-value num">{potEth ?? '—'}</span>
              </div>

              <div className="wb-turn" aria-live="polite">
                <span
                  className="wb-turn-dot"
                  style={{ '--wb-turn-color': activePlayer?.color ?? 'var(--muted)' } as CSSProperties}
                  aria-hidden="true"
                />
                <span className="wb-turn-text">
                  {activePlayer
                    ? isMyTurn
                      ? 'Your turn'
                      : `${activePlayer.name}'s turn`
                    : 'Waiting for players'}
                </span>
              </div>
            </div>

            {/* --- middle: dice + roll --- */}
            <div className="wb-hud-mid">
              <div className="wb-dice">
                <Die value={d1 || 1} rolling={rolling} label={`First die shows ${d1 || 1}`} />
                <Die value={d2 || 1} rolling={rolling} label={`Second die shows ${d2 || 1}`} />
              </div>

              <div className="wb-lastroll num" aria-live="polite">
                {rolling
                  ? 'Rolling…'
                  : hasRolled
                    ? `Last roll: ${d1} + ${d2} = ${total}`
                    : 'No roll yet this table'}
              </div>

              <button
                type="button"
                className="btn btn-primary btn-lg wb-roll"
                onClick={onRoll}
                disabled={rollDisabled}
                title={rollDisabled ? rollReason : 'Roll the dice'}
              >
                {rolling ? 'Rolling…' : 'Roll dice'}
              </button>

              <div className={`wb-roll-reason${rollDisabled ? '' : ' is-hidden'}`} aria-live="polite">
                {rollDisabled ? rollReason : ''}
              </div>
            </div>

            {/* --- bottom strip: selected tile inspector --- */}
            <div className="wb-hud-bottom">
              <div className="wb-inspect">
                <div className="wb-inspect-head">
                  <span
                    className={`wb-inspect-swatch${selectedTile?.color ? '' : ' is-plain'}`}
                    style={
                      selectedTile?.color
                        ? ({ '--wb-group': selectedTile.color } as CSSProperties)
                        : undefined
                    }
                    aria-hidden="true"
                  />
                  <span className="wb-inspect-name">{selectedTile?.label ?? 'No tile selected'}</span>
                  {selectedMortgaged && <span className="wb-inspect-flag">Mortgaged</span>}
                </div>

                <dl className="wb-inspect-grid">
                  <div className="wb-inspect-cell">
                    <dt className="wb-inspect-key">Rent</dt>
                    <dd className="wb-inspect-val num">{selectedRent}</dd>
                  </div>
                  <div className="wb-inspect-cell">
                    <dt className="wb-inspect-key">Price</dt>
                    <dd className="wb-inspect-val num">
                      {selectedPrice != null ? money(selectedPrice) : '—'}
                    </dd>
                  </div>
                  <div className="wb-inspect-cell">
                    <dt className="wb-inspect-key">Owner</dt>
                    <dd className="wb-inspect-val">
                      {selectedOwner ? (
                        <span className="wb-inspect-owner">
                          <span
                            className="wb-inspect-owner-dot"
                            style={{ '--wb-owner-color': selectedOwner.color } as CSSProperties}
                            aria-hidden="true"
                          />
                          <span className="truncate">{selectedOwner.name}</span>
                        </span>
                      ) : selectedPrice != null ? (
                        'Unowned'
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameBoard
