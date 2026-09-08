/**
 * ADMA — Profil utilisateur + Gestion complète de la fiche prestataire
 * 
 * Fonctionnalités :
 * - Affichage du profil utilisateur
 * - Chargement de la fiche prestataire depuis l'API (préremplie)
 * - Modification de la fiche (nom, spécialité, description, contact, disponibilité, photo)
 * - Statut vérification + abonnement
 * - Header fixe (sticky)
 * - Pas de suppression dans cette vue (déplacée dans edit.js)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, TextInput, Modal, ActivityIndicator,
  KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import {
  User, Settings, Briefcase, Shield,
  CheckCircle2, Clock, AlertCircle, Star, ChevronRight,
  Edit3, X, Camera, Save, Phone, MessageSquare,
  CheckCheck, Wifi,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';
import { showAppModal } from '../../components/ui/AppModal';

// ── Constantes de vérification ────────────────────────────────────────────────
const VERIFICATION_DISPLAY = {
  none:        { label: 'Non vérifié',        color: colors.textMuted,  Icon: AlertCircle  },
  pending:     { label: "En cours d'examen",  color: colors.warning,    Icon: Clock        },
  verified_id: { label: 'Identité vérifiée',  color: colors.info,       Icon: Shield       },
  verified:    { label: 'Vérifié',            color: colors.primary,    Icon: CheckCircle2 },
};

const PLAN_COLORS = {
  free:         colors.textMuted,
  premium:      colors.primary,
  professional: colors.navyMid,
  enterprise:   colors.navy,
};

const AVAILABILITY_OPTIONS = [
  { value: 'available',   label: 'Disponible',         color: colors.primary },
  { value: 'busy',        label: 'Occupé',             color: colors.warning },
  { value: 'unavailable', label: 'Indisponible',       color: colors.danger  },
];

const CONTACT_OPTIONS = [
  { value: 'phone',     label: 'Téléphone',          Icon: Phone          },
  { value: 'whatsapp',  label: 'WhatsApp',           Icon: MessageSquare  },
  { value: 'both',      label: 'Les deux',           Icon: CheckCheck     },
];

// ── Écran principal ───────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { t }     = useTranslation();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const user      = useAuthStore((s) => s.user);
  const setProvider = useAuthStore((s) => s.setProvider);

  const [provider,       setLocalProvider]  = useState(null);
  const [loadingProv,    setLoadingProv]    = useState(true);
  const [editModalOpen,  setEditModalOpen]  = useState(false);

  // ── Chargement de la fiche depuis l'API ───────────────────────────
  const loadMyProvider = useCallback(async () => {
    if (!user) return;
    setLoadingProv(true);
    try {
      const res = await api.get('/providers/me');
      const data = res.data.data;
      setLocalProvider(data);
      setProvider(data); // sync dans le store
    } catch {
      setLocalProvider(null);
    } finally {
      setLoadingProv(false);
    }
  }, [user]);

  useEffect(() => { loadMyProvider(); }, [loadMyProvider]);

  // ── Utilisateur non connecté ──────────────────────────────────────
  if (!user) {
    return <GuestView insets={insets} router={router} t={t} />;
  }

  const fullName  = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Utilisateur';
  const initials  = fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const verStatus = provider?.verificationStatus || 'none';
  const verInfo   = VERIFICATION_DISPLAY[verStatus] || VERIFICATION_DISPLAY.none;
  const plan      = provider?.plan || 'free';

  return (
    <View style={styles.flex}>
      {/* Header fixe en dehors du ScrollView */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Mon Profil</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/settings')}
          activeOpacity={0.7}
        >
          <Settings size={20} color={colors.navy} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Carte identité */}
        <View style={styles.identityCard}>
          {user.avatarUrl || user.avatar_url ? (
            <Image source={{ uri: user.avatarUrl || user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <Text style={styles.profileName}>{fullName}</Text>
          <Text style={styles.profilePhone}>
            +237 {(user.phone || '').replace('+237', '').replace(/^237/, '')}
          </Text>
        </View>

        {/* Section fiche prestataire */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Espace Professionnel</Text>

          {loadingProv ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Chargement de votre fiche…</Text>
            </View>
          ) : provider ? (
            <>
              {/* Aperçu fiche → cliquable */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push(`/provider/${provider.id}`)}
              >
                <ProviderPreview provider={provider} verInfo={verInfo} plan={plan} />
              </TouchableOpacity>

              {/* Actions : uniquement modifier (suppression déplacée dans edit) */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => router.push('/provider/edit')} // redirige vers edit.js
                  activeOpacity={0.8}
                >
                  <Edit3 size={16} color={colors.white} strokeWidth={2.5} />
                  <Text style={styles.editBtnText}>Modifier ma fiche</Text>
                </TouchableOpacity>
              </View>

              {/* Raccourcis pro */}
              <View style={styles.proLinks}>
                <ProLink
                  icon={<Star size={18} color={PLAN_COLORS[plan]} />}
                  title="Abonnement"
                  value={plan.charAt(0).toUpperCase() + plan.slice(1)}
                  valueColor={PLAN_COLORS[plan]}
                  onPress={() => router.push('/subscription/plans')}
                />
                <ProLink
                  icon={<verInfo.Icon size={18} color={verInfo.color} />}
                  title="Vérification"
                  value={verInfo.label}
                  valueColor={verInfo.color}
                  onPress={() => router.push('/verification')}
                />
              </View>
            </>
          ) : (
            /* Pas encore de fiche → bannière création */
            <TouchableOpacity
              style={styles.createBanner}
              onPress={() => router.push('/provider/create')}
              activeOpacity={0.85}
            >
              <View style={styles.createIconWrap}>
                <Briefcase size={26} color={colors.white} />
              </View>
              <Text style={styles.createTitle}>Devenir Prestataire</Text>
              <Text style={styles.createDesc}>
                Créez votre fiche et proposez vos services à des milliers de clients.
              </Text>
              <View style={styles.createCta}>
                <Text style={styles.createCtaText}>Créer ma fiche</Text>
              </View>
              <View style={styles.bannerDeco} />
            </TouchableOpacity>
          )}
        </View>

        {/* Version */}
        <Text style={styles.version}>Version 1.0.0</Text>

        {/* Modal modification (conservée) */}
        {provider && (
          <EditProviderModal
            visible={editModalOpen}
            provider={provider}
            onClose={() => setEditModalOpen(false)}
            onSaved={(updated) => {
              setLocalProvider(updated);
              setProvider(updated);
              setEditModalOpen(false);
            }}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ── Aperçu fiche prestataire ──────────────────────────────────────────────────
function ProviderPreview({ provider, verInfo, plan }) {
  const avail = AVAILABILITY_OPTIONS.find(a => a.value === provider.availability) || AVAILABILITY_OPTIONS[0];

  return (
    <View style={styles.previewCard}>
      {/* Photo + nom */}
      <View style={styles.previewTop}>
        {provider.photoUrl ? (
          <Image source={{ uri: provider.photoUrl }} style={styles.providerPhoto} />
        ) : (
          <View style={styles.providerPhotoFallback}>
            <Briefcase size={24} color={colors.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.providerName}>{provider.name}</Text>
          <Text style={styles.providerSpecialty}>{provider.specialty}</Text>
          <View style={[styles.availBadge, { backgroundColor: avail.color + '18' }]}>
            <View style={[styles.availDot, { backgroundColor: avail.color }]} />
            <Text style={[styles.availText, { color: avail.color }]}>{avail.label}</Text>
          </View>
        </View>
      </View>

      {/* Description */}
      {!!provider.description && (
        <Text style={styles.previewDesc} numberOfLines={3}>
          {provider.description}
        </Text>
      )}

      {/* Métriques */}
      <View style={styles.metricsRow}>
        <Metric label="Avis"      value={provider.reviewCount || 0} />
        <View style={styles.metricDivider} />
        <Metric label="Confiance" value={`${provider.trustScore || 0}%`} />
        <View style={styles.metricDivider} />
        <Metric label="Vues/mois" value={provider.viewsThisMonth || 0} />
      </View>

      {/* Localisation */}
      <Text style={styles.previewLocation}>
        📍 {[provider.neighborhoodName, provider.cityName].filter(Boolean).join(', ')}
      </Text>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

// ── Lien action rapide ────────────────────────────────────────────────────────
function ProLink({ icon, title, value, valueColor, onPress }) {
  return (
    <TouchableOpacity style={styles.proLinkCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.proLinkIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.proLinkTitle}>{title}</Text>
        <Text style={[styles.proLinkValue, { color: valueColor }]}>{value}</Text>
      </View>
      <ChevronRight size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ── Modal modification (conservée) ──────────────────────────────────────────────────
function EditProviderModal({ visible, provider, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:          provider.name          || '',
    specialty:     provider.specialty     || '',
    description:   provider.description   || '',
    phoneNumber:   provider.phoneNumber   || provider.phone_number    || '',
    whatsappNumber:provider.whatsappNumber|| provider.whatsapp_number || '',
    contactMethod: provider.contactMethod || 'both',
    availability:  provider.availability  || 'available',
  });
  const [photoUri,  setPhotoUri]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  // Réinitialiser quand on réouvre
  useEffect(() => {
    if (visible) {
      setForm({
        name:          provider.name          || '',
        specialty:     provider.specialty     || '',
        description:   provider.description   || '',
        phoneNumber:   provider.phoneNumber   || provider.phone_number    || '',
        whatsappNumber:provider.whatsappNumber|| provider.whatsapp_number || '',
        contactMethod: provider.contactMethod || 'both',
        availability:  provider.availability  || 'available',
      });
      setPhotoUri(null);
      setError('');
    }
  }, [visible, provider]);

  const pickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAppModal({
        title: 'Permission refusée',
        message: "Autorisez l'accès à la galerie dans les paramètres.",
        confirmText: 'OK',
        variant: 'warning',
      });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setPhotoUri(res.assets[0].uri);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim())     { setError('Le nom de la fiche est requis.'); return; }
    if (!form.specialty.trim()){ setError('La spécialité est requise.');    return; }
    setError('');
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== undefined && v !== null) formData.append(k, v);
      });
      if (photoUri) {
        const ext  = photoUri.split('.').pop()?.toLowerCase() || 'jpg';
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        formData.append('photo', { uri: photoUri, name: `photo.${ext}`, type: mime });
      }
      const res = await api.patch(`/providers/${provider.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSaved(res.data.data);
    } catch (e) {
      setError(e?.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }, [form, photoUri, provider.id, onSaved]);

  const currentPhoto = photoUri || provider.photoUrl;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={modal.container}>
          {/* Header modal */}
          <View style={modal.header}>
            <Text style={modal.title}>Modifier ma fiche</Text>
            <TouchableOpacity style={modal.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={colors.navy} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Photo */}
            <TouchableOpacity style={modal.photoRow} onPress={pickPhoto} activeOpacity={0.8}>
              {currentPhoto ? (
                <Image source={{ uri: currentPhoto }} style={modal.photoPreview} />
              ) : (
                <View style={modal.photoPlaceholder}>
                  <Camera size={28} color={colors.primary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={modal.photoLabel}>Photo de la fiche</Text>
                <Text style={modal.photoHint}>
                  {photoUri ? 'Nouvelle photo sélectionnée' : 'Appuyez pour changer'}
                </Text>
              </View>
              <Camera size={18} color={colors.primary} />
            </TouchableOpacity>

            {/* Nom */}
            <Field label="Nom de la fiche *">
              <TextInput
                style={modal.input}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="Ex : Électricien rapide Ngaoundéré"
                placeholderTextColor={colors.textMuted}
                maxLength={80}
              />
            </Field>

            {/* Spécialité */}
            <Field label="Spécialité *">
              <TextInput
                style={modal.input}
                value={form.specialty}
                onChangeText={v => setForm(f => ({ ...f, specialty: v }))}
                placeholder="Ex : Installation électrique, dépannage"
                placeholderTextColor={colors.textMuted}
                maxLength={100}
              />
            </Field>

            {/* Description */}
            <Field label="Description">
              <TextInput
                style={[modal.input, modal.textarea]}
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                placeholder="Décrivez vos services, votre expérience…"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={modal.charCount}>{form.description.length}/500</Text>
            </Field>

            {/* Disponibilité */}
            <Field label="Disponibilité">
              <View style={modal.optionRow}>
                {AVAILABILITY_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.value}
                    style={[
                      modal.optionChip,
                      form.availability === opt.value && { backgroundColor: opt.color + '20', borderColor: opt.color },
                    ]}
                    onPress={() => setForm(f => ({ ...f, availability: opt.value }))}
                  >
                    <View style={[modal.optionDot, { backgroundColor: opt.color }]} />
                    <Text style={[
                      modal.optionText,
                      form.availability === opt.value && { color: opt.color, fontWeight: '700' },
                    ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Field>

            {/* Mode de contact */}
            <Field label="Mode de contact">
              <View style={modal.optionRow}>
                {CONTACT_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.value}
                    style={[
                      modal.optionChip,
                      form.contactMethod === opt.value && { backgroundColor: colors.primary + '18', borderColor: colors.primary },
                    ]}
                    onPress={() => setForm(f => ({ ...f, contactMethod: opt.value }))}
                  >
                    <opt.Icon size={13} color={form.contactMethod === opt.value ? colors.primary : colors.textMuted} strokeWidth={2.2} />
                    <Text style={[
                      modal.optionText,
                      form.contactMethod === opt.value && { color: colors.primary, fontWeight: '700' },
                    ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Field>

            {/* Téléphone */}
            {(form.contactMethod === 'phone' || form.contactMethod === 'both') && (
              <Field label="Numéro téléphone">
                <TextInput
                  style={modal.input}
                  value={form.phoneNumber}
                  onChangeText={v => setForm(f => ({ ...f, phoneNumber: v }))}
                  placeholder="+237 6XX XXX XXX"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={20}
                />
              </Field>
            )}

            {/* WhatsApp */}
            {(form.contactMethod === 'whatsapp' || form.contactMethod === 'both') && (
              <Field label="Numéro WhatsApp">
                <TextInput
                  style={modal.input}
                  value={form.whatsappNumber}
                  onChangeText={v => setForm(f => ({ ...f, whatsappNumber: v }))}
                  placeholder="+237 6XX XXX XXX"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={20}
                />
              </Field>
            )}

            {/* Erreur */}
            {!!error && (
              <View style={modal.errorBox}>
                <AlertCircle size={14} color={colors.danger} />
                <Text style={modal.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Bouton save */}
          <View style={modal.footer}>
            <TouchableOpacity
              style={[modal.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Save size={16} color={colors.white} strokeWidth={2.5} />
                  <Text style={modal.saveBtnText}>Enregistrer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Champ formulaire ──────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <View style={modal.field}>
      <Text style={modal.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ── Vue invité ────────────────────────────────────────────────────────────────
function GuestView({ insets, router, t }) {
  return (
    <View style={[styles.flex, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>
      <View style={styles.guestCard}>
        <View style={styles.guestIcon}>
          <User size={44} color={colors.textMuted} />
        </View>
        <Text style={styles.guestTitle}>Connectez-vous</Text>
        <Text style={styles.guestDesc}>
          Accédez à votre profil, vos favoris et gérez votre fiche prestataire.
        </Text>
        <Button
          title={t('auth.title') || 'Se connecter'}
          onPress={() => router.push('/(auth)/login')}
          style={{ marginTop: 24, width: '100%' }}
        />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.navy },
  settingsBtn: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },

  // Identité
  identityCard: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  avatar: {
    width: 88, height: 88, borderRadius: 28,
    borderWidth: 3, borderColor: colors.white,
    marginBottom: 14,
  },
  avatarFallback: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    borderWidth: 3, borderColor: colors.white,
  },
  avatarInitials: { fontSize: 30, fontWeight: '800', color: colors.primary },
  profileName:   { fontSize: 20, fontWeight: '800', color: colors.navy, marginBottom: 4 },
  profilePhone:  { fontSize: 14, color: colors.textMuted, fontWeight: '500' },

  // Section
  section:      { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 16,
  },

  // Loading
  loadingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.white, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  loadingText: { fontSize: 14, color: colors.textMuted },

  // Aperçu fiche
  previewCard: {
    backgroundColor: colors.white, borderRadius: 18,
    padding: 18, borderWidth: 1, borderColor: colors.borderLight,
    shadowColor: colors.navy, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    marginBottom: 14,
  },
  previewTop: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 12 },
  providerPhoto: { width: 64, height: 64, borderRadius: 16 },
  providerPhotoFallback: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center', alignItems: 'center',
  },
  providerName:     { fontSize: 16, fontWeight: '800', color: colors.navy, marginBottom: 3 },
  providerSpecialty:{ fontSize: 13, color: colors.textMuted, marginBottom: 8 },
  availBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  availDot:  { width: 6, height: 6, borderRadius: 3 },
  availText: { fontSize: 11, fontWeight: '700' },
  previewDesc: {
    fontSize: 13, color: colors.textSecondary, lineHeight: 19,
    marginBottom: 14,
  },
  metricsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 18, fontWeight: '800', color: colors.navy },
  metricLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  metricDivider: { width: 1, height: 32, backgroundColor: colors.border },
  previewLocation: { fontSize: 12, color: colors.textMuted },

  // Actions modifier / supprimer
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 14,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  editBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },

  // Liens pro
  proLinks: { gap: 10, marginBottom: 24 },
  proLinkCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.white, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: colors.borderLight,
  },
  proLinkIcon: {
    width: 40, height: 40, borderRadius: 11,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  proLinkTitle: { fontSize: 13, color: colors.textMuted, marginBottom: 2 },
  proLinkValue: { fontSize: 15, fontWeight: '700' },

  // Bannière création
  createBanner: {
    backgroundColor: colors.primary, borderRadius: 20,
    overflow: 'hidden', padding: 24, marginBottom: 24,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
  },
  createIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  createTitle: { fontSize: 19, fontWeight: '800', color: colors.white, marginBottom: 8 },
  createDesc:  { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 21, marginBottom: 20 },
  createCta: {
    alignSelf: 'flex-start', backgroundColor: colors.white,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
  },
  createCtaText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  bannerDeco: {
    position: 'absolute', right: -40, top: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Guest
  guestCard: {
    margin: 20, padding: 32,
    backgroundColor: colors.white, borderRadius: 24,
    alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight,
    shadowColor: colors.navy, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10,
  },
  guestIcon: {
    width: 84, height: 84, borderRadius: 26,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', marginBottom: 22,
  },
  guestTitle: { fontSize: 21, fontWeight: '800', color: colors.navy, marginBottom: 8 },
  guestDesc:  { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },

  version: { textAlign: 'center', fontSize: 12, color: colors.textDisabled, fontWeight: '500', marginTop: 8 },
});

// ── Styles modal ──────────────────────────────────────────────────────────────
const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  title:    { fontSize: 18, fontWeight: '800', color: colors.navy },
  closeBtn: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },

  // Photo
  photoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: colors.white, borderRadius: 16,
    padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  photoPreview: { width: 64, height: 64, borderRadius: 16 },
  photoPlaceholder: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center', alignItems: 'center',
  },
  photoLabel: { fontSize: 15, fontWeight: '700', color: colors.navy, marginBottom: 4 },
  photoHint:  { fontSize: 12, color: colors.textMuted },

  // Champs
  field:      { marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.navy, marginBottom: 8 },
  input: {
    backgroundColor: colors.white, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: colors.navy,
    borderWidth: 1, borderColor: colors.border,
  },
  textarea:  { height: 100, paddingTop: 12 },
  charCount: { fontSize: 11, color: colors.textMuted, textAlign: 'right', marginTop: 4 },

  // Sélecteurs chips
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.white,
  },
  optionDot:  { width: 7, height: 7, borderRadius: 3.5 },
  optionText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },

  // Erreur
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF0F0', borderRadius: 10,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: colors.danger + '30',
  },
  errorText: { fontSize: 13, color: colors.danger, flex: 1 },

  // Footer
  footer: {
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 16,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});