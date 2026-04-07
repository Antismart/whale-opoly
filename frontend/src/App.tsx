
import { useState, useEffect } from 'react'
import './App.css'
import { WalletButton } from './WalletButton'
import { useDojoSDK, useEntityQuery, useModels } from "@dojoengine/sdk/react"
import { ToriiQueryBuilder, MemberClause } from "@dojoengine/sdk"
import { useAccount } from "@starknet-react/core"
import { CairoCustomEnum, RpcProvider } from "starknet"
import { useToast } from './useToast'
import { MonopolyBoard } from './components/MonopolyBoard'
import { PlayersPanel } from './components/PlayersPanel'
import { TileDetails } from './components/TileDetails'
import { ActionBar } from './components/ActionBar'
import { OnboardPanel } from './components/OnboardPanel'
import { DiceIcon, BoardIcon, EventIcon } from './components/Icons'
import { GameManual } from './components/GameManual'
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

  // Get data from Dojo Zustand store
  const gameStates = useModels("whale_opoly-GameState");
  const playerPositions = useModels("whale_opoly-PlayerPosition");
  const gameCurrencies = useModels("whale_opoly-GameCurrency");
  const properties = useModels("whale_opoly-Property");

  // Extract game data from Dojo entities
  const gameEntities = Object.values(gameStates);

  // Local game state — the single source of truth for the UI.
  // When Dojo entity subscriptions start returning real data, the
  // useEffect below will sync chain state into this local state.
  const [game, setGame] = useState({
    players: [
      { id: 'P1', name: 'Player 1', color: '#ff6b6b' },
      { id: 'P2', name: 'Player 2', color: '#4ecdc4' },
      { id: 'P3', name: 'Player 3', color: '#45b7d1' },
      { id: 'P4', name: 'Player 4', color: '#f9ca24' },
    ] as { id: string; name: string; color: string }[],
    currentIdx: 0,
    positions: { P1: 0, P2: 0, P3: 0, P4: 0 } as Record<string, number>,
    ownership: {} as Record<number, string | undefined>,
    balances: { P1: 1500, P2: 1500, P3: 1500, P4: 1500 } as Record<string, number>,
    houses: {} as Record<number, number>,
  });

  // Sync from blockchain when Dojo entities become available
  useEffect(() => {
    const gameEntries = Object.values(gameStates);
    if (gameEntries.length === 0) return; // No blockchain data yet

    const currentGame = gameEntries.find((g: any) => g.game_id === currentGameId) || gameEntries[0];
    if (!currentGame) return;

    // Build positions/balances from chain data
    const chainPositions = Object.fromEntries(
      Object.values(playerPositions).map((pos: any) => [pos.player, pos.position])
    );
    const chainBalances = Object.fromEntries(
      Object.values(gameCurrencies).map((c: any) => [c.player, c.balance])
    );
    const chainOwnership = Object.fromEntries(
      Object.values(properties).map((prop: any) => [prop.property_id, prop.owner])
    );

    if (Object.keys(chainPositions).length > 0 || Object.keys(chainBalances).length > 0) {
      setGame(prev => ({
        ...prev,
        positions: { ...prev.positions, ...chainPositions },
        balances: { ...prev.balances, ...chainBalances },
        ownership: { ...prev.ownership, ...chainOwnership },
      }));
    }
  }, [gameStates, playerPositions, gameCurrencies, properties, currentGameId]);
  
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
      const result = await client.board_actions.rollDice(account, currentGameId);

      // Parse dice values from the transaction receipt's DiceRolled event
      if (result?.transaction_hash) {
        try {
          const rpc = new RpcProvider({ nodeUrl: 'https://api.cartridge.gg/x/starknet/sepolia' });
          const receipt = await rpc.waitForTransaction(result.transaction_hash);

          // DiceRolled event has: game_id, player (keys), dice1, dice2, total, timestamp (data)
          if ('events' in receipt && Array.isArray(receipt.events) && receipt.events.length > 0) {
            for (const event of receipt.events) {
              // Event data contains dice values — dice1 and dice2 are the first two data fields
              if (event.data && event.data.length >= 4) {
                const dice1 = Number(BigInt(event.data[0]));
                const dice2 = Number(BigInt(event.data[1]));
                if (dice1 >= 1 && dice1 <= 6 && dice2 >= 1 && dice2 <= 6) {
                  return { dice1, dice2, success: true };
                }
              }
            }
          }
        } catch (receiptError) {
          console.error('Failed to parse dice from receipt:', receiptError);
        }
      }

      // Fallback: if receipt parsing fails, use local random
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      return { dice1, dice2, success: true };
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

  // Update local game state — all game logic flows through this function.
  const updateGame = (updater: (prev: typeof game) => typeof game) => {
    setGame(updater);
  };
  
  // --- Toast & loading state ---
  const { toasts, success: toastSuccess, error: toastError, info: toastInfo, removeToast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null) // 'creating' | 'joining' | 'rolling' | 'buying' | null

  // --- Core state ---
  const [section, setSection] = useState<'onboard'|'dashboard'|'play'|'manual'>('onboard')
  const [selected, setSelected] = useState(0)
  const [d1, setD1] = useState(1)
  const [d2, setD2] = useState(1)
  const [rolling, setRolling] = useState(false)
  const [feed, setFeed] = useState<{kind:'good'|'warn'|'info'; title:string; body:string; time:string}[]>([])
  const [mortgages, setMortgages] = useState<Record<number, boolean>>({})
  const [inJail, setInJail] = useState<Record<string, number>>({})
  const [lastRoll, setLastRoll] = useState(0)
  const [doublesCount, setDoublesCount] = useState(0)
  const [turnCount, setTurnCount] = useState(0)
  const [tradeOpen, setTradeOpen] = useState(false)
  const [tradeOffer, setTradeOffer] = useState<{ toPlayer: string; propertyId: number; price: number } | null>(null)
  const [auctionOpen, setAuctionOpen] = useState(false)
  const [auctionBid, setAuctionBid] = useState(0)
  // lobbies come from blockchain entities merged with local optimistic state
  const [gameOver, setGameOver] = useState<{ winner: typeof game.players[0] } | null>(null);
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

  async function handleGameOver(winner: typeof game.players[0]) {
    setGameOver({ winner });
    log('good', 'GAME OVER!', `${winner.name} wins the game!`);

    // Call contract to end the game
    if (account && client && currentGameId) {
      try {
        const { CairoOption, CairoOptionVariant } = await import('starknet');
        await client.game_manager.endGame(
          account,
          currentGameId,
          new CairoOption(CairoOptionVariant.Some, winner.id)
        );
        toastSuccess(`${winner.name} wins! Prizes distributed.`);
      } catch (error) {
        console.error('End game contract call failed:', error);
        toastError('Action may not sync to blockchain');
      }
    }
  }

  function checkBankruptcy(playerId: string) {
    const balance = game.balances[playerId] || 0;
    if (balance < 0) {
      log('warn', 'BANKRUPT!', `${game.players.find(p => p.id === playerId)?.name || playerId} is bankrupt and eliminated!`);
      // Mark player as bankrupt by removing from active players
      updateGame(g => ({
        ...g,
        players: g.players.filter(p => p.id !== playerId),
        // Transfer their properties back to unowned
        ownership: Object.fromEntries(
          Object.entries(g.ownership).map(([tid, owner]) =>
            [tid, owner === playerId ? undefined : owner]
          )
        ),
        // Remove their houses
        houses: Object.fromEntries(
          Object.entries(g.houses).map(([tid, count]) =>
            [tid, g.ownership[Number(tid)] === playerId ? 0 : count]
          )
        ),
      }));

      // Check if game is over (1 player left)
      const remainingPlayers = game.players.filter(p => p.id !== playerId);
      if (remainingPlayers.length === 1) {
        handleGameOver(remainingPlayers[0]);
      }
    }
  }

  function moveAndResolve(steps:number){
    const cur=game.players[game.currentIdx]; if(!cur) return; if((inJail[cur.id]||0)>0){ log('warn',`${cur.name} is in Jail`,'Pay bail or use pass'); return }
    const from=game.positions[cur.id] || 0; const to=(from+steps)%40; const passGo=from+steps>=40
    updateGame(g=>({...g, positions:{...g.positions,[cur.id]:to}, balances: passGo?{...g.balances,[cur.id]:(g.balances[cur.id]||0)+200}:g.balances }))
    if(passGo) log('good',`${cur.name} passed Start`,'+$200')
    setSelected(to)
    const tile=monoTiles[to]; if(!tile) return
    if(tile.kind==='chance'){ drawCard('chance'); return }
    if(tile.kind==='chest'){ drawCard('chest'); return }
    if(tile.kind==='tax'){ updateGame(g=>({...g, balances:{...g.balances,[cur.id]:g.balances[cur.id]-100}})); log('warn',`${cur.name} paid Tax`,'-$100'); setTimeout(() => checkBankruptcy(cur.id), 100); return }
    if(tile.kind==='gotojail'){ updateGame(g=>({...g, positions:{...g.positions,[cur.id]:10}})); setInJail(j=>({...j,[cur.id]:3})); setSelected(10); log('warn',`${cur.name} went to Jail`,'3 turns or $50'); return }
    if(['property','rail','utility'].includes(tile.kind)){
      const owner=game.ownership[to]; if(owner && owner!==cur.id && !mortgages[to]){
        const baseRent = Math.max(10, Math.floor((price[to]||100) * 0.1));
        const houseCount = game.houses[to] || 0;
        const multipliers = [1, 5, 15, 45, 62, 75];
        let rent = baseRent * (multipliers[houseCount] || 1);
        if([5,15,25,35].includes(to)){ const count=[5,15,25,35].filter(r=>game.ownership[r]===owner).length; rent=[0,25,50,100,200][count] }
        if([12,28].includes(to)){ const count=[12,28].filter(u=>game.ownership[u]===owner).length; rent=(count===2?10:4)*Math.max(2,lastRoll||7) }
        updateGame(g=>({...g, balances:{...g.balances, [cur.id]:g.balances[cur.id]-rent, [owner]:(g.balances[owner]||0)+rent }}))
        log('info',`${cur.name} paid rent`, `-$${rent} to ${owner}`)
      }
    }
    // Check for bankruptcy after all deductions
    setTimeout(() => checkBankruptcy(cur.id), 100);
  }
  function handleDoublesAndMove(dice1: number, dice2: number) {
    setD1(dice1);
    setD2(dice2);
    setLastRoll(dice1 + dice2);

    const isDoubles = dice1 === dice2;
    if (isDoubles) {
      const newCount = doublesCount + 1;
      setDoublesCount(newCount);
      if (newCount >= 3) {
        // Three doubles = jail
        setDoublesCount(0);
        updateGame(g => ({...g, positions: {...g.positions, [game.players[game.currentIdx].id]: 10}}));
        setInJail(j => ({...j, [game.players[game.currentIdx].id]: 3}));
        setSelected(10);
        log('warn', 'Three Doubles!', `${game.players[game.currentIdx].name} rolled doubles 3 times — sent to Jail!`);
        setRolling(false);
        return;
      }
      log('info', 'Doubles!', `${game.players[game.currentIdx].name} rolled doubles — gets another turn!`);
    } else {
      setDoublesCount(0);
    }

    setRolling(false);
    moveAndResolve(dice1 + dice2);
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
            await client.board_actions.movePlayer(account, currentGameId);
          } catch (error) {
            console.error('Move player contract call failed:', error);
            toastError('Action may not sync to blockchain');
          }
        }
        setTimeout(() => handleDoublesAndMove(dojoResult.dice1, dojoResult.dice2), 420);
        return;
      }
    } catch (error) {
      console.error('Dojo dice roll failed:', error);
    }

    // Fallback to local dice roll if contract call fails
    const r1=1+Math.floor(Math.random()*6);
    const r2=1+Math.floor(Math.random()*6);
    setTimeout(() => handleDoublesAndMove(r1, r2), 420);
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
        // Update local state to reflect the purchase
        updateGame(g => ({
          ...g,
          ownership: { ...g.ownership, [id]: cur.id },
          balances: { ...g.balances, [cur.id]: (g.balances[cur.id] || 0) - cost },
        }));
        log('good','Bought via Dojo',`${t.label} $${cost}`);
        return;
      }
    } catch (error) {
      console.error('Dojo buy property failed:', error);
    }

    // Fallback: update locally even if contract call failed
    updateGame(g => ({
      ...g,
      ownership: { ...g.ownership, [id]: cur.id },
      balances: { ...g.balances, [cur.id]: (g.balances[cur.id] || 0) - cost },
    }));
    log('good','Bought (local)',`${t.label} $${cost}`);
  }
  async function buildHouse(id:number){ const t=monoTiles[id]; if(!t||t.kind!=='property') return; const cur=game.players[game.currentIdx]; if(!cur) return; if(game.ownership[id]!==cur.id) return log('warn','Not owner',''); if(!ownsGroup(cur.id,id)) return log('warn','Need set',''); const current=game.houses[id]||0; if(current>=5) return log('warn','Max built',''); const cost=current===4?houseCost[id]*2:houseCost[id]; if((game.balances[cur.id]||0)<cost) return log('warn','Need funds',`$${cost}`); if (account && client && currentGameId) { try { await client.board_actions.developProperty(account, currentGameId, id); } catch (error) { console.error('Develop property contract call failed:', error); toastError('Action may not sync to blockchain'); } } updateGame(g=>({...g, houses:{...g.houses,[id]:current+1}, balances:{...g.balances,[cur.id]:(g.balances[cur.id]||0)-cost}})); log('good', current===4?'Hotel built':'House built', `-$${cost}`) }
  async function mortgageProperty(id:number){ if(mortgages[id]) return log('warn','Already mortgaged',''); const cur=game.players[game.currentIdx]; if(!cur) return; if(game.ownership[id]!==cur.id) return log('warn','Not owner',''); const val=Math.floor((price[id]||0)/2); if (account && client && currentGameId) { try { await client.board_actions.mortgageProperty(account, currentGameId, id); } catch (error) { console.error('Mortgage contract call failed:', error); toastError('Action may not sync to blockchain'); } } setMortgages(m=>({...m,[id]:true})); updateGame(g=>({...g, balances:{...g.balances,[cur.id]:(g.balances[cur.id]||0)+val}})); log('info','Mortgaged',`+$${val}`) }
  async function unmortgageProperty(id:number){ if(!mortgages[id]) return; const cur=game.players[game.currentIdx]; if(!cur) return; const val=Math.floor((price[id]||0)/2)*1.1; if((game.balances[cur.id]||0)<val) return log('warn','Need funds',`$${val}`); if (account && client && currentGameId) { try { await client.board_actions.unmortgageProperty(account, currentGameId, id); } catch (error) { console.error('Unmortgage contract call failed:', error); toastError('Action may not sync to blockchain'); } } setMortgages(m=>{const n={...m}; delete n[id]; return n}); updateGame(g=>({...g, balances:{...g.balances,[cur.id]:(g.balances[cur.id]||0)-val}})); log('info','Unmortgaged',`-$${val}`) }
  async function payBail(){ const cur=game.players[game.currentIdx]; if(!cur) return; if((inJail[cur.id]||0)===0) return; if((game.balances[cur.id]||0)<50) return log('warn','Need $50',''); if (account && client && currentGameId) { try { await client.board_actions.payBail(account, currentGameId); } catch (error) { console.error('Pay bail contract call failed:', error); toastError('Action may not sync to blockchain'); } } updateGame(g=>({...g, balances:{...g.balances,[cur.id]:(g.balances[cur.id]||0)-50}})); setInJail(j=>({...j,[cur.id]:0})); log('good','Bail paid','Freed') }
  async function endTurn(){
    if(openCard) return log('warn','Resolve card','Apply first');

    // If player rolled doubles, don't advance turn (they go again)
    if (doublesCount > 0 && !openCard) {
      log('info', 'Extra Turn', `${curPlayer.name} gets another roll from doubles`);
      return; // Don't advance — player rolls again
    }
    setDoublesCount(0);

    // Turn limit check
    const newTurnCount = turnCount + 1;
    setTurnCount(newTurnCount);

    if (newTurnCount >= 100) {
      // Game over — highest balance wins
      const winner = [...game.players].sort((a, b) => (game.balances[b.id] || 0) - (game.balances[a.id] || 0))[0];
      if (winner) {
        handleGameOver(winner);
        log('warn', 'Turn Limit!', `100 turns reached — ${winner.name} wins by highest balance!`);
        return;
      }
    }

    if (account && client && currentGameId) { try { await client.board_actions.endTurn(account, currentGameId); } catch (error) { console.error('End turn contract call failed:', error); toastError('Action may not sync to blockchain'); } }
    updateGame(g=>({...g, currentIdx:(g.currentIdx+1)%g.players.length }));
    setInJail(j=>{ const n={...j}; Object.keys(n).forEach(k=>{ if(n[k]>0) n[k]-=1 }); return n });
  }

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
            <span>Lobby</span>
          </button>
          <button className={`navItem ${section==='dashboard'?'active':''}`} onClick={()=>setSection('dashboard')}>
            <span className="icon" aria-hidden>{DiceIcon}</span>
            <span>Harbor</span>
          </button>
          <button className={`navItem ${section==='play'?'active':''}`} onClick={()=>setSection('play')}>
            <span className="icon" aria-hidden>{BoardIcon}</span>
            <span>Play</span>
          </button>
          <button className={`navItem ${section==='manual'?'active':''}`} onClick={()=>setSection('manual')}>
            <span className="icon" aria-hidden>{EventIcon}</span>
            <span>Manual</span>
          </button>
        </nav>
        <div className="sideFooter">
          <div className="chip">Starknet Testnet</div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="crumbs">
            <span className="crumb">{section === 'onboard' ? 'Lobby' : section === 'play' ? 'Game Board' : section === 'manual' ? 'Game Manual' : 'Harbor'}</span>
          </div>
          <div className="actions">
            <WalletButton />
          </div>
        </header>

        {section==='onboard' && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <h1>
                  Dive In. Stake. Conquer.
                  <span className="sparkle"/>
                </h1>
                <p>Create a game or join the depths.</p>
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
              onCancel={async (gameId) => {
                if (!account || !client) return;
                try {
                  await client.game_manager.cancelGame(account, gameId);
                  toastSuccess('Lobby cancelled');
                  setLocalLobbies(prev => prev.filter(l => l.gameId !== gameId));
                  log('info', 'Lobby Cancelled', `Game #${gameId} cancelled and refunded`);
                } catch (error) {
                  console.error('Cancel game failed:', error);
                  toastError('Failed to cancel — only the creator can cancel');
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
                    <div className="stat"><div className="statLabel">Cards left</div><div className="statValue">Ch {chanceDeck.length} • Cs {chestDeck.length}</div></div>
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
                onTrade={() => setTradeOpen(true)}
                onAuction={() => {
                  if (!canBuy) { toastInfo('Select an unowned property to auction'); return; }
                  setAuctionOpen(true);
                  setAuctionBid(Math.floor((price[selected] || 100) / 2));
                }}
                balances={game.balances}
              />
              {/* Force skip if opponent is taking too long */}
              {account && game.players[game.currentIdx]?.id !== account.address && (
                <button
                  className="btn outline small"
                  style={{ marginTop: 8 }}
                  onClick={async () => {
                    if (!client || !currentGameId) return;
                    try {
                      await client.board_actions.forceSkipTurn(account, currentGameId);
                      toastSuccess('Turn skipped!');
                      log('info', 'Turn Skipped', 'Timed-out player was skipped');
                    } catch (error) {
                      console.error('Force skip failed:', error);
                      toastError('Cannot skip yet — turn may not be timed out');
                    }
                  }}
                >
                  Force Skip Turn (timeout)
                </button>
              )}
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
                <span className="icon" aria-hidden>{DiceIcon}</span>
                Cards & Decks
              </div>
              <div className="tileDetails" style={{ fontSize: 13 }}>
                <div className="row">
                  <span>Chance deck</span>
                  <span>{chanceDeck.length} cards remaining</span>
                </div>
                <div className="row">
                  <span>Chest deck</span>
                  <span>{chestDeck.length} cards remaining</span>
                </div>
                {game.players.map(p => {
                  const passes = jailPasses[p.id] || 0;
                  const ownedCount = Object.values(game.ownership).filter(o => o === p.id).length;
                  return (
                    <div key={p.id} className="row">
                      <span style={{ color: p.color, fontWeight: 600 }}>{p.name}</span>
                      <span>
                        {ownedCount} properties
                        {passes > 0 && <span style={{ marginLeft: 8, color: 'var(--accent)' }}>🎟 {passes} jail pass{passes > 1 ? 'es' : ''}</span>}
                      </span>
                    </div>
                  );
                })}
                {curPlayer.id && (inJail[curPlayer.id] || 0) > 0 && (
                  <div className="row" style={{ color: 'var(--warn)' }}>
                    <span>⛓ {curPlayer.name} in Jail</span>
                    <span>{inJail[curPlayer.id]} turn{inJail[curPlayer.id] > 1 ? 's' : ''} left</span>
                  </div>
                )}
              </div>

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

        {section==='manual' && (
          <section className="panel">
            <GameManual />
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

      {/* Game over victory overlay */}
      {gameOver && (
        <div className="cardModal" role="dialog" aria-modal="true">
          <div className="cardPanel" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>&#x1F40B;</div>
            <div className="cardTitle" style={{ fontSize: 24 }}>Victory!</div>
            <div className="cardBody">
              <span style={{ color: gameOver.winner.color, fontWeight: 700 }}>{gameOver.winner.name}</span> has conquered the depths!
            </div>
            <div style={{ color: 'var(--gold)', fontSize: 18, fontWeight: 700, margin: '12px 0' }}>
              Final Balance: ${(game.balances[gameOver.winner.id] || 0).toLocaleString()}
            </div>
            <div className="cardActions" style={{ justifyContent: 'center' }}>
              <button className="btn glow" onClick={() => { setGameOver(null); setSection('onboard'); }}>
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insert card modal at root level so it overlays */}
      {openCard && (
        <div className="cardModal" role="dialog" aria-modal="true">
          <div className="cardPanel">
            <div className="cardHeader">
              <span className={`deckTag ${openCard.deck}`}>{openCard.deck==='chance'?'Chance':'Chest'}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                Drawn by <strong style={{ color: curPlayer.color }}>{curPlayer.name}</strong>
              </span>
              <button className="closeBtn" onClick={()=>setOpenCard(undefined)} aria-label="Close">&times;</button>
            </div>
            <div className="cardTitle">{openCard.title}</div>
            <div className="cardBody">
              {openCard.text}
              {openCard.action.kind === 'money' && (
                <div style={{ marginTop: 8, fontWeight: 700, color: openCard.action.amount >= 0 ? 'var(--good)' : 'var(--danger, #ef4444)' }}>
                  {openCard.action.amount >= 0 ? '+' : '-'}${Math.abs(openCard.action.amount)}
                </div>
              )}
              {openCard.action.kind === 'jail_pass' && (
                <div style={{ marginTop: 8, color: 'var(--accent)' }}>This card is kept until used.</div>
              )}
            </div>
            <div className="cardActions">
              {openCard.action.kind==='jail_pass' && <span className="chip" style={{ color: 'var(--accent)', borderColor: 'rgba(14,165,233,0.3)' }}>Keep Card</span>}
              <button className="btn glow" onClick={()=>applyCard(openCard)}>Apply</button>
            </div>
          </div>
        </div>
      )}
      {/* Add floating jail pass use button if applicable */}
      {hasJailPass && curPlayer.id && (inJail[curPlayer.id]||0)>0 && (
        <button className="floatingBtn" onClick={useJailPass}>Use Jail Pass ({jailPasses[curPlayer.id] || 0})</button>
      )}

      {/* Trade dialog */}
      {tradeOpen && (
        <div className="cardModal" role="dialog" aria-modal="true">
          <div className="cardPanel">
            <div className="cardHeader">
              <span className="deckTag chance">Trade</span>
              <button className="closeBtn" onClick={() => { setTradeOpen(false); setTradeOffer(null); }} aria-label="Close">&times;</button>
            </div>
            <div className="cardTitle">Propose a Trade</div>
            <div className="cardBody">
              {/* Select player to trade with */}
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Trade with:</label>
                <select
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text)', borderRadius: 8, padding: '8px 10px', width: '100%' }}
                  onChange={(e) => setTradeOffer(prev => ({ toPlayer: e.target.value, propertyId: prev?.propertyId || 0, price: prev?.price || 0 }))}
                  value={tradeOffer?.toPlayer || ''}
                >
                  <option value="">Select player...</option>
                  {game.players
                    .filter(p => p.id !== game.players[game.currentIdx]?.id)
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </div>

              {/* Select property to offer */}
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Your property to trade:</label>
                <select
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text)', borderRadius: 8, padding: '8px 10px', width: '100%' }}
                  onChange={(e) => setTradeOffer(prev => ({ toPlayer: prev?.toPlayer || '', propertyId: Number(e.target.value), price: prev?.price || 0 }))}
                  value={tradeOffer?.propertyId || 0}
                >
                  <option value={0}>Select property...</option>
                  {Object.entries(game.ownership)
                    .filter(([, owner]) => owner === game.players[game.currentIdx]?.id)
                    .map(([tileId]) => {
                      const tile = monoTiles[Number(tileId)];
                      return tile ? (
                        <option key={tileId} value={tileId}>{tile.label}</option>
                      ) : null;
                    })}
                </select>
              </div>

              {/* Price */}
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Asking price ($):</label>
                <input
                  type="number"
                  min={0}
                  value={tradeOffer?.price || ''}
                  onChange={(e) => setTradeOffer(prev => ({ toPlayer: prev?.toPlayer || '', propertyId: prev?.propertyId || 0, price: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="cardActions">
              <button className="btn ghost" onClick={() => { setTradeOpen(false); setTradeOffer(null); }}>Cancel</button>
              <button
                className="btn glow"
                disabled={!tradeOffer?.toPlayer || !tradeOffer?.propertyId}
                onClick={async () => {
                  if (!tradeOffer?.toPlayer || !tradeOffer?.propertyId) return;
                  const cur = game.players[game.currentIdx];
                  if (!cur) return;

                  // Try contract call
                  if (account && client && currentGameId) {
                    try {
                      await client.property_management.transferProperty(
                        account, currentGameId, tradeOffer.propertyId, tradeOffer.toPlayer, tradeOffer.price
                      );
                      toastSuccess('Trade completed!');
                    } catch (error) {
                      console.error('Trade contract call failed:', error);
                      toastError('Action may not sync to blockchain');
                    }
                  }

                  // Local state update
                  updateGame(g => ({
                    ...g,
                    ownership: { ...g.ownership, [tradeOffer.propertyId]: tradeOffer.toPlayer },
                    balances: {
                      ...g.balances,
                      [cur.id]: (g.balances[cur.id] || 0) + tradeOffer.price,
                      [tradeOffer.toPlayer]: (g.balances[tradeOffer.toPlayer] || 0) - tradeOffer.price,
                    }
                  }));

                  const tradeTile = monoTiles[tradeOffer.propertyId];
                  log('good', 'Trade Complete', `${tradeTile?.label || 'Property'} sold for $${tradeOffer.price}`);
                  setTradeOpen(false);
                  setTradeOffer(null);
                }}
              >
                Execute Trade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auction dialog */}
      {auctionOpen && (
        <div className="cardModal" role="dialog" aria-modal="true">
          <div className="cardPanel">
            <div className="cardHeader">
              <span className="deckTag chance">Auction</span>
              <button className="closeBtn" onClick={() => setAuctionOpen(false)} aria-label="Close">&times;</button>
            </div>
            <div className="cardTitle">Auction: {monoTiles[selected]?.label || `Tile ${selected}`}</div>
            <div className="cardBody">
              <p style={{ color: 'var(--muted)', marginBottom: 12 }}>
                Starting price: ${price[selected] || 0}. Place your bid below.
              </p>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Your bid ($):</label>
                <input
                  type="number"
                  min={1}
                  value={auctionBid}
                  onChange={(e) => setAuctionBid(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="cardActions">
              <button className="btn ghost" onClick={() => setAuctionOpen(false)}>Cancel</button>
              <button
                className="btn glow"
                disabled={auctionBid <= 0 || auctionBid > (game.balances[curPlayer.id] || 0)}
                onClick={async () => {
                  if (account && client && currentGameId) {
                    try {
                      await client.property_management.auctionProperty(account, currentGameId, selected, auctionBid);
                      toastSuccess('Auction started!');
                    } catch (error) {
                      console.error('Auction contract call failed:', error);
                      toastError('Auction may not sync to blockchain');
                    }
                  }
                  // Local: just buy at bid price as a simplified auction
                  updateGame(g => ({
                    ...g,
                    ownership: { ...g.ownership, [selected]: curPlayer.id },
                    balances: { ...g.balances, [curPlayer.id]: (g.balances[curPlayer.id] || 0) - auctionBid },
                  }));
                  log('good', 'Auction Won', `${monoTiles[selected]?.label || 'Property'} bought for $${auctionBid}`);
                  setAuctionOpen(false);
                }}
              >
                Place Bid
              </button>
            </div>
          </div>
        </div>
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
