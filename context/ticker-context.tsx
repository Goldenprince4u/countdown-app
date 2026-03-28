import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

const TickerContext = createContext<number>(Date.now());

export function TickerProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Standard 1-second interval
    const interval = setInterval(() => setNow(Date.now()), 1000);

    // AppState listener to force a sync when waking from background
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        setNow(Date.now());
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  return <TickerContext.Provider value={now}>{children}</TickerContext.Provider>;
}

export function useTickerContext(): number {
  return useContext(TickerContext);
}
