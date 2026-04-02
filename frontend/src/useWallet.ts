import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';

const CONNECTOR_KEY = 'whale-opoly-last-connector';

export function useWallet() {
  const { account, address, status } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect: rawDisconnect } = useDisconnect();

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const isDisconnected = status === 'disconnected';

  const connectWallet = async (connectorId?: string) => {
    const connector = connectorId
      ? connectors.find(c => c.id === connectorId)
      : connectors[0];

    if (connector) {
      try {
        localStorage.setItem(CONNECTOR_KEY, connector.id);
        await connect({ connector });
      } catch (error) {
        console.error('Connection error:', error);
        localStorage.removeItem(CONNECTOR_KEY);
      }
    }
  };

  const disconnect = () => {
    localStorage.removeItem(CONNECTOR_KEY);
    rawDisconnect();
  };

  return {
    account,
    address,
    isConnected,
    isConnecting,
    isDisconnected,
    connectWallet,
    disconnect,
    connectors: connectors.map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
    })),
  };
}