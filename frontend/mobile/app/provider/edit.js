/**
 * ADMA — Modification fiche prestataire
 * Inclut la mise à jour de la zone de service GPS
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location    from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Camera, Save, Navigation, CheckCircle2, X, Trash2 } from 'lucide-react-native';
import { colors }       from '../../constants/colors';
import { PLAN_RADIUS }  from '../../constants/config';
import api              from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Input }        from '../../components/ui/Input';
import { Button }       from '../../components/ui/Button';
import { showAppModal } from '../../components/ui/AppModal';

const AVAILABILITY_OPTIONS = [
  { id:'available',   label:'Disponible',   color:colors.success },
  { id:'busy',        label:'Occupé',        color:colors.warning },
  { id:'unavailable', label:'Indisponible',  color:colors.danger  },
];

export default function EditProviderScreen() {
  const router       = useRouter();
  const insets       = useSafeAreaInsets();
  const provider     = useAuthStore(s => s.provider);
  const updateProv   = useAuthStore(s => s.updateProvider);

  const [saving,     setSaving]     = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [photo,      setPhoto]      = useState(null);

  const [form, setForm] = useState({
    name:           provider?.name            || '',
    specialty:      provider?.specialty       || '',
    description:    provider?.description     || '',
    availability:   provider?.availability    || 'available',
    phoneNumber:    provider?.phoneNumber     || provider?.phone_number    || '',
    whatsappNumber: provider?.whatsappNumber  || provider?.whatsapp_number || '',
    websiteUrl:     provider?.websiteUrl      || provider?.website_url     || '',
  });

  // Géoloc séparée du reste du form
  const [hasGeo,  setHasGeo]  = useState(!!(provider?.latitude && provider?.longitude));
  const [geoCoords, setGeoCoords] = useState(
    provider?.latitude ? { latitude: provider.latitude, longitude: provider.longitude } : null
  );

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showAppModal({ title: 'Information', message: 'Autorisez l\'accès à vos photos.', confirmText: 'OK', variant: 'warning' }); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
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
          title: 'Localisation désactivée',
          message: 'Activez la localisation dans vos paramètres téléphone pour définir votre zone de service.',
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

      // Envoyer au serveur immédiatement
      await api.post('/providers/geo', coords);
      setGeoCoords(coords);
      setHasGeo(true);
      updateProv({ latitude: coords.latitude, longitude: coords.longitude });
      showAppModal({ title: 'Information', message: 'Zone de service mise à jour.', confirmText: 'OK', variant: 'success' });
    } catch (err) {
      showAppModal({ title: 'Erreur', message: err.response?.data?.message || 'Impossible d\'obtenir votre position.', confirmText: 'OK', variant: 'danger' });
    }
    setGeoLoading(false);
  }

  async function removeGeoLocation() {
    showAppModal({
      title: 'Supprimer la zone GPS',
      message: 'Vous n\'apparaîtrez plus dans la recherche "Autour de moi". Continuer ?',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'warning',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete('/providers/geo');
          setGeoCoords(null);
          setHasGeo(false);
          updateProv({ latitude: null, longitude: null });
        } catch {
          showAppModal({ title: 'Erreur', message: 'Échec de la suppression.', confirmText: 'OK', variant: 'danger' });
        }
      },
    });
  }

  // ── Sauvegarde infos textuelles ─────────────────────────────────
  async function save() {
    if (!form.name.trim() || !form.specialty.trim()) {
      showAppModal({ title: 'Information', message: 'Nom et spécialité sont obligatoires.', confirmText: 'OK', variant: 'warning' }); return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== undefined && v !== null) fd.append(k, v.toString());
      });
      if (photo) fd.append('photo', { uri: photo.uri, type: 'image/jpeg', name: 'photo.jpg' });

      const res = await api.put(`/providers/${provider.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateProv(res.data.data);
      showAppModal({
        title: 'Information',
        message: 'Fiche mise à jour.',
        confirmText: 'OK',
        variant: 'success',
        onConfirm: () => router.back(),
      });
    } catch (err) {
      showAppModal({ title: 'Erreur', message: err.response?.data?.message || 'Échec de la mise à jour.', confirmText: 'OK', variant: 'danger' });
    }
    setSaving(false);
  }

  const currentPhoto = photo?.uri || provider?.photoUrl || provider?.photo_url;
  const myPlan       = provider?.plan || 'free';
  const myRadius     = PLAN_RADIUS[myPlan];

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>Modifier ma fiche</Text>
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

        {/* Champs textuels */}
        <Input label="Nom de la fiche *" value={form.name}
          onChangeText={v => set('name', v)} placeholder="Ex: Moussa Électricité"
          maxLength={150} showCharCount />
        <Input label="Spécialité *" value={form.specialty}
          onChangeText={v => set('specialty', v)} placeholder="Ex: Électricien bâtiment"
          maxLength={200} showCharCount />
        <Input label="Description" value={form.description}
          onChangeText={v => set('description', v)} placeholder="Décrivez vos services..."
          multiline numberOfLines={4} maxLength={600} showCharCount />
        <Input label="Numéro de téléphone" value={form.phoneNumber}
          onChangeText={v => set('phoneNumber', v)} keyboardType="phone-pad"
          placeholder="6XXXXXXXX" prefix="+237" />
        <Input label="Numéro WhatsApp" value={form.whatsappNumber}
          onChangeText={v => set('whatsappNumber', v)} keyboardType="phone-pad"
          placeholder="6XXXXXXXX" prefix="+237" />
        <Input label="Site web (optionnel)" value={form.websiteUrl}
          onChangeText={v => set('websiteUrl', v)} placeholder="https://..."
          keyboardType="url" autoCapitalize="none" />

        {/* Disponibilité */}
        <Text style={styles.fieldLabel}>Disponibilité</Text>
        <View style={styles.availRow}>
          {AVAILABILITY_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.availBtn, form.availability === opt.id && { borderColor: opt.color, backgroundColor: opt.color + '15' }]}
              onPress={() => set('availability', opt.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.availDot, { backgroundColor: opt.color }]} />
              <Text style={[styles.availText, form.availability === opt.id && { color: opt.color, fontWeight:'700' }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Zone de service GPS */}
        <View style={styles.geoSection}>
          <Text style={styles.sectionTitle}>Zone de service GPS</Text>
          <Text style={styles.geoDesc}>
            Définissez votre zone pour apparaître dans la recherche "Autour de moi".
            Votre rayon actuel :{' '}
            <Text style={styles.geoPlanText}>
              {myPlan.charAt(0).toUpperCase() + myPlan.slice(1)} — {myRadius ? `${myRadius} km` : 'Illimité'}
            </Text>
          </Text>

          {hasGeo && geoCoords ? (
            <View style={styles.geoDefinedCard}>
              <CheckCircle2 size={22} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.geoDefinedTitle}>Zone de service définie</Text>
                <Text style={styles.geoDefinedCoords}>
                  {geoCoords.latitude.toFixed(5)}, {geoCoords.longitude.toFixed(5)}
                </Text>
                <Text style={styles.geoDefinedHint}>
                  Appuyez sur "Mettre à jour" si vous avez changé de zone de travail.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.geoUndefinedCard}>
              <Navigation size={18} color={colors.textMuted} />
              <Text style={styles.geoUndefinedText}>
                Aucune zone définie — vous n'apparaissez pas dans "Autour de moi"
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
                {hasGeo ? 'Mettre à jour' : 'Définir ma zone ici'}
              </Text>
            </TouchableOpacity>

            {hasGeo && (
              <TouchableOpacity
                style={[styles.geoActionBtn, styles.geoActionBtnDanger]}
                onPress={removeGeoLocation}
                activeOpacity={0.8}
              >
                <Trash2 size={16} color={colors.danger} />
                <Text style={styles.geoActionBtnDangerText}>Supprimer</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Button
          title={saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          onPress={save} loading={saving} size="lg"
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
  availRow:        { gap:8, marginBottom:24 },
  availBtn:        { flexDirection:'row', alignItems:'center', gap:10, padding:14, borderRadius:12, backgroundColor:colors.white, borderWidth:1.5, borderColor:colors.border },
  availDot:        { width:10, height:10, borderRadius:5 },
  availText:       { fontSize:14, color:colors.text, fontWeight:'500' },

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
