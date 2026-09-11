import type { ReactNode } from 'react'
import '../../styles/tokens.css'
import '../../styles/primitives.css'
import './shell.css'
import { Logo } from '../brand/Logo'
import { ShellIcons } from './shellIcons'

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

export type NavItem = {
  /** Stable id passed back to onNavigate. */
  id: string
  label: string
  /** 16px inline SVG — use ShellIcons.play / .lobby / .harbor / .manual */
  icon?: ReactNode
  /** Right-side count badge. A number renders inside .count-badge. */
  badge?: ReactNode
  disabled?: boolean
}

/** Sidebar "Active table" card. Entry and pot are ETH; nothing else is. */
export type ActiveTable = {
  /** Table id, e.g. 42 or "#42" */
  tableId: string | number
  seatsFilled: number
  seatsTotal: number
  /** Tier name: Bronze | Silver | Gold | Platinum */
  tier: string
  /** Entry stake, pre-formatted with unit, e.g. "1 ETH" */
  entry: string
  /** Pot, pre-formatted with unit, e.g. "4 ETH" */
  pot: string
}

export type AppShellProps = {
  /** Id of the active nav item; also the breadcrumb section label. */
  section: string
  navItems: NavItem[]
  onNavigate: (id: string) => void
  /** Wallet connect/disconnect control, rendered in the top bar. */
  walletSlot?: ReactNode
  /** Optional extra control under the sidebar's active-table card. */
  sidebarFooterSlot?: ReactNode
  /** Renders the active-table card only when non-null. */
  activeTable?: ActiveTable | null
  /** Second breadcrumb segment, shown in cyan (e.g. the table name). */
  breadcrumbExtra?: ReactNode
  onOpenRulebook?: () => void
  onToggleFullscreen?: () => void
  isFullscreen?: boolean
  /** Network label next to the pulsing dot. Sepolia testnet only. */
  networkLabel?: string
  /** Overrides the default centered footer line. */
  footer?: ReactNode
  children?: ReactNode
}

/* ------------------------------------------------------------------
   AppShell — pure presentation, holds no state.
   ------------------------------------------------------------------ */

export function AppShell({
  section,
  navItems,
  onNavigate,
  walletSlot,
  sidebarFooterSlot,
  activeTable = null,
  breadcrumbExtra,
  onOpenRulebook,
  onToggleFullscreen,
  isFullscreen = false,
  networkLabel = 'Starknet Sepolia',
  footer,
  children,
}: AppShellProps) {
  const current = navItems.find(item => item.id === section)
  const sectionLabel = current ? current.label : section

  return (
    <div className="shell">
      <aside className="shell-side">
        <div className="shell-brand">
          <div className="shell-brand-lockup">
            <Logo size={30} />
          </div>
          <span className="chip chip-sm shell-net">
            <span className="status-dot status-dot-pulse" />
            {networkLabel}
          </span>
        </div>

        <nav className="shell-nav" aria-label="Sections">
          <div className="shell-nav-heading">Navigate</div>
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              className={`shell-nav-item${item.id === section ? ' is-active' : ''}`}
              aria-current={item.id === section ? 'page' : undefined}
              disabled={item.disabled}
              onClick={() => onNavigate(item.id)}
            >
              {item.icon ? <span className="shell-nav-icon">{item.icon}</span> : null}
              <span className="shell-nav-text">{item.label}</span>
              {item.badge !== undefined && item.badge !== null ? (
                <span className="shell-nav-badge">
                  {typeof item.badge === 'number' ? (
                    <span className="count-badge">{item.badge}</span>
                  ) : (
                    item.badge
                  )}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="shell-side-foot">
          {activeTable ? (
            <div className="shell-table-card">
              <div className="shell-table-head">
                <span className="shell-table-eyebrow">Active table</span>
                <span className="chip chip-sm chip-accent">{activeTable.tier}</span>
              </div>
              <div className="shell-table-id">
                {typeof activeTable.tableId === 'number' ? `#${activeTable.tableId}` : activeTable.tableId}
              </div>
              <div className="shell-table-grid">
                <div className="shell-table-cell">
                  <span className="shell-table-key">Seats</span>
                  <span className="shell-table-val">
                    {activeTable.seatsFilled}/{activeTable.seatsTotal}
                  </span>
                </div>
                <div className="shell-table-cell">
                  <span className="shell-table-key">Entry</span>
                  <span className="shell-table-val">{activeTable.entry}</span>
                </div>
                <div className="shell-table-cell">
                  <span className="shell-table-key">Pot</span>
                  <span className="shell-table-val shell-table-val-pot">{activeTable.pot}</span>
                </div>
              </div>
            </div>
          ) : null}

          {sidebarFooterSlot ? <div className="shell-wallet-slot">{sidebarFooterSlot}</div> : null}
        </div>
      </aside>

      <div className="shell-main">
        <header className="shell-topbar">
          <div className="shell-crumbs">
            <span className="shell-crumb">{sectionLabel}</span>
            {breadcrumbExtra ? (
              <>
                <span className="shell-crumb-sep">/</span>
                <span className="shell-crumb-extra">{breadcrumbExtra}</span>
              </>
            ) : null}
          </div>

          <div className="shell-topbar-right">
            {walletSlot}
            {walletSlot && (onOpenRulebook || onToggleFullscreen) ? (
              <span className="shell-topbar-divider" />
            ) : null}
            {onOpenRulebook ? (
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={onOpenRulebook}
                title="Rulebook"
                aria-label="Open the rulebook"
              >
                {ShellIcons.rulebook}
              </button>
            ) : null}
            {onToggleFullscreen ? (
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                aria-pressed={isFullscreen}
              >
                {isFullscreen ? ShellIcons.fullscreenExit : ShellIcons.fullscreen}
              </button>
            ) : null}
          </div>
        </header>

        <main className="shell-content">
          <div className="shell-content-inner">{children}</div>
          <div className="shell-footer">
            {footer ?? 'Whaleopoly — Starknet Sepolia testnet. Entry stakes and the pot are in ETH; balances, rent and property prices are in game dollars.'}
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppShell
