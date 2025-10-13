import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';

export function useWallet() {
  const { account, address, status } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();


  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const isDisconnected = status === 'disconnected';

  const connectWallet = async (connectorId?: string) => {
    const connector = connectorId
      ? connectors.find(c => c.id === connectorId)
      : connectors[0]; // Default to first available connector

    if (connector) {
      try {
        await connect({ connector });
      } catch (error) {
        console.error('Connection error:', error);
      }
    }
  };

  return {
    // Account info
    account,
    address,
    isConnected,
    isConnecting,
    isDisconnected,
    
    // Actions
    connectWallet,
    disconnect,
    
    // Available connectors
    connectors: connectors.map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
    })),
  };
}