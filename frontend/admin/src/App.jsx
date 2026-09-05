import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Briefcase, MessageSquare,
  Flag, CreditCard, Shield, LogOut, Menu, X,
  Bell, ChevronRight, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react';
import api from './services/api.js';

// ── Couleurs ──────────────────────────────────────────────────────
const C = {
  primary:   '#5FC2BA', navy: '#0B162C', navyMid: '#1C2942',
  navyLight: '#3B556D', white: '#FFFFFF', bg: '#FAFBFC',
  surface:   '#F2F5F8', border: '#D4DCE6',
  text:      '#0B162C', textMuted: '#6B7B8F',
  success:   '#16A34A', warning: '#D97706', danger: '#DC2626',
  successBg: '#F0FDF4', warningBg: '#FFFBEB', dangerBg: '#FEF2F2',
};

// ── Auth Context ──────────────────────────────────────────────────
const AuthCtx = createContext(null);
function useAuth() { return useContext(AuthCtx); }

function AuthProvider({ children }) {
  const [admin, setAdmin]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('adma_admin_user')); } catch { return null; }
  });
  const [ready, setReady]   = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adma_admin_token');
    if (!token) { setReady(true); return; }
    api.get('/auth/me')
      .then(r => { setAdmin(r.data.data); setReady(true); })
      .catch(() => {
        localStorage.removeItem('adma_admin_token');
        localStorage.removeItem('adma_admin_user');
        setReady(true);
      });
  }, []);

  function login(token, adminData) {
    localStorage.setItem('adma_admin_token', token);
    localStorage.setItem('adma_admin_user', JSON.stringify(adminData));
    setAdmin(adminData);
  }

  function logout() {
    localStorage.removeItem('adma_admin_token');
    localStorage.removeItem('adma_admin_user');
    setAdmin(null);
  }

  if (!ready) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background: C.bg }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:`3px solid ${C.primary}`, borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  );

  return (
    <AuthCtx.Provider value={{ admin, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

// ── Login ─────────────────────────────────────────────────────────
function LoginPage() {
  const { login }     = useAuth();
  const navigate      = useNavigate();
  const [step, setStep]     = useState(1);
  const [email, setEmail]   = useState('');
  const [password, setPwd]  = useState('');
  const [adminId, setAdminId]= useState(null);
  const [code, setCode]     = useState('');
  const [loading, setLoading]= useState(false);
  const [error, setError]   = useState('');

  async function sendOTP(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      setAdminId(res.data.data.adminId);
      setStep(2);
    } catch (err) { setError(err.response?.data?.message || 'Identifiants invalides'); }
    setLoading(false);
  }

  async function verifyOTP(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { adminId, code });
      login(res.data.data.token, res.data.data.admin);
      navigate('/');
    } catch (err) { setError(err.response?.data?.message || 'Code incorrect'); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:'100vh', background: C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:64, height:64, borderRadius:20, background: C.primary, marginBottom:16, boxShadow:`0 8px 24px ${C.primary}40` }}>
            <span style={{ fontSize:32, fontWeight:900, color:'#fff' }}>A</span>
          </div>
          <div style={{ fontSize:24, fontWeight:900, color: C.navy, letterSpacing:4 }}>ADMA</div>
          <div style={{ fontSize:13, color: C.textMuted, marginTop:4 }}>Administration</div>
        </div>

        <div style={{ background: C.white, borderRadius:24, padding:32, border:`1px solid ${C.border}`, boxShadow:`0 4px 24px ${C.navy}08` }}>
          {step === 1 ? (
            <form onSubmit={sendOTP}>
              <h2 style={{ fontSize:22, fontWeight:800, color:C.navy, marginBottom:6 }}>Connexion</h2>
              <p style={{ fontSize:14, color:C.textMuted, marginBottom:28 }}>Entrez vos identifiants administrateur</p>
              {error && <div style={{ background:C.dangerBg, color:C.danger, padding:'10px 14px', borderRadius:10, fontSize:13, marginBottom:16 }}>{error}</div>}
              <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="admin@adma.cm" />
              <Field label="Mot de passe" type="password" value={password} onChange={setPwd} placeholder="••••••••" />
              <Btn type="submit" loading={loading}>Recevoir le code OTP</Btn>
            </form>
          ) : (
            <form onSubmit={verifyOTP}>
              <h2 style={{ fontSize:22, fontWeight:800, color:C.navy, marginBottom:6 }}>Verification</h2>
              <p style={{ fontSize:14, color:C.textMuted, marginBottom:28 }}>Code envoye a <strong>{email}</strong></p>
              {error && <div style={{ background:C.dangerBg, color:C.danger, padding:'10px 14px', borderRadius:10, fontSize:13, marginBottom:16 }}>{error}</div>}
              <Field label="Code OTP (6 chiffres)" type="text" value={code} onChange={setCode} placeholder="000000" maxLength={6} />
              <Btn type="submit" loading={loading}>Verifier</Btn>
              <button type="button" onClick={() => setStep(1)} style={{ width:'100%', marginTop:10, padding:12, background:'none', border:'none', color:C.textMuted, cursor:'pointer', fontSize:14 }}>
                Retour
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder, maxLength }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:C.text, marginBottom:6 }}>{label}</label>
      <input
        type={type} value={value} placeholder={placeholder} maxLength={maxLength} required
        onChange={e => onChange(e.target.value)}
        style={{ width:'100%', padding:'13px 14px', borderRadius:12, border:`1.5px solid ${C.border}`, fontSize:15, color:C.text, outline:'none', transition:'border-color 0.2s', background:C.white }}
        onFocus={e => e.target.style.borderColor = C.primary}
        onBlur={e => e.target.style.borderColor = C.border}
      />
    </div>
  );
}

