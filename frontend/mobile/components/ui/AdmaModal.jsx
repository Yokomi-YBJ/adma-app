import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Keyboard,
  BackHandler,
  Linking,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  AlertCircle,
  TriangleAlert,
  CheckCircle2,
  WifiOff,
  Lock,
  Settings,
  CreditCard,
  Info,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../store/modal.store';
import { colors } from '../../constants/colors';

const VARIANTS = {
  error: {
    icon: AlertCircle,
    color: colors.danger,
    bg: colors.dangerBg,
  },
  warning: {
    icon: TriangleAlert,
    color: colors.warning,
    bg: colors.warningBg,
  },
  success: {
    icon: CheckCircle2,
    color: colors.success,
    bg: colors.successBg,
  },
  info: {
    icon: Info,
    color: colors.info,
    bg: colors.infoBg,
  },
  network: {
    icon: WifiOff,
    color: colors.warning,
    bg: colors.warningBg,
  },
  session: {
    icon: Lock,
    color: colors.navy,
    bg: colors.surface,
  },
  permission: {
    icon: Settings,
    color: colors.primaryDark,
    bg: colors.primaryBg,
  },
  payment: {
    icon: CreditCard,
    color: colors.navy,
    bg: colors.surface,
  },
};

export function AdmaModal() {
  const { t } = useTranslation();
  const modal = useModalStore((s) => s.currentModal);
  const confirm = useModalStore((s) => s.confirm);
  const dismiss = useModalStore((s) => s.dismiss);

  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);

  // Tous les hooks sont appelés inconditionnellement au sommet
  useEffect(() => {
    if (modal) {
      Keyboard.dismiss();
      scale.value = withSpring(1, { damping: 18, stiffness: 240 });
      opacity.value = withSpring(1, { damping: 20 });
    } else {
      scale.value = 0.92;
      opacity.value = 0;
    }
  }, [modal]);

  useEffect(() => {
    const handleBack = () => {
      if (modal) {
        if (modal.dismissible) {
          dismiss();
        }
        return true; // Empêcher la fermeture de l'app si modal présent
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [modal, dismiss]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!modal) return null;

  const variantKey = modal.type || 'error';
  const config = VARIANTS[variantKey] || VARIANTS.error;
  const Icon = config.icon;

  // Déterminer les textes par défaut selon le type
  let defaultConfirmText = t('common.ok', 'OK');
  if (variantKey === 'network') {
    defaultConfirmText = t('common.retry', 'Réessayer');
  } else if (variantKey === 'session') {
    defaultConfirmText = t('common.reconnect', 'Se reconnecter');
  } else if (variantKey === 'permission') {
    defaultConfirmText = t('common.openSettings', 'Ouvrir les paramètres');
  }

  const confirmLabel = modal.confirmText || defaultConfirmText;
  const cancelLabel = modal.cancelText;

  const handleConfirmPress = () => {
    if (variantKey === 'permission' && !modal.onConfirm) {
      Linking.openSettings().catch(() => {});
      confirm();
    } else {
      confirm();
    }
  };

  return (
    <Modal
      transparent
      visible={true}
      animationType="fade"
      accessibilityViewIsModal={true}
      accessibilityRole="alertdialog"
      onRequestClose={modal.dismissible ? dismiss : undefined}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={modal.dismissible ? dismiss : undefined}
          accessible={false}
        />

        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          <View style={[styles.iconWrap, { backgroundColor: config.bg }]}>
            <Icon size={28} color={config.color} strokeWidth={2.2} />
          </View>

          {modal.title ? (
            <Text style={styles.title} numberOfLines={2}>
              {modal.title}
            </Text>
          ) : null}

          {modal.message ? (
            <Text style={styles.message}>
              {modal.message}
            </Text>
          ) : null}

          <View style={styles.actions}>
            {cancelLabel ? (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={dismiss}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
              >
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                modal.destructive && styles.confirmBtnDanger,
                !cancelLabel && styles.confirmBtnFull,
              ]}
              onPress={handleConfirmPress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 22, 44, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 1.4,
    minHeight: 46,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnFull: {
    flex: 1,
  },
  confirmBtnDanger: {
    backgroundColor: colors.danger,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
});
