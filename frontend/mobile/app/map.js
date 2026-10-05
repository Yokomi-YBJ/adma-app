/**
 * ADMA — Écran Carte "Autour de moi"
 * Bbox large (35 km) pour inclure les providers enterprise lointains
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import {
  MapView, Camera, ShapeSource, CircleLayer, SymbolLayer, UserLocation,
} from '@maplibre/maplibre-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { colors } from '../constants/colors';
import api from '../services/api';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

// ── Limites Cameroun ──────────────────────────────────────────────
const CAMEROON = { west: 8.4, south: 1.6, east: 16.3, north: 13.2 };

// ── Polices hébergées par OpenFreeMap ─────────────────────────────
const FONT_REGULAR = ['Noto Sans Regular'];
const FONT_BOLD    = ['Noto Sans Bold'];

// ── Bbox initiale : ~35 km de côté ────────────────────────────────
// 0.35° de latitude ≈ 39 km, 0.35° de longitude ≈ 38 km à Ngaoundéré
const INITIAL_BBOX_DELTA = 0.35;

export default function MapScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const cameraRef     = useRef(null);
  const lastBoundsRef = useRef(null);

  const [providers, setProviders] = useState([]);
  const [loading, setLoading]     = useState(true);

  const initialLat = params.lat ? parseFloat(params.lat) : 7.3167;
  const initialLng = params.lng ? parseFloat(params.lng) : 13.5833;

  // ── Fetch avec bbox explicite ───────────────────────────────────
  const fetchProviders = useCallback(async ({ west, south, east, north }) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        north: String(north),
        south: String(south),
        east:  String(east),
        west:  String(west),
        lat:   String(initialLat),
        lng:   String(initialLng),
      });
      const res = await api.get(`/providers/map?${p}`);
      setProviders(res.data.data?.providers || []);
    } catch {
      setProviders([]);
    }
    setLoading(false);
  }, [initialLat, initialLng]);

  // ── Fetch initial — bbox large ──────────────────────────────────
  useEffect(() => {
    fetchProviders({
      west:  initialLng - INITIAL_BBOX_DELTA,
      east:  initialLng + INITIAL_BBOX_DELTA,
      south: initialLat - INITIAL_BBOX_DELTA,
      north: initialLat + INITIAL_BBOX_DELTA,
    });
  }, []);

  // ── Handler de changement de région ─────────────────────────────
  const handleRegionChange = useCallback((feature) => {
    const props = feature?.properties || {};
    const center = props.center;
    if (!center) return;
    const [lng, lat] = center;

    // Snap-back si on sort du Cameroun
    if (lng < CAMEROON.west || lng > CAMEROON.east || lat < CAMEROON.south || lat > CAMEROON.north) {
      cameraRef.current?.setCamera({
        centerCoordinate: [
          Math.min(Math.max(lng, CAMEROON.west), CAMEROON.east),
          Math.min(Math.max(lat, CAMEROON.south), CAMEROON.north),
        ],
        animationDuration: 300,
      });
      return;
    }

    // Bounds de la vue (MapLibre v10 → visibleBounds)
    const raw = props.visibleBounds || props.bounds;
    if (!Array.isArray(raw) || raw.length !== 4) return;

    const [west, south, east, north] = raw;

    // Élargir la bbox de 20% pour anticiper les déplacements légers
    const padLat = (north - south) * 0.2;
    const padLng = (east - west)  * 0.2;

    const paddedBounds = {
      west:  Math.max(west  - padLng, CAMEROON.west),
      east:  Math.min(east  + padLng, CAMEROON.east),
      south: Math.max(south - padLat, CAMEROON.south),
      north: Math.min(north + padLat, CAMEROON.north),
    };

    const key = `${paddedBounds.west},${paddedBounds.south},${paddedBounds.east},${paddedBounds.north}`;
    if (lastBoundsRef.current === key) return;
    lastBoundsRef.current = key;

    fetchProviders(paddedBounds);
  }, [fetchProviders]);

  // ── GeoJSON ─────────────────────────────────────────────────────
  const geojson = {
    type: 'FeatureCollection',
    features: providers
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => ({
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
        onRegionDidChange={handleRegionChange}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [initialLng, initialLat],
            zoomLevel: 10,
          }}
          maxZoomLevel={16}
          minZoomLevel={6}
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
          {/* Clusters */}
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

          <SymbolLayer
            id="clusters-count"
            filter={['has', 'point_count']}
            style={{
              textField: ['get', 'point_count_abbreviated'],
              textSize: 13,
              textColor: '#FFFFFF',
              textFont: FONT_BOLD,
              textAllowOverlap: true,
            }}
          />

          {/* Marqueurs individuels */}
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

          {/* Noms des providers */}
          <SymbolLayer
            id="unclustered-label"
            filter={['!', ['has', 'point_count']]}
            style={{
              textField:           ['get', 'name'],
              textSize:            12,
              textColor:           colors.navy,
              textFont:            FONT_BOLD,
              textAnchor:          'top',
              textOffset:          [0, 1.4],
              textMaxWidth:        8,
              textHaloColor:       '#FFFFFF',
              textHaloWidth:       1.5,
              textAllowOverlap:    false,
              textIgnorePlacement: false,
              textOptional:        false,
            }}
          />
        </ShapeSource>
      </MapView>

      <View
        pointerEvents="box-none"
        style={[styles.overlay, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <X size={18} color={colors.navy} strokeWidth={2.5} />
          <Text style={styles.backText}>{t('map.backToList')}</Text>
        </TouchableOpacity>

        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {loading
              ? t('map.loading')
              : t('map.results', { count: providers.length })}
          </Text>
          {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  map:  { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  backBtn: {
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