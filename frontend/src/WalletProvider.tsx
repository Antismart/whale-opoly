import React from 'react';
import { sepolia } from '@starknet-react/chains';
import { StarknetConfig, jsonRpcProvider } from '@starknet-react/core';
import { ControllerConnector } from '@cartridge/connector';
import manifest from '../../contracts/manifest_sepolia.json';

// Extract contract addresses from manifest
function getContractAddress(tag: string): string {
  const contract = (manifest as any).contracts?.find((c: any) => c.tag?.includes(tag));
  return contract?.address || '';
}

const gameManagerAddr = getContractAddress('game_manager');
const boardActionsAddr = getContractAddress('board_actions');
const propertyMgmtAddr = getContractAddress('property_management');

// Session policies for game contracts — pre-approve common game actions
// so players don't have to sign every move
const policies = {
  contracts: {
    ...(gameManagerAddr ? {
      [gameManagerAddr]: {
        methods: [
          { name: 'Create Game', entrypoint: 'create_game' },
          { name: 'Join Game', entrypoint: 'join_game' },
          { name: 'Start Game', entrypoint: 'start_game' },
          { name: 'End Game', entrypoint: 'end_game' },
          { name: 'Cancel Game', entrypoint: 'cancel_game' },
        ],
      },
    } : {}),
    ...(boardActionsAddr ? {
      [boardActionsAddr]: {
        methods: [
          { name: 'Roll Dice', entrypoint: 'roll_dice' },
          { name: 'Move Player', entrypoint: 'move_player' },
          { name: 'Buy Property', entrypoint: 'buy_property' },
          { name: 'Pay Rent', entrypoint: 'pay_rent' },
          { name: 'Mortgage', entrypoint: 'mortgage_property' },
          { name: 'Unmortgage', entrypoint: 'unmortgage_property' },
          { name: 'Develop', entrypoint: 'develop_property' },
          { name: 'End Turn', entrypoint: 'end_turn' },
          { name: 'Pay Bail', entrypoint: 'pay_bail' },
          { name: 'Force Skip', entrypoint: 'force_skip_turn' },
        ],
      },
    } : {}),
    ...(propertyMgmtAddr ? {
      [propertyMgmtAddr]: {
        methods: [
          { name: 'Transfer Property', entrypoint: 'transfer_property' },
          { name: 'Auction Property', entrypoint: 'auction_property' },
          { name: 'Place Bid', entrypoint: 'place_bid' },
          { name: 'Finalize Auction', entrypoint: 'finalize_auction' },
        ],
      },
    } : {}),
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
