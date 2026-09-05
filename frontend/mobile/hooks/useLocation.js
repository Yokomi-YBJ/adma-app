/**
 * ADMA — Hook géolocalisation
 * Demande la permission, récupère la position, gère les erreurs
 */
import { useState, useCallback } from 'react';
import * as Location from 'expo-location';

export function useLocation() {
  const [location,   setLocation]   = useState(null);  // { latitude, longitude }
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [permission, setPermission] = useState(null);  // 'granted'|'denied'|null

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Vérifier / demander la permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermission(status);

      if (status !== 'granted') {
        setError('permission_denied');
        setLoading(false);
        return null;
      }

      // Récupérer la position (précision équilibrée, timeout 10s)
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 0,
      });

      const coords = {
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setLocation(coords);
      setLoading(false);
      return coords;
    } catch (err) {
      setError('fetch_failed');
      setLoading(false);
      return null;
    }
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
  }, []);

  return { location, loading, error, permission, requestLocation, clearLocation };
}
