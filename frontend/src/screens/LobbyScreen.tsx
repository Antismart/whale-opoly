/**
 * Lobby screen — Abyssal Protocol.
 *
 * Replaces components/OnboardPanel.tsx. The callback contract is unchanged, so
 * it drops straight into the existing handlers in App.tsx.
 *
 * CURRENCY: the only ETH values on this screen are the entry stake and the pot
 * (entry x seats). Nothing here prints a board value — balances, rent and
 * property prices are game dollars and live on the board screen.
 */

import { useCallback, useId, useMemo, useRef, useState } from 'react'
import type { Lobby } from '../types'
import { LogoMark } from '../components/brand/Logo'
import './lobby.css'

/* ------------------------------------------------------------------
   Tiers — fixed mapping, four tiers, no others exist.
   ------------------------------------------------------------------ */

export type TierName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

type Tier = {
  name: TierName
  /** entry stake in ETH, passed up through onCreate verbatim */
  eth: string
  /** css hook for the metal tint */
  key: 'bronze' | 'silver' | 'gold' | 'platinum'
  blurb: string
}

const TIERS: readonly Tier[] = [
  { name: 'Bronze', eth: '0.01', key: 'bronze', blurb: 'Low stakes' },
  { name: 'Silver', eth: '0.1', key: 'silver', blurb: 'Steady water' },
  { name: 'Gold', eth: '1', key: 'gold', blurb: 'Deep water' },
  { name: 'Platinum', eth: '10', key: 'platinum', blurb: 'Abyssal' },
]

const MIN_PLAYERS = 2
const MAX_PLAYERS = 6
const SEAT_SLOTS = [1, 2, 3, 4, 5, 6]

type TierFilter = 'All' | TierName
const TIER_FILTERS: readonly TierFilter[] = ['All', 'Bronze', 'Silver', 'Gold', 'Platinum']

/* ------------------------------------------------------------------
   Formatting helpers
   ------------------------------------------------------------------ */

const ethFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 })

/** Formats an ETH amount without float dust: 0.01 * 3 -> "0.03". */
function formatEth(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return ethFormat.format(Number(value.toFixed(6)))
}

/** Nearest tier for an entry stake read off-chain. Falls back to Bronze. */
function tierForEntry(entryEth: string): Tier {
  const value = Number(entryEth)
  const match = TIERS.find((t) => Math.abs(Number(t.eth) - value) < 1e-9)
  return match ?? TIERS[0]
}

