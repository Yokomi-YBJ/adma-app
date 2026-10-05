/**
 * ADMA — Écran Carte "Autour de moi"
 * Affiche les prestataires avec clustering natif MapLibre
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import {
  MapView, Camera, ShapeSource, CircleLayer, SymbolLayer, UserLocation,
} from '@maplibre/maplibre-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { colors } from '../constants/colors';
import api from '../services/api';

// Style OpenFreeMap : gratuit, sans clé API, couverture mondiale
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

export default function MapScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const cameraRef = useRef(null);
  const lastBoundsRef = useRef(null);

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  const initialLat = params.lat ? parseFloat(params.lat) : 7.3167;
  const initialLng = params.lng ? parseFloat(params.lng) : 13.5833;

  const fetchProviders = useCallback(async (bounds) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        north: bounds[1],
        south: bounds[3],
        east:  bounds[2],
        west:  bounds[0],
        lat:   initialLat,
        lng:   initialLng,
      });
      const res = await api.get(`/providers/map?${p}`);
      setProviders(res.data.data?.providers || []);
    } catch {
      setProviders([]);
    }
    setLoading(false);
  }, [initialLat, initialLng]);

  // Charger une première fois au démarrage (rayon ~5 km)
  useEffect(() => {
    const delta = 0.05; // ~5km
    fetchProviders([
      initialLng - delta,
      initialLat + delta,
      initialLng + delta,
      initialLat - delta,
    ]);
  }, []);

  // GeoJSON des prestataires
  const geojson = {
    type: 'FeatureCollection',
    features: providers.map((p) => ({
      type: 'Feature',
      id: p.id,
      geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
      properties: {
        id: p.id,
        name: p.name,
        plan: p.plan || 'free',
        verificationStatus: p.verification_status || 'none',
      },
    })),
  };

  return (
    <View style={styles.flex}>
      <MapView
        style={styles.map}
        mapStyle={MAP_STYLE}
        logoEnabled={false}
        attributionEnabled={false}
        onRegionDidChange={(feature) => {
          const bounds = feature?.properties?.bounds;
          if (!bounds) return;
          const key = bounds.join(',');
          if (lastBoundsRef.current === key) return;
          lastBoundsRef.current = key;
          fetchProviders(bounds);
        }}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [initialLng, initialLat],
            zoomLevel: 12,
          }}
        />

        <UserLocation visible={true} />

        <ShapeSource
          id="providers-source"
          shape={geojson}
          cluster={true}
          clusterRadius={50}
          clusterMaxZoom={14}
          onPress={(e) => {
            const feature = e?.features?.[0];
            if (!feature) return;

            if (feature.properties?.cluster) {
              cameraRef.current?.setCamera({
                centerCoordinate: feature.geometry.coordinates,
                zoomLevel: 15,
                animationDuration: 400,
              });
            } else if (feature.properties?.id) {
              router.push(`/provider/${feature.properties.id}`);
            }
          }}
        >
          {/* Cercles des clusters */}
          <CircleLayer
            id="clusters-circle"
            filter={['has', 'point_count']}
            style={{
              circleColor: colors.primary,
              circleRadius: ['step', ['get', 'point_count'], 20, 10, 28, 50, 36],
              circleOpacity: 0.9,
              circleStrokeWidth: 2,
              circleStrokeColor: '#FFFFFF',
            }}
          />
          {/* Nombre dans les clusters */}
          <SymbolLayer
            id="clusters-count"
            filter={['has', 'point_count']}
            style={{
              textField: ['get', 'point_count_abbreviated'],
              textSize: 13,
              textColor: '#FFFFFF',
              textFont: ['Open Sans Bold', 'Arial Unicode MS Bold'],
              textAllowOverlap: true,
            }}
          />
          {/* Marqueurs individuels — couleur selon plan */}
          <CircleLayer
            id="unclustered-circle"
            filter={['!', ['has', 'point_count']]}
            style={{
              circleColor: [
                'match', ['get', 'plan'],
                'free',         '#94A3B8',
                'premium',      '#5FC2BA',
                'professional', '#0B162C',
                'enterprise',   '#F59E0B',
                '#94A3B8',
              ],
              circleRadius: [
                'match', ['get', 'plan'],
                'free',         6,
                'premium',      8,
                'professional', 10,
                'enterprise',   12,
                6,
              ],
              circleStrokeWidth: 2,
              circleStrokeColor: '#FFFFFF',
            }}
          />
        </ShapeSource>
      </MapView>

      {/* Bouton retour liste */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 12 }]}
        onPress={() => router.back()}
        activeOpacity={0.85}
      >
        <X size={18} color={colors.navy} strokeWidth={2.5} />
        <Text style={styles.backText}>{t('map.backToList')}</Text>
      </TouchableOpacity>

      {/* Compteur */}
      <View style={[styles.counter, { top: insets.top + 12 }]}>
        <Text style={styles.counterText}>
          {loading
            ? t('map.loading')
            : t('map.results', { count: providers.length })}
        </Text>
        {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  map:  { flex: 1 },
  backBtn: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  backText: { fontSize: 14, fontWeight: '700', color: colors.navy },
  counter: {
    position: 'absolute',
    right: 16,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  counterText: { fontSize: 13, fontWeight: '700', color: colors.navy },
});