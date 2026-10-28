/**
 * ADMA — Façade de compatibilité pour les modals
 * Redirige de manière transparente vers useModalStore et AdmaModal.
 */
import React from 'react';
import { useModalStore } from '../../store/modal.store';
import { AdmaModal } from './AdmaModal';

/**
 * Composant Provider monté à la racine dans app/_layout.js
 */
export function AppModalProvider() {
  return <AdmaModal />;
}

/**
 * Affiche un modal via le store centralisé
 */
export function showAppModal({
  title = '',
  message = '',
  confirmText = null,
  cancelText = null,
  onConfirm = null,
  onCancel = null,
  variant = 'info', // 'info' | 'warning' | 'danger' | 'success' | 'network' | 'session' | 'permission' | 'payment'
  destructive = false,
  dismissible = true,
}) {
  // Mapping des anciens variants
  const typeMapping = {
    danger: 'error',
    warning: 'warning',
    success: 'success',
    info: 'info',
    network: 'network',
    session: 'session',
    permission: 'permission',
    payment: 'payment',
  };

  const type = typeMapping[variant] || 'info';

  useModalStore.getState().show({
    type,
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
    destructive: destructive || variant === 'danger',
    dismissible,
  });
}

/**
 * Affiche un modal de confirmation à 2 boutons
 */
export function showConfirm({
  title = '',
  message = '',
  confirmText = 'OK',
  cancelText = 'Annuler',
  onConfirm = null,
  onCancel = null,
  destructive = false,
  variant = 'warning',
  dismissible = true,
}) {
  showAppModal({
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
    destructive,
    variant,
    dismissible,
  });
}

export default AppModalProvider;