/** 0x1234...abcd — leaves non-address hosts (a username) readable as-is. */
function truncateAddress(value: string): string {
  if (!value) return 'Unknown'
  const isHex = /^0x[0-9a-fA-F]+$/.test(value)
  if (!isHex) return value
  if (value.length <= 12) return value
  return `${value.slice(0, 6)}...${value.slice(-4)}`
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

/* ------------------------------------------------------------------
   Icons
   ------------------------------------------------------------------ */

const MinusIcon = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M3 7h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

const PlusIcon = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

const EscrowIcon = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <rect x="2.6" y="6" width="8.8" height="6.2" rx="1.6" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4.8 6V4.5a2.2 2.2 0 0 1 4.4 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

export type LobbyScreenProps = {
  lobbies: Lobby[]
  onCreate: (maxPlayers: number, host: string, entryEth: string) => Promise<void> | void
  onJoin: (gameId: number, username: string) => Promise<void> | void
  onStart?: (gameId: number) => Promise<void> | void
  onCancel?: (gameId: number) => Promise<void> | void
  /** 'creating' | 'joining' | 'starting' | … from App.tsx, or null when idle */
  actionLoading?: string | null
  isConnected?: boolean
  currentAddress?: string
  /**
   * True when the indexer is unreachable. An empty list then means "we could
   * not look", not "there is nothing" — and the empty state must not claim
   * the second.
   */
  dataUnavailable?: boolean
}

type PendingAction = { gameId: number; kind: 'join' | 'start' | 'cancel' } | null

/* ------------------------------------------------------------------
   Screen
   ------------------------------------------------------------------ */

export function LobbyScreen({
  lobbies,
  onCreate,
  onJoin,
  onStart,
  onCancel,
  actionLoading = null,
  isConnected = false,
  currentAddress,
  dataUnavailable = false,
}: LobbyScreenProps) {
  const [username, setUsername] = useState('')
  const [tier, setTier] = useState<Tier>(TIERS[0])
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [filter, setFilter] = useState<TierFilter>('All')
  const [pending, setPending] = useState<PendingAction>(null)
  const [creating, setCreating] = useState(false)

  const usernameRef = useRef<HTMLInputElement>(null)
  const createPanelRef = useRef<HTMLDivElement>(null)
  const usernameId = useId()
  const seatsId = useId()

  const trimmedName = username.trim()
  const busy = creating || pending !== null || actionLoading !== null

  const counts = useMemo(() => {
    const map: Record<TierName, number> = { Bronze: 0, Silver: 0, Gold: 0, Platinum: 0 }
    for (const lobby of lobbies) map[tierForEntry(lobby.entryEth).name] += 1
    return map
  }, [lobbies])

  const visible = useMemo(
    () => (filter === 'All' ? lobbies : lobbies.filter((l) => tierForEntry(l.entryEth).name === filter)),
    [lobbies, filter],
  )

  const focusCreateForm = useCallback(() => {
    createPanelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    usernameRef.current?.focus()
  }, [])

  const runTableAction = useCallback(
    async (gameId: number, kind: 'join' | 'start' | 'cancel', run: () => Promise<void> | void) => {
      setPending({ gameId, kind })
      try {
        await run()
      } finally {
        setPending(null)
      }
    },
    [],
  )

  const handleCreate = useCallback(async () => {
    setCreating(true)
    try {
      await onCreate(maxPlayers, trimmedName, tier.eth)
    } finally {
      setCreating(false)
    }
  }, [onCreate, maxPlayers, trimmedName, tier.eth])

  const isPending = (gameId: number, kind: 'join' | 'start' | 'cancel') =>
    pending?.gameId === gameId && pending.kind === kind

  const createBlocker = !isConnected
    ? 'Connect your wallet to create a table.'
    : !trimmedName
      ? 'Pick a username first — it names you at the table.'
      : null

  const createPot = Number(tier.eth) * maxPlayers

  return (
    <div className="lobby">
      {/* ---------------- Hero ---------------- */}
      <section className="lobby-hero">
        <span className="lobby-hero-whale" aria-hidden="true">
          <LogoMark size={460} title="" />
        </span>
        <div className="lobby-hero-copy">
          <span className="chip chip-teal lobby-hero-eyebrow">
            <span className="status-dot status-dot-pulse" aria-hidden="true" />
            On-chain strategy · Starknet Sepolia
          </span>
          <h1 className="lobby-hero-title">Dive In. Stake. Conquer.</h1>
          <p className="lobby-hero-sub">
            Two to six players per table. Your entry stake is escrowed on-chain by the game contract
            until the table resolves — everything on the board itself is played in game dollars.
          </p>
        </div>
      </section>

      <div className="lobby-columns">
        {/* ---------------- Open tables ---------------- */}
        <section className="lobby-tables" aria-labelledby="lobby-tables-title">
          <header className="lobby-tables-head">
            <div className="lobby-tables-heading">
              <h2 className="section-title" id="lobby-tables-title">
                Open tables
              </h2>
              <span className="meta num">
                {lobbies.length === 0
                  ? 'Waiting for the first table'
                  : `${visible.length} of ${lobbies.length} shown`}
              </span>
            </div>
            <div className="segmented" role="group" aria-label="Filter tables by entry tier">
              {TIER_FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`segmented-option${filter === option ? ' is-active' : ''}`}
                  aria-pressed={filter === option}
                  onClick={() => setFilter(option)}
                >
                  {option}
                  <span className="lobby-filter-count num">
                    {option === 'All' ? lobbies.length : counts[option]}
                  </span>
                </button>
              ))}
            </div>
          </header>

          {visible.length === 0 ? (
            <div className="empty lobby-empty">
              <LogoMark size={34} className="lobby-empty-mark" />
              <p className="empty-title">
                {dataUnavailable
                  ? 'Tables cannot be loaded'
                  : lobbies.length === 0
                    ? 'No open tables yet'
                    : `No ${filter} tables open`}
              </p>
              <p className="empty-text">
                {dataUnavailable
                  ? 'The indexer is offline, so open tables cannot be listed. There may well be tables waiting.'
                  : lobbies.length === 0
                    ? 'Be the first to drop anchor — create a table and other players can join it.'
                    : 'Nothing at this tier right now. Clear the filter, or open one yourself.'}
              </p>
              <div className="cluster lobby-empty-actions">
                {lobbies.length > 0 && filter !== 'All' && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFilter('All')}>
                    Show all tiers
                  </button>
                )}
                {/* Outline, not primary: this only scrolls to the form. The
                    sticky "Create table" is the screen's one commit action,
                    and the only button on it allowed to glow. */}
                <button type="button" className="btn btn-outline" onClick={focusCreateForm}>
                  Jump to the create form
                </button>
              </div>
            </div>
          ) : (
            <div className="lobby-grid">
              {visible.map((lobby) => {
                const lobbyTier = tierForEntry(lobby.entryEth)
                const seatsTaken = Math.max(0, Math.min(lobby.maxPlayers, lobby.players))
                const isFull = seatsTaken >= lobby.maxPlayers
                // Ownership is decided on the creator's ADDRESS, never on
                // "is a wallet connected" — otherwise every connected player
                // is shown the You chip and the Cancel button on a locally
                // created row whose host is a username.
                const hostAddress =
                  lobby.hostAddress ?? (/^0x[0-9a-fA-F]+$/.test(lobby.host) ? lobby.host : undefined)
                const isHost = sameAddress(hostAddress, currentAddress)
                // Only the host can start a table on-chain; anyone else gets a
                // rejected transaction, so the button should not be there.
                const canStart = isHost && lobby.players >= MIN_PLAYERS && !!onStart && !lobby.pending

                const joinBlocker = lobby.pending
                  ? 'Waiting for this table to be confirmed on-chain'
                  : !isConnected
                    ? 'Connect your wallet to join'
                    : !trimmedName
                      ? 'Enter a username to join'
                      : isFull
                        ? 'This table is full'
                        : null

                return (
                  <article className="lobby-card" key={lobby.gameId} data-tier={lobbyTier.key}>
                    <span className="lobby-card-rail" aria-hidden="true" />

                    <header className="lobby-card-head">
                      <h3 className="lobby-card-title">
                        {lobby.pending ? 'New table' : <>Table <span className="num">#{lobby.gameId}</span></>}
                      </h3>
                      <span className="chip chip-sm lobby-tier-badge">{lobbyTier.name}</span>
                    </header>

                    <div className="lobby-metrics">
                      <div className="lobby-metric">
                        <span className="lobby-metric-label">Entry</span>
                        <span className="lobby-metric-value num">{formatEth(Number(lobby.entryEth))} ETH</span>
                      </div>
                      <div className="lobby-metric">
                        <span className="lobby-metric-label">Pot</span>
                        <span className="lobby-metric-value num">
                          {formatEth(Number(lobby.entryEth) * seatsTaken)} ETH
                        </span>
                      </div>
                      <div className="lobby-metric">
                        <span className="lobby-metric-label">Seats</span>
                        <span className="lobby-metric-value num">
                          {seatsTaken}/{lobby.maxPlayers}
                        </span>
                      </div>
                    </div>

                    <div className="lobby-seatline">
                      <span className="lobby-seatdots" aria-hidden="true">
                        {Array.from({ length: lobby.maxPlayers }, (_, i) => (
                          <span
                            key={i}
                            className={`lobby-seatdot${i < seatsTaken ? ' is-filled' : ''}`}
                            style={i < seatsTaken ? { background: `var(--player-${i + 1})` } : undefined}
                          />
                        ))}
                      </span>
                      <span className="meta num">
                        {isFull ? 'Table full' : `${lobby.maxPlayers - seatsTaken} seat${lobby.maxPlayers - seatsTaken === 1 ? '' : 's'} open`}
                      </span>
                    </div>

                    <div className="lobby-host">
                      <span className="lobby-host-label">Host</span>
                      <span className="lobby-host-value num" title={lobby.host}>
                        {truncateAddress(lobby.host)}
                      </span>
                      {isHost && <span className="chip chip-sm chip-accent">You</span>}
                    </div>

                    <div className="lobby-card-actions">
                      <button
                        type="button"
                        className={`btn btn-outline btn-sm lobby-join${isPending(lobby.gameId, 'join') ? ' is-loading' : ''}`}
                        disabled={!!joinBlocker || busy}
                        title={joinBlocker ?? undefined}
                        onClick={() =>
                          runTableAction(lobby.gameId, 'join', () => onJoin(lobby.gameId, trimmedName))
                        }
                      >
                        Join table
                      </button>

                      {canStart && (
                        <button
                          type="button"
                          className={`btn btn-primary btn-sm lobby-start${
                            isPending(lobby.gameId, 'start') || (actionLoading === 'starting' && pending?.gameId === lobby.gameId)
                              ? ' is-loading'
                              : ''
                          }`}
                          disabled={busy}
                          onClick={() => runTableAction(lobby.gameId, 'start', () => onStart!(lobby.gameId))}
                        >
                          Start
                        </button>
                      )}

                      {isHost && onCancel && (
                        <button
                          type="button"
                          className={`btn btn-ghost btn-sm lobby-cancel${isPending(lobby.gameId, 'cancel') ? ' is-loading' : ''}`}
                          disabled={busy || !!lobby.pending}
                          title={lobby.pending ? 'Waiting for this table to be confirmed on-chain' : undefined}
                          onClick={() => runTableAction(lobby.gameId, 'cancel', () => onCancel(lobby.gameId))}
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    {joinBlocker && <p className="lobby-card-note">{joinBlocker}.</p>}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {/* ---------------- Create a table ---------------- */}
        <div className="lobby-aside" ref={createPanelRef}>
          <section className="panel lobby-create" aria-labelledby="lobby-create-title">
            <header className="panel-head lobby-create-head">
              <div>
                <h2 className="panel-title" id="lobby-create-title">
                  Create a table
                </h2>
                <p className="panel-sub">You take the first seat and host the table.</p>
              </div>
            </header>

            <div className="lobby-create-body">
              <label className="field" htmlFor={usernameId}>
                <span className="field-label">Your username</span>
                <input
                  id={usernameId}
                  ref={usernameRef}
                  className="input"
                  type="text"
                  value={username}
                  maxLength={24}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="e.g. DeepCurrent"
                  onChange={(e) => setUsername(e.target.value)}
                />
                <span className="field-hint">Used when you create a table and when you join one.</span>
              </label>

              <div className="lobby-field-block">
                <span className="field-label" id="lobby-tier-label">
                  Entry tier
                </span>
                <div className="lobby-tiers" role="radiogroup" aria-labelledby="lobby-tier-label">
                  {TIERS.map((t) => {
                    const selected = t.key === tier.key
                    return (
                      <button
                        key={t.key}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        data-tier={t.key}
                        className={`lobby-tier${selected ? ' is-selected' : ''}`}
                        onClick={() => setTier(t)}
                      >
                        <span className="lobby-tier-name">{t.name}</span>
                        <span className="lobby-tier-eth num">{t.eth} ETH</span>
                        <span className="lobby-tier-blurb">{t.blurb}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="lobby-field-block">
                <span className="field-label" id={seatsId}>
                  Players at the table
                </span>
                <div className="lobby-stepper">
                  <button
                    type="button"
                    className="btn btn-icon btn-sm"
                    aria-label="Fewer players"
                    disabled={maxPlayers <= MIN_PLAYERS}
                    onClick={() => setMaxPlayers((n) => Math.max(MIN_PLAYERS, n - 1))}
                  >
                    {MinusIcon}
                  </button>
                  <output className="lobby-stepper-value num" aria-labelledby={seatsId} aria-live="polite">
                    {maxPlayers}
                  </output>
                  <button
                    type="button"
                    className="btn btn-icon btn-sm"
                    aria-label="More players"
                    disabled={maxPlayers >= MAX_PLAYERS}
                    onClick={() => setMaxPlayers((n) => Math.min(MAX_PLAYERS, n + 1))}
                  >
                    {PlusIcon}
                  </button>
                  <span className="lobby-seatdots lobby-seatdots-lg" aria-hidden="true">
                    {SEAT_SLOTS.map((slot) => (
                      <span
                        key={slot}
                        className={`lobby-seatdot${slot <= maxPlayers ? ' is-filled' : ''}`}
                        style={slot <= maxPlayers ? { background: `var(--player-${slot})` } : undefined}
                      />
                    ))}
                  </span>
                </div>
                <span className="field-hint">Between 2 and 6 players. The table starts when the host says so.</span>
              </div>

              <div className="well lobby-pot">
                <div className="lobby-pot-row">
                  <span className="lobby-pot-label">Table pot</span>
                  <span className="lobby-pot-value num">{formatEth(createPot)} ETH</span>
                </div>
                <p className="lobby-pot-meta num">
                  {tier.eth} ETH entry × {maxPlayers} players
                </p>
              </div>

              <button
                type="button"
                className={`btn btn-primary btn-lg btn-block${creating || actionLoading === 'creating' ? ' is-loading' : ''}`}
                disabled={!!createBlocker || busy}
                onClick={handleCreate}
              >
                Create table
              </button>

              {createBlocker && <p className="lobby-create-blocker">{createBlocker}</p>}

              <p className="lobby-create-note">
                <span className="lobby-create-note-icon" aria-hidden="true">
                  {EscrowIcon}
                </span>
                Your stake is escrowed by the game contract when the table is created, and refunded in
                full if the table is cancelled before it starts.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default LobbyScreen