function Btn({ children, loading, type = 'button', onClick, variant = 'primary', style: sx }) {
  const bg = variant === 'danger' ? C.danger : variant === 'secondary' ? C.white : C.primary;
  const color = variant === 'secondary' ? C.primary : C.white;
  const border = variant === 'secondary' ? `1.5px solid ${C.primary}` : 'none';
  return (
    <button type={type} onClick={onClick} disabled={loading} style={{ width:'100%', padding:'14px', borderRadius:12, background:bg, color, border, fontSize:15, fontWeight:700, cursor:loading ? 'not-allowed' : 'pointer', opacity:loading ? 0.7 : 1, transition:'opacity 0.2s', ...sx }}>
      {loading ? 'Chargement...' : children}
    </button>
  );
}

// ── Layout ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { path:'/',              label:'Tableau de bord',    Icon: LayoutDashboard },
  { path:'/users',         label:'Utilisateurs',       Icon: Users },
  { path:'/providers',     label:'Prestataires',       Icon: Briefcase },
  { path:'/verifications', label:'Verifications',      Icon: Shield },
  { path:'/reviews',       label:'Avis',               Icon: MessageSquare },
  { path:'/reports',       label:'Signalements',       Icon: Flag },
  { path:'/subscriptions', label:'Abonnements',        Icon: CreditCard },
];

