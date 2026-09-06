/**
 * ADMA — Écran de connexion (Refonte UI/UX Mobile 10/10)
 * Approche minimaliste, champs natifs, bouton docké au clavier.
 */
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Animated, Keyboard,
  
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RotateCcw } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/Button';

const OTP_RESEND_SECONDS = 60;

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const codeRef = useRef(null);
  const phoneRef = useRef(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const animateTransition = (nextStep) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: nextStep === 2 ? -20 : 20, duration: 0, useNativeDriver: true })
    ]).start(() => {
      setStep(nextStep);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  };

  function validatePhone(p) {
    return /^6[5-9]\d{7}$/.test(p.replace(/\s/g, ''));
  }

  const formatPhone = (val) => {
    const cleaned = val.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,2})$/);
    if (!match) return cleaned;
    return !match[2] ? match[1] 
         : `${match[1]} ${match[2]}${match[3] ? ` ${match[3]}` : ''}${match[4] ? ` ${match[4]}` : ''}`;
  };

  const handlePhoneChange = (val) => {
    setError('');
    setPhone(formatPhone(val));
  };

  async function sendOTP() {
    const clean = phone.replace(/\s/g, '');
    if (!validatePhone(clean)) {
      setError(t('auth.invalidPhone'));
      return;
    }
    setError('');
    setLoading(true);
    Keyboard.dismiss();
    
    try {
      await api.post('/auth/send-otp', { phone: `+237${clean}` });
      setCountdown(OTP_RESEND_SECONDS);
      animateTransition(2);
      setTimeout(() => codeRef.current?.focus(), 450);
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    }
    setLoading(false);
  }

  async function verifyOTP() {
    if (code.length !== 6) return;
    setError('');
    setLoading(true);
    Keyboard.dismiss();
    
    try {
      const res = await api.post('/auth/verify-otp', {
        phone: `+237${phone.replace(/\s/g, '')}`,
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'} 
        style={styles.container}
      >
        <View style={styles.topSection}>
          <View style={styles.header}>
            {step === 2 ? (
              <TouchableOpacity 
                style={styles.backBtn} 
                onPress={() => { 
                  Keyboard.dismiss(); 
                  animateTransition(1); 
                  setCode(''); 
                  setError(''); 
                  setTimeout(() => phoneRef.current?.focus(), 400); 
                }}
              >
                <ArrowLeft size={24} color={colors.navy || '#1A1A1A'} />
              </TouchableOpacity>
            ) : (
              <View style={{ height: 0 }} />  
            )}
          </View>

          <Animated.View 
            style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <Text style={styles.title}>
              {step === 1 ? t('auth.title') : t('auth.otpTitle')}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1
                ? t('auth.subtitle')
                // Retour aux objets de variables natifs pour i18next
                : t('auth.otpSubtitle', { phone: phone.replace(/\s/g, '') })
              }
            </Text>

            {step === 1 && (
              <View style={styles.inputGroup}>
                <View style={[styles.inputContainer, error && styles.inputError]}>
                  <View style={styles.prefixBox}>
                    <Text style={styles.flag}>🇨🇲</Text>
                    <Text style={styles.prefix}>+237</Text>
                  </View>
                  <TextInput
                    ref={phoneRef}
                    style={styles.input}
                    value={phone}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    maxLength={12} 
                    placeholder="6XX XX XX XX"
                    placeholderTextColor={colors.textDisabled || '#A3A3A3'}
                    returnKeyType="done"
                    onSubmitEditing={sendOTP}
                    autoFocus
                  />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>
            )}

            {step === 2 && (
              <View style={styles.inputGroup}>
                <TextInput
                  ref={codeRef}
                  style={[styles.otpInput, error && styles.inputError]}
                  value={code}
                  onChangeText={(v) => { setCode(v.replace(/\D/g, '')); setError(''); if (v.length === 6) verifyOTP(); }}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="------"
                  placeholderTextColor={colors.border || '#E5E5E5'}
                  selectionColor={colors.primary || '#5FC2BA'}
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                
                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={resendOTP}
                  disabled={countdown > 0 || loading}
                >
                  {countdown === 0 && <RotateCcw size={16} color={colors.primary || '#5FC2BA'} />}
                  <Text style={[styles.resendText, countdown > 0 && styles.resendTextMuted]}>
                    {countdown > 0
                      // Retour aux objets de variables natifs pour i18next
                      ? t('auth.resendIn', { seconds: countdown })
                      : t('auth.resend')
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <Button
            title={
              loading ? t('common.loading') 
              : step === 1 ? t('auth.sendCode') 
              : t('auth.verify')
            }
            onPress={step === 1 ? sendOTP : verifyOTP}
            loading={loading}
            disabled={step === 2 && code.length < 6}
            size="lg"
            style={styles.mainButton}
          />
          
          {step === 1 && (
            <Text style={styles.legal}>
              En continuant, vous acceptez nos {' '}
              <Text style={styles.legalLink}>Conditions</Text> et notre{' '}
              <Text style={styles.legalLink}>Politique de confidentialité</Text>
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background || '#FAFBFC' },
  
  container: { 
    flex: 1, 
    paddingHorizontal: 24,
    justifyContent: 'space-between'
  },
  
  topSection: { 
    flex: 1, 
    justifyContent: 'flex-start' // Maintient le contenu ancré en haut
  },
  
  header: { height: 60, justifyContent: 'center', marginTop: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginLeft: -8 },
  
  
  content: { paddingTop: 40 },
  
  title: { fontSize: 32, fontWeight: '900', color: colors.navy || '#0A1128', marginBottom: 12, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: colors.textMuted || '#6B7280', marginBottom: 40, lineHeight: 24 },

  inputGroup: { marginBottom: 24 },
  
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface || '#F3F4F6',
    borderRadius: 16,
    height: 64,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputError: { borderColor: colors.danger || '#EF4444', backgroundColor: '#FEF2F2' },
  
  prefixBox: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 20, paddingRight: 16,
    borderRightWidth: 1, borderRightColor: colors.borderLight || '#E5E7EB',
    height: '60%',
  },
  flag: { fontSize: 18, marginRight: 6 },
  prefix: { fontSize: 16, fontWeight: '700', color: colors.navy || '#0A1128' },
  
  input: {
    flex: 1, fontSize: 18, fontWeight: '600',
    color: colors.text || '#111827',
    paddingHorizontal: 16, height: '100%',
  },

  otpInput: {
    backgroundColor: colors.surface || '#F3F4F6',
    borderRadius: 16, height: 72,
    fontSize: 32, fontWeight: '700',
    color: colors.navy || '#0A1128',
    textAlign: 'center', letterSpacing: 24,
    paddingLeft: 24, 
  },

  errorText: { fontSize: 14, color: colors.danger || '#EF4444', marginTop: 8, fontWeight: '500', marginLeft: 4 },

  resendBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 24, alignSelf: 'flex-start' },
  resendText: { fontSize: 15, color: colors.primary || '#5FC2BA', fontWeight: '700', marginLeft: 8 },
  resendTextMuted: { color: colors.textMuted || '#9CA3AF', marginLeft: 0 },

  footer: { 
    paddingBottom: Platform.OS === 'ios' ? 10 : 24, 
    paddingTop: 16 
  },
  mainButton: { height: 56, borderRadius: 16 },
  
  legal: { textAlign: 'center', fontSize: 12, color: colors.textMuted || '#6B7280', marginTop: 20, lineHeight: 18 },
  legalLink: { color: colors.navy || '#0A1128', fontWeight: '700' },
});