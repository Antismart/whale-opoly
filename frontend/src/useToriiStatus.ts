import { useCallback, useEffect, useRef, useState } from 'react'
import { TORII_URL } from './config'

/* The Dojo SDK's `useEntityQuery` returns void — when the indexer is down it
   logs to the console and the store simply stays empty. The UI then renders
   "No open tables yet", which is a claim the app is in no position to make:
   it cannot tell an empty world from an unreachable one. This probes the
   indexer directly so the difference can be stated honestly. */

export type ToriiStatus =
  /** Not determined yet, or the browser blocked the probe — claim nothing. */
  | 'unknown'
  /** Indexer answered. Entity queries can be trusted. */
  | 'ok'
  /** Indexer answered 404/410 — the deployment is gone, not merely asleep. */
  | 'gone'
  /** Indexer answered with a server error. Probably temporary. */
  | 'error'

const PROBE_MS = 30_000

export function useToriiStatus() {
  const [status, setStatus] = useState<ToriiStatus>('unknown')
  const [checking, setChecking] = useState(false)
  const cancelled = useRef(false)

  const probe = useCallback(async () => {
    setChecking(true)
    try {
      const response = await fetch(TORII_URL, { method: 'GET', mode: 'cors' })
      if (cancelled.current) return
      if (response.status === 404 || response.status === 410) setStatus('gone')
      else if (response.status >= 500) setStatus('error')
      else setStatus('ok')
    } catch {
      /* A rejected fetch cannot be told apart from a CORS refusal, so this is
         explicitly NOT treated as "down" — a false alarm is worse than none. */
      if (!cancelled.current) setStatus('unknown')
    } finally {
      if (!cancelled.current) setChecking(false)
    }
  }, [])

  useEffect(() => {
    cancelled.current = false
    void probe()
    const id = setInterval(() => void probe(), PROBE_MS)
    return () => {
      cancelled.current = true
      clearInterval(id)
    }
  }, [probe])

  return { status, checking, recheck: probe }
}
