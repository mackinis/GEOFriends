
"use client";

import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

interface Position {
  lat: number;
  lng: number;
}

interface MapFlyToContextType {
  flyTo: Position | null;
  setFlyTo: Dispatch<SetStateAction<Position | null>>;
}

const MapFlyToContext = createContext<MapFlyToContextType | undefined>(undefined);

export function MapFlyToProvider({ children }: { children: ReactNode }) {
  const [flyTo, setFlyTo] = useState<Position | null>(null);

  return (
    <MapFlyToContext.Provider value={{ flyTo, setFlyTo }}>
      {children}
    </MapFlyToContext.Provider>
  );
}

export function useMapFlyTo() {
  const context = useContext(MapFlyToContext);
  if (context === undefined) {
    throw new Error('useMapFlyTo must be used within a MapFlyToProvider');
  }
  return context;
}
