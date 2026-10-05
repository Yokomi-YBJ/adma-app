/**
 * ADMA — Zone de danger
 */
import { useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, AlertTriangle, Trash2, UserX, Briefcase } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';
import { showAppModal } from '../../components/ui/AppModal';

export default function DangerZoneScreen() {
  const router     = useRouter();
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const { t }      = useTranslation();

  const user        = useAuthStore((s) => s.user);
  const provider    = useAuthStore((s) => s.provider);
  const logout      = useAuthStore((s) => s.logout);
  const setProvider = useAuthStore((s) => s.setProvider);

  const [deletingProvider, setDeletingProvider] = useState(false);
  const [deletingAccount, setDeletingAccount]   = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  async function handleDeleteProvider() {
    if (!provider) {
      showAppModal({
        title: t('common.info'),
        message: t('dangerZone.deleteProviderDesc'),
        confirmText: t('common.ok'),
        variant: 'info',
      });
      return;
    }

    showAppModal({
      title: t('dangerZone.confirmProviderTitle'),
      message: t('dangerZone.confirmProviderMsg'),
      confirmText: t('dangerZone.deleteProviderBtn'),
      cancelText: t('common.cancel'),
      variant: 'danger',
      destructive: true,
      onConfirm: async () => {
        setDeletingProvider(true);
        try {
          await api.delete(`/providers/${provider.id}`);
          setProvider(null);
          showAppModal({
            title: t('common.success'),
            message: t('dangerZone.deleteProviderDesc'),
            confirmText: t('common.ok'),
            variant: 'success',
            onConfirm: () => router.back(),
          });
        } catch (error) {
          showAppModal({
            title: t('common.error'),
            message: error.response?.data?.message || t('common.deleteError'),
            confirmText: t('common.ok'),
            variant: 'danger',
          });
        } finally {
          setDeletingProvider(false);
        }
      },
    });
  }

  async function handleDeleteAccount() {
    showAppModal({
      title: t('dangerZone.confirmAccountTitle'),
      message: t('dangerZone.confirmAccountMsg'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'danger',
      destructive: true,
      onConfirm: async () => {
        setDeletingAccount(true);
        try {
          await api.delete('/users/me');
          await logout();
          router.replace('/(auth)/login');
        } catch (error) {
          showAppModal({
            title: t('common.error'),
            message: error.response?.data?.message || t('common.deleteError'),
            confirmText: t('common.ok'),
            variant: 'danger',
          });
          setDeletingAccount(false);
        }
      },
    });
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('dangerZone.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.warningBox}>
          <AlertTriangle size={24} color={colors.danger} />
          <Text style={styles.warningTitle}>{t('dangerZone.attention')}</Text>
          <Text style={styles.warningText}>{t('dangerZone.warningText')}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Briefcase size={20} color={colors.danger} />
            <Text style={styles.cardTitle}>{t('dangerZone.deleteProviderTitle')}</Text>
          </View>
          <Text style={styles.cardDesc}>
            {provider ? t('dangerZone.deleteProviderDesc') : t('profile.noCard')}
          </Text>
          <TouchableOpacity
            style={[styles.dangerBtn, (!provider || deletingProvider) && styles.dangerBtnDisabled]}
            onPress={handleDeleteProvider}
            disabled={!provider || deletingProvider}
            activeOpacity={0.7}
          >
            {deletingProvider ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Trash2 size={18} color={colors.white} />
                <Text style={styles.dangerBtnText}>{t('dangerZone.deleteProviderBtn')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, styles.cardLast]}>
          <View style={styles.cardHeader}>
            <UserX size={20} color={colors.danger} />
            <Text style={styles.cardTitle}>{t('dangerZone.deleteAccountTitle')}</Text>
          </View>
          <Text style={styles.cardDesc}>{t('dangerZone.deleteAccountDesc')}</Text>
          <TouchableOpacity
            style={[styles.dangerBtn, styles.dangerBtnAccount, deletingAccount && styles.dangerBtnDisabled]}
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
            activeOpacity={0.7}
          >
            {deletingAccount ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Trash2 size={18} color={colors.white} />
                <Text style={styles.dangerBtnText}>{t('dangerZone.deleteAccountBtn')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>{t('dangerZone.warningText')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.navy },
  content: { padding: 16, paddingBottom: 40 },

  warningBox: {
    backgroundColor: colors.dangerBg, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: colors.danger + '40',
    marginBottom: 24, alignItems: 'center',
  },
  warningTitle: { fontSize: 17, fontWeight: '800', color: colors.danger, marginTop: 8, marginBottom: 4 },
  warningText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: colors.white, borderRadius: 18,
    borderWidth: 1, borderColor: colors.borderLight,
    padding: 18, marginBottom: 16,
  },
  cardLast: { marginBottom: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.navy },
  cardDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },

  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.danger, borderRadius: 12, paddingVertical: 14,
  },
  dangerBtnAccount: { backgroundColor: '#B91C1C' },
  dangerBtnDisabled: { opacity: 0.5 },
  dangerBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },

  footerNote: { marginTop: 20, fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});