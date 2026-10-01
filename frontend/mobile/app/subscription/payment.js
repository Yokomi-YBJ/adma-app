/**
 * ADMA — Écran de paiement KPay
 * Multilingue : Français / Anglais / Fulfulde
 */
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Check, Lock, AlertTriangle, ShieldCheck } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { showAppModal } from '../../components/ui/AppModal';

const OPERATORS = [
  { id: 'orange_cmr', label: 'Orange Money', color: '#FF6600', initial: 'OM' },
  { id: 'mtn_momo_cmr', label: 'MTN MoMo',   color: '#FFCC00', textColor: '#333', initial: 'M' },
];

export default function PaymentScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const params   = useLocalSearchParams();
  const { t }    = useTranslation();
  const updateProvider = useAuthStore((s) => s.updateProvider);

  const { planId, price, label } = params;

  const [operator, setOperator] = useState(null);
  const [phone,    setPhone]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [step,     setStep]     = useState('select'); // 'select' | 'confirm' | 'processing' | 'done' | 'failed'
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function validatePhone(p) {
    return /^6[5-9]\d{7}$/.test(p.replace(/\s/g, ''));
  }

  async function initPayment() {
    if (!operator) {
      showAppModal({
        title: t('common.error', 'Erreur'),
        message: t('payment.chooseOperator', 'Choisissez un opérateur de paiement.'),
        confirmText: 'OK',
        variant: 'warning',
      });
      return;
    }
    const clean = phone.replace(/\s/g, '');
    if (!validatePhone(clean)) {
      showAppModal({
        title: t('common.error', 'Erreur'),
        message: t('payment.invalidPhone', 'Numéro de téléphone invalide.'),
        confirmText: 'OK',
        variant: 'warning',
      });
      return;
    }
    setStep('confirm');
  }

  async function confirmPayment() {
    setLoading(true);
    setStep('processing');
    try {
      const res = await api.post('/payments/initiate', {
        planId,
        operator:    operator.id,
        phoneNumber: `+237${phone.replace(/\s/g, '')}`,
      });

      // Polling du statut (max 2 min)
      let attempts = 0;
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 24) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setStep('failed');
          setLoading(false);
          return;
        }
        try {
          const statusRes = await api.get(`/payments/${res.data.data.paymentId}/status`);
          const status    = statusRes.data.data.status;
          if (status === 'completed') {
            if (intervalRef.current) clearInterval(intervalRef.current);
            updateProvider({ plan: planId, plan_expires_at: statusRes.data.data.expiresAt });
            setStep('done');
            setLoading(false);
          } else if (status === 'failed' || status === 'cancelled') {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setStep('failed');
            setLoading(false);
          }
        } catch {}
      }, 5000);
    } catch (err) {
      showAppModal({
        title: t('common.error', 'Erreur'),
        message: err.response?.data?.message || t('payment.failedDesc', 'Échec de l\'initialisation du paiement.'),
        confirmText: 'OK',
        variant: 'danger',
      });
      setStep('select');
      setLoading(false);
    }
  }

  // ── Écran résultat succès ──
  if (step === 'done') {
    return (
      <View style={styles.resultWrap}>
        <View style={[styles.resultIcon, { backgroundColor: '#ECFDF5' }]}>
          <Check size={48} color="#059669" strokeWidth={3} />
        </View>
        <Text style={styles.resultTitle}>{t('payment.successTitle', 'Paiement réussi !')}</Text>
        <Text style={styles.resultDesc}>
          {t('payment.successDesc', 'Votre abonnement a été activé avec succès.')}
        </Text>
        <TouchableOpacity style={styles.resultBtn} onPress={() => router.replace('/(tabs)/profile')}>
          <Text style={styles.resultBtnText}>{t('payment.goToProfile', 'Voir mon profil')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Écran résultat échec ──
  if (step === 'failed') {
    return (
      <View style={styles.resultWrap}>
        <View style={[styles.resultIcon, { backgroundColor: '#FEF2F2' }]}>
          <AlertTriangle size={48} color="#DC2626" strokeWidth={2.5} />
        </View>
        <Text style={styles.resultTitle}>{t('payment.failedTitle', 'Échec du paiement')}</Text>
        <Text style={styles.resultDesc}>
          {t('payment.failedDesc', 'Le paiement n\'a pas abouti. Veuillez réessayer.')}
        </Text>
        <TouchableOpacity style={[styles.resultBtn, { backgroundColor: colors.primary }]} onPress={() => setStep('select')}>
          <Text style={styles.resultBtnText}>{t('payment.retryBtn', 'Réessayer')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedAmount = parseInt(price || 0, 10).toLocaleString('fr-FR');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header Identique à plans.js */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => router.back()} 
          disabled={loading}
          activeOpacity={0.6}
        >
          <ChevronLeft size={28} color={colors.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('payment.header', 'Paiement sécurisé')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        
        {/* Titre de la page */}
        <View style={styles.pageTitleContainer}>
          <Text style={styles.pageTitle}>{t('payment.pageTitle', 'Réglez votre plan')}</Text>
          <Text style={styles.pageSubtitle}>Sélectionnez votre opérateur et validez le paiement depuis votre mobile.</Text>
        </View>

        {/* Récap commande */}
        <View style={styles.orderCard}>
          <Text style={styles.orderLabel}>{t('payment.summary', 'Récapitulatif')}</Text>
          <View style={styles.orderRow}>
            <Text style={styles.orderPlan}>{label}</Text>
            <Text style={styles.orderPrice}>{formattedAmount} <Text style={styles.orderCurrency}>FCFA</Text></Text>
          </View>
        </View>

        {/* Choisir opérateur */}
        <Text style={styles.sectionLabel}>{t('payment.selectOperator', 'Moyen de paiement')}</Text>
        <View style={styles.operatorsRow}>
          {OPERATORS.map((op) => (
            <TouchableOpacity
              key={op.id}
              style={[
                styles.operatorCard,
                operator?.id === op.id && styles.operatorCardActive,
              ]}
              onPress={() => setOperator(op)}
              activeOpacity={0.8}
            >
              <View style={[styles.opBadge, { backgroundColor: op.color }]}>
                <Text style={[styles.opBadgeText, { color: op.textColor || '#fff' }]}>
                  {op.initial}
                </Text>
              </View>
              <Text style={styles.opLabel}>{op.label}</Text>
              {operator?.id === op.id && (
                <View style={styles.checkBadge}>
                  <Check size={12} color="#fff" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Numéro de téléphone */}
        <Text style={styles.sectionLabel}>{t('payment.phoneLabel', 'Numéro de téléphone')}</Text>
        <View style={styles.phoneInputWrap}>
          <Text style={styles.phonePrefix}>+237</Text>
          <TextInput
            style={styles.phoneInput}
            placeholder={t('payment.phonePlaceholder', '6X XX XX XX X')}
            placeholderTextColor={colors.textLight}
            keyboardType="phone-pad"
            maxLength={11} 
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        {/* Étape confirmation */}
        {step === 'confirm' && (
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{t('payment.confirmTitle', 'Confirmer le débit')}</Text>
            <Text style={styles.confirmText}>
              {t('payment.confirmMessage', {
                amount: formattedAmount,
                operator: operator?.label,
                phone: `+237 ${phone}`,
              })}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
              <TouchableOpacity
                style={[styles.btn, styles.btnOutline]}
                onPress={() => setStep('select')}
                disabled={loading}
              >
                <Text style={styles.btnOutlineText}>{t('payment.cancelBtn', 'Modifier')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={confirmPayment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>{t('payment.confirmBtn', 'Valider')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Étape processing */}
        {step === 'processing' && (
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color={colors.primary || '#6D28D9'} />
            <Text style={styles.processingTitle}>{t('payment.processingTitle', 'Attente de validation')}</Text>
            <Text style={styles.processingDesc}>
              {t('payment.processingDesc', 'Veuillez consulter votre téléphone et entrer votre code PIN pour valider la transaction.')}
            </Text>
          </View>
        )}

        {/* Bouton payer initial */}
        {step === 'select' && (
          <TouchableOpacity
            style={[styles.payBtn, (!operator || !phone) && styles.payBtnDisabled]}
            onPress={initPayment}
            activeOpacity={0.8}
          >
            <Lock size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.payBtnText}>
              {t('payment.payBtn', { amount: formattedAmount })} FCFA
            </Text>
          </TouchableOpacity>
        )}

        {/* Badge sécurité */}
        <View style={styles.securityNote}>
          <ShieldCheck size={16} color={colors.textLight} strokeWidth={2}/>
          <Text style={styles.securityText}>
            Paiement chiffré de bout en bout par KPay
          </Text>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background || '#F8FAFC' 
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
    justifyContent: 'center', 
    alignItems: 'center',
    borderRadius: 22,
  },
  headerTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: colors.text, 
    letterSpacing: 0.5 
  },

  body: { paddingHorizontal: 20, paddingTop: 10 },

  pageTitleContainer: {
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },

  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  orderLabel: { 
    fontSize: 12, 
    color: colors.textMuted, 
    fontWeight: '600', 
    marginBottom: 10 
  },
  orderRow:   { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end' 
  },
  orderPlan:  { 
    fontSize: 18, 
    fontWeight: '800', 
    color: colors.text 
  },
  orderPrice: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: colors.text,
    letterSpacing: -0.5,
  },
  orderCurrency: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },

  sectionLabel: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: colors.text, 
    marginBottom: 12 
  },

  operatorsRow: { 
    flexDirection: 'row', 
    gap: 16, 
    marginBottom: 28 
  },
  operatorCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  operatorCardActive: { 
    borderColor: colors.primary || '#6D28D9', 
    backgroundColor: '#F5F3FF' 
  },
  opBadge: { 
    width: 48, 
    height: 48, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  opBadgeText: { 
    fontSize: 18, 
    fontWeight: '900' 
  },
  opLabel: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: colors.text 
  },
  checkBadge: {
    position: 'absolute', 
    top: -6, 
    right: -6,
    width: 24, 
    height: 24, 
    borderRadius: 12,
    backgroundColor: colors.primary || '#6D28D9',
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    marginBottom: 32,
    height: 56,
  },
  phonePrefix: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: colors.text, 
    marginRight: 10 
  },
  phoneInput:  { 
    flex: 1, 
    height: '100%', 
    fontSize: 16, 
    color: colors.text,
    fontWeight: '500'
  },

  payBtn: {
    backgroundColor: colors.text || '#0F172A',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  payBtnDisabled: { opacity: 0.5 },
  payBtnText:     { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  confirmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.text || '#0F172A',
    marginBottom: 24,
  },
  confirmTitle: { fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: 8 },
  confirmText:  { fontSize: 14, color: colors.textMuted, lineHeight: 22 },
  btn: { 
    flex: 1, 
    height: 48, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  btnOutline:     { borderWidth: 1.5, borderColor: '#E2E8F0' },
  btnOutlineText: { fontSize: 14, fontWeight: '700', color: colors.text },
  btnPrimary:     { backgroundColor: colors.text || '#0F172A' },
  btnPrimaryText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  processingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  processingTitle: { fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 20 },
  processingDesc:  { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 22 },

  securityNote: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 8,
    marginTop: 8
  },
  securityText: { fontSize: 12, color: colors.textLight, fontWeight: '500' },

  resultWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#FFFFFF' },
  resultIcon:  { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  resultTitle: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 12, textAlign: 'center' },
  resultDesc:  { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  resultBtn: {
    backgroundColor: colors.text || '#0F172A',
    borderRadius: 16,
    height: 56,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});