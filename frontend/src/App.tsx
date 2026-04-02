
import { useState, useEffect } from 'react'
import './App.css'
import { WalletButton } from './WalletButton'
import { useDojoSDK, useEntityQuery, useModels } from "@dojoengine/sdk/react"
import { ToriiQueryBuilder, MemberClause } from "@dojoengine/sdk"
import { useAccount } from "@starknet-react/core"
import { CairoCustomEnum } from "starknet"
import { useToast } from './useToast'
import { MonopolyBoard } from './components/MonopolyBoard'
import { PlayersPanel } from './components/PlayersPanel'
import { TileDetails } from './components/TileDetails'
import { ActionBar } from './components/ActionBar'
import { OnboardPanel } from './components/OnboardPanel'
import { DiceIcon, BoardIcon, EventIcon } from './components/Icons'
import { monoTiles } from './data/boardTiles'
import type { Lobby, Card } from './types'

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
  // Note: Returns empty results while torii-wasm is stubbed (see src/torii-wasm-stub.ts)
  useEntityQuery(
    new ToriiQueryBuilder()
      .withClause(MemberClause("whale_opoly-GameState", "status", "Eq", "Active").build())
      .includeHashedKeys()
  );

  // Subscribe to player positions
  useEntityQuery(
    new ToriiQueryBuilder()
      .withClause(MemberClause("whale_opoly-PlayerPosition", "position", "Gte", 0).build())
      .includeHashedKeys()
  );

  // Subscribe to game currencies
  useEntityQuery(
    new ToriiQueryBuilder()
      .withClause(MemberClause("whale_opoly-GameCurrency", "balance", "Gte", 0).build())
      .includeHashedKeys()
  );

  // Subscribe to properties
  useEntityQuery(
    new ToriiQueryBuilder()
      .withClause(MemberClause("whale_opoly-Property", "property_id", "Gte", 0).build())
      .includeHashedKeys()
  );

  // Get real data from Zustand store
  const gameStates = useModels("whale_opoly-GameState");
  const playerPositions = useModels("whale_opoly-PlayerPosition");
  const gameCurrencies = useModels("whale_opoly-GameCurrency");
  const properties = useModels("whale_opoly-Property");
  
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
      Object.values(playerPositions).map((pos: any) => [pos.player, pos.position])
    ),
    ownership: Object.fromEntries(
      Object.values(properties).map((prop: any) => [prop.property_id, prop.owner])
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
      toastError('Connect wallet first');
      return null;
    }
    if (!client) {
      toastError('Dojo client not available');
      return null;
    }

    setActionLoading('creating');

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
      // Map entryEth to the correct tier
      const tierName = entryEth === '0.01' ? 'Bronze'
        : entryEth === '0.1' ? 'Silver'
        : entryEth === '1' ? 'Gold'
        : entryEth === '10' ? 'Platinum'
        : 'Bronze';
      const tier = new CairoCustomEnum({ [tierName]: {} });
      const result = await client.game_manager.createGame(account, tier, maxPlayers);
      
      setActionLoading(null);
      toastSuccess('Lobby created on-chain!');
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
      setActionLoading(null);
      toastError('Failed to create lobby');

      // Remove the optimistic lobby on failure
      setLocalLobbies(prev => prev.filter(lobby => lobby.gameId !== gameId));

      return null;
    }
  };
  
  const joinLobby = async (gameId: number, username: string) => {
    if (!account || !client) { toastError('Connect wallet first'); return null; }
    setActionLoading('joining');

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
      setActionLoading(null);
      toastSuccess('Joined game!');
      log('good', '🎮 Joined Game!', `Successfully joined lobby #${gameId} as ${username}`);
      return { success: true };
    } catch (error) {
      console.error('Join game failed:', error);
      setActionLoading(null);
      toastError('Failed to join game');

      // Revert the optimistic update on failure
      setLocalLobbies(prev => 
        prev.map(lobby => 
          lobby.gameId === gameId 
            ? { ...lobby, players: Math.max(1, lobby.players - 1) }
            : lobby
        )
      );
      
      log('warn', 'Join Failed', 'Could not join the game. Please try again.');
      return null;
    }
  };
  
  const rollDiceAction = async () => {
    if (!account || !client || !currentGameId) return null;
    try {
      await client.board_actions.rollDice(account, currentGameId);
      // TODO: Parse real dice values from contract result once event decoding is wired up
      return { dice1: 3, dice2: 4, success: true };
    } catch (error) {
      console.error('Roll dice failed:', error);
      toastError('Dice roll failed');
      return null;
    }
  };

  const buyPropertyAction = async (propertyId: number) => {
    if (!account || !client || !currentGameId) return null;
    setActionLoading('buying');
    try {
      await client.board_actions.buyProperty(account, currentGameId, propertyId);
      setActionLoading(null);
      toastSuccess('Property purchased!');
      return { success: true };
    } catch (error) {
      console.error('Buy property failed:', error);
      setActionLoading(null);
      toastError('Purchase failed');
      return null;
    }
  };

  const startGame = async (gameId: number) => {
    if (!account || !client) { toastError('Connect wallet first'); return null; }
    setActionLoading('starting');
    try {
      await client.game_manager.startGame(account, gameId);
      setActionLoading(null);
      toastSuccess('Game started!');
      setCurrentGameId(gameId);
      // Switch to play section
      setSection('play');
      log('good', 'Game Started', `Game #${gameId} is now active!`);
      return { success: true };
    } catch (error) {
      console.error('Start game failed:', error);
      setActionLoading(null);
      toastError('Failed to start game');
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
  }, [blockchainLobbies]);

  // Update function for optimistic updates (optional)
  const updateGame = (_updater: (g: typeof game) => typeof game) => {
    // Since we're using real Dojo data, we don't need local updates
    // The Zustand store will update automatically when blockchain state changes
  };
  
  // --- Toast & loading state ---
  const { toasts, success: toastSuccess, error: toastError, loading: toastLoading, removeToast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null) // 'creating' | 'joining' | 'rolling' | 'buying' | null

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
  // lobbies come from blockchain entities merged with local optimistic state
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
      case 'collect_each': { updateGame(g=>{ let delta=0; const up={...g.balances}; g.players.forEach(pl=>{ if(pl.id!==pid){ up[pl.id]-=action.amount; delta+=action.amount } }); up[pid]+=delta; return {...g, balances:up} }); log('good',card.title,`+$${action.amount} from each`); break }
      case 'pay_each': { updateGame(g=>{ let cost=0; g.players.forEach(pl=>{ if(pl.id!==pid) cost+=action.amount }); return {...g, balances:{...g.balances,[pid]:g.balances[pid]-cost}} }); log('warn',card.title,`-$${action.amount} to each`); break }
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
        // After rolling dice, also call move_player on contract
        if (account && client && currentGameId) {
          try {
            await client.board_actions.movePlayer(account, currentGameId, dojoResult.dice1 + dojoResult.dice2);
          } catch (error) {
            console.error('Move player contract call failed:', error);
          }
        }
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
  async function buildHouse(id:number){ const t=monoTiles[id]; if(!t||t.kind!=='property') return; const cur=game.players[game.currentIdx]; if(!cur) return; if(game.ownership[id]!==cur.id) return log('warn','Not owner',''); if(!ownsGroup(cur.id,id)) return log('warn','Need set',''); const current=game.houses[id]||0; if(current>=5) return log('warn','Max built',''); const cost=current===4?houseCost[id]*2:houseCost[id]; if((game.balances[cur.id]||0)<cost) return log('warn','Need funds',`$${cost}`); if (account && client && currentGameId) { try { await client.board_actions.developProperty(account, currentGameId, id); } catch (error) { console.error('Develop property contract call failed:', error); } } updateGame(g=>({...g, houses:{...g.houses,[id]:current+1}, balances:{...g.balances,[cur.id]:(g.balances[cur.id]||0)-cost}})); log('good', current===4?'Hotel built':'House built', `-$${cost}`) }
  async function mortgageProperty(id:number){ if(mortgages[id]) return log('warn','Already mortgaged',''); const cur=game.players[game.currentIdx]; if(!cur) return; if(game.ownership[id]!==cur.id) return log('warn','Not owner',''); const val=Math.floor((price[id]||0)/2); if (account && client && currentGameId) { try { await client.board_actions.mortgageProperty(account, currentGameId, id); } catch (error) { console.error('Mortgage contract call failed:', error); } } setMortgages(m=>({...m,[id]:true})); updateGame(g=>({...g, balances:{...g.balances,[cur.id]:(g.balances[cur.id]||0)+val}})); log('info','Mortgaged',`+$${val}`) }
  async function unmortgageProperty(id:number){ if(!mortgages[id]) return; const cur=game.players[game.currentIdx]; if(!cur) return; const val=Math.floor((price[id]||0)/2)*1.1; if((game.balances[cur.id]||0)<val) return log('warn','Need funds',`$${val}`); if (account && client && currentGameId) { try { await client.board_actions.unmortgageProperty(account, currentGameId, id); } catch (error) { console.error('Unmortgage contract call failed:', error); } } setMortgages(m=>{const n={...m}; delete n[id]; return n}); updateGame(g=>({...g, balances:{...g.balances,[cur.id]:(g.balances[cur.id]||0)-val}})); log('info','Unmortgaged',`-$${val}`) }
  async function payBail(){ const cur=game.players[game.currentIdx]; if(!cur) return; if((inJail[cur.id]||0)===0) return; if((game.balances[cur.id]||0)<50) return log('warn','Need $50',''); if (account && client && currentGameId) { try { await client.board_actions.payBail(account, currentGameId); } catch (error) { console.error('Pay bail contract call failed:', error); } } updateGame(g=>({...g, balances:{...g.balances,[cur.id]:(g.balances[cur.id]||0)-50}})); setInJail(j=>({...j,[cur.id]:0})); log('good','Bail paid','Freed') }
  async function endTurn(){ if(openCard) return log('warn','Resolve card','Apply first'); if (account && client && currentGameId) { try { await client.board_actions.endTurn(account, currentGameId); } catch (error) { console.error('End turn contract call failed:', error); } } updateGame(g=>({...g, currentIdx:(g.currentIdx+1)%g.players.length })); setInJail(j=>{ const n={...j}; Object.keys(n).forEach(k=>{ if(n[k]>0) n[k]-=1 }); return n }) }

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
                  } else {
                    throw new Error('Failed to create lobby');
                  }
                } catch (error) {
                  console.error('Failed to create lobby:', error);
                  log('warn','Lobby Creation Failed', 'Please check your wallet connection and try again.');
                }
              }}
              onJoin={async (gameId, username)=>{
                try {
                  const result = await joinLobby(gameId, username);
                  if (result?.success) {
                    log('good','Joined game via Dojo', `${username} • game_id ${gameId}`);
                    setCurrentGameId(gameId);
                    setSection('play');
                  } else {
                    throw new Error('Failed to join lobby');
                  }
                } catch (error) {
                  console.error('Failed to join lobby:', error);
                  log('warn','Join failed', 'Check connection');
                }
              }}
              onStart={async (gameId)=>{
                try {
                  const result = await startGame(gameId);
                  if (!result?.success) {
                    throw new Error('Failed to start game');
                  }
                } catch (error) {
                  console.error('Failed to start game:', error);
                  log('warn','Start failed', 'Check connection');
                }
              }}
              actionLoading={actionLoading}
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
                      {l.players >= 2 && (
                        <button className="btn glow" disabled={actionLoading === 'starting'} onClick={()=>startGame(l.gameId)}>
                          {actionLoading === 'starting' ? 'Starting...' : 'Start'}
                        </button>
                      )}
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

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.kind}`} onClick={() => removeToast(t.id)}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
