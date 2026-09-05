/**
 * ADMA — Écran d'accueil
 * Design propre, thème clair, performances optimisées
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, RefreshControl, Image, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, ChevronRight, Wifi, WifiOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { CACHE_TTL } from '../../constants/config';
import api from '../../services/api';
import { setCache, getCache } from '../../services/cache';
import { useAuthStore }    from '../../store/auth.store';
import { ProviderCard }    from '../../components/cards/ProviderCard';
import { CategoryCard }    from '../../components/cards/CategoryCard';
import { SkeletonHome }    from '../../components/ui/Skeleton';
import { useNetworkStore } from '../../store/network.store';

export default function HomeScreen() {
  const { t }       = useTranslation();
  const router      = useRouter();
  const insets      = useSafeAreaInsets();
  const user        = useAuthStore((s) => s.user);
  const isOnline    = useNetworkStore((s) => s.isOnline);

  const [categories, setCategories] = useState([]);
  const [providers,  setProviders]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline,  setIsOffline]  = useState(false);

  const loadData = useCallback(async (force = false) => {
    try {
      // Utilise le cache si disponible et pas forcé
      const [cachedCats, cachedProvs] = await Promise.all([
        getCache('home_categories'),
        getCache('home_providers'),
      ]);

      if (!force && cachedCats && cachedProvs) {
        setCategories(cachedCats);
        setProviders(cachedProvs);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [catRes, provRes] = await Promise.all([
        api.get('/categories'),
        api.get('/providers?limit=10&sort=ranking'),
      ]);

      const cats  = catRes.data.data  || [];
      const provs = provRes.data.data?.providers || [];

      setCategories(cats);
      setProviders(provs);
      setIsOffline(false);

      await setCache('home_categories', cats,  CACHE_TTL.categories);
      await setCache('home_providers',  provs, CACHE_TTL.providers);
    } catch {
      setIsOffline(true);
      const [c, p] = await Promise.all([
        getCache('home_categories'),
        getCache('home_providers'),
      ]);
      if (c) setCategories(c);
      if (p) setProviders(p);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon apres-midi';
    return 'Bonsoir';
  };

  if (loading) return <SkeletonHome />;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            {greeting()}{user?.firstName ? `, ${user.firstName}` : ''}
          </Text>
          <View style={styles.locationRow}>
            <MapPin size={13} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.location}>{t('home.location')}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.searchIconBtn}
          onPress={() => router.push('/(tabs)/search')}
          activeOpacity={0.7}
        >
          <Search size={20} color={colors.navy} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Bannière hors-ligne */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <WifiOff size={14} color={colors.warning} />
          <Text style={styles.offlineText}>{t('home.noConnection')}</Text>
        </View>
      )}

      {/* Barre de recherche */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => router.push('/(tabs)/search')}
        activeOpacity={0.8}
      >
        <Search size={17} color={colors.textMuted} />
        <Text style={styles.searchPlaceholder}>{t('home.searchPlaceholder')}</Text>
      </TouchableOpacity>

      {/* Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.categories')}</Text>
          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <FlatList
          horizontal
          data={categories.filter(c => !c.parent_id)}
          keyExtractor={(item) => item.id.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => (
            <CategoryCard
              category={item}
              onPress={() => router.push(`/(tabs)/search?categoryId=${item.id}`)}
            />
          )}
        />
      </View>

      {/* Prestataires recommandés */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.recommended')}</Text>
        </View>
        {providers.length === 0 ? (
          <View style={styles.emptyProviders}>
            <Text style={styles.emptyText}>Aucun prestataire disponible</Text>
          </View>
        ) : (
          providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onPress={() => router.push(`/provider/${provider.id}`)}
            />
          ))
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: colors.white,
  },
  headerLeft:   { flex: 1 },
  greeting:     { fontSize: 24, fontWeight: '800', color: colors.navy, letterSpacing: -0.3 },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  location:     { fontSize: 13, color: colors.primary, fontWeight: '600' },
  searchIconBtn:{
    width: 44, height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },

  offlineBanner:{
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.warningBg,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.warning + '30',
  },
  offlineText:  { fontSize: 12, color: colors.warning, fontWeight: '600', flex: 1 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginTop: 16,
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchPlaceholder: { fontSize: 15, color: colors.textMuted, flex: 1 },

  section:      { marginTop: 28 },
  sectionHeader:{
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.navy },
  seeAllBtn:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAll:       { fontSize: 13, color: colors.primary, fontWeight: '600' },
  categoriesList:{ paddingHorizontal: 16, gap: 10 },

  emptyProviders:{ margin: 20, padding: 32, backgroundColor: colors.surface, borderRadius: 16, alignItems: 'center' },
  emptyText:    { color: colors.textMuted, fontSize: 14 },
});
