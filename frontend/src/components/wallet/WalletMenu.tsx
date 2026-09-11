/**
 * ABYSSAL PROTOCOL — wallet control.
 *
 * Drop-in replacement for <WalletButton />. It reads the same useWallet()
 * hook (unchanged) and only restyles/restructures the surface:
 *
 *   disconnected · one connector  → primary "Connect wallet" button, connects directly
 *   disconnected · many connectors → picker panel of connector cards
 *   connected                      → compact address button + account menu
 *
 * The menu closes on outside click and on Escape. Presentation only.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useWallet } from '../../useWallet'
import './wallet.css'

/* ============================================================
   Icons — inline SVG only, no remote wallet artwork
   ============================================================ */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const WalletGlyph = (
  <svg width={16} height={16} viewBox="0 0 24 24" {...stroke} aria-hidden>
    <path d="M3.5 8.2A2.2 2.2 0 0 1 5.7 6h11.1a2.2 2.2 0 0 1 2.2 2.2v8.6a2.2 2.2 0 0 1-2.2 2.2H5.7a2.2 2.2 0 0 1-2.2-2.2Z" />
    <path d="M15.4 11.6h3.6a1.4 1.4 0 0 1 0 2.8h-3.6a1.4 1.4 0 0 1 0-2.8Z" />
  </svg>
)

const CaretGlyph = (
  <svg width={12} height={12} viewBox="0 0 24 24" {...stroke} aria-hidden>
    <path d="m6 9.5 6 6 6-6" />
  </svg>
)

const CopyGlyph = (
  <svg width={14} height={14} viewBox="0 0 24 24" {...stroke} aria-hidden>
    <rect x="9" y="9" width="11" height="11" rx="2.2" />
    <path d="M15 6.2V5.4A1.4 1.4 0 0 0 13.6 4H5.4A1.4 1.4 0 0 0 4 5.4v8.2A1.4 1.4 0 0 0 5.4 15h.8" />
  </svg>
)

const CheckGlyph = (
  <svg width={14} height={14} viewBox="0 0 24 24" {...stroke} aria-hidden>
    <path d="m5 12.6 4.4 4.4L19 7.4" />
  </svg>
)

const PowerGlyph = (
  <svg width={14} height={14} viewBox="0 0 24 24" {...stroke} aria-hidden>
    <path d="M12 4.5v7" />
    <path d="M17.2 7a7 7 0 1 1-10.4 0" />
  </svg>
)

/* Abstract connector marks — deliberately generic geometry, not brand logos. */
const ControllerMark = (
  <svg width={18} height={18} viewBox="0 0 24 24" {...stroke} aria-hidden>
    <rect x="3" y="7" width="18" height="10" rx="3.2" />
    <path d="M7.4 10.6v2.8M6 12h2.8" />
    <circle cx="16.4" cy="11.2" r="1" fill="currentColor" stroke="none" />
    <circle cx="18" cy="13.4" r="1" fill="currentColor" stroke="none" />
  </svg>
)

const ShieldMark = (
  <svg width={18} height={18} viewBox="0 0 24 24" {...stroke} aria-hidden>
    <path d="M12 3.4 19 6v6c0 4-3 7-7 8.6C8 19 5 16 5 12V6Z" />
    <path d="m9.2 12 2 2 3.6-4" />
  </svg>
)

const HexMark = (
  <svg width={18} height={18} viewBox="0 0 24 24" {...stroke} aria-hidden>
    <path d="m12 3.4 7.4 4.3v8.6L12 20.6 4.6 16.3V7.7Z" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
)

const GenericMark = (
  <svg width={18} height={18} viewBox="0 0 24 24" {...stroke} aria-hidden>
    <rect x="4" y="6.5" width="16" height="11" rx="2.6" />
    <path d="M4 10.2h16" />
  </svg>
)

/* ============================================================
   Connector metadata
   ============================================================ */

type ConnectorMeta = {
  label: string
  description: string
  mark: ReactNode
  /** window key that proves the extension is installed, if any. */
  injectedKey?: string
}

const CONNECTOR_META: Record<string, ConnectorMeta> = {
  controller: {
    label: 'Cartridge Controller',
    description: 'Play with a session key. No browser extension needed.',
    mark: ControllerMark,
  },
  argentX: {
    label: 'Argent X',
    description: 'Starknet browser extension wallet.',
    mark: ShieldMark,
    injectedKey: 'starknet_argentX',
  },
  argentMobile: {
    label: 'Argent Mobile',
    description: 'Scan a code to connect the mobile app.',
    mark: ShieldMark,
  },
  braavos: {
    label: 'Braavos',
    description: 'Starknet smart-account browser extension.',
    mark: HexMark,
    injectedKey: 'starknet_braavos',
  },
}

function metaFor(id: string, name: string): ConnectorMeta {
  const direct = CONNECTOR_META[id]
  if (direct) return direct

  const key = `${id} ${name}`.toLowerCase()
  if (key.includes('controller') || key.includes('cartridge')) return CONNECTOR_META.controller
  if (key.includes('braavos')) return CONNECTOR_META.braavos
  if (key.includes('argent')) return CONNECTOR_META.argentX

  return {
    label: name || id,
    description: 'Starknet wallet.',
    mark: GenericMark,
    injectedKey: `starknet_${id}`,
  }
}

function isInjected(meta: ConnectorMeta): boolean {
  if (!meta.injectedKey) return false
  if (typeof window === 'undefined') return false
  return Boolean((window as unknown as Record<string, unknown>)[meta.injectedKey])
}

