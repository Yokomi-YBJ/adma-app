/**
 * ADMA — Écran de paiement KPay
 */
import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Phone, Check, Lock } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { showAppModal } from '../../components/ui/AppModal';

const OPERATORS = [
  { id: 'orange_cmr', label: 'Orange Money', color: '#FF6600', prefix: '69' },
  { id: 'mtn_momo_cmr', label: 'MTN MoMo',   color: '#FFCC00', textColor: '#333', prefix: '67' },
];

export default function PaymentScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const params   = useLocalSearchParams();
  const provider = useAuthStore((s) => s.provider);
  const updateProvider = useAuthStore((s) => s.updateProvider);

  const { planId, price, label } = params;

  const [operator, setOperator] = useState(null);
  const [phone,    setPhone]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [step,     setStep]     = useState('select'); // 'select' | 'confirm' | 'processing' | 'done' | 'failed'
  const [paymentId, setPaymentId] = useState(null);

  function validatePhone(p) {
    return /^6[5-9]\d{7}$/.test(p.replace(/\s/g, ''));
  }

  async function initPayment() {
    if (!operator) { showAppModal({ title: 'Information', message: 'Choisissez un operateur de paiement.', confirmText: 'OK', variant: 'warning' }); return; }
    const clean = phone.replace(/\s/g, '');
    if (!validatePhone(clean)) { showAppModal({ title: 'Information', message: 'Numero de telephone invalide.', confirmText: 'OK', variant: 'warning' }); return; }
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
      setPaymentId(res.data.data.paymentId);

      // Polling du statut (max 2 min)
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 24) {
          clearInterval(interval);
          setStep('failed');
          setLoading(false);
          return;
        }
        try {
          const statusRes = await api.get(`/payments/${res.data.data.paymentId}/status`);
          const status    = statusRes.data.data.status;
          if (status === 'completed') {
            clearInterval(interval);
            updateProvider({ plan: planId, plan_expires_at: statusRes.data.data.expiresAt });
            setStep('done');
            setLoading(false);
          } else if (status === 'failed' || status === 'cancelled') {
            clearInterval(interval);
            setStep('failed');
            setLoading(false);
          }
        } catch {}
      }, 5000); // Vérification toutes les 5s
    } catch (err) {
      showAppModal({ title: 'Erreur', message: err.response?.data?.message || 'Echec de l\'initialisation du paiement.', confirmText: 'OK', variant: 'danger' });
      setStep('select');
      setLoading(false);
    }
  }

  // ── Écran résultat ──
  if (step === 'done') {
    return (
      <View style={styles.resultWrap}>
        <View style={[styles.resultIcon, { backgroundColor: colors.successBg }]}>
          <Check size={48} color={colors.success} strokeWidth={3} />
        </View>
        <Text style={styles.resultTitle}>Paiement reussi</Text>
        <Text style={styles.resultDesc}>
          Votre abonnement {label} est maintenant actif.{'\n'}
          Votre fiche est deja mieux classee dans les resultats.
        </Text>
        <TouchableOpacity style={styles.resultBtn} onPress={() => router.replace('/(tabs)/profile')}>
          <Text style={styles.resultBtnText}>Voir mon profil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'failed') {
    return (
      <View style={styles.resultWrap}>
        <View style={[styles.resultIcon, { backgroundColor: colors.dangerBg }]}>
          <Text style={{ fontSize: 48 }}>!</Text>
        </View>
        <Text style={styles.resultTitle}>Paiement echoue</Text>
        <Text style={styles.resultDesc}>
          Le paiement n'a pas abouti. Verifiez votre solde ou reessayez.
        </Text>
        <TouchableOpacity style={[styles.resultBtn, { backgroundColor: colors.primary }]} onPress={() => setStep('select')}>
          <Text style={styles.resultBtnText}>Reessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} disabled={loading}>
          <ChevronLeft size={22} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>Paiement</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* Récap commande */}
        <View style={styles.orderCard}>
          <Text style={styles.orderLabel}>Votre commande</Text>
          <View style={styles.orderRow}>
            <Text style={styles.orderPlan}>Plan {label}</Text>
            <Text style={styles.orderPrice}>{parseInt(price).toLocaleString('fr-FR')} FCFA</Text>
          </View>
          <Text style={styles.orderSub}>Abonnement mensuel · Renouvellement automatique</Text>
        </View>

        {/* Choisir opérateur */}
        <Text style={styles.sectionLabel}>Operateur de paiement</Text>
        <View style={styles.operatorsRow}>
          {OPERATORS.map((op) => (
            <TouchableOpacity
              key={op.id}
              style={[styles.operatorBtn, operator?.id === op.id && styles.operatorBtnActive, { borderColor: operator?.id === op.id ? op.color : colors.border }]}
              onPress={() => setOperator(op)}
              activeOpacity={0.8}
            >
              <View style={[styles.operatorDot, { backgroundColor: op.color }]} />
              <Text style={[styles.operatorLabel, operator?.id === op.id && { color: colors.navy, fontWeight: '700' }]}>{op.label}</Text>
              {operator?.id === op.id && (
                <View style={[styles.operatorCheck, { backgroundColor: op.color }]}>
                  <Check size={11} color="#fff" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Numéro de paiement */}
        <Text style={styles.sectionLabel}>Numero de paiement</Text>
        <View style={styles.phoneRow}>
          <View style={styles.prefixBox}>
            <Text style={styles.prefixText}>+237</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="6XXXXXXXX"
            placeholderTextColor={colors.textDisabled}
            maxLength={9}
          />
        </View>

        {/* Note sécurité */}
        <View style={styles.secureNote}>
          <Lock size={14} color={colors.success} />
          <Text style={styles.secureText}>
            Paiement securise via KPay. Vous recevrez une notification pour confirmer le paiement sur votre telephone.
          </Text>
        </View>

        {/* Confirmation */}
        {step === 'confirm' && (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Confirmer le paiement</Text>
            <Text style={styles.confirmDesc}>
              {parseInt(price).toLocaleString('fr-FR')} FCFA seront debites de votre compte {operator?.label} (+237 {phone}).
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('select')}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.payBtn} onPress={confirmPayment}>
                <Text style={styles.payText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 'processing' && (
          <View style={styles.processingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.processingTitle}>Traitement en cours...</Text>
            <Text style={styles.processingDesc}>
              Verifiez votre telephone et confirmez le paiement {operator?.label}.
            </Text>
          </View>
        )}

        {step === 'select' && (
          <TouchableOpacity
            style={[styles.payNowBtn, (!operator || !validatePhone(phone)) && styles.payNowBtnDisabled]}
            onPress={initPayment}
            disabled={!operator || !validatePhone(phone)}
            activeOpacity={0.8}
          >
            <Lock size={18} color={colors.white} />
            <Text style={styles.payNowText}>
              Payer {parseInt(price).toLocaleString('fr-FR')} FCFA
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:           { flex: 1, backgroundColor: colors.background },
  header:         {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  backBtn:        { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  title:          { fontSize: 20, fontWeight: '800', color: colors.navy },
  body:           { padding: 20, paddingBottom: 60 },

  orderCard: {
    backgroundColor: colors.white, borderRadius: 18, padding: 20,
    marginBottom: 24, borderWidth: 1, borderColor: colors.borderLight,
  },
  orderLabel:     { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  orderRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderPlan:      { fontSize: 17, fontWeight: '700', color: colors.navy },
  orderPrice:     { fontSize: 22, fontWeight: '900', color: colors.primary },
  orderSub:       { fontSize: 12, color: colors.textMuted },

  sectionLabel:   { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 12 },
  operatorsRow:   { gap: 10, marginBottom: 24 },
  operatorBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 14, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.white,
  },
  operatorBtnActive: { backgroundColor: colors.primaryBg },
  operatorDot:    { width: 16, height: 16, borderRadius: 8 },
  operatorLabel:  { flex: 1, fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
  operatorCheck:  { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  phoneRow: {
    flexDirection: 'row', borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, overflow: 'hidden', marginBottom: 16, backgroundColor: colors.white,
  },
  prefixBox:      { backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 14, borderRightWidth: 1, borderRightColor: colors.border, justifyContent: 'center' },
  prefixText:     { fontSize: 15, fontWeight: '700', color: colors.navy },
  phoneInput:     { flex: 1, fontSize: 17, color: colors.text, paddingHorizontal: 14 },

  secureNote: {
    flexDirection: 'row', gap: 8, padding: 14,
    backgroundColor: colors.successBg, borderRadius: 12, marginBottom: 24,
  },
  secureText:     { flex: 1, fontSize: 12, color: colors.success, lineHeight: 18 },

  confirmBox: {
    backgroundColor: colors.white, borderRadius: 18, padding: 20,
    borderWidth: 1.5, borderColor: colors.primary,
    marginBottom: 16,
  },
  confirmTitle:   { fontSize: 16, fontWeight: '700', color: colors.navy, marginBottom: 8 },
  confirmDesc:    { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  confirmActions: { flexDirection: 'row', gap: 12 },
  cancelBtn:      { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  cancelText:     { fontSize: 15, fontWeight: '700', color: colors.text },
  payBtn:         { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  payText:        { fontSize: 15, fontWeight: '700', color: colors.white },

  processingBox:  { alignItems: 'center', padding: 32, gap: 16 },
  processingTitle:{ fontSize: 17, fontWeight: '700', color: colors.navy },
  processingDesc: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

  payNowBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: 16,
    backgroundColor: colors.primary,
  },
  payNowBtnDisabled: { opacity: 0.45 },
  payNowText:     { fontSize: 17, fontWeight: '800', color: colors.white },

  resultWrap:     { flex: 1, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', padding: 40 },
  resultIcon:     { width: 100, height: 100, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  resultTitle:    { fontSize: 26, fontWeight: '800', color: colors.navy, marginBottom: 12 },
  resultDesc:     { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  resultBtn:      { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, backgroundColor: colors.primary },
  resultBtnText:  { fontSize: 16, fontWeight: '700', color: colors.white },
});
