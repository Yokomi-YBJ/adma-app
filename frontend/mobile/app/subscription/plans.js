/**
 * ADMA — Écran des plans d'abonnement
 * Design moderne avec affichage de la portée (rayon)
 */
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check,
  ChevronLeft,
  Star,
  Zap,
  Crown,
  MapPin,
  Clock,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/Button';

// ─── Données locales des plans ──────────────────────────────────
const PLANS_DATA = [
  {
    id: 'free',
    label_fr: 'Gratuit',
    price: 0,
    radius: 3,
    radiusLabel: '3 km',
    color: '#059669',
    bg: '#ECFDF5',
    icon: Star,
    features: [
      'Fiche de base visible',
      'Contactable par les clients',
      'Avis et score de confiance',
      'Portée : 3 km',
    ],
  },
  {
    id: 'premium',
    label_fr: 'Premium',
    price: 1000,
    radius: 6,
    radiusLabel: '6 km',
    color: '#0284C7',
    bg: '#E0F2FE',
    icon: Star,
    features: [
      'Tout du gratuit',
      'Photo de profil HD mise en avant',
      'Galerie 3 photos',
      'Statistiques de base',
      'Boost de visibilité',
      'Portée : 6 km',
    ],
  },
  {
    id: 'professional',
    label_fr: 'Professional',
    price: 2500,
    radius: 9,
    radiusLabel: '9 km',
    color: '#6D28D9',
    bg: '#EDE9FE',
    icon: Zap,
    features: [
      'Tout du Premium',
      "Galerie jusqu'à 10 photos",
      'Lien vers votre site web',
      'Statistiques avancées (vues, clics)',
      'Badge Professionnel',
      'Portée : 9 km',
    ],
  },
  {
    id: 'enterprise',
    label_fr: 'Enterprise',
    price: 5000,
    radius: null,
    radiusLabel: 'Illimité',
    color: '#B45309',
    bg: '#FEF3C7',
    icon: Crown,
    features: [
      'Tout du Pro',
      'Galerie illimitée',
      'Fiche multi-services',
      'Support prioritaire',
      'Badge Entreprise gold',
      'Portée illimitée',
    ],
  },
];

function PlanCard({ plan, isCurrent, onSelect }) {
  const Icon = plan.icon;
  const colorsPlan = {
    bg: plan.bg,
    border: plan.color,
    text: plan.color,
    icon: plan.color,
  };
  const isPopular = plan.id === 'professional';
  const isFree = plan.id === 'free';

  return (
    <View
      style={[
        styles.planCard,
        { borderColor: isCurrent ? colorsPlan.border : colors.borderLight },
        isCurrent && styles.planCardCurrent,
        isPopular && styles.planCardPopular,
      ]}
    >
      {isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>⭐ Le plus populaire</Text>
        </View>
      )}

      <View style={styles.planHeader}>
        <View style={[styles.planIconWrap, { backgroundColor: colorsPlan.bg }]}>
          <Icon size={24} color={colorsPlan.icon} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.planName, { color: colorsPlan.text }]}>
            {plan.label_fr}
          </Text>
          <View style={styles.radiusRow}>
            <MapPin size={14} color={colorsPlan.icon} strokeWidth={2} />
            <Text style={[styles.radiusText, { color: colorsPlan.text }]}>
              Portée : {plan.radiusLabel}
            </Text>
          </View>
        </View>
        {isCurrent && (
          <View style={[styles.currentBadge, { backgroundColor: colorsPlan.bg }]}>
            <Check size={14} color={colorsPlan.icon} strokeWidth={3} />
            <Text style={[styles.currentText, { color: colorsPlan.text }]}>Actuel</Text>
          </View>
        )}
      </View>

      <View style={styles.priceContainer}>
        {isFree ? (
          <View style={styles.freePriceBadge}>
            <Text style={styles.freePriceText}>0 FCFA</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.planPrice, { color: colorsPlan.text }]}>
              {plan.price.toLocaleString('fr-FR')}
            </Text>
            <Text style={[styles.planCurrency, { color: colorsPlan.text }]}> FCFA/mois</Text>
          </>
        )}
      </View>

      <View style={styles.featuresList}>
        {plan.features.map((feat, i) => {
          const isRadius = feat.startsWith('Portée');
          return (
            <View key={i} style={[styles.featureRow, isRadius && styles.radiusFeature]}>
              <View style={[styles.checkCircle, { backgroundColor: colorsPlan.bg }]}>
                <Check size={11} color={colorsPlan.icon} strokeWidth={3} />
              </View>
              <Text style={[styles.featureText, isRadius && { fontWeight: '700', color: colorsPlan.text }]}>
                {feat}
              </Text>
            </View>
          );
        })}
      </View>

      {!isCurrent && !isFree && (
        <Button
          title={`Passer au ${plan.label_fr}`}
          onPress={() => onSelect(plan)}
          variant={isPopular ? 'primary' : 'secondary'}
          size="md"
          style={{ marginTop: 16 }}
        />
      )}
      {isCurrent && !isFree && (
        <View style={[styles.activeBar, { backgroundColor: colorsPlan.bg }]}>
          <Check size={14} color={colorsPlan.icon} strokeWidth={3} />
          <Text style={[styles.activeText, { color: colorsPlan.text }]}>Plan actif</Text>
        </View>
      )}
      {isFree && isCurrent && (
        <View style={[styles.activeBar, { backgroundColor: colorsPlan.bg }]}>
          <Check size={14} color={colorsPlan.icon} strokeWidth={3} />
          <Text style={[styles.activeText, { color: colorsPlan.text }]}>Plan gratuit actif</Text>
        </View>
      )}
    </View>
  );
}

