import React from 'react';
import { sepolia } from '@starknet-react/chains';
import { StarknetConfig, jsonRpcProvider } from '@starknet-react/core';
import { ControllerConnector } from '@cartridge/connector';
import type { SessionPolicies } from '@cartridge/controller';

// Session policies for game contracts — pre-approve common game actions
// so players don't have to sign every move
const policies: SessionPolicies = {
  contracts: {
    // Contract addresses will be populated from manifest after deployment
    // For now, these are the methods that will be pre-approved
  },
  // Message signing policy for Dojo SNIP-12
  messages: [
    {
      types: {
        StarknetDomain: [
          { name: 'name', type: 'shortstring' },
          { name: 'version', type: 'shortstring' },
          { name: 'chainId', type: 'shortstring' },
          { name: 'revision', type: 'shortstring' },
        ],
        'whale_opoly-Message': [
          { name: 'identity', type: 'ContractAddress' },
          { name: 'channel', type: 'shortstring' },
          { name: 'content', type: 'ByteArray' },
          { name: 'timestamp', type: 'felt' },
          { name: 'salt', type: 'felt' },
        ],
      },
      primaryType: 'whale_opoly-Message',
      domain: {
        name: 'WhaleOpoly',
        version: '1',
        chainId: 'SN_SEPOLIA',
        revision: '1',
      },
    },
  ],
};

// IMPORTANT: Create connector OUTSIDE of React components.
// Creating inside a component causes recreation on every render.
const connector = new ControllerConnector({
  policies,
  // Cartridge RPC for Sepolia
  chains: [
    { rpcUrl: 'https://api.cartridge.gg/x/starknet/sepolia' },
  ],
  defaultChainId: '0x534e5f5345504f4c4941', // SN_SEPOLIA hex
});

// Use Cartridge's hosted RPC
const provider = jsonRpcProvider({
  rpc: () => ({
    nodeUrl: 'https://api.cartridge.gg/x/starknet/sepolia',
  }),
});

interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  return (
    <StarknetConfig
      autoConnect
      chains={[sepolia]}
      connectors={[connector]}
      provider={provider}
    >
      {children}
    </StarknetConfig>
  );
}
