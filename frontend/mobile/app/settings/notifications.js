import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, ChevronLeft } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { showAppModal } from '../../components/ui/AppModal';

const defaultPrefs = {
  new_review: true,
  review_response: true,
  verification_update: true,
  subscription_reminder: true,
  favorite_update: true,
  contact_reminder: true,
};

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await api.get('/users/notification-preferences');
        const data = res.data?.data || {};
        const parsed = { ...defaultPrefs };
        Object.keys(defaultPrefs).forEach((k) => {
          if (data[k] !== undefined) parsed[k] = Boolean(data[k]);
        });
        if (mounted) setPrefs(parsed);
      } catch (error) {
        showAppModal({
          title: 'Erreur',
          message: error?.response?.data?.message || 'Impossible de charger les préférences.',
          confirmText: 'OK',
          variant: 'danger',
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/users/notification-preferences', prefs);
      showAppModal({
        title: 'Préférences enregistrées',
        message: 'Vos notifications ont bien été mises à jour.',
        confirmText: 'OK',
        variant: 'success',
      });
    } catch (error) {
      showAppModal({
        title: 'Erreur',
        message: error?.response?.data?.message || 'La mise à jour a échoué.',
        confirmText: 'OK',
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  }

  function toggle(key) {
    setPrefs((current) => ({ ...current, [key]: !current[key] }));
  }

  const items = [
    { key: 'new_review', label: 'Nouveaux avis', description: 'Recevoir une alerte lorsqu’un client laisse un avis.' },
    { key: 'review_response', label: 'Réponses aux avis', description: 'Recevoir une notification quand le prestataire répond.' },
    { key: 'verification_update', label: 'Mises à jour de vérification', description: 'Suivre le statut de votre demande de vérification.' },
    { key: 'subscription_reminder', label: 'Rappels d’abonnement', description: 'Recevoir des rappels avant l’expiration de votre plan.' },
    { key: 'favorite_update', label: 'Favoris', description: 'Être informé sur les activités liées à vos favoris.' },
    { key: 'contact_reminder', label: 'Rappels de contact', description: 'Recevoir des relances utiles pour rester actif.' },
  ];

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <View style={styles.iconWrap}>
            <Bell size={18} color={colors.primary} />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>Centre de notifications</Text>
            <Text style={styles.summarySubtitle}>Contrôlez les alertes qui vous intéressent.</Text>
          </View>
        </View>

        <View style={styles.card}>
          {items.map((item) => (
            <View key={item.key} style={styles.row}>
              <View style={styles.textWrap}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
              <Switch
                value={prefs[item.key]}
                onValueChange={() => toggle(item.key)}
                trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
                thumbColor={colors.white}
                disabled={loading}
              />
            </View>
          ))}
        </View>

        <Button
          title="Enregistrer les préférences"
          onPress={handleSave}
          loading={saving}
          size="lg"
          style={{ marginTop: 20 }}
        />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 16,
    marginBottom: 18,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  summarySubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  textWrap: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
