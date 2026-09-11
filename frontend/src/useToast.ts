import { useState, useCallback } from 'react';

export type Toast = {
  id: number;
  kind: 'success' | 'error' | 'info' | 'loading';
  message: string;
  /**
   * Starknet transaction hash. ToastStack renders it as a chip linking to
   * Sepolia Starkscan — pass it here rather than pasting the hash into a
   * message string.
   */
  txHash?: string;
}

let nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((kind: Toast['kind'], message: string, duration = 4000, txHash?: string) => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, kind, message, txHash }]);

    if (kind !== 'loading') {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((msg: string, txHash?: string) => addToast('success', msg, 4000, txHash), [addToast]);
  const error = useCallback((msg: string, txHash?: string) => addToast('error', msg, 6000, txHash), [addToast]);
  const info = useCallback((msg: string, txHash?: string) => addToast('info', msg, 4000, txHash), [addToast]);
  const loading = useCallback((msg: string) => addToast('loading', msg), [addToast]);

  return { toasts, addToast, removeToast, success, error, info, loading };
}
