import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  User, Settings, Briefcase, Shield,
  CheckCircle2, Clock, AlertCircle, Star, ChevronRight
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/Button';

const VERIFICATION_DISPLAY = {
  none:        { label: 'Non vérifié',       color: colors.textMuted,  Icon: AlertCircle },
  pending:     { label: 'En cours d\'examen', color: colors.warning,   Icon: Clock },
  verified_id: { label: 'Identité vérifiée', color: colors.info,       Icon: Shield },
  verified:    { label: 'Vérifié',           color: colors.primary,    Icon: CheckCircle2 },
};

const PLAN_COLORS = {
  free: colors.textMuted, premium: colors.primary, professional: colors.navyMid, enterprise: colors.navy,
};

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router      = useRouter();
  const insets      = useSafeAreaInsets();
  const user        = useAuthStore((s) => s.user);
  const provider    = useAuthStore((s) => s.provider);

  if (!user) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('tabs.profile') || 'Profil'}</Text>
        </View>
        <View style={styles.guestCard}>
          <View style={styles.guestIcon}>
            <User size={48} color={colors.textMuted} />
          </View>
          <Text style={styles.guestTitle}>Connectez-vous</Text>
          <Text style={styles.guestDesc}>Accédez à votre profil, vos favoris et gérez votre fiche prestataire.</Text>
          <Button title={t('auth.title') || 'Se connecter'} onPress={() => router.push('/(auth)/login')} style={{ marginTop: 24, width: '100%' }} />
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
    <ScrollView style={[styles.flex, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      {/* Header unifié avec le design de favorites.js (Grand titre + Bouton Paramètres aligné) */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('profile.title') || 'Mon Profil'}</Text>
         
        </View>
        <TouchableOpacity 
          style={styles.settingsBtn} 
          onPress={() => router.push('/settings')}
          activeOpacity={0.7}
        >
          <Settings size={22} color={colors.navy} />
        </TouchableOpacity>
      </View>

      {/* Carte d'identité principale */}
      <View style={styles.identityCard}>
        <View style={styles.avatarWrap}>
          {user.avatarUrl || user.avatar_url ? (
            <Image source={{ uri: user.avatarUrl || user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </View>
        <Text style={styles.profileName}>{fullName}</Text>
        <Text style={styles.profilePhone}>+237 {(user.phone || '').replace('+237', '')}</Text>
      </View>

      {/* Espace Prestataire */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Espace Professionnel</Text>
        
        {provider ? (
          <View style={styles.providerContainer}>
            {/* Statut abonnement */}
            <TouchableOpacity style={styles.proCard} onPress={() => router.push('/subscription/plans')} activeOpacity={0.7}>
              <View style={[styles.iconWrap, { backgroundColor: (PLAN_COLORS[plan] || colors.primary) + '18' }]}>
                <Star size={22} color={PLAN_COLORS[plan] || colors.primary} />
              </View>
              <View style={styles.proCardContent}>
                <Text style={styles.proCardTitle}>Mon abonnement</Text>
                <Text style={[styles.proCardValue, { color: PLAN_COLORS[plan] }]}>
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Vérification */}
            <TouchableOpacity style={styles.proCard} onPress={() => router.push('/verification')} activeOpacity={0.7}>
              <View style={[styles.iconWrap, { backgroundColor: verDisplay.color + '18' }]}>
                <verDisplay.Icon size={22} color={verDisplay.color} />
              </View>
              <View style={styles.proCardContent}>
                <Text style={styles.proCardTitle}>Statut de vérification</Text>
                <Text style={[styles.proCardValue, { color: verDisplay.color }]}>
                  {verDisplay.label}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.createBanner} onPress={() => router.push('/provider/create')} activeOpacity={0.85}>
            <View style={styles.createBannerContent}>
              <View style={styles.createIconWrap}>
                <Briefcase size={28} color={colors.white} />
              </View>
              <Text style={styles.createTitle}>Devenir Prestataire</Text>
              <Text style={styles.createDesc}>Créez votre fiche professionnelle et proposez vos services à des milliers de clients.</Text>
              <View style={styles.createBtn}>
                <Text style={styles.createBtnText}>Créer ma fiche</Text>
              </View>
            </View>
            <View style={styles.bannerDecoration} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>{t('profile.version') || 'Version 1.0.0'}</Text>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  header:  {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  title:   { fontSize: 28, fontWeight: '800', color: colors.navy },
  count:   { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  identityCard: {
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
  },
  avatarWrap: { 
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  avatar: { 
    width: 96, 
    height: 96, 
    borderRadius: 32,
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarFallback: { 
    width: 96, 
    height: 96, 
    borderRadius: 32, 
    backgroundColor: colors.primaryBg, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarInitials: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: colors.primary 
  },
  profileName: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: colors.navy,
    marginBottom: 4,
  },
  profilePhone: { 
    fontSize: 15, 
    color: colors.textMuted,
    fontWeight: '500',
  },
  section: { 
    paddingHorizontal: 20, 
    marginBottom: 24 
  },
  sectionLabel: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: colors.textMuted, 
    textTransform: 'uppercase', 
    letterSpacing: 1, 
    marginBottom: 16 
  },
  providerContainer: {
    gap: 12,
  },
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1, 
    borderColor: colors.borderLight,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  iconWrap: { 
    width: 48, 
    height: 48, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 16,
  },
  proCardContent: { 
    flex: 1 
  },
  proCardTitle: { 
    fontSize: 14, 
    color: colors.textMuted,
    marginBottom: 4,
  },
  proCardValue: { 
    fontSize: 16, 
    fontWeight: '700', 
  },
  createBanner: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  createBannerContent: {
    padding: 24,
    position: 'relative',
    zIndex: 2,
  },
  createIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  createTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: colors.white,
    marginBottom: 8,
  },
  createDesc: { 
    fontSize: 14, 
    color: 'rgba(255,255,255,0.85)', 
    lineHeight: 22,
    marginBottom: 20,
  },
  createBtn: {
    backgroundColor: colors.white,
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  bannerDecoration: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 1,
  },
  guestCard: { 
    marginHorizontal: 20,
    marginTop: 40,
    padding: 32, 
    backgroundColor: colors.white, 
    borderRadius: 24, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: colors.borderLight,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  guestIcon: { 
    width: 88, 
    height: 88, 
    borderRadius: 28, 
    backgroundColor: colors.surface, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 24 
  },
  guestTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: colors.navy, 
    marginBottom: 8 
  },
  guestDesc: { 
    fontSize: 15, 
    color: colors.textMuted, 
    textAlign: 'center', 
    lineHeight: 22 
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  version: { 
    fontSize: 12, 
    color: colors.textDisabled, 
    fontWeight: '500'
  },
});