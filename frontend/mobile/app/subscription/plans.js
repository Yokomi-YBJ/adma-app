/**
 * ADMA — Écran des plans d'abonnement
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronLeft, Star, Zap, Crown, Building2 } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { PLANS } from '../../constants/config';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/Button';

const PLAN_ICONS = {
  free:         { Icon: Star,      color: colors.textMuted },
  premium:      { Icon: Star,      color: colors.primary },
  professional: { Icon: Zap,       color: colors.navyMid },
  enterprise:   { Icon: Crown,     color: colors.navy },
};

const PLAN_FEATURES = {
  free:         ['Fiche de base visible', 'Contactable par les clients', 'Avis et score de confiance'],
  premium:      ['Tout du gratuit', 'Photo de profil HD mise en avant', 'Galerie 3 photos', 'Statistiques de base', 'Boost de visibilite'],
  professional: ['Tout du Premium', 'Galerie jusqu\'a 10 photos', 'Lien vers votre site web', 'Statistiques avancees (vues, clics)', 'Badge Professionnel'],
  enterprise:   ['Tout du Pro', 'Galerie illimitee', 'Fiche multi-services', 'Support prioritaire', 'Badge Entreprise gold'],
};

function PlanCard({ plan, isCurrent, onSelect }) {
  const { Icon, color } = PLAN_ICONS[plan.id];
  const features        = PLAN_FEATURES[plan.id];
  const isPopular       = plan.id === 'professional';
  const isFree          = plan.id === 'free';

  return (
    <View style={[styles.planCard, isCurrent && styles.planCardCurrent, isPopular && styles.planCardPopular]}>
      {isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Le plus populaire</Text>
        </View>
      )}
      <View style={styles.planHeader}>
        <View style={[styles.planIconWrap, { backgroundColor: color + '18' }]}>
          <Icon size={22} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.planName}>{plan.label_fr}</Text>
          <View style={styles.priceRow}>
            {isFree ? (
              <Text style={styles.planPrice}>Gratuit</Text>
            ) : (
              <>
                <Text style={styles.planPrice}>{plan.price.toLocaleString('fr-FR')}</Text>
                <Text style={styles.planCurrency}> FCFA / mois</Text>
              </>
            )}
          </View>
        </View>
        {isCurrent && (
          <View style={styles.currentBadge}>
            <Check size={14} color={colors.primary} strokeWidth={3} />
            <Text style={styles.currentText}>Actuel</Text>
          </View>
        )}
      </View>

      <View style={styles.featuresList}>
        {features.map((feat, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={[styles.checkCircle, { backgroundColor: color + '20' }]}>
              <Check size={11} color={color} strokeWidth={3} />
            </View>
            <Text style={styles.featureText}>{feat}</Text>
          </View>
        ))}
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
        <View style={styles.activeBar}>
          <Check size={14} color={colors.primary} strokeWidth={3} />
          <Text style={styles.activeText}>Plan actif</Text>
        </View>
      )}
    </View>
  );
}

export default function PlansScreen() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const provider  = useAuthStore((s) => s.provider);
  const [loading, setLoading] = useState(false);

  const currentPlan = provider?.plan || 'free';

  function selectPlan(plan) {
    router.push({ pathname: '/subscription/payment', params: { planId: plan.id, price: plan.price, label: plan.label_fr } });
  }

  return (
    <View style={styles.flex}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Abonnements</Text>
          <Text style={styles.subtitle}>Boostez votre visibilite sur Adma</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Info plan actuel */}
        {currentPlan !== 'free' && provider?.plan_expires_at && (
          <View style={styles.expiryBanner}>
            <Star size={14} color={colors.primary} />
            <Text style={styles.expiryText}>
              Plan {currentPlan} — expire le{' '}
              {new Date(provider.plan_expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
        )}

        {Object.values(PLANS).map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={currentPlan === plan.id}
            onSelect={selectPlan}
          />
        ))}

        <Text style={styles.legalNote}>
          Les paiements sont traites via KPay (Orange Money / MTN MoMo).{'\n'}
          Abonnement mensuel, renouvelable. Annulable a tout moment depuis votre profil.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:            { flex: 1, backgroundColor: colors.background },
  header:          {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  backBtn:         {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  title:           { fontSize: 22, fontWeight: '800', color: colors.navy },
  subtitle:        { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  scrollContent:   { padding: 16, paddingBottom: 40 },

  expiryBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primaryBg,
    padding: 14, borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  expiryText:      { fontSize: 13, color: colors.primary, fontWeight: '600', flex: 1 },

  planCard: {
    backgroundColor: colors.white,
    borderRadius: 20, padding: 20,
    marginBottom: 14,
    borderWidth: 1.5, borderColor: colors.borderLight,
    position: 'relative', overflow: 'hidden',
  },
  planCardCurrent: { borderColor: colors.primary },
  planCardPopular: { borderColor: colors.primary, borderWidth: 2 },

  popularBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 6,
    borderBottomLeftRadius: 14,
  },
  popularText:     { fontSize: 11, fontWeight: '800', color: colors.white, letterSpacing: 0.3 },

  planHeader:      { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  planIconWrap:    { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  planName:        { fontSize: 18, fontWeight: '800', color: colors.navy },
  priceRow:        { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  planPrice:       { fontSize: 22, fontWeight: '900', color: colors.navy },
  planCurrency:    { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  currentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  currentText:     { fontSize: 12, fontWeight: '700', color: colors.primary },

  featuresList:    { gap: 10 },
  featureRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkCircle:     { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  featureText:     { fontSize: 14, color: colors.textSecondary, flex: 1 },

  activeBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 16, paddingVertical: 10,
    backgroundColor: colors.primaryBg, borderRadius: 12,
  },
  activeText:      { fontSize: 14, fontWeight: '700', color: colors.primary },

  legalNote: {
    fontSize: 12, color: colors.textMuted,
    textAlign: 'center', lineHeight: 18,
    marginTop: 8, paddingHorizontal: 10,
  },
});
