import { useWallet } from './useWallet';

interface WalletStatusProps {
  action?: string;
}

export function WalletStatus({ action = 'action' }: WalletStatusProps) {
  const { isConnected, address } = useWallet();

  if (!isConnected) {
    return (
      <div className="wallet-status disconnected">
        <span className="status-icon">⚠️</span>
        Connect wallet to perform {action} on-chain
      </div>
    );
  }

  return (
    <div className="wallet-status connected">
      <span className="status-icon">✅</span>
      Ready for on-chain {action}
      <span className="wallet-address-short">
        ({address?.slice(0, 6)}...{address?.slice(-4)})
      </span>
    </div>
  );
}