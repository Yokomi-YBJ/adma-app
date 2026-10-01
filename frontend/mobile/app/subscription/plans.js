/**
 * ADMA — Écran des plans d'abonnement
 * Multilingue : Français / Anglais / Fulfulde
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
import { useTranslation } from 'react-i18next';
import {
  Check,
  ChevronLeft,
  Zap,
  Crown,
  MapPin,
  Award,
  CheckCircle2
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/Button';

// Le plan "free" a été retiré, on ne garde que les plans professionnels
const PLANS_CONFIG = [
  {
    id: 'premium',
    price: 1000,
    color: '#0284C7',
    bg: '#E0F2FE',
    icon: Zap,
  },
  {
    id: 'professional',
    price: 2500,
    color: '#6D28D9',
    bg: '#EDE9FE',
    icon: Award,
  },
  {
    id: 'enterprise',
    price: 5000,
    color: '#B45309',
    bg: '#FEF3C7',
    icon: Crown,
  },
];

function PlanCard({ planConfig, isCurrent, onSelect }) {
  const { t } = useTranslation();
  const Icon = planConfig.icon;
  const isPopular = planConfig.id === 'professional';

  const planName = t(`plans.${planConfig.id}.label`, planConfig.id);
  const planRadius = t(`plans.${planConfig.id}.radius`, '');
  const features = t(`plans.${planConfig.id}.features`, { returnObjects: true }) || [];

  return (
    <View
      style={[
        styles.planCard,
        isCurrent && { borderColor: planConfig.color, borderWidth: 2 },
        isPopular && !isCurrent && { borderColor: planConfig.color, borderWidth: 1.5 },
      ]}
    >
      {/* Badges (Populaire ou Actuel) */}
      <View style={styles.badgesContainer}>
        {isPopular && !isCurrent && (
          <View style={[styles.badge, { backgroundColor: planConfig.color }]}>
            <Award size={12} color="#FFF" style={styles.badgeIcon} />
            <Text style={styles.badgeText}>
              {t('plans.popularBadge', 'POPULAIRE')}
            </Text>
          </View>
        )}
        {isCurrent && (
          <View style={[styles.badge, { backgroundColor: colors.text }]}>
            <CheckCircle2 size={12} color="#FFF" style={styles.badgeIcon} />
            <Text style={styles.badgeText}>
              {t('plans.currentBadge', 'PLAN ACTUEL')}
            </Text>
          </View>
        )}
      </View>

      {/* En-tête de la carte */}
      <View style={styles.planHeader}>
        <View style={styles.planTitleRow}>
          <View style={[styles.planIconWrap, { backgroundColor: planConfig.bg }]}>
            <Icon size={22} color={planConfig.color} strokeWidth={2.5} />
          </View>
          <View style={styles.planTitleTextWrap}>
            <Text style={[styles.planName, { color: planConfig.color }]}>
              {planName.toUpperCase()}
            </Text>
            <View style={styles.radiusRow}>
              <MapPin size={12} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.radiusText}>
                {t('plans.radius', 'Portée')} : {planRadius}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Section Prix Centrale */}
      <View style={styles.priceSection}>
        <Text style={styles.priceAmount}>
          {planConfig.price.toLocaleString('fr-FR')}
        </Text>
        <Text style={styles.priceCurrency}>
          FCFA <Text style={styles.pricePeriod}>{t('subscription.perMonth', '/ mois')}</Text>
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Liste des fonctionnalités */}
      <View style={styles.featuresList}>
        {Array.isArray(features) &&
          features.map((feat, idx) => (
            <View key={idx} style={styles.featureRow}>
              <View style={[styles.checkWrap, { backgroundColor: planConfig.bg }]}>
                <Check size={14} color={planConfig.color} strokeWidth={3} />
              </View>
              <Text style={styles.featureText}>{feat}</Text>
            </View>
          ))}
      </View>

      {/* Bouton d'action */}
      <View style={styles.actionContainer}>
        <Button
          title={
            isCurrent
              ? t('plans.keepBtn', 'Conserver mon plan')
              : t('plans.selectBtn', 'Choisir ce plan')
          }
          variant={isCurrent ? 'outline' : isPopular ? 'primary' : 'outline'}
          onPress={() => onSelect(planConfig)}
          style={[
            styles.actionButton,
            isPopular && !isCurrent && { backgroundColor: planConfig.color, borderColor: planConfig.color }
          ]}
        />
      </View>
    </View>
  );
}

export default function PlansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const provider = useAuthStore((s) => s.provider);

  const currentPlan = provider?.plan || 'free';

  function handleSelectPlan(plan) {
    if (plan.id === currentPlan) {
      router.back();
      return;
    }

    const planLabel = t(`plans.${plan.id}.label`, plan.id);
    router.push({
      pathname: '/subscription/payment',
      params: {
        planId: plan.id,
        price: plan.price,
        label: planLabel,
      },
    });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header Minimaliste */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.6}
        >
          <ChevronLeft size={28} color={colors.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('plans.header', 'Abonnements')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>{t('plans.title', "Choisissez votre plan")}</Text>
          <Text style={styles.pageSub}>
            {t('plans.subtitle', 'Développez votre activité et attirez plus de clients grâce à nos outils professionnels.')}
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          {PLANS_CONFIG.map((plan) => (
            <PlanCard
              key={plan.id}
              planConfig={plan}
              isCurrent={currentPlan === plan.id}
              onSelect={handleSelectPlan}
            />
          ))}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || '#F8FAFC',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  titleSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  pageSub: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  cardsContainer: {
    gap: 20,
  },
  planCard: {
    backgroundColor: colors.white || '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.borderLight || '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
    position: 'relative',
  },
  badgesContainer: {
    position: 'absolute',
    top: -14,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  badgeIcon: {
    marginRight: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  planHeader: {
    marginBottom: 20,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  planIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitleTextWrap: {
    flex: 1,
  },
  planName: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radiusText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -1,
  },
  priceCurrency: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
    marginBottom: 6,
  },
  pricePeriod: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight || '#F1F5F9',
    marginVertical: 24,
  },
  featuresList: {
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
  actionContainer: {
    marginTop: 32,
  },
  actionButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
  },
});