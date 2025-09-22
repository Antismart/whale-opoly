import { useMemo } from 'react';
import { useDojo } from './useDojo';
import { useWallet } from './useWallet';
import { useContext } from 'react';
import { DojoContext } from './DojoContext';
import { CairoCustomEnum, CallData } from 'starknet';

export function useDojoContracts() {
  const sdk = useDojo();
  const { account, isConnected } = useWallet();
  const { coreProvider } = useContext(DojoContext);
  
  const contracts = useMemo(() => {
    if (!sdk) return null;
    
    console.log('Core provider available:', !!coreProvider);
    if (coreProvider) {
      console.log('Provider methods:', Object.keys(coreProvider));
    }
    
    return {
      // Game management functions using wallet account
      createGame: async (maxPlayers: number, entryEth: string) => {
        console.log('Creating game with max players:', maxPlayers, 'entry ETH:', entryEth);
        console.log('Wallet status - isConnected:', isConnected, 'account:', account ? 'exists' : 'null', 'address:', account?.address);
        
        if (!isConnected || !account) {
          console.warn('Wallet not connected, using fallback');
          return { gameId: Date.now() };
        }
        
        try {
          // Map entryEth to GameTier enum
          const tierName = entryEth === '0.01' ? 'Bronze' : 
                          entryEth === '0.1' ? 'Silver' :
                          entryEth === '1' ? 'Gold' :
                          entryEth === '10' ? 'Platinum' : 'Bronze';
          
          // Create the CairoCustomEnum for the tier
          const tier = new CairoCustomEnum({ [tierName]: {} });
          
          console.log('Calling create_game with account:', account.address, 'tier:', tierName, 'maxPlayers:', maxPlayers);
          
          // Check if core provider (real Dojo SDK) is available for real contract calls
          if (coreProvider) {
            console.log('Using real Dojo SDK for contract call');
            console.log('SDK available methods:', Object.keys(coreProvider));
            
            // Use the proper Dojo SDK pattern for contract execution
            // The SDK should have methods for executing systems
            try {
              if (typeof coreProvider.executeSync === 'function') {
                console.log('Using executeSync method');
                const result = await coreProvider.executeSync(account.address, "create_game", {
                  tier: tierName,
                  max_players: maxPlayers
                });
                console.log('Contract call result:', result);
                const gameId = result?.gameId || Date.now();
                return { gameId };
              } else if (coreProvider.provider && typeof coreProvider.provider.execute === 'function') {
                console.log('Using provider.execute method');
                const calldata = CallData.compile([tier, maxPlayers]);
                const result = await coreProvider.provider.execute(account, {
                  contractName: "game_manager",
                  entrypoint: "create_game", 
                  calldata
                }, "whale_opoly");
                console.log('Contract call result:', result);
                const gameId = result?.transaction_hash ? parseInt(result.transaction_hash.slice(-8), 16) : Date.now();
                return { gameId };
              } else {
                console.log('Available SDK methods:', Object.keys(coreProvider));
                console.log('No suitable execution method found on SDK, using fallback');
                const gameId = Date.now();
                return { gameId };
              }
            } catch (sdkError) {
              console.error('SDK execution failed:', sdkError);
              const gameId = Date.now();
              return { gameId };
            }
          } else {
            console.log('Core provider not available, using fallback');
            const gameId = Date.now();
            console.log('Generated fallback game ID:', gameId);
            return { gameId };
          }
        } catch (error) {
          console.error('Contract call failed:', error);
          console.log('Falling back to mock game ID');
          return { gameId: Date.now() };
        }
      },
      
      joinGame: async (gameId: number, playerName: string) => {
        console.log('Joining game:', gameId, 'as:', playerName);
        
        if (!isConnected || !account) {
          console.warn('Wallet not connected for join game');
          return { success: true };
        }
        
        try {
          console.log('Calling join_game with account:', account.address, 'gameId:', gameId);
          
          // Check if core provider is available for real contract calls
          if (coreProvider) {
            // Call the contract using the core provider
            const calldata = CallData.compile([gameId]);
            const result = await coreProvider.execute(account, {
              contractName: "game_manager",
              entrypoint: "join_game",
              calldata
            }, "whale_opoly");
            console.log('Join game result:', result);
            return { success: true };
          } else {
            console.log('Core provider not available, using fallback for join_game');
            return { success: true };
          }
        } catch (error) {
          console.error('Join game failed:', error);
          return { success: false };
        }
      },
      
      rollDice: async (gameId: number) => {
        console.log('Rolling dice for game:', gameId);
        
        if (!isConnected || !account) {
          console.warn('Wallet not connected for dice roll');
          const dice1 = Math.floor(Math.random() * 6) + 1;
          const dice2 = Math.floor(Math.random() * 6) + 1;
          return { dice1, dice2 };
        }
        
        try {
          // TODO: Call actual contract for random dice roll
          console.log('Would roll dice with account:', account.address);
          const dice1 = Math.floor(Math.random() * 6) + 1;
          const dice2 = Math.floor(Math.random() * 6) + 1;
          return { dice1, dice2 };
        } catch (error) {
          console.error('Dice roll failed:', error);
          const dice1 = Math.floor(Math.random() * 6) + 1;
          const dice2 = Math.floor(Math.random() * 6) + 1;
          return { dice1, dice2 };
        }
      },
      
      buyProperty: async (gameId: number, propertyId: number) => {
        console.log('Buying property:', propertyId, 'in game:', gameId);
        
        if (!isConnected || !account) {
          console.warn('Wallet not connected for property purchase');
          return { success: false };
        }
        
        try {
          // TODO: Call actual contract
          console.log('Would buy property with account:', account.address);
          return { success: true };
        } catch (error) {
          console.error('Buy property failed:', error);
          return { success: false };
        }
      },
      
      // Add more contract functions as needed
    };
  }, [sdk, account, isConnected, coreProvider]);
  
  return contracts;
}

// Hook for querying game state from Dojo
export function useDojoGameQuery(gameId?: number) {
  const sdk = useDojo();
  
  const query = useMemo(() => {
    if (!sdk || !gameId) return null;
    
    return {
      queryGameState: async () => {
        const response = await fetch(sdk.graphqlUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetGameState($gameId: String!) {
                whaleOpolyGameStateModels(where: { game_id: { eq: $gameId } }) {
                  edges {
                    node {
                      game_id
                      status
                      current_player
                      players
                      created_at
                    }
                  }
                }
              }
            `,
            variables: { gameId: gameId.toString() }
          })
        });
        
        const data = await response.json();
        return data.data?.whaleOpolyGameStateModels?.edges?.[0]?.node || null;
      },
      
      queryPlayerStates: async () => {
        const response = await fetch(sdk.graphqlUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetPlayerStates($gameId: String!) {
                whaleOpolyPlayerGameStateModels(where: { game_id: { eq: $gameId } }) {
                  edges {
                    node {
                      player
                      game_id
                      position
                      balance
                      is_in_jail
                      properties_owned
                    }
                  }
                }
              }
            `,
            variables: { gameId: gameId.toString() }
          })
        });
        
        const data = await response.json();
        return data.data?.whaleOpolyPlayerGameStateModels?.edges?.map((edge: { node: Record<string, unknown> }) => edge.node) || [];
      }
    };
  }, [sdk, gameId]);
  
  return query;
}