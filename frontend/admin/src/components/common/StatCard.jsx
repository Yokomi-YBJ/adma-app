export function StatCard({ label, value, sub, icon: Icon, color = '#5FC2BA', trend }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: '20px 22px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(11, 22, 44, 0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 14,
          background: `${color}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={26} color={color} strokeWidth={2.2} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: '#0B162C',
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value ?? '—'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B', marginTop: 2 }}>{label}</div>
        {sub && (
          <div style={{ fontSize: 12, color: trend ? (trend > 0 ? '#10B981' : '#EF4444') : '#94A3B8', marginTop: 3, fontWeight: 500 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
