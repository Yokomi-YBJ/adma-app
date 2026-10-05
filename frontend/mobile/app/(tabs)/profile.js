/**
 * ADMA — Profil utilisateur + Gestion fiche prestataire
 */
import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  User, Settings, Briefcase, Shield,
  CheckCircle2, Clock, AlertCircle, Star, ChevronRight,
  Edit3, CheckCheck, Wifi, Phone, MessageSquare,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';

// ── Couleurs de plan ─────────────────────────────────────────────
const PLAN_COLORS = {
  free:         colors.textMuted,
  premium:      colors.primary,
  professional: colors.navyMid,
  enterprise:   colors.navy,
};

// ── Icônes de statut de vérification (les labels viennent de t()) ─
const VERIFICATION_ICONS = {
  none:        AlertCircle,
  pending:     Clock,
  verified_id: Shield,
  verified:    CheckCircle2,
};

const VERIFICATION_COLORS = {
  none:        colors.textMuted,
  pending:     colors.warning,
  verified_id: colors.info,
  verified:    colors.primary,
};

const AVAILABILITY_COLORS = {
  available:   colors.primary,
  busy:        colors.warning,
  unavailable: colors.danger,
};

// ── Écran principal ───────────────────────────────────────────────
export default function ProfileScreen() {
  const { t }     = useTranslation();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const user      = useAuthStore((s) => s.user);
  const setProvider = useAuthStore((s) => s.setProvider);

  const [provider,    setLocalProvider] = useState(null);
  const [loadingProv, setLoadingProv]   = useState(true);

  const loadMyProvider = useCallback(async () => {
    if (!user) return;
    setLoadingProv(true);
    try {
      const res = await api.get('/providers/me');
      const data = res.data.data;
      setLocalProvider(data);
      setProvider(data);
    } catch {
      setLocalProvider(null);
    } finally {
      setLoadingProv(false);
    }
  }, [user]);

  useEffect(() => { loadMyProvider(); }, [loadMyProvider]);

  if (!user) {
    return <GuestView insets={insets} router={router} t={t} />;
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || t('provider.you');
  const initials = fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const verStatus = provider?.verificationStatus || 'none';
  const verColor  = VERIFICATION_COLORS[verStatus] || VERIFICATION_COLORS.none;
  const verIcon   = VERIFICATION_ICONS[verStatus]  || VERIFICATION_ICONS.none;
  const verLabel  = t(`profile.badge.${verStatus}`);
  const plan      = provider?.plan || 'free';

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>{t('profile.headerTitle')}</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/settings')}
          activeOpacity={0.7}
        >
          <Settings size={20} color={colors.navy} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Carte identité */}
        <View style={styles.identityCard}>
          {user.avatarUrl || user.avatar_url ? (
            <Image source={{ uri: user.avatarUrl || user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <Text style={styles.profileName}>{fullName}</Text>
          <Text style={styles.profilePhone}>
            +237 {(user.phone || '').replace('+237', '').replace(/^237/, '')}
          </Text>
        </View>

        {/* Section fiche prestataire */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('profile.proSpace')}</Text>

          {loadingProv ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>{t('profile.loadingCard')}</Text>
            </View>
          ) : provider ? (
            <>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push(`/provider/${provider.id}`)}
              >
                <ProviderPreview provider={provider} verLabel={verLabel} verColor={verColor} t={t} />
              </TouchableOpacity>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => router.push('/provider/edit')}
                  activeOpacity={0.8}
                >
                  <Edit3 size={16} color={colors.white} strokeWidth={2.5} />
                  <Text style={styles.editBtnText}>{t('profile.editCard')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.proLinks}>
                <ProLink
                  icon={<Star size={18} color={PLAN_COLORS[plan]} />}
                  title={t('profile.subscription')}
                  value={plan.charAt(0).toUpperCase() + plan.slice(1)}
                  valueColor={PLAN_COLORS[plan]}
                  onPress={() => router.push('/subscription/plans')}
                />
                <ProLink
                  icon={<Shield size={18} color={verColor} />}
                  title={t('profile.verificationRequest')}
                  value={verLabel}
                  valueColor={verColor}
                  onPress={() => router.push('/verification')}
                />
              </View>
            </>
          ) : (
            <TouchableOpacity
              style={styles.createBanner}
              onPress={() => router.push('/provider/create')}
              activeOpacity={0.85}
            >
              <View style={styles.createIconWrap}>
                <Briefcase size={26} color={colors.white} />
              </View>
              <Text style={styles.createTitle}>{t('profile.becomeProvider')}</Text>
              <Text style={styles.createDesc}>{t('profile.becomeProviderDesc')}</Text>
              <View style={styles.createCta}>
                <Text style={styles.createCtaText}>{t('profile.createCard')}</Text>
              </View>
              <View style={styles.bannerDeco} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Aperçu fiche prestataire ──────────────────────────────────────
function ProviderPreview({ provider, verLabel, verColor, t }) {
  const availColor = AVAILABILITY_COLORS[provider.availability] || AVAILABILITY_COLORS.available;
  const availLabel = t(`provider.${provider.availability || 'available'}`);

  return (
    <View style={styles.previewCard}>
      <View style={styles.previewTop}>
        {provider.photoUrl ? (
          <Image source={{ uri: provider.photoUrl }} style={styles.providerPhoto} />
        ) : (
          <View style={styles.providerPhotoFallback}>
            <Briefcase size={24} color={colors.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.providerName}>{provider.name}</Text>
          <Text style={styles.providerSpecialty}>{provider.specialty}</Text>
          <View style={[styles.availBadge, { backgroundColor: availColor + '18' }]}>
            <View style={[styles.availDot, { backgroundColor: availColor }]} />
            <Text style={[styles.availText, { color: availColor }]}>{availLabel}</Text>
          </View>
        </View>
      </View>

      {!!provider.description && (
        <Text style={styles.previewDesc} numberOfLines={3}>{provider.description}</Text>
      )}

      <View style={styles.metricsRow}>
        <Metric label={t('provider.reviews')}      value={provider.reviewCount || 0} />
        <View style={styles.metricDivider} />
        <Metric label={t('provider.trustScore')}   value={`${provider.trustScore || 0}%`} />
        <View style={styles.metricDivider} />
        <Metric label={t('provider.viewsThisMonth')} value={provider.viewsThisMonth || 0} />
      </View>

      <Text style={styles.previewLocation}>
        {[provider.neighborhoodName, provider.cityName].filter(Boolean).join(', ')}
      </Text>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

// ── Lien action rapide ────────────────────────────────────────────
function ProLink({ icon, title, value, valueColor, onPress }) {
  return (
    <TouchableOpacity style={styles.proLinkCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.proLinkIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.proLinkTitle}>{title}</Text>
        <Text style={[styles.proLinkValue, { color: valueColor }]}>{value}</Text>
      </View>
      <ChevronRight size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ── Vue invité ────────────────────────────────────────────────────
function GuestView({ insets, router, t }) {
  return (
    <View style={[styles.flex, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>{t('profile.headerTitle')}</Text>
      </View>
      <View style={styles.guestCard}>
        <View style={styles.guestIcon}>
          <User size={44} color={colors.textMuted} />
        </View>
        <Text style={styles.guestTitle}>{t('auth.title')}</Text>
        <Text style={styles.guestDesc}>{t('profile.loginRequired')}</Text>
        <Button
          title={t('favorites.signIn')}
          onPress={() => router.push('/(auth)/login')}
          style={{ marginTop: 24, width: '100%' }}
        />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.navy },
  settingsBtn: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },

  identityCard: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  avatar: {
    width: 88, height: 88, borderRadius: 28,
    borderWidth: 3, borderColor: colors.white,
    marginBottom: 14,
  },
  avatarFallback: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    borderWidth: 3, borderColor: colors.white,
  },
  avatarInitials: { fontSize: 30, fontWeight: '800', color: colors.primary },
  profileName:   { fontSize: 20, fontWeight: '800', color: colors.navy, marginBottom: 4 },
  profilePhone:  { fontSize: 14, color: colors.textMuted, fontWeight: '500' },

  section:      { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 16,
  },

  loadingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.white, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  loadingText: { fontSize: 14, color: colors.textMuted },

  previewCard: {
    backgroundColor: colors.white, borderRadius: 18,
    padding: 18, borderWidth: 1, borderColor: colors.borderLight,
    shadowColor: colors.navy, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    marginBottom: 14,
  },
  previewTop: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 12 },
  providerPhoto: { width: 64, height: 64, borderRadius: 16 },
  providerPhotoFallback: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center', alignItems: 'center',
  },
  providerName:      { fontSize: 16, fontWeight: '800', color: colors.navy, marginBottom: 3 },
  providerSpecialty: { fontSize: 13, color: colors.textMuted, marginBottom: 8 },
  availBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  availDot:  { width: 6, height: 6, borderRadius: 3 },
  availText: { fontSize: 11, fontWeight: '700' },
  previewDesc: {
    fontSize: 13, color: colors.textSecondary, lineHeight: 19,
    marginBottom: 14,
  },
  metricsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 18, fontWeight: '800', color: colors.navy },
  metricLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  metricDivider: { width: 1, height: 32, backgroundColor: colors.border },
  previewLocation: { fontSize: 12, color: colors.textMuted },

  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 14,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  editBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },

  proLinks: { gap: 10, marginBottom: 24 },
  proLinkCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.white, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: colors.borderLight,
  },
  proLinkIcon: {
    width: 40, height: 40, borderRadius: 11,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  proLinkTitle: { fontSize: 13, color: colors.textMuted, marginBottom: 2 },
  proLinkValue: { fontSize: 15, fontWeight: '700' },

  createBanner: {
    backgroundColor: colors.primary, borderRadius: 20,
    overflow: 'hidden', padding: 24, marginBottom: 24,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
  },
  createIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  createTitle: { fontSize: 19, fontWeight: '800', color: colors.white, marginBottom: 8 },
  createDesc:  { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 21, marginBottom: 20 },
  createCta: {
    alignSelf: 'flex-start', backgroundColor: colors.white,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
  },
  createCtaText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  bannerDeco: {
    position: 'absolute', right: -40, top: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  guestCard: {
    margin: 20, padding: 32,
    backgroundColor: colors.white, borderRadius: 24,
    alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight,
    shadowColor: colors.navy, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10,
  },
  guestIcon: {
    width: 84, height: 84, borderRadius: 26,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', marginBottom: 22,
  },
  guestTitle: { fontSize: 21, fontWeight: '800', color: colors.navy, marginBottom: 8 },
  guestDesc:  { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});