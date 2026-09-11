/**
 * Whaleopoly brand marks — Abyssal Protocol.
 *
 * <Logo />     full lockup: whale emblem + WHALE/OPOLY wordmark (+ ONCHAIN tag)
 * <LogoMark /> the whale emblem on its own, tightly cropped
 *
 * Both are pure inline SVG so they stay crisp at any size. The wordmark uses
 * Outfit, which is already loaded by the global stylesheet; the lockup viewBox
 * carries slack so a fallback face cannot clip the wordmark.
 */

/* Emblem bounding box inside the shared 0 0 50 36 drawing space. */
const MARK_VIEWBOX = '2.4 6.4 47.2 23'
const MARK_W = 47.2
const MARK_H = 23

const LOCKUP_W = 204
const LOCKUP_H = 36

/** Whale emblem: cyan body, brighter fluke stroke, targeting ring, depth contour. */
function WhaleEmblem() {
  return (
    <g>
      {/* body */}
      <path
        d="M4.4 18C4.4 12.4 10.8 8.4 18.6 8.4c8.4 0 16 3.8 19.3 9.4.5.8.5 1.6.1 2.4-3.2 5.2-10.8 7.2-18.8 7.2C10.8 27.4 4.4 23.6 4.4 18Z"
        fill="#0ea5e9"
        fillOpacity="0.9"
      />
      {/* tail flukes */}
      <path
        d="M37.8 19c2.8-4 5.8-6.6 8.4-7.8-.8 3-1.6 5.4-3 7.4 1.6 1 2.8 2.6 3.4 4.4-3.4-.4-6.4-1.8-8.8-3.6"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* depth contour across the body */}
      <path
        d="M7.2 21.8c6.4 3.6 19 4 28.4-.4"
        fill="none"
        stroke="#040a15"
        strokeOpacity="0.5"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* targeting ring */}
      <circle
        cx="12.6"
        cy="16.4"
        r="7"
        fill="none"
        stroke="#0ea5e9"
        strokeWidth="1"
        strokeDasharray="2.6 2.6"
      />
      {/* eye */}
      <circle cx="12.6" cy="16.4" r="1.7" fill="#f0f9ff" />
    </g>
  )
}

export type LogoProps = {
  /** Rendered height in px. Designed to stay crisp from 24 to 48. */
  size?: number
  /** Show the small teal ONCHAIN tag under the wordmark. */
  showTag?: boolean
  className?: string
  title?: string
}

export function Logo({ size = 32, showTag = true, className, title = 'Whaleopoly' }: LogoProps) {
  const width = Math.round((size * LOCKUP_W) / LOCKUP_H)

  return (
    <svg
      className={className}
      width={width}
      height={size}
      viewBox={`0 0 ${LOCKUP_W} ${LOCKUP_H}`}
      fill="none"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <WhaleEmblem />
      <text
        x="56"
        y={showTag ? 20 : 23.5}
        fontFamily="Outfit, ui-sans-serif, system-ui, sans-serif"
        fontSize="16"
        fontWeight="700"
        letterSpacing="1.5"
        fill="#f0f9ff"
      >
        WHALE
        <tspan fill="#0ea5e9">OPOLY</tspan>
      </text>
      {showTag && (
        <text
          x="57"
          y="31"
          fontFamily="Outfit, ui-sans-serif, system-ui, sans-serif"
          fontSize="7"
          fontWeight="600"
          letterSpacing="1.6"
          fill="#14b8a6"
        >
          ONCHAIN
        </text>
      )}
    </svg>
  )
}

export type LogoMarkProps = {
  /** Rendered height in px. */
  size?: number
  className?: string
  title?: string
}

export function LogoMark({ size = 28, className, title = 'Whaleopoly' }: LogoMarkProps) {
  const width = Math.round((size * MARK_W) / MARK_H)

  return (
    <svg
      className={className}
      width={width}
      height={size}
      viewBox={MARK_VIEWBOX}
      fill="none"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <WhaleEmblem />
    </svg>
  )
}

export default Logo
