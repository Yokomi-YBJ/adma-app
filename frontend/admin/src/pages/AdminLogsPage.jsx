import { useState, useEffect } from 'react';
import { History, Shield, Clock, Search, Filter } from 'lucide-react';
import api from '../services/api';
import { Spinner } from '../components/common/Spinner';
import { Badge } from '../components/common/Badge';
import { Pagination } from '../components/common/Pagination';
import { useToast } from '../context/ToastContext';

export function AdminLogsPage() {
  const { showToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [action, setAction] = useState('all');

  useEffect(() => {
    loadLogs(1);
  }, [action]);

  async function loadLogs(page = pagination.page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 30,
        action,
      });

      const res = await api.get(`/logs?${params.toString()}`);
      setLogs(res.data.data.logs || []);
      if (res.data.data.pagination) {
        setPagination(res.data.data.pagination);
      }
    } catch {
      showToast('Erreur chargement des logs', 'error');
    } finally {
      setLoading(false);
    }
  }

  const actionVariant = {
    login: 'primary',
    user_suspend: 'danger',
    user_activate: 'success',
    provider_suspend: 'danger',
    provider_activate: 'success',
    verification_approve: 'success',
    verification_reject: 'warning',
    subscription_activate: 'navy',
    subscription_cancel: 'danger',
    category_create: 'info',
    category_update: 'info',
    category_delete: 'danger',
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0B162C' }}>Journal d'Audit & Sécurité</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Traçabilité complète et horodatage de toutes les actions d'administration exécutées
          </p>
        </div>

        {/* Action Filter */}
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border: '1.5px solid #E2E8F0',
            fontSize: 13,
            color: '#0B162C',
            background: '#FFFFFF',
          }}
        >
          <option value="all">Toutes les actions</option>
          <option value="login">Connexions (login)</option>
          <option value="verification_approve">Vérifications approuvées</option>
          <option value="verification_reject">Vérifications rejetées</option>
          <option value="provider_suspend">Suspension prestataire</option>
          <option value="provider_activate">Activation prestataire</option>
          <option value="user_suspend">Suspension utilisateur</option>
          <option value="subscription_activate">Activation abonnement</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Date & Heure', 'Administrateur', 'Action effectuée', 'Cible', 'Détails / Paramètres'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '14px 18px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 48, textAlign: 'center' }}>
                    <Spinner size={30} text="Chargement des journaux d'audit..." />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
                    Aucune entrée dans le journal pour ces filtres.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  let formattedDetails = '';
                  if (log.details) {
                    try {
                      formattedDetails =
                        typeof log.details === 'object'
                          ? JSON.stringify(log.details)
                          : log.details;
                    } catch {
                      formattedDetails = String(log.details);
                    }
                  }

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 18px', fontSize: 13, color: '#64748B' }}>
                        {new Date(log.created_at).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#0B162C', fontSize: 13 }}>
                          {log.admin_name}
                        </div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>{log.admin_email}</div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <Badge
                          label={log.action}
                          variant={actionVariant[log.action] || 'default'}
                          size="xs"
                        />
                      </td>

                      <td style={{ padding: '14px 18px', fontSize: 13, color: '#0B162C' }}>
                        {log.target_type ? (
                          <div>
                            <span style={{ fontWeight: 600 }}>{log.target_type}</span>{' '}
                            {log.target_id && <span style={{ color: '#94A3B8' }}>#{log.target_id}</span>}
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px', fontSize: 12, color: '#475569', maxWidth: 320 }}>
                        <div
                          style={{
                            fontFamily: 'monospace',
                            background: '#F8FAFC',
                            padding: '4px 8px',
                            borderRadius: 6,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={formattedDetails}
                        >
                          {formattedDetails || '—'}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination pagination={pagination} onPageChange={(p) => loadLogs(p)} />
      </div>
    </div>
  );
}
