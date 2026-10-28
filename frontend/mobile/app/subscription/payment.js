/**
 * ADMA — Écran de paiement (GeniusPay)
 * ✅ Gestion downgrade programmé (202)
 * ✅ Polling avec backoff exponentiel
 * ✅ Vérification expiration du lien
 */
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Check } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../constants/colors';
import api from '../../services/api';
import { useModalStore } from '../../store/modal.store';

const PENDING_PAYMENT_KEY = 'adma_pending_payment_v1';
const PLAN_KEYS = ['premium', 'professional', 'enterprise'];

const OPERATORS = [
  { id: 'orange_cmr',   label: 'Orange Money', color: '#FF7900' },
  { id: 'mtn_momo_cmr', label: 'MTN MoMo',     color: '#FFCC00' },
];

export default function PaymentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawPlan = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const rawAmount = Array.isArray(params.amount) ? params.amount[0] : params.amount;
  const initialPlan = PLAN_KEYS.includes(rawPlan) ? rawPlan : 'premium';
  const initialAmount = /^\d+$/.test(rawAmount || '') ? Number(rawAmount) : 0;
  const [plan, setPlan] = useState(initialPlan);
  const [amount, setAmount] = useState(initialAmount);
  const planRef = useRef(initialPlan);
  const amountRef = useRef(initialAmount);

  const [operator, setOperator]     = useState(null);
  const [phone, setPhone]           = useState('');
  const [restoring, setRestoring]   = useState(true);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [notice, setNotice]         = useState('');
  const [statusText, setStatusText] = useState('');
  const [pendingPaymentId, setPendingPaymentId] = useState(null);
  const pollRef    = useRef(null);
  const stoppedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    let mounted = true;
    stoppedRef.current = false;
    mountedRef.current = true;

    const restorePayment = async () => {
      try {
        const saved = await AsyncStorage.getItem(PENDING_PAYMENT_KEY);
        if (!saved) return;

        let pending;
        try {
          pending = JSON.parse(saved);
        } catch {
          await AsyncStorage.removeItem(PENDING_PAYMENT_KEY);
          if (mounted) setNotice(t('payment.storageInvalid'));
          return;
        }
        if (
          !pending ||
          typeof pending.paymentId !== 'string' ||
          !pending.paymentId ||
          !PLAN_KEYS.includes(pending.plan) ||
          !Number.isInteger(pending.amount) ||
          pending.amount <= 0
        ) {
          await AsyncStorage.removeItem(PENDING_PAYMENT_KEY);
          if (mounted) setNotice(t('payment.storageInvalid'));
          return;
        }

        if (!mounted) return;
        setPlan(pending.plan);
        setAmount(pending.amount);
        planRef.current = pending.plan;
        amountRef.current = pending.amount;
        setPendingPaymentId(pending.paymentId);
        setLoading(true);
        setStatusText(t('payment.resuming'));
        startPolling(pending.paymentId);
      } catch {
        if (mounted) setNotice(t('payment.storageUnavailable'));
      } finally {
        if (mounted) setRestoring(false);
      }
    };

    restorePayment();
    return () => {
      mounted = false;
      mountedRef.current = false;
      stoppedRef.current = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const isValidPhone = /^(\+?237)?6[5-9]\d{7}$/.test(phone.replace(/\s/g, ''));

  async function handlePay() {
    if (!operator)     { setError(t('payment.error.operator')); return; }
    if (!isValidPhone) { setError(t('payment.error.phone'));    return; }

    setError('');
    setLoading(true);
    setStatusText(t('payment.processing'));

    try {
      const res = await api.post('/payments/initiate', {
        planId:      plan,
        operator,
        phoneNumber: phone.replace(/\s/g, ''),
      });

      // Cas spécial : downgrade programmé (202)
      if (res.status === 202 || res.data.scheduled) {
        if (!mountedRef.current) return;
        setLoading(false);
        setStatusText('');
        const effectiveAt = res.data.data?.effectiveAt || res.data.effectiveAt;
        const effectiveDate = effectiveAt
          ? new Date(effectiveAt).toLocaleDateString(t('common.locale', 'fr-FR'), {
              day: '2-digit', month: 'long', year: 'numeric',
            })
          : '';
        const scheduledMessage = effectiveDate
          ? `${t('common.effectiveDate', { date: effectiveDate })}.`
          : t('common.scheduledChange');

        useModalStore.getState().show({
          type: 'info',
          title: t('common.scheduledChange', 'Changement programmé'),
          message: scheduledMessage,
          confirmText: t('common.ok', 'Compris'),
          onConfirm: () => router.back(),
        });
        return;
      }

      const payment = res.data?.data;
      const { paymentId, paymentUrl, checkoutUrl, expiresAt } = payment || {};
      if (
        typeof paymentId !== 'string' ||
        !paymentId ||
        !Number.isInteger(payment?.amount) ||
        payment.amount <= 0
      ) {
        throw new Error(t('payment.error.generic'));
      }
      const chargedAmount = payment.amount;

      // ✅ #13 : Vérifier que le lien n'est pas expiré
      const linkExpired = expiresAt && new Date(expiresAt) < new Date();
      if (linkExpired && mountedRef.current) {
        setNotice(t('payment.linkExpired'));
      }

      let storageFailed = false;
      try {
        await AsyncStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify({
          paymentId,
          plan,
          amount: chargedAmount,
          expiresAt: expiresAt || null,
        }));
      } catch {
        storageFailed = true;
      }

      if (!mountedRef.current) return;
      amountRef.current = chargedAmount;
      planRef.current = plan;
      setAmount(chargedAmount);
      setPendingPaymentId(paymentId);
      if (storageFailed) setNotice(t('payment.storageUnavailable'));

      // Ouvrir la page de paiement (USSD direct ou checkout web)
      const urlToOpen = paymentUrl || checkoutUrl;

      if (urlToOpen) {
        setStatusText(t('payment.opening'));
        try {
          await WebBrowser.openBrowserAsync(urlToOpen, {
            dismissButtonStyle: 'cancel',
            presentationStyle:  'pageSheet',
          });
        } catch {
          if (mountedRef.current) setNotice(t('payment.browserError'));
        }
      }

      if (!mountedRef.current) return;
      setStatusText(t('payment.awaitingConfirmation'));
      startPolling(paymentId);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.userMessage || t('payment.error.generic'));
      setLoading(false);
      setStatusText('');
    }
  }

  function startPolling(id) {
    setPendingPaymentId(id);
    setLoading(true);
    let attempt = 0;
    const delays = [1000, 2000, 4000, 8000, 15000, 15000, 15000, 15000, 15000, 15000];
    const MAX_TIME = 90_000;
    const startedAt = Date.now();

    const tick = async () => {
      if (stoppedRef.current) return;

      if (Date.now() - startedAt > MAX_TIME) {
        setLoading(false);
        setStatusText(t('payment.timeoutMessage'));
        return;
      }

      try {
        const res = await api.get(`/payments/${encodeURIComponent(id)}/status`);
        if (stoppedRef.current) return;
        const status = res.data?.data?.status;
        if (typeof status !== 'string') {
          throw new Error('Invalid payment status response');
        }

        if (status === 'completed') {
          await clearPendingPayment();
          if (stoppedRef.current) return;
          setLoading(false);
          setStatusText('');
          setPendingPaymentId(null);
          router.replace({
            pathname: '/subscription/success',
            params: { plan: planRef.current, amount: amountRef.current },
          });
          return;
        }

        if (status === 'failed' || status === 'cancelled' || status === 'refunded') {
          await clearPendingPayment();
          if (stoppedRef.current) return;
          setLoading(false);
          setStatusText('');
          setPendingPaymentId(null);
          setError(t('payment.error.failed'));
          return;
        }

        setStatusText(
          t('payment.waiting', { seconds: Math.floor((Date.now() - startedAt) / 1000) })
        );
      } catch {
        if (stoppedRef.current) return;
        setStatusText(t('payment.statusCheckFailed'));
      }

      const delay = delays[Math.min(attempt, delays.length - 1)];
      attempt++;
      pollRef.current = setTimeout(tick, delay);
    };

    pollRef.current = setTimeout(tick, delays[0]);
  }

  async function clearPendingPayment() {
    try {
      await AsyncStorage.removeItem(PENDING_PAYMENT_KEY);
    } catch {
      if (mountedRef.current) setNotice(t('payment.storageUnavailable'));
    }
  }

  const invalidRequest = !PLAN_KEYS.includes(rawPlan || 'premium') || initialAmount <= 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={15}>
            <ChevronLeft size={24} color={colors.navy} strokeWidth={2} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('payment.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summary}>
            <Text style={styles.summaryPlan}>{t(`plans.${plan}.name`)}</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('payment.total')}</Text>
              <Text style={styles.summaryAmount}>
                {amount.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
          </View>

          {loading || restoring ? (
            <View style={styles.waitingContainer}>
              <ActivityIndicator size="large" color={colors.primaryDark} />
              <Text style={styles.waitingText}>
                {statusText || (restoring ? t('payment.resuming') : t('payment.processing'))}
              </Text>
              <Text style={styles.waitingHint}>
                {t('payment.waitingHint')}
              </Text>
            </View>
          ) : pendingPaymentId ? (
            <View style={styles.pendingContainer}>
              <Text style={styles.pendingTitle}>{t('payment.pendingTitle')}</Text>
              <Text style={styles.waitingHint}>{statusText || t('payment.timeoutMessage')}</Text>
              <Pressable
                style={styles.pendingButton}
                onPress={() => startPolling(pendingPaymentId)}
              >
                <Text style={styles.pendingButtonText}>{t('payment.checkAgain')}</Text>
              </Pressable>
            </View>
          ) : invalidRequest ? (
            <View style={styles.pendingContainer}>
              <Text style={styles.pendingTitle}>{t('common.error')}</Text>
              <Text style={styles.waitingHint}>{t('payment.invalidRequest')}</Text>
              <Pressable style={styles.pendingButton} onPress={() => router.back()}>
                <Text style={styles.pendingButtonText}>{t('common.back')}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.sectionLabel}>{t('payment.chooseOperator')}</Text>
              {OPERATORS.map((op) => (
                <Pressable
                  key={op.id}
                  style={[
                    styles.operatorCard,
                    operator === op.id && styles.operatorCardActive,
                  ]}
                  onPress={() => setOperator(op.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: operator === op.id }}
                >
                  <View style={[styles.operatorDot, { backgroundColor: op.color }]} />
                  <Text style={styles.operatorLabel}>{op.label}</Text>
                  {operator === op.id && (
                    <Check size={18} color={colors.primaryDark} strokeWidth={3} />
                  )}
                </Pressable>
              ))}

              <Text style={styles.sectionLabel}>{t('payment.phoneLabel')}</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="6XX XXX XXX"
                placeholderTextColor={colors.textDisabled}
                keyboardType="phone-pad"
                autoComplete="tel"
                editable={!loading}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}

              <Text style={styles.note}>{t('payment.note')}</Text>
            </>
          )}
        </ScrollView>

        {!loading && !restoring && !pendingPaymentId && !invalidRequest && (
          <View style={styles.footer}>
            <Pressable style={styles.payBtn} onPress={handlePay} disabled={loading}>
              <Text style={styles.payBtnText}>
                {t('payment.payButton', { amount: amount.toLocaleString('fr-FR') })}
              </Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.navy },
  content: { padding: 24, paddingBottom: 40 },
  summary: {
    backgroundColor: colors.white, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.borderLight, marginBottom: 32,
  },
  summaryPlan: { fontSize: 14, color: colors.textSecondary, fontWeight: '500', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  summaryLabel: { fontSize: 13, color: colors.textMuted },
  summaryAmount: { fontSize: 24, fontWeight: '800', color: colors.navy },
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: colors.textSecondary,
    marginBottom: 12, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  operatorCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1.5, borderColor: colors.borderLight,
  },
  operatorCardActive: { borderColor: colors.primaryDark, backgroundColor: colors.primaryBg },
  operatorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  operatorLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.navy },
  input: {
    backgroundColor: colors.white, borderRadius: 14, padding: 16, fontSize: 16,
    color: colors.text, borderWidth: 1.5, borderColor: colors.borderLight, marginBottom: 16,
  },
  errorText: { fontSize: 13, color: colors.danger || '#DC2626', marginTop: 4, marginBottom: 8 },
  noticeText: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 8 },
  note: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  pendingContainer: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  pendingTitle: { fontSize: 17, fontWeight: '700', color: colors.navy, marginBottom: 12 },
  pendingButton: {
    marginTop: 20, backgroundColor: colors.navy, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 14,
  },
  pendingButtonText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  waitingContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  waitingText: {
    fontSize: 16, fontWeight: '600', color: colors.navy,
    marginTop: 20, textAlign: 'center',
  },
  waitingHint: {
    fontSize: 13, color: colors.textMuted,
    marginTop: 12, textAlign: 'center', lineHeight: 20,
  },
  footer: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 0 : 24, paddingTop: 12 },
  payBtn: {
    backgroundColor: colors.navy, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  payBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});