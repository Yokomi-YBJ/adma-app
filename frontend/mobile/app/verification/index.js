/**
 * ADMA — Demande de vérification CNI
 */
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, CheckCircle2, Shield, TrendingUp, X, ChevronLeft } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import api from '../../services/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { showAppModal } from '../../components/ui/AppModal';

async function pickImage() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { showAppModal({ title: 'Permission requise', message: 'Autorisez l\'acces a vos photos.', confirmText: 'OK', variant: 'warning' }); return null; }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
  if (res.canceled) return null;
  return res.assets[0];
}

export default function VerificationScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [cniFront, setCniFront] = useState(null);
  const [cniBack,  setCniBack]  = useState(null);
  const [message,  setMessage]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  async function pick(side) {
    const img = await pickImage();
    if (!img) return;
    if (side === 'front') setCniFront(img);
    else setCniBack(img);
  }

  async function submit() {
    if (!cniFront) { showAppModal({ title: 'Information', message: 'La photo recto de la CNI est obligatoire.', confirmText: 'OK', variant: 'warning' }); return; }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('cniFront', { uri: cniFront.uri, type: 'image/jpeg', name: 'cni_front.jpg' });
      if (cniBack) form.append('cniBack', { uri: cniBack.uri, type: 'image/jpeg', name: 'cni_back.jpg' });
      if (message.trim()) form.append('message', message.trim());
      await api.post('/providers/verification-request', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDone(true);
    } catch (err) {
      showAppModal({ title: 'Erreur', message: err.response?.data?.message || 'Echec de l\'envoi. Reessayez.', confirmText: 'OK', variant: 'danger' });
    }
    setLoading(false);
  }

  if (done) {
    return (
      <View style={styles.doneWrap}>
        <View style={styles.doneIcon}><CheckCircle2 size={48} color={colors.primary} /></View>
        <Text style={styles.doneTitle}>Demande envoyee</Text>
        <Text style={styles.doneDesc}>Nous examinerons votre dossier et vous notifierrons dans les 48 heures.</Text>
        <Text style={styles.donePrivacy}>Votre CNI sera automatiquement supprimee 24h apres la verification.</Text>
        <Button title="Retour au profil" onPress={() => router.back()} style={{ marginTop: 32 }} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>Demande de verification</Text>
      </View>

      {/* Bénéfices */}
      <View style={styles.benefits}>
        {[
          { Icon: CheckCircle2, color: colors.primary,  text: 'Badge bleu visible sur votre fiche' },
          { Icon: TrendingUp,   color: colors.success,  text: 'Meilleur classement dans les resultats' },
          { Icon: Shield,       color: colors.info,     text: 'Confiance accrue des clients' },
        ].map(({ Icon, color: c, text }, i) => (
          <View key={i} style={styles.benefitRow}>
            <View style={[styles.benefitIcon, { backgroundColor: c + '18' }]}><Icon size={18} color={c} /></View>
            <Text style={styles.benefitText}>{text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Photo de votre CNI</Text>
        <Text style={styles.sectionHint}>Votre CNI sera supprimee automatiquement 24h apres la verification.</Text>

        {/* Recto */}
        <Text style={styles.fieldLabel}>Recto (obligatoire)</Text>
        <TouchableOpacity style={[styles.photoBox, cniFront && styles.photoBoxFilled]} onPress={() => pick('front')} activeOpacity={0.8}>
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
              <Text style={styles.photoText}>Ajouter la photo recto</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Verso */}
        <Text style={styles.fieldLabel}>Verso (optionnel)</Text>
        <TouchableOpacity style={[styles.photoBox, cniBack && styles.photoBoxFilled]} onPress={() => pick('back')} activeOpacity={0.8}>
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
              <Text style={[styles.photoText, { color: colors.textMuted }]}>Ajouter la photo verso</Text>
            </>
          )}
        </TouchableOpacity>

        <Input
          label="Message (optionnel)"
          value={message}
          onChangeText={setMessage}
          placeholder="Informations supplementaires..."
          multiline
          numberOfLines={3}
          maxLength={300}
          showCharCount
        />

        <View style={styles.privacyBox}>
          <Shield size={16} color={colors.info} />
          <Text style={styles.privacyText}>
            Vos documents sont traites de maniere confidentielle et supprimes automatiquement apres verification.
          </Text>
        </View>

        <Button
          title={loading ? 'Envoi en cours...' : 'Envoyer la demande'}
          onPress={submit}
          loading={loading}
          size="lg"
          style={{ marginTop: 20, marginBottom: 40 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex:          { flex: 1, backgroundColor: colors.background },
  header:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: colors.white },
  backBtn:       { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  title:         { fontSize: 18, fontWeight: '700', color: colors.navy },
  benefits:      { margin: 16, padding: 16, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight, gap: 12 },
  benefitRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon:   { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  benefitText:   { fontSize: 14, color: colors.text, flex: 1 },
  body:          { paddingHorizontal: 20 },
  sectionTitle:  { fontSize: 17, fontWeight: '700', color: colors.navy, marginBottom: 4 },
  sectionHint:   { fontSize: 13, color: colors.textMuted, marginBottom: 20 },
  fieldLabel:    { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 },
  photoBox:      {
    height: 160, borderRadius: 16, borderWidth: 2, borderColor: colors.primary + '60',
    borderStyle: 'dashed', backgroundColor: colors.primaryBg,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden', position: 'relative',
  },
  photoBoxFilled:{ borderStyle: 'solid', borderColor: colors.primary, backgroundColor: colors.surface },
  photoPreview:  { width: '100%', height: '100%' },
  photoText:     { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 10 },
  removePhoto:   { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.danger, justifyContent: 'center', alignItems: 'center' },
  privacyBox:    { flexDirection: 'row', gap: 10, padding: 14, backgroundColor: colors.infoBg, borderRadius: 12 },
  privacyText:   { flex: 1, fontSize: 13, color: colors.info, lineHeight: 18 },
  doneWrap:      { flex: 1, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', padding: 40 },
  doneIcon:      { width: 100, height: 100, borderRadius: 30, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  doneTitle:     { fontSize: 24, fontWeight: '800', color: colors.navy, marginBottom: 12 },
  doneDesc:      { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  donePrivacy:   { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 18 },
});
