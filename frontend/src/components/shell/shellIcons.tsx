/**
 * 16px line icons for the app shell nav, plus the 18px top-bar icons.
 * All strokes use currentColor so they inherit nav item state.
 * Kept in their own module so AppShell.tsx only exports components.
 */

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const ShellIcons = {
  /** Play — the game table */
  play: (
    <svg {...base}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="9" cy="9" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  /** Lobby — seats at a table */
  lobby: (
    <svg {...base}>
      <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
      <circle cx="10" cy="8" r="3.2" />
      <path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.4 5.2a3.2 3.2 0 0 1 0 5.6" />
    </svg>
  ),
  /** Harbor — anchor */
  harbor: (
    <svg {...base}>
      <circle cx="12" cy="5" r="2.2" />
      <path d="M12 7.2V21" />
      <path d="M8 11h8" />
      <path d="M4.5 14a7.5 7.5 0 0 0 15 0" />
    </svg>
  ),
  /** Manual — rulebook */
  manual: (
    <svg {...base}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5Z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5" />
      <path d="M8 7.5h7M8 11h5" />
    </svg>
  ),
  /** Top bar — rulebook */
  rulebook: (
    <svg {...base} width={18} height={18}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5Z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5" />
    </svg>
  ),
  /** Top bar — enter fullscreen */
  fullscreen: (
    <svg {...base} width={18} height={18}>
      <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
    </svg>
  ),
  /** Top bar — exit fullscreen */
  fullscreenExit: (
    <svg {...base} width={18} height={18}>
      <path d="M9 4v3.5A1.5 1.5 0 0 1 7.5 9H4M20 9h-3.5A1.5 1.5 0 0 1 15 7.5V4M15 20v-3.5a1.5 1.5 0 0 1 1.5-1.5H20M4 15h3.5A1.5 1.5 0 0 1 9 16.5V20" />
    </svg>
  ),
}
