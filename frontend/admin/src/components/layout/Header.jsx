import { Menu, LogOut, ShieldCheck, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function Header({ onToggleSidebar }) {
  const { admin, logout } = useAuth();

  return (
    <header
      style={{
        height: 64,
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={onToggleSidebar}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: '#F1F5F9',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#0B162C',
          }}
          title="Afficher/Masquer le menu"
        >
          <Menu size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0B162C' }}>Espace d'Administration</span>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>•</span>
          <span style={{ fontSize: 12, color: '#64748B' }}>Adma Cameroun</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Status indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 999,
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#10B981',
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#065F46' }}>API Active</span>
        </div>

        {/* Profile Link */}
        <Link
          to="/profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            color: '#0B162C',
            padding: '6px 12px',
            borderRadius: 10,
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
          }}
        >
          <User size={15} color="#5FC2BA" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{admin?.fullName || 'Mon Profil'}</span>
        </Link>
      </div>
    </header>
  );
}
