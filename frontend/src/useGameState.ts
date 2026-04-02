// NOTE: Neither useLobbies nor the former useGameState is currently imported
// anywhere in the app. This file is kept as a standalone lobby-management hook
// that can be wired in when needed. If it remains unused, it can be safely deleted.
//
// The old useGameState hook has been removed — game state now lives in gameStore.ts.
// The duplicate Player, GameState, and Lobby type definitions have been removed;
// shared types are re-exported from gameStore.ts.

import { useState, useEffect, useCallback } from 'react';
import { useDojoSDK } from '@dojoengine/sdk/react';
import { useAccount } from '@starknet-react/core';
import { CairoCustomEnum } from 'starknet';
import { fetchOpenLobbies } from './toriiGraph';

import type { Player, Lobby } from './gameStore';

// Re-export shared types so existing consumers (if any) don't break.
export type { Player, Lobby };

export function useLobbies() {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loading, setLoading] = useState(false);
  const { client } = useDojoSDK();
  const { account } = useAccount();

  const refreshLobbies = useCallback(async () => {
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
  }, []);

  const createLobby = async (maxPlayers: number, _host: string, entryEth: string) => {
    if (!client || !account) return null;

    try {
      // Map entryEth to GameTier CairoCustomEnum
      const tierName = entryEth === '0.01' ? 'Bronze'
        : entryEth === '0.1' ? 'Silver'
        : entryEth === '1' ? 'Gold'
        : entryEth === '10' ? 'Platinum'
        : 'Bronze';

      const tier = new CairoCustomEnum({ [tierName]: {} });
      const result = await client.game_manager.createGame(account, tier, maxPlayers);
      await refreshLobbies(); // Refresh after creation
      return result;
    } catch (error) {
      console.error('Failed to create lobby:', error);
      return null;
    }
  };

  const joinLobby = async (gameId: number, _playerName: string) => {
    if (!client || !account) return null;

    try {
      const result = await client.game_manager.joinGame(account, gameId);
      await refreshLobbies(); // Refresh after joining
      return result;
    } catch (error) {
      console.error('Failed to join lobby:', error);
      return null;
    }
  };

  useEffect(() => {
    refreshLobbies();

    // Set up polling for lobby updates
    const interval = setInterval(refreshLobbies, 10000);
    return () => clearInterval(interval);
  }, [refreshLobbies]);

  return {
    lobbies,
    loading,
    refreshLobbies,
    createLobby,
    joinLobby
  };
}
