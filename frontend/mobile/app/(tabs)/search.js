import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, ScrollView, Alert, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal, X, Check, Navigation, MapPin, AlertCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors }             from '../../constants/colors';
import { CACHE_TTL, PLAN_RADIUS } from '../../constants/config';
import api                    from '../../services/api';
import { getCache, setCache } from '../../services/cache';
import { useAuthStore }       from '../../store/auth.store';
import { useLocation }        from '../../hooks/useLocation';
import { ProviderCard }       from '../../components/cards/ProviderCard';
import { EmptyState }         from '../../components/ui/EmptyState';
import { SkeletonProviderCard } from '../../components/ui/Skeleton';

const PAGE_SIZE = 20;

// ── Bannière permission GPS refusée ──────────────────────────────
function LocationPermissionBanner({ onDismiss }) {
  const { t } = useTranslation();
  return (
    <View style={banner.wrap}>
      <AlertCircle size={18} color={colors.warning} />
      <View style={{ flex: 1 }}>
        <Text style={banner.title}>Localisation désactivée</Text>
        <Text style={banner.body}>
          Activez la localisation dans les paramètres de votre téléphone pour voir les prestataires autour de vous.
        </Text>
      </View>
      <TouchableOpacity
        style={banner.btn}
        onPress={() => {
          Linking.openSettings();
          onDismiss();
        }}
      >
        <Text style={banner.btnText}>Activer</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDismiss} style={{ padding: 4 }}>
        <X size={16} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const banner = StyleSheet.create({
  wrap:    { flexDirection:'row', alignItems:'flex-start', gap:10, backgroundColor:colors.warningBg, padding:14, borderBottomWidth:1, borderBottomColor:colors.warning+'30' },
  title:   { fontSize:13, fontWeight:'700', color:colors.warning, marginBottom:2 },
  body:    { fontSize:12, color:'#92400E', lineHeight:16 },
  btn:     { backgroundColor:colors.warning, paddingHorizontal:12, paddingVertical:6, borderRadius:8 },
  btnText: { fontSize:12, fontWeight:'700', color:colors.white },
});

// ── Modal Filtres ─────────────────────────────────────────────────
function FilterModal({ visible, onClose, filters, setFilters, categories, cities, neighborhoods }) {
  const { t }  = useTranslation();
  const [draft, setDraft] = useState(filters);

  // Sync quand filters change de l'extérieur
  useEffect(() => { if (visible) setDraft(filters); }, [visible]);

  function apply() { setFilters(draft); onClose(); }
  function reset()  {
    const clear = { categoryId:null, cityId:null, neighborhoodId:null, verified:false, available:false };
    setDraft(clear); setFilters(clear); onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={fm.container}>
        <View style={fm.handle} />
        <View style={fm.header}>
          <Text style={fm.title}>Filtres</Text>
          <TouchableOpacity onPress={onClose}><X size={22} color={colors.text} /></TouchableOpacity>
        </View>
        <ScrollView style={fm.body} showsVerticalScrollIndicator={false}>

          {/* Catégorie */}
          <Text style={fm.label}>Catégorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={fm.chips}>
           {[{ id:null, name_fr:'Toutes' }, ...(categories || [])].map(c => (
              <TouchableOpacity
                key={c.id ?? 'all'}
                style={[fm.chip, draft.categoryId === c.id && fm.chipActive]}
                onPress={() => setDraft(d => ({ ...d, categoryId: c.id }))}
              >
                <Text style={[fm.chipText, draft.categoryId === c.id && fm.chipTextActive]}>{c.name_fr}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Ville */}
          <Text style={fm.label}>Ville</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={fm.chips}>
            {[{ id:null, name:'Toutes' }, ...(cities || [])].map(c => (
              <TouchableOpacity
                key={c.id ?? 'all'}
                style={[fm.chip, draft.cityId === c.id && fm.chipActive]}
                onPress={() => setDraft(d => ({ ...d, cityId:c.id, neighborhoodId:null }))}
              >
                <Text style={[fm.chipText, draft.cityId === c.id && fm.chipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quartier */}
          {draft.cityId && (
            <>
              <Text style={fm.label}>Quartier</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={fm.chips}>
                {[{ id:null, name:'Tous' }, ...neighborhoods.filter(n => n.city_id === draft.cityId)].map(n => (
                  <TouchableOpacity
                    key={n.id ?? 'all'}
                    style={[fm.chip, draft.neighborhoodId === n.id && fm.chipActive]}
                    onPress={() => setDraft(d => ({ ...d, neighborhoodId: n.id }))}
                  >
                    <Text style={[fm.chipText, draft.neighborhoodId === n.id && fm.chipTextActive]}>{n.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Toggles */}
          {[
            { key:'verified', label:'Vérifiés uniquement' },
            { key:'available', label:'Disponibles maintenant' },
          ].map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={fm.toggle}
              onPress={() => setDraft(d => ({ ...d, [key]: !d[key] }))}
            >
              <Text style={fm.toggleLabel}>{label}</Text>
              <View style={[fm.checkbox, draft[key] && fm.checkboxActive]}>
                {draft[key] && <Check size={13} color={colors.white} strokeWidth={3} />}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={fm.actions}>
          <TouchableOpacity style={fm.resetBtn} onPress={reset}>
            <Text style={fm.resetText}>Effacer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={fm.applyBtn} onPress={apply}>
            <Text style={fm.applyText}>Appliquer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const fm = StyleSheet.create({
  container:      { flex:1, backgroundColor:colors.white },
  handle:         { width:40, height:4, borderRadius:2, backgroundColor:colors.border, alignSelf:'center', marginTop:12 },
  header:         { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:20, borderBottomWidth:1, borderBottomColor:colors.borderLight },
  title:          { fontSize:18, fontWeight:'700', color:colors.navy },
  body:           { flex:1, padding:20 },
  label:          { fontSize:13, fontWeight:'700', color:colors.text, marginBottom:10, marginTop:16 },
  chips:          { marginBottom:4 },
  chip:           { paddingHorizontal:14, paddingVertical:9, borderRadius:20, backgroundColor:colors.surface, marginRight:8, borderWidth:1.5, borderColor:colors.border },
  chipActive:     { backgroundColor:colors.primary, borderColor:colors.primary },
  chipText:       { fontSize:13, color:colors.textSecondary, fontWeight:'600' },
  chipTextActive: { color:colors.white },
  toggle:         { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:14, borderBottomWidth:1, borderBottomColor:colors.borderLight },
  toggleLabel:    { fontSize:15, color:colors.text, fontWeight:'500' },
  checkbox:       { width:24, height:24, borderRadius:7, borderWidth:2, borderColor:colors.border, justifyContent:'center', alignItems:'center' },
  checkboxActive: { backgroundColor:colors.primary, borderColor:colors.primary },
  actions:        { flexDirection:'row', gap:12, padding:20, borderTopWidth:1, borderTopColor:colors.borderLight },
  resetBtn:       { flex:1, paddingVertical:14, borderRadius:12, borderWidth:1.5, borderColor:colors.border, alignItems:'center' },
  resetText:      { fontSize:15, fontWeight:'700', color:colors.text },
  applyBtn:       { flex:2, paddingVertical:14, borderRadius:12, backgroundColor:colors.primary, alignItems:'center' },
  applyText:      { fontSize:15, fontWeight:'700', color:colors.white },
});

// ── Écran principal ───────────────────────────────────────────────
export default function SearchScreen() {
  const { t }    = useTranslation();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const params   = useLocalSearchParams();
  const provider = useAuthStore(s => s.provider);

  const { requestLocation, loading: geoLoading, error: geoError } = useLocation();

  const [query,       setQuery]       = useState('');
  const [nearbyMode,  setNearbyMode]  = useState(false);
  const [userCoords,  setUserCoords]  = useState(null);
  const [showPermBanner, setShowPermBanner] = useState(false);
  const [providers,   setProviders]   = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [cities,      setCities]      = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [filters,     setFilters]     = useState({
    categoryId:     params.categoryId ? parseInt(params.categoryId) : null,
    cityId:         null,
    neighborhoodId: null,
    verified:       false,
    available:      false,
  });
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [loading,     setLoading]     = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [total,       setTotal]       = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const debounceRef = useRef(null);

  useEffect(() => { loadMeta(); }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (nearbyMode && userCoords) searchNearby(true);
      else search(true);
    }, query ? 400 : 0);
  }, [query, filters, nearbyMode, userCoords]);

  async function loadMeta() {
    const cached = getCache('search_meta');
    if (cached) { setCategories(cached.categories); setCities(cached.cities); setNeighborhoods(cached.neighborhoods); }
    try {
      const [cRes, ciRes, nRes] = await Promise.all([
        api.get('/categories'),
        api.get('/categories/cities'),
        api.get('/categories/neighborhoods'),
      ]);
      const meta = { categories: cRes.data.data || [], cities: ciRes.data.data || [], neighborhoods: nRes.data.data || [] };
      setCategories(meta.categories);
      setCities(meta.cities);
      setNeighborhoods(meta.neighborhoods);
      setCache('search_meta', meta, CACHE_TTL.categories);
    } catch {}
  }

  // ── Activer le mode "Autour de moi" ────────────────────────────
  async function enableNearbyMode() {
    if (nearbyMode) {
      // Désactiver
      setNearbyMode(false);
      setUserCoords(null);
      setShowPermBanner(false);
      return;
    }

    const coords = await requestLocation();

    if (!coords) {
      // Permission refusée
      setShowPermBanner(true);
      return;
    }

    setUserCoords(coords);
    setNearbyMode(true);
    setShowPermBanner(false);
  }

  // ── Recherche standard ──────────────────────────────────────────
  const search = useCallback(async (reset = true) => {
    if (loading && !reset) return;
    setLoading(true);
    const currentPage = reset ? 1 : page;

    try {
      const p = new URLSearchParams({ page: currentPage, limit: PAGE_SIZE });
      if (query.trim())        p.append('q', query.trim());
      if (filters.categoryId)  p.append('categoryId',     filters.categoryId);
      if (filters.cityId)      p.append('cityId',          filters.cityId);
      if (filters.neighborhoodId) p.append('neighborhoodId', filters.neighborhoodId);
      if (filters.verified)    p.append('isVerified',     'true');
      if (filters.available)   p.append('availability',   'available');

      const res  = await api.get(`/providers?${p}`);
      const list = res.data.data?.providers || [];
      const tot  = res.data.data?.pagination?.total || 0;

      if (reset) { setProviders(list); setPage(2); }
      else       { setProviders(prev => [...prev, ...list]); setPage(p => p + 1); }

      setHasMore(list.length === PAGE_SIZE);
      setTotal(tot);
    } catch { if (reset) setProviders([]); }

    setLoading(false);
    setInitLoading(false);
  }, [query, filters, page, loading]);

  // ── Recherche géographique ──────────────────────────────────────
  const searchNearby = useCallback(async (reset = true) => {
    if (!userCoords || (loading && !reset)) return;
    setLoading(true);
    const currentPage = reset ? 1 : page;

    try {
      const p = new URLSearchParams({
        lat:  userCoords.latitude,
        lng:  userCoords.longitude,
        page: currentPage,
        limit: PAGE_SIZE,
      });
      if (filters.categoryId) p.append('categoryId', filters.categoryId);

      const res  = await api.get(`/providers/nearby?${p}`);
      const list = res.data.data?.providers || [];
      const tot  = res.data.data?.pagination?.total || 0;

      if (reset) { setProviders(list); setPage(2); }
      else       { setProviders(prev => [...prev, ...list]); setPage(p => p + 1); }

      setHasMore(list.length === PAGE_SIZE);
      setTotal(tot);
    } catch { if (reset) setProviders([]); }

    setLoading(false);
    setInitLoading(false);
  }, [userCoords, filters, page, loading]);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  // Rayon du prestataire connecté (pour affichage informatif dans son profil)
  const myRadius = provider?.plan ? PLAN_RADIUS[provider.plan] : null;

  return (
    <View style={styles.flex}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Rechercher</Text>

        {/* Barre recherche + boutons */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={17} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Nom, métier, spécialité..."
              placeholderTextColor={colors.textDisabled}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
              editable={!nearbyMode}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Bouton Autour de moi */}
          <TouchableOpacity
            style={[styles.geoBtn, nearbyMode && styles.geoBtnActive]}
            onPress={enableNearbyMode}
            disabled={geoLoading}
            activeOpacity={0.8}
          >
            {geoLoading
              ? <ActivityIndicator size="small" color={nearbyMode ? colors.white : colors.primary} />
              : <Navigation size={18} color={nearbyMode ? colors.white : colors.primary} strokeWidth={2.5} />
            }
          </TouchableOpacity>

          {/* Bouton Filtres */}
          <TouchableOpacity
            style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
            onPress={() => setShowFilters(true)}
          >
            <SlidersHorizontal size={18} color={hasActiveFilters ? colors.white : colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Indicateur mode Autour de moi */}
        {nearbyMode && userCoords && (
          <View style={styles.nearbyBadge}>
            <MapPin size={12} color={colors.primary} />
            <Text style={styles.nearbyText}>Autour de moi — prestataires dans leur rayon de service</Text>
            <TouchableOpacity onPress={enableNearbyMode}>
              <X size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Compteur résultats */}
        {!initLoading && total > 0 && (
          <Text style={styles.resultsCount}>{total} résultat{total > 1 ? 's' : ''}</Text>
        )}
      </View>

      {/* Bannière permission refusée */}
      {showPermBanner && (
        <LocationPermissionBanner onDismiss={() => setShowPermBanner(false)} />
      )}

      {/* Liste */}
      {initLoading ? (
        <FlatList
          data={[1,2,3,4,5]}
          renderItem={() => <SkeletonProviderCard />}
          keyExtractor={i => i.toString()}
        />
      ) : (
        <FlatList
          data={providers}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <ProviderCard
              provider={item}
              onPress={() => router.push(`/provider/${item.id}`)}
              showDistance={nearbyMode && item.distanceKm !== undefined}
            />
          )}
          contentContainerStyle={styles.list}
          onEndReached={() => {
            if (hasMore && !loading) {
              if (nearbyMode && userCoords) searchNearby(false);
              else search(false);
            }
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon={nearbyMode ? Navigation : Search}
                title={nearbyMode ? 'Aucun prestataire autour de vous' : 'Aucun résultat'}
                message={
                  nearbyMode
                    ? 'Il n\'y a pas encore de prestataires avec une zone de service définie dans votre secteur.'
                    : 'Essayez d\'autres mots-clés ou filtres.'
                }
                action={nearbyMode ? enableNearbyMode : () => setFilters({ categoryId:null, cityId:null, neighborhoodId:null, verified:false, available:false })}
                actionLabel={nearbyMode ? 'Recherche classique' : 'Effacer les filtres'}
              />
            ) : null
          }
          ListFooterComponent={
            loading && providers.length > 0
              ? <ActivityIndicator style={{ margin:20 }} color={colors.primary} />
              : null
          }
        />
      )}

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        setFilters={f => { setFilters(f); }}
        categories={categories}
        cities={cities}
        neighborhoods={neighborhoods}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex:          { flex:1, backgroundColor:colors.background },
  header:        { backgroundColor:colors.white, paddingHorizontal:20, paddingBottom:12, borderBottomWidth:1, borderBottomColor:colors.borderLight },
  title:         { fontSize:24, fontWeight:'800', color:colors.navy, marginBottom:14 },
  searchRow:     { flexDirection:'row', gap:8 },
  searchBox:     { flex:1, flexDirection:'row', alignItems:'center', gap:10, backgroundColor:colors.surface, borderRadius:14, paddingHorizontal:14, height:46, borderWidth:1.5, borderColor:colors.border },
  searchInput:   { flex:1, fontSize:15, color:colors.text },
  geoBtn:        { width:46, height:46, borderRadius:14, backgroundColor:colors.surface, justifyContent:'center', alignItems:'center', borderWidth:1.5, borderColor:colors.border },
  geoBtnActive:  { backgroundColor:colors.primary, borderColor:colors.primary },
  filterBtn:     { width:46, height:46, borderRadius:14, backgroundColor:colors.surface, justifyContent:'center', alignItems:'center', borderWidth:1.5, borderColor:colors.border },
  filterBtnActive: { backgroundColor:colors.primary, borderColor:colors.primary },
  nearbyBadge:   { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:colors.primaryBg, borderRadius:10, paddingHorizontal:12, paddingVertical:7, marginTop:10, borderWidth:1, borderColor:colors.primary+'40' },
  nearbyText:    { flex:1, fontSize:11, color:colors.primary, fontWeight:'600' },
  resultsCount:  { fontSize:12, color:colors.textMuted, marginTop:8, fontWeight:'500' },
  list:          { paddingTop:10, paddingBottom:24, flexGrow:1 },
});
