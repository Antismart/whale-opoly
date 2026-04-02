import { useState } from 'react'
import type { Lobby } from '../types'
import { BoardIcon } from './Icons'

export function OnboardPanel({ lobbies, onCreate, onJoin, onStart, actionLoading }:{ lobbies: Lobby[]; onCreate: (maxPlayers: number, host: string, entryEth: string)=>Promise<void>; onJoin: (gameId: number, username: string)=>Promise<void>; onStart?: (gameId: number)=>Promise<void>; actionLoading?: string | null }) {
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [username, setUsername] = useState('')
  const [entryEth, setEntryEth] = useState('0.10')
  return (
    <section className="panel">
      <div className="panelTitle">
        <span className="icon" aria-hidden>{BoardIcon}</span>
    Create or join a lobby
      </div>
      <div className="onboardActions">
        <label className="field">
          <span>Your username</span>
          <input type="text" placeholder="e.g. WhaleLord" value={username} onChange={(e)=>setUsername(e.target.value)} />
        </label>
        <label className="field">
          <span>Entry amount (ETH)</span>
          <input type="number" min={0} step={0.01} value={entryEth} onChange={(e)=>setEntryEth(e.target.value)} />
        </label>
        <label className="field">
      <span>Max players</span>
          <input type="number" min={2} max={6} value={maxPlayers} onChange={(e)=>setMaxPlayers(Math.max(2, Math.min(6, Number(e.target.value)||4)))} />
        </label>
        <button className="btn glow" disabled={!username || Number(entryEth)<=0} onClick={()=>onCreate(maxPlayers, username.trim(), entryEth)}>Create lobby</button>
      </div>
      <div className="panelTitle" style={{marginTop:16}}>Open lobbies</div>
      <div className="lobbies">
        {lobbies.length===0 && <div className="muted">No open lobbies yet.</div>}
        {lobbies.map(l => (
          <div key={l.gameId} className="lobbyRow">
            <div className="lobbyMain">
              <div className="lobbyTitle">Game #{l.gameId}</div>
              <div className="lobbyMeta">
                <span className="chip">{l.players}/{l.maxPlayers} players</span>
                <span className="chip">entry {l.entryEth} ETH</span>
                <span className="chip">host {l.host}</span>
              </div>
            </div>
            <div className="lobbyActions">
              <button className="btn outline" disabled={!username} onClick={()=>onJoin(l.gameId, username.trim())}>Join</button>
              {l.players >= 2 && onStart && (
                <button className="btn glow" disabled={actionLoading === 'starting'} onClick={()=>onStart(l.gameId)}>
                  {actionLoading === 'starting' ? 'Starting...' : 'Start'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
