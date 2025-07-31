
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GeolocationState {
  lat: number;
  lng: number;
}

interface GeolocationContextType {
  position: GeolocationState | null;
  setPosition: (position: GeolocationState | null) => void;
  lastUpdateTime: Date | null;
  setLastUpdateTime: (date: Date | null) => void;
}

const GeolocationContext = createContext<GeolocationContextType | undefined>(undefined);

export function GeolocationProvider({ children }: { children: ReactNode }) {
  const [position, setPosition] = useState<GeolocationState | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  return (
    <GeolocationContext.Provider value={{ position, setPosition, lastUpdateTime, setLastUpdateTime }}>
      {children}
    </GeolocationContext.Provider>
  );
}

export function useGeolocation() {
  const context = useContext(GeolocationContext);
  if (context === undefined) {
    throw new Error('useGeolocation must be used within a GeolocationProvider');
  }
  return context;
}
