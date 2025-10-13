import React from 'react';
import { StarknetConfig, publicProvider, argent, braavos } from '@starknet-react/core';
import { sepolia, mainnet } from '@starknet-react/chains';
import { ControllerConnector } from '@cartridge/connector';

// Define available connectors
function getConnectors() {
  const controllerConnector = new ControllerConnector({});

  return [
    controllerConnector,
    argent(),
    braavos(),
  ];
}

interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  return (
    <StarknetConfig
      chains={[sepolia, mainnet]}
      provider={publicProvider()}
      connectors={getConnectors()}
    >
      {children}
    </StarknetConfig>
  );
}