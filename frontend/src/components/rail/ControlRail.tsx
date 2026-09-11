import { useMemo } from 'react'
import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { monoTiles } from '../../data/boardTiles'
import { money } from '../../format'
import type { Player, TileData } from '../../types'
import './rail.css'

/* ============================================================
   Whaleopoly — Control Rail
   Right-hand column of the Play screen.

   Presentation only. Every rule below mirrors the game logic
   that already lives in src/App.tsx; nothing here mutates state.

   Money on the board is GAME DOLLARS. ETH appears only on the
   table stake and the pot, which this component never renders.
   ============================================================ */

export type RailFeedItem = {
  kind: 'good' | 'warn' | 'info'
  title: string
  body: string
  time: string
}

export type ControlRailProps = {
  /** The player whose turn it is. */
  cur: Player
  /** True when the connected wallet owns the current turn. */
  isMyTurn: boolean
  /** The tile currently selected on the board — all tile actions target it. */
  tile?: TileData
  /** Price of the selected tile, in game dollars. */
  price?: number
  canBuy: boolean
  canBuild: boolean
  canDraw: boolean
  canMortgage: boolean
  canUnmortgage: boolean
  /** Jail turns remaining for the CURRENT player — drives the bail button. */
  inJailTurns: number
  /**
   * Jail turns remaining for every player, keyed by player id. Without it the
   * players list can only mark the turn holder, and the rail and the Harbor
   * screen disagree about who is in Jail.
   */
  inJail?: Record<string, number>
  /** Jail passes held, keyed by player id. */
  jailPasses: Record<string, number>
  /** Optional — renders a "Roll dice" action when supplied. */
  onRoll?: () => void
  onBuy: () => void
  onBuild: () => void
  onDraw: () => void
  onEndTurn: () => void
  onMortgage: () => void
  onUnmortgage: () => void
  onPayBail: () => void
  onTrade: () => void
  onAuction: () => void
  onForceSkip: () => void
  /** True when the opponent's turn can be force-skipped (timeout). */
  canForceSkip: boolean
  balances: Record<string, number>
  players: Player[]
  positions: Record<string, number>
  ownership: Record<number, string | undefined>
  houses: Record<number, number>
  mortgages: Record<number, boolean>
  currentIdx: number
  chanceLeft: number
  chestLeft: number
  feed: RailFeedItem[]
  /**
   * The connected wallet's player id. Optional: when omitted the rail
   * falls back to `isMyTurn ? cur.id : undefined`, so "you" markers only
   * appear on your own turn. Pass `account?.address` for full accuracy.
   */
  myId?: string
  /**
   * Seats at this table (2-6). Without it the panel cannot honestly state a
   * denominator — 6 is the game's maximum, not this table's capacity — so it
   * falls back to a plain count.
   */
  seatsTotal?: number
  className?: string
}

/* ---------- board constants, mirrored from src/App.tsx ---------- */

/** House price per colour group — mirrors `houseCost` in src/App.tsx. */
const HOUSE_COST: Record<number, number> = {
  1: 50, 3: 50, 6: 50, 8: 50, 9: 50,
  11: 100, 13: 100, 14: 100, 16: 100, 18: 100, 19: 100,
  21: 150, 23: 150, 24: 150, 26: 150, 27: 150, 29: 150,
  31: 200, 32: 200, 34: 200, 37: 200, 39: 200,
}

/** Rent multiplier by houses built (index 5 = hotel) — mirrors src/App.tsx. */
const HOUSE_RENT_STEPS = [1, 5, 15, 45, 62, 75]
const RAIL_TILES = [5, 15, 25, 35]
const RAIL_RENT = [0, 25, 50, 100, 200]
const UTILITY_TILES = [12, 28]
const BAIL = 50

/** Plain-English names for the eight colour groups, keyed by group colour. */
const GROUP_NAMES: Record<string, string> = {
  '#9ad0f5': 'Coral',
  '#c7e59f': 'Kelp',
  '#d9a4f3': 'Pearl',
  '#f6d47c': 'Barnacle',
  '#7fc9b0': 'Anchor',
  '#e7a592': 'Driftwood',
  '#7fb2f0': 'Siren',
  '#3aa3e3': 'Abyss',
}

