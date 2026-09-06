/**
 * ADMA — Zone de danger
 * Regroupe les actions irréversibles (suppression du compte, suppression de la fiche)
 */
import { useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
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
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const user = useAuthStore((s) => s.user);
  const provider = useAuthStore((s) => s.provider);
  const logout = useAuthStore((s) => s.logout);
  const setProvider = useAuthStore((s) => s.setProvider);

  const [deletingProvider, setDeletingProvider] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Masquer le header par défaut d'Expo Router
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // --- Supprimer la fiche prestataire ---
  async function handleDeleteProvider() {
    if (!provider) {
      showAppModal({
        title: 'Information',
        message: 'Vous n\'avez pas de fiche prestataire à supprimer.',
        confirmText: 'OK',
        variant: 'info',
      });
      return;
    }

    showAppModal({
      title: 'Supprimer ma fiche prestataire',
      message: 'Cette action est irréversible. Votre fiche, vos photos, vos avis et toutes les données associées seront définitivement supprimés.',
      confirmText: 'Supprimer la fiche',
      cancelText: 'Annuler',
      variant: 'danger',
      destructive: true,
      onConfirm: async () => {
        setDeletingProvider(true);
        try {
          await api.delete(`/providers/${provider.id}`);
          setProvider(null);
          showAppModal({
            title: 'Succès',
            message: 'Votre fiche prestataire a été supprimée.',
            confirmText: 'OK',
            variant: 'success',
            onConfirm: () => router.back(),
          });
        } catch (error) {
          showAppModal({
            title: 'Erreur',
            message: error.response?.data?.message || 'Impossible de supprimer la fiche pour le moment.',
            confirmText: 'OK',
            variant: 'danger',
          });
        } finally {
          setDeletingProvider(false);
        }
      },
    });
  }

  // --- Supprimer le compte utilisateur ---
  async function handleDeleteAccount() {
    showAppModal({
      title: 'Supprimer définitivement le compte',
      message: 'Cette action est irréversible. Votre profil, vos avis et toutes vos données personnelles seront définitivement supprimés de la plateforme.',
      confirmText: 'Supprimer mon compte',
      cancelText: 'Annuler',
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
            title: 'Erreur',
            message: error.response?.data?.message || 'Impossible de supprimer le compte pour le moment.',
            confirmText: 'OK',
            variant: 'danger',
          });
          setDeletingAccount(false);
        }
      },
    });
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      {/* Header personnalisé */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Zone de danger</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.warningBox}>
          <AlertTriangle size={24} color={colors.danger} />
          <Text style={styles.warningTitle}>Attention</Text>
          <Text style={styles.warningText}>
            Les actions dans cette zone sont définitives et irréversibles. 
            Assurez-vous d’avoir sauvegardé toutes vos informations importantes avant de continuer.
          </Text>
        </View>

        {/* Supprimer la fiche prestataire */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Briefcase size={20} color={colors.danger} />
            <Text style={styles.cardTitle}>Fiche prestataire</Text>
          </View>
          <Text style={styles.cardDesc}>
            {provider 
              ? 'Supprimez définitivement votre fiche prestataire. Toutes vos photos, avis et données de contact seront effacés.'
              : 'Vous n\'avez pas encore de fiche prestataire.'
            }
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
                <Text style={styles.dangerBtnText}>
                  {provider ? 'Supprimer ma fiche' : 'Aucune fiche à supprimer'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Supprimer le compte */}
        <View style={[styles.card, styles.cardLast]}>
          <View style={styles.cardHeader}>
            <UserX size={20} color={colors.danger} />
            <Text style={styles.cardTitle}>Compte utilisateur</Text>
          </View>
          <Text style={styles.cardDesc}>
            Supprimez définitivement votre compte Adma. Vous perdrez l’accès à votre profil, vos favoris et tous vos historiques.
          </Text>
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
                <Text style={styles.dangerBtnText}>Supprimer mon compte</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Si vous avez besoin d’aide, contactez le support avant d’effectuer ces actions.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },

  warningBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.danger + '40',
    marginBottom: 24,
    alignItems: 'center',
  },
  warningTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.danger,
    marginTop: 8,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 18,
    marginBottom: 16,
  },
  cardLast: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },

  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
  },
  dangerBtnAccount: {
    backgroundColor: '#B91C1C',
  },
  dangerBtnDisabled: {
    opacity: 0.5,
  },
  dangerBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },

  footerNote: {
    marginTop: 20,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});