function Sidebar({ open, onClose }) {
  const { admin, logout } = useAuth();
  const { pathname }      = useLocation();
  const navigate          = useNavigate();

  function handleLogout() { logout(); navigate('/login'); }

  return (
    <>
      {/* Overlay mobile */}
      {open && <div onClick={onClose} style={{ position:'fixed', inset:0, background: C.overlay, zIndex:40 }} />}

      <aside style={{
        position:'fixed', top:0, left:0, bottom:0, width:260,
        background: C.navy, display:'flex', flexDirection:'column',
        zIndex:50, transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition:'transform 0.25s ease',
      }}>
        {/* Logo */}
        <div style={{ padding:'24px 24px 20px', borderBottom:`1px solid ${C.navyMid}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:20, fontWeight:900, color:'#fff' }}>A</span>
            </div>
            <div>
              <div style={{ fontSize:18, fontWeight:900, color:C.white, letterSpacing:3 }}>ADMA</div>
              <div style={{ fontSize:11, color:C.primary, fontWeight:600 }}>Administration</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex:1, overflowY:'auto', padding:'16px 12px' }}>
          {NAV_ITEMS.map(({ path, label, Icon }) => {
            const active = pathname === path || (path !== '/' && pathname.startsWith(path));
            return (
              <Link key={path} to={path} onClick={onClose} style={{
                display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:12,
                marginBottom:4, textDecoration:'none', transition:'background 0.15s',
                background: active ? C.primary : 'transparent',
                color: active ? C.white : '#9AADBE',
              }}>
                <Icon size={18} strokeWidth={2} />
                <span style={{ fontSize:14, fontWeight: active ? 700 : 500 }}>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin info */}
        <div style={{ padding:16, borderTop:`1px solid ${C.navyMid}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, background: C.navyMid, marginBottom:8 }}>
            <div style={{ width:32, height:32, borderRadius:10, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:14, fontWeight:800, color:'#fff' }}>{admin?.fullName?.charAt(0) || 'A'}</span>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.white, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{admin?.fullName || 'Admin'}</div>
              <div style={{ fontSize:11, color:C.primary }}>{admin?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:12, background:'none', border:'none', color:'#9AADBE', cursor:'pointer', fontSize:13, fontWeight:500 }}>
            <LogOut size={16} /> Deconnexion
          </button>
        </div>
      </aside>
    </>
  );
}