const KIND_LABELS: Record<TileData['kind'], string> = {
  property: 'Property',
  rail: 'Rail line',
  utility: 'Utility',
  corner: 'Corner',
  tax: 'Tax',
  chance: 'Chance',
  chest: 'Community Chest',
  jail: 'Jail',
  gotojail: 'Go to Jail',
  free: 'Free stop',
}

/* ---------- helpers ---------- */

function baseRentFor(price: number): number {
  return Math.max(10, Math.floor(price * 0.1))
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id
}

function tileLabelAt(pos: number | undefined): string {
  if (pos == null) return 'Start'
  return monoTiles[pos]?.label ?? `Tile ${pos}`
}

function isOwnable(kind: TileData['kind']): boolean {
  return kind === 'property' || kind === 'rail' || kind === 'utility'
}

/** The tiles that make up the selected tile's group. */
function groupTilesFor(tile: TileData): number[] {
  if (tile.kind === 'rail') return RAIL_TILES
  if (tile.kind === 'utility') return UTILITY_TILES
  if (tile.kind === 'property' && tile.color) {
    return monoTiles.filter((t) => t.kind === 'property' && t.color === tile.color).map((t) => t.id)
  }
  return []
}

function groupLabelFor(tile: TileData): string {
  if (tile.kind === 'rail') return 'Rail lines'
  if (tile.kind === 'utility') return 'Utilities'
  const name = tile.color ? GROUP_NAMES[tile.color] : undefined
  return name ? `${name} group` : 'Colour group'
}

function noteFor(tile: TileData): string {
  switch (tile.kind) {
    case 'corner':
      return 'Passing Start pays $200.'
    case 'tax':
      return tile.id === 38
        ? 'Luxury Tax — landing here costs $75.'
        : 'Income Tax — landing here costs $200.'
    case 'chance':
      return 'Land here and draw a Chance card.'
    case 'chest':
      return 'Land here and draw a Community Chest card.'
    case 'jail':
      return 'Just visiting costs nothing. Bail out of Jail is $50.'
    case 'gotojail':
      return 'Sends you straight to Jail for up to 3 turns.'
    case 'free':
      return 'A free stop — nothing is charged here.'
    default:
      return ''
  }
}

/* ---------- icons ---------- */

