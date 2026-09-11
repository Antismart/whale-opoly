/* Turns a raw Starknet / Cartridge Controller failure into something a player
   can act on.

   The wallet's own errors are written for wallet engineers — a player who sees
   "AVNU sponsorship failed: JSON-RPC error 163 (UNKNOWN_ERROR)" learns nothing
   and cannot tell whether the fault is theirs, ours, or the network's. Each
   branch below names the cause AND the next move. */

function textOf(error: unknown): string {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (error instanceof Error) return `${error.name}: ${error.message}`
  if (typeof error === 'object') {
    const maybe = error as { message?: unknown; error?: unknown; data?: unknown }
    const parts = [maybe.message, maybe.error, maybe.data].filter(
      (part): part is string => typeof part === 'string',
    )
    if (parts.length) return parts.join(' ')
    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }
  return String(error)
}

/**
 * A short, player-facing reason for a failed transaction.
 *
 * @param error    whatever was thrown
 * @param fallback what to say when the cause is not one we recognise
 */
export function txErrorReason(error: unknown, fallback: string): string {
  const raw = textOf(error)
  const text = raw.toLowerCase()

  // The player backed out at the wallet prompt. Not a failure worth alarm.
  if (
    text.includes('user rejected') ||
    text.includes('user abort') ||
    text.includes('rejected the request') ||
    text.includes('canceled') ||
    text.includes('cancelled')
  ) {
    return 'You cancelled the transaction'
  }

  // Cartridge executes session transactions "from outside" and has a paymaster
  // sponsor the gas. When that sponsor is down, nothing reaches the chain —
  // and it is not something the player can fix by trying harder.
  if (
    text.includes('sponsorship') ||
    text.includes('avnu') ||
    text.includes('paymaster') ||
    text.includes('service not available')
  ) {
    return 'Gas sponsorship is unavailable — the wallet could not cover this transaction. Try again shortly.'
  }

  if (text.includes('insufficient') || text.includes('exceeds balance') || text.includes('u256_sub')) {
    return 'Not enough ETH on Sepolia to cover the entry stake and gas'
  }

  // The session key expired or the action is outside the approved policy list.
  if (text.includes('session') || text.includes('not authorized') || text.includes('policy')) {
    return 'Your wallet session expired — reconnect and try again'
  }

  if (text.includes('chain') && (text.includes('mismatch') || text.includes('invalid'))) {
    return 'Your wallet is on the wrong network — switch it to Starknet Sepolia'
  }

  if (text.includes('failed to fetch') || text.includes('network') || text.includes('timeout')) {
    return 'Could not reach Starknet — check your connection and try again'
  }

  // Contract-level revert: surface the reason the contract itself gave.
  const revert = raw.match(/Failure reason:?\s*(?:0x[0-9a-f]+\s*\(')?([^'"\n)]{3,80})/i)
  if (revert) return `The game contract rejected this: ${revert[1].trim()}`

  return fallback
}
