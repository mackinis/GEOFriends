
"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useGeolocation } from "@/context/geolocation-context";
import { getTimingSettings, TimingSettings } from "@/app/actions/settings";

export default function LocationTracker() {
  const { user } = useAuth();
  const { setPosition, setLastUpdateTime } = useGeolocation();
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  const setOffline = useCallback(() => {
    if (user) {
      const userRef = doc(db, "users", user.id);
      updateDoc(userRef, { online: false, location: null });
    }
    setLastUpdateTime(null);
    setPosition(null);
  }, [user, setLastUpdateTime, setPosition]);

  useEffect(() => {
    if (!user || !navigator.geolocation) {
      return;
    }

    const startGeolocationSequence = async () => {
      try {
        const settings = await getTimingSettings();
        if (!settings) {
            console.error("No se pudo obtener la configuración de tiempos.");
            return;
        }

        const getLocation = () => {
          navigator.geolocation.getCurrentPosition(
            (pos: GeolocationPosition) => {
              const newPosition = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              };
              setPosition(newPosition);
              setLastUpdateTime(new Date());

              if (user) {
                const userRef = doc(db, "users", user.id);
                updateDoc(userRef, {
                  location: newPosition,
                  online: true,
                });
              }
            },
            (error: GeolocationPositionError) => {
              if (error.code === error.PERMISSION_DENIED) {
                console.log("El usuario denegó los permisos de geolocalización.");
                setOffline();
                if (intervalIdRef.current) {
                  clearInterval(intervalIdRef.current);
                }
              } else {
                 console.log(`Error de geolocalización (Code: ${error.code}): ${error.message}`);
              }
            },
            {
              enableHighAccuracy: true,
              timeout: settings.gpsQueryTimeout,
              maximumAge: 0,
            }
          );
        };
        
        // Initial call to trigger permission prompt immediately
        getLocation();

        // Set up the interval for subsequent updates
        if (intervalIdRef.current) {
            clearInterval(intervalIdRef.current);
        }
        intervalIdRef.current = setInterval(getLocation, 15000); // Check every 15 seconds

      } catch(e) {
        console.error("Error al iniciar la secuencia de geolocalización:", e);
      }
    };
    
    startGeolocationSequence();

    const handleBeforeUnload = () => {
      setOffline();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setOffline();
    };
  }, [user, setOffline, setPosition, setLastUpdateTime]);

  return null;
}
