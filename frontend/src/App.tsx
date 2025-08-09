import { useState } from 'react'
import './App.css'

type Player = { id: string; name: string; color: string }

type GameState = {
  players: Player[]
  positions: Record<string, number>
  balances: Record<string, number>
  ownership: Record<number, string | undefined>
  houses: Record<number, number>
  currentIdx: number
}

// New: Onboarding/Lobby types and game tiers (mirror of contract tiers)
type Lobby = { gameId: number; tier: 'Bronze'|'Silver'|'Gold'|'Platinum'; maxPlayers: number; players: number }
const TIERS: { id: Lobby['tier']; feeEth: string; feeWei: string; starting: number; requires: 'Basic'|'Verified'|'Premium'; desc: string }[] = [
  { id: 'Bronze',   feeEth: '0.01', feeWei: '10000000000000000',    starting: 1500000, requires: 'Basic',   desc: 'Entry tier. Open to all.' },
  { id: 'Silver',   feeEth: '0.1',  feeWei: '100000000000000000',   starting: 1500000, requires: 'Verified', desc: 'Mid tier. Requires verification > Basic.' },
  { id: 'Gold',     feeEth: '1',    feeWei: '1000000000000000000',  starting: 1500000, requires: 'Premium', desc: 'High tier. Premium verification.' },
  { id: 'Platinum', feeEth: '10',   feeWei: '10000000000000000000', starting: 1500000, requires: 'Premium', desc: 'Elite tier. Premium verification.' },
]

// --- Card system types ---
type CardAction =
  | { kind: 'money'; amount: number }
  | { kind: 'move'; to: number; passGo?: boolean }
  | { kind: 'move_rel'; delta: number }
  | { kind: 'goto_jail' }
  | { kind: 'jail_pass' }
  | { kind: 'collect_each'; amount: number }
  | { kind: 'pay_each'; amount: number }
  | { kind: 'nearest_rail' }
  | { kind: 'nearest_utility' }
  | { kind: 'repair'; perHouse: number; perHotel: number }

type Card = { id: string; deck: 'chance'|'chest'; title: string; text: string; action: CardAction; keep?: boolean }

// Utility
function shuffle<T>(arr: T[]): T[] { return [...arr].sort(()=>Math.random()-0.5) }

