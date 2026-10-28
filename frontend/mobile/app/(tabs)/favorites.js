import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Heart } from 'lucide-react-native';
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
  const [loadError,  setLoadError]  = useState(null);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoadError(null);
    try {
      const res = await api.get('/favorites');
      setFavorites(res.data.data || []);
    } catch (error) {
      setLoadError(error.userMessage || t('errors.generic'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, t]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const countLabel = favorites.length > 1
    ? `${favorites.length} ${t('favorites.countPlural')}`
    : `${favorites.length} ${t('favorites.countSingular')}`;

  if (!user) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('favorites.title')}</Text>
        </View>
        <EmptyState
          icon={Heart}
          title={t('favorites.loginRequired')}
          message={t('favorites.loginMessage')}
          action={() => router.push('/(auth)/login')}
          actionLabel={t('favorites.signIn')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('favorites.title')}</Text>
        {favorites.length > 0 && (
          <Text style={styles.count}>{countLabel}</Text>
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
          ListHeaderComponent={
            loadError && favorites.length > 0 ? (
              <View style={styles.errorHeader}>
                <Text style={styles.errorText}>{loadError}</Text>
                <TouchableOpacity onPress={load} activeOpacity={0.75}>
                  <Text style={styles.retryText}>{t('common.retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListEmptyComponent={
            loadError ? (
              <EmptyState
                icon={AlertCircle}
                title={t('common.error')}
                message={loadError}
                action={load}
                actionLabel={t('common.retry')}
              />
            ) : (
              <EmptyState
                icon={Heart}
                title={t('favorites.empty')}
                message={t('favorites.emptyHint')}
                action={() => router.push('/(tabs)/search')}
                actionLabel={t('favorites.browseProviders')}
              />
            )
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
  errorHeader: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.dangerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 13 },
  retryText: { color: colors.navy, fontSize: 13, fontWeight: '700' },
});