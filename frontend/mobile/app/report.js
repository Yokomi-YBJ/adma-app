import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Check } from 'lucide-react-native';
import { colors } from '../constants/colors';
import api from '../services/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { showAppModal } from '../components/ui/AppModal';

export default function ReportScreen() {
  const { t }   = useTranslation();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const params  = useLocalSearchParams();
  const { type, id } = params;

  const [reason,  setReason]  = useState(null);
  const [detail,  setDetail]  = useState('');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const REASONS = [
    { id: 'fake_provider',          label: t('report.reasons.fake_provider', 'Fausse fiche / arnaque') },
    { id: 'wrong_number',           label: t('report.reasons.wrong_number', 'Mauvais numéro de téléphone') },
    { id: 'wrong_info',             label: t('report.reasons.wrong_info', 'Informations incorrectes') },
    { id: 'activity_not_exist',     label: t('report.reasons.activity_not_exist', 'Activité inexistante') },
    { id: 'problematic_behavior',   label: t('report.reasons.problematic_behavior', 'Comportement problématique') },
    { id: 'fake_review',            label: t('report.reasons.fake_review', 'Faux avis') },
    { id: 'offensive',              label: t('report.reasons.offensive', 'Contenu offensant') },
    { id: 'spam',                   label: t('report.reasons.spam', 'Spam') },
    { id: 'other',                  label: t('report.reasons.other', 'Autre raison') },
  ];

  async function submit() {
    if (!reason) {
      showAppModal({
        title: t('common.info', 'Information'),
        message: t('report.chooseReason', 'Choisissez une raison.'),
        confirmText: 'OK',
        variant: 'warning',
      });
      return;
    }
    setLoading(true);
    try {
      await api.post('/reports', { targetType: type, targetId: parseInt(id), reason, description: detail.trim() || null });
      setDone(true);
    } catch (err) {
      showAppModal({
        title: t('common.error', 'Erreur'),
        message: err.response?.data?.message || t('report.error', 'Échec de l\'envoi.'),
        confirmText: 'OK',
        variant: 'danger',
      });
    }
    setLoading(false);
  }

  if (done) {
    return (
      <View style={styles.doneWrap}>
        <View style={styles.doneIcon}><Check size={40} color={colors.success} /></View>
        <Text style={styles.doneTitle}>{t('report.sentTitle', 'Signalement envoyé')}</Text>
        <Text style={styles.doneDesc}>{t('report.sentDesc', 'Notre équipe examinera votre signalement dans les meilleurs délais. Merci de contribuer à la sécurité d\'Adma.')}</Text>
        <Button title={t('common.close', 'Fermer')} onPress={() => router.back()} style={{ marginTop: 24, minWidth: 160 }} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('provider.report', 'Signaler')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>{t('report.whySubtitle', 'Pourquoi signalez-vous cette fiche ?')}</Text>

        <View style={styles.reasons}>
          {REASONS.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.reasonBtn, reason === r.id && styles.reasonBtnActive]}
              onPress={() => setReason(r.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.reasonLabel, reason === r.id && styles.reasonLabelActive]}>{r.label}</Text>
              {reason === r.id && <Check size={16} color={colors.primary} strokeWidth={3} />}
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label={t('report.detailsLabel', 'Détails supplémentaires (optionnel)')}
          value={detail}
          onChangeText={setDetail}
          placeholder={t('report.detailsPlaceholder', 'Décrivez le problème constaté...')}
          multiline
          numberOfLines={3}
          maxLength={500}
          showCharCount
        />

        <Button
          title={loading ? t('report.sending', 'Envoi en cours...') : t('report.submitBtn', 'Envoyer le signalement')}
          onPress={submit}
          loading={loading}
          disabled={!reason}
          size="lg"
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:           { flex: 1, backgroundColor: colors.background },
  header:         { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  backBtn:        { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  title:          { fontSize: 20, fontWeight: '800', color: colors.navy },
  body:           { padding: 20, paddingBottom: 60 },
  subtitle:       { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 16 },
  reasons:        { gap: 8, marginBottom: 24 },
  reasonBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border },
  reasonBtnActive:{ borderColor: colors.primary, backgroundColor: colors.primaryBg },
  reasonLabel:    { fontSize: 15, color: colors.text },
  reasonLabelActive: { color: colors.primary, fontWeight: '600' },
  doneWrap:       { flex: 1, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', padding: 40 },
  doneIcon:       { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.successBg, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  doneTitle:      { fontSize: 22, fontWeight: '800', color: colors.navy, marginBottom: 10 },
  doneDesc:       { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
