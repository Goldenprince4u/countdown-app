import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const TickerContext = createContext<number>(Date.now());

export function TickerProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return <TickerContext.Provider value={now}>{children}</TickerContext.Provider>;
}

export function useTickerContext(): number {
  return useContext(TickerContext);
}
