import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff, CheckCircle2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useNetworkStore } from '../../store/network.store';
import { colors } from '../../constants/colors';

export function NetworkBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isOnline = useNetworkStore((s) => s.isOnline);

  const [hasChanged, setHasChanged] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  const translateY = useSharedValue(-80);

  useEffect(() => {
    if (!hasChanged) {
      if (!isOnline) {
        setHasChanged(true);
      }
      return;
    }

    if (!isOnline) {
      setShowRestored(false);
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
    } else {
      setShowRestored(true);
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });

      const timer = setTimeout(() => {
        translateY.value = withTiming(-80, { duration: 300 });
        setShowRestored(false);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isOnline, hasChanged]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Ne rien afficher si toujours en ligne depuis le montage et jamais passé offline
  if (isOnline && !showRestored) return null;

  const isWarning = !isOnline;
  const bg = isWarning ? colors.warningBg : colors.successBg;
  const borderColor = isWarning ? colors.warning + '40' : colors.success + '40';
  const textColor = isWarning ? '#92400E' : colors.successDark;
  const Icon = isWarning ? WifiOff : CheckCircle2;
  const message = isWarning
    ? t('common.offlineNotice', 'Connexion internet interrompue. Données hors-ligne.')
    : t('common.backOnline', 'Connexion internet rétablie.');

  return (
    <View
      pointerEvents="none"
      style={[styles.container, { top: insets.top + 6 }]}
    >
      <Animated.View
        style={[
          styles.banner,
          { backgroundColor: bg, borderColor },
          animatedStyle,
        ]}
      >
        <Icon
          size={16}
          color={isWarning ? colors.warning : colors.success}
          strokeWidth={2.4}
        />
        <Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});

export default NetworkBanner;
