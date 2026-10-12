/**
 * ADMA — Écran de paiement (GeniusPay)
 * ✅ Gestion downgrade programmé (202)
 * ✅ Polling avec backoff exponentiel
 * ✅ Vérification expiration du lien
 */
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Check } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
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

  const [operator, setOperator]     = useState(null);
  const [phone, setPhone]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [statusText, setStatusText] = useState('');
  const pollRef    = useRef(null);
  const stoppedRef = useRef(false);

  useEffect(() => () => {
    stoppedRef.current = true;
    if (pollRef.current) clearTimeout(pollRef.current);
  }, []);

  const isValidPhone = /^(\+?237)?6[5-9]\d{7}$/.test(phone.replace(/\s/g, ''));

  async function handlePay() {
    if (!operator)     { setError(t('payment.error.operator')); return; }
    if (!isValidPhone) { setError(t('payment.error.phone'));    return; }

    setError('');
    setLoading(true);
    setStatusText('Initialisation du paiement...');

    try {
      const res = await api.post('/payments/initiate', {
        planId:      plan,
        operator,
        phoneNumber: phone.replace(/\s/g, ''),
      });

      // Cas spécial : downgrade programmé (202)
      if (res.status === 202 || res.data.scheduled) {
        setLoading(false);
        setStatusText('');
        Alert.alert(
          'Changement programmé',
          res.data.message,
          [{ text: 'Compris', onPress: () => router.back() }]
        );
        return;
      }

      const { paymentId, paymentUrl, checkoutUrl, expiresAt } = res.data.data;

      // ✅ #13 : Vérifier que le lien n'est pas expiré
      if (expiresAt) {
        const expiry = new Date(expiresAt);
        if (expiry < new Date()) {
          setError('Le lien de paiement a expiré. Veuillez recommencer.');
          setLoading(false);
          setStatusText('');
          return;
        }
      }

      // Ouvrir la page de paiement (USSD direct ou checkout web)
      const urlToOpen = paymentUrl || checkoutUrl;

      if (urlToOpen) {
        setStatusText('Ouverture de la page de paiement...');
        try {
          await WebBrowser.openBrowserAsync(urlToOpen, {
            dismissButtonStyle: 'cancel',
            presentationStyle:  'pageSheet',
          });
        } catch {
          // L'utilisateur peut fermer, on continue le polling
        }
      }

      setStatusText('En attente de la confirmation...');
      startPolling(paymentId);
    } catch (err) {
      setError(err.response?.data?.message || t('payment.error.generic'));
      setLoading(false);
      setStatusText('');
    }
  }

  function startPolling(id) {
    let attempt = 0;
    const delays = [1000, 2000, 4000, 8000, 15000, 15000, 15000, 15000, 15000, 15000];
    const MAX_TIME = 90_000;
    const startedAt = Date.now();

    const tick = async () => {
      if (stoppedRef.current) return;

      if (Date.now() - startedAt > MAX_TIME) {
        setLoading(false);
        setStatusText('');
        setError(
          "Le paiement prend plus de temps que prévu. " +
          "Si vous avez été débité, votre abonnement sera activé automatiquement."
        );
        return;
      }

      try {
        const res = await api.get(`/payments/${id}/status`);
        const status = res.data.data.status;

        if (status === 'completed') {
          setLoading(false);
          setStatusText('');
          router.replace({
            pathname: '/subscription/success',
            params: { plan, amount },
          });
          return;
        }

        if (status === 'failed' || status === 'cancelled') {
          setLoading(false);
          setStatusText('');
          setError(t('payment.error.failed'));
          return;
        }

        setStatusText(
          `En attente de confirmation... (${Math.floor((Date.now() - startedAt) / 1000)}s)`
        );
      } catch {
        // Retry silencieux
      }

      const delay = delays[Math.min(attempt, delays.length - 1)];
      attempt++;
      pollRef.current = setTimeout(tick, delay);
    };

    pollRef.current = setTimeout(tick, delays[0]);
  }

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

          {loading ? (
            <View style={styles.waitingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.waitingText}>
                {statusText || 'Traitement en cours...'}
              </Text>
              <Text style={styles.waitingHint}>
                Suivez les instructions sur la page de paiement.
              </Text>
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
                    <Check size={18} color={colors.primary} strokeWidth={3} />
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

              <Text style={styles.note}>{t('payment.note')}</Text>
            </>
          )}
        </ScrollView>

        {!loading && (
          <View style={styles.footer}>
            <Pressable style={styles.payBtn} onPress={handlePay}>
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
  operatorCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  operatorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  operatorLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.navy },
  input: {
    backgroundColor: colors.white, borderRadius: 14, padding: 16, fontSize: 16,
    color: colors.text, borderWidth: 1.5, borderColor: colors.borderLight, marginBottom: 16,
  },
  errorText: { fontSize: 13, color: colors.danger || '#DC2626', marginTop: 4, marginBottom: 8 },
  note: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 18 },
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