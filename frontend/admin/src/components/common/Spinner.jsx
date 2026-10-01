export function Spinner({ size = 32, color = '#5FC2BA', center = true, text }) {
  const spin = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: center ? 48 : 0,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: `3px solid ${color}30`,
          borderTopColor: color,
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {text && <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>{text}</div>}
    </div>
  );

  return spin;
}
