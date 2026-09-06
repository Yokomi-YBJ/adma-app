/**
 * ADMA — Modification fiche prestataire
 * Inclut la mise à jour de la zone de service GPS
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
import { ChevronLeft, Camera, Save, Navigation, CheckCircle2, X, Trash2, Briefcase, MapPin, Building, Clock, Lock } from 'lucide-react-native';
import { colors }       from '../../constants/colors';
import { PLAN_RADIUS }  from '../../constants/config';
import api              from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Input }        from '../../components/ui/Input';
import { Select }       from '../../components/ui/Select';
import { Button }       from '../../components/ui/Button';
import { showAppModal } from '../../components/ui/AppModal';

export default function EditProviderScreen() {
  const { t, i18n }  = useTranslation();
  const router       = useRouter();
  const insets       = useSafeAreaInsets();
  const provider     = useAuthStore(s => s.provider);
  const updateProv   = useAuthStore(s => s.updateProvider);
  const lang         = i18n.language || 'fr';

  const [saving,     setSaving]     = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [photo,      setPhoto]      = useState(null);

  // Récupération du plan et vérification des droits
  const myPlan = provider?.plan || 'free';
  const showWebsite = myPlan === 'professional' || myPlan === 'enterprise';

  // Initialisation du formulaire sans le champ websiteUrl si non autorisé
  const getInitialForm = () => {
    const base = {
      name:           provider?.name            || '',
      specialty:      provider?.specialty       || '',
      description:    provider?.description     || '',
      availability:   provider?.availability    || 'available',
      phoneNumber:    provider?.phoneNumber     || provider?.phone_number    || '',
      whatsappNumber: provider?.whatsappNumber  || provider?.whatsapp_number || '',
      categoryId:     provider?.categoryId      || provider?.category_id     || null,
      cityId:         provider?.cityId          || provider?.city_id         || null,
      neighborhoodId: provider?.neighborhoodId  || provider?.neighborhood_id || null,
      contactMethod:  provider?.contactMethod   || provider?.contact_method  || 'both',
    };

    // On ajoute websiteUrl uniquement si le plan le permet
    if (showWebsite) {
      base.websiteUrl = provider?.websiteUrl || provider?.website_url || '';
    }

    return base;
  };

  const [form, setForm] = useState(getInitialForm());

  const [allCategories, setAllCategories] = useState([]);
  const [cities,        setCities]        = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);

  // Options de disponibilité pour le Select
  const availabilityOptions = useMemo(() => [
    { id: 'available',   label: t('create.available', 'Disponible'),     color: colors.success },
    { id: 'busy',        label: t('create.busy', 'Occupé'),              color: colors.warning },
    { id: 'unavailable', label: t('create.unavailable', 'Indisponible'), color: colors.danger },
  ], [t]);

  const CONTACT_METHODS = [
    { id:'phone',    label: t('create.phoneOnly', 'Téléphone uniquement') },
    { id:'whatsapp', label: t('create.whatsappOnly', 'WhatsApp uniquement')  },
    { id:'both',     label: t('create.both', 'Téléphone + WhatsApp') },
  ];

  // Géoloc séparée du reste du form
  const [hasGeo,  setHasGeo]  = useState(!!(provider?.latitude && provider?.longitude));
  const [geoCoords, setGeoCoords] = useState(
    provider?.latitude ? { latitude: provider.latitude, longitude: provider.longitude } : null
  );

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

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

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

  // ── GPS ────────────────────────────────────────────────────────
  async function captureGeoLocation() {
    setGeoLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAppModal({
          title: t('create.geoPermDenied', 'Localisation désactivée'),
          message: t('create.geoPermDeniedMsg', 'Activez la localisation dans vos paramètres pour définir votre zone de service.'),
          confirmText: 'OK',
          variant: 'warning',
        });
        setGeoLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };

      await api.post('/providers/geo', coords);
      setGeoCoords(coords);
      setHasGeo(true);
      updateProv({ latitude: coords.latitude, longitude: coords.longitude });
      showAppModal({
        title: t('common.success', 'Succès'),
        message: t('provider.geoUpdateSuccess', 'Zone de service mise à jour.'),
        confirmText: 'OK',
        variant: 'success',
      });
    } catch (err) {
      showAppModal({
        title: t('common.error', 'Erreur'),
        message: err.response?.data?.message || t('create.geoError', 'Impossible d\'obtenir votre position.'),
        confirmText: 'OK',
        variant: 'danger',
      });
    }
    setGeoLoading(false);
  }

  async function removeGeoLocation() {
    showAppModal({
      title: t('provider.geoDeleteTitle', 'Supprimer la zone GPS'),
      message: t('provider.geoDeleteConfirm', 'Vous n\'apparaîtrez plus dans la recherche "Autour de moi". Continuer ?'),
      confirmText: t('common.delete', 'Supprimer'),
      cancelText: t('common.cancel', 'Annuler'),
      variant: 'warning',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete('/providers/geo');
          setGeoCoords(null);
          setHasGeo(false);
          updateProv({ latitude: null, longitude: null });
        } catch {
          showAppModal({
            title: t('common.error', 'Erreur'),
            message: t('common.deleteError', 'Échec de la suppression.'),
            confirmText: 'OK',
            variant: 'danger',
          });
        }
      },
    });
  }

  // ── Sauvegarde infos textuelles ─────────────────────────────────
  async function save() {
    if (!form.name.trim() || !form.specialty.trim() || !form.categoryId || !form.cityId || !form.neighborhoodId) {
      showAppModal({
        title: t('common.info', 'Information'),
        message: t('create.errNameSpecialty', 'Nom, spécialité, catégorie, ville et quartier sont obligatoires.'),
        confirmText: 'OK',
        variant: 'warning',
      });
      return;
    }
    if ((form.contactMethod === 'phone' || form.contactMethod === 'both') && !form.phoneNumber.trim()) {
        showAppModal({ title: t('common.info', 'Information'), message: t('create.errPhone', 'Numéro de téléphone requis.'), confirmText: 'OK', variant: 'warning' });
        return;
    }
    if ((form.contactMethod === 'whatsapp' || form.contactMethod === 'both') && !form.whatsappNumber.trim()) {
        showAppModal({ title: t('common.info', 'Information'), message: t('create.errWhatsapp', 'Numéro WhatsApp requis.'), confirmText: 'OK', variant: 'warning' });
        return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      // On n'envoie que les champs autorisés
      const payload = { ...form };
      // Si le plan ne permet pas le site web, on le supprime du payload
      if (!showWebsite) {
        delete payload.websiteUrl;
      }

      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null) fd.append(k, v.toString());
      });
      if (photo) fd.append('photo', { uri: photo.uri, type: 'image/jpeg', name: 'photo.jpg' });

      const res = await api.put(`/providers/${provider.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateProv(res.data.data);
      showAppModal({
        title: t('common.success', 'Succès'),
        message: t('editProfile.saved', 'Fiche mise à jour avec succès.'),
        confirmText: 'OK',
        variant: 'success',
        onConfirm: () => router.back(),
      });
    } catch (err) {
      showAppModal({
        title: t('common.error', 'Erreur'),
        message: err.response?.data?.message || t('common.saveError', 'Échec de la mise à jour.'),
        confirmText: 'OK',
        variant: 'danger',
      });
    }
    setSaving(false);
  }

  const currentPhoto = photo?.uri || provider?.photoUrl || provider?.photo_url;
  const myRadius     = PLAN_RADIUS[myPlan];

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('provider.editProfile', 'Modifier ma fiche')}</Text>
        <TouchableOpacity style={styles.saveIconBtn} onPress={save} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Save size={20} color={colors.primary} />
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Photo */}
        <TouchableOpacity style={styles.photoWrap} onPress={pickPhoto} activeOpacity={0.85}>
          {currentPhoto ? (
            <Image source={{ uri: currentPhoto }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoFallback]}>
              <Text style={styles.photoInitial}>{(form.name || 'A').charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.cameraBtn}>
            <Camera size={15} color={colors.white} />
          </View>
        </TouchableOpacity>

        {/* Nouveaux champs */}
        <Select
          label={t('create.categoryLabel', 'Catégorie *')}
          value={form.categoryId}
          options={categoryOptions}
          onSelect={id => set('categoryId', id)}
          placeholder={t('create.selectCategory', 'Choisir une catégorie...')}
          searchPlaceholder={t('create.searchCategory', 'Rechercher un métier, service...')}
          modalTitle={t('create.modalCatTitle', 'Sélectionner une catégorie')}
          icon={Briefcase}
        />

        <Input
          label={t('create.nameLabel', 'Nom de la fiche *')}
          value={form.name}
          onChangeText={v => set('name', v)}
          placeholder={t('create.namePlaceholder', 'Ex: Moussa Électricité')}
          maxLength={150}
          showCharCount
        />
        <Input
          label={t('create.specialtyLabel', 'Spécialité *')}
          value={form.specialty}
          onChangeText={v => set('specialty', v)}
          placeholder={t('create.specialtyPlaceholder', 'Ex: Électricien bâtiment')}
          maxLength={200}
          showCharCount
        />
        <Input
          label={t('create.descriptionLabel', 'Description')}
          value={form.description}
          onChangeText={v => set('description', v)}
          placeholder={t('create.descriptionPlaceholder', 'Décrivez vos services...')}
          multiline
          numberOfLines={4}
          maxLength={600}
          showCharCount
        />

        <Select
          label={t('create.cityLabel', 'Ville *')}
          value={form.cityId}
          options={cityOptions}
          onSelect={id => { set('cityId', id); set('neighborhoodId', null); }}
          placeholder={t('create.selectCity', 'Choisir une ville...')}
          searchPlaceholder={t('create.searchCity', 'Rechercher une ville...')}
          modalTitle={t('create.modalCityTitle', 'Sélectionner une ville')}
          icon={Building}
        />

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
        />

        <Text style={[styles.fieldLabel, { marginTop: 10 }]}>{t('create.contactMethodLabel', 'Mode de contact')}</Text>
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
          />
        )}

        {/* Site web — UNIQUEMENT pour les plans Professionnel et Entreprise */}
        {showWebsite ? (
          <Input
            label={t('create.websiteLabel', 'Site web (optionnel)')}
            value={form.websiteUrl || ''}
            onChangeText={v => set('websiteUrl', v)}
            placeholder="https://..."
            keyboardType="url"
            autoCapitalize="none"
          />
        ) : (
          <View style={styles.upgradeHint}>
            <Lock size={14} color={colors.textMuted} />
            <Text style={styles.upgradeHintText}>
              {t('editProfile.websiteUpgradeHint', 'Ajoutez votre site web en passant au plan Professionnel ou Entreprise.')}
            </Text>
          </View>
        )}

        {/* Disponibilité en Select */}
        <Select
          label={t('create.availabilityLabel', 'Disponibilité')}
          value={form.availability}
          options={availabilityOptions.map(opt => ({
            id: opt.id,
            label: opt.label,
            subtitle: null,
          }))}
          onSelect={id => set('availability', id)}
          placeholder={t('create.selectAvailability', 'Choisir un statut...')}
          modalTitle={t('create.modalAvailTitle', 'Statut de disponibilité')}
          icon={Clock}
        />

        {/* Zone de service GPS */}
        <View style={styles.geoSection}>
          <Text style={styles.sectionTitle}>{t('create.geoTitle', 'Zone de service GPS')}</Text>
          <Text style={styles.geoDesc}>
            {t('create.geoHint', 'Définissez votre zone pour apparaître dans la recherche "Autour de moi".')}{' '}
            {t('provider.currentRadius', 'Votre rayon actuel :')}{' '}
            <Text style={styles.geoPlanText}>
              {myPlan.charAt(0).toUpperCase() + myPlan.slice(1)} — {myRadius ? `${myRadius} km` : t('plans.unlimited', 'Illimité')}
            </Text>
          </Text>

          {hasGeo && geoCoords ? (
            <View style={styles.geoDefinedCard}>
              <CheckCircle2 size={22} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.geoDefinedTitle}>{t('create.geoDefined', 'Zone de service définie')}</Text>
                <Text style={styles.geoDefinedCoords}>
                  {geoCoords.latitude.toFixed(5)}, {geoCoords.longitude.toFixed(5)}
                </Text>
                <Text style={styles.geoDefinedHint}>
                  {t('provider.geoDefinedHint', 'Appuyez sur "Mettre à jour" si vous avez changé de zone de travail.')}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.geoUndefinedCard}>
              <Navigation size={18} color={colors.textMuted} />
              <Text style={styles.geoUndefinedText}>
                {t('provider.geoUndefinedText', 'Aucune zone définie — vous n\'apparaissez pas dans "Autour de moi"')}
              </Text>
            </View>
          )}

          <View style={styles.geoBtns}>
            <TouchableOpacity
              style={[styles.geoActionBtn, styles.geoActionBtnPrimary]}
              onPress={captureGeoLocation}
              disabled={geoLoading}
              activeOpacity={0.8}
            >
              {geoLoading
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Navigation size={16} color={colors.white} />
              }
              <Text style={styles.geoActionBtnText}>
                {hasGeo ? t('provider.geoUpdate', 'Mettre à jour') : t('create.geoSet', 'Définir ma zone ici')}
              </Text>
            </TouchableOpacity>

            {hasGeo && (
              <TouchableOpacity
                style={[styles.geoActionBtn, styles.geoActionBtnDanger]}
                onPress={removeGeoLocation}
                activeOpacity={0.8}
              >
                <Trash2 size={16} color={colors.danger} />
                <Text style={styles.geoActionBtnDangerText}>{t('common.delete', 'Supprimer')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Button
          title={saving ? t('common.saving', 'Enregistrement...') : t('common.saveChanges', 'Enregistrer les modifications')}
          onPress={save}
          loading={saving}
          size="lg"
          style={{ marginTop: 8 }}
        />
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:            { flex:1, backgroundColor:colors.background },
  header:          { flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:20, paddingBottom:16, backgroundColor:colors.white, borderBottomWidth:1, borderBottomColor:colors.borderLight },
  backBtn:         { width:40, height:40, borderRadius:12, backgroundColor:colors.surface, justifyContent:'center', alignItems:'center' },
  title:           { flex:1, fontSize:18, fontWeight:'700', color:colors.navy },
  saveIconBtn:     { width:40, height:40, borderRadius:12, backgroundColor:colors.primaryBg, justifyContent:'center', alignItems:'center' },
  body:            { padding:24, alignItems:'stretch' },
  photoWrap:       { alignSelf:'center', position:'relative', marginBottom:28 },
  photo:           { width:100, height:100, borderRadius:24, backgroundColor:colors.surface },
  photoFallback:   { justifyContent:'center', alignItems:'center', backgroundColor:colors.primaryBg },
  photoInitial:    { fontSize:42, fontWeight:'900', color:colors.primary },
  cameraBtn:       { position:'absolute', bottom:-4, right:-4, width:30, height:30, borderRadius:9, backgroundColor:colors.primary, justifyContent:'center', alignItems:'center', borderWidth:2, borderColor:colors.white },
  fieldLabel:      { fontSize:13, fontWeight:'600', color:colors.text, marginBottom:10 },
  
  // Option Grid for Contact Methods
  optionGrid:      { gap:8, marginBottom:16 },
  optionBtn:       { padding:14, borderRadius:12, backgroundColor:colors.white, borderWidth:1.5, borderColor:colors.border },
  optionBtnActive: { borderColor:colors.primary, backgroundColor:colors.primaryBg },
  optionText:      { fontSize:14, color:colors.textSecondary, fontWeight:'500' },
  optionTextActive:{ color:colors.primary, fontWeight:'700' },

  // Upgrade hint pour le site web
  upgradeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
  upgradeHintText: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },

  // GPS section
  geoSection:      { backgroundColor:colors.surface, borderRadius:18, padding:18, marginBottom:24 },
  sectionTitle:    { fontSize:16, fontWeight:'700', color:colors.navy, marginBottom:6 },
  geoDesc:         { fontSize:13, color:colors.textMuted, lineHeight:18, marginBottom:16 },
  geoPlanText:     { color:colors.primary, fontWeight:'700' },
  geoDefinedCard:  { flexDirection:'row', alignItems:'flex-start', gap:12, backgroundColor:colors.successBg, borderRadius:12, padding:14, borderWidth:1, borderColor:colors.success+'40', marginBottom:14 },
  geoDefinedTitle: { fontSize:14, fontWeight:'700', color:colors.success },
  geoDefinedCoords:{ fontSize:11, color:colors.textMuted, marginTop:2, fontFamily:'monospace' },
  geoDefinedHint:  { fontSize:12, color:colors.textMuted, marginTop:4, lineHeight:16 },
  geoUndefinedCard:{ flexDirection:'row', alignItems:'center', gap:10, backgroundColor:colors.white, borderRadius:12, padding:14, borderWidth:1, borderColor:colors.border, marginBottom:14 },
  geoUndefinedText:{ flex:1, fontSize:13, color:colors.textMuted, lineHeight:18 },
  geoBtns:         { flexDirection:'row', gap:10 },
  geoActionBtn:    { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:12, borderRadius:12 },
  geoActionBtnPrimary: { backgroundColor:colors.primary },
  geoActionBtnDanger:  { backgroundColor:colors.dangerBg, borderWidth:1, borderColor:colors.danger+'40' },
  geoActionBtnText:    { fontSize:14, fontWeight:'700', color:colors.white },
  geoActionBtnDangerText: { fontSize:14, fontWeight:'700', color:colors.danger },
});