import { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Check, ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { useNotificationStore } from '../../store/notification.store';
import { EmptyState } from '../../components/ui/EmptyState';

function NotifItem({ notif, onRead }) {
  const { i18n } = useTranslation();
  const lang  = i18n.language || 'fr';
  const title = notif[`title_${lang}`] || notif.title_fr || notif.title || '';
  const body  = notif[`body_${lang}`]  || notif.body_fr  || notif.body  || '';
  return (
    <TouchableOpacity
      style={[styles.item, !notif.is_read && styles.itemUnread]}
      onPress={() => onRead(notif.id)}
      activeOpacity={0.75}
    >
      <View style={[styles.dot, notif.is_read && styles.dotRead]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemBody}>{body}</Text>
        <Text style={styles.itemDate}>
          {new Date(notif.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { t }       = useTranslation();
  const insets      = useSafeAreaInsets();
  const router      = useRouter();
  const { notifications, loading, load, markRead, markAllRead } = useNotificationStore();

  useEffect(() => {
    async function init() {
      await load();
      // Marquer automatiquement comme lu dès l'accès à l'écran
      await markAllRead();
    }
    init();
  }, []);

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={22} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('notifications.title', 'Notifications')}</Text>
        {notifications.some((n) => !n.is_read) ? (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead} activeOpacity={0.7}>
            <Check size={14} color={colors.primary} />
            <Text style={styles.markAllText}>{t('notifications.markAllRead', 'Tout lire')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id.toString()}
        renderItem={({ item }) => <NotifItem notif={item} onRead={markRead} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon={Bell}
              title={t('notifications.empty', 'Aucune notification')}
              message={t(
                'notifications.emptyMessage',
                'Vous serez notifié des nouveaux avis, vérifications et rappels d\'abonnement.'
              )}
            />
          ) : null
        }
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
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
  title: { fontSize: 20, fontWeight: '800', color: colors.navy },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  markAllText: { fontSize: 12, color: colors.primaryDark, fontWeight: '700' },
  item: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemUnread: { backgroundColor: colors.primaryBg + '40' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  dotRead: { backgroundColor: colors.border },
  itemTitle: { fontSize: 14, fontWeight: '700', color: colors.navy, marginBottom: 4 },
  itemBody: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 6 },
  itemDate: { fontSize: 11, color: colors.textMuted },
});
