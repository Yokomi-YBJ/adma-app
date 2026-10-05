/**
 * ADMA — Écran de paiement (KPay)
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
import { colors } from '../../constants/colors';
import api from '../../services/api';

const OPERATORS = [
  { id: 'orange_cmr',   label: 'Orange Money', color: '#FF7900' },
  { id: 'mtn_momo_cmr', label: 'MTN MoMo',     color: '#FFCC00' },
];

export default function PaymentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const plan   = params.plan || 'premium';
  const amount = parseInt(params.amount, 10) || 0;

  const [operator, setOperator] = useState(null);
  const [phone, setPhone]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const pollRef = useRef(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const isValidPhone = /^(\+?237)?6[5-9]\d{7}$/.test(phone.replace(/\s/g, ''));

  async function handlePay() {
    if (!operator)    { setError(t('payment.error.operator')); return; }
    if (!isValidPhone) { setError(t('payment.error.phone'));    return; }

    setError('');
    setLoading(true);
    try {
      const res = await api.post('/payments/initiate', {
        planId:      plan,
        operator,
        phoneNumber: phone.replace(/\s/g, ''),
      });
      startPolling(res.data.data.paymentId);
    } catch (err) {
      setError(err.response?.data?.message || t('payment.error.generic'));
      setLoading(false);
    }
  }

  function startPolling(id) {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 40) {
        clearInterval(pollRef.current);
        setLoading(false);
        setError(t('payment.error.timeout'));
        return;
      }
      try {
        const res = await api.get(`/payments/${id}/status`);
        const status = res.data.data.status;

        if (status === 'completed') {
          clearInterval(pollRef.current);
          setLoading(false);
          router.replace({ pathname: '/subscription/success', params: { plan, amount } });
        } else if (status === 'failed' || status === 'cancelled') {
          clearInterval(pollRef.current);
          setLoading(false);
          setError(t('payment.error.failed'));
        }
      } catch { /* retry */ }
    }, 3000);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
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
              <Text style={styles.summaryAmount}>{amount.toLocaleString('fr-FR')} FCFA</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>{t('payment.chooseOperator')}</Text>
          {OPERATORS.map((op) => (
            <Pressable
              key={op.id}
              style={[styles.operatorCard, operator === op.id && styles.operatorCardActive]}
              onPress={() => setOperator(op.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: operator === op.id }}
            >
              <View style={[styles.operatorDot, { backgroundColor: op.color }]} />
              <Text style={styles.operatorLabel}>{op.label}</Text>
              {operator === op.id && <Check size={18} color={colors.primary} strokeWidth={3} />}
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

          <Text style={styles.note}>{t('payment.note')}</Text>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.payBtn, loading && styles.payBtnDisabled]}
            onPress={handlePay}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.payBtnText}>
                  {t('payment.payButton', { amount: amount.toLocaleString('fr-FR') })}
                </Text>
            }
          </Pressable>
        </View>
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
  operatorCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  operatorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  operatorLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.navy },

  input: {
    backgroundColor: colors.white, borderRadius: 14, padding: 16, fontSize: 16,
    color: colors.text, borderWidth: 1.5, borderColor: colors.borderLight, marginBottom: 16,
  },
  errorText: { fontSize: 13, color: colors.danger || '#DC2626', marginTop: 4, marginBottom: 8 },
  note: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 18 },

  footer: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 0 : 24, paddingTop: 12 },
  payBtn: {
    backgroundColor: colors.navy, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});