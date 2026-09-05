/**
 * ADMA — Écran Paramètres principal (Settings)
 * Design premium 10/10 : gestion du profil, sécurité, préférences,
 * support et options de compte. 0 émojis.
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Modal, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, User, Bell, Globe, Shield,
  HelpCircle, Headphones, Database, LogOut, Trash2,
  ChevronRight, CheckCircle2, Eye, EyeOff
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useAuthStore } from '../../store/auth.store';
import { setLanguage, getCurrentLanguage } from '../../i18n';
import { clearCache } from '../../services/cache';
import api from '../../services/api';
import { showAppModal } from '../../components/ui/AppModal';

const LANGUAGES = [
  { code: 'fr', label: 'Français', sublabel: 'Langue par défaut' },
  { code: 'en', label: 'English',  sublabel: 'English translation' },
  { code: 'ful', label: 'Fulfulde', sublabel: 'Fulfulde Adamaoua' },
];

export default function SettingsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const user       = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout     = useAuthStore((s) => s.logout);

  const [phonePublic, setPhonePublic] = useState(!!user?.phone_public);
  const [langModal, setLangModal]     = useState(false);
  const [cacheClearing, setCacheClearing] = useState(false);

  useEffect(() => {
    if (user?.phone_public !== undefined) {
      setPhonePublic(!!user.phone_public);
    }
  }, [user]);

  async function togglePhonePublic(val) {
    setPhonePublic(val);
    try {
      await api.put('/users/me', { phonePublic: val });
      updateUser({ phone_public: val });
    } catch {
      setPhonePublic(!val);
      showAppModal({
        title: 'Erreur',
        message: 'Impossible de mettre à jour la visibilité du numéro.',
        confirmText: 'OK',
        variant: 'danger',
      });
    }
  }

  async function handleClearCache() {
    showAppModal({
      title: 'Vider le cache',
      message: 'Voulez-vous supprimer les données temporaires mises en cache pour libérer de l\'espace ?',
      confirmText: 'Vider le cache',
      cancelText: 'Annuler',
      variant: 'warning',
      onConfirm: async () => {
        setCacheClearing(true);
        try {
          await clearCache();
          showAppModal({
            title: 'Succès',
            message: 'Le cache local de l\'application a été vidé.',
            confirmText: 'OK',
            variant: 'success',
          });
        } catch {
          showAppModal({
            title: 'Erreur',
            message: 'Une erreur est survenue lors du nettoyage du cache.',
            confirmText: 'OK',
            variant: 'danger',
          });
        }
        setCacheClearing(false);
      },
    });
  }

  async function handleLogout() {
    showAppModal({
      title: 'Déconnexion',
      message: 'Êtes-vous sûr de vouloir vous déconnecter de votre compte Adma ?',
      confirmText: 'Se déconnecter',
      cancelText: 'Annuler',
      variant: 'warning',
      destructive: true,
      onConfirm: async () => {
        await logout();
        router.replace('/(auth)/login');
      },
    });
  }

  async function handleDeleteAccount() {
    showAppModal({
      title: 'Supprimer définitivement le compte',
      message: 'Cette action est irréversible. Votre profil, vos avis et vos informations seront définitivement supprimés de la plateforme.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete('/users/me');
          await logout();
          router.replace('/(auth)/login');
        } catch {
          showAppModal({
            title: 'Erreur',
            message: 'Impossible de supprimer le compte pour le moment.',
            confirmText: 'OK',
            variant: 'danger',
          });
        }
      },
    });
  }

  const fullName = [user?.firstName || user?.first_name, user?.lastName || user?.last_name]
    .filter(Boolean).join(' ') || 'Utilisateur Adma';
  const initials = fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const avatarUri = user?.avatarUrl || user?.avatar_url;
  const currentLangObj = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}> 
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paramètres</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <TouchableOpacity
          style={styles.profileSummaryCard}
          onPress={() => router.push('/settings/edit-profile')}
          activeOpacity={0.75}
        >
          <View style={styles.avatarWrapper}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{fullName}</Text>
            <Text style={styles.profilePhone}>
              +237 {(user?.phone || '').replace('+237', '')}
            </Text>
          </View>

          <View style={styles.editProfileBtn}>
            <Text style={styles.editProfileText}>Modifier</Text>
            <ChevronRight size={16} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Section 1: Mon Compte */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mon compte</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/settings/edit-profile')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.primaryBg }]}>
                <User size={18} color={colors.primary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowLabel}>Modifier le profil</Text>
                <Text style={styles.rowSub}>Nom, prénom, photo de profil</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/settings/notifications')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: '#EEF2FF' }]}>
                <Bell size={18} color="#4F46E5" />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowLabel}>Notifications</Text>
                <Text style={styles.rowSub}>Alerte avis, messages et rappels</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, styles.menuRowLast]}
              onPress={() => setLangModal(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Globe size={18} color="#D97706" />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowLabel}>Langue de l'application</Text>
                <Text style={styles.rowSub}>{currentLangObj.label}</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Confidentialité & Sécurité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confidentialité & Sécurité</Text>
          <View style={styles.card}>
            <View style={styles.menuRow}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primaryBg }]}>
                {phonePublic ? <Eye size={18} color={colors.primary} /> : <EyeOff size={18} color={colors.textMuted} />}
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowLabel}>Numéro de téléphone public</Text>
                <Text style={styles.rowSub}>
                  {phonePublic ? 'Visible par les clients' : 'Masqué dans vos avis'}
                </Text>
              </View>
              <Switch
                value={phonePublic}
                onValueChange={togglePhonePublic}
                trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/settings/legal')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: '#F0FDF4' }]}>
                <Shield size={18} color="#16A34A" />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowLabel}>Confidentialité & CGU</Text>
                <Text style={styles.rowSub}>Conditions d'utilisation et données personnelles</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, styles.menuRowLast]}
              onPress={handleClearCache}
              activeOpacity={0.7}
              disabled={cacheClearing}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
                <Database size={18} color={colors.textSecondary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowLabel}>Nettoyer le cache local</Text>
                <Text style={styles.rowSub}>Libérer l'espace mémoire temporaire</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 3: Assistance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assistance & Support</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/settings/support')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: '#F3E8FF' }]}>
                <HelpCircle size={18} color="#9333EA" />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowLabel}>Foire aux questions (FAQ)</Text>
                <Text style={styles.rowSub}>Réponses aux questions courantes</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, styles.menuRowLast]}
              onPress={() => router.push('/settings/support?tab=contact')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: '#E0F2FE' }]}>
                <Headphones size={18} color="#0284C7" />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowLabel}>Contacter l'équipe Adma</Text>
                <Text style={styles.rowSub}>Signaler un problème technique ou poser une question</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4: Actions de compte */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.75}
          >
            <LogOut size={18} color={colors.danger} />
            <Text style={styles.logoutBtnText}>Se déconnecter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Trash2 size={16} color={colors.textMuted} />
            <Text style={styles.deleteBtnText}>Supprimer définitivement mon compte</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoTitle}>ADMA Cameroun</Text>
          <Text style={styles.appInfoVersion}>Version 2.0.0 (Adamaoua)</Text>
        </View>
      </ScrollView>

      {/* Modal Sélection de Langue */}
      <Modal visible={langModal} transparent animationType="fade" onRequestClose={() => setLangModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setLangModal(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir la langue</Text>
              <Text style={styles.modalSubtitle}>Sélectionnez votre langue de préférence pour l'interface</Text>
            </View>

            {LANGUAGES.map((item) => {
              const active = i18n.language === item.code;
              return (
                <TouchableOpacity
                  key={item.code}
                  style={[styles.langOption, active && styles.langOptionActive]}
                  onPress={async () => {
                    await setLanguage(item.code);
                    setLangModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.langLabel, active && styles.langLabelActive]}>{item.label}</Text>
                    <Text style={styles.langSublabel}>{item.sublabel}</Text>
                  </View>
                  {active && <CheckCircle2 size={20} color={colors.primary} strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    letterSpacing: -0.2,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingBottom: 40,
  },

  profileSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrapper: {
    marginRight: 14,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editProfileText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },

  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  rowSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.dangerBg,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.danger,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  deleteBtnText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },

  appInfo: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  appInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  appInfoVersion: {
    fontSize: 11,
    color: colors.textDisabled,
    marginTop: 2,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    inset: 0,
    backgroundColor: colors.overlay,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.navy,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  langOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  langLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  langLabelActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  langSublabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