const iconProps = {
  width: 14,
  height: 14,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const IconTurn = (
  <svg {...iconProps}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M8 5v3l2 1.4" />
  </svg>
)

const IconBolt = (
  <svg {...iconProps}>
    <path d="M8.8 1.8 3.6 9h3.4l-.8 5.2L12.4 7H9l-.2-5.2Z" />
  </svg>
)

const IconTile = (
  <svg {...iconProps}>
    <rect x="2.2" y="2.2" width="11.6" height="11.6" rx="2" />
    <path d="M2.2 6.3h11.6" />
  </svg>
)

const IconPlayers = (
  <svg {...iconProps}>
    <circle cx="6" cy="6" r="2.4" />
    <path d="M2.2 13.2c.5-2.1 2-3.2 3.8-3.2s3.3 1.1 3.8 3.2" />
    <path d="M10.6 4.1a2.4 2.4 0 0 1 0 4.6" />
    <path d="M11.4 10.2c1.3.3 2.2 1.3 2.6 3" />
  </svg>
)

const IconDeck = (
  <svg {...iconProps}>
    <rect x="4.4" y="2.4" width="8.2" height="10.4" rx="1.6" />
    <path d="M3.4 4.4v7.4a1.8 1.8 0 0 0 1.8 1.8h5.6" />
  </svg>
)

const IconActivity = (
  <svg {...iconProps}>
    <path d="M1.8 8h2.9l1.6-4 2.4 8 1.6-4h3.9" />
  </svg>
)

const IconSkip = (
  <svg {...iconProps}>
    <path d="M3.4 3.6 9.6 8l-6.2 4.4V3.6Z" />
    <path d="M12.2 3.6v8.8" />
  </svg>
)

/* ---------- internal building blocks ---------- */

function SectionHead({ icon, title, right }: { icon: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div className="rail-head">
      <span className="rail-head-icon">{icon}</span>
      <h3 className="rail-head-title">{title}</h3>
      {right ? <div className="rail-head-right">{right}</div> : null}
    </div>
  )
}

type ActionButtonProps = {
  label: string
  cost?: string
  enabled: boolean
  reason: string
  onClick: () => void
  variant?: 'outline' | 'ghost'
}

function ActionButton({ label, cost, enabled, reason, onClick, variant = 'outline' }: ActionButtonProps) {
  const handle = (event: MouseEvent<HTMLButtonElement>) => {
    if (!enabled) {
      event.preventDefault()
      return
    }
    onClick()
  }
  return (
    <button
      type="button"
      className={`btn btn-${variant} rail-act`}
      aria-disabled={!enabled}
      title={enabled ? undefined : reason}
      onClick={handle}
    >
      <span className="rail-act-label">{label}</span>
      {cost ? <span className="rail-act-cost num">{cost}</span> : null}
    </button>
  )
}

/* ============================================================
   Control Rail
   ============================================================ */

export function ControlRail(props: ControlRailProps) {
  const {
    cur,
    isMyTurn,
    tile,
    price,
    canBuy,
    canBuild,
    canDraw,
    canMortgage,
    canUnmortgage,
    inJailTurns,
    inJail,
    jailPasses,
    onRoll,
    onBuy,
    onBuild,
    onDraw,
    onEndTurn,
    onMortgage,
    onUnmortgage,
    onPayBail,
    onTrade,
    onAuction,
    onForceSkip,
    canForceSkip,
    balances,
    players,
    positions,
    ownership,
    houses,
    mortgages,
    currentIdx,
    chanceLeft,
    chestLeft,
    feed,
    myId,
  seatsTotal,
    className,
  } = props

  const me = myId ?? (isMyTurn ? cur.id : undefined)
  const curBalance = balances[cur.id] ?? 0
  const curTileLabel = tileLabelAt(positions[cur.id])

  const selectedId = tile?.id
  const tilePrice = price ?? 0
  const ownerId = selectedId != null ? ownership[selectedId] : undefined
  const ownerPlayer = ownerId ? players.find((p) => p.id === ownerId) : undefined
  const built = selectedId != null ? houses[selectedId] ?? 0 : 0
  const isMortgaged = selectedId != null ? !!mortgages[selectedId] : false
  const houseCost = selectedId != null ? HOUSE_COST[selectedId] ?? 0 : 0
  const nextBuildCost = built >= 4 ? houseCost * 2 : houseCost
  const mortgageValue = Math.floor(tilePrice / 2)
  const unmortgageCost = mortgageValue * 1.1

  const turnBlockReason = `It is ${cur.name}'s turn`

  /* ---- property inspector rows ---- */
  const inspector = useMemo(() => {
    if (!tile) return null
    const rows: { key: string; val: string }[] = []
    if (tile.kind === 'property') {
      const base = baseRentFor(tilePrice)
      rows.push({ key: 'Price', val: money(tilePrice) })
      rows.push({ key: 'Base rent', val: money(base) })
      rows.push({
        key: 'Rent with houses',
        val: `${money(base * HOUSE_RENT_STEPS[1])} – ${money(base * HOUSE_RENT_STEPS[4])}`,
      })
      rows.push({ key: 'Rent with hotel', val: money(base * HOUSE_RENT_STEPS[5]) })
      rows.push({ key: 'Mortgage value', val: money(mortgageValue) })
      rows.push({ key: 'Houses built', val: built >= 5 ? 'Hotel' : `${built} of 4` })
    } else if (tile.kind === 'rail') {
      rows.push({ key: 'Price', val: money(tilePrice) })
      rows.push({ key: 'Rent, one rail', val: money(RAIL_RENT[1]) })
      rows.push({ key: 'Rent, two rails', val: money(RAIL_RENT[2]) })
      rows.push({ key: 'Rent, three rails', val: money(RAIL_RENT[3]) })
      rows.push({ key: 'Rent, all four rails', val: money(RAIL_RENT[4]) })
      rows.push({ key: 'Mortgage value', val: money(mortgageValue) })
    } else if (tile.kind === 'utility') {
      rows.push({ key: 'Price', val: money(tilePrice) })
      rows.push({ key: 'Rent, one utility', val: '4 × dice roll' })
      rows.push({ key: 'Rent, both utilities', val: '10 × dice roll' })
      rows.push({ key: 'Mortgage value', val: money(mortgageValue) })
    }
    return rows
  }, [tile, tilePrice, mortgageValue, built])

  const groupInfo = useMemo(() => {
    if (!tile || !isOwnable(tile.kind)) return null
    const ids = groupTilesFor(tile)
    if (ids.length === 0) return null
    const holder = ownerId
    const owned = holder
      ? ids.filter((id) => ownership[id] === holder).length
      : ids.filter((id) => !!ownership[id]).length
    return {
      label: groupLabelFor(tile),
      owned,
      total: ids.length,
      complete: !!holder && owned === ids.length,
      holderName: ownerPlayer?.name ?? (holder ? shortId(holder) : undefined),
    }
  }, [tile, ownerId, ownership, ownerPlayer])

  /* ---- action availability + reasons ---- */
  const buyEnabled = canBuy && curBalance >= tilePrice
  const buyReason = !isMyTurn
    ? turnBlockReason
    : !tile || !isOwnable(tile.kind)
      ? 'Select a property, rail or utility on the board'
      : ownerId
        ? `${ownerPlayer?.name ?? shortId(ownerId)} already owns this tile`
        : curBalance < tilePrice
          ? `You need ${money(tilePrice)} to buy this tile`
          : ''

  const buildEnabled = canBuild && built < 5 && curBalance >= nextBuildCost
  const buildLabel = built >= 4 ? 'Build hotel' : 'Build house'
  const buildReason = !isMyTurn
    ? turnBlockReason
    : !tile || tile.kind !== 'property'
      ? 'Only properties can be developed'
      : ownerId !== cur.id
        ? 'You do not own this property'
        : built >= 5
          ? 'This property already has a hotel'
          : !canBuild
            ? 'Own every property in the colour group first'
            : `You need ${money(nextBuildCost)} to build here`

  const showDraw = !!tile && (tile.kind === 'chance' || tile.kind === 'chest')
  const drawLabel = tile?.kind === 'chest' ? 'Draw Community Chest' : 'Draw card'
  const drawReason = !isMyTurn ? turnBlockReason : 'A card is already open — resolve it first'

  const showBail = inJailTurns > 0
  const bailEnabled = isMyTurn && inJailTurns > 0 && curBalance >= BAIL
  const bailReason = !isMyTurn ? turnBlockReason : `You need ${money(BAIL)} to post bail`

  const showUnmortgage = isMortgaged
  const mortgageReason = !isMyTurn
    ? turnBlockReason
    : !tile || !isOwnable(tile.kind)
      ? 'Select a property, rail or utility on the board'
      : ownerId !== cur.id
        ? 'You can only mortgage tiles you own'
        : 'This tile is already mortgaged'
  const unmortgageEnabled = canUnmortgage && curBalance >= unmortgageCost
  const unmortgageReason = !isMyTurn
    ? turnBlockReason
    : !canUnmortgage
      ? 'You can only lift a mortgage on a tile you own'
      : `You need ${money(unmortgageCost)} to lift this mortgage`

  const tradeEnabled = isMyTurn && players.length > 1
  const tradeReason = !isMyTurn ? turnBlockReason : 'A trade needs at least one other player'
  const auctionEnabled = isMyTurn && canBuy
  const auctionReason = !isMyTurn ? turnBlockReason : 'Select an unowned tile to put it up for auction'

  /* The single most useful blocked reason, stated in the layout instead of
     buried in a hover tooltip. Ordered by how time-critical the action is:
     getting out of Jail, then resolving an open card, then the two controls
     the player reaches for most. */
  const blockedReason = !isMyTurn
    ? turnBlockReason
    : showBail && !bailEnabled
      ? bailReason
      : showDraw && !canDraw
        ? drawReason
        : !buyEnabled && tile && isOwnable(tile.kind) && !ownerId
          ? buyReason
          : !buildEnabled && tile?.kind === 'property' && ownerId === cur.id
            ? buildReason
            : showUnmortgage && !unmortgageEnabled
              ? unmortgageReason
              : ''

  return (
    <aside className={`rail${className ? ` ${className}` : ''}`} aria-label="Turn controls">
      {/* ---------------- PINNED ---------------- */}
      <div className="rail-pinned">
        {/* 1 — Turn */}
        <section className="rail-panel rail-turn">
          <div className="rail-turn-top">
            <span className="rail-dot rail-dot-lg" style={{ background: cur.color } as CSSProperties} aria-hidden />
            <div className="rail-turn-who">
              {isMyTurn ? (
                <span className="rail-turn-pill">Your turn</span>
              ) : (
                <span className="rail-turn-wait">
                  <span className="rail-wait-anim" aria-hidden>
                    <i style={{ background: cur.color }} />
                    <i style={{ background: cur.color }} />
                    <i style={{ background: cur.color }} />
                  </span>
                  Waiting for
                </span>
              )}
              <div className="rail-turn-name" style={isMyTurn ? undefined : ({ color: cur.color } as CSSProperties)}>
                {cur.name}
              </div>
            </div>
            <div className="rail-turn-cash">
              <span className="rail-turn-cash-label">Balance</span>
              <span className="rail-turn-cash-val num">{money(curBalance)}</span>
            </div>
          </div>

          <div className="rail-turn-foot">
            <span className="rail-turn-where">
              {IconTurn}
              <span className="truncate">
                On <strong>{curTileLabel}</strong>
              </span>
            </span>
            {inJailTurns > 0 ? (
              <span className="chip chip-sm chip-warn">
                In Jail · <span className="chip-value">{inJailTurns}</span> turn{inJailTurns === 1 ? '' : 's'} left
              </span>
            ) : null}
          </div>

          {canForceSkip ? (
            <button type="button" className="btn btn-outline btn-sm btn-block rail-skip" onClick={onForceSkip}>
              {IconSkip}
              Force skip turn
            </button>
          ) : null}
        </section>

        {/* 2 — Actions */}
        <section className="rail-panel rail-actions">
          <div className="rail-actions-head">
            <span className="caps">Actions</span>
            <span className="rail-actions-target truncate" title={tile ? `Selected tile: ${tile.label}` : undefined}>
              {tile ? tile.label : 'No tile selected'}
            </span>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-lg btn-block rail-primary"
            aria-disabled={!isMyTurn}
            title={isMyTurn ? undefined : turnBlockReason}
            onClick={(event) => {
              if (!isMyTurn) {
                event.preventDefault()
                return
              }
              onEndTurn()
            }}
          >
            End turn
          </button>

          {onRoll ? (
            <button
              type="button"
              className="btn btn-outline btn-block rail-roll"
              aria-disabled={!isMyTurn}
              title={isMyTurn ? undefined : turnBlockReason}
              onClick={(event) => {
                if (!isMyTurn) {
                  event.preventDefault()
                  return
                }
                onRoll()
              }}
            >
              {IconBolt}
              Roll dice
            </button>
          ) : null}

          <div className="rail-act-grid">
            <ActionButton
              label="Buy property"
              cost={money(tilePrice)}
              enabled={buyEnabled}
              reason={buyReason}
              onClick={onBuy}
            />
            <ActionButton
              label={buildLabel}
              cost={money(nextBuildCost)}
              enabled={buildEnabled}
              reason={buildReason}
              onClick={onBuild}
            />
            {showUnmortgage ? (
              <ActionButton
                label="Unmortgage"
                cost={`−${money(unmortgageCost)}`}
                enabled={unmortgageEnabled}
                reason={unmortgageReason}
                onClick={onUnmortgage}
              />
            ) : (
              <ActionButton
                label="Mortgage"
                cost={`+${money(mortgageValue)}`}
                enabled={canMortgage}
                reason={mortgageReason}
                onClick={onMortgage}
              />
            )}
            {showDraw ? (
              <ActionButton label={drawLabel} enabled={canDraw} reason={drawReason} onClick={onDraw} />
            ) : null}
            {showBail ? (
              <ActionButton
                label="Pay bail"
                cost={money(BAIL)}
                enabled={bailEnabled}
                reason={bailReason}
                onClick={onPayBail}
              />
            ) : null}
          </div>

          <p className={`rail-act-reason${blockedReason ? '' : ' is-hidden'}`} aria-live="polite">
            {blockedReason}
          </p>

          <div className="rail-act-ghosts">
            <ActionButton
              label="Propose trade"
              enabled={tradeEnabled}
              reason={tradeReason}
              onClick={onTrade}
              variant="ghost"
            />
            <ActionButton
              label="Start auction"
              enabled={auctionEnabled}
              reason={auctionReason}
              onClick={onAuction}
              variant="ghost"
            />
          </div>
        </section>
      </div>

      {/* ---------------- SCROLLS ---------------- */}
      <div className="rail-scroll scroll-y">
        {/* 3 — Property inspector */}
        <section className="rail-panel rail-inspector">
          <span
            className="rail-inspector-band"
            style={{ background: tile?.color ?? 'var(--border-default)' } as CSSProperties}
            aria-hidden
          />
          <SectionHead icon={IconTile} title="Property" />
          {tile ? (
            <>
              <div className="rail-tile-id">
                <div className="rail-tile-name">{tile.label}</div>
                <div className="rail-tile-kind">
                  <span className="meta">{KIND_LABELS[tile.kind]}</span>
                  {isMortgaged ? <span className="chip chip-sm chip-warn">Mortgaged</span> : null}
                </div>
              </div>

              {isOwnable(tile.kind) ? (
                <div className="rail-owner">
                  {ownerId ? (
                    ownerId === me ? (
                      <span className="chip chip-sm chip-teal">
                        <span className="status-dot" />
                        Owned by you
                      </span>
                    ) : (
                      <span className="chip chip-sm">
                        <span
                          className="status-dot"
                          style={{ color: ownerPlayer?.color ?? 'var(--muted)' } as CSSProperties}
                        />
                        Owned by{' '}
                        <span style={{ color: ownerPlayer?.color ?? 'var(--text)' } as CSSProperties}>
                          {ownerPlayer?.name ?? shortId(ownerId)}
                        </span>
                      </span>
                    )
                  ) : (
                    <span className="chip chip-sm">Unowned</span>
                  )}
                </div>
              ) : null}

              {inspector && inspector.length > 0 ? (
                <dl className="rail-grid">
                  {inspector.map((row) => (
                    <div className="rail-grid-cell" key={row.key}>
                      <dt className="rail-grid-key">{row.key}</dt>
                      <dd className="rail-grid-val num">{row.val}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="rail-note">{noteFor(tile)}</p>
              )}

              {groupInfo ? (
                <div className="rail-group">
                  <span className="rail-group-line">
                    {groupInfo.label}: <span className="num">{groupInfo.owned}</span> of{' '}
                    <span className="num">{groupInfo.total}</span> owned
                    {groupInfo.holderName && groupInfo.owned > 0 ? ` by ${groupInfo.holderName}` : ''}
                  </span>
                  {groupInfo.complete && tile.kind === 'property' ? (
                    <span className="rail-group-complete">Complete group — houses can be built here</span>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <div className="empty">
              <div className="empty-title">No tile selected</div>
              <div className="empty-text">Pick a tile on the board to see its price, rent and owner.</div>
            </div>
          )}
        </section>

        {/* 4 — Players */}
        <section className="rail-panel">
          <SectionHead
            icon={IconPlayers}
            title="Players"
            right={<span className="meta num">{seatsTotal ? `${players.length} of ${seatsTotal}` : `${players.length} playing`}</span>}
          />
          {players.length === 0 ? (
            <div className="empty">
              <div className="empty-title">No players yet</div>
              <div className="empty-text">Create or join a table to seat players.</div>
            </div>
          ) : (
            <ul className="rail-players">
              {players.map((p, i) => {
                const owned = Object.values(ownership).filter((o) => o === p.id).length
                const passes = jailPasses[p.id] ?? 0
                const jailTurns = inJail?.[p.id] ?? (i === currentIdx ? inJailTurns : 0)
                return (
                  <li key={p.id} className={`rail-player${i === currentIdx ? ' is-active' : ''}`}>
                    <span className="rail-player-bar" style={{ background: p.color } as CSSProperties} aria-hidden />
                    <span className="rail-dot" style={{ background: p.color } as CSSProperties} aria-hidden />
                    <div className="rail-player-main">
                      <div className="rail-player-name truncate">
                        {p.name}
                        {p.id === me ? <span className="chip chip-xs rail-you">You</span> : null}
                      </div>
                      <div className="rail-player-meta">
                        <span className="truncate">{tileLabelAt(positions[p.id])}</span>
                        <span className="rail-sep" aria-hidden>
                          ·
                        </span>
                        <span className="num">
                          {owned} propert{owned === 1 ? 'y' : 'ies'}
                        </span>
                        {jailTurns > 0 ? (
                          <span className="chip chip-xs rail-badge rail-badge-warn">
                            Jail <span className="num">{jailTurns}</span>
                          </span>
                        ) : null}
                        {passes > 0 ? (
                          <span className="chip chip-xs rail-badge rail-badge-accent">
                            Jail pass<span className="num">{passes > 1 ? ` ${passes}` : ''}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className="rail-player-cash num">{money(balances[p.id] ?? 0)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* 5 — Decks */}
        <section className="rail-panel">
          <SectionHead icon={IconDeck} title="Decks" />
          <div className="rail-decks">
            <div className="rail-deck">
              <span className="rail-deck-mark rail-deck-mark-chance" aria-hidden>
                {IconDeck}
              </span>
              <div className="rail-deck-main">
                <div className="rail-deck-name">Chance</div>
                <div className="rail-deck-count">
                  <span className="num">{chanceLeft}</span> card{chanceLeft === 1 ? '' : 's'} left
                </div>
              </div>
            </div>
            <div className="rail-deck">
              <span className="rail-deck-mark rail-deck-mark-chest" aria-hidden>
                {IconDeck}
              </span>
              <div className="rail-deck-main">
                <div className="rail-deck-name">Community Chest</div>
                <div className="rail-deck-count">
                  <span className="num">{chestLeft}</span> card{chestLeft === 1 ? '' : 's'} left
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6 — Activity */}
        <section className="rail-panel">
          <SectionHead
            icon={IconActivity}
            title="Activity"
            right={feed.length > 0 ? <span className="meta num">{feed.length}</span> : undefined}
          />
          {feed.length === 0 ? (
            <div className="empty">
              <div className="empty-title">Nothing has happened yet</div>
              <div className="empty-text">Rolls, purchases and rent payments show up here.</div>
            </div>
          ) : (
            <ol className="rail-feed">
              {feed.map((item, idx) => (
                <li className="rail-feed-item" key={`${item.time}-${item.title}-${idx}`}>
                  <span className={`rail-feed-dot is-${item.kind}`} aria-hidden />
                  <div className="rail-feed-main">
                    <div className="rail-feed-top">
                      <span className="rail-feed-title truncate">{item.title}</span>
                      <time className="rail-feed-time num">{item.time}</time>
                    </div>
                    {item.body ? <div className="rail-feed-body">{item.body}</div> : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </aside>
  )
}

export default ControlRail
