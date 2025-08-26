import { useState } from 'react';
import { useWallet } from './useWallet';

export function WalletButton() {
  const { 
    address, 
    isConnected, 
    isConnecting, 
    connectWallet, 
    disconnect, 
    connectors 
  } = useWallet();
  
  const [showConnectors, setShowConnectors] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className="wallet-connected">
        <button 
          className="btn wallet-btn connected"
          onClick={() => setShowConnectors(!showConnectors)}
        >
          <span className="wallet-icon">👛</span>
          {formatAddress(address)}
        </button>
        
        {showConnectors && (
          <div className="wallet-dropdown">
            <div className="wallet-info">
              <div className="wallet-address">
                Connected: {formatAddress(address)}
              </div>
            </div>
            <button 
              className="btn btn-disconnect"
              onClick={() => {
                disconnect();
                setShowConnectors(false);
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="wallet-disconnected">
      <button 
        className="btn wallet-btn"
        onClick={() => setShowConnectors(!showConnectors)}
        disabled={isConnecting}
      >
        <span className="wallet-icon">👛</span>
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
      
      {showConnectors && !isConnected && (
        <div className="wallet-dropdown">
          <div className="wallet-connectors">
            <div className="connector-title">Choose Wallet:</div>
            {connectors.map(connector => (
              <button
                key={connector.id}
                className="btn connector-btn"
                onClick={() => {
                  connectWallet(connector.id);
                  setShowConnectors(false);
                }}
                disabled={isConnecting}
              >
                {typeof connector.icon === 'string' && (
                  <img 
                    src={connector.icon} 
                    alt={connector.name}
                    className="connector-icon"
                  />
                )}
                {connector.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}