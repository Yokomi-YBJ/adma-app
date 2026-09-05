import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import { Home, Search, Heart, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { useNotificationStore } from '../../store/notification.store';

function TabIcon({ Icon, color, size, badge }) {
  return (
    <View style={{ position: 'relative' }}>
      <Icon size={size} color={color} strokeWidth={2.2} />
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { t }      = useTranslation();
  const insets     = useSafeAreaInsets();
  const unread     = useNotificationStore((s) => s.unreadCount);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
          elevation: 12,
          shadowColor: colors.navy,
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle:        { fontSize: 11, fontWeight: '600', marginTop: 2 },
        headerStyle:             { backgroundColor: colors.white },
        headerTitleStyle:        { color: colors.navy, fontWeight: '700', fontSize: 18 },
        headerShadowVisible:     false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <TabIcon Icon={Home} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabs.search'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <TabIcon Icon={Search} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tabs.favorites'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <TabIcon Icon={Heart} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <TabIcon Icon={User} color={color} size={size} badge={unread} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.danger,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: colors.white,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: colors.white },
});