export default function PlansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const provider = useAuthStore((s) => s.provider);

  const currentPlan = provider?.plan || 'free';

  function selectPlan(plan) {
    router.push({
      pathname: '/subscription/payment',
      params: { planId: plan.id, price: plan.price, label: plan.label_fr },
    });
  }

  return (
    <View style={styles.flex}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Abonnements</Text>
          <Text style={styles.subtitle}>Boostez votre visibilité locale</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {currentPlan !== 'free' && provider?.plan_expires_at && (
          <View style={styles.expiryBanner}>
            <Clock size={14} color={colors.primary} />
            <Text style={styles.expiryText}>
              Plan {currentPlan} — expire le{' '}
              {new Date(provider.plan_expires_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        )}

        {PLANS_DATA.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={currentPlan === plan.id}
            onSelect={selectPlan}
          />
        ))}

        <Text style={styles.legalNote}>
          Paiement sécurisé via KPay (Orange Money / MTN MoMo).{'\n'}
          Abonnement mensuel renouvelable. Annulable à tout moment depuis votre profil.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>ADMA — Tous droits réservés</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  expiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryBg,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  expiryText: { fontSize: 13, color: colors.primary, fontWeight: '600', flex: 1 },

  planCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  planCardCurrent: {
    borderWidth: 2.5,
    backgroundColor: colors.surface + '80',
  },
  planCardPopular: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomLeftRadius: 14,
  },
  popularText: { fontSize: 11, fontWeight: '800', color: colors.white, letterSpacing: 0.3 },

  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  planIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  radiusText: { fontSize: 13, fontWeight: '600' },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  currentText: { fontSize: 12, fontWeight: '700' },

  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  planPrice: { fontSize: 28, fontWeight: '900' },
  planCurrency: { fontSize: 14, fontWeight: '500', marginLeft: 4 },

  // ✅ Badge pour "0 FCFA"
  freePriceBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
  },
  freePriceText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },

  featuresList: { gap: 10 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radiusFeature: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: { fontSize: 14, color: colors.textSecondary, flex: 1 },

  activeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  activeText: { fontSize: 14, fontWeight: '700' },

  legalNote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 10,
  },
  footer: {
    marginTop: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: colors.textDisabled,
  },
});