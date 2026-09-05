import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { useNotificationStore } from '../../store/notification.store';

// Utilisation des équivalents Ionicons pour tes anciennes icônes (home, search, heart, person)
function TabIcon({ name, color, size, badge, focused }) {
  const iconName = focused ? name : `${name}-outline`;
  
  return (
    <View style={styles.iconContainer}>
      <Ionicons name={iconName} size={24} color={color} />
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

  // Sécurité pour éviter que la barre soit collée sur certains Android
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 12;
  const tabHeight = 65 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 10,
          elevation: 12,
          shadowColor: colors.navy,
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle:             { backgroundColor: colors.white },
        headerTitleStyle:        { color: colors.navy, fontWeight: '700', fontSize: 18 },
        headerShadowVisible:     false,
        
        tabBarLabel: ({ focused, color, children }) => (
          <View style={styles.labelContainer}>
            <Text 
              style={[
                styles.tabBarText, 
                { 
                  color, 
                  fontWeight: focused ? '800' : '500' // Gras au clic
                }
              ]}
            >
              {children}
            </Text>
            {/* Petit indicateur en bas de l'onglet actif */}
            <View style={[
              styles.activeIndicator, 
              { backgroundColor: focused ? color : 'transparent' }
            ]} />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home') || 'Accueil',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => <TabIcon name="home" color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabs.search') || 'Rechercher',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => <TabIcon name="search" color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tabs.favorites') || 'Favoris',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => <TabIcon name="heart" color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile') || 'Profil',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => <TabIcon name="person" color={color} size={size} badge={unread} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute', 
    top: -4, 
    right: -10,
    minWidth: 16, 
    height: 16, 
    borderRadius: 8,
    backgroundColor: colors.danger,
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, 
    borderColor: colors.white,
  },
  badgeText: { 
    fontSize: 9, 
    fontWeight: '800', 
    color: colors.white 
  },
  labelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    position: 'relative',
  },
  tabBarText: {
    fontSize: 11,
    marginBottom: 2,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 16,
    height: 3,
    borderRadius: 2,
  },
});