function Layout({ children }) {
  const [sideOpen, setSideOpen] = useState(true);

  return (
    <>
      <Sidebar open={sideOpen} onClose={() => setSideOpen(false)} />
      <div style={{ marginLeft: sideOpen ? 260 : 0, transition:'margin-left 0.25s', minHeight:'100vh', display:'flex', flexDirection:'column' }}>
        {/* Topbar */}
        <header style={{ height:64, background:C.white, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', padding:'0 24px', gap:16, position:'sticky', top:0, zIndex:30 }}>
          <button onClick={() => setSideOpen(p => !p)} style={{ width:38, height:38, borderRadius:10, background:C.surface, border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            {sideOpen ? <X size={18} color={C.navy} /> : <Menu size={18} color={C.navy} />}
          </button>
          <div style={{ flex:1 }} />
          <div style={{ width:8, height:8, borderRadius:4, background:C.success }} title="API connectee" />
          <span style={{ fontSize:12, color:C.textMuted }}>API</span>
        </header>
        <main style={{ flex:1, padding:28, background:C.bg }}>
          {children}
        </main>
      </div>
    </>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = C.primary, Icon }) {
  return (
    <div style={{ background:C.white, borderRadius:16, padding:20, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:16 }}>
      <div style={{ width:52, height:52, borderRadius:14, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={24} color={color} />
      </div>
      <div>
        <div style={{ fontSize:28, fontWeight:900, color:C.navy }}>{value?.toLocaleString('fr-FR') ?? '—'}</div>
        <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{label}</div>
        {sub && <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  );
}

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';

function DashboardPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats/dashboard')
      .then(r => { setData(r.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data)   return <div style={{ color:C.danger }}>Erreur de chargement</div>;

  const revenueGrowth = data.revenuePrevMonth > 0
    ? Math.round((data.revenueThisMonth - data.revenuePrevMonth) / data.revenuePrevMonth * 100)
    : 0;

  const planColors = { free: C.textMuted, premium: C.primary, professional: C.navyMid, enterprise: C.navy };

  return (
    <div>
      <h1 style={{ fontSize:24, fontWeight:800, color:C.navy, marginBottom:24 }}>Tableau de bord</h1>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:16, marginBottom:28 }}>
        <StatCard label="Utilisateurs" value={data.users} Icon={Users} color={C.primary} />
        <StatCard label="Prestataires" value={data.providers} Icon={Briefcase} color={C.navyMid} />
        <StatCard label="Signalements en attente" value={data.pendingReports} Icon={Flag} color={data.pendingReports > 0 ? C.danger : C.success} />
        <StatCard label="Verifications en attente" value={data.pendingVerifications} Icon={Shield} color={data.pendingVerifications > 0 ? C.warning : C.success} />
        <StatCard label="Revenue ce mois" value={`${data.revenueThisMonth?.toLocaleString('fr-FR')} FCFA`} sub={revenueGrowth >= 0 ? `+${revenueGrowth}% vs mois dernier` : `${revenueGrowth}% vs mois dernier`} Icon={CreditCard} color={C.success} />
        <StatCard label="Avis publies" value={data.reviews} Icon={MessageSquare} color={C.navyLight} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20, marginBottom:20 }}>
        {/* Inscriptions 30 jours */}
        <div style={{ background:C.white, borderRadius:16, padding:20, border:`1px solid ${C.border}` }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.navy, marginBottom:16 }}>Nouvelles inscriptions (30 jours)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.dailyRegistrations}>
              <XAxis dataKey="date" tick={{ fontSize:11, fill:C.textMuted }} tickFormatter={d => new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} />
              <YAxis tick={{ fontSize:11, fill:C.textMuted }} />
              <Tooltip formatter={(v) => [v, 'Inscriptions']} labelFormatter={d => new Date(d).toLocaleDateString('fr-FR')} />
              <Line type="monotone" dataKey="count" stroke={C.primary} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition plans */}
        <div style={{ background:C.white, borderRadius:16, padding:20, border:`1px solid ${C.border}` }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.navy, marginBottom:16 }}>Plans actifs</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.planDistribution} dataKey="count" nameKey="plan" cx="50%" cy="50%" outerRadius={75} label={({ plan, percent }) => `${plan} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                {data.planDistribution?.map(p => <Cell key={p.plan} fill={planColors[p.plan] || C.primary} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Répartition villes */}
      <div style={{ background:C.white, borderRadius:16, padding:20, border:`1px solid ${C.border}` }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:C.navy, marginBottom:16 }}>Prestataires par ville</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data.cityDistribution} layout="vertical">
            <XAxis type="number" tick={{ fontSize:11, fill:C.textMuted }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize:12, fill:C.text }} width={140} />
            <Tooltip />
            <Bar dataKey="count" fill={C.primary} radius={[0,6,6,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Providers Admin ───────────────────────────────────────────────
function ProvidersPage() {
  const [providers, setProviders] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { load(); }, [q, page]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/providers?page=${page}&limit=30${q ? `&q=${q}` : ''}`);
      setProviders(res.data.data.providers || []);
      setTotal(res.data.data.pagination?.total || 0);
    } catch {}
    setLoading(false);
  }

  async function toggleActive(id, isActive) {
    await api.patch(`/providers/${id}/${isActive ? 'suspend' : 'activate'}`);
    load();
  }

  const STATUS_COLORS = { none:C.textMuted, pending:C.warning, verified_id:C.navyLight, verified:C.primary };
  const PLAN_COLORS   = { free:C.textMuted, premium:C.primary, professional:C.navyMid, enterprise:C.navy };

  return (
    <div>
      <PageHeader title="Prestataires" sub={`${total} total`} />
      <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.border}`, overflow:'hidden' }}>
        <div style={{ padding:16, borderBottom:`1px solid ${C.border}` }}>
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Rechercher par nom ou telephone..." style={inputStyle} />
        </div>
        {loading ? <Spinner /> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:C.surface }}>
                {['Nom','Specialite','Ville','Plan','Verification','Score','Statut','Actions'].map(h => (
                  <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:12, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {providers.map(p => (
                <tr key={p.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={td}><span style={{ fontWeight:600, color:C.navy }}>{p.name}</span><br/><span style={{ fontSize:11, color:C.textMuted }}>{p.phone}</span></td>
                  <td style={td}><span style={{ fontSize:13, color:C.textMuted }}>{p.specialty || '—'}</span></td>
                  <td style={td}>{p.city}</td>
                  <td style={td}><Badge label={p.plan} color={PLAN_COLORS[p.plan]} /></td>
                  <td style={td}><Badge label={p.verification_status} color={STATUS_COLORS[p.verification_status]} /></td>
                  <td style={td}><strong>{p.trust_score}%</strong> <span style={{ fontSize:11, color:C.textMuted }}>({p.review_count} avis)</span></td>
                  <td style={td}><Badge label={p.is_active ? 'Actif' : 'Suspendu'} color={p.is_active ? C.success : C.danger} /></td>
                  <td style={td}>
                    <button onClick={() => toggleActive(p.id, p.is_active)} style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${p.is_active ? C.danger : C.success}`, background:'none', color:p.is_active ? C.danger : C.success, cursor:'pointer', fontSize:12, fontWeight:600 }}>
                      {p.is_active ? 'Suspendre' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {/* Pagination */}
        <div style={{ padding:16, display:'flex', justifyContent:'center', gap:8 }}>
          {page > 1 && <PagBtn label="Precedent" onClick={() => setPage(p => p-1)} />}
          <span style={{ padding:'8px 16px', fontSize:13, color:C.textMuted }}>Page {page}</span>
          {providers.length === 30 && <PagBtn label="Suivant" onClick={() => setPage(p => p+1)} />}
        </div>
      </div>
    </div>
  );
}

