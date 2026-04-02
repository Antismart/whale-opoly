import { useState, useCallback } from 'react';

export type Toast = {
  id: number;
  kind: 'success' | 'error' | 'info' | 'loading';
  message: string;
}

let nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((kind: Toast['kind'], message: string, duration = 4000) => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, kind, message }]);

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

  const success = useCallback((msg: string) => addToast('success', msg), [addToast]);
  const error = useCallback((msg: string) => addToast('error', msg, 6000), [addToast]);
  const info = useCallback((msg: string) => addToast('info', msg), [addToast]);
  const loading = useCallback((msg: string) => addToast('loading', msg), [addToast]);

  return { toasts, addToast, removeToast, success, error, info, loading };
}
