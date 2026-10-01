import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmation',
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'danger',
  loading = false,
}) {
  const isDanger = variant === 'danger';
  const confirmBg = isDanger ? '#EF4444' : '#5FC2BA';
  const iconColor = isDanger ? '#EF4444' : '#F59E0B';
  const iconBg = isDanger ? '#FEF2F2' : '#FFFBEB';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth={440}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={22} color={iconColor} />
        </div>
        <div style={{ flex: 1, fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
          {message}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          marginTop: 28,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          style={{
            padding: '10px 18px',
            borderRadius: 10,
            background: '#F1F5F9',
            border: '1px solid #E2E8F0',
            color: '#475569',
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {cancelText}
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          style={{
            padding: '10px 18px',
            borderRadius: 10,
            background: confirmBg,
            border: 'none',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Traitement...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}
