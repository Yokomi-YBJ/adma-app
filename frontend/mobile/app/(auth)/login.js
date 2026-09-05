/**
 * ADMA — Écran de connexion
 * OTP en 2 étapes, design propre thème clair
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Phone, ArrowLeft, RotateCcw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../constants/colors';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/Button';

const OTP_RESEND_SECONDS = 60;

export default function LoginScreen() {
  const { t }        = useTranslation();
  const router       = useRouter();
  const login        = useAuthStore((s) => s.login);

  const [phone, setPhone]     = useState('');
  const [code, setCode]       = useState('');
  const [step, setStep]       = useState(1); // 1: phone, 2: otp
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [countdown, setCountdown] = useState(0);

  // Animation d'entrée
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const codeRef = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [step]);

  // Countdown renvoi OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function validatePhone(p) {
    return /^6[5-9]\d{7}$/.test(p.replace(/\s/g, ''));
  }

  async function sendOTP() {
    const clean = phone.replace(/\s/g, '');
    if (!validatePhone(clean)) {
      setError(t('auth.invalidPhone'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone: `+237${clean}` });
      setStep(2);
      setCountdown(OTP_RESEND_SECONDS);
      slideAnim.setValue(30);
      fadeAnim.setValue(0);
      setTimeout(() => codeRef.current?.focus(), 300);
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    }
    setLoading(false);
  }

  async function verifyOTP() {
    if (code.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', {
        phone:      `+237${phone.replace(/\s/g, '')}`,
        code,
        deviceInfo: Platform.OS,
      });
      const { accessToken, refreshToken, user, isNew } = res.data.data;
      await login(accessToken, refreshToken, user);
      router.replace(isNew ? '/onboarding' : '/(tabs)');
    } catch (err) {
      setError(err.response?.data?.message || t('auth.otpInvalid'));
    }
    setLoading(false);
  }

  async function resendOTP() {
    if (countdown > 0) return;
    setCode('');
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone: `+237${phone.replace(/\s/g, '')}` });
      setCountdown(OTP_RESEND_SECONDS);
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>A</Text>
          </View>
          <Text style={styles.logoName}>ADMA</Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
        </View>

        {/* Card */}
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {step === 2 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => { setStep(1); setCode(''); setError(''); }}>
              <ArrowLeft size={18} color={colors.primary} />
              <Text style={styles.backText}>Modifier le numero</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.cardTitle}>
            {step === 1 ? t('auth.title') : t('auth.otpTitle')}
          </Text>
          <Text style={styles.cardSubtitle}>
            {step === 1
              ? t('auth.subtitle')
              : t('auth.otpSubtitle', { phone: phone.replace(/\s/g, '') })
            }
          </Text>

          {/* Étape 1 — Numéro */}
          {step === 1 && (
            <>
              <Text style={styles.fieldLabel}>{t('auth.phoneLabel')}</Text>
              <View style={[styles.phoneRow, error && styles.inputError]}>
                <View style={styles.prefixBox}>
                  <Text style={styles.flag}>CMR</Text>
                  <Text style={styles.prefix}>+237</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={(v) => { setPhone(v); setError(''); }}
                  keyboardType="phone-pad"
                  maxLength={9}
                  placeholder={t('auth.phonePlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  returnKeyType="done"
                  onSubmitEditing={sendOTP}
                  autoFocus
                />
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Button
                title={loading ? t('common.loading') : t('auth.sendCode')}
                onPress={sendOTP}
                loading={loading}
                size="lg"
                style={{ marginTop: 20 }}
              />
            </>
          )}

          {/* Étape 2 — OTP */}
          {step === 2 && (
            <>
              <Text style={styles.fieldLabel}>{t('auth.otpPlaceholder')}</Text>
              <TextInput
                ref={codeRef}
                style={[styles.otpInput, error && styles.inputError]}
                value={code}
                onChangeText={(v) => { setCode(v.replace(/\D/g, '')); setError(''); if (v.length === 6) verifyOTP(); }}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor={colors.textDisabled}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Button
                title={loading ? t('common.loading') : t('auth.verify')}
                onPress={verifyOTP}
                loading={loading}
                disabled={code.length < 6}
                size="lg"
                style={{ marginTop: 20 }}
              />

              <TouchableOpacity
                style={[styles.resendBtn, countdown > 0 && styles.resendDisabled]}
                onPress={resendOTP}
                disabled={countdown > 0 || loading}
              >
                <RotateCcw size={14} color={countdown > 0 ? colors.textMuted : colors.primary} />
                <Text style={[styles.resendText, countdown > 0 && styles.resendTextMuted]}>
                  {countdown > 0
                    ? t('auth.resendIn', { seconds: countdown })
                    : t('auth.resend')
                  }
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        <Text style={styles.legal}>
          En continuant, vous acceptez nos{'\n'}
          <Text style={styles.legalLink}>Conditions d'utilisation</Text> et notre <Text style={styles.legalLink}>Politique de confidentialite</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:         { flex: 1, backgroundColor: colors.background },
  scroll:       { flexGrow: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },

  hero:         { alignItems: 'center', marginBottom: 40 },
  logoMark:     {
    width: 76, height: 76, borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  logoText:     { fontSize: 38, fontWeight: '900', color: colors.white, letterSpacing: -1 },
  logoName:     { fontSize: 28, fontWeight: '900', color: colors.navy, letterSpacing: 6 },
  tagline:      { fontSize: 14, color: colors.textMuted, marginTop: 6, fontWeight: '600' },

  card: {
    backgroundColor: colors.white,
    borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: colors.borderLight,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText:     { fontSize: 14, color: colors.primary, fontWeight: '600' },

  cardTitle:    { fontSize: 22, fontWeight: '800', color: colors.navy, marginBottom: 6 },
  cardSubtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 24, lineHeight: 20 },

  fieldLabel:   { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 },

  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, overflow: 'hidden',
    backgroundColor: colors.white,
  },
  prefixBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 14, paddingVertical: 14,
    borderRightWidth: 1, borderRightColor: colors.border,
  },
  flag:         { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  prefix:       { fontSize: 15, fontWeight: '700', color: colors.navy },
  phoneInput:   { flex: 1, fontSize: 17, color: colors.text, paddingHorizontal: 14, paddingVertical: 13, letterSpacing: 1 },

  otpInput: {
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, padding: 16,
    fontSize: 28, fontWeight: '700',
    color: colors.navy, textAlign: 'center',
    letterSpacing: 14, backgroundColor: colors.white,
  },
  inputError:   { borderColor: colors.danger },
  errorText:    { fontSize: 13, color: colors.danger, marginTop: 6, fontWeight: '500' },

  resendBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18, padding: 8 },
  resendDisabled: { opacity: 0.5 },
  resendText:   { fontSize: 14, color: colors.primary, fontWeight: '600' },
  resendTextMuted: { color: colors.textMuted },

  legal:        { textAlign: 'center', fontSize: 12, color: colors.textMuted, marginTop: 32, lineHeight: 18 },
  legalLink:    { color: colors.primary, fontWeight: '600' },
});