/* ============================================================
   Helpers
   ============================================================ */

function truncateAddress(addr: string, lead = 6, tail = 4): string {
  if (addr.length <= lead + tail + 1) return addr
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
    const field = document.createElement('textarea')
    field.value = value
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(field)
    return ok
  } catch {
    return false
  }
}

/* ============================================================
   Component
   ============================================================ */

export type WalletMenuProps = {
  /** Network shown in the account menu. Default 'Starknet Sepolia'. */
  networkLabel?: string
  /** Fired after the full address is copied — wire to a success toast. */
  onCopyAddress?: (address: string) => void
  /** Fired after the wallet is disconnected. */
  onDisconnect?: () => void
  className?: string
}

export function WalletMenu({
  networkLabel = 'Starknet Sepolia',
  onCopyAddress,
  onDisconnect,
  className,
}: WalletMenuProps) {
  const { address, isConnected, isConnecting, connectWallet, disconnect, connectors } = useWallet()

  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const popId = useId()

  /* Outside click + Escape */
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  /* Close the picker as soon as a connection lands */
  useEffect(() => {
    if (isConnected) setOpen(false)
  }, [isConnected])

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current)
  }, [])

  const handleCopy = useCallback(async () => {
    if (!address) return
    const ok = await copyText(address)
    if (!ok) return
    setCopied(true)
    onCopyAddress?.(address)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 2000)
  }, [address, onCopyAddress])

  const handleDisconnect = useCallback(() => {
    disconnect()
    setOpen(false)
    onDisconnect?.()
  }, [disconnect, onDisconnect])

  /* ---------- Connected ---------- */
  if (isConnected && address) {
    return (
      <div className={className ? `ap-wallet ${className}` : 'ap-wallet'} ref={rootRef}>
        <button
          ref={triggerRef}
          type="button"
          className="ap-wallet-trigger"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={open ? popId : undefined}
        >
          <span className="ap-wallet-glyph">{WalletGlyph}</span>
          <span className="ap-wallet-addr num">{truncateAddress(address)}</span>
          <span className="ap-wallet-caret">{CaretGlyph}</span>
        </button>

        {open ? (
          <div className="ap-wallet-pop ap-wallet-pop-wide" id={popId} role="menu">
            <div className="ap-wallet-pop-head">
              <span className="ap-wallet-pop-title">Wallet</span>
              <span className="ap-wallet-pop-sub">Connected</span>
            </div>

            <div className="ap-wallet-account">
              <span className="ap-wallet-account-label">Address</span>
              <div className="ap-wallet-account-row">
                <span className="ap-wallet-full">{address}</span>
                <button
                  type="button"
                  className={copied ? 'ap-wallet-copy is-done' : 'ap-wallet-copy'}
                  onClick={handleCopy}
                  aria-label={copied ? 'Address copied' : 'Copy full address'}
                >
                  {copied ? CheckGlyph : CopyGlyph}
                </button>
              </div>
            </div>

            <div className="ap-wallet-net">
              <span className="ap-wallet-net-dot status-dot" aria-hidden />
              Network
              <span className="ap-wallet-net-name" style={{ marginLeft: 'auto' }}>
                {networkLabel}
              </span>
            </div>

            <div className="ap-wallet-sep" role="separator" />

            <button
              type="button"
              className="ap-wallet-disconnect"
              onClick={handleDisconnect}
              role="menuitem"
            >
              {PowerGlyph}
              Disconnect
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  /* ---------- Disconnected ---------- */
  const single = connectors.length === 1

  const handleConnectClick = () => {
    if (single) {
      void connectWallet(connectors[0].id)
      return
    }
    setOpen(v => !v)
  }

  return (
    <div className={className ? `ap-wallet ${className}` : 'ap-wallet'} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={isConnecting ? 'btn btn-primary is-loading' : 'btn btn-primary'}
        onClick={handleConnectClick}
        disabled={isConnecting || connectors.length === 0}
        aria-expanded={single ? undefined : open}
        aria-haspopup={single ? undefined : 'menu'}
        aria-controls={!single && open ? popId : undefined}
      >
        {WalletGlyph}
        {isConnecting ? 'Connecting…' : 'Connect wallet'}
      </button>

      {open && !single ? (
        <div className="ap-wallet-pop ap-wallet-pop-wide" id={popId} role="menu">
          <div className="ap-wallet-pop-head">
            <span className="ap-wallet-pop-title">Choose a wallet</span>
            <span className="ap-wallet-pop-sub">Sepolia testnet</span>
          </div>

          {connectors.length === 0 ? (
            <p className="ap-wallet-empty">
              No Starknet wallet found in this browser. Install one, then reload the page.
            </p>
          ) : (
            <div className="ap-wallet-list">
              {connectors.map(connector => {
                const meta = metaFor(connector.id, connector.name)
                const detected = isInjected(meta)
                return (
                  <button
                    key={connector.id}
                    type="button"
                    className="ap-connector"
                    onClick={() => {
                      void connectWallet(connector.id)
                      setOpen(false)
                    }}
                    disabled={isConnecting}
                    role="menuitem"
                  >
                    <span className="ap-connector-mark">{meta.mark}</span>
                    <span className="ap-connector-text">
                      <span className="ap-connector-name">{meta.label}</span>
                      <span className="ap-connector-desc">{meta.description}</span>
                    </span>
                    {detected ? (
                      <span className="chip chip-sm chip-teal">
                        <span className="status-dot" aria-hidden />
                        Detected
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default WalletMenu
