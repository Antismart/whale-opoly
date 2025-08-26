import { TORII_URL } from './config'

export type ToriiHealth = { status: string }

export async function getToriiHealth(signal?: AbortSignal): Promise<ToriiHealth> {
  const res = await fetch(`${TORII_URL}/health`, { signal })
  if (!res.ok) throw new Error(`Torii health failed: ${res.status}`)
  return res.json()
}
