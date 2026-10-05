import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, Bell, Database, Mail, RefreshCw, Server, Users } from 'lucide-react';
import api from '../services/api';
import { Badge } from '../components/common/Badge';
import { Spinner } from '../components/common/Spinner';
import { useToast } from '../context/ToastContext';

const STATUS_LABELS = {
  healthy: 'Opérationnel',
  degraded: 'Dégradé',
  critical: 'Critique',
};

const STATUS_COLORS = {
  healthy: { background: '#ECFDF5', border: '#A7F3D0', color: '#047857' },
  degraded: { background: '#FFFBEB', border: '#FDE68A', color: '#B45309' },
  critical: { background: '#FEF2F2', border: '#FECACA', color: '#B91C1C' },
};

function formatUptime(seconds = 0) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [days && `${days} j`, hours && `${hours} h`, `${minutes} min`].filter(Boolean).join(' ');
}

function MetricCard({ title, icon: Icon, children }) {
  return (
    <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, color: 'var(--navy)' }}>
        <Icon size={17} />
        <h2 style={{ fontSize: 14, margin: 0 }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', fontSize: 13 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <strong style={{ color: 'var(--navy)', textAlign: 'right' }}>{value}</strong>
    </div>
  );
}

export function MonitoringPage() {
  const { showToast } = useToast();
  const [health, setHealth] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);

  const loadHealth = useCallback(async () => {
    try {
      const response = await api.get('/monitoring/health');
      setHealth(response.data.data);
    } catch {
      showToast('Impossible de charger l’état du système', 'error');
    }
  }, [showToast]);

  const loadErrors = useCallback(async () => {
    try {
      const response = await api.get('/monitoring/errors?limit=20');
      setErrors(response.data.data.errors || []);
    } catch {
      showToast('Impossible de charger les erreurs récentes', 'error');
    }
  }, [showToast]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadHealth(), loadErrors()]);
    setRefreshing(false);
    setLoading(false);
  }, [loadErrors, loadHealth]);

  useEffect(() => {
    refreshAll();
    const intervalId = setInterval(loadHealth, 30_000);
    return () => clearInterval(intervalId);
  }, [loadHealth, refreshAll]);

  async function handleTestAlert() {
    setTestingAlert(true);
    try {
      const response = await api.post('/monitoring/test-alert');
      showToast(response.data.message || 'Alerte de test envoyée', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Échec de l’envoi de l’alerte', 'error');
    } finally {
      setTestingAlert(false);
    }
  }

  if (loading) return <Spinner size={36} text="Chargement du monitoring..." />;

  const checks = health?.checks || {};
  const status = health?.status || 'critical';
  const statusStyle = STATUS_COLORS[status] || STATUS_COLORS.critical;
  const cardStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 22 };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--navy)', margin: 0 }}>Monitoring système</h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Actualisé {health?.checkedAt ? new Date(health.checkedAt).toLocaleTimeString('fr-FR') : '—'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={refreshAll} disabled={refreshing} style={buttonStyle}>
            <RefreshCw size={15} /> {refreshing ? 'Actualisation...' : 'Actualiser'}
          </button>
          <button onClick={handleTestAlert} disabled={testingAlert} style={{ ...buttonStyle, background: 'var(--primary)', color: '#FFFFFF', borderColor: 'var(--primary)' }}>
            <Mail size={15} /> {testingAlert ? 'Envoi...' : 'Tester alerte email'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', marginBottom: 18, border: `1px solid ${statusStyle.border}`, borderRadius: 10, background: statusStyle.background, color: statusStyle.color }}>
        {status === 'healthy' ? <Activity size={20} /> : <AlertTriangle size={20} />}
        <strong style={{ fontSize: 15 }}>État global : {STATUS_LABELS[status] || 'Inconnu'}</strong>
      </div>

      <div style={cardStyle}>
        <MetricCard title="Base de données" icon={Database}>
          <Metric label="État" value={<Badge label={checks.database?.status || 'inconnu'} variant={checks.database?.status === 'ok' ? 'success' : checks.database?.status === 'slow' ? 'warning' : 'danger'} size="xs" />} />
          <Metric label="Latence" value={checks.database?.latencyMs != null ? `${checks.database.latencyMs} ms` : '—'} />
        </MetricCard>
        <MetricCard title="Erreurs serveur" icon={AlertTriangle}>
          <Metric label="Dernière heure" value={checks.recentErrors?.lastHour ?? '—'} />
          <Metric label="Dernières 24 h" value={checks.recentErrors?.last24Hours ?? '—'} />
        </MetricCard>
        <MetricCard title="Push tokens" icon={Bell}>
          <Metric label="Couverture" value={`${checks.pushTokens?.coveragePercent ?? 0} %`} />
          <Metric label="Avec token / actifs" value={`${checks.pushTokens?.withToken ?? 0} / ${checks.pushTokens?.activeUsers ?? 0}`} />
        </MetricCard>
        <MetricCard title="Jobs planifiés" icon={RefreshCw}>
          <Metric label="Broadcasts en retard" value={checks.scheduler?.delayedBroadcasts ?? '—'} />
          <Metric label="OTP inutilisés > 7 jours" value={checks.scheduler?.staleOtps ?? '—'} />
        </MetricCard>
        <MetricCard title="Process Node.js" icon={Server}>
          <Metric label="Mémoire RSS" value={`${checks.system?.rssMb ?? '—'} MB`} />
          <Metric label="Heap utilisé" value={`${checks.system?.heapUsedMb ?? '—'} MB`} />
          <Metric label="Uptime" value={formatUptime(checks.system?.uptimeSeconds)} />
          <Metric label="Charge CPU (1 min)" value={checks.system?.cpu?.loadAverage?.[0]?.toFixed(2) ?? '—'} />
        </MetricCard>
        <MetricCard title="Tâches en attente" icon={Users}>
          <Metric label="Vérifications" value={checks.pendingItems?.verifications ?? '—'} />
          <Metric label="Signalements" value={checks.pendingItems?.reports ?? '—'} />
          <Metric label="Total" value={checks.pendingItems?.total ?? '—'} />
        </MetricCard>
      </div>

      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: 15, color: 'var(--navy)' }}>Erreurs récentes</h2>
        </div>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 680 }}>
            <thead>
              <tr style={{ background: 'var(--surface-alt)' }}>
                {['Date', 'Route', 'Code', 'Message'].map((heading) => (
                  <th key={heading} style={tableHeaderStyle}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {errors.length ? errors.map((error) => (
                <tr key={error.id} style={{ borderTop: '1px solid var(--border-light)' }}>
                  <td style={tableCellStyle}>{error.created_at ? new Date(error.created_at).toLocaleString('fr-FR') : '—'}</td>
                  <td style={tableCellStyle}>{error.route || '—'}</td>
                  <td style={tableCellStyle}>{error.code || '—'}</td>
                  <td style={{ ...tableCellStyle, maxWidth: 420, overflowWrap: 'anywhere' }}>{error.message || '—'}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} style={{ ...tableCellStyle, textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>Aucune erreur récente</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const buttonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '9px 12px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--navy)',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const tableHeaderStyle = { padding: '12px 14px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' };
const tableCellStyle = { padding: '12px 14px', fontSize: 12, color: 'var(--text)', verticalAlign: 'top' };
