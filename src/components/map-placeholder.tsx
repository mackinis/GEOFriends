
"use client";

import { useGeolocation } from "@/context/geolocation-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, User } from "lucide-react";

export default function MapPlaceholder() {
  const { position } = useGeolocation();

  // Convert lat/lng to a percentage-based position for this placeholder
  // This is a simplified conversion and not a real map projection.
  const getPositionStyle = (lat: number, lng: number): React.CSSProperties => {
    const x = (lng + 180) % 360 / 360 * 100;
    const y = (90 - lat) % 180 / 180 * 100;
    return {
      top: `${y}%`,
      left: `${x}%`,
      position: 'absolute',
      transform: 'translate(-50%, -50%)',
    };
  };

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-muted/20 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      
      <div className="text-center text-muted-foreground z-10 pointer-events-none">
        <MapPin className="mx-auto h-16 w-16 text-accent text-glow" />
        <h2 className="mt-2 text-xl font-semibold">Vista de Mapa</h2>
        <p>Las ubicaciones de los usuarios se mostrarán aquí.</p>
      </div>
      
      {/* Marcadores de usuario falsos */}
      <div className="absolute top-[20%] left-[30%] flex flex-col items-center z-10 animate-pulse">
        <User className="h-8 w-8 text-accent-foreground fill-accent" />
        <p className="text-xs font-bold text-white bg-black/50 rounded px-2 py-0.5 mt-1">Alicia</p>
      </div>
      <div className="absolute top-[50%] left-[70%] flex flex-col items-center z-10 animate-pulse" style={{ animationDelay: '0.5s' }}>
        <User className="h-8 w-8 text-accent-foreground fill-accent" />
        <p className="text-xs font-bold text-white bg-black/50 rounded px-2 py-0.5 mt-1">Roberto</p>
      </div>
       <div className="absolute top-[75%] left-[25%] flex flex-col items-center z-10 animate-pulse" style={{ animationDelay: '1s' }}>
        <User className="h-8 w-8 text-accent-foreground fill-accent" />
        <p className="text-xs font-bold text-white bg-black/50 rounded px-2 py-0.5 mt-1">Carlos</p>
      </div>

      {/* Marcador del usuario actual */}
      {position && (
        <div 
          className="flex flex-col items-center z-20"
          style={getPositionStyle(position.lat, position.lng)}
        >
          <Avatar className="h-10 w-10 border-2 border-primary ring-2 ring-offset-2 ring-offset-background ring-primary shadow-lg">
              <AvatarImage
                src="https://placehold.co/40x40.png"
                data-ai-hint="admin avatar"
                alt="Admin"
              />
              <AvatarFallback>A</AvatarFallback>
          </Avatar>
          <p className="text-xs font-bold text-white bg-primary rounded px-2 py-0.5 mt-2">Tú</p>
        </div>
      )}
    </div>
  );
}
