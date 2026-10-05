import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
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
  const { t }  = useTranslation();

  const [prefs, setPrefs]     = useState(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

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
          title: t('common.error'),
          message: error?.response?.data?.message || t('common.error'),
          confirmText: t('common.ok'),
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
        title: t('notificationPrefs.savedSuccess'),
        message: t('notificationPrefs.subtitle'),
        confirmText: t('common.ok'),
        variant: 'success',
      });
    } catch (error) {
      showAppModal({
        title: t('common.error'),
        message: error?.response?.data?.message || t('common.saveError'),
        confirmText: t('common.ok'),
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
    { key: 'new_review',            label: t('notificationPrefs.new_review.title'),            description: t('notificationPrefs.new_review.desc') },
    { key: 'review_response',       label: t('notificationPrefs.review_response.title'),       description: t('notificationPrefs.review_response.desc') },
    { key: 'verification_update',   label: t('notificationPrefs.verification_update.title'),   description: t('notificationPrefs.verification_update.desc') },
    { key: 'subscription_reminder', label: t('notificationPrefs.subscription_reminder.title'), description: t('notificationPrefs.subscription_reminder.desc') },
    { key: 'favorite_update',       label: t('notificationPrefs.favorite_update.title'),       description: t('notificationPrefs.favorite_update.desc') },
    { key: 'contact_reminder',      label: t('notificationPrefs.contact_reminder.title'),      description: t('notificationPrefs.contact_reminder.desc') },
  ];

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('notificationPrefs.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <View style={styles.iconWrap}>
            <Bell size={18} color={colors.primary} />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>{t('notificationPrefs.centerTitle')}</Text>
            <Text style={styles.summarySubtitle}>{t('notificationPrefs.centerSubtitle')}</Text>
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
          title={t('notificationPrefs.saveBtn')}
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
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.navy },
  content: { padding: 16, paddingBottom: 40 },
  summary: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: 18,
    borderWidth: 1, borderColor: colors.borderLight,
    padding: 16, marginBottom: 18,
  },
  iconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  summaryText: { flex: 1 },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: colors.navy },
  summarySubtitle: { marginTop: 4, fontSize: 12, color: colors.textMuted },
  card: {
    backgroundColor: colors.white, borderRadius: 18,
    borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  textWrap: { flex: 1, marginRight: 12 },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  description: { marginTop: 4, fontSize: 12, lineHeight: 18, color: colors.textMuted },
});