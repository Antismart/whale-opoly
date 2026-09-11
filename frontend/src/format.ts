/* ============================================================
   Shared value formatting.

   CURRENCY RULE — everything on the board is GAME DOLLARS.
   ETH appears only on the table entry stake and the pot, and
   those two strings are always built where the stake is known
   and passed downstream pre-formatted. Nothing in this file
   ever prints ETH.
   ============================================================ */

/** Game dollars, rounded, thousands separated: 3000 -> "$3,000", -77.0001 -> "-$77". */
export function money(value: number): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '$0'
  const abs = Math.round(Math.abs(n)).toLocaleString('en-US')
  return (n < 0 ? '-$' : '$') + abs
}

/** Game dollars with an explicit sign: 75 -> "+$75", -50 -> "-$50". */
export function signedMoney(value: number): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '+$0'
  const abs = Math.round(Math.abs(n)).toLocaleString('en-US')
  return (n < 0 ? '-$' : '+$') + abs
}
