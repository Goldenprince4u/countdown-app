import React, { createContext, useContext, type ReactNode } from 'react';
import { useCountdowns } from '@/hooks/use-countdowns';

type CountdownContextValue = ReturnType<typeof useCountdowns>;

const CountdownContext = createContext<CountdownContextValue | null>(null);

export function CountdownProvider({ children }: { children: ReactNode }) {
  const value = useCountdowns();
  return <CountdownContext.Provider value={value}>{children}</CountdownContext.Provider>;
}

export function useCountdownContext(): CountdownContextValue {
  const ctx = useContext(CountdownContext);
  if (!ctx) throw new Error('useCountdownContext must be used inside <CountdownProvider>');
  return ctx;
}
