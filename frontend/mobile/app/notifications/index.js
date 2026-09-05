import { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Check } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useNotificationStore } from '../../store/notification.store';
import { EmptyState } from '../../components/ui/EmptyState';
import { useRouter } from 'expo-router';

function NotifItem({ notif, onRead }) {
  const lang  = 'fr';
  const title = notif[`title_${lang}`] || notif.title_fr || '';
  const body  = notif[`body_${lang}`]  || notif.body_fr  || '';
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
        <Text style={styles.itemDate}>{new Date(notif.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const insets      = useSafeAreaInsets();
  const router      = useRouter();
  const { notifications, loading, load, markRead, markAllRead } = useNotificationStore();

  useEffect(() => { load(); }, []);

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {notifications.some(n => !n.is_read) && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <Check size={14} color={colors.primary} />
            <Text style={styles.markAllText}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id.toString()}
        renderItem={({ item }) => <NotifItem notif={item} onRead={markRead} />}
        ListEmptyComponent={
          !loading ? <EmptyState icon={Bell} title="Aucune notification" message="Vous serez notifie des nouveaux avis, verifications et rappels d'abonnement." /> : null
        }
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex:         { flex: 1, backgroundColor: colors.background },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  title:        { fontSize: 24, fontWeight: '800', color: colors.navy },
  markAllBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  markAllText:  { fontSize: 13, color: colors.primary, fontWeight: '600' },
  item:         { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  itemUnread:   { backgroundColor: colors.primaryBg },
  dot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  dotRead:      { backgroundColor: colors.border },
  itemTitle:    { fontSize: 14, fontWeight: '700', color: colors.navy, marginBottom: 4 },
  itemBody:     { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 6 },
  itemDate:     { fontSize: 11, color: colors.textMuted },
});
