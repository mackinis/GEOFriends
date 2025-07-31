
"use client";

import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { LocateFixed, Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { BrandingSettings, getBrandingSettings, getTimingSettings, TimingSettings } from "@/app/actions/settings";
import { useGeolocation } from "@/context/geolocation-context";
import { useMapFlyTo } from "@/context/map-fly-to-context";

interface Position {
  lat: number;
  lng: number;
}

interface UserLocation extends Position {
  id: string;
  name: string;
  avatar?: string;
}

function MapComponent({ markerOpacity, timingSettings }: { markerOpacity: number, timingSettings: TimingSettings | null }) {
  const map = useMap();
  const { position: myPosition, lastUpdateTime } = useGeolocation();
  const { user } = useAuth();
  const [otherUsers, setOtherUsers] = useState<UserLocation[]>([]);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [isGpsActive, setIsGpsActive] = useState(true);
  const { flyTo, setFlyTo } = useMapFlyTo();
  const [recenterKey, setRecenterKey] = useState(0);

  // Effect to check for GPS inactivity
  useEffect(() => {
    if (!timingSettings) return;
    
    const interval = setInterval(() => {
      if (lastUpdateTime) {
        const secondsSinceUpdate = (new Date().getTime() - lastUpdateTime.getTime()) / 1000;
        setIsGpsActive(secondsSinceUpdate <= timingSettings.gpsInactiveTime);
      } else {
        // If lastUpdateTime is null, it means we never got a position
        setIsGpsActive(false);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [lastUpdateTime, timingSettings]);
  
  // Effect to pan map to user's location once obtained
  useEffect(() => {
    if (myPosition && map && !mapInitialized) {
        map.panTo(myPosition);
        map.setZoom(15);
        setMapInitialized(true);
    }
  }, [myPosition, map, mapInitialized])

  // Effect to handle flying to a specific location
  useEffect(() => {
    if (flyTo && map) {
        map.panTo(flyTo);
        map.setZoom(15);
        setFlyTo(null); // Reset after flying
    }
  }, [flyTo, map, setFlyTo]);

  // Effect to listen for other users' locations, but only if GPS is active
  useEffect(() => {
    if (!user || !isGpsActive) {
      setOtherUsers([]); // Clear other users if GPS is inactive
      return;
    }

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("status", "==", "aprobado"), where("online", "==", true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData: UserLocation[] = [];
      snapshot.forEach((doc) => {
        if (doc.id !== user.id) {
          const data = doc.data();
          if (data.location && typeof data.location.lat === 'number' && typeof data.location.lng === 'number') {
            usersData.push({
              id: doc.id,
              name: data.name,
              avatar: data.avatar,
              lat: data.location.lat,
              lng: data.location.lng,
            });
          }
        }
      });
      setOtherUsers(usersData);
    });

    return () => unsubscribe();
  }, [user, isGpsActive]);

  const handleCenterClick = useCallback(() => {
    if (map && myPosition) {
      map.panTo(myPosition);
      map.setZoom(15);
      setRecenterKey(k => k + 1); // Force re-render of the icon
    }
  }, [map, myPosition]);
  
  const showLoadingOverlay = !myPosition && !mapInitialized;
  const showGpsInactiveOverlay = !isGpsActive && mapInitialized;

  return (
    <>
      {myPosition && user && (
        <AdvancedMarker position={myPosition} title="Tu Ubicación">
          <div className="flex flex-col items-center" style={{ opacity: markerOpacity }}>
            <Avatar className="h-10 w-10 border-2 border-primary ring-2 ring-offset-2 ring-offset-background ring-primary shadow-lg">
              <AvatarImage
                src={user.avatar || "https://placehold.co/40x40.png"}
                data-ai-hint="user avatar"
                alt={user.name || "Tú"}
              />
              <AvatarFallback>{user.name?.charAt(0).toUpperCase() || 'T'}</AvatarFallback>
            </Avatar>
            <p className="text-xs font-bold text-white bg-primary rounded px-2 py-0.5 mt-2">Tú</p>
          </div>
        </AdvancedMarker>
      )}
      {otherUsers.map((otherUser) => (
        <AdvancedMarker key={otherUser.id} position={otherUser} title={otherUser.name}>
          <div className="flex flex-col items-center" style={{ opacity: markerOpacity }}>
             <Avatar className="h-10 w-10 border-2 border-muted shadow-lg">
               <AvatarImage
                src={otherUser.avatar || "https://placehold.co/40x40.png"}
                data-ai-hint="person avatar"
                alt={otherUser.name}
              />
              <AvatarFallback>{otherUser.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <p className="text-xs font-bold text-white bg-black/50 rounded px-2 py-0.5 mt-2">{otherUser.name}</p>
          </div>
        </AdvancedMarker>
      ))}
      <div className="absolute bottom-4 right-4 z-30">
        <Button key={recenterKey} size="icon" onClick={handleCenterClick} className="rounded-full shadow-lg bg-background/80 hover:bg-background/100 text-foreground" variant="outline">
          <LocateFixed className="h-5 w-5" />
          <span className="sr-only">Ubicarme</span>
        </Button>
      </div>
       {showLoadingOverlay && (
         <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-20 pointer-events-none">
            <div className="text-center p-4 bg-background/80 rounded-lg shadow-lg">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="font-semibold">Obteniendo tu ubicación...</p>
                <p className="text-sm text-muted-foreground">Por favor, espera a que se active el GPS.</p>
            </div>
         </div>
      )}
      {showGpsInactiveOverlay && (
         <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-20 pointer-events-none">
            <div className="text-center p-4 bg-background/90 rounded-lg shadow-lg border border-yellow-500/50">
                <WifiOff className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="font-semibold text-yellow-400">Buscando señal...</p>
            </div>
         </div>
      )}
    </>
  );
}


export default function Map() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [settings, setSettings] = useState<BrandingSettings | null>(null);
  const [timingSettings, setTimingSettings] = useState<TimingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllSettings() {
      try {
        const [brandingSettings, timings] = await Promise.all([
            getBrandingSettings(),
            getTimingSettings()
        ]);
        setSettings(brandingSettings);
        setTimingSettings(timings);
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAllSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!apiKey) {
    return (
        <div className="flex h-full w-full items-center justify-center bg-destructive text-destructive-foreground p-4 text-center">
            <p>La clave de la API de Google Maps no está configurada en las variables de entorno (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).</p>
        </div>
    );
  }

  const defaultCenter = { lat: -34.6037, lng: -58.3816 }; // Buenos Aires, como fallback

  return (
    <APIProvider apiKey={apiKey} libraries={['marker']}>
        <div className="h-full w-full relative">
             <GoogleMap
                defaultCenter={defaultCenter}
                defaultZoom={12}
                mapId="geofriends-map"
                gestureHandling={'greedy'}
                disableDefaultUI={true}
                style={{width: '100%', height: '100%'}}
            >
              <MapComponent markerOpacity={settings?.markerOpacity ?? 1} timingSettings={timingSettings} />
            </GoogleMap>
        </div>
    </APIProvider>
  );
}
