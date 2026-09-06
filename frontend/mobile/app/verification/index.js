/**
 * ADMA — Demande et Suivi de vérification CNI
 * Gestion des statuts : En cours, Validé, Formulaire de soumission
 */
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  CheckCircle2,
  Shield,
  TrendingUp,
  X,
  ChevronLeft,
  Clock,
  RefreshCw,
  FileText,
  Lock,
  Sparkles,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { showAppModal } from '../../components/ui/AppModal';

async function pickImage() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    showAppModal({
      title: 'Permission requise',
      message: 'Autorisez l\'accès à vos photos.',
      confirmText: 'OK',
      variant: 'warning',
    });
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
  });
  if (res.canceled) return null;
  return res.assets[0];
}

export default function VerificationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const provider = useAuthStore((s) => s.provider);
  const updateProvider = useAuthStore((s) => s.updateProvider);

  const [cniFront, setCniFront] = useState(null);
  const [cniBack, setCniBack] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState(
    provider?.verificationStatus || provider?.verification_status || 'none'
  );

  useEffect(() => {
    fetchLatestStatus();
  }, []);

  async function fetchLatestStatus() {
    setRefreshing(true);
    try {
      const res = await api.get('/providers/me');
      if (res.data?.success && res.data.data) {
        const provData = res.data.data;
        updateProvider(provData);
        const currentSt = provData.verificationStatus || provData.verification_status || 'none';
        setStatus(currentSt);
      }
    } catch {
      // Garder le statut du store si erreur réseau
    } finally {
      setRefreshing(false);
    }
  }

  async function pick(side) {
    const img = await pickImage();
    if (!img) return;
    if (side === 'front') setCniFront(img);
    else setCniBack(img);
  }

  async function submit() {
    if (!cniFront) {
      showAppModal({
        title: 'Information',
        message: t('verification.missingCni', 'La photo recto de la CNI est obligatoire.'),
        confirmText: 'OK',
        variant: 'warning',
      });
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('cniFront', { uri: cniFront.uri, type: 'image/jpeg', name: 'cni_front.jpg' });
      if (cniBack) form.append('cniBack', { uri: cniBack.uri, type: 'image/jpeg', name: 'cni_back.jpg' });
      if (message.trim()) form.append('message', message.trim());

      await api.post('/providers/verification-request', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setStatus('pending');
      updateProvider({ verificationStatus: 'pending', verification_status: 'pending' });

      showAppModal({
        title: t('verification.successTitle', 'Demande envoyée'),
        message: t('verification.success', 'Demande envoyée. Vous serez notifié sous 48h.'),
        confirmText: 'OK',
        variant: 'success',
      });
    } catch (err) {
      showAppModal({
        title: 'Erreur',
        message: err.response?.data?.message || 'Échec de l\'envoi. Réessayez.',
        confirmText: 'OK',
        variant: 'danger',
      });
    }
    setLoading(false);
  }

  // ─── 1. ÉCRAN : DEMANDE EN COURS DE VÉRIFICATION ───────────────
  if (status === 'pending' || status === 'reviewing') {
    return (
      <View style={styles.flex}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ChevronLeft size={22} color={colors.navy} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('verification.statusTitle', 'Statut de vérification')}</Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={fetchLatestStatus}
            disabled={refreshing}
            activeOpacity={0.7}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <RefreshCw size={18} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.statusScroll}>
          {/* Bannière d'alerte en cours */}
          <View style={styles.pendingHeroCard}>
            <View style={styles.pendingIconWrap}>
              <Clock size={40} color={colors.warning} strokeWidth={2.2} />
            </View>
            <View style={styles.pendingBadge}>
              <View style={styles.pendingBadgeDot} />
              <Text style={styles.pendingBadgeText}>{t('verification.pending', 'En cours d\'examen')}</Text>
            </View>
            <Text style={styles.pendingHeroTitle}>
              {t('verification.inProgressTitle', 'Votre demande de vérification est en cours')}
            </Text>
            <Text style={styles.pendingHeroDesc}>
              {t(
                'verification.inProgressDesc',
                'Vos documents ont été transmis à notre équipe de conformité. Nous vérifions votre pièce d\'identité sous 24h à 48h.'
              )}
            </Text>
          </View>

          {/* Timeline des étapes */}
          <View style={styles.stepsCard}>
            <Text style={styles.cardHeaderTitle}>{t('verification.progressTitle', 'Progression de votre dossier')}</Text>

            {/* Étape 1 */}
            <View style={styles.timelineRow}>
              <View style={styles.timelineIconCol}>
                <View style={[styles.stepIconWrap, { backgroundColor: colors.successBg }]}>
                  <CheckCircle2 size={18} color={colors.success} />
                </View>
                <View style={[styles.timelineLine, { backgroundColor: colors.success }]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{t('verification.step1Done', 'Pièce d\'identité soumise')}</Text>
                <Text style={styles.timelineDesc}>{t('verification.step1Desc', 'Photo de votre CNI enregistrée et sécurisée')}</Text>
              </View>
            </View>

            {/* Étape 2 */}
            <View style={styles.timelineRow}>
              <View style={styles.timelineIconCol}>
                <View style={[styles.stepIconWrap, { backgroundColor: colors.warningBg }]}>
                  <Clock size={18} color={colors.warning} />
                </View>
                <View style={styles.timelineLine} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineTitle, { color: colors.warningDark }]}>
                  {t('verification.step2Pending', 'Examen par nos conseillers (En cours)')}
                </Text>
                <Text style={styles.timelineDesc}>
                  {t('verification.step2Desc', 'Validation de l\'authenticité et conformité des informations')}
                </Text>
              </View>
            </View>

            {/* Étape 3 */}
            <View style={styles.timelineRow}>
              <View style={styles.timelineIconCol}>
                <View style={[styles.stepIconWrap, { backgroundColor: colors.surface }]}>
                  <Shield size={18} color={colors.textMuted} />
                </View>
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineTitle, { color: colors.textMuted }]}>
                  {t('verification.step3Next', 'Attribution du badge officiel')}
                </Text>
                <Text style={styles.timelineDesc}>
                  {t('verification.step3Desc', 'Votre badge sera visible immédiatement sur votre profil')}
                </Text>
              </View>
            </View>
          </View>

          {/* Note de confidentialité */}
          <View style={styles.privacyCard}>
            <Lock size={20} color={colors.info} />
            <View style={{ flex: 1 }}>
              <Text style={styles.privacyTitle}>{t('verification.privacyTitle', 'Confidentialité garantie')}</Text>
              <Text style={styles.privacyText}>
                {t(
                  'verification.privacyNote',
                  'Vos documents CNI sont chiffrés et seront automatiquement supprimés de nos serveurs 24h après la validation.'
                )}
              </Text>
            </View>
          </View>

          {/* Boutons d'action */}
          <View style={styles.btnStack}>
            <Button
              title={t('verification.checkStatus', 'Actualiser le statut')}
              onPress={fetchLatestStatus}
              loading={refreshing}
              icon={RefreshCw}
              variant="secondary"
              size="lg"
            />
            <Button
              title={t('common.back', 'Retour au profil')}
              onPress={() => router.back()}
              size="lg"
              style={{ marginTop: 10 }}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── 2. ÉCRAN : COMPTE DÉJÀ VÉRIFIÉ ────────────────────────────
  if (status === 'verified' || status === 'verified_id') {
    return (
      <View style={styles.flex}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ChevronLeft size={22} color={colors.navy} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('verification.statusTitle', 'Statut de vérification')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.statusScroll}>
          <View style={styles.verifiedHeroCard}>
            <View style={styles.verifiedIconWrap}>
              <CheckCircle2 size={46} color={colors.primary} />
            </View>
            <View style={styles.verifiedBadge}>
              <Shield size={14} color={colors.primary} />
              <Text style={styles.verifiedBadgeText}>{t('verification.approved', 'Compte vérifié')}</Text>
            </View>
            <Text style={styles.verifiedHeroTitle}>{t('verification.congrats', 'Félicitations !')}</Text>
            <Text style={styles.verifiedHeroDesc}>
              {t(
                'verification.verifiedMsg',
                'Votre identité a été confirmée avec succès. Le badge de vérification est actif sur votre fiche prestataire.'
              )}
            </Text>
          </View>

          <View style={styles.benefitsCard}>
            <Text style={styles.cardHeaderTitle}>{t('verification.activeBenefits', 'Vos avantages actifs')}</Text>
            {[
              { Icon: Shield, text: t('verification.benefit1', 'Badge bleu visible sur votre fiche') },
              { Icon: TrendingUp, text: t('verification.benefit2', 'Meilleur classement dans les résultats') },
              { Icon: Sparkles, text: t('verification.benefit3', 'Confiance accrue auprès des clients') },
            ].map(({ Icon, text }, i) => (
              <View key={i} style={styles.benefitRow}>
                <View style={[styles.benefitIcon, { backgroundColor: colors.primaryBg }]}>
                  <Icon size={18} color={colors.primary} />
                </View>
                <Text style={styles.benefitText}>{text}</Text>
              </View>
            ))}
          </View>

          <Button
            title={t('common.back', 'Retour au profil')}
            onPress={() => router.back()}
            size="lg"
            style={{ marginTop: 24 }}
          />
        </ScrollView>
      </View>
    );
  }

  // ─── 3. FORMULAIRE DE SOUMISSION (NON VÉRIFIÉ) ─────────────────
  return (
    <View style={styles.flex}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={22} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('verification.title', 'Demande de vérification')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Avantages */}
        <View style={styles.benefits}>
          <Text style={styles.benefitsCardTitle}>{t('verification.whatIs', 'Pourquoi se vérifier ?')}</Text>
          {[
            { Icon: CheckCircle2, color: colors.primary, text: t('verification.benefit1', 'Badge bleu visible sur votre fiche') },
            { Icon: TrendingUp, color: colors.success, text: t('verification.benefit2', 'Meilleur classement dans les résultats') },
            { Icon: Shield, color: colors.info, text: t('verification.benefit3', 'Confiance accrue des clients') },
          ].map(({ Icon, color: c, text }, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={[styles.benefitIcon, { backgroundColor: c + '18' }]}>
                <Icon size={18} color={c} />
              </View>
              <Text style={styles.benefitText}>{text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>{t('verification.cniTitle', 'Photo de votre CNI')}</Text>
          <Text style={styles.sectionHint}>
            {t('verification.cniSubtitle', 'Votre CNI sera supprimée 24h après vérification')}
          </Text>

          {/* Recto */}
          <Text style={styles.fieldLabel}>{t('verification.frontLabel', 'Recto de la CNI *')}</Text>
          <TouchableOpacity
            style={[styles.photoBox, cniFront && styles.photoBoxFilled]}
            onPress={() => pick('front')}
            activeOpacity={0.8}
          >
            {cniFront ? (
              <>
                <Image source={{ uri: cniFront.uri }} style={styles.photoPreview} />
                <TouchableOpacity style={styles.removePhoto} onPress={() => setCniFront(null)}>
                  <X size={14} color={colors.white} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Camera size={28} color={colors.primary} />
                <Text style={styles.photoText}>{t('verification.addPhotoFront', 'Ajouter la photo recto')}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Verso */}
          <Text style={styles.fieldLabel}>{t('verification.backLabel', 'Verso de la CNI (optionnel)')}</Text>
          <TouchableOpacity
            style={[styles.photoBox, cniBack && styles.photoBoxFilled]}
            onPress={() => pick('back')}
            activeOpacity={0.8}
          >
            {cniBack ? (
              <>
                <Image source={{ uri: cniBack.uri }} style={styles.photoPreview} />
                <TouchableOpacity style={styles.removePhoto} onPress={() => setCniBack(null)}>
                  <X size={14} color={colors.white} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Camera size={28} color={colors.textMuted} />
                <Text style={[styles.photoText, { color: colors.textMuted }]}>
                  {t('verification.addPhotoBack', 'Ajouter la photo verso')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Input
            label={t('verification.messageLabel', 'Message (optionnel)')}
            value={message}
            onChangeText={setMessage}
            placeholder={t('verification.messagePlaceholder', 'Informations supplémentaires...')}
            multiline
            numberOfLines={3}
            maxLength={300}
            showCharCount
          />

          <View style={styles.privacyBox}>
            <Lock size={16} color={colors.info} />
            <Text style={styles.privacyBoxText}>
              {t('verification.privacy', 'Vos documents sont traités de manière confidentielle et supprimés automatiquement après vérification.')}
            </Text>
          </View>

          <Button
            title={loading ? t('common.loading', 'Envoi en cours...') : t('verification.submit', 'Envoyer la demande')}
            onPress={submit}
            loading={loading}
            size="lg"
            style={{ marginTop: 20, marginBottom: 40 }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // ─── Styles écran En cours ──────────────────────────────
  statusScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  pendingHeroCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
    shadowColor: colors.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  pendingIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: colors.warningBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colors.warningBg,
    marginBottom: 12,
  },
  pendingBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  pendingBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warningDark,
  },
  pendingHeroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 26,
  },
  pendingHeroDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },

  stepsCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 20,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  timelineIconCol: {
    alignItems: 'center',
    width: 32,
  },
  stepIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    height: 28,
    backgroundColor: colors.borderLight,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 2,
  },
  timelineDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },

  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.infoBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.infoDark,
    marginBottom: 3,
  },
  privacyText: {
    fontSize: 12,
    color: colors.infoDark,
    lineHeight: 18,
  },
  btnStack: {
    gap: 10,
  },

  // ─── Styles écran Validé ────────────────────────────────
  verifiedHeroCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryLight,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  verifiedIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colors.primaryBg,
    marginBottom: 10,
  },
  verifiedBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  verifiedHeroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 8,
  },
  verifiedHeroDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  benefitsCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  // ─── Styles Formulaire ───────────────────────────────────
  benefits: {
    margin: 16,
    padding: 18,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  benefitsCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 4,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },

  body: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 8,
  },

  photoBox: {
    height: 160,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.primary + '50',
    borderStyle: 'dashed',
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  photoBoxFilled: {
    borderStyle: 'solid',
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '700',
    marginTop: 10,
  },
  removePhoto: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },

  privacyBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: colors.infoBg,
    borderRadius: 14,
    marginTop: 8,
  },
  privacyBoxText: {
    flex: 1,
    fontSize: 12,
    color: colors.infoDark,
    lineHeight: 18,
  },
});