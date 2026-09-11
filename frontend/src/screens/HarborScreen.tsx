import { LogoMark } from '../components/brand/Logo'
import { monoTiles } from '../data/boardTiles'
import { money } from '../format'
import type { Lobby, Player } from '../types'
import './harbor.css'

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

export type HarborStats = {
  /** Lobbies still open for players to join. */
  openTables: number
  /** Players seated at the table currently in play. */
  players: number
  /** Tiles on the board with an owner. */
  ownedTiles: number
  /** Houses + hotels standing across the board. */
  housesBuilt: number
  /** Sum of every player balance, in game dollars. */
  cashTotal: number
  /** Cards left in the Chance deck. */
  chanceLeft: number
  /** Cards left in the Community Chest deck. */
  chestLeft: number
}

export type HarborFeedEntry = {
  kind: 'good' | 'warn' | 'info'
  title: string
  body: string
  time: string
}

export type HarborScreenProps = {
  stats: HarborStats
  lobbies: Lobby[]
  players: Player[]
  /** player id -> balance in game dollars */
  balances: Record<string, number>
  /** player id -> board tile index 0..39 */
  positions: Record<string, number>
  /** index into `players` of the player whose turn it is */
  currentIdx: number
  feed: HarborFeedEntry[]
  hasActiveGame: boolean
  onGoToBoard: () => void
  onGoToLobby: () => void
  onStart: (gameId: number) => void
  /** tile index -> owning player id. Drives the mini-board tinting. */
  ownership?: Record<number, string | undefined>
  /** player id -> jail turns remaining */
  inJail?: Record<string, number>
  /** player id -> stored "leave jail" cards */
  jailPasses?: Record<string, number>
  /** connected wallet address, matched against player.id */
  myPlayerId?: string
  /** set while a start-table transaction is in flight */
  startingGameId?: number | null
  /**
   * Seats at the table in play (2-6). Without it the panel cannot state an
   * honest denominator — 6 is the game's maximum, not this table's capacity —
   * so it falls back to a plain count.
   */
  seatsTotal?: number
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

const TILE_COUNT = 40
const RING = 11

function shortId(value: string): string {
  if (!value) return '—'
  if (value.startsWith('0x') && value.length > 12) {
    return `${value.slice(0, 6)}…${value.slice(-4)}`
  }
  return value.length > 16 ? `${value.slice(0, 14)}…` : value
}

function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace('#', '')
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map(c => c + c)
          .join('')
      : raw
  const n = Number.parseInt(full.slice(0, 6), 16)
  if (Number.isNaN(n)) return `rgba(14, 165, 233, ${alpha})`
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/** Perimeter position of a tile on an 11x11 grid (1-indexed row / column). */
function ringCell(index: number): { row: number; col: number } {
  if (index <= 10) return { row: RING, col: RING - index }
  if (index <= 20) return { row: RING * 2 - 1 - index, col: 1 }
  if (index <= 30) return { row: 1, col: index - 19 }
  return { row: index - 29, col: RING }
}

function tileLabel(index: number | undefined): string {
  if (index === undefined || index === null) return 'Not on the board'
  return monoTiles[index]?.label ?? `Tile ${index}`
}

/** Compares two Starknet addresses tolerantly (padding, case, hex vs decimal). */
function sameAddress(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  try {
    return BigInt(a) === BigInt(b)
  } catch {
    return a.toLowerCase() === b.toLowerCase()
  }
}

function propertiesOwnedBy(ownership: Record<number, string | undefined>, playerId: string): number {
  if (!playerId) return 0
  return Object.values(ownership).filter(owner => owner === playerId).length
}

/* ------------------------------------------------------------------
   Icons (16px, inline)
   ------------------------------------------------------------------ */

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const IconTable = (
  <svg {...iconProps}>
    <rect x="2" y="2.75" width="12" height="10.5" rx="2" />
    <path d="M2 6.25h12M6 6.25v7" />
  </svg>
)

const IconTables = (
  <svg {...iconProps}>
    <rect x="2" y="3" width="12" height="4" rx="1.4" />
    <rect x="2" y="9" width="12" height="4" rx="1.4" />
  </svg>
)

const IconPulse = (
  <svg {...iconProps}>
    <path d="M1.75 8h2.9l1.6-4.1 2.4 8.2 1.6-4.1h3.99" />
  </svg>
)

const IconCrew = (
  <svg {...iconProps}>
    <circle cx="6" cy="5.75" r="2.4" />
    <path d="M1.9 13.1c.5-2.2 2.1-3.4 4.1-3.4s3.6 1.2 4.1 3.4" />
    <path d="M11 4.1a2.2 2.2 0 0 1 0 4.1M11.7 10.2c1.3.5 2.1 1.6 2.4 3" />
  </svg>
)

/* ------------------------------------------------------------------
   Mini board — abstract 11x11 ring, no text
   ------------------------------------------------------------------ */

type MiniBoardProps = {
  ownership: Record<number, string | undefined>
  colorById: Record<string, string>
  positions: Record<string, number>
  players: Player[]
  currentId: string
}

function MiniBoard({ ownership, colorById, positions, players, currentId }: MiniBoardProps) {
  const occupants: Record<number, Player[]> = {}
  for (const p of players) {
    const at = positions[p.id]
    if (typeof at !== 'number') continue
    const slot = ((at % TILE_COUNT) + TILE_COUNT) % TILE_COUNT
    ;(occupants[slot] ||= []).push(p)
  }

  return (
    <div className="hb-mini" role="img" aria-label="Board overview: owned tiles and player positions">
      <div className="hb-mini-grid">
        {Array.from({ length: TILE_COUNT }, (_, i) => {
          const { row, col } = ringCell(i)
          const tile = monoTiles[i]
          const ownerId = ownership[i]
          const ownerColor = ownerId ? colorById[ownerId] : undefined
          const here = occupants[i] ?? []
          const isCorner = row === 1 || row === RING ? col === 1 || col === RING : false
          return (
            <div
              key={i}
              className={`hb-mini-tile${isCorner ? ' is-corner' : ''}${ownerColor ? ' is-owned' : ''}`}
              style={{
                gridRow: row,
                gridColumn: col,
                ...(ownerColor
                  ? {
                      background: hexToRgba(ownerColor, 0.32),
                      borderColor: hexToRgba(ownerColor, 0.55),
                    }
                  : null),
                ...(tile?.color ? { ['--hb-group' as string]: tile.color } : null),
              }}
            >
              {tile?.color ? <span className="hb-mini-band" /> : null}
              {here.length > 0 ? (
                <span className="hb-mini-pips">
                  {here.slice(0, 3).map(p => (
                    <span
                      key={p.id}
                      className={`hb-mini-pip${p.id === currentId ? ' is-current' : ''}`}
                      style={{ background: p.color }}
                    />
                  ))}
                </span>
              ) : null}
            </div>
          )
        })}
        <div className="hb-mini-core" aria-hidden />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   Screen
   ------------------------------------------------------------------ */

export function HarborScreen({
  stats,
  lobbies,
  players,
  balances,
  positions,
  currentIdx,
  feed,
  hasActiveGame,
  onGoToBoard,
  onGoToLobby,
  onStart,
  ownership = {},
  inJail = {},
  jailPasses = {},
  myPlayerId,
  startingGameId = null,
  seatsTotal,
}: HarborScreenProps) {
  const colorById: Record<string, string> = {}
  for (const p of players) colorById[p.id] = p.color

  const turnHolder = players[currentIdx]
  const me = myPlayerId ? players.find(p => p.id === myPlayerId) : undefined
  const focus = me ?? turnHolder
  const focusIsMe = !!me
  const focusBalance = focus ? balances[focus.id] || 0 : 0
  const focusProperties = focus ? propertiesOwnedBy(ownership, focus.id) : 0

  const openTables = lobbies.slice(0, 3)
  const visibleFeed = feed.slice(0, 8)
  const hiddenFeed = Math.max(0, feed.length - visibleFeed.length)

  return (
    <div className="harbor">
      {/* ---------------- LEFT ---------------- */}
      <div className="harbor-col">
        <div className="hb-stats" role="group" aria-label="Session overview">
          <div className="stat-tile hb-stat">
            <div className="stat-tile-label">Open tables</div>
            <div className="stat-tile-value hb-stat-value">{stats.openTables}</div>
          </div>
          <div className="stat-tile hb-stat">
            <div className="stat-tile-label">Players</div>
            <div className="stat-tile-value hb-stat-value">{stats.players}</div>
          </div>
          <div className="stat-tile hb-stat">
            <div className="stat-tile-label">Properties owned</div>
            <div className="stat-tile-value hb-stat-value">{stats.ownedTiles}</div>
          </div>
          <div className="stat-tile hb-stat">
            <div className="stat-tile-label">Houses built</div>
            <div className="stat-tile-value hb-stat-value">{stats.housesBuilt}</div>
          </div>
          <div className="stat-tile hb-stat">
            <div className="stat-tile-label">Cash in play</div>
            <div className="stat-tile-value hb-stat-value">{money(stats.cashTotal)}</div>
          </div>
          <div className="stat-tile hb-stat">
            <div className="stat-tile-label">Cards left</div>
            <div className="hb-stat-split">
              <span className="hb-split-part">
                <span className="stat-tile-value hb-stat-value">{stats.chanceLeft}</span>
                <span className="hb-split-key">Chance</span>
              </span>
              <span className="hb-split-rule" aria-hidden />
              <span className="hb-split-part">
                <span className="stat-tile-value hb-stat-value">{stats.chestLeft}</span>
                <span className="hb-split-key">Chest</span>
              </span>
            </div>
          </div>
        </div>

        {hasActiveGame && focus ? (
          <section className="panel harbor-active" aria-label="Active table">
            <div className="panel-head">
              <h2 className="panel-title">
                {IconTable}
                Active table
              </h2>
              <div className="panel-actions">
                <span className="chip chip-sm chip-teal">
                  <span className="status-dot status-dot-pulse" />
                  In play
                </span>
              </div>
            </div>

            <div className="hb-active-body">
              <MiniBoard
                ownership={ownership}
                colorById={colorById}
                positions={positions}
                players={players}
                currentId={turnHolder?.id ?? ''}
              />

              <div className="hb-active-side">
                <div className="hb-turn">
                  <div className="hb-turn-label caps">Current turn</div>
                  <div className="hb-turn-name">
                    <span
                      className="hb-dot"
                      style={{
                        background: turnHolder?.color ?? 'var(--muted)',
                      }}
                      aria-hidden
                    />
                    <span className="truncate">{turnHolder?.name ?? 'Waiting'}</span>
                  </div>
                  <div className="hb-turn-tile">
                    {tileLabel(turnHolder ? positions[turnHolder.id] : undefined)}
                  </div>
                </div>

                <div className="hb-active-figures">
                  <div className="hb-figure">
                    <span className="hb-figure-key caps">
                      {focusIsMe ? 'Your cash' : 'Turn holder cash'}
                    </span>
                    <span className="hb-figure-val num">{money(focusBalance)}</span>
                  </div>
                  <div className="hb-figure">
                    <span className="hb-figure-key caps">
                      {focusIsMe ? 'Your properties' : 'Properties held'}
                    </span>
                    <span className="hb-figure-val num">{focusProperties}</span>
                  </div>
                </div>

                <button type="button" className="btn btn-primary btn-block" onClick={onGoToBoard}>
                  Return to board
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="panel harbor-noTable" aria-label="No table in play">
            <div className="hb-noTable-inner">
              <LogoMark size={34} />
              <h2 className="hb-noTable-title">No table in play</h2>
              <p className="hb-noTable-text">
                Create a table or join an open one from the Lobby. Entry stakes are paid in ETH on Starknet
                Sepolia; everything on the board is game dollars.
              </p>
              <button type="button" className="btn btn-primary" onClick={onGoToLobby}>
                Go to Lobby
              </button>
            </div>
          </section>
        )}

        <section className="panel harbor-tables" aria-label="Open tables">
          <div className="panel-head">
            <h2 className="panel-title">
              {IconTables}
              Open tables
            </h2>
            <div className="panel-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={onGoToLobby}>
                View all
              </button>
            </div>
          </div>

          {openTables.length === 0 ? (
            <div className="empty">
              <div className="empty-title">No open tables</div>
              <div className="empty-text">
                Nothing is waiting for players right now. Create one from the Lobby.
              </div>
            </div>
          ) : (
            <div className="list hb-table-list">
              {openTables.map(lobby => {
                const starting = startingGameId === lobby.gameId
                // Only the host can start a table on-chain, and a table that
                // the indexer has not confirmed yet has no real game id to
                // start — matching the Lobby screen's own gating.
                const isHost = !!myPlayerId && !!lobby.hostAddress && sameAddress(lobby.hostAddress, myPlayerId)
                const canStart = isHost && !lobby.pending && lobby.players >= 2
                const startReason = lobby.pending
                  ? 'Waiting for this table to be confirmed on-chain'
                  : !isHost
                    ? 'Only the host can start this table'
                    : lobby.players < 2
                      ? 'Needs at least 2 players'
                      : 'Start this table'
                return (
                  <div key={lobby.gameId} className="row-item hb-table-row">
                    <div className="row-item-main">
                      <div className="row-item-title">
                        {lobby.pending ? 'New table (confirming)' : `Table #${lobby.gameId}`}
                      </div>
                      <div className="row-item-meta">
                        <span className="num">
                          {lobby.players}/{lobby.maxPlayers} seats
                        </span>
                        <span className="hb-meta-sep" aria-hidden />
                        <span>
                          Entry <span className="num">{lobby.entryEth}</span> ETH
                        </span>
                        <span className="hb-meta-sep hb-host" aria-hidden />
                        <span className="truncate hb-host">Host {shortId(lobby.host)}</span>
                      </div>
                    </div>
                    <div className="row-item-actions">
                      {/* This navigates to the Lobby, where joining actually
                          happens — so it must not promise a join, least of all
                          on a table that is already full. */}
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={onGoToLobby}
                        title="Open this table in the Lobby"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={!canStart || starting}
                        title={startReason}
                        onClick={() => onStart(lobby.gameId)}
                      >
                        {starting ? 'Starting…' : 'Start'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* ---------------- RIGHT ---------------- */}
      <div className="harbor-col">
        <section className="panel harbor-feed" aria-label="Recent activity">
          <div className="panel-head">
            <h2 className="panel-title">
              {IconPulse}
              Recent activity
            </h2>
            {feed.length > 0 && (
              <div className="panel-actions">
                <span className="meta num">{feed.length} events</span>
              </div>
            )}
          </div>

          {visibleFeed.length === 0 ? (
            <div className="empty">
              <div className="empty-title">Nothing has happened yet</div>
              <div className="empty-text">
                Rolls, purchases, rent and jail time all show up here as the table plays.
              </div>
            </div>
          ) : (
            <div className={`hb-feed${hiddenFeed > 0 ? ' has-more' : ''}`}>
              <ul className="hb-feed-list">
                {visibleFeed.map((entry, i) => (
                  <li key={`${entry.time}-${i}`} className={`hb-feed-item kind-${entry.kind}`}>
                    <span className="status-dot hb-feed-dot" aria-hidden />
                    <div className="hb-feed-main">
                      <div className="hb-feed-head">
                        <span className="hb-feed-title truncate">{entry.title}</span>
                        <span className="hb-feed-time num">{entry.time}</span>
                      </div>
                      {entry.body ? <div className="hb-feed-body truncate">{entry.body}</div> : null}
                    </div>
                  </li>
                ))}
              </ul>
              {hiddenFeed > 0 ? <div className="hb-feed-fade" aria-hidden /> : null}
            </div>
          )}
        </section>

        <section className="panel harbor-players" aria-label="Players at the table">
          <div className="panel-head">
            <h2 className="panel-title">
              {IconCrew}
              Players at the table
            </h2>
            {players.length > 0 && (
              <div className="panel-actions">
                <span className="meta num">
                  {seatsTotal ? `${players.length}/${seatsTotal}` : `${players.length} playing`}
                </span>
              </div>
            )}
          </div>

          {players.length === 0 ? (
            <div className="empty">
              <div className="empty-title">No players seated</div>
              <div className="empty-text">
                Seats fill as players join a table. Two to six players per table.
              </div>
            </div>
          ) : (
            <ul className="hb-players">
              {players.map((p, i) => {
                const active = i === currentIdx
                const jailTurns = inJail[p.id] || 0
                const passes = jailPasses[p.id] || 0
                return (
                  <li
                    key={p.id}
                    className={`hb-player${active ? ' is-active' : ''}`}
                    style={{ ['--hb-player' as string]: p.color }}
                  >
                    <span className="hb-player-bar" aria-hidden />
                    <span className="hb-dot" style={{ background: p.color }} aria-hidden />
                    <div className="hb-player-main">
                      <div className="hb-player-name truncate">
                        {p.name}
                        {p.id === myPlayerId ? <span className="chip chip-xs hb-you">You</span> : null}
                      </div>
                      <div className="hb-player-tile truncate">{tileLabel(positions[p.id])}</div>
                    </div>
                    <div className="hb-player-tags">
                      {jailTurns > 0 ? (
                        <span className="chip chip-sm chip-warn">
                          In jail <span className="chip-value">{jailTurns}</span>
                        </span>
                      ) : null}
                      {passes > 0 ? (
                        <span className="chip chip-sm chip-accent">
                          Jail pass <span className="chip-value">{passes}</span>
                        </span>
                      ) : null}
                    </div>
                    <span className="hb-player-cash num">{money(balances[p.id] || 0)}</span>
                  </li>
                )
              })}
            </ul>
          )}

          {hasActiveGame && players.length > 0 ? (
            <div className="hb-players-foot">
              <button type="button" className="btn btn-outline btn-block" onClick={onGoToBoard}>
                Go to board
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

export default HarborScreen
