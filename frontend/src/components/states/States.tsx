/**
 * ABYSSAL PROTOCOL — edge states, toast stack and the mobile gate.
 *
 *   <ToastStack />        bottom-right notification stack (success / error / info / loading)
 *   <EmptyState />        reusable centred state: mark, title, one-line body, actions
 *   <WalletDisconnected/> "Connect a Starknet wallet to play"
 *   <NoActiveGame />      "No table in play" → Go to Lobby
 *   <BoardSkeleton />     shimmering placeholder of the play screen
 *   <MobileGate />        full-screen state below 1024px (CSS media query, no JS listeners)
 *
 * Presentation only — no game rules, no chain calls. Every colour comes from
 * styles/tokens.css; the reusable classes come from styles/primitives.css.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { LogoMark } from '../brand/Logo'
import './states.css'

/* ============================================================
   Icons — inline SVG, 1.6 stroke, inherit currentColor
   ============================================================ */

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const CheckIcon = (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.2 2.4 2.4 4.6-5" />
  </svg>
)

const AlertIcon = (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.6v5" />
    <path d="M12 16.2h.01" />
  </svg>
)

const InfoIcon = (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.4" />
    <path d="M12 7.8h.01" />
  </svg>
)

const CloseIcon = (
  <svg {...iconProps} width={14} height={14}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

const ExternalIcon = (
  <svg {...iconProps} width={11} height={11}>
    <path d="M14 4h6v6" />
    <path d="M20 4 10.5 13.5" />
    <path d="M18.5 14.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5h4.5" />
  </svg>
)

const PlugIcon = (
  <svg {...iconProps} width={28} height={28}>
    <path d="M9 3v5" />
    <path d="M15 3v5" />
    <path d="M6 8h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8Z" />
    <path d="M12 17v4" />
  </svg>
)

const TableIcon = (
  <svg {...iconProps} width={28} height={28}>
    <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="3" />
    <path d="M3.2 8.6h17.6M3.2 15.4h17.6M8.6 3.2v17.6M15.4 3.2v17.6" />
  </svg>
)

const CopyIcon = (
  <svg {...iconProps}>
    <rect x="9" y="9" width="11" height="11" rx="2.2" />
    <path d="M15 6.2V5.4A1.4 1.4 0 0 0 13.6 4H5.4A1.4 1.4 0 0 0 4 5.4v8.2A1.4 1.4 0 0 0 5.4 15h.8" />
  </svg>
)

/* ============================================================
   A. Toast stack
   ============================================================ */

export type ToastKind = 'success' | 'error' | 'info' | 'loading'

/**
 * Shape accepted by <ToastStack />. `Toast` from src/useToast.ts is
 * assignable to this — the extra fields are optional enrichment.
 */
export type ToastStackItem = {
  id: number
  kind: ToastKind
  message: string
  /** Starknet transaction hash — rendered truncated, links to Sepolia Starkscan. */
  txHash?: string
  /** Auto-dismiss duration in ms driving the progress hairline. 0 hides it. */
  duration?: number
}

export type ToastStackProps = {
  toasts: ToastStackItem[]
  /** Called by the dismiss button — pass `removeToast` from useToast(). */
  onDismiss: (id: number) => void
  /** How many toasts render at once; the rest collapse into a counter. Default 4. */
  maxVisible?: number
  /** Explorer transaction base, Sepolia by default. */
  explorerTxBase?: string
  className?: string
}

/** Matches the timings baked into useToast(): errors linger, loading persists. */
const DEFAULT_TOAST_MS: Record<ToastKind, number> = {
  success: 4000,
  info: 4000,
  error: 6000,
  loading: 0,
}

const TOAST_LABEL: Record<ToastKind, string> = {
  success: 'Success',
  error: 'Error',
  info: 'Notice',
  loading: 'In progress',
}

function toastIcon(kind: ToastKind): ReactNode {
  if (kind === 'success') return CheckIcon
  if (kind === 'error') return AlertIcon
  if (kind === 'loading') return <span className="ap-toast-spinner" />
  return InfoIcon
}

function truncateHash(hash: string, lead = 6, tail = 4): string {
  if (hash.length <= lead + tail + 1) return hash
  return `${hash.slice(0, lead)}…${hash.slice(-tail)}`
}

export function ToastStack({
  toasts,
  onDismiss,
  maxVisible = 4,
  explorerTxBase = 'https://sepolia.starkscan.co/tx/',
  className,
}: ToastStackProps) {
  if (toasts.length === 0) return null

  const visible = toasts.slice(-maxVisible)
  const hidden = toasts.length - visible.length

  return (
    <div
      className={className ? `ap-toasts ${className}` : 'ap-toasts'}
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {hidden > 0 ? (
        <span className="chip chip-sm ap-toasts-overflow">+{hidden} earlier</span>
      ) : null}

      {visible.map(toast => {
        const ms = toast.duration ?? DEFAULT_TOAST_MS[toast.kind]
        return (
          <div key={toast.id} className={`ap-toast ap-toast-${toast.kind}`}>
            <span className="ap-toast-icon">{toastIcon(toast.kind)}</span>

            <div className="ap-toast-body">
              <span className="sr-only">{TOAST_LABEL[toast.kind]}: </span>
              <p className="ap-toast-message">{toast.message}</p>
              {toast.txHash ? (
                <a
                  className="chip chip-xs ap-toast-tx"
                  href={`${explorerTxBase}${toast.txHash}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={toast.txHash}
                >
                  <span className="num">{truncateHash(toast.txHash)}</span>
                  {ExternalIcon}
                  <span className="sr-only">View transaction on Starkscan (Sepolia)</span>
                </a>
              ) : null}
            </div>

            <button
              type="button"
              className="ap-toast-close"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              {CloseIcon}
            </button>

            {ms > 0 ? (
              <span
                className="ap-toast-progress"
                style={{ animationDuration: `${ms}ms` } as CSSProperties}
                aria-hidden
              />
            ) : null}
          </div>
        )
      })}

    </div>
  )
}

/* ============================================================
   C. Empty state
   ============================================================ */

export type EmptyStateProps = {
  /** Mark or icon shown above the title. Defaults to the whale mark. */
  icon?: ReactNode
  title: string
  /** One line of explanation. */
  body: string
  primaryLabel?: string
  onPrimary?: () => void
  primaryDisabled?: boolean
  primaryLoading?: boolean
  secondaryLabel?: string
  onSecondary?: () => void
  secondaryDisabled?: boolean
  /** Replaces the primary button entirely (e.g. drop <WalletMenu /> in here). */
  action?: ReactNode
  /** Chips or fine print rendered under the actions. */
  extra?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  body,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  primaryLoading = false,
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
  action,
  extra,
  className,
}: EmptyStateProps) {
  const hasActions = Boolean(action) || Boolean(primaryLabel) || Boolean(secondaryLabel)

  return (
    <div className={className ? `ap-empty ${className}` : 'ap-empty'}>
      <div className="ap-empty-mark" aria-hidden>
        {icon ?? <LogoMark size={28} />}
      </div>
      <h2 className="ap-empty-title">{title}</h2>
      <p className="ap-empty-body">{body}</p>

      {hasActions ? (
        <div className="ap-empty-actions">
          {action ??
            (primaryLabel ? (
              <button
                type="button"
                className={primaryLoading ? 'btn btn-primary is-loading' : 'btn btn-primary'}
                onClick={onPrimary}
                disabled={primaryDisabled || primaryLoading}
              >
                {primaryLabel}
              </button>
            ) : null)}
          {secondaryLabel ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onSecondary}
              disabled={secondaryDisabled}
            >
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      {extra ? <div className="ap-empty-extra">{extra}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------
   Wallet disconnected
   ------------------------------------------------------------ */

export type WalletDisconnectedProps = {
  /** Opens the connect flow. Ignored when `action` is supplied. */
  onConnect?: () => void
  isConnecting?: boolean
  /** Render <WalletMenu /> here instead of the built-in button. */
  action?: ReactNode
  /** Optional secondary route, e.g. straight to the rulebook. */
  secondaryLabel?: string
  onSecondary?: () => void
  className?: string
}

export function WalletDisconnected({
  onConnect,
  isConnecting = false,
  action,
  secondaryLabel,
  onSecondary,
  className,
}: WalletDisconnectedProps) {
  return (
    <EmptyState
      className={className}
      icon={PlugIcon}
      title="Connect a Starknet wallet to play"
      body="Whaleopoly runs on the Starknet Sepolia testnet. Connect a wallet to take a seat at a table, roll and buy property."
      action={action}
      primaryLabel={action ? undefined : 'Connect wallet'}
      onPrimary={onConnect}
      primaryLoading={isConnecting}
      secondaryLabel={secondaryLabel}
      onSecondary={onSecondary}
      extra={
        <span className="chip chip-sm chip-accent">
          <span className="status-dot" aria-hidden />
          Starknet Sepolia testnet
        </span>
      }
    />
  )
}

/* ------------------------------------------------------------
   No active game
   ------------------------------------------------------------ */

export type NoActiveGameProps = {
  onGoToLobby?: () => void
  /** Optional override for the one-line body. */
  body?: string
  secondaryLabel?: string
  onSecondary?: () => void
  className?: string
}

export function NoActiveGame({
  onGoToLobby,
  body = 'You are not seated at a table yet. Create one or join an open table in the lobby to start playing.',
  secondaryLabel,
  onSecondary,
  className,
}: NoActiveGameProps) {
  return (
    <EmptyState
      className={className}
      icon={TableIcon}
      title="No table in play"
      body={body}
      primaryLabel="Go to Lobby"
      onPrimary={onGoToLobby}
      secondaryLabel={secondaryLabel}
      onSecondary={onSecondary}
      extra={<span className="chip chip-sm">2–6 players per table</span>}
    />
  )
}

/* ------------------------------------------------------------
   Board skeleton
   ------------------------------------------------------------ */

export type BoardSkeletonProps = {
  /** Quiet status line under the board. */
  statusText?: string
  /** Render the right-hand rail placeholders. Default true. */
  showRail?: boolean
  className?: string
}

/** Perimeter cell coordinates for an 11 x 11 board, tile 0 at bottom-right. */
function perimeterCells(): { row: number; col: number; corner: boolean }[] {
  const cells: { row: number; col: number; corner: boolean }[] = []
  cells.push({ row: 11, col: 11, corner: true })
  for (let c = 10; c >= 2; c--) cells.push({ row: 11, col: c, corner: false })
  cells.push({ row: 11, col: 1, corner: true })
  for (let r = 10; r >= 2; r--) cells.push({ row: r, col: 1, corner: false })
  cells.push({ row: 1, col: 1, corner: true })
  for (let c = 2; c <= 10; c++) cells.push({ row: 1, col: c, corner: false })
  cells.push({ row: 1, col: 11, corner: true })
  for (let r = 2; r <= 10; r++) cells.push({ row: r, col: 11, corner: false })
  return cells
}

const BOARD_CELLS = perimeterCells()

export function BoardSkeleton({
  statusText = 'Syncing table state…',
  showRail = true,
  className,
}: BoardSkeletonProps) {
  return (
    <div
      className={className ? `ap-board-skeleton ${className}` : 'ap-board-skeleton'}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="ap-skel-stage">
        <div className="ap-skel-board" aria-hidden>
          {BOARD_CELLS.map((cell, i) => (
            <span
              key={i}
              className={
                cell.corner
                  ? 'skeleton ap-skel-tile ap-skel-corner'
                  : 'skeleton ap-skel-tile'
              }
              style={{ gridRow: cell.row, gridColumn: cell.col }}
            />
          ))}
          <div className="ap-skel-face">
            <span className="skeleton skeleton-line ap-skel-face-line" />
            <span className="skeleton skeleton-line ap-skel-face-line-sm" />
          </div>
        </div>

        <div className="ap-skel-status">
          <span>{statusText}</span>
        </div>
        <div className="ap-skel-sliver" aria-hidden />
      </div>

      {showRail ? (
        <div className="ap-skel-rail" aria-hidden>
          <div className="panel ap-skel-panel">
            <div className="ap-skel-panel-head">
              <span className="skeleton skeleton-line" style={{ width: 96 }} />
              <span className="skeleton skeleton-line" style={{ width: 44 }} />
            </div>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="ap-skel-row">
                <span className="skeleton skeleton-circle ap-skel-swatch" />
                <span className="skeleton skeleton-line" style={{ width: `${74 - i * 9}%` }} />
                <span className="skeleton skeleton-line" style={{ width: 46 }} />
              </div>
            ))}
          </div>

          <div className="panel ap-skel-panel">
            <div className="ap-skel-panel-head">
              <span className="skeleton skeleton-line" style={{ width: 84 }} />
            </div>
            <span className="skeleton skeleton-block" />
            <span className="skeleton skeleton-line" style={{ width: '58%' }} />
          </div>

          <div className="panel ap-skel-panel">
            <div className="ap-skel-panel-head">
              <span className="skeleton skeleton-line" style={{ width: 72 }} />
            </div>
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="skeleton skeleton-line"
                style={{ width: `${88 - i * 14}%` }}
              />
            ))}
          </div>
        </div>
      ) : null}

      <span className="sr-only">{statusText}</span>
    </div>
  )
}

/* ============================================================
   D. Mobile gate
   ============================================================ */

export type MobileGateProps = {
  /** Minimum supported viewport width, quoted in the chip. Default 1024. */
  minWidth?: number
  className?: string
}

/* ------------------------------------------------------------------
   Service banner — states plainly when live data cannot be trusted
   ------------------------------------------------------------------ */

export type ServiceBannerProps = {
  tone?: 'warn' | 'danger'
  title: string
  detail: string
  actionLabel?: string
  onAction?: () => void
  busy?: boolean
  className?: string
}

/**
 * A quiet, persistent strip for conditions the player cannot fix but must
 * understand — chiefly an unreachable indexer, where every list in the app
 * would otherwise render a confident and false "nothing here yet".
 */
export function ServiceBanner({
  tone = 'warn',
  title,
  detail,
  actionLabel,
  onAction,
  busy = false,
  className,
}: ServiceBannerProps) {
  return (
    <div className={['ap-banner', `ap-banner-${tone}`, className].filter(Boolean).join(' ')} role="status">
      <span className="ap-banner-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 5.2v3.4" strokeLinecap="round" />
          <circle cx="8" cy="11.2" r="0.75" fill="currentColor" stroke="none" />
          <path d="M6.9 2.4 1.6 12a1.2 1.2 0 0 0 1.1 1.8h10.6a1.2 1.2 0 0 0 1.1-1.8L9.1 2.4a1.2 1.2 0 0 0-2.2 0Z" strokeLinejoin="round" />
        </svg>
      </span>
      <div className="ap-banner-body">
        <span className="ap-banner-title">{title}</span>
        <span className="ap-banner-detail">{detail}</span>
      </div>
      {actionLabel && onAction ? (
        <button type="button" className="btn btn-outline btn-sm" onClick={onAction} disabled={busy}>
          {busy ? 'Checking…' : actionLabel}
        </button>
      ) : null}
    </div>
  )
}

export function MobileGate({ minWidth = 1024, className }: MobileGateProps) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const copyLink = useCallback(async () => {
    const href = window.location.href
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(href)
      } else {
        const field = document.createElement('textarea')
        field.value = href
        field.setAttribute('readonly', '')
        field.style.position = 'fixed'
        field.style.opacity = '0'
        document.body.appendChild(field)
        field.select()
        document.execCommand('copy')
        document.body.removeChild(field)
      }
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2400)
    } catch {
      setCopied(false)
    }
  }, [])

  return (
    <div
      className={className ? `ap-mobile-gate ${className}` : 'ap-mobile-gate'}
      role="dialog"
      aria-modal="true"
      aria-label="Desktop required"
    >
      <div className="ap-mgate-card">
        <div className="ap-mgate-mark">
          <span className="ap-mgate-ring" aria-hidden />
          <LogoMark size={40} />
        </div>

        <h1 className="ap-mgate-title">Whaleopoly is built for the deep</h1>
        <p className="ap-mgate-text">
          The game table needs a desktop screen — open this link on a laptop or desktop to take
          a seat.
        </p>

        <span className="chip chip-sm chip-accent">
          Minimum width <span className="num">{minWidth}px</span>
        </span>

        <div className="ap-mgate-actions">
          <button type="button" className="btn btn-outline" onClick={copyLink}>
            {CopyIcon}
            Copy link
          </button>
          <span
            className={copied ? 'ap-mgate-confirm is-shown' : 'ap-mgate-confirm'}
            role="status"
            aria-live="polite"
          >
            {copied ? 'Link copied to clipboard' : ''}
          </span>
        </div>

        <p className="ap-mgate-foot">Starknet Sepolia testnet</p>
      </div>
    </div>
  )
}

export default EmptyState
