import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  User, Settings, Bell, Globe, LogOut, Trash2,
  ChevronRight, Briefcase, CreditCard, Shield,
  ExternalLink, CheckCircle2, Clock, AlertCircle, Star,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { useAuthStore }        from '../../store/auth.store';
import { useNotificationStore } from '../../store/notification.store';
import { setLanguage, getCurrentLanguage } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { showAppModal } from '../../components/ui/AppModal';
import api from '../../services/api';

const VERIFICATION_DISPLAY = {
  none:        { label: 'Non verifie',       color: colors.textMuted,  Icon: AlertCircle },
  pending:     { label: 'En cours d\'examen', color: colors.warning,   Icon: Clock },
  verified_id: { label: 'Identite verifiee', color: colors.info,       Icon: Shield },
  verified:    { label: 'Verifie',           color: colors.primary,    Icon: CheckCircle2 },
};

const PLAN_COLORS = {
  free: colors.textMuted, premium: colors.primary, professional: colors.navyMid, enterprise: colors.navy,
};

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router      = useRouter();
  const insets      = useSafeAreaInsets();
  const user        = useAuthStore((s) => s.user);
  const provider    = useAuthStore((s) => s.provider);
  const logout      = useAuthStore((s) => s.logout);
  const unread      = useNotificationStore((s) => s.unreadCount);

  const [langModal, setLangModal] = useState(false);

  useEffect(() => {
    if (user) useNotificationStore.getState().load();
  }, [user]);

  async function handleLogout() {
    showAppModal({
      title: 'Déconnexion',
      message: t('profile.confirmLogout'),
      confirmText: t('common.yes'),
      cancelText: t('common.cancel'),
      destructive: true,
      variant: 'warning',
      onConfirm: async () => {
        await logout();
        router.replace('/(auth)/login');
      },
    });
  }

  async function handleDeleteAccount() {
    showAppModal({
      title: 'Supprimer le compte',
      message: t('profile.confirmDelete'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete('/users/me');
          await logout();
          router.replace('/(auth)/login');
        } catch {
          showAppModal({
            title: t('common.error'),
            message: 'Échec de la suppression',
            confirmText: 'OK',
            variant: 'danger',
          });
        }
      },
    });
  }

  if (!user) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <Text style={styles.pageTitle}>{t('tabs.profile')}</Text>
        <View style={styles.guestCard}>
          <View style={styles.guestIcon}><User size={40} color={colors.textMuted} /></View>
          <Text style={styles.guestTitle}>Connectez-vous</Text>
          <Text style={styles.guestDesc}>Acces a votre profil, vos favoris et votre fiche prestataire</Text>
          <Button title={t('auth.title')} onPress={() => router.push('/(auth)/login')} style={{ marginTop: 20 }} />
        </View>
      </View>
    );
  }

  const fullName   = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Utilisateur';
  const initials   = fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const verStatus  = provider?.verificationStatus || provider?.verification_status || 'none';
  const verDisplay = VERIFICATION_DISPLAY[verStatus] || VERIFICATION_DISPLAY.none;
  const plan       = provider?.plan || 'free';

  return (
    <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.pageTitle}>{t('profile.title')}</Text>
      </View>

      {/* Carte profil */}
      <View style={styles.profileCard}>
        <View style={styles.avatarWrap}>
          {user.avatarUrl || user.avatar_url
            ? <Image source={{ uri: user.avatarUrl || user.avatar_url }} style={styles.avatar} />
            : <View style={styles.avatarFallback}><Text style={styles.avatarInitials}>{initials}</Text></View>
          }
        </View>
        <View style={styles.profileMeta}>
          <Text style={styles.profileName}>{fullName}</Text>
          <Text style={styles.profilePhone}>+237 {(user.phone || '').replace('+237', '')}</Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/settings')}>
          <Settings size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Fiche prestataire */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Prestataire</Text>
        {provider ? (
          <View style={styles.menuCard}>
            {/* Statut abonnement */}
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/subscription/plans')}>
              <View style={[styles.menuIconWrap, { backgroundColor: (PLAN_COLORS[plan] || colors.primary) + '18' }]}>
                <Star size={18} color={PLAN_COLORS[plan] || colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Abonnement</Text>
                <Text style={[styles.menuSub, { color: PLAN_COLORS[plan] }]}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</Text>
              </View>
              <ChevronRight size={17} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Vérification */}
            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => router.push('/verification')}>
              <View style={[styles.menuIconWrap, { backgroundColor: verDisplay.color + '18' }]}>
                <verDisplay.Icon size={18} color={verDisplay.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Verification</Text>
                <Text style={[styles.menuSub, { color: verDisplay.color }]}>{verDisplay.label}</Text>
              </View>
              <ChevronRight size={17} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.createCard} onPress={() => router.push('/provider/create')} activeOpacity={0.8}>
            <View style={styles.createIcon}><Briefcase size={24} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.createTitle}>Creer ma fiche</Text>
              <Text style={styles.createDesc}>Devenez visible aupres de vos futurs clients</Text>
            </View>
            <ChevronRight size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Paramètres */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Compte</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/notifications')}>
            <View style={[styles.menuIconWrap, { backgroundColor: colors.primaryBg }]}>
              <Bell size={18} color={colors.primary} />
            </View>
            <Text style={styles.menuLabel}>{t('tabs.profile') === 'Profile' ? 'Notifications' : 'Notifications'}</Text>
            {unread > 0 && <View style={styles.notifBadge}><Text style={styles.notifBadgeText}>{unread}</Text></View>}
            <ChevronRight size={17} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => setLangModal(true)}>
            <View style={[styles.menuIconWrap, { backgroundColor: '#F0F0FF' }]}>
              <Globe size={18} color={colors.navyMid} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>{t('profile.language') || 'Langue'}</Text>
              <Text style={styles.menuSub}>{{ fr: 'Francais', en: 'English', ful: 'Fulfulde' }[i18n.language] || 'Auto'}</Text>
            </View>
            <ChevronRight size={17} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Politique de confidentialité */}
      <View style={styles.section}>
        <View style={styles.menuCard}>
          <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => require('react-native').Linking.openURL('https://privacy.adma.cm')}>
            <View style={[styles.menuIconWrap, { backgroundColor: colors.surface }]}>
              <Shield size={18} color={colors.textMuted} />
            </View>
            <Text style={styles.menuLabel}>Politique de confidentialite</Text>
            <ExternalLink size={15} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions destructives */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color={colors.danger} />
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Trash2 size={15} color={colors.textMuted} />
          <Text style={styles.deleteText}>{t('profile.deleteAccount')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>{t('profile.version') || 'Version 1.0.0'}</Text>
      <View style={{ height: 40 }} />

      {/* Modal langue */}
      {langModal && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBg} onPress={() => setLangModal(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choisir la langue</Text>
            {[{ code: 'fr', label: 'Francais' }, { code: 'en', label: 'English' }, { code: 'ful', label: 'Fulfulde' }].map((l) => (
              <TouchableOpacity
                key={l.code}
                style={styles.langRow}
                onPress={async () => { await setLanguage(l.code); setLangModal(false); }}
              >
                <Text style={[styles.langLabel, i18n.language === l.code && styles.langLabelActive]}>{l.label}</Text>
                {i18n.language === l.code && <CheckCircle2 size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex:           { flex: 1, backgroundColor: colors.background },
  header:         { paddingHorizontal: 20, paddingBottom: 8, backgroundColor: colors.white },
  pageTitle:      { fontSize: 28, fontWeight: '800', color: colors.navy },

  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, padding: 20,
    backgroundColor: colors.white, borderRadius: 20,
    borderWidth: 1, borderColor: colors.borderLight,
    shadowColor: colors.navy, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  avatarWrap:     { marginRight: 16 },
  avatar:         { width: 60, height: 60, borderRadius: 18 },
  avatarFallback: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 22, fontWeight: '800', color: colors.primary },
  profileMeta:    { flex: 1 },
  profileName:    { fontSize: 17, fontWeight: '700', color: colors.navy },
  profilePhone:   { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  editBtn:        { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center' },

  section:        { marginHorizontal: 16, marginBottom: 16 },
  sectionLabel:   { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  menuCard:       { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden' },
  menuItem:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  menuItemLast:   { borderBottomWidth: 0 },
  menuIconWrap:   { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuContent:    { flex: 1 },
  menuLabel:      { fontSize: 15, fontWeight: '600', color: colors.text },
  menuSub:        { fontSize: 12, fontWeight: '500', marginTop: 1 },
  notifBadge:     { backgroundColor: colors.danger, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5, marginRight: 4 },
  notifBadgeText: { fontSize: 11, fontWeight: '800', color: colors.white },

  createCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.white, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: colors.primary + '50',
    borderStyle: 'dashed',
  },
  createIcon:     { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center' },
  createTitle:    { fontSize: 15, fontWeight: '700', color: colors.navy },
  createDesc:     { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  guestCard:      { margin: 20, padding: 40, backgroundColor: colors.white, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight },
  guestIcon:      { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  guestTitle:     { fontSize: 20, fontWeight: '700', color: colors.navy, marginBottom: 8 },
  guestDesc:      { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

  logoutBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, backgroundColor: colors.dangerBg, borderRadius: 14, marginBottom: 8 },
  logoutText:     { fontSize: 15, fontWeight: '700', color: colors.danger },
  deleteBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 },
  deleteText:     { fontSize: 13, color: colors.textMuted },
  version:        { textAlign: 'center', fontSize: 12, color: colors.textDisabled, marginBottom: 8 },

  modalOverlay:   { position: 'absolute', inset: 0, justifyContent: 'flex-end' },
  modalBg:        { position: 'absolute', inset: 0, backgroundColor: colors.overlay },
  modalCard:      { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle:     { fontSize: 18, fontWeight: '700', color: colors.navy, marginBottom: 20 },
  langRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  langLabel:      { fontSize: 16, color: colors.text, fontWeight: '500' },
  langLabelActive:{ color: colors.primary, fontWeight: '700' },
});
