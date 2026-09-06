import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AlertCircle, CheckCircle2, TriangleAlert, X } from 'lucide-react-native';
import { colors } from '../../constants/colors';

let setModalStateRef = null;

function getToneStyle(variant) {
  switch (variant) {
    case 'success':
      return {
        icon: CheckCircle2,
        iconColor: colors.success,
        iconBg: colors.successBg,
      };
    case 'warning':
      return {
        icon: TriangleAlert,
        iconColor: colors.warning,
        iconBg: colors.warningBg,
      };
    case 'danger':
      return {
        icon: X,
        iconColor: colors.danger,
        iconBg: colors.dangerBg,
      };
    default:
      return {
        icon: AlertCircle,
        iconColor: colors.info,
        iconBg: colors.infoBg,
      };
  }
}

export function AppModalProvider() {
  const [modal, setModal] = useState(null);

  useEffect(() => {
    setModalStateRef = setModal;
    return () => {
      setModalStateRef = null;
    };
  }, []);

  if (!modal) return null;

  const { title, message, confirmText, cancelText, onConfirm, onCancel, variant, destructive } = modal;
  const tone = getToneStyle(variant);
  const Icon = tone.icon;

  function close() {
    if (onCancel) onCancel();
    setModal(null);
  }

  function confirm() {
    if (onConfirm) onConfirm();
    setModal(null);
  }

  return (
    <Modal transparent animationType="fade" visible={!!modal} onRequestClose={close}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close} />
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: tone.iconBg }]}>
            <Icon size={22} color={tone.iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            {cancelText ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={close} activeOpacity={0.8}>
                <Text style={styles.secondaryText}>{cancelText}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryBtn, destructive && styles.primaryDanger]}
              onPress={confirm}
              activeOpacity={0.8}
            >
              <Text style={[styles.primaryText, destructive && styles.primaryDangerText]}>{confirmText || 'OK'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function showAppModal({
  title = 'Information',
  message = '',
  confirmText = 'OK',
  cancelText = null,
  onConfirm = null,
  onCancel = null,
  variant = 'info',
  destructive = false,
}) {
  if (!setModalStateRef) {
    if (onConfirm) onConfirm();
    return;
  }

  setModalStateRef({
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
    variant,
    destructive,
  });
}

export function showConfirm({ title, message, confirmText, cancelText = 'Annuler', onConfirm, destructive = false, variant = 'warning' }) {
  showAppModal({
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    destructive,
    variant,
  });
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlay,
    paddingHorizontal: 24,
  },
  backdrop: {
    position: 'absolute',
    inset: 0,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
  },
  message: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center', // ← Changement clé : centrer les boutons
    gap: 10,
    marginTop: 22,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryDanger: {
    backgroundColor: colors.danger,
  },
  primaryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryDangerText: {
    color: colors.white,
  },
});