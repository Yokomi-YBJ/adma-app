export function Badge({ label, variant = 'default', color, size = 'sm' }) {
  const styles = {
    default: { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' },
    primary: { bg: '#EBF7F7', color: '#0D9488', border: '#9FDEDA' },
    success: { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
    warning: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
    danger:  { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
    info:    { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
    navy:    { bg: '#0B162C', color: '#FFFFFF', border: '#1C2942' },
    purple:  { bg: '#FAF5FF', color: '#9333EA', border: '#E9D5FF' },
  };

  const current = styles[variant] || styles.default;
  const padding = size === 'xs' ? '2px 6px' : size === 'md' ? '6px 12px' : '4px 10px';
  const fontSize = size === 'xs' ? 10 : size === 'md' ? 13 : 11;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding,
        borderRadius: 999,
        background: color ? `${color}18` : current.bg,
        color: color || current.color,
        border: `1px solid ${color ? `${color}30` : current.border}`,
        fontSize,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
