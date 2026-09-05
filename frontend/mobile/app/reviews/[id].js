import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThumbsUp, Minus, ThumbsDown, ChevronLeft } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import api from '../../services/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { showAppModal } from '../../components/ui/AppModal';

const VERDICTS = [
  { id: 'recommend', label: 'Je recommande', Icon: ThumbsUp,   color: colors.success, bg: colors.successBg },
  { id: 'neutral',   label: 'Neutre',         Icon: Minus,      color: colors.warning, bg: colors.warningBg },
  { id: 'discourage',label: 'Je deconseille', Icon: ThumbsDown, color: colors.danger,  bg: colors.dangerBg },
];

export default function ReviewScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { id }  = useLocalSearchParams();

  const [verdict,  setVerdict]  = useState(null);
  const [comment,  setComment]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  async function submit() {
    if (!verdict) { showAppModal({ title: 'Information', message: 'Choisissez une appreciation.', confirmText: 'OK', variant: 'warning' }); return; }
    setLoading(true);
    try {
      await api.post('/reviews', { providerId: parseInt(id), verdict, comment: comment.trim() || null });
      setDone(true);
    } catch (err) {
      showAppModal({ title: 'Erreur', message: err.response?.data?.message || 'Impossible de publier l\'avis.', confirmText: 'OK', variant: 'danger' });
    }
    setLoading(false);
  }

  if (done) {
    return (
      <View style={styles.doneWrap}>
        <View style={styles.doneIcon}>
          <ThumbsUp size={40} color={colors.primary} />
        </View>
        <Text style={styles.doneTitle}>Avis publie</Text>
        <Text style={styles.doneDesc}>Votre avis aide les autres utilisateurs a faire le bon choix.</Text>
        <Button title="Retour" onPress={() => router.back()} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>Laisser un avis</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.question}>Quelle est votre appreciation ?</Text>

        <View style={styles.verdictRow}>
          {VERDICTS.map((v) => {
            const active = verdict === v.id;
            return (
              <TouchableOpacity
                key={v.id}
                style={[styles.verdictBtn, { borderColor: active ? v.color : colors.border, backgroundColor: active ? v.bg : colors.white }]}
                onPress={() => setVerdict(v.id)}
                activeOpacity={0.8}
              >
                <v.Icon size={28} color={active ? v.color : colors.textMuted} fill={active ? v.color : 'none'} />
                <Text style={[styles.verdictLabel, active && { color: v.color, fontWeight: '700' }]}>{v.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Input
          label="Commentaire (optionnel)"
          value={comment}
          onChangeText={setComment}
          placeholder="Decrivez votre experience avec ce prestataire..."
          multiline
          numberOfLines={4}
          maxLength={500}
          showCharCount
        />

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Votre avis doit etre honnete et base sur une experience reelle. Les faux avis seront supprimes.
          </Text>
        </View>

        <Button
          title="Publier l'avis"
          onPress={submit}
          loading={loading}
          disabled={!verdict}
          size="lg"
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:          { flex: 1, backgroundColor: colors.background },
  header:        { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  backBtn:       { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  title:         { fontSize: 20, fontWeight: '800', color: colors.navy },
  body:          { padding: 24, paddingBottom: 60 },
  question:      { fontSize: 18, fontWeight: '700', color: colors.navy, marginBottom: 20 },
  verdictRow:    { flexDirection: 'row', gap: 10, marginBottom: 28 },
  verdictBtn:    { flex: 1, alignItems: 'center', paddingVertical: 18, borderRadius: 16, borderWidth: 2, gap: 8 },
  verdictLabel:  { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  disclaimer:    { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 20 },
  disclaimerText:{ fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  doneWrap:      { flex: 1, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', padding: 40 },
  doneIcon:      { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  doneTitle:     { fontSize: 24, fontWeight: '800', color: colors.navy, marginBottom: 10 },
  doneDesc:      { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
