import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, Minus, ThumbsDown, ChevronLeft } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import api from '../../services/api';
import { setCache } from '../../services/cache';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { showAppModal } from '../../components/ui/AppModal';

export default function ReviewScreen() {
  const { t }   = useTranslation();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { id }  = useLocalSearchParams();

  const [verdict,  setVerdict]  = useState(null);
  const [comment,  setComment]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  const VERDICTS = [
    { id: 'recommend',  label: t('review.recommend', 'Je recommande'),   Icon: ThumbsUp,   color: colors.success, bg: colors.successBg },
    { id: 'neutral',    label: t('review.neutral', 'Neutre'),             Icon: Minus,      color: colors.warning, bg: colors.warningBg },
    { id: 'discourage', label: t('review.discourage', 'Je déconseille'), Icon: ThumbsDown, color: colors.danger,  bg: colors.dangerBg },
  ];

  async function submit() {
    if (!verdict) {
      showAppModal({
        title: 'Information',
        message: 'Choisissez une appréciation.',
        confirmText: 'OK',
        variant: 'warning',
      });
      return;
    }
    setLoading(true);
    try {
      await api.post('/reviews', { providerId: parseInt(id), verdict, comment: comment.trim() || null });
      // Invalider le cache du prestataire pour que la fiche affiche le nouvel avis immédiatement
      await setCache(`provider_${id}`, null);
      setDone(true);
    } catch (err) {
      showAppModal({
        title: 'Erreur',
        message: err.response?.data?.message || 'Impossible de publier l\'avis.',
        confirmText: 'OK',
        variant: 'danger',
      });
    }
    setLoading(false);
  }

  if (done) {
    return (
      <View style={styles.doneWrap}>
        <View style={styles.doneIcon}>
          <ThumbsUp size={40} color={colors.primary} />
        </View>
        <Text style={styles.doneTitle}>{t('review.success', 'Avis publié !')}</Text>
        <Text style={styles.doneDesc}>Votre avis aide les autres utilisateurs à faire le bon choix.</Text>
        <Button title={t('common.back', 'Retour')} onPress={() => router.back()} style={{ marginTop: 24, minWidth: 160 }} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('review.title', 'Laisser un avis')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.question}>Quelle est votre appréciation ?</Text>

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
          label={t('review.commentLabel', 'Commentaire (optionnel)')}
          value={comment}
          onChangeText={setComment}
          placeholder={t('review.commentPlaceholder', 'Décrivez votre expérience avec ce prestataire...')}
          multiline
          numberOfLines={4}
          maxLength={500}
          showCharCount
        />

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Votre avis doit être honnête et basé sur une expérience réelle. Les faux avis seront supprimés.
          </Text>
        </View>

        <Button
          title={loading ? t('common.loading', 'Publication...') : t('review.submit', 'Publier l\'avis')}
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
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  backBtn:       { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  title:         { fontSize: 18, fontWeight: '800', color: colors.navy },
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