// ── Verifications Admin ───────────────────────────────────────────
function VerificationsPage() {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/providers/verification-requests');
      setRequests(res.data.data || []);
    } catch {}
    setLoading(false);
  }

  async function approve(id, badgeType = 'verified_id') {
    await api.patch(`/providers/verification-requests/${id}/approve`, { badgeType });
    setSelected(null); load();
  }

  async function reject(id, reason) {
    await api.patch(`/providers/verification-requests/${id}/reject`, { reason });
    setSelected(null); load();
  }

  return (
    <div>
      <PageHeader title="Demandes de verification" sub={`${requests.length} en attente`} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {loading ? <Spinner /> : requests.map(r => (
          <div key={r.id} style={{ background:C.white, borderRadius:16, padding:20, border:`1.5px solid ${C.border}`, cursor:'pointer' }} onClick={() => setSelected(r)}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontWeight:700, color:C.navy }}>{r.provider_name}</span>
              <Badge label="En attente" color={C.warning} />
            </div>
            <div style={{ fontSize:13, color:C.textMuted, marginBottom:8 }}>Tel: {r.phone}</div>
            <div style={{ fontSize:12, color:C.textMuted }}>
              Demande le {new Date(r.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}
            </div>
            {r.cni_front_url && (
              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <img src={r.cni_front_url} alt="CNI recto" style={{ width:80, height:50, objectFit:'cover', borderRadius:8, border:`1px solid ${C.border}` }} />
                {r.cni_back_url && <img src={r.cni_back_url} alt="CNI verso" style={{ width:80, height:50, objectFit:'cover', borderRadius:8, border:`1px solid ${C.border}` }} />}
              </div>
            )}
            <div style={{ display:'flex', gap:8, marginTop:16 }}>
              <button onClick={e => { e.stopPropagation(); approve(r.id, 'verified_id'); }} style={{ flex:1, padding:'9px 0', borderRadius:10, background:C.primary, color:C.white, border:'none', fontWeight:700, cursor:'pointer', fontSize:13 }}>
                ID Verifie
              </button>
              <button onClick={e => { e.stopPropagation(); approve(r.id, 'verified'); }} style={{ flex:1, padding:'9px 0', borderRadius:10, background:C.navy, color:C.white, border:'none', fontWeight:700, cursor:'pointer', fontSize:13 }}>
                Verifie Complet
              </button>
              <button onClick={e => { e.stopPropagation(); reject(r.id, 'Documents insuffisants'); }} style={{ padding:'9px 14px', borderRadius:10, background:C.dangerBg, color:C.danger, border:`1px solid ${C.danger}30`, fontWeight:700, cursor:'pointer', fontSize:13 }}>
                Rejeter
              </button>
            </div>
          </div>
        ))}
        {!loading && requests.length === 0 && (
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:60, color:C.textMuted }}>
            <CheckCircle2 size={40} color={C.success} style={{ marginBottom:12 }} />
            <div style={{ fontWeight:700 }}>Aucune demande en attente</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reports Admin ─────────────────────────────────────────────────
