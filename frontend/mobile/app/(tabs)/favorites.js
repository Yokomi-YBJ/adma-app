import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import api from '../../services/api';
import { ProviderCard }       from '../../components/cards/ProviderCard';
import { EmptyState }         from '../../components/ui/EmptyState';
import { SkeletonProviderCard } from '../../components/ui/Skeleton';
import { useAuthStore }       from '../../store/auth.store';
import { Button }             from '../../components/ui/Button';

export default function FavoritesScreen() {
  const { t }     = useTranslation();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const user      = useAuthStore((s) => s.user);

  const [favorites,  setFavorites]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!user) { setLoading(false); return; }
    try {
      const res = await api.get('/favorites');
      setFavorites(res.data.data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(true); }, [load]);

  if (!user) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('favorites.title')}</Text>
        </View>
        <EmptyState
          icon={Heart}
          title={t('favorites.loginRequired')}
          message="Connectez-vous pour retrouver vos prestataires favoris"
          action={() => router.push('/(auth)/login')}
          actionLabel="Se connecter"
        />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('favorites.title')}</Text>
        {favorites.length > 0 && (
          <Text style={styles.count}>{favorites.length} prestataire{favorites.length > 1 ? 's' : ''}</Text>
        )}
      </View>

      {loading ? (
        <FlatList
          data={[1, 2, 3]}
          renderItem={() => <SkeletonProviderCard />}
          keyExtractor={(i) => i.toString()}
        />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ProviderCard
              provider={item}
              onPress={() => router.push(`/provider/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Heart}
              title={t('favorites.empty')}
              message={t('favorites.emptyHint')}
              action={() => router.push('/(tabs)/search')}
              actionLabel="Parcourir les prestataires"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex:    { flex: 1, backgroundColor: colors.background },
  header:  {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  title:   { fontSize: 28, fontWeight: '800', color: colors.navy },
  count:   { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
  list:    { paddingTop: 10, paddingBottom: 24, flexGrow: 1 },
});
