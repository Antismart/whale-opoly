import { createContext, type ReactNode } from 'react';

export interface DojoContextType {
  coreProvider?: any;
  sdk?: any;
}

export const DojoContext = createContext<DojoContextType>({});

export interface DojoProviderProps {
  children: ReactNode;
  coreProvider?: any;
  sdk?: any;
}

export function DojoProvider({ children, coreProvider, sdk }: DojoProviderProps) {
  return (
    <DojoContext.Provider value={{ coreProvider, sdk }}>
      {children}
    </DojoContext.Provider>
  );
}