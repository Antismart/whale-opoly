import { useContext } from 'react';
import { DojoContext } from './DojoContext';

export const useDojo = () => {
  const context = useContext(DojoContext);
  if (!context.sdk) {
    throw new Error('useDojo must be used within a DojoProvider and SDK must be initialized');
  }
  return context.sdk;
};