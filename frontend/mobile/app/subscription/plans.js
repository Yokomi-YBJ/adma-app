/**
 * ADMA — Écran Forfaits (avec gestion downgrade programmé)
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, Dimensions,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ChevronLeft, Calendar } from 'lucide-react-native';
import api from '../../services/api';
import { useModalStore } from '../../store/modal.store';

const { width } = Dimensions.get('window');

const COLORS = {
  bg:        '#FAFBFC',
  dark:      '#0B162C',
  medium:    '#1C2942',
  muted:     '#3B556D',
  accent:    '#5FC2BA',
  white:     '#FFFFFF',
  border:    '#EAEAEA',
  track:     '#F0F2F5',
  warning:   '#F59E0B',
  warningBg: '#FEF3C7',
};

const PLAN_KEYS = ['premium', 'professional', 'enterprise'];

const RADIUS_SCALES = { premium: 1, professional: 1.6, enterprise: 2.5 };

const SEGMENT_WIDTH = (width - 48 - 8) / 3;

export default function PlansScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [loading, setLoading]             = useState(true);
  const [data, setData]                   = useState(null);
  const [selectedPlan, setSelected]       = useState('premium');
  const [pendingChange, setPendingChange] = useState(null);
  const [cancelling, setCancelling]       = useState(false);

  const indicatorPosition = useSharedValue(0);
  const radiusScale       = useSharedValue(1);
  const planIndex         = useSharedValue(0);

  const loadData = async () => {
    try {
      const res = await api.get('/providers/me/pricing');
      const d = res.data.data;
      setData(d);
      const initial = d?.plan === 'free' || !d?.plan ? 'premium' : d.plan;
      setSelected(initial);
      const idx = PLAN_KEYS.indexOf(initial);
      indicatorPosition.value = idx;
      planIndex.value = idx;
      radiusScale.value = RADIUS_SCALES[initial];
    } catch {
      setData(null);
    }

    try {
      const res = await api.get('/payments/pending-plan');
      setPendingChange(res.data.data);
    } catch {
      setPendingChange(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const idx = PLAN_KEYS.indexOf(selectedPlan);
    planIndex.value = idx;
    indicatorPosition.value = withSpring(idx, { damping: 20, stiffness: 200 });
    radiusScale.value = withSpring(RADIUS_SCALES[selectedPlan], { damping: 15, stiffness: 120 });
  }, [selectedPlan]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorPosition.value * SEGMENT_WIDTH }],
  }));

  const radiusStyle = useAnimatedStyle(() => {
    const isEnterprise = planIndex.value === PLAN_KEYS.indexOf('enterprise');
    return {
      transform: [{ scale: radiusScale.value }],
      borderColor: withTiming(isEnterprise ? COLORS.accent : COLORS.muted, { duration: 300 }),
      backgroundColor: withTiming(
        isEnterprise ? 'rgba(95, 194, 186, 0.05)' : 'rgba(59, 85, 109, 0.05)',
        { duration: 300 }
      ),
    };
  });

  const handleCancelPending = () => {
    const targetPlanKey = pendingChange?.newPlan ? String(pendingChange.newPlan).toLowerCase() : '';
    const targetPlanName = targetPlanKey ? t(`plans.${targetPlanKey}.name`, pendingChange.newPlan) : '';

    useModalStore.getState().show({
      type: 'warning',
      title: t('common.cancelChange', 'Annuler le changement'),
      message: t('common.cancelChangeConfirm', { plan: targetPlanName }),
      confirmText: t('common.yes', 'Oui, annuler'),
      cancelText: t('common.no', 'Non'),
      destructive: true,
      onConfirm: async () => {
        setCancelling(true);
        try {
          await api.delete('/payments/pending-plan');
          setPendingChange(null);
        } catch (err) {
          useModalStore.getState().show({
            type: 'error',
            title: t('common.error', 'Erreur'),
            message: err.userMessage || t('common.cancelChangeError', "Impossible d'annuler le changement."),
            confirmText: t('common.ok', 'OK'),
          });
        } finally {
          setCancelling(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={15}>
            <ChevronLeft size={24} color={COLORS.dark} strokeWidth={2} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>{t('plans.noProvider.title')}</Text>
          <Text style={styles.emptyBody}>{t('plans.noProvider.body')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentPlanData = data.plans[selectedPlan];
  const isActivePlan    = data.plan === selectedPlan;
  const currentStep     = isActivePlan ? Math.min(data.loyaltyMonths || 0, 2) : 0;
  const immediatePrice  = currentPlanData.prices[currentStep];

  const handlePay = () => {
    router.push({
      pathname: '/subscription/payment',
      params: { plan: selectedPlan, amount: immediatePrice },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={15}>
          <ChevronLeft size={24} color={COLORS.dark} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('plans.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 🆕 Bandeau programmation */}
      {pendingChange && (
        <View style={styles.scheduledBanner}>
          <View style={styles.scheduledHeader}>
            <Calendar size={18} color={COLORS.warning} strokeWidth={2.5} />
            <Text style={styles.scheduledTitle}>Changement programmé</Text>
          </View>
          <Text style={styles.scheduledText}>
            Passage au plan <Text style={styles.scheduledPlan}>
              {pendingChange.newPlan}
            </Text>{' '}le{' '}
            {new Date(pendingChange.effectiveAt).toLocaleDateString('fr-FR', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
          </Text>
          <Pressable
            style={[styles.cancelBtn, cancelling && { opacity: 0.5 }]}
            onPress={handleCancelPending}
            disabled={cancelling}
          >
            {cancelling
              ? <ActivityIndicator size="small" color={COLORS.white} />
              : <Text style={styles.cancelBtnText}>Annuler le changement</Text>
            }
          </Pressable>
        </View>
      )}

      <View style={styles.segmentedControl}>
        <Animated.View style={[styles.activeIndicator, indicatorStyle]} />
        {PLAN_KEYS.map((key) => {
          const isSelected = selectedPlan === key;
          return (
            <Pressable
              key={key}
              style={styles.segmentBtn}
              onPress={() => setSelected(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
                {t(`plans.${key}.name`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.content}>
        <View style={styles.visualizerContainer}>
          <Animated.View style={[styles.radarCircle, radiusStyle]}>
            <View style={styles.radarCenter} />
          </Animated.View>
          <View style={styles.radiusBadge}>
            <Text style={styles.radiusText}>
              {currentPlanData.radius === null
                ? t('plans.radius.unlimited')
                : t('plans.radius.km', { val: currentPlanData.radius })}
            </Text>
          </View>
        </View>

        <View style={styles.pricingContainer}>
          <Text style={styles.priceLabel}>
            {isActivePlan ? t('plans.next_payment') : t('plans.first_payment')}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceValue}>{immediatePrice.toLocaleString('fr-FR')}</Text>
            <Text style={styles.priceCurrency}>FCFA</Text>
          </View>

          <View style={styles.timeline}>
            <View style={styles.timelineLine} />
            {[0, 1, 2].map((stepIndex) => {
              const isPast   = isActivePlan && stepIndex < currentStep;
              const isActive = isActivePlan && stepIndex === currentStep;
              const priceAtStep = currentPlanData.prices[stepIndex];
              const stepLabel = stepIndex === 2
                ? t('plans.month_3_plus')
                : t('plans.month_x', { val: stepIndex + 1 });

              return (
                <View key={stepIndex} style={styles.timelineNode}>
                  <View style={[
                    styles.nodeCircle,
                    isActive && styles.nodeCircleActive,
                    isPast && styles.nodeCirclePast,
                  ]} />
                  <Text style={[styles.nodeLabel, (isActive || isPast) && styles.nodeLabelActive]}>
                    {stepLabel}
                  </Text>
                  <Text style={[
                    styles.nodePrice,
                    isActive && styles.nodePriceActive,
                    isPast && styles.nodePricePast,
                  ]}>
                    {priceAtStep}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.payButton} onPress={handlePay} accessibilityRole="button">
          <Text style={styles.payButtonText}>
            {isActivePlan
              ? t('plans.renew_for', { price: immediatePrice.toLocaleString('fr-FR') })
              : t('plans.start_for',  { price: immediatePrice.toLocaleString('fr-FR') })}
          </Text>
        </Pressable>
        <Text style={styles.graceNote}>{t('plans.grace_period_note')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16,
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.dark, letterSpacing: 0.2 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginBottom: 8, textAlign: 'center' },
  emptyBody:  { fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },

  scheduledBanner: {
    marginHorizontal: 24, marginTop: 8, marginBottom: 4,
    padding: 14, borderRadius: 14,
    backgroundColor: COLORS.warningBg,
    borderWidth: 1, borderColor: COLORS.warning,
  },
  scheduledHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  scheduledTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  scheduledText:  { fontSize: 13, color: '#78350F', lineHeight: 19, marginBottom: 12 },
  scheduledPlan:  { fontWeight: '700', color: COLORS.warning },
  cancelBtn: {
    alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: COLORS.warning, borderRadius: 8, minWidth: 80,
    alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },

  segmentedControl: {
    flexDirection: 'row', marginHorizontal: 24, marginTop: 8,
    backgroundColor: COLORS.track, borderRadius: 12, padding: 4, position: 'relative',
  },
  activeIndicator: {
    position: 'absolute', top: 4, left: 4, bottom: 4,
    width: SEGMENT_WIDTH, backgroundColor: COLORS.white, borderRadius: 8,
    shadowColor: COLORS.dark, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  segmentBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  segmentText:       { fontSize: 13, fontWeight: '500', color: COLORS.muted, letterSpacing: 0.3 },
  segmentTextActive: { color: COLORS.dark, fontWeight: '600' },

  content: { flex: 1, paddingHorizontal: 24 },
  visualizerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  radarCircle: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center', position: 'absolute',
  },
  radarCenter: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.dark },
  radiusBadge: {
    position: 'absolute', bottom: 20, backgroundColor: COLORS.white,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  radiusText: { fontSize: 12, fontWeight: '600', color: COLORS.dark, letterSpacing: 0.5 },

  pricingContainer: { paddingTop: 32, paddingBottom: 24 },
  priceLabel: { fontSize: 14, color: COLORS.muted, fontWeight: '500', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 32 },
  priceValue: { fontSize: 48, fontWeight: '300', color: COLORS.dark, letterSpacing: -1.5 },
  priceCurrency: { fontSize: 20, fontWeight: '400', color: COLORS.muted, marginLeft: 8 },

  timeline: { flexDirection: 'row', justifyContent: 'space-between', position: 'relative', marginTop: 16 },
  timelineLine: {
    position: 'absolute', top: 6, left: 20, right: 20,
    height: 2, backgroundColor: COLORS.border, zIndex: 0,
  },
  timelineNode: { alignItems: 'center', width: 60, zIndex: 1 },
  nodeCircle: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.bg,
    borderWidth: 2, borderColor: COLORS.border, marginBottom: 12,
  },
  nodeCircleActive: { borderColor: COLORS.dark, backgroundColor: COLORS.dark },
  nodeCirclePast:   { borderColor: COLORS.dark },
  nodeLabel:        { fontSize: 11, color: COLORS.muted, fontWeight: '500', marginBottom: 4 },
  nodeLabelActive:  { color: COLORS.dark, fontWeight: '600' },
  nodePrice:        { fontSize: 13, color: COLORS.muted, fontWeight: '500' },
  nodePriceActive:  { color: COLORS.dark, fontWeight: '700' },
  nodePricePast:    { textDecorationLine: 'line-through', opacity: 0.5 },

  footer: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 0 : 24, paddingTop: 16 },
  payButton: {
    backgroundColor: COLORS.dark, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  payButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
  graceNote: {
    fontSize: 11, color: COLORS.muted, textAlign: 'center', lineHeight: 16, opacity: 0.7,
  },
});