function App() {
  // --- Core state ---
  const [section, setSection] = useState<'onboard'|'dashboard'|'play'|'treasury'|'events'>('onboard')
  const [game, setGame] = useState<GameState>({
    players: [
      { id: 'P1', name: 'Blue', color: '#4da3ff' },
      { id: 'P2', name: 'Red', color: '#ff6b6b' },
      { id: 'P3', name: 'Green', color: '#3ecf8e' },
      { id: 'P4', name: 'Yellow', color: '#ffd166' },
    ],
    positions: { P1: 0, P2: 0, P3: 0, P4: 0 },
    balances: { P1: 1500, P2: 1500, P3: 1500, P4: 1500 },
    ownership: {},
    houses: {},
    currentIdx: 0,
  })
  const [selected, setSelected] = useState(0)
  const [d1, setD1] = useState(1)
  const [d2, setD2] = useState(1)
  const [rolling, setRolling] = useState(false)
  const [feed, setFeed] = useState<{kind:'good'|'warn'|'info'; title:string; body:string; time:string}[]>([])
  const [mortgages, setMortgages] = useState<Record<number, boolean>>({})
  const [inJail, setInJail] = useState<Record<string, number>>({})
  const [bankHouses] = useState(32) // (not yet enforced)
  const [bankHotels] = useState(12)
  const [lastRoll, setLastRoll] = useState(0)
  const [lobbies, setLobbies] = useState<Lobby[]>([
    { gameId: 1001, tier: 'Bronze', maxPlayers: 4, players: 1 },
    { gameId: 1002, tier: 'Silver', maxPlayers: 6, players: 2 },
  ])
  const [openCard, setOpenCard] = useState<Card | undefined>()
  const [chanceDeck, setChanceDeck] = useState<Card[]>(() => shuffle([
    { id:'c1', deck:'chance', title:'Advance to Start', text:'Collect $200', action:{ kind:'move', to:0, passGo:true } },
    { id:'c2', deck:'chance', title:'Bank error', text:'Collect $75', action:{ kind:'money', amount:75 } },
    { id:'c3', deck:'chance', title:'Pay fine', text:'Pay $50', action:{ kind:'money', amount:-50 } },
    { id:'c4', deck:'chance', title:'Speeding fine', text:'Pay $15', action:{ kind:'money', amount:-15 } },
    { id:'c5', deck:'chance', title:'Go to Jail', text:'Go directly to Jail', action:{ kind:'goto_jail' } },
    { id:'c6', deck:'chance', title:'Get Out of Jail Free', text:'Keep until needed', action:{ kind:'jail_pass' }, keep:true },
    { id:'c7', deck:'chance', title:'Advance 3', text:'Move forward 3 tiles', action:{ kind:'move_rel', delta:3 } },
    { id:'c8', deck:'chance', title:'Go Back 2', text:'Move back 2 tiles', action:{ kind:'move_rel', delta:-2 } },
    { id:'c9', deck:'chance', title:'Nearest Rail', text:'Advance to nearest rail & pay rent', action:{ kind:'nearest_rail' } },
    { id:'c10', deck:'chance', title:'Nearest Utility', text:'Advance to nearest utility', action:{ kind:'nearest_utility' } },
    { id:'c11', deck:'chance', title:'Repairs', text:'Pay $25 per house / $100 per hotel', action:{ kind:'repair', perHouse:25, perHotel:100 } },
    { id:'c12', deck:'chance', title:'Collect from each', text:'Collect $10 from each player', action:{ kind:'collect_each', amount:10 } },
  ]))
  const [chestDeck, setChestDeck] = useState<Card[]>(() => shuffle([
    { id:'h1', deck:'chest', title:'Consulting fee', text:'Collect $25', action:{ kind:'money', amount:25 } },
    { id:'h2', deck:'chest', title:'Doctor fee', text:'Pay $50', action:{ kind:'money', amount:-50 } },
    { id:'h3', deck:'chest', title:'Tax refund', text:'Collect $20', action:{ kind:'money', amount:20 } },
    { id:'h4', deck:'chest', title:'Get Out of Jail Free', text:'Keep until needed', action:{ kind:'jail_pass' }, keep:true },
    { id:'h5', deck:'chest', title:'Advance to Start', text:'Collect $200', action:{ kind:'move', to:0, passGo:true } },
    { id:'h6', deck:'chest', title:'Birthday', text:'Collect $10 from each player', action:{ kind:'collect_each', amount:10 } },
    { id:'h7', deck:'chest', title:'School fees', text:'Pay $50', action:{ kind:'money', amount:-50 } },
    { id:'h8', deck:'chest', title:'Hospital fees', text:'Pay $100', action:{ kind:'money', amount:-100 } },
    { id:'h9', deck:'chest', title:'You inherit', text:'Collect $100', action:{ kind:'money', amount:100 } },
    { id:'h10', deck:'chest', title:'Charity donation', text:'Pay $20', action:{ kind:'money', amount:-20 } },
    { id:'h11', deck:'chest', title:'Repair assets', text:'Pay $40 per house / $115 per hotel', action:{ kind:'repair', perHouse:40, perHotel:115 } },
    { id:'h12', deck:'chest', title:'Move forward 1', text:'Advance 1 tile', action:{ kind:'move_rel', delta:1 } },
  ]))
  const [jailPasses, setJailPasses] = useState<Record<string, number>>({})

  // Prices
  const price: Record<number, number> = { 1:60,3:60,6:100,8:100,9:120,11:140,13:140,14:160,16:180,18:180,19:200,21:220,23:220,24:240,26:260,27:260,29:280,31:300,32:300,34:320,37:350,39:400, 5:200,15:200,25:200,35:200, 12:150,28:150 }
  const houseCost: Record<number, number> = { 1:50,3:50,6:50,8:50,9:50,11:100,13:100,14:100,16:100,18:100,19:100,21:150,23:150,24:150,26:150,27:150,29:150,31:200,32:200,34:200,37:200,39:200 }

  function now(){ return new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) }
  function log(kind:'good'|'warn'|'info', title:string, body:string){ setFeed(f=>[{kind,title,body,time:now()},...f].slice(0,25)) }

  const groups: Record<string, number[]> = { lightblue:[1,3], green:[6,8,9], purple:[11,13,14], orange:[16,18,19], teal:[21,23,24], salmon:[26,27,29], blue:[31,32,34], darkblue:[37,39] }
  function groupFor(id:number){ return Object.keys(groups).find(k=>groups[k].includes(id)) }
  function ownsGroup(pid:string, id:number){ const g=groupFor(id); if(!g) return false; return groups[g].every(tid=>game.ownership[tid]===pid) }

  // Card draw
  function drawCard(deck:'chance'|'chest') {
    if (openCard) return
    if (deck==='chance') setChanceDeck(d=>{ const [card,...rest]=d; setOpenCard(card); return rest.length?[...rest, card.keep?card:card]:[card] })
    else setChestDeck(d=>{ const [card,...rest]=d; setOpenCard(card); return rest.length?[...rest, card.keep?card:card]:[card] })
  }
  function nearest(id:number, list:number[]){ for(let i=1;i<=40;i++){ const t=(id+i)%40; if(list.includes(t)) return t } return id }

  function applyCard(card: Card){
    const cur = game.players[game.currentIdx]; if(!cur) return; const pid = cur.id
    const action = card.action
    switch(action.kind){
      case 'money': { const amt=action.amount; setGame(g=>({...g, balances:{...g.balances,[pid]:(g.balances[pid]||0)+amt}})); log(amt>=0?'good':'warn', card.title, `${amt>=0?'+':'-'}$${Math.abs(amt)}`); break }
      case 'move': { const from=game.positions[pid]; const passGo=action.passGo && (from>action.to); setGame(g=>({...g, positions:{...g.positions,[pid]:action.to}, balances: passGo?{...g.balances,[pid]:g.balances[pid]+200}:g.balances})); setSelected(action.to); if(passGo) log('good','Passed Start','+$200'); log('info',card.title,card.text); break }
      case 'move_rel': { const from=game.positions[pid]; const to=(from+action.delta+40)%40; setGame(g=>({...g, positions:{...g.positions,[pid]:to}})); setSelected(to); log('info',card.title,card.text); break }
      case 'goto_jail': { setGame(g=>({...g, positions:{...g.positions,[pid]:10}})); setInJail(j=>({...j,[pid]:3})); setSelected(10); log('warn','Jail','3 turns or pay $50'); break }
      case 'jail_pass': { setJailPasses(p=>({...p,[pid]:(p[pid]||0)+1})); log('good','Jail Pass acquired','Stored until needed'); break }
      case 'collect_each': { setGame(g=>{ let delta=0; const up={...g.balances}; g.players.forEach(pl=>{ if(pl.id!==pid){ up[pl.id]-=action.amount; delta+=action.amount } }); up[pid]+=delta; return {...g, balances:up} }); log('good',card.title,`+$${action.amount} from each`); break }
      case 'pay_each': { setGame(g=>{ let cost=0; g.players.forEach(pl=>{ if(pl.id!==pid) cost+=action.amount }); return {...g, balances:{...g.balances,[pid]:g.balances[pid]-cost}} }); log('warn',card.title,`-$${action.amount} to each`); break }
      case 'nearest_rail': { const to=nearest(game.positions[pid],[5,15,25,35]); setGame(g=>({...g, positions:{...g.positions,[pid]:to}})); setSelected(to); log('info',card.title,`Moved to Rail ${to}`); break }
      case 'nearest_utility': { const to=nearest(game.positions[pid],[12,28]); setGame(g=>({...g, positions:{...g.positions,[pid]:to}})); setSelected(to); log('info',card.title,`Moved to Utility ${to}`); break }
      case 'repair': { const housesCount=Object.entries(game.houses).reduce((a,[,c])=>a+(c&&c<5?c:0),0); const hotelsCount=Object.entries(game.houses).reduce((a,[,c])=>a+(c===5?1:0),0); const cost=housesCount*action.perHouse+hotelsCount*action.perHotel; if(cost>0) setGame(g=>({...g, balances:{...g.balances,[pid]:g.balances[pid]-cost}})); log('warn',card.title,`-$${cost}`); break }
    }
    if(!card.keep) setOpenCard(undefined)
  }
  function useJailPass(){ const cur=game.players[game.currentIdx]; if(!cur) return; if((inJail[cur.id]||0)===0) return; if((jailPasses[cur.id]||0)<=0) return; setJailPasses(p=>({...p,[cur.id]:p[cur.id]-1})); setInJail(j=>({...j,[cur.id]:0})); log('good','Jail Pass used','Freed from Jail') }

  function moveAndResolve(steps:number){
    const cur=game.players[game.currentIdx]; if((inJail[cur.id]||0)>0){ log('warn',`${cur.name} is in Jail`,'Pay bail or use pass'); return }
    const from=game.positions[cur.id]; const to=(from+steps)%40; const passGo=from+steps>=40
    setGame(g=>({...g, positions:{...g.positions,[cur.id]:to}, balances: passGo?{...g.balances,[cur.id]:g.balances[cur.id]+200}:g.balances }))
    if(passGo) log('good',`${cur.name} passed Start`,'+$200')
    setSelected(to)
    const tile=monoTiles[to]; if(!tile) return
    if(tile.kind==='chance'){ drawCard('chance'); return }
    if(tile.kind==='chest'){ drawCard('chest'); return }
    if(tile.kind==='tax'){ setGame(g=>({...g, balances:{...g.balances,[cur.id]:g.balances[cur.id]-100}})); log('warn',`${cur.name} paid Tax`,'-$100'); return }
    if(tile.kind==='gotojail'){ setGame(g=>({...g, positions:{...g.positions,[cur.id]:10}})); setInJail(j=>({...j,[cur.id]:3})); setSelected(10); log('warn',`${cur.name} went to Jail`,'3 turns or $50'); return }
    if(['property','rail','utility'].includes(tile.kind)){
      const owner=game.ownership[to]; if(owner && owner!==cur.id && !mortgages[to]){
        let rent=Math.max(10,Math.floor((price[to]||100)*0.1)) + (game.houses[to]||0)*10
        if([5,15,25,35].includes(to)){ const count=[5,15,25,35].filter(r=>game.ownership[r]===owner).length; rent=[0,25,50,100,200][count] }
        if([12,28].includes(to)){ const count=[12,28].filter(u=>game.ownership[u]===owner).length; rent=(count===2?10:4)*Math.max(2,lastRoll||7) }
        setGame(g=>({...g, balances:{...g.balances, [cur.id]:g.balances[cur.id]-rent, [owner]:(g.balances[owner]||0)+rent }}))
        log('info',`${cur.name} paid rent`, `-$${rent} to ${owner}`)
      }
    }
  }
  function rollDice(){ if(rolling||openCard) return; setRolling(true); const r1=1+Math.floor(Math.random()*6); const r2=1+Math.floor(Math.random()*6); setTimeout(()=>{ setD1(r1); setD2(r2); setLastRoll(r1+r2); setRolling(false); moveAndResolve(r1+r2) },420) }
  function buyProperty(id:number){ const t=monoTiles[id]; if(!t) return; if(!['property','rail','utility'].includes(t.kind)) return; const cur=game.players[game.currentIdx]; if(game.ownership[id]) return log('warn','Owned already',''); const cost=price[id]||0; if(game.balances[cur.id]<cost) return log('warn','Need funds',`$${cost}`); setGame(g=>({...g, ownership:{...g.ownership,[id]:cur.id}, balances:{...g.balances,[cur.id]:g.balances[cur.id]-cost}})); log('good','Bought',`${t.label} $${cost}`) }
  function buildHouse(id:number){ const t=monoTiles[id]; if(!t||t.kind!=='property') return; const cur=game.players[game.currentIdx]; if(game.ownership[id]!==cur.id) return log('warn','Not owner',''); if(!ownsGroup(cur.id,id)) return log('warn','Need set',''); const current=game.houses[id]||0; if(current>=5) return log('warn','Max built',''); const cost=current===4?houseCost[id]*2:houseCost[id]; if(game.balances[cur.id]<cost) return log('warn','Need funds',`$${cost}`); setGame(g=>({...g, houses:{...g.houses,[id]:current+1}, balances:{...g.balances,[cur.id]:g.balances[cur.id]-cost}})); log('good', current===4?'Hotel built':'House built', `-$${cost}`) }
  function mortgageProperty(id:number){ if(mortgages[id]) return log('warn','Already mortgaged',''); const cur=game.players[game.currentIdx]; if(game.ownership[id]!==cur.id) return log('warn','Not owner',''); const val=Math.floor((price[id]||0)/2); setMortgages(m=>({...m,[id]:true})); setGame(g=>({...g, balances:{...g.balances,[cur.id]:g.balances[cur.id]+val}})); log('info','Mortgaged',`+$${val}`) }
  function unmortgageProperty(id:number){ if(!mortgages[id]) return; const cur=game.players[game.currentIdx]; const val=Math.floor((price[id]||0)/2)*1.1; if(game.balances[cur.id]<val) return log('warn','Need funds',`$${val}`); setMortgages(m=>{const n={...m}; delete n[id]; return n}); setGame(g=>({...g, balances:{...g.balances,[cur.id]:g.balances[cur.id]-val}})); log('info','Unmortgaged',`-$${val}`) }
  function payBail(){ const cur=game.players[game.currentIdx]; if((inJail[cur.id]||0)===0) return; if(game.balances[cur.id]<50) return log('warn','Need $50',''); setGame(g=>({...g, balances:{...g.balances,[cur.id]:g.balances[cur.id]-50}})); setInJail(j=>({...j,[cur.id]:0})); log('good','Bail paid','Freed') }
  function endTurn(){ if(openCard) return log('warn','Resolve card','Apply first'); setGame(g=>({...g, currentIdx:(g.currentIdx+1)%g.players.length })); setInJail(j=>{ const n={...j}; Object.keys(n).forEach(k=>{ if(n[k]>0) n[k]-=1 }); return n }) }

  // Derived
  const curPlayer = game.players[game.currentIdx]
  const tile = monoTiles[selected]
  const owner = game.ownership[selected]
  const canBuy = tile && ['property','rail','utility'].includes(tile.kind) && !owner
  const canBuild = tile && tile.kind==='property' && owner===curPlayer.id && ownsGroup(curPlayer.id, selected)
  const canDrawCard = tile && ['chance','chest'].includes(tile.kind) && !openCard
  const hasJailPass = (jailPasses[curPlayer.id]||0)>0
  const isMortgaged = !!mortgages[selected]

  // --- JSX --- (retain existing UI below; only modify onDraw + card modal className)
  return (
    <div className="app">
      <aside className="sideNav">
        <div className="brand">
          <img className="brand-logo" src="/whaleopoly.png" alt="Whaleopoly logo" />
          <div className="brand-text">
            <h2>Whaleopoly</h2>
            <p>On‑chain strategy</p>
          </div>
        </div>
        <nav className="navList">
          <button className={`navItem ${section==='onboard'?'active':''}`} onClick={()=>setSection('onboard')}>
            <span className="icon" aria-hidden>{DiceIcon}</span>
            <span>Onboard</span>
          </button>
          <button className={`navItem ${section==='dashboard'?'active':''}`} onClick={()=>setSection('dashboard')}>
            <span className="icon" aria-hidden>{DiceIcon}</span>
            <span>Dashboard</span>
          </button>
          <button className={`navItem ${section==='play'?'active':''}`} onClick={()=>setSection('play')}>
            <span className="icon" aria-hidden>{BoardIcon}</span>
            <span>Play</span>
          </button>
          <button className={`navItem ${section==='treasury'?'active':''}`} onClick={()=>setSection('treasury')}>
            <span className="icon" aria-hidden>{TreasuryIcon}</span>
            <span>Treasury</span>
          </button>
          <button className={`navItem ${section==='events'?'active':''}`} onClick={()=>setSection('events')}>
            <span className="icon" aria-hidden>{EventIcon}</span>
            <span>Events</span>
          </button>
        </nav>
        <div className="sideFooter">
          <div className="chip">v0.1 • devnet</div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="crumbs">
            <span className="crumb">{section}</span>
          </div>
          <div className="actions">
            <button className="btn ghost">Docs</button>
            <button className="btn glow">Connect Wallet</button>
          </div>
        </header>

        {section==='onboard' && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <h1>
                  Stake, Join, Conquer
                  <span className="sparkle"/>
                </h1>
                <p>Select a game tier, stake the entry fee, and enter a lobby. Funds are pooled into the Treasury Hot Wallet; winners are paid per Game Manager rules.</p>
                <div className="cta">
                  <button className="btn glow" onClick={()=>{ /* focus tiers */ }}>Choose a tier</button>
                  <button className="btn outline" onClick={()=>setSection('play')}>Preview board</button>
                </div>
              </div>
              <div className="hero-cards">
                <div className="statCard">
                  <div className="statLabel">Max players</div>
                  <div className="statValue">6</div>
                </div>
                <div className="statCard">
                  <div className="statLabel">Min players</div>
                  <div className="statValue">2</div>
                </div>
                <div className="statCard">
                  <div className="statLabel">Verification</div>
                  <div className="statValue">Tier‑based</div>
                </div>
                <div className="statCard">
                  <div className="statLabel">Start delay</div>
                  <div className="statValue">30s</div>
                </div>
              </div>
            </section>

            <OnboardPanel
              lobbies={lobbies}
              onCreate={(tier,max)=>{
                const id = Date.now()%100000
                setLobbies(prev=>[{ gameId:id, tier, maxPlayers:max, players:1 }, ...prev])
                log('good','Lobby created', `${tier} • max ${max} players • game_id ${id}`)
                // Ref: IGameManager.create_game(tier, max_players) -> emits GameCreated, pools entry_fee
              }}
              onJoin={(gameId,tier)=>{
                // Ref: IGameManager.join_game(game_id) -> validates verification + stakes entry_fee -> PlayerJoined
                log('good','Staked & joined', `${tier} • game_id ${gameId} (entry ${TIERS.find(t=>t.id===tier)?.feeEth} ETH)`) 
                setSection('play')
              }}
            />

            <section className="panel">
              <div className="panelTitle">
                <span className="icon" aria-hidden>{TreasuryIcon}</span>
                How staking works
              </div>
              <div className="tileDetails">
                <div className="row"><span>Entry fees</span><span>Per GameTier (Bronze 0.01, Silver 0.1, Gold 1, Platinum 10 ETH)</span></div>
                <div className="row"><span>Verification</span><span>Silver+ requires &gt; Basic; Gold/Platinum require Premium</span></div>
                <div className="row"><span>Treasury</span><span>Entry fees credit the Hot Wallet; prize splits 60/25/10/3/2%</span></div>
                <div className="row"><span>Start</span><span>Lobby starts when min players reached; 30s delay</span></div>
              </div>
            </section>
          </>
        )}

        {section==='play' && (
          <section className="panel twoCol play">
            <div className="col col-left">
              <div className="panelTitle">
                <span className="icon" aria-hidden>{BoardIcon}</span>
                Game board
              </div>
              <MonopolyBoard
                players={game.players}
                positions={game.positions}
                ownership={game.ownership}
                houses={game.houses}
                selected={selected}
                onSelect={setSelected}
                d1={d1}
                d2={d2}
                rolling={rolling}
                onRoll={rollDice}
                mortgages={mortgages}
              />
            </div>
            <div className="col col-right">
              <div className="panelTitle">
                <span className="icon" aria-hidden>{EventIcon}</span>
                Turn & actions
              </div>
              <ActionBar
                cur={curPlayer}
                tile={tile}
                canBuy={!!canBuy}
                canBuild={!!canBuild}
                canDraw={!!canDrawCard}
                onBuy={() => buyProperty(selected)}
                onBuild={() => buildHouse(selected)}
                onDraw={() => tile?.kind==='chance'?drawCard('chance'):tile?.kind==='chest'?drawCard('chest'):undefined}
                onEndTurn={endTurn}
                onMortgage={() => mortgageProperty(selected)}
                onUnmortgage={() => unmortgageProperty(selected)}
                canMortgage={owner===curPlayer.id && !isMortgaged && tile && (tile.kind==='property'||tile.kind==='rail'||tile.kind==='utility')}
                canUnmortgage={owner===curPlayer.id && isMortgaged}
                inJailTurns={inJail[curPlayer.id]||0}
                onPayBail={payBail}
                onTrade={() => log('info','Trade','Open trade dialog')}
                onAuction={() => log('info','Auction','Start auction flow')}
                balances={game.balances}
              />
              <div className="panelTitle" style={{ marginTop: 16 }}>
                <span className="icon" aria-hidden>{EventIcon}</span>
                Tile details
              </div>
              <TileDetails tile={tile} ownerId={owner} players={game.players} price={price[selected]} houses={game.houses[selected] || 0} mortgaged={!!mortgages[selected]} />

              <div className="panelTitle" style={{ marginTop: 16 }}>
                <span className="icon" aria-hidden>{EventIcon}</span>
                Players
              </div>
              <PlayersPanel players={game.players} balances={game.balances} positions={game.positions} currentIdx={game.currentIdx} />

              <div className="panelTitle" style={{ marginTop: 16 }}>
                <span className="icon" aria-hidden>{EventIcon}</span>
                Activity
              </div>
              <div className="feed">
                {feed.map((f, idx) => (
                  <div key={idx} className={`feedItem ${f.kind}`}>
                    <div className="feedHeader">
                      <span className="dot"/>
                      <span className="feedTitle">{f.title}</span>
                      <span className="time">{f.time}</span>
                    </div>
                    <div className="feedBody">{f.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {section==='treasury' && (
          <section className="panel">
            <div className="panelTitle">
              <span className="icon" aria-hidden>{TreasuryIcon}</span>
              Treasury multisig queue
            </div>
            <div className="queue">
              {mockQueue.map((q, idx) => (
                <div key={idx} className="queueItem">
                  <div className="qMain">
                    <div className="qTitle">{q.title}</div>
                    <div className="qMeta">
                      <span className="chip">{q.amount} STRK</span>
                      <span className="chip">{q.approvals}/{q.threshold} approvals</span>
                      <span className="chip warn">expires {q.expires}</span>
                    </div>
                  </div>
                  <div className="qActions">
                    <button className="btn small outline">Details</button>
                    <button className="btn small glow">Approve</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ...existing code for other sections (events/dashboard) can be added similarly ... */}

        <footer className="footer">© Whaleopoly • Built on Starknet</footer>
      </main>

      <div className="bgOrbs" aria-hidden>
        <span className="orb orbA"/>
        <span className="orb orbB"/>
        <span className="orb orbC"/>
      </div>

      {/* Insert card modal at root level so it overlays */}
      {openCard && (
        <div className="cardModal" role="dialog" aria-modal="true">
          <div className="cardPanel">
            <div className="cardHeader">
              <span className={`deckTag ${openCard.deck}`}>{openCard.deck==='chance'?'Chance':'Chest'}</span>
              <button className="closeBtn" onClick={()=>!openCard.keep?setOpenCard(undefined):setOpenCard(undefined)} aria-label="Close">×</button>
            </div>
            <div className="cardTitle">{openCard.title}</div>
            <div className="cardBody">{openCard.text}</div>
            <div className="cardActions">
              {openCard.action.kind==='jail_pass' && <span className="chip">Keep</span>}
              <button className="btn glow" onClick={()=>applyCard(openCard)}>Apply</button>
            </div>
          </div>
        </div>
      )}
      {/* Add floating jail pass use button if applicable */}
      {hasJailPass && (inJail[curPlayer.id]||0)>0 && (
        <button className="floatingBtn" onClick={useJailPass}>Use Jail Pass ({jailPasses[curPlayer.id]})</button>
      )}
    </div>
  )
}

// Generic, copyright-safe board layout (40 tiles) inspired by classic Monopoly ring
const monoTiles: { id: number; kind: 'corner'|'property'|'chance'|'chest'|'tax'|'rail'|'utility'|'gotojail'|'free'|'jail'; label: string; color?: string }[] = [
  { id:0, kind:'corner', label:'Start' },
  { id:1, kind:'property', label:'Reef Row', color:'#9ad0f5' },
  { id:2, kind:'chest', label:'Chest' },
  { id:3, kind:'property', label:'Coral Cove', color:'#9ad0f5' },
  { id:4, kind:'tax', label:'Tax' },
  { id:5, kind:'rail', label:'Harbor Rail' },
  { id:6, kind:'property', label:'Kelp Keys', color:'#c7e59f' },
  { id:7, kind:'chance', label:'Chance' },
  { id:8, kind:'property', label:'Tide Terrace', color:'#c7e59f' },
  { id:9, kind:'property', label:'Lagoon Lane', color:'#c7e59f' },
  { id:10, kind:'jail', label:'Jail | Visiting' },
  { id:11, kind:'property', label:'Pearl Plaza', color:'#d9a4f3' },
  { id:12, kind:'utility', label:'Power Plant' },
  { id:13, kind:'property', label:'Shell Square', color:'#d9a4f3' },
  { id:14, kind:'property', label:'Trident Trail', color:'#d9a4f3' },
  { id:15, kind:'rail', label:'Mariner Rail' },
  { id:16, kind:'property', label:'Barnacle Blvd', color:'#f6d47c' },
  { id:17, kind:'chest', label:'Chest' },
  { id:18, kind:'property', label:'Seagrass St', color:'#f6d47c' },
  { id:19, kind:'property', label:'Whale Way', color:'#f6d47c' },
  { id:20, kind:'free', label:'Free Stop' },
  { id:21, kind:'property', label:'Anchor Ave', color:'#7fc9b0' },
  { id:22, kind:'chance', label:'Chance' },
  { id:23, kind:'property', label:'Current Ct', color:'#7fc9b0' },
  { id:24, kind:'property', label:'Harpoon Hwy', color:'#7fc9b0' },
  { id:25, kind:'rail', label:'Seafarer Rail' },
  { id:26, kind:'property', label:'Driftwood Dr', color:'#e7a592' },
  { id:27, kind:'property', label:'Gull Grove', color:'#e7a592' },
  { id:28, kind:'utility', label:'Water Works' },
  { id:29, kind:'property', label:'Marlin Meadows', color:'#e7a592' },
  { id:30, kind:'gotojail', label:'Go To Jail' },
  { id:31, kind:'property', label:'Siren St', color:'#7fb2f0' },
  { id:32, kind:'property', label:'Net Nook', color:'#7fb2f0' },
  { id:33, kind:'chest', label:'Chest' },
  { id:34, kind:'property', label:'Kraken Knoll', color:'#7fb2f0' },
  { id:35, kind:'rail', label:'Deep Rail' },
  { id:36, kind:'chance', label:'Chance' },
  { id:37, kind:'property', label:'Poseidon Pl', color:'#3aa3e3' },
  { id:38, kind:'tax', label:'Luxury Tax' },
  { id:39, kind:'property', label:'Leviathan Lp', color:'#3aa3e3' },
]

function MonopolyBoard({ players, positions, ownership, houses, selected, onSelect, d1, d2, rolling, onRoll, mortgages }:{
  players: Player[];
  positions: Record<string, number>;
  ownership: Record<number, string | undefined>;
  houses: Record<number, number>;
  selected: number;
  onSelect: (id: number) => void;
  d1: number; d2: number; rolling: boolean; onRoll: () => void;
  mortgages?: Record<number, boolean>;
}) {
  function tileStyle(id: number, side: 'bottom'|'left'|'top'|'right', baseRow: number, baseCol: number) {
    const isCorner = id === 0 || id === 10 || id === 20 || id === 30
    if (isCorner) {
      if (id === 0) return { gridRow: '10 / span 2', gridColumn: '10 / span 2' } as React.CSSProperties
      if (id === 10) return { gridRow: '10 / span 2', gridColumn: '1 / span 2' } as React.CSSProperties
      if (id === 20) return { gridRow: '1 / span 2', gridColumn: '1 / span 2' } as React.CSSProperties
      return { gridRow: '1 / span 2', gridColumn: '10 / span 2' } as React.CSSProperties
    }
    if (side === 'bottom') return { gridRow: '10 / span 2', gridColumn: baseCol } as React.CSSProperties
    if (side === 'top') return { gridRow: '1 / span 2', gridColumn: baseCol } as React.CSSProperties
    if (side === 'left') return { gridRow: baseRow, gridColumn: '1 / span 2' } as React.CSSProperties
    return { gridRow: baseRow, gridColumn: '10 / span 2' } as React.CSSProperties
  }

  return (
    <div className="boardWrap">
      <div className="boardMono">
        {monoTiles.map((t) => {
          const { row, col, side } = toGrid(t.id)
          const isCorner = t.id === 0 || t.id === 10 || t.id === 20 || t.id === 30
          const isMort = !!(mortgages && mortgages[t.id])
          const classNames = ['monoTile', side, isCorner ? 'corner' : '', selected===t.id?'selected':'', isMort?'mortgaged':''].filter(Boolean).join(' ')
          const style = tileStyle(t.id, side, row, col)
          const ownerId = ownership[t.id]
          const tileHouses = houses[t.id] || 0
          const tilePlayers = players.filter(p => positions[p.id] === t.id)
          return (
            <button key={t.id} className={classNames} style={style} onClick={() => onSelect(t.id)}>
              {t.color && <span className="colorBar" style={{ background: t.color }} />}
              <span className="index">{t.id}</span>
              <span className="label">{t.label}</span>
              {ownerId && <span className="ownerStripe" style={{ background: players.find(p => p.id===ownerId)?.color }} />}
              {t.kind==='property' && tileHouses>0 && (
                <span className="houses">
                  {tileHouses < 5
                    ? Array.from({length: tileHouses}).map((_,i)=>(<span key={i} className="house" />))
                    : <span className="hotel" />}
                </span>
              )}
              {tilePlayers.length>0 && (
                <span className="tokensWrap">
                  {tilePlayers.map((p,i)=>(<span key={p.id} className="token" style={{ background: p.color, transform: `translateX(${i*12}px)` }} />))}
                </span>
              )}
            </button>
          )
        })}
        <div className="boardCenter">
          <img className="centerLogo" src="/whaleopoly%20transparent.png" alt="Whaleopoly logo" />
        </div>
        <div className="diceTray">
          <div className={`die ${rolling ? 'rolling' : ''}`} aria-label={`die ${d1}`}>
            {[1,2,3,4,5,6,7,8,9].filter(pos => [1,2,3,4,5,6].includes(pos)).map(()=>null) /* placeholder to keep grid */}
            {[1,2,3,4,5,6,7,8,9].filter(p=>({1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]} as any)[d1].includes(p)).map((p)=>(<span key={p} className={`pip pos-${p}`} />))}
          </div>
          <div className={`die ${rolling ? 'rolling' : ''}`} aria-label={`die ${d2}`}>
            {[1,2,3,4,5,6,7,8,9].filter(pos => [1,2,3,4,5,6].includes(pos)).map(()=>null)}
            {[1,2,3,4,5,6,7,8,9].filter(p=>({1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]} as any)[d2].includes(p)).map((p)=>(<span key={p} className={`pip pos-${p}`} />))}
          </div>
          <button className="btn glow rollBtn" onClick={onRoll} disabled={rolling}>{rolling ? 'Rolling…' : 'Roll'}</button>
        </div>
      </div>
      {/* removed external diceRow to keep everything within board square */}
    </div>
  )
}

function toGrid(i: number): { row: number; col: number; side: 'bottom'|'left'|'top'|'right' } {
  if (i >= 0 && i <= 10) {
    return { row: 11, col: 11 - i, side: 'bottom' }
  }
  if (i >= 11 && i <= 20) {
    return { row: 11 - (i - 10), col: 1, side: 'left' }
  }
  if (i >= 21 && i <= 30) {
    return { row: 1, col: i - 19, side: 'top' }
  }
  // 31..39
  return { row: i - 29, col: 11, side: 'right' }
}

const mockQueue = [
  { title: 'Research grant payout', amount: 4200, approvals: 2, threshold: 3, expires: 'in 3h' },
  { title: 'Emergency liquidity', amount: 15000, approvals: 1, threshold: 4, expires: 'in 12h' },
]

const DiceIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="15" r="1.5" fill="currentColor"/>
  </svg>
)

const BoardIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M3 9h18M9 3v18" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)

const TreasuryIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 7h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M2 7h20" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)

const EventIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 3v4M17 3v4M4 8h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)

function PlayersPanel({ players, balances, positions, currentIdx }: { players: Player[]; balances: Record<string, number>; positions: Record<string, number>; currentIdx: number }) {
  return (
    <div className="playersPanel">
      {players.map((p, i) => (
        <div key={p.id} className={`playerRow ${i===currentIdx?'active':''}`}>
          <span className="playerDot" style={{ background: p.color }} />
          <span className="playerName">{p.name}</span>
          <span className="playerPos">Tile {positions[p.id]}</span>
          <span className="playerBal">${balances[p.id]}</span>
        </div>
      ))}
    </div>
  )
}

function TileDetails({ tile, ownerId, players, price, houses, mortgaged }: { tile?: typeof monoTiles[number]; ownerId?: string; players: Player[]; price?: number; houses: number; mortgaged?: boolean }) {
  const ownerName = ownerId ? (players.find(p => p.id===ownerId)?.name || ownerId) : 'Unowned'
  if (!tile) return null
  return (
    <div className="tileDetails">
      <div className="tileHeader">
        <div className="colorSwatch" style={{ background: tile.color || 'transparent' }} />
        <div className="tileTitle">{tile.label}</div>
        <div className="tileKind">{tile.kind}</div>
      </div>
      {price && <div className="row"><span>Price</span><span>${price}</span></div>}
      <div className="row"><span>Owner</span><span>{ownerName}</span></div>
      {tile.kind==='property' && <div className="row"><span>Houses</span><span>{houses === 5 ? 'Hotel' : houses}</span></div>}
    </div>
  )
}

function ActionBar({ cur, tile, canBuy, canBuild, canDraw, onBuy, onBuild, onDraw, onEndTurn, onMortgage, onUnmortgage, canMortgage, canUnmortgage, inJailTurns, onPayBail, onTrade, onAuction, balances }: {
  cur: Player;
  tile?: typeof monoTiles[number];
  canBuy: boolean;
  canBuild: boolean;
  canDraw: boolean;
  onBuy: () => void;
  onBuild: () => void;
  onDraw: () => void;
  onEndTurn: () => void;
  onMortgage: () => void;
  onUnmortgage: () => void;
  canMortgage: boolean;
  canUnmortgage: boolean;
  inJailTurns: number;
  onPayBail: () => void;
  onTrade: () => void;
  onAuction: () => void;
  balances: Record<string, number>;
}) {
  return (
    <div className="actionBar">
      <div className="turnRow">
        <span className="playerDot" style={{ background: cur.color }} />
        <span className="turnText">{cur.name}'s turn {inJailTurns>0 && `(Jail: ${inJailTurns})`}</span>
        <span className="spacer" />
        <span className="balance">${balances[cur.id]}</span>
      </div>
      <div className="btnRow">
        <button className="btn glow" onClick={onEndTurn}>End Turn</button>
        {canBuy && <button className="btn outline" onClick={onBuy}>Buy</button>}
        {canBuild && <button className="btn outline" onClick={onBuild}>Build</button>}
        {canDraw && <button className="btn outline" onClick={onDraw}>Apply Card</button>}
        {canMortgage && <button className="btn outline" onClick={onMortgage}>Mortgage</button>}
        {canUnmortgage && <button className="btn outline" onClick={onUnmortgage}>Unmortgage</button>}
        {inJailTurns>0 && <button className="btn outline" onClick={onPayBail}>Pay Bail ($50)</button>}
        <button className="btn ghost" onClick={onTrade}>Trade</button>
        <button className="btn ghost" onClick={onAuction}>Auction</button>
      </div>
    </div>
  )
}

function OnboardPanel({ lobbies, onCreate, onJoin }:{ lobbies: Lobby[]; onCreate: (tier: Lobby['tier'], maxPlayers: number)=>void; onJoin: (gameId: number, tier: Lobby['tier'])=>void }) {
  const [tier, setTier] = useState<Lobby['tier']>('Bronze')
  const [maxPlayers, setMaxPlayers] = useState(4)
  return (
    <section className="panel">
      <div className="panelTitle">
        <span className="icon" aria-hidden>{BoardIcon}</span>
        Onboard & stake
      </div>
      <div className="tiersGrid">
        {TIERS.map(t => (
          <button key={t.id} className={`tierCard ${tier===t.id?'active':''}`} onClick={()=>setTier(t.id)}>
            <div className="tierHeader">
              <div className="tierName">{t.id}</div>
              <div className="tierFee">{t.feeEth} ETH</div>
            </div>
            <div className="tierBody">
              <div className="row"><span>Starting</span><span>${t.starting.toLocaleString()}</span></div>
              <div className="row"><span>Requires</span><span>{t.requires}</span></div>
              <div className="row"><span>Notes</span><span>{t.desc}</span></div>
            </div>
          </button>
        ))}
      </div>
      <div className="onboardActions">
        <label className="field">
          <span>Max players (2–6)</span>
          <input type="number" min={2} max={6} value={maxPlayers} onChange={(e)=>setMaxPlayers(Math.max(2, Math.min(6, Number(e.target.value)||4)))} />
        </label>
        <button className="btn glow" onClick={()=>onCreate(tier, maxPlayers)}>Create lobby</button>
      </div>
      <div className="panelTitle" style={{marginTop:16}}>Open lobbies</div>
      <div className="lobbies">
        {lobbies.length===0 && <div className="muted">No open lobbies yet.</div>}
        {lobbies.map(l => (
          <div key={l.gameId} className="lobbyRow">
            <div className="lobbyMain">
              <div className="lobbyTitle">Game #{l.gameId}</div>
              <div className="lobbyMeta">
                <span className="chip">{l.tier}</span>
                <span className="chip">{l.players}/{l.maxPlayers} players</span>
                <span className="chip">entry {TIERS.find(t=>t.id===l.tier)?.feeEth} ETH</span>
              </div>
            </div>
            <div className="lobbyActions">
              <button className="btn outline" onClick={()=>onJoin(l.gameId, l.tier)}>Stake & Join</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default App