function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/reports?status=pending');
      setReports(res.data.data.reports || []);
    } catch {}
    setLoading(false);
  }

  async function resolve(id) { await api.patch(`/reports/${id}/resolve`); load(); }
  async function dismiss(id) { await api.patch(`/reports/${id}/dismiss`); load(); }

  return (
    <div>
      <PageHeader title="Signalements" sub={`${reports.length} en attente`} />
      <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.border}`, overflow:'hidden' }}>
        {loading ? <Spinner /> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:C.surface }}>
                {['Type','Raison','Signale par','Date','Actions'].map(h => (
                  <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:12, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={td}><Badge label={r.target_type} color={C.navyLight} /></td>
                  <td style={td}><span style={{ fontSize:13, color:C.text }}>{r.reason}</span>{r.description && <div style={{ fontSize:12, color:C.textMuted, marginTop:3 }}>{r.description.slice(0, 80)}...</div>}</td>
                  <td style={td}>{r.reporter_phone}</td>
                  <td style={td}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                  <td style={td}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => resolve(r.id)} style={{ padding:'6px 10px', borderRadius:8, background:C.successBg, color:C.success, border:'none', cursor:'pointer', fontSize:12, fontWeight:600 }}>Resolu</button>
                      <button onClick={() => dismiss(r.id)} style={{ padding:'6px 10px', borderRadius:8, background:C.surface, color:C.textMuted, border:'none', cursor:'pointer', fontSize:12 }}>Ignorer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && reports.length === 0 && <div style={{ padding:48, textAlign:'center', color:C.textMuted }}>Aucun signalement en attente</div>}
      </div>
    </div>
  );
}

// ── Utils UI ──────────────────────────────────────────────────────
function PageHeader({ title, sub }) {
  return (
    <div style={{ marginBottom:24 }}>
      <h1 style={{ fontSize:24, fontWeight:800, color:C.navy }}>{title}</h1>
      {sub && <p style={{ fontSize:13, color:C.textMuted, marginTop:4 }}>{sub}</p>}
    </div>
  );
}

function Badge({ label, color }) {
  return (
    <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:20, background:color+'18', color, fontSize:11, fontWeight:700 }}>
      {label}
    </span>
  );
}

function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid ${C.primary}`, borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  );
}

function PagBtn({ label, onClick }) {
  return <button onClick={onClick} style={{ padding:'8px 16px', borderRadius:10, border:`1px solid ${C.border}`, background:C.white, color:C.text, cursor:'pointer', fontSize:13 }}>{label}</button>;
}

const td     = { padding:'14px 16px', fontSize:14, color:C.text, verticalAlign:'middle' };
const inputStyle = { width:'100%', maxWidth:400, padding:'10px 14px', borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, color:C.text, outline:'none', background:C.white };

// ── Placeholder pages ─────────────────────────────────────────────
function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => { load(); }, [q]);
  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/users${q ? `?q=${q}` : ''}`);
      setUsers(res.data.data || []);
    } catch { setUsers([]); }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader title="Utilisateurs" />
      <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.border}`, overflow:'hidden' }}>
        <div style={{ padding:16, borderBottom:`1px solid ${C.border}` }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher..." style={inputStyle} />
        </div>
        {loading ? <Spinner /> : (
          <div style={{ padding:16, color:C.textMuted, textAlign:'center' }}>
            {users.length === 0 ? 'Aucun utilisateur' : `${users.length} utilisateurs charges`}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewsPage()       { return <div><PageHeader title="Avis" /><ComingSoon /></div>; }
function SubscriptionsPage() { return <div><PageHeader title="Abonnements" /><ComingSoon /></div>; }
function ComingSoon()        { return <div style={{ background:C.white, borderRadius:16, padding:48, border:`1px solid ${C.border}`, textAlign:'center', color:C.textMuted }}>Page en cours de developpement</div>; }

// ── App ───────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { admin } = useAuth();
  return admin ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/"              element={<DashboardPage />} />
                  <Route path="/users"         element={<UsersPage />} />
                  <Route path="/providers"     element={<ProvidersPage />} />
                  <Route path="/verifications" element={<VerificationsPage />} />
                  <Route path="/reviews"       element={<ReviewsPage />} />
                  <Route path="/reports"       element={<ReportsPage />} />
                  <Route path="/subscriptions" element={<SubscriptionsPage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
