import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ShieldCheck,
  MessageSquare,
  Flag,
  CreditCard,
  Layers,
  CircleDollarSign,
  History,
  User,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const NAV_ITEMS = [
  { path: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/users', label: 'Utilisateurs', icon: Users },
  { path: '/providers', label: 'Prestataires', icon: Briefcase },
  { path: '/verifications', label: 'Vérifications', icon: ShieldCheck },
  { path: '/reviews', label: 'Avis', icon: MessageSquare },
  { path: '/reports', label: 'Signalements', icon: Flag },
  { path: '/subscriptions', label: 'Abonnements', icon: CreditCard },
  { path: '/payments', label: 'Paiements', icon: CircleDollarSign },
  { path: '/categories', label: 'Catégories', icon: Layers },
  { path: '/logs', label: 'Journal d’audit', icon: History },
  { path: '/profile', label: 'Mon Profil', icon: User },
];

export function Sidebar({ isOpen, onClose }) {
  const { pathname } = useLocation();
  const { admin, logout } = useAuth();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 22, 44, 0.5)',
            zIndex: 40,
            backdropFilter: 'blur(2px)',
          }}
          className="fade-in"
        />
      )}

      {/* Sidebar container */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 260,
          background: '#0B162C',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
        }}
      >
        {/* Logo / Header */}
        <div
          style={{
            padding: '20px 20px 18px',
            borderBottom: '1px solid #1C2942',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: '#5FC2BA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(95, 194, 186, 0.3)',
              }}
            >
              <span style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF' }}>A</span>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#FFFFFF', letterSpacing: 2 }}>
                ADMA
              </div>
              <div style={{ fontSize: 11, color: '#5FC2BA', fontWeight: 600 }}>Administration</div>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation list */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/'
                ? pathname === '/'
                : pathname === item.path || pathname.startsWith(item.path + '/');

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 14px',
                  borderRadius: 12,
                  marginBottom: 4,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  background: isActive ? '#5FC2BA' : 'transparent',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin profile footer */}
        <div style={{ padding: 14, borderTop: '1px solid #1C2942' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 12,
              background: '#1C2942',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: '#5FC2BA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                color: '#FFFFFF',
                fontSize: 14,
              }}
            >
              {admin?.fullName?.charAt(0) || 'A'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {admin?.fullName || 'Admin'}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: '#94A3B8',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {admin?.email}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px',
              borderRadius: 10,
              background: 'transparent',
              border: '1px solid #334155',
              color: '#EF4444',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              transition: 'background 0.15s',
            }}
          >
            <LogOut size={15} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}
