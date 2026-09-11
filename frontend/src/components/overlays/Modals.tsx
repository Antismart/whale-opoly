/* ============================================================
   ABYSSAL PROTOCOL — modal overlays
   One shared <Modal> shell + five presentational game modals.
   Every component here is driven entirely by props and holds
   no game state. Currency rule: everything on the board is in
   GAME DOLLARS ($). Only the table pot / entry stake is ETH,
   and it arrives pre-formatted as a string.
   ============================================================ */

import { useCallback, useEffect, useId, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Card } from '../../types'
import { LogoMark } from '../brand/Logo'
import { money as formatMoney, signedMoney as formatSignedMoney } from '../../format'
import './overlays.css'

/* Money is formatted by the one shared formatter in src/format.ts —
   game dollars, tabular, thousands separated. Aliased on import because
   this file may only export components and types (eslint
   react-refresh/only-export-components). */

function truncateHash(hash: string): string {
  if (hash.length <= 14) return hash
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`
}

const STARKSCAN_TX = 'https://sepolia.starkscan.co/tx/'

/* ------------------------------------------------------------
   Icons — inline SVG only
   ------------------------------------------------------------ */

function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconChance() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <circle cx="26" cy="26" r="21" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
      <circle cx="26" cy="26" r="15" stroke="currentColor" strokeWidth="1" opacity="0.2" strokeDasharray="3 4" />
      <path d="M26 9l4.6 12.4L43 26l-12.4 4.6L26 43l-4.6-12.4L9 26l12.4-4.6z" fill="currentColor" opacity="0.9" />
      <circle cx="26" cy="26" r="3.4" fill="#040a15" />
    </svg>
  )
}

function IconChest() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <path
        d="M9 22a17 17 0 0134 0v18a3 3 0 01-3 3H12a3 3 0 01-3-3z"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity="0.55"
      />
      <path d="M9 26h34" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
      <rect x="22" y="22" width="8" height="10" rx="2" fill="currentColor" opacity="0.9" />
      <circle cx="26" cy="26" r="1.6" fill="#040a15" />
      <path d="M15 22a11 11 0 0122 0" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    </svg>
  )
}

function IconSwap() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 7h11m0 0l-3.2-3.2M14 7l-3.2 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 13H6m0 0l3.2-3.2M6 13l3.2 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <path
        d="M17 4.5l13 22.5H4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <path d="M17 13v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="17" cy="23.6" r="1.3" fill="currentColor" />
    </svg>
  )
}

function IconExternal() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M4.5 1.5H10.5V7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.5 1.5L5 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9 8.5v1.6a.9.9 0 01-.9.9H1.9a.9.9 0 01-.9-.9V3.9a.9.9 0 01.9-.9h1.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

/* ------------------------------------------------------------
   Shared modal shell
   ------------------------------------------------------------ */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export type ModalTone = 'default' | 'danger' | 'gold' | 'teal'
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

export type ModalProps = {
  /** Nothing renders when false. */
  open: boolean
  /** Fired by Escape, the backdrop and the close button. */
  onClose: () => void
  /** Accessible name of the dialog; also the visible title unless `hideTitle`. */
  title: string
  /** Short uppercase type tag shown top-left, e.g. "Trade". */
  tag?: ReactNode
  /** Colour of the type tag. */
  tagTone?: 'accent' | 'teal' | 'gold' | 'warn' | 'danger'
  /** Extra content in the header, between the tag and the close button. */
  headerExtra?: ReactNode
  /** Border / glow tint of the panel. */
  tone?: ModalTone
  size?: ModalSize
  /** 'card' adds the playing-card flip entrance. */
  entrance?: 'lift' | 'card'
  /** Renders the title as a large display line inside the body area. */
  hideTitle?: boolean
  /** Sub-line under the title. */
  subtitle?: ReactNode
  /** Buttons for the action row; omit the row entirely by leaving it undefined. */
  actions?: ReactNode
  /** Left-hand note in the action row (a hint, a total, a warning). */
  actionsNote?: ReactNode
  /** Centre the header title block (victory / bankruptcy). */
  center?: boolean
  /** Set false to hide the close button (still closes on Escape / backdrop). */
  showClose?: boolean
  /** Set false to keep the modal open when the backdrop is clicked. */
  closeOnBackdrop?: boolean
  children?: ReactNode
}

export function Modal({
  open,
  onClose,
  title,
  tag,
  tagTone = 'accent',
  headerExtra,
  tone = 'default',
  size = 'md',
  entrance = 'lift',
  hideTitle = false,
  subtitle,
  actions,
  actionsNote,
  center = false,
  showClose = true,
  closeOnBackdrop = true,
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return

    const restoreTo = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Move focus into the panel.
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current
      if (!panel) return
      const first = panel.querySelector<HTMLElement>(FOCUSABLE)
      if (first) first.focus()
      else panel.focus()
    }, 0)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        event.preventDefault()
        handleClose()
        return
      }
      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null || node === document.activeElement,
      )
      if (nodes.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
      if (restoreTo && typeof restoreTo.focus === 'function') restoreTo.focus()
    }
  }, [open, handleClose])

  if (!open) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="ovl-backdrop"
      onMouseDown={(event) => {
        if (!closeOnBackdrop) return
        if (event.target === event.currentTarget) handleClose()
      }}
    >
      <div
        ref={panelRef}
        className={[
          'ovl-panel',
          `ovl-panel-${size}`,
          `ovl-tone-${tone}`,
          entrance === 'card' ? 'ovl-enter-card' : 'ovl-enter-lift',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="ovl-head">
          {tag ? <span className={`chip chip-sm ovl-tag ovl-tag-${tagTone}`}>{tag}</span> : <span />}
          {headerExtra ? <div className="ovl-head-extra">{headerExtra}</div> : null}
          {showClose ? (
            <button type="button" className="btn btn-icon btn-ghost ovl-close" onClick={handleClose} aria-label="Close">
              <IconClose />
            </button>
          ) : null}
        </div>

        <div className={center ? 'ovl-titleblock ovl-titleblock-center' : 'ovl-titleblock'}>
          <h2 id={titleId} className={hideTitle ? 'sr-only' : 'ovl-title'}>
            {title}
          </h2>
          {subtitle ? <p className="ovl-subtitle">{subtitle}</p> : null}
        </div>

        <div className="ovl-body scroll-y">{children}</div>

        {actions ? (
          <div className="ovl-actions">
            {actionsNote ? <div className="ovl-actions-note">{actionsNote}</div> : <span className="grow" />}
            <div className="ovl-actions-buttons">{actions}</div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

/* ============================================================
   1. Card modal — Chance / Community Chest
   ============================================================ */

export type CardModalProps = {
  open: boolean
  /** The drawn card. Nothing renders when null/undefined. */
  card: Card | null | undefined
  /** Who drew it — shown in the header. */
  drawnBy?: { name: string; color: string } | null
  /** Resolves a tile id to its display name, for "advance to" cards. */
  tileLookup?: (tileId: number) => string | undefined
  onApply: (card: Card) => void
  onClose: () => void
  /** Disables the primary action while a transaction is in flight. */
  applying?: boolean
}

type CardEffect = { text: string; tone: 'teal' | 'danger' | 'accent' | 'warn' | 'neutral' }

function describeCardEffect(card: Card, tileLookup?: (tileId: number) => string | undefined): CardEffect {
  const action = card.action
  switch (action.kind) {
    case 'money':
      return {
        text: formatSignedMoney(action.amount),
        tone: action.amount >= 0 ? 'teal' : 'danger',
      }
    case 'collect_each':
      return { text: `${formatSignedMoney(action.amount)} from every other player`, tone: 'teal' }
    case 'pay_each':
      return { text: `${formatSignedMoney(-Math.abs(action.amount))} to every other player`, tone: 'danger' }
    case 'move': {
      const name = tileLookup?.(action.to) ?? `tile ${action.to}`
      return {
        text: action.passGo ? `Advance to ${name} · collect $200 at Start` : `Advance to ${name}`,
        tone: 'accent',
      }
    }
    case 'move_rel':
      return {
        text: action.delta >= 0 ? `Move forward ${action.delta} tiles` : `Move back ${Math.abs(action.delta)} tiles`,
        tone: 'accent',
      }
    case 'goto_jail':
      return { text: 'Go directly to Jail', tone: 'warn' }
    case 'jail_pass':
      return { text: 'Kept until you use it', tone: 'accent' }
    case 'nearest_rail':
      return { text: 'Advance to the nearest rail', tone: 'accent' }
    case 'nearest_utility':
      return { text: 'Advance to the nearest utility', tone: 'accent' }
    case 'repair':
      return {
        text: `${formatMoney(action.perHouse)} per house · ${formatMoney(action.perHotel)} per hotel`,
        tone: 'danger',
      }
    default:
      return { text: 'Resolve this card', tone: 'neutral' }
  }
}

export function CardModal({ open, card, drawnBy, tileLookup, onApply, onClose, applying = false }: CardModalProps) {
  if (!card) return null

  const isChance = card.deck === 'chance'
  const effect = describeCardEffect(card, tileLookup)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={card.title}
      tag={isChance ? 'Chance' : 'Community Chest'}
      tagTone={isChance ? 'accent' : 'teal'}
      tone={isChance ? 'default' : 'teal'}
      size="sm"
      entrance="card"
      headerExtra={
        drawnBy ? (
          <span className="ovl-drawnby meta">
            Drawn by{' '}
            <span className="ovl-player-name" style={{ color: drawnBy.color }}>
              {drawnBy.name}
            </span>
          </span>
        ) : null
      }
      actions={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className={applying ? 'btn btn-primary is-loading' : 'btn btn-primary'}
            onClick={() => onApply(card)}
            disabled={applying}
          >
            Apply
          </button>
        </>
      }
      actionsNote={card.keep ? <span className="meta">This card stays in your hand until used.</span> : null}
    >
      <div className={isChance ? 'ovl-card-face ovl-card-chance' : 'ovl-card-face ovl-card-chest'}>
        <div className="ovl-card-icon">{isChance ? <IconChance /> : <IconChest />}</div>
        <p className="ovl-card-text">{card.text}</p>
        <span className={`chip ovl-effect ovl-effect-${effect.tone}`}>
          <span className="num">{effect.text}</span>
        </span>
      </div>
    </Modal>
  )
}

/* ============================================================
   2. Trade modal
   ============================================================ */

export type TradePlayer = { id: string; name: string; color: string }

export type TradeProperty = {
  tileId: number
  name: string
  /** Colour-group swatch. Rails and utilities have none. */
  groupColor?: string
  price: number
  houses?: number
  mortgaged?: boolean
}

export type TradeOfferValue = { toPlayer: string; propertyId: number; price: number }

export type TradeModalProps = {
  open: boolean
  /** Every player at the table, including you. */
  players: TradePlayer[]
  /** Your player id — used to label your side and to filter the recipient list. */
  myId: string
  /** Properties you own, in board order. */
  myProperties: TradeProperty[]
  /** Properties the selected recipient owns, in board order. */
  theirProperties: TradeProperty[]
  /** Resolves any tile id to a property, for the selected-offer summary. */
  tileLookup: (tileId: number) => TradeProperty | undefined
  /**
   * Every colour-grouped property on the board. Optional — supplied only so the
   * modal can say, in plain English, when a trade completes or breaks a group.
   */
  boardProperties?: TradeProperty[]
  value: TradeOfferValue
  onChange: (next: TradeOfferValue) => void
  onSubmit: () => void
  onClose: () => void
  /** Your balance, shown next to the cash field. */
  myBalance?: number
  submitting?: boolean
}

const CASH_STEPS = [50, 100, 250]

function groupMembers(board: TradeProperty[] | undefined, groupColor: string | undefined): number[] {
  if (!board || !groupColor) return []
  return board.filter((p) => p.groupColor === groupColor).map((p) => p.tileId)
}

export function TradeModal({
  open,
  players,
  myId,
  myProperties,
  theirProperties,
  tileLookup,
  boardProperties,
  value,
  onChange,
  onSubmit,
  onClose,
  myBalance,
  submitting = false,
}: TradeModalProps) {
  const me = players.find((p) => p.id === myId)
  const them = players.find((p) => p.id === value.toPlayer)
  const others = players.filter((p) => p.id !== myId)
  const offered = value.propertyId ? tileLookup(value.propertyId) : undefined

  const hints = useMemo(() => {
    const out: { tone: 'teal' | 'warn'; color?: string; text: string }[] = []
    if (!offered || !them) return out
    const members = groupMembers(boardProperties, offered.groupColor)
    if (members.length === 0) return out

    const theirIds = new Set(theirProperties.map((p) => p.tileId))
    const theirsAfter = members.filter((id) => theirIds.has(id) || id === offered.tileId)
    if (theirsAfter.length === members.length) {
      out.push({
        tone: 'teal',
        color: offered.groupColor,
        text: `This completes a colour group for ${them.name} — they will be able to build houses on it.`,
      })
    }

    const myIds = new Set(myProperties.map((p) => p.tileId))
    const mineNow = members.filter((id) => myIds.has(id))
    if (mineNow.length === members.length) {
      out.push({
        tone: 'warn',
        color: offered.groupColor,
        text: 'You currently hold this whole colour group. Giving this property away breaks it up.',
      })
    }
    return out
  }, [offered, them, boardProperties, theirProperties, myProperties])

  const canSend = Boolean(value.toPlayer) && value.propertyId > 0 && value.price >= 0 && !submitting

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Propose a Trade"
      tag="Trade"
      tagTone="accent"
      size="lg"
      subtitle="Offer one property in exchange for game dollars. The other player keeps everything they already own."
      actions={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={submitting ? 'btn btn-primary is-loading' : 'btn btn-primary'}
            onClick={onSubmit}
            disabled={!canSend}
          >
            Send offer
          </button>
        </>
      }
      actionsNote={
        offered && them ? (
          <span className="meta">
            {offered.name} → {them.name} for <span className="num bright">{formatMoney(value.price)}</span>
          </span>
        ) : (
          <span className="meta">Pick a player and one of your properties.</span>
        )
      }
    >
      <div className="ovl-trade">
        {/* ---------------- your side ---------------- */}
        <section className="ovl-trade-side" aria-label="Your side of the trade">
          <header className="ovl-trade-head">
            <span className="ovl-trade-eyebrow">You give</span>
            <label className="field">
              <span className="sr-only">Your player</span>
              <select className="select" value={myId} disabled aria-label="Your player">
                <option value={myId}>{me ? me.name : 'You'}</option>
              </select>
            </label>
          </header>

          <div className="ovl-trade-list scroll-y">
            {myProperties.length === 0 ? (
              <div className="empty">
                <div className="empty-title">No properties yet</div>
                <p className="empty-text">Buy a property before proposing a trade.</p>
              </div>
            ) : (
              myProperties.map((property) => {
                const selected = property.tileId === value.propertyId
                return (
                  <button
                    key={property.tileId}
                    type="button"
                    className={selected ? 'row-item is-active' : 'row-item'}
                    aria-pressed={selected}
                    onClick={() => onChange({ ...value, propertyId: property.tileId })}
                  >
                    <span
                      className="swatch"
                      style={{ background: property.groupColor ?? 'rgba(224,242,254,0.22)' }}
                      aria-hidden="true"
                    />
                    <span className="row-item-main">
                      <span className="row-item-title">{property.name}</span>
                      <span className="row-item-meta num">
                        {formatMoney(property.price)}
                        {property.houses ? ` · ${property.houses} house${property.houses > 1 ? 's' : ''}` : ''}
                        {property.mortgaged ? ' · Mortgaged' : ''}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </section>

        {/* ---------------- swap glyph ---------------- */}
        <div className="ovl-trade-swap" aria-hidden="true">
          <span className="ovl-trade-rule" />
          <span className="ovl-trade-swapmark">
            <IconSwap />
          </span>
          <span className="ovl-trade-rule" />
        </div>

        {/* ---------------- their side ---------------- */}
        {/* Informational, not selectable: the contract's trade moves ONE property
            from you to them for game dollars, so the other player never gives a
            property. This column exists to show what you are bargaining against
            — labelling it "They give" promised a swap the game cannot perform. */}
        <section className="ovl-trade-side" aria-label="What the other player owns">
          <header className="ovl-trade-head">
            <span className="ovl-trade-eyebrow">They own</span>
            <label className="field">
              <span className="sr-only">Trade with</span>
              <select
                className="select"
                value={value.toPlayer}
                onChange={(event) => onChange({ ...value, toPlayer: event.target.value })}
                aria-label="Trade with"
              >
                <option value="">Select player…</option>
                {others.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </label>
          </header>

          <div className="ovl-trade-list scroll-y">
            {!them ? (
              <div className="empty">
                <div className="empty-title">No player selected</div>
                <p className="empty-text">Choose who you want to trade with.</p>
              </div>
            ) : theirProperties.length === 0 ? (
              <div className="empty">
                <div className="empty-title">{them.name} owns nothing yet</div>
                <p className="empty-text">They can still pay you in game dollars.</p>
              </div>
            ) : (
              theirProperties.map((property) => (
                <div key={property.tileId} className="ovl-trade-row" title={`${them.name} owns ${property.name}`}>
                  <span
                    className="swatch"
                    style={{ background: property.groupColor ?? 'rgba(224,242,254,0.22)' }}
                    aria-hidden="true"
                  />
                  <span className="row-item-main">
                    <span className="row-item-title">{property.name}</span>
                    <span className="row-item-meta num">
                      {formatMoney(property.price)}
                      {property.houses ? ` · ${property.houses} house${property.houses > 1 ? 's' : ''}` : ''}
                      {property.mortgaged ? ' · Mortgaged' : ''}
                    </span>
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ---------------- cash ---------------- */}
      <div className="ovl-trade-cash">
        <div className="field">
          <span className="field-label">They pay you</span>
          <div className="field-row">
            <input
              className="input input-num"
              type="number"
              min={0}
              step={10}
              inputMode="numeric"
              value={Number.isFinite(value.price) ? value.price : 0}
              onChange={(event) => onChange({ ...value, price: Math.max(0, Number(event.target.value) || 0) })}
              aria-label="Cash amount in game dollars"
            />
            {CASH_STEPS.map((step) => (
              <button
                key={step}
                type="button"
                className="btn btn-outline btn-sm num"
                onClick={() => onChange({ ...value, price: Math.max(0, (value.price || 0) + step) })}
              >
                +${step}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onChange({ ...value, price: 0 })}
              disabled={!value.price}
            >
              Clear
            </button>
          </div>
          <span className="field-hint">
            Game dollars, not ETH.
            {typeof myBalance === 'number' ? (
              <>
                {' '}Your balance <span className="num">{formatMoney(myBalance)}</span>.
              </>
            ) : null}
          </span>
        </div>

        {hints.length > 0 ? (
          <div className="ovl-hints">
            {hints.map((hint, index) => (
              <p key={index} className={`ovl-hint ovl-hint-${hint.tone}`}>
                {hint.color ? <span className="swatch" style={{ background: hint.color }} aria-hidden="true" /> : null}
                <span>{hint.text}</span>
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

/* ============================================================
   3. Auction modal
   ============================================================ */

/**
 * Whaleopoly's auction is a single-bidder buy-in: no other player can bid
 * against you, so the modal shows what actually happens — name a price at
 * or above the list price and the tile is yours. There is deliberately no
 * high-bid block, no bidder list and no countdown, because none of those
 * exist in the game.
 */
export type AuctionModalProps = {
  open: boolean
  propertyName: string
  /** Colour-group bar above the title. */
  groupColor?: string
  /** List price of the tile — the minimum you can bid. */
  startingPrice: number
  /** Controlled amount for the bid input. */
  value: number
  onChange: (next: number) => void
  onBid: () => void
  onPass: () => void
  onClose: () => void
  /** Bidder's balance — caps the bid. */
  maxBid?: number
  submitting?: boolean
}

const BID_STEPS = [10, 50, 100]

export function AuctionModal({
  open,
  propertyName,
  groupColor,
  startingPrice,
  value,
  onChange,
  onBid,
  onPass,
  onClose,
  maxBid,
  submitting = false,
}: AuctionModalProps) {
  const overBalance = typeof maxBid === 'number' && value > maxBid
  const belowStart = value < startingPrice
  const canBid = value > 0 && !overBalance && !belowStart && !submitting

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={propertyName}
      tag="Auction"
      tagTone="gold"
      tone="gold"
      size="md"
      subtitle={
        <>
          Nobody is bidding against you. Name any price from{' '}
          <span className="num">{formatMoney(startingPrice)}</span> upwards and the property is yours.
        </>
      }
      actions={
        <>
          <button type="button" className="btn btn-ghost" onClick={onPass}>
            Pass
          </button>
          <button
            type="button"
            className={submitting ? 'btn btn-primary is-loading' : 'btn btn-primary'}
            onClick={onBid}
            disabled={!canBid}
          >
            Place bid
          </button>
        </>
      }
      actionsNote={
        overBalance ? (
          <span className="field-error">That is more than your balance.</span>
        ) : belowStart ? (
          <span className="field-error">
            The opening bid is <span className="num">{formatMoney(startingPrice)}</span>.
          </span>
        ) : typeof maxBid === 'number' ? (
          <span className="meta">
            Your balance <span className="num">{formatMoney(maxBid)}</span>
          </span>
        ) : null
      }
    >
      <div className="ovl-auction-bar" style={{ background: groupColor ?? 'var(--accent)' }} aria-hidden="true" />

      <div className="ovl-auction-open">
        <span className="ovl-trade-eyebrow">Opening bid</span>
        <div className="ovl-auction-amount num">{formatMoney(startingPrice)}</div>
        <span className="meta">The listed price of this property</span>
      </div>

      <div className="ovl-auction-grid">
        <div className="field ovl-auction-field">
          <span className="field-label">Your bid</span>
          <input
            className="input input-num"
            type="number"
            min={0}
            step={10}
            inputMode="numeric"
            value={Number.isFinite(value) ? value : 0}
            onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
            aria-label="Your bid in game dollars"
            aria-invalid={overBalance || belowStart}
          />
          <div className="field-row ovl-auction-steps">
            {BID_STEPS.map((step) => (
              <button
                key={step}
                type="button"
                className="btn btn-outline btn-sm num"
                onClick={() => onChange(Math.max(0, (value || 0) + step))}
              >
                +${step}
              </button>
            ))}
          </div>
          <span className="field-hint">Bids are in game dollars, never ETH.</span>
        </div>
      </div>
    </Modal>
  )
}

/* ============================================================
   4. Victory modal
   ============================================================ */

export type FinalStanding = {
  id: string
  name: string
  color: string
  /** Number of properties held at the end. */
  properties: number
  /** Final balance in game dollars. */
  balance: number
  /** Marks a player who went bankrupt before the end. */
  bankrupt?: boolean
}

export type VictoryModalProps = {
  open: boolean
  winner: { id: string; name: string; color: string }
  /** Winner's final balance in game dollars. */
  finalBalance: number
  /** Every player, in finishing order (winner first). */
  standings: FinalStanding[]
  /** Table pot, pre-formatted WITH its unit, e.g. "4 ETH". */
  pot?: string
  /** Payout transaction hash, when one exists. Links to Sepolia Starkscan. */
  txHash?: string | null
  /**
   * Optional. Omit it when the contract already settles the pot on game end
   * (Whaleopoly does) — the modal then shows "New game" as its single action
   * rather than advertising a claim step that does not exist.
   */
  onClaim?: () => void
  onNewGame: () => void
  onClose: () => void
  claiming?: boolean
  /** Set once the pot has been claimed — disables the primary action. */
  claimed?: boolean
}

export function VictoryModal({
  open,
  winner,
  finalBalance,
  standings,
  pot,
  txHash,
  onClaim,
  onNewGame,
  onClose,
  claiming = false,
  claimed = false,
}: VictoryModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Victory"
      tag="Table complete"
      tagTone="gold"
      tone="gold"
      size="md"
      center
      hideTitle
      actions={
        onClaim ? (
          <>
            <button type="button" className="btn btn-outline" onClick={onNewGame}>
              New game
            </button>
            <button
              type="button"
              className={claiming ? 'btn btn-primary is-loading' : 'btn btn-primary'}
              onClick={onClaim}
              disabled={claiming || claimed}
            >
              {claimed ? 'Winnings claimed' : 'Claim winnings'}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onNewGame}>
            New game
          </button>
        )
      }
      actionsNote={
        pot ? (
          <span className="meta">
            Pot <span className="num bright">{pot}</span> · Starknet Sepolia
          </span>
        ) : null
      }
    >
      <div className="ovl-victory">
        <div className="ovl-victory-mark">
          <LogoMark size={44} title="Whaleopoly" />
        </div>
        <div className="ovl-victory-title">Victory</div>
        <div className="ovl-victory-winner" style={{ color: winner.color }}>
          {winner.name}
        </div>
        <div className="ovl-victory-balance">
          <span className="ovl-trade-eyebrow">Final balance</span>
          <span className="num ovl-victory-amount">{formatMoney(finalBalance)}</span>
        </div>

        {txHash ? (
          <a className="ovl-txlink" href={`${STARKSCAN_TX}${txHash}`} target="_blank" rel="noopener noreferrer">
            <span className="num mono">{truncateHash(txHash)}</span>
            <IconExternal />
            <span className="sr-only">View the payout transaction on Sepolia Starkscan</span>
          </a>
        ) : null}
      </div>

      <div className="ovl-standings">
        <div className="ovl-standings-head">
          <span className="ovl-trade-eyebrow">Final standings</span>
        </div>
        <table className="ovl-table">
          <thead>
            <tr>
              <th scope="col" className="ovl-col-rank">
                #
              </th>
              <th scope="col">Player</th>
              <th scope="col" className="ovl-col-num">
                Properties
              </th>
              <th scope="col" className="ovl-col-num">
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, index) => (
              <tr key={row.id} className={row.id === winner.id ? 'is-winner' : undefined}>
                <td className="ovl-col-rank num">{index + 1}</td>
                <td>
                  <span className="ovl-standing-player">
                    <span className="ovl-bid-dot" style={{ background: row.color }} aria-hidden="true" />
                    <span className="truncate">{row.name}</span>
                    {row.bankrupt ? <span className="chip chip-sm chip-danger">Bankrupt</span> : null}
                  </span>
                </td>
                <td className="ovl-col-num num">{row.properties}</td>
                <td className="ovl-col-num num">{formatMoney(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

/* ============================================================
   5. Bankruptcy modal
   ============================================================ */

export type BankruptcyModalProps = {
  open: boolean
  /** The player who is out. */
  player: { name: string; color: string }
  /** The debt they could not pay, in game dollars. */
  debt: number
  /** Who took over their properties. Omit or null when the Bank did. */
  creditor?: { name: string; color: string } | null
  /** How many properties changed hands. */
  propertiesTransferred?: number
  onContinue: () => void
  onClose: () => void
}

export function BankruptcyModal({
  open,
  player,
  debt,
  creditor,
  propertiesTransferred,
  onContinue,
  onClose,
}: BankruptcyModalProps) {
  const receiver = creditor ? creditor.name : 'the Bank'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bankrupt"
      tag="Player eliminated"
      tagTone="danger"
      tone="danger"
      size="sm"
      center
      actions={
        <button type="button" className="btn btn-primary" onClick={onContinue}>
          Continue
        </button>
      }
    >
      <div className="ovl-bankrupt">
        <div className="ovl-bankrupt-icon">
          <IconAlert />
        </div>
        <p className="ovl-bankrupt-lead">
          <span className="ovl-player-name" style={{ color: player.color }}>
            {player.name}
          </span>{' '}
          cannot cover this debt and is out of the game.
        </p>

        <div className="kv ovl-bankrupt-kv">
          <div className="kv-row">
            <span className="kv-key">Unpaid debt</span>
            <span className="kv-val num ovl-bankrupt-debt">{formatMoney(debt)}</span>
          </div>
          <div className="kv-row">
            <span className="kv-key">Properties go to</span>
            <span className="kv-val">
              {creditor ? (
                <span className="ovl-player-name" style={{ color: creditor.color }}>
                  {creditor.name}
                </span>
              ) : (
                'the Bank'
              )}
            </span>
          </div>
          {typeof propertiesTransferred === 'number' ? (
            <div className="kv-row">
              <span className="kv-key">Properties transferred</span>
              <span className="kv-val num">{propertiesTransferred}</span>
            </div>
          ) : null}
        </div>

        <p className="meta ovl-bankrupt-note">
          Their houses are cleared and every property they held now belongs to {receiver}. Play continues with the
          remaining players.
        </p>
      </div>
    </Modal>
  )
}
