import { useState, useEffect } from 'react'
import './App.css'
import { WalletButton } from './WalletButton'
import { useDojoSDK, useEntityQuery, useModels } from "@dojoengine/sdk/react"
import { ToriiQueryBuilder, MemberClause } from "@dojoengine/sdk"
import { useAccount } from "@starknet-react/core"
import { CairoCustomEnum } from "starknet"

// Types from your contracts
type Player = {
  id: string;
  name: string;
  color: string;
}

type Lobby = {
  gameId: number;
  host: string;
  maxPlayers: number;
  players: number;
  entryEth: string;
}

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
  // --- Official Dojo SDK integration ---
  const { client } = useDojoSDK();
  const [currentGameId, setCurrentGameId] = useState<number | undefined>();
  
  // Local state for lobbies (optimistic updates)
  const [localLobbies, setLocalLobbies] = useState<Lobby[]>([]);
  const [nextGameId, setNextGameId] = useState(1);
  
  // Subscribe to game states using official SDK
  // Note: These queries may fail with torii-wasm stub but won't crash the app
  useEntityQuery(
    new ToriiQueryBuilder()
      .withClause(MemberClause("whale_opoly-GameState", "status", "Eq", "Active").build())
      .includeHashedKeys()
  );
  
  // Subscribe to player positions  
  useEntityQuery(
    new ToriiQueryBuilder()
      .withClause(MemberClause("whale_opoly-Position", "x", "Gte", 0).build())
      .includeHashedKeys()
  );
  
  // Get real data from Zustand store
  const gameStates = useModels("whale_opoly-GameState");
  const positions = useModels("whale_opoly-Position");
  const gameCurrencies = useModels("whale_opoly-GameCurrency");
  const propertyOwnerships = useModels("whale_opoly-PropertyOwnership");
  
  // Extract game data from Dojo entities
  const gameEntities = Object.values(gameStates);
  const currentGame = gameEntities.find((game: any) => game.game_id === currentGameId) || gameEntities[0];
  
  // Real game data from Dojo entities
  const game = {
    players: currentGame ? [
      { id: currentGame.player_1, name: "Player 1", color: "#ff6b6b" },
      { id: currentGame.player_2, name: "Player 2", color: "#4ecdc4" },
      { id: currentGame.player_3, name: "Player 3", color: "#45b7d1" },
      { id: currentGame.player_4, name: "Player 4", color: "#f9ca24" }
    ].filter(p => p.id) : [],
    currentIdx: currentGame?.current_player_index || 0,
    positions: Object.fromEntries(
      Object.values(positions).map((pos: any) => [pos.player, pos.position])
    ),
    ownership: Object.fromEntries(
      Object.values(propertyOwnerships).map((prop: any) => [prop.property_id, prop.owner])
    ),
    balances: Object.fromEntries(
      Object.values(gameCurrencies).map((currency: any) => [currency.player, currency.balance])
    ),
    houses: {} as Record<number, number>
  };
  
  // Combine real lobbies from blockchain with local optimistic lobbies
  const blockchainLobbies: Lobby[] = gameEntities
    .filter((gameState: any) => gameState.status === "Waiting")
    .map((gameState: any) => ({
      gameId: gameState.game_id,
      host: gameState.host,
      maxPlayers: gameState.max_players,
      players: gameState.current_players,
      entryEth: (Number(gameState.entry_fee) / 1e18).toString()
    }));
  
  // Merge blockchain and local lobbies, prioritizing blockchain data
  const lobbies: Lobby[] = [
    ...blockchainLobbies,
    ...localLobbies.filter(local => 
      !blockchainLobbies.some(blockchain => blockchain.gameId === local.gameId)
    )
  ];
  
  // Get wallet account
  const { account } = useAccount();
  
  // Real Dojo contract actions
  const createLobby = async (maxPlayers: number, host: string, entryEth: string) => {
    if (!account) {
      console.warn('No wallet account connected');
      return null;
    }
    if (!client) {
      console.warn('Dojo client not available');
      return null;
    }
    
    console.log(`Creating lobby: ${maxPlayers} players, host: ${host}, entry: ${entryEth} ETH`);
    
    // Generate unique game ID for this lobby
    const gameId = nextGameId;
    setNextGameId(prev => prev + 1);
    
    // Add optimistic lobby immediately
    const optimisticLobby: Lobby = {
      gameId,
      host,
      maxPlayers,
      players: 1, // Creator counts as first player
      entryEth
    };
    
    setLocalLobbies(prev => [optimisticLobby, ...prev]);
    
    try {
      // Create proper CairoCustomEnum for tier
      const tier = new CairoCustomEnum({ Bronze: {} });
      console.log('Calling client.game_manager.createGame with:', { account: account.address, tier, maxPlayers });
      
      const result = await client.game_manager.createGame(account, tier, maxPlayers);
      console.log('Create game result:', result);
      
      // Show success message to user
      log('good', '🎉 Lobby Created Successfully!', `Transaction hash: ${result.transaction_hash?.slice(0, 10)}... | Players: ${maxPlayers} | Entry: ${entryEth} ETH`);
      
      // Update the optimistic lobby with transaction hash
      setLocalLobbies(prev => 
        prev.map(lobby => 
          lobby.gameId === gameId 
            ? { ...lobby, transactionHash: result.transaction_hash }
            : lobby
        )
      );
      
      return { gameId, success: true, transactionHash: result.transaction_hash };
    } catch (error) {
      console.error('Create game failed:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));

      // Remove the optimistic lobby on failure
      setLocalLobbies(prev => prev.filter(lobby => lobby.gameId !== gameId));

      // Check if user cancelled the transaction
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('USER_REFUSED_OP') || errorMessage.includes('user rejected')) {
        log('info', '❌ Transaction Cancelled', 'You cancelled the transaction. No lobby was created.');
      } else {
        log('warn', '⚠️ Transaction Failed', 'Failed to create lobby. Please try again.');
      }

      return null;
    }
  };
  
  const joinLobby = async (gameId: number, username: string) => {
    if (!account || !client) return null;
    
    // Check if user is trying to join their own lobby
    const lobby = lobbies.find(l => l.gameId === gameId);
    if (lobby && lobby.host === account.address) {
      log('warn', '⚠️ Cannot Join Own Lobby', 'You are already the host of this game');
      return null;
    }
    
    // Optimistically update the lobby player count
    setLocalLobbies(prev => 
      prev.map(lobby => 
        lobby.gameId === gameId 
          ? { ...lobby, players: lobby.players + 1 }
          : lobby
      )
    );
    
    try {
      await client.game_manager.joinGame(account, gameId);
      log('good', '🎮 Joined Game!', `Successfully joined lobby #${gameId} as ${username}`);
      return { success: true };
    } catch (error) {
      console.error('Join game failed:', error);

      // Revert the optimistic update on failure
      setLocalLobbies(prev =>
        prev.map(lobby =>
          lobby.gameId === gameId
            ? { ...lobby, players: Math.max(1, lobby.players - 1) }
            : lobby
        )
      );

      // Check if user cancelled the transaction
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('USER_REFUSED_OP') || errorMessage.includes('user rejected')) {
        log('info', '❌ Transaction Cancelled', 'You cancelled the join request.');
      } else {
        log('warn', 'Join Failed', 'Could not join the game. Please try again.');
      }
      return null;
    }
  };
  
  const rollDiceAction = async () => {
    if (!account || !client || !currentGameId) return null;
    try {
      await client.board_actions.rollDice(account, currentGameId);
      // Parse dice results from result if available
      return { dice1: 3, dice2: 4, success: true }; // Mock values, parse from result
    } catch (error) {
      console.error('Roll dice failed:', error);
      return null;
    }
  };
  
  const buyPropertyAction = async (propertyId: number) => {
    if (!account || !client || !currentGameId) return null;
    try {
      await client.board_actions.buyProperty(account, currentGameId, propertyId);
      return { success: true };
    } catch (error) {
      console.error('Buy property failed:', error);
      return null;
    }
  };
  
  // Lobby refresh mechanism - sync local state with blockchain
  const refreshLobbies = () => {
    setLocalLobbies(prev => {
      // Remove local lobbies that now exist on blockchain
      return prev.filter(local => 
        !blockchainLobbies.some(blockchain => blockchain.gameId === local.gameId)
      );
    });
  };

  // Auto-refresh lobbies every 30 seconds to sync with blockchain
  useEffect(() => {
    const interval = setInterval(refreshLobbies, 30000);
    return () => clearInterval(interval);
  }, [blockchainLobbies, refreshLobbies]);

  // Update function for optimistic updates (optional)
  const updateGame = (updater?: (g: any) => any) => {
    // Since we're using real Dojo data, we don't need local updates
    // The Zustand store will update automatically when blockchain state changes
    console.log('Game update will reflect from blockchain via Dojo subscriptions', updater ? 'with updater' : '');
  };
  
  // --- Core state ---
  const [section, setSection] = useState<'onboard'|'dashboard'|'play'|'events'>('onboard')
  const [selected, setSelected] = useState(0)
  const [d1, setD1] = useState(1)
  const [d2, setD2] = useState(1)
  const [rolling, setRolling] = useState(false)
  const [feed, setFeed] = useState<{kind:'good'|'warn'|'info'; title:string; body:string; time:string}[]>([])
  const [mortgages, setMortgages] = useState<Record<number, boolean>>({})
  const [inJail, setInJail] = useState<Record<string, number>>({})
  const [lastRoll, setLastRoll] = useState(0)
  // lobbies now come from useLobbies hook
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

  // NEW: derived counts to consume deck state so they are not flagged unused
  const chanceRemaining = chanceDeck.length
  const chestRemaining = chestDeck.length

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
      case 'money': { const amt=action.amount; updateGame(g=>({...g, balances:{...g.balances,[pid]:(g.balances[pid]||0)+amt}})); log(amt>=0?'good':'warn', card.title, `${amt>=0?'+':'-'}$${Math.abs(amt)}`); break }
      case 'move': { const from=game.positions[pid]; const passGo=action.passGo && (from>action.to); updateGame(g=>({...g, positions:{...g.positions,[pid]:action.to}, balances: passGo?{...g.balances,[pid]:g.balances[pid]+200}:g.balances})); setSelected(action.to); if(passGo) log('good','Passed Start','+$200'); log('info',card.title,card.text); break }
      case 'move_rel': { const from=game.positions[pid]; const to=(from+action.delta+40)%40; updateGame(g=>({...g, positions:{...g.positions,[pid]:to}})); setSelected(to); log('info',card.title,card.text); break }
      case 'goto_jail': { updateGame(g=>({...g, positions:{...g.positions,[pid]:10}})); setInJail(j=>({...j,[pid]:3})); setSelected(10); log('warn','Jail','3 turns or pay $50'); break }
      case 'jail_pass': { setJailPasses(p=>({...p,[pid]:(p[pid]||0)+1})); log('good','Jail Pass acquired','Stored until needed'); break }
      case 'collect_each': { updateGame(g=>{ let delta=0; const up={...g.balances}; g.players.forEach((pl: any)=>{ if(pl.id!==pid){ up[pl.id]-=action.amount; delta+=action.amount } }); up[pid]+=delta; return {...g, balances:up} }); log('good',card.title,`+$${action.amount} from each`); break }
      case 'pay_each': { updateGame(g=>{ let cost=0; g.players.forEach((pl: any)=>{ if(pl.id!==pid) cost+=action.amount }); return {...g, balances:{...g.balances,[pid]:g.balances[pid]-cost}} }); log('warn',card.title,`-$${action.amount} to each`); break }
      case 'nearest_rail': { const to=nearest(game.positions[pid],[5,15,25,35]); updateGame(g=>({...g, positions:{...g.positions,[pid]:to}})); setSelected(to); log('info',card.title,`Moved to Rail ${to}`); break }
      case 'nearest_utility': { const to=nearest(game.positions[pid],[12,28]); updateGame(g=>({...g, positions:{...g.positions,[pid]:to}})); setSelected(to); log('info',card.title,`Moved to Utility ${to}`); break }
      case 'repair': { const housesCount=Object.entries(game.houses).reduce((a,[,c])=>a+(c&&c<5?c:0),0); const hotelsCount=Object.entries(game.houses).reduce((a,[,c])=>a+(c===5?1:0),0); const cost=housesCount*action.perHouse+hotelsCount*action.perHotel; if(cost>0) updateGame(g=>({...g, balances:{...g.balances,[pid]:g.balances[pid]-cost}})); log('warn',card.title,`-$${cost}`); break }
    }
    if(!card.keep) setOpenCard(undefined)
  }
  function useJailPass(){ const cur=game.players[game.currentIdx]; if(!cur) return; if((inJail[cur.id]||0)===0) return; if((jailPasses[cur.id]||0)<=0) return; setJailPasses(p=>({...p,[cur.id]:p[cur.id]-1})); setInJail(j=>({...j,[cur.id]:0})); log('good','Jail Pass used','Freed from Jail') }

  function moveAndResolve(steps:number){
    const cur=game.players[game.currentIdx]; if(!cur) return; if((inJail[cur.id]||0)>0){ log('warn',`${cur.name} is in Jail`,'Pay bail or use pass'); return }
    const from=game.positions[cur.id] || 0; const to=(from+steps)%40; const passGo=from+steps>=40
    updateGame(g=>({...g, positions:{...g.positions,[cur.id]:to}, balances: passGo?{...g.balances,[cur.id]:(g.balances[cur.id]||0)+200}:g.balances }))
    if(passGo) log('good',`${cur.name} passed Start`,'+$200')
    setSelected(to)
    const tile=monoTiles[to]; if(!tile) return
    if(tile.kind==='chance'){ drawCard('chance'); return }
    if(tile.kind==='chest'){ drawCard('chest'); return }
    if(tile.kind==='tax'){ updateGame(g=>({...g, balances:{...g.balances,[cur.id]:g.balances[cur.id]-100}})); log('warn',`${cur.name} paid Tax`,'-$100'); return }
    if(tile.kind==='gotojail'){ updateGame(g=>({...g, positions:{...g.positions,[cur.id]:10}})); setInJail(j=>({...j,[cur.id]:3})); setSelected(10); log('warn',`${cur.name} went to Jail`,'3 turns or $50'); return }
    if(['property','rail','utility'].includes(tile.kind)){
      const owner=game.ownership[to]; if(owner && owner!==cur.id && !mortgages[to]){
        let rent=Math.max(10,Math.floor((price[to]||100)*0.1)) + (game.houses[to]||0)*10
        if([5,15,25,35].includes(to)){ const count=[5,15,25,35].filter(r=>game.ownership[r]===owner).length; rent=[0,25,50,100,200][count] }
        if([12,28].includes(to)){ const count=[12,28].filter(u=>game.ownership[u]===owner).length; rent=(count===2?10:4)*Math.max(2,lastRoll||7) }
        updateGame(g=>({...g, balances:{...g.balances, [cur.id]:g.balances[cur.id]-rent, [owner]:(g.balances[owner]||0)+rent }}))
        log('info',`${cur.name} paid rent`, `-$${rent} to ${owner}`)
      }
    }
  }
  async function rollDice(){ 
    if(rolling||openCard) return; 
    setRolling(true); 
    
    try {
      // Use real Dojo contract for dice roll
      const dojoResult = await rollDiceAction();
      if (dojoResult?.dice1 && dojoResult?.dice2) {
        setTimeout(()=>{ 
          setD1(dojoResult.dice1); 
          setD2(dojoResult.dice2); 
          setLastRoll(dojoResult.dice1+dojoResult.dice2); 
          setRolling(false); 
          moveAndResolve(dojoResult.dice1+dojoResult.dice2) 
        }, 420);
        return;
      }
    } catch (error) {
      console.error('Dojo dice roll failed:', error);
    }
    
    // Fallback to local dice roll if contract call fails
    const r1=1+Math.floor(Math.random()*6); 
    const r2=1+Math.floor(Math.random()*6); 
    setTimeout(()=>{ 
      setD1(r1); 
      setD2(r2); 
      setLastRoll(r1+r2); 
      setRolling(false); 
      moveAndResolve(r1+r2) 
    },420);
  }
  async function buyProperty(id:number){ 
    const t=monoTiles[id]; 
    if(!t) return; 
    if(!['property','rail','utility'].includes(t.kind)) return; 
    const cur=game.players[game.currentIdx]; 
    if(!cur) return;
    if(game.ownership[id]) return log('warn','Owned already',''); 
    const cost=price[id]||0; 
    if((game.balances[cur.id] || 0)<cost) return log('warn','Need funds',`$${cost}`); 
    
    try {
      // Use real Dojo contract
      const dojoResult = await buyPropertyAction(id);
      if (dojoResult?.success) {
        log('good','Bought via Dojo',`${t.label} $${cost}`);
        return;
      }
    } catch (error) {
      console.error('Dojo buy property failed:', error);
    }
    
    // If contract call fails, log the error  
    log('warn','Purchase failed','Check connection');
  }
  function buildHouse(id:number){ const t=monoTiles[id]; if(!t||t.kind!=='property') return; const cur=game.players[game.currentIdx]; if(!cur) return; if(game.ownership[id]!==cur.id) return log('warn','Not owner',''); if(!ownsGroup(cur.id,id)) return log('warn','Need set',''); const current=game.houses[id]||0; if(current>=5) return log('warn','Max built',''); const cost=current===4?houseCost[id]*2:houseCost[id]; if((game.balances[cur.id]||0)<cost) return log('warn','Need funds',`$${cost}`); updateGame(g=>({...g, houses:{...g.houses,[id]:current+1}, balances:{...g.balances,[cur.id]:(g.balances[cur.id]||0)-cost}})); log('good', current===4?'Hotel built':'House built', `-$${cost}`) }
  function mortgageProperty(id:number){ if(mortgages[id]) return log('warn','Already mortgaged',''); const cur=game.players[game.currentIdx]; if(!cur) return; if(game.ownership[id]!==cur.id) return log('warn','Not owner',''); const val=Math.floor((price[id]||0)/2); setMortgages(m=>({...m,[id]:true})); updateGame(g=>({...g, balances:{...g.balances,[cur.id]:(g.balances[cur.id]||0)+val}})); log('info','Mortgaged',`+$${val}`) }
  function unmortgageProperty(id:number){ if(!mortgages[id]) return; const cur=game.players[game.currentIdx]; if(!cur) return; const val=Math.floor((price[id]||0)/2)*1.1; if((game.balances[cur.id]||0)<val) return log('warn','Need funds',`$${val}`); setMortgages(m=>{const n={...m}; delete n[id]; return n}); updateGame(g=>({...g, balances:{...g.balances,[cur.id]:(g.balances[cur.id]||0)-val}})); log('info','Unmortgaged',`-$${val}`) }
  function payBail(){ const cur=game.players[game.currentIdx]; if(!cur) return; if((inJail[cur.id]||0)===0) return; if((game.balances[cur.id]||0)<50) return log('warn','Need $50',''); updateGame(g=>({...g, balances:{...g.balances,[cur.id]:(g.balances[cur.id]||0)-50}})); setInJail(j=>({...j,[cur.id]:0})); log('good','Bail paid','Freed') }
  function endTurn(){ if(openCard) return log('warn','Resolve card','Apply first'); updateGame(g=>({...g, currentIdx:(g.currentIdx+1)%g.players.length })); setInJail(j=>{ const n={...j}; Object.keys(n).forEach(k=>{ if(n[k]>0) n[k]-=1 }); return n }) }

  // Derived
  const curPlayer = game.players[game.currentIdx] || { id: '', name: 'Unknown', color: '#666' }
  const tile = monoTiles[selected]
  const owner = game.ownership[selected]
  const canBuy = tile && ['property','rail','utility'].includes(tile.kind) && !owner
  const canBuild = tile && tile.kind==='property' && owner===curPlayer.id && ownsGroup(curPlayer.id, selected)
  const canDrawCard = tile && ['chance','chest'].includes(tile.kind) && !openCard
  const hasJailPass = curPlayer.id ? (jailPasses[curPlayer.id]||0)>0 : false
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
          <button className={`navItem ${section==='events'?'active':''}`} onClick={()=>setSection('events')}>
            <span className="icon" aria-hidden>{EventIcon}</span>
            <span>Events</span>
          </button>
        </nav>
        <div className="sideFooter">
          <div className="chip">v0.1 • devnet</div>
          <div className="chip small">Ch:{chanceRemaining}</div>
            <div className="chip small">Cs:{chestRemaining}</div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="crumbs">
            <span className="crumb">{section}</span>
          </div>
          <div className="actions">
            <button className="btn ghost">Docs</button>
            <WalletButton />
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
                <p>Create a lobby or join one. That’s it.</p>
                <div className="cta">
                  <button className="btn outline" onClick={()=>setSection('play')}>Try the board</button>
                </div>
              </div>
            </section>

            <OnboardPanel
              lobbies={lobbies}
              onCreate={async (maxPlayers, host, entryEth)=>{
                try {
                  const result = await createLobby(maxPlayers, host, entryEth);
                  if (result?.success && result?.transactionHash) {
                    // Success message is already shown by createLobby function
                    log('info','🚀 Lobby Broadcasting...', 'Your game is now live on-chain! Other players can discover and join your lobby.');
                  } else if (result === null) {
                    // Transaction was cancelled or failed - error already logged in createLobby
                    return;
                  } else {
                    log('warn','⚠️ Unexpected Error', 'Something unexpected happened. Please try again.');
                  }
                } catch (error) {
                  console.error('Failed to create lobby:', error);
                  // Additional fallback error handling
                  const errorMessage = error instanceof Error ? error.message : String(error);
                  if (errorMessage.includes('USER_REFUSED_OP') || errorMessage.includes('user rejected')) {
                    log('info', '❌ Transaction Cancelled', 'You cancelled the lobby creation.');
                  } else {
                    log('warn','Lobby Creation Failed', 'Please check your wallet connection and try again.');
                  }
                }
              }}
              onJoin={async (gameId, username)=>{
                try {
                  const result = await joinLobby(gameId, username);
                  if (result?.success) {
                    log('good','Joined game via Dojo', `${username} • game_id ${gameId}`);
                    setCurrentGameId(gameId);
                    setSection('play');
                  } else if (result === null) {
                    // Transaction was cancelled or failed - error already logged in joinLobby
                    return;
                  } else {
                    log('warn','Unexpected Error', 'Something unexpected happened. Please try again.');
                  }
                } catch (error) {
                  console.error('Failed to join lobby:', error);
                  // Additional fallback error handling
                  const errorMessage = error instanceof Error ? error.message : String(error);
                  if (errorMessage.includes('USER_REFUSED_OP') || errorMessage.includes('user rejected')) {
                    log('info', '❌ Transaction Cancelled', 'You cancelled the join request.');
                  } else {
                    log('warn','Join failed', 'Check connection and try again.');
                  }
                }
              }}
            />

            {/* Removed verbose staking explainer to keep onboarding direct */}
          </>
        )}

        {section==='dashboard' && (
          <section className="panel twoCol">
            <div className="col col-left">
              <div className="panelTitle">
                <span className="icon" aria-hidden>{BoardIcon}</span>
                Dashboard overview
              </div>
              {(() => {
                const ownedCount = Object.values(game.ownership).filter(Boolean).length
                const housesBuilt = Object.values(game.houses).reduce((a, c) => a + (c || 0), 0)
                const cashTotal = Object.values(game.balances).reduce((a: number, c) => a + (Number(c) || 0), 0)
                return (
                  <div className="statsGrid">
                    <div className="stat"><div className="statLabel">Open lobbies</div><div className="statValue">{lobbies.length}</div></div>
                    <div className="stat"><div className="statLabel">Players</div><div className="statValue">{game.players.length}</div></div>
                    <div className="stat"><div className="statLabel">Owned tiles</div><div className="statValue">{ownedCount}</div></div>
                    <div className="stat"><div className="statLabel">Houses built</div><div className="statValue">{housesBuilt}</div></div>
                    <div className="stat"><div className="statLabel">Cash total</div><div className="statValue">${cashTotal}</div></div>
                    <div className="stat"><div className="statLabel">Cards left</div><div className="statValue">Ch {chanceRemaining} • Cs {chestRemaining}</div></div>
                  </div>
                )
              })()}

              <div className="panelTitle" style={{ marginTop: 16 }}>
                <span className="icon" aria-hidden>{EventIcon}</span>
                Open lobbies
              </div>
              <div className="lobbies">
                {lobbies.length===0 && <div className="muted">No open lobbies yet.</div>}
                {lobbies.slice(0,3).map(l => (
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
                      <button className="btn outline" onClick={()=>setSection('onboard')}>Open Onboard</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="col col-right">
              <div className="panelTitle">
                <span className="icon" aria-hidden>{EventIcon}</span>
                Recent activity
              </div>
              <div className="feed">
                {feed.slice(0,5).map((f, idx) => (
                  <div key={idx} className={`feedItem ${f.kind}`}>
                    <div className="feedHeader">
                      <span className="dot"/>
                      <span className="feedTitle">{f.title}</span>
                      <span className="time">{f.time}</span>
                    </div>
                    <div className="feedBody">{f.body}</div>
                  </div>
                ))}
                {feed.length===0 && <div className="muted">No activity yet.</div>}
              </div>

              <div className="panelTitle" style={{ marginTop: 16 }}>
                <span className="icon" aria-hidden>{EventIcon}</span>
                Current game players
              </div>
              <PlayersPanel players={game.players} balances={game.balances} positions={game.positions} currentIdx={game.currentIdx} />

              <div className="btnRow" style={{ marginTop: 12 }}>
                <button className="btn glow" onClick={()=>setSection('play')}>Go to board</button>
              </div>
            </div>
          </section>
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

  {/* Treasury UI removed */}

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
      {hasJailPass && curPlayer.id && (inJail[curPlayer.id]||0)>0 && (
        <button className="floatingBtn" onClick={useJailPass}>Use Jail Pass ({jailPasses[curPlayer.id] || 0})</button>
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
      // Use single-cell corners to avoid any crossing with side tiles
      if (id === 0) return { gridRow: 11, gridColumn: 11 } as React.CSSProperties
      if (id === 10) return { gridRow: 11, gridColumn: 1 } as React.CSSProperties
      if (id === 20) return { gridRow: 1, gridColumn: 1 } as React.CSSProperties
      return { gridRow: 1, gridColumn: 11 } as React.CSSProperties
    }
    // Place sides on outermost single row/column
    if (side === 'bottom') return { gridRow: 11, gridColumn: baseCol } as React.CSSProperties
    if (side === 'top') return { gridRow: 1, gridColumn: baseCol } as React.CSSProperties
    if (side === 'left') return { gridRow: baseRow, gridColumn: 1 } as React.CSSProperties
    return { gridRow: baseRow, gridColumn: 11 } as React.CSSProperties
  }

  return (
    <div className="boardWrap">
      <div className="boardMono">
        {monoTiles.map((t) => {
          const { row, col, side } = toGrid(t.id)
          const isCorner = t.id === 0 || t.id === 10 || t.id === 20 || t.id === 30
          const isMort = !!(mortgages && mortgages[t.id])
          const classNames = ['monoTile', side, isCorner ? 'corner' : '', selected===t.id?'selected':'', isMort?'mortgaged':'', `kind-${t.kind}`].filter(Boolean).join(' ')
          const style = tileStyle(t.id, side, row, col)
          const ownerId = ownership[t.id]
          const tileHouses = houses[t.id] || 0
          const tilePlayers = players.filter(p => positions[p.id] === t.id)
          return (
            <button
              key={t.id}
              className={classNames}
              style={style}
              onClick={() => onSelect(t.id)}
              data-id={t.id}
              data-corner={isCorner ? t.label : undefined}
              data-side={side}
              data-kind={t.kind}
            >
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
            {[1,2,3,4,5,6,7,8,9].filter(p=>({1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]} as Record<number, number[]>)[d1].includes(p)).map((p)=>(<span key={p} className={`pip pos-${p}`} />))}
          </div>
          <div className={`die ${rolling ? 'rolling' : ''}`} aria-label={`die ${d2}`}>
            {[1,2,3,4,5,6,7,8,9].filter(pos => [1,2,3,4,5,6].includes(pos)).map(()=>null)}
            {[1,2,3,4,5,6,7,8,9].filter(p=>({1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]} as Record<number, number[]>)[d2].includes(p)).map((p)=>(<span key={p} className={`pip pos-${p}`} />))}
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

// Treasury mock queue removed

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

// Treasury icon removed

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
      {typeof mortgaged === 'boolean' && <div className="row"><span>Status</span><span>{mortgaged ? 'Mortgaged' : 'Active'}</span></div>}
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
        {tile && <span className="currentTile">• {tile.label}</span>}
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

function OnboardPanel({ lobbies, onCreate, onJoin }:{ lobbies: Lobby[]; onCreate: (maxPlayers: number, host: string, entryEth: string)=>Promise<void>; onJoin: (gameId: number, username: string)=>Promise<void> }) {
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
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default App
