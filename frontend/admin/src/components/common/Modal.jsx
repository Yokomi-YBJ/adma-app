import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, maxWidth = 560, zIndex = 9999 }) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }

    // Empêche le scroll du body quand une modal est ouverte
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex,
        background: 'rgba(11, 22, 44, 0.55)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '40px 16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-in"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth,
          margin: 'auto',
          background: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 20px 40px rgba(11, 22, 44, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 80px)',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0B162C', margin: 0, paddingRight: 12 }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: 24,
            overflowY: 'auto',
            flex: 1,
            boxSizing: 'border-box',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}