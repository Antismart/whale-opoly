import { useState, useEffect } from 'react';
import { useDojo } from './useDojo';
import { useDojoContracts, useDojoGameQuery } from './useDojoContracts';
import { fetchOpenLobbies } from './toriiGraph';

// Game state types matching the contract models
export type Player = { id: string; name: string; color: string }

export type GameState = {
  players: Player[]
  positions: Record<string, number>
  balances: Record<string, number>
  ownership: Record<number, string | undefined>
  houses: Record<number, number>
  currentIdx: number
}

export type Lobby = { 
  gameId: number; 
  host: string; 
  entryEth: string; 
  maxPlayers: number; 
  players: number 
}

export function useGameState(gameId?: number) {
  const sdk = useDojo();
  const contracts = useDojoContracts();
  const gameQuery = useDojoGameQuery(gameId);
  
  // Game state from Dojo or fallback to local state
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
  });

  // Query game state from Dojo
  useEffect(() => {
    if (gameId && gameQuery) {
      const fetchGameState = async () => {
        try {
          const gameState = await gameQuery.queryGameState();
          const playerStates = await gameQuery.queryPlayerStates();
          
          if (gameState && playerStates.length > 0) {
            // Convert Dojo data to local state format
            const players = playerStates.map((player: Record<string, unknown>, idx: number) => ({
              id: player.player_id,
              name: `Player ${idx + 1}`,
              color: ['#4da3ff', '#ff6b6b', '#3ecf8e', '#ffd166'][idx] || '#4da3ff'
            }));
            
            const positions = playerStates.reduce((acc: Record<string, number>, player: Record<string, unknown>) => {
              acc[player.player_id as string] = (player.position as number) || 0;
              return acc;
            }, {});
            
            const balances = playerStates.reduce((acc: Record<string, number>, player: Record<string, unknown>) => {
              acc[player.player_id as string] = (player.balance as number) || 1500;
              return acc;
            }, {});
            
            setGame(prev => ({
              ...prev,
              players,
              positions,
              balances,
              currentIdx: gameState.current_player || 0
            }));
          }
        } catch (error) {
          console.error('Failed to fetch game state from Dojo:', error);
        }
      };
      
      fetchGameState();
      
      // Set up polling for real-time updates
      const interval = setInterval(fetchGameState, 5000);
      return () => clearInterval(interval);
    }
  }, [gameId, gameQuery]);

  const updateGame = (updater: (prev: GameState) => GameState) => {
    setGame(updater);
  };

  // Contract functions for game actions
  const gameActions = {
    rollDice: async () => {
      if (contracts && gameId) {
        try {
          const result = await contracts.rollDice(gameId);
          return result;
        } catch (error) {
          console.error('Failed to roll dice:', error);
          return null;
        }
      }
      return null;
    },
    
    buyProperty: async (propertyId: number) => {
      if (contracts && gameId) {
        try {
          const result = await contracts.buyProperty(gameId, propertyId);
          return result;
        } catch (error) {
          console.error('Failed to buy property:', error);
          return null;
        }
      }
      return null;
    }
  };

  return {
    game,
    updateGame,
    gameActions,
    sdk // Expose SDK for direct access
  };
}

export function useLobbies() {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loading, setLoading] = useState(false);
  const sdk = useDojo();
  const contracts = useDojoContracts();

  const refreshLobbies = async () => {
    setLoading(true);
    try {
      // Fetch from actual Dojo GraphQL endpoint
      const dojoLobbies = await fetchOpenLobbies();
      setLobbies(dojoLobbies);
    } catch (error) {
      console.error('Failed to fetch lobbies from Dojo:', error);
      // Fallback to mock data
      const mockLobbies: Lobby[] = [
        { gameId: 1, host: 'Player1', entryEth: '0.10', maxPlayers: 6, players: 2 },
        { gameId: 2, host: 'Player2', entryEth: '0.50', maxPlayers: 4, players: 1 },
      ];
      setLobbies(mockLobbies);
    } finally {
      setLoading(false);
    }
  };

  const createLobby = async (maxPlayers: number, _host: string, entryEth: string) => {
    if (contracts) {
      try {
        const result = await contracts.createGame(maxPlayers, entryEth);
        await refreshLobbies(); // Refresh after creation
        return result;
      } catch (error) {
        console.error('Failed to create lobby:', error);
        return null;
      }
    }
    return null;
  };

  const joinLobby = async (gameId: number, playerName: string) => {
    if (contracts) {
      try {
        const result = await contracts.joinGame(gameId, playerName);
        await refreshLobbies(); // Refresh after joining
        return result;
      } catch (error) {
        console.error('Failed to join lobby:', error);
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    refreshLobbies();
    
    // Set up polling for lobby updates
    const interval = setInterval(refreshLobbies, 10000);
    return () => clearInterval(interval);
  }, [sdk]);

  return {
    lobbies,
    loading,
    refreshLobbies,
    createLobby,
    joinLobby
  };
}