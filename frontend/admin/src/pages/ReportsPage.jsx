import { useState, useEffect } from 'react';
import { Flag, CheckCircle, XCircle, AlertTriangle, User, Briefcase, MessageSquare } from 'lucide-react';
import api from '../services/api';
import { Spinner } from '../components/common/Spinner';
import { Badge } from '../components/common/Badge';
import { Pagination } from '../components/common/Pagination';
import { Modal } from '../components/common/Modal';
import { useToast } from '../context/ToastContext';

export function ReportsPage() {
  const { showToast } = useToast();

  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState('pending');
  const [targetType, setTargetType] = useState('all');

  // Resolution modal
  const [actionModal, setActionModal] = useState({ isOpen: false, type: '', reportId: null, note: '' });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadReports(1);
  }, [status, targetType]);

  async function loadReports(page = pagination.page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 20,
        status,
        targetType,
      });

      const res = await api.get(`/reports?${params.toString()}`);
      setReports(res.data.data.reports || []);
      if (res.data.data.pagination) {
        setPagination(res.data.data.pagination);
      }
    } catch {
      showToast('Erreur lors du chargement des signalements', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleResolveOrDismiss(e) {
    e.preventDefault();
    const { type, reportId, note } = actionModal;
    setProcessing(true);

    try {
      if (type === 'resolve') {
        await api.patch(`/reports/${reportId}/resolve`, { note });
        showToast('Signalement marqué comme résolu', 'success');
      } else if (type === 'dismiss') {
        await api.patch(`/reports/${reportId}/dismiss`, { note });
        showToast('Signalement classé sans suite', 'info');
      }
      setActionModal({ isOpen: false, type: '', reportId: null, note: '' });
      loadReports(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors du traitement', 'error');
    } finally {
      setProcessing(false);
    }
  }

  const targetIcon = {
    provider: Briefcase,
    review: MessageSquare,
    user: User,
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0B162C' }}>Signalements</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Litiges, comportements abusifs et signalements de contenus par les utilisateurs
          </p>
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: 6, background: '#FFFFFF', padding: 4, borderRadius: 12, border: '1px solid #E2E8F0' }}>
          {[
            { id: 'pending', label: 'En attente' },
            { id: 'resolved', label: 'Résolus' },
            { id: 'dismissed', label: 'Classés sans suite' },
            { id: 'all', label: 'Tous' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatus(tab.id)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: status === tab.id ? '#0B162C' : 'transparent',
                color: status === tab.id ? '#FFFFFF' : '#64748B',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Target Type Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', 'provider', 'review', 'user'].map((t) => (
          <button
            key={t}
            onClick={() => setTargetType(t)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: `1px solid ${targetType === t ? '#5FC2BA' : '#E2E8F0'}`,
              background: targetType === t ? '#EBF7F7' : '#FFFFFF',
              color: targetType === t ? '#0D9488' : '#64748B',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {t === 'all' ? 'Toutes cibles' : t === 'provider' ? 'Prestataires' : t === 'review' ? 'Avis' : 'Utilisateurs'}
          </button>
        ))}
      </div>

      {/* Reports List */}
      {loading ? (
        <Spinner center size={36} text="Chargement des signalements..." />
      ) : reports.length === 0 ? (
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 60, textAlign: 'center', border: '1px solid #E2E8F0' }}>
          <CheckCircle size={44} color="#10B981" style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0B162C' }}>
            Aucun signalement {status === 'pending' ? 'en attente' : ''}
          </h3>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Tout est en ordre sur la plateforme.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {reports.map((r) => {
            const isPending = r.status === 'pending';
            const TargetIcon = targetIcon[r.target_type] || Flag;

            return (
              <div
                key={r.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  padding: 20,
                  border: isPending ? '1.5px solid #FECACA' : '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: '#FEF2F2',
                        color: '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <TargetIcon size={16} />
                    </div>
                    <div>
                      <strong style={{ fontSize: 15, color: '#0B162C' }}>{r.reason}</strong>
                      <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 8 }}>
                        Cible : {r.target_type} #{r.target_id}
                      </span>
                    </div>
                    <Badge
                      label={r.status === 'pending' ? 'En attente' : r.status === 'resolved' ? 'Résolu' : 'Classé'}
                      variant={r.status === 'pending' ? 'danger' : r.status === 'resolved' ? 'success' : 'default'}
                      size="xs"
                    />
                  </div>

                  {r.description && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        fontSize: 13,
                        color: '#334155',
                        lineHeight: 1.4,
                        marginBottom: 10,
                      }}
                    >
                      "{r.description}"
                    </div>
                  )}

                  {/* Target data summary if available */}
                  {r.target_data && (
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>
                      Détails cible :{' '}
                      <strong>
                        {r.target_data.name || r.target_data.first_name || `Avis #${r.target_data.id}`}
                      </strong>{' '}
                      {r.target_data.specialty && `(${r.target_data.specialty})`}
                      {r.target_data.phone && ` - ${r.target_data.phone}`}
                    </div>
                  )}

                  <div style={{ fontSize: 12, color: '#94A3B8' }}>
                    Signalé par : <strong>{r.reporter_name || r.reporter_phone}</strong> • le{' '}
                    {new Date(r.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>

                {/* Actions */}
                {isPending ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setActionModal({ isOpen: true, type: 'resolve', reportId: r.id, note: '' })}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 10,
                        background: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        color: '#059669',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Résoudre
                    </button>
                    <button
                      onClick={() => setActionModal({ isOpen: true, type: 'dismiss', reportId: r.id, note: '' })}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 10,
                        background: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        color: '#64748B',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Classer sans suite
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>
                    Traité par {r.resolver_name || 'Admin'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution Modal */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, type: '', reportId: null, note: '' })}
        title={actionModal.type === 'resolve' ? 'Résoudre le signalement' : 'Classer sans suite'}
        maxWidth={460}
      >
        <form onSubmit={handleResolveOrDismiss}>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>
            {actionModal.type === 'resolve'
              ? 'Ajoutez une note expliquant les mesures prises (ex: avertissement au prestataire, suppression d\'avis).'
              : 'Ajoutez une note justifiant le classement sans suite.'}
          </p>

          <div style={{ marginBottom: 20 }}>
            <textarea
              rows={3}
              value={actionModal.note}
              onChange={(e) => setActionModal({ ...actionModal, note: e.target.value })}
              placeholder="Note interne d'administration (optionnel)..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1.5px solid #E2E8F0',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setActionModal({ isOpen: false, type: '', reportId: null, note: '' })}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                color: '#475569',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={processing}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                background: actionModal.type === 'resolve' ? '#10B981' : '#64748B',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: processing ? 'not-allowed' : 'pointer',
              }}
            >
              {processing ? 'Enregistrement...' : 'Confirmer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
