/**
 * ADMA — Création fiche prestataire (4 étapes)
 * Étape 2 inclut la définition optionnelle de la zone de service GPS
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as Location    from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft, ChevronRight, Camera, Navigation, CheckCircle2, X,
  Briefcase, MapPin, Building,
} from 'lucide-react-native';
import { colors }       from '../../constants/colors';
import { PLAN_RADIUS }  from '../../constants/config';
import api              from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Input }        from '../../components/ui/Input';
import { Select }       from '../../components/ui/Select';
import { Button }       from '../../components/ui/Button';
import { showAppModal } from '../../components/ui/AppModal';

const TOTAL_STEPS = 4;

function StepIndicator({ current, total }) {
  return (
    <View style={si.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[si.dot, i < current && si.dotDone]} />
      ))}
    </View>
  );
}
const si = StyleSheet.create({
  row:     { flexDirection:'row', gap:8, alignItems:'center' },
  dot:     { height:4, flex:1, borderRadius:2, backgroundColor:colors.border },
  dotDone: { backgroundColor:colors.primary },
});

export default function CreateProviderScreen() {
  const { t, i18n }  = useTranslation();
  const router       = useRouter();
  const insets       = useSafeAreaInsets();
  const setProvider  = useAuthStore(s => s.setProvider);

  const [step,       setStep]       = useState(1);
  const [loading,    setLoading]    = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [photo,      setPhoto]      = useState(null);

  const [form, setForm] = useState({
    categoryId:     null,
    name:           '',
    specialty:      '',
    description:    '',
    cityId:         null,
    neighborhoodId: null,
    contactMethod:  'both',
    phoneNumber:    '',
    whatsappNumber: '',
    availability:   'available',
    latitude:       null,
    longitude:      null,
  });
  const [errors, setErrors] = useState({});

  const [allCategories, setAllCategories] = useState([]);
  const [cities,        setCities]        = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);

  const lang = i18n.language || 'fr';

  useEffect(() => {
    loadMetaData();
  }, []);

  async function loadMetaData() {
    try {
      const [cRes, ciRes, nRes] = await Promise.all([
        api.get('/categories'),
        api.get('/categories/cities'),
        api.get('/categories/neighborhoods'),
      ]);
      setAllCategories(cRes.data.data || []);
      setCities(ciRes.data.data || []);
      setNeighborhoods(nRes.data.data || []);
    } catch {}
  }

  // Catégories filtrées (sous-catégories) formatées pour le composant Select
  const categoryOptions = useMemo(() => {
    const parentMap = {};
    allCategories.forEach(c => {
      if (!c.parent_id) parentMap[c.id] = c;
    });

    const subCats = allCategories.filter(c => c.parent_id);
    return subCats.map(c => {
      const parent = parentMap[c.parent_id];
      const parentName = lang === 'en' ? (parent?.name_en || parent?.name_fr) : lang === 'ful' ? (parent?.name_ful || parent?.name_fr) : parent?.name_fr;
      const catName = lang === 'en' ? (c.name_en || c.name_fr) : lang === 'ful' ? (c.name_ful || c.name_fr) : c.name_fr;

      return {
        id: c.id,
        label: catName,
        subtitle: parentName,
        group: parentName,
      };
    });
  }, [allCategories, lang]);

  const cityOptions = useMemo(() => {
    return cities.map(ci => ({
      id: ci.id,
      label: ci.name,
      subtitle: ci.region || 'Cameroun',
    }));
  }, [cities]);

  const neighborhoodOptions = useMemo(() => {
    if (!form.cityId) return [];
    return neighborhoods
      .filter(n => n.city_id === form.cityId)
      .map(n => ({
        id: n.id,
        label: n.name,
      }));
  }, [neighborhoods, form.cityId]);

  const CONTACT_METHODS = [
    { id:'phone',    label: t('create.phoneOnly', 'Téléphone uniquement') },
    { id:'whatsapp', label: t('create.whatsappOnly', 'WhatsApp uniquement')  },
    { id:'both',     label: t('create.both', 'Téléphone + WhatsApp') },
  ];

  const AVAILABILITY_OPTIONS = [
    { id:'available',   label: t('create.available', 'Disponible'),     color: colors.success },
    { id:'busy',        label: t('create.busy', 'Occupé'),              color: colors.warning },
    { id:'unavailable', label: t('create.unavailable', 'Indisponible'),  color: colors.danger  },
  ];

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: null }));
  }

  // ── Géolocalisation zone de service ────────────────────────────
  async function captureGeoLocation() {
    setGeoLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAppModal({
          title: t('create.geoPermDenied', 'Localisation désactivée'),
          message: t('create.geoPermDeniedMsg', 'Activez la localisation dans les paramètres pour définir votre zone de service.'),
          confirmText: 'OK',
          variant: 'warning',
        });
        setGeoLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      set('latitude',  pos.coords.latitude);
      set('longitude', pos.coords.longitude);
    } catch {
      showAppModal({
        title: t('common.error', 'Erreur'),
        message: t('create.geoError', 'Impossible d\'obtenir votre position. Réessayez.'),
        confirmText: 'OK',
        variant: 'warning',
      });
    }
    setGeoLoading(false);
  }

  function removeGeoLocation() {
    set('latitude',  null);
    set('longitude', null);
  }

  function validateStep() {
    const errs = {};
    if (step === 1) {
      if (!form.categoryId)       errs.categoryId = t('create.errCategory', 'Catégorie requise');
      if (!form.name.trim())      errs.name       = t('create.errName', 'Nom requis');
      if (!form.specialty.trim()) errs.specialty  = t('create.errSpecialty', 'Spécialité requise');
    }
    if (step === 2) {
      if (!form.cityId)           errs.cityId         = t('create.errCity', 'Ville requise');
      if (!form.neighborhoodId)   errs.neighborhoodId = t('create.errNeighborhood', 'Quartier requis');
      if ((form.contactMethod === 'phone'    || form.contactMethod === 'both') && !form.phoneNumber.trim())
        errs.phoneNumber = t('create.errPhone', 'Numéro de téléphone requis');
      if ((form.contactMethod === 'whatsapp' || form.contactMethod === 'both') && !form.whatsappNumber.trim())
        errs.whatsappNumber = t('create.errWhatsapp', 'Numéro WhatsApp requis');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function goNext() {
    if (!validateStep()) return;
    setStep(s => s + 1);
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAppModal({
        title: t('common.error', 'Erreur'),
        message: t('create.permPhoto', 'Autorisez l\'accès à vos photos.'),
        confirmText: 'OK',
        variant: 'warning',
      });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!res.canceled) setPhoto(res.assets[0]);
  }

  async function submit() {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== '') fd.append(k, v.toString());
      });
      if (photo) fd.append('photo', { uri: photo.uri, type: 'image/jpeg', name: 'photo.jpg' });

      const res = await api.post('/providers', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProvider(res.data.data);
      showAppModal({
        title: t('create.success', 'Fiche créée avec succès'),
        message: t('create.successMsg', 'Votre fiche est maintenant visible sur Adma.'),
        confirmText: t('create.viewProfile', 'Voir ma fiche'),
        variant: 'success',
        onConfirm: () => router.replace(`/provider/${res.data.data.id}`),
      });
    } catch (err) {
      showAppModal({
        title: t('common.error', 'Erreur'),
        message: err.response?.data?.message || t('create.error', 'Échec de la création.'),
        confirmText: 'OK',
        variant: 'danger',
      });
    }
    setLoading(false);
  }

  const hasGeo = form.latitude !== null && form.longitude !== null;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={step === 1 ? () => router.back() : () => setStep(s => s - 1)}
        >
          <ChevronLeft size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.stepLabel}>
            {t('create.stepOf', { step, total: TOTAL_STEPS, defaultValue: `Étape ${step} sur ${TOTAL_STEPS}` })}
          </Text>
          <StepIndicator current={step} total={TOTAL_STEPS} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Étape 1 — Informations de base ── */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>{t('create.step1', 'Informations de base')}</Text>
            <Text style={styles.stepSub}>{t('create.step1Sub', 'Décrivez votre métier et vos compétences')}</Text>

            {/* Select Catégorie avec Modal et Recherche */}
            <Select
              label={t('create.categoryLabel', 'Catégorie *')}
              value={form.categoryId}
              options={categoryOptions}
              onSelect={id => set('categoryId', id)}
              placeholder={t('create.selectCategory', 'Choisir une catégorie...')}
              searchPlaceholder={t('create.searchCategory', 'Rechercher un métier, service...')}
              modalTitle={t('create.modalCatTitle', 'Sélectionner une catégorie')}
              icon={Briefcase}
              error={errors.categoryId}
            />

            <Input
              label={t('create.nameLabel', 'Nom de la fiche *')}
              value={form.name}
              onChangeText={v => set('name', v)}
              placeholder={t('create.namePlaceholder', 'Ex: Moussa Électricité')}
              error={errors.name}
              maxLength={150}
              showCharCount
            />
            <Input
              label={t('create.specialtyLabel', 'Spécialité *')}
              value={form.specialty}
              onChangeText={v => set('specialty', v)}
              placeholder={t('create.specialtyPlaceholder', 'Ex: Électricien bâtiment, dépannage')}
              error={errors.specialty}
              maxLength={200}
              showCharCount
            />
            <Input
              label={t('create.descriptionLabel', 'Description')}
              value={form.description}
              onChangeText={v => set('description', v)}
              placeholder={t('create.descriptionPlaceholder', 'Décrivez vos services, vos tarifs, vos années d\'expérience...')}
              multiline
              numberOfLines={4}
              maxLength={600}
              showCharCount
            />
          </View>
        )}

        {/* ── Étape 2 — Localisation & contact ── */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>{t('create.step2', 'Localisation et contact')}</Text>
            <Text style={styles.stepSub}>{t('create.step2Sub', 'Où exercez-vous votre activité ?')}</Text>

            {/* Select Ville */}
            <Select
              label={t('create.cityLabel', 'Ville *')}
              value={form.cityId}
              options={cityOptions}
              onSelect={id => { set('cityId', id); set('neighborhoodId', null); }}
              placeholder={t('create.selectCity', 'Choisir une ville...')}
              searchPlaceholder={t('create.searchCity', 'Rechercher une ville...')}
              modalTitle={t('create.modalCityTitle', 'Sélectionner une ville')}
              icon={Building}
              error={errors.cityId}
            />

            {/* Select Quartier */}
            <Select
              label={t('create.neighborhoodLabel', 'Quartier *')}
              value={form.neighborhoodId}
              options={neighborhoodOptions}
              onSelect={id => set('neighborhoodId', id)}
              placeholder={t('create.selectNeighborhood', 'Choisir un quartier...')}
              searchPlaceholder={t('create.searchNeighborhood', 'Rechercher un quartier...')}
              modalTitle={t('create.modalNeighTitle', 'Sélectionner un quartier')}
              icon={MapPin}
              disabled={!form.cityId}
              hint={!form.cityId ? t('create.selectCityFirst', 'Veuillez d\'abord choisir une ville.') : undefined}
              error={errors.neighborhoodId}
            />

            {/* Zone de service GPS */}
            <View style={styles.geoSection}>
              <Text style={styles.fieldLabel}>{t('create.geoTitle', 'Zone de service GPS')}</Text>
              <Text style={styles.geoHint}>
                {t('create.geoHint', 'Définissez votre zone pour apparaître dans la recherche "Autour de moi".')}
              </Text>

              {hasGeo ? (
                <View style={styles.geoSuccess}>
                  <CheckCircle2 size={20} color={colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.geoSuccessText}>{t('create.geoDefined', 'Zone de service définie')}</Text>
                    <Text style={styles.geoCoords}>
                      {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={removeGeoLocation} style={styles.removeGeoBtn}>
                    <X size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.geoBtn}
                  onPress={captureGeoLocation}
                  disabled={geoLoading}
                  activeOpacity={0.8}
                >
                  {geoLoading
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <Navigation size={20} color={colors.primary} />
                  }
                  <Text style={styles.geoBtnText}>
                    {geoLoading ? t('create.geoSetting', 'Localisation...') : t('create.geoSet', 'Définir ma zone de service ici')}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Info rayons par plan */}
              <View style={styles.radiusInfo}>
                <Text style={styles.radiusTitle}>{t('create.geoRadiusTitle', 'Rayon selon votre plan')}</Text>
                {[
                  { plan: t('plans.free', 'Gratuit'),            radius: '3 km',     color: colors.textMuted },
                  { plan: t('plans.premium', 'Premium'),          radius: '6 km',     color: colors.primary   },
                  { plan: t('plans.professional', 'Professionnel'), radius: '9 km',   color: colors.navyMid   },
                  { plan: t('plans.enterprise', 'Entreprise'),     radius: t('plans.unlimited', 'Illimité'), color: colors.navy },
                ].map(r => (
                  <View key={r.plan} style={styles.radiusRow}>
                    <View style={[styles.radiusDot, { backgroundColor: r.color }]} />
                    <Text style={styles.radiusPlan}>{r.plan}</Text>
                    <Text style={[styles.radiusKm, { color: r.color }]}>{r.radius}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Contact */}
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{t('create.contactMethodLabel', 'Mode de contact')}</Text>
            <View style={styles.optionGrid}>
              {CONTACT_METHODS.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.optionBtn, form.contactMethod === m.id && styles.optionBtnActive]}
                  onPress={() => set('contactMethod', m.id)}
                >
                  <Text style={[styles.optionText, form.contactMethod === m.id && styles.optionTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(form.contactMethod === 'phone' || form.contactMethod === 'both') && (
              <Input
                label={t('create.phoneLabel', 'Numéro de téléphone')}
                value={form.phoneNumber}
                onChangeText={v => set('phoneNumber', v)}
                keyboardType="phone-pad"
                placeholder="6XXXXXXXX"
                prefix="+237"
                error={errors.phoneNumber}
              />
            )}
            {(form.contactMethod === 'whatsapp' || form.contactMethod === 'both') && (
              <Input
                label={t('create.whatsappLabel', 'Numéro WhatsApp')}
                value={form.whatsappNumber}
                onChangeText={v => set('whatsappNumber', v)}
                keyboardType="phone-pad"
                placeholder="6XXXXXXXX"
                prefix="+237"
                error={errors.whatsappNumber}
              />
            )}
          </View>
        )}

        {/* ── Étape 3 — Photo ── */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>{t('create.photoLabel', 'Photo de profil')}</Text>
            <Text style={styles.stepSub}>{t('create.photoSub', 'Une bonne photo professionnelle augmente la confiance des clients')}</Text>

            <TouchableOpacity style={styles.photoBox} onPress={pickPhoto} activeOpacity={0.8}>
              {photo ? (
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={40} color={colors.primary} />
                  <Text style={styles.photoHint}>{t('create.addPhoto', 'Appuyez pour choisir une photo')}</Text>
                  <Text style={styles.photoFormatHint}>JPEG, PNG — max 5 Mo</Text>
                </View>
              )}
            </TouchableOpacity>

            {photo && (
              <TouchableOpacity style={styles.changePhotoBtn} onPress={pickPhoto}>
                <Text style={styles.changePhotoText}>{t('create.changePhoto', 'Changer la photo')}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>{t('create.tipsTitle', 'Conseils pour une bonne photo')}</Text>
              {[
                t('create.tip1', 'Visage ou lieu de travail bien éclairé'),
                t('create.tip2', 'Arrière-plan soigné et professionnel'),
                t('create.tip3', 'Photo nette et récente'),
              ].map((tip, i) => <Text key={i} style={styles.tipItem}>· {tip}</Text>)}
            </View>
          </View>
        )}

        {/* ── Étape 4 — Disponibilité + récap ── */}
        {step === 4 && (
          <View>
            <Text style={styles.stepTitle}>{t('create.availabilityLabel', 'Disponibilité')}</Text>
            <Text style={styles.stepSub}>{t('create.availabilitySub', 'Indiquez votre statut actuel')}</Text>

            {AVAILABILITY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.availBtn, form.availability === opt.id && { borderColor: opt.color, backgroundColor: opt.color + '12' }]}
                onPress={() => set('availability', opt.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.availDot, { backgroundColor: opt.color }]} />
                <Text style={[styles.availLabel, form.availability === opt.id && { color: opt.color, fontWeight:'700' }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Résumé */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>{t('create.summaryTitle', 'Récapitulatif de votre fiche')}</Text>
              {[
                { l: t('create.categoryLabel', 'Catégorie'),  v: categoryOptions.find(c => c.id === form.categoryId)?.label },
                { l: t('create.nameLabel', 'Nom'),        v: form.name },
                { l: t('create.specialtyLabel', 'Spécialité'), v: form.specialty },
                { l: t('create.cityLabel', 'Ville'),      v: cities.find(c => c.id === form.cityId)?.name },
                { l: t('create.neighborhoodLabel', 'Quartier'),   v: neighborhoods.find(n => n.id === form.neighborhoodId)?.name },
                { l: t('create.contactMethodLabel', 'Contact'),    v: CONTACT_METHODS.find(m => m.id === form.contactMethod)?.label },
                { l: t('create.geoTitle', 'Zone GPS'),   v: hasGeo ? t('create.geoDefined', 'Définie') : t('create.geoNone', 'Non définie (optionnel)') },
              ].map(({ l, v }) => (
                <View key={l} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{l}</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>{v || '—'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Navigation */}
        <View style={styles.navRow}>
          {step < TOTAL_STEPS ? (
            <Button
              title={t('create.next', 'Suivant')}
              onPress={goNext}
              size="lg"
              icon={ChevronRight}
              iconPosition="right"
            />
          ) : (
            <Button
              title={loading ? t('create.submitting', 'Publication...') : t('create.submit', 'Publier ma fiche')}
              onPress={submit}
              loading={loading}
              size="lg"
            />
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:           { flex:1, backgroundColor:colors.background },
  header:         { flexDirection:'row', alignItems:'center', gap:16, paddingHorizontal:20, paddingBottom:16, backgroundColor:colors.white, borderBottomWidth:1, borderBottomColor:colors.borderLight },
  backBtn:        { width:40, height:40, borderRadius:12, backgroundColor:colors.surface, justifyContent:'center', alignItems:'center' },
  stepLabel:      { fontSize:12, color:colors.textMuted, fontWeight:'600', marginBottom:6 },
  body:           { padding:24 },
  stepTitle:      { fontSize:22, fontWeight:'800', color:colors.navy, marginBottom:6 },
  stepSub:        { fontSize:14, color:colors.textMuted, marginBottom:22, lineHeight:20 },
  fieldLabel:     { fontSize:13, fontWeight:'600', color:colors.text, marginBottom:8 },
  optionGrid:     { gap:8, marginBottom:16 },
  optionBtn:      { padding:14, borderRadius:12, backgroundColor:colors.white, borderWidth:1.5, borderColor:colors.border },
  optionBtnActive:{ borderColor:colors.primary, backgroundColor:colors.primaryBg },
  optionText:     { fontSize:14, color:colors.textSecondary, fontWeight:'500' },
  optionTextActive:{ color:colors.primary, fontWeight:'700' },

  // Géolocalisation
  geoSection:     { backgroundColor:colors.surface, borderRadius:16, padding:16, marginTop:8, marginBottom:16 },
  geoHint:        { fontSize:13, color:colors.textMuted, lineHeight:18, marginBottom:14 },
  geoBtn:         { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:colors.white, borderWidth:1.5, borderColor:colors.primary, borderRadius:12, padding:14 },
  geoBtnText:     { fontSize:14, color:colors.primary, fontWeight:'600', flex:1 },
  geoSuccess:     { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:colors.successBg, borderRadius:12, padding:14, borderWidth:1, borderColor:colors.success+'40' },
  geoSuccessText: { fontSize:14, fontWeight:'700', color:colors.success },
  geoCoords:      { fontSize:11, color:colors.textMuted, marginTop:2 },
  removeGeoBtn:   { padding:4 },
  radiusInfo:     { marginTop:16, gap:8 },
  radiusTitle:    { fontSize:12, fontWeight:'700', color:colors.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 },
  radiusRow:      { flexDirection:'row', alignItems:'center', gap:8 },
  radiusDot:      { width:8, height:8, borderRadius:4 },
  radiusPlan:     { flex:1, fontSize:13, color:colors.text },
  radiusKm:       { fontSize:13, fontWeight:'700' },

  // Photo
  photoBox:        { height:220, borderRadius:20, borderWidth:2, borderColor:colors.primary+'50', borderStyle:'dashed', overflow:'hidden', marginBottom:12 },
  photoPreview:    { width:'100%', height:'100%' },
  photoPlaceholder:{ flex:1, justifyContent:'center', alignItems:'center', gap:10, backgroundColor:colors.primaryBg },
  photoHint:       { fontSize:15, color:colors.primary, fontWeight:'600' },
  photoFormatHint: { fontSize:12, color:colors.textMuted },
  changePhotoBtn:  { alignItems:'center', padding:10 },
  changePhotoText: { fontSize:14, color:colors.primary, fontWeight:'600' },
  tipsBox:         { backgroundColor:colors.surface, borderRadius:14, padding:16, marginTop:16 },
  tipsTitle:       { fontSize:13, fontWeight:'700', color:colors.text, marginBottom:10 },
  tipItem:         { fontSize:13, color:colors.textSecondary, marginBottom:4 },

  // Disponibilité
  availBtn:        { flexDirection:'row', alignItems:'center', gap:12, padding:16, borderRadius:14, backgroundColor:colors.white, borderWidth:1.5, borderColor:colors.border, marginBottom:10 },
  availDot:        { width:12, height:12, borderRadius:6 },
  availLabel:      { fontSize:15, color:colors.text, fontWeight:'500' },

  // Résumé
  summaryBox:      { backgroundColor:colors.white, borderRadius:16, padding:18, marginTop:24, borderWidth:1, borderColor:colors.borderLight },
  summaryTitle:    { fontSize:14, fontWeight:'700', color:colors.navy, marginBottom:12 },
  summaryRow:      { flexDirection:'row', justifyContent:'space-between', paddingVertical:8, borderBottomWidth:1, borderBottomColor:colors.borderLight },
  summaryLabel:    { fontSize:13, color:colors.textMuted, fontWeight:'500' },
  summaryValue:    { fontSize:13, color:colors.navy, fontWeight:'600', flex:1, textAlign:'right' },
  navRow:          { marginTop:32 },
});
