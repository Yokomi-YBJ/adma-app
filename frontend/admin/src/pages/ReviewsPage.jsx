import { useState, useEffect } from 'react';
import { Search, EyeOff, Eye, Trash2, MessageSquare, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import api from '../services/api';
import { Spinner } from '../components/common/Spinner';
import { Badge } from '../components/common/Badge';
import { Pagination } from '../components/common/Pagination';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useToast } from '../context/ToastContext';

export function ReviewsPage() {
  const { showToast } = useToast();

  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState('all');
  const [verdict, setVerdict] = useState('all');
  const [q, setQ] = useState('');

  const [confirmState, setConfirmState] = useState({ isOpen: false, type: '', review: null, loading: false });

  useEffect(() => {
    loadReviews(1);
  }, [status, verdict]);

  async function loadReviews(page = pagination.page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 20,
        status,
        verdict,
        ...(q.trim() && { q: q.trim() }),
      });

      const res = await api.get(`/reviews?${params.toString()}`);
      setReviews(res.data.data.reviews || res.data.data || []);
      if (res.data.data.pagination) {
        setPagination(res.data.data.pagination);
      }
    } catch {
      showToast('Erreur lors du chargement des avis', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    loadReviews(1);
  }

  async function handleAction() {
    const { review, type } = confirmState;
    setConfirmState((prev) => ({ ...prev, loading: true }));

    try {
      if (type === 'hide') {
        await api.patch(`/reviews/${review.id}/hide`);
        showToast('Avis masqué au public', 'success');
      } else if (type === 'restore') {
        await api.patch(`/reviews/${review.id}/restore`);
        showToast('Avis restauré avec succès', 'success');
      } else if (type === 'delete') {
        await api.delete(`/reviews/${review.id}`);
        showToast('Avis supprimé et score recalculé', 'success');
      }
      setConfirmState({ isOpen: false, type: '', review: null, loading: false });
      loadReviews(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de l’opération', 'error');
      setConfirmState((prev) => ({ ...prev, loading: false }));
    }
  }

  const verdictConfig = {
    positive: { label: 'Positif', icon: ThumbsUp, variant: 'success' },
    neutral:  { label: 'Neutre',  icon: Minus,    variant: 'warning' },
    negative: { label: 'Négatif', icon: ThumbsDown, variant: 'danger' },
  };

  return (
    <div className="fade-in">
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0B162C' }}>Modération des Avis</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Contrôle et modération des retours d'expérience clients sur les prestataires
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          border: '1px solid #E2E8F0',
          marginBottom: 20,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 12 }} />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher par commentaire, prestataire ou client..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 10,
                border: '1.5px solid #E2E8F0',
                fontSize: 14,
                color: '#0B162C',
                outline: 'none',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              background: '#0B162C',
              color: '#FFFFFF',
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Filtrer
          </button>
        </form>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={verdict}
            onChange={(e) => setVerdict(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1.5px solid #E2E8F0',
              fontSize: 13,
              color: '#0B162C',
              background: '#FFFFFF',
            }}
          >
            <option value="all">Tous les verdicts</option>
            <option value="positive">Positifs</option>
            <option value="neutral">Neutres</option>
            <option value="negative">Négatifs</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1.5px solid #E2E8F0',
              fontSize: 13,
              color: '#0B162C',
              background: '#FFFFFF',
            }}
          >
            <option value="all">Tous statuts</option>
            <option value="active">Actifs (visibles)</option>
            <option value="hidden">Masqués</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 780 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Prestataire', 'Auteur', 'Verdict', 'Commentaire', 'Date', 'Statut', 'Actions'].map((h) => (
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
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center' }}>
                    <Spinner size={30} text="Chargement des avis..." />
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
                    Aucun avis trouvé.
                  </td>
                </tr>
              ) : (
                reviews.map((r) => {
                  const isHidden = r.status === 'hidden';
                  const vConf = verdictConfig[r.verdict] || { label: r.verdict, variant: 'default' };

                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <strong style={{ color: '#0B162C', fontSize: 14 }}>{r.provider_name}</strong>
                      </td>

                      <td style={{ padding: '14px 18px', fontSize: 13, color: '#0B162C' }}>
                        <div>{r.reviewer_name || 'Client anonyme'}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>{r.reviewer_phone}</div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <Badge label={vConf.label} variant={vConf.variant} size="xs" />
                      </td>

                      <td style={{ padding: '14px 18px', maxWidth: 300 }}>
                        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.4 }}>
                          "{r.comment}"
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', fontSize: 12, color: '#64748B' }}>
                        {new Date(r.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <Badge label={isHidden ? 'Masqué' : 'Visible'} variant={isHidden ? 'danger' : 'success'} size="xs" />
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {isHidden ? (
                            <button
                              onClick={() => setConfirmState({ isOpen: true, type: 'restore', review: r, loading: false })}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                background: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                color: '#059669',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                              title="Restaurer l'avis"
                            >
                              <Eye size={13} />
                              <span>Restaurer</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmState({ isOpen: true, type: 'hide', review: r, loading: false })}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                background: '#FFFBEB',
                                border: '1px solid #FDE68A',
                                color: '#D97706',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                              title="Masquer au public"
                            >
                              <EyeOff size={13} />
                              <span>Masquer</span>
                            </button>
                          )}

                          <button
                            onClick={() => setConfirmState({ isOpen: true, type: 'delete', review: r, loading: false })}
                            style={{
                              padding: '6px 8px',
                              borderRadius: 8,
                              background: '#FEF2F2',
                              border: '1px solid #FECACA',
                              color: '#DC2626',
                              cursor: 'pointer',
                            }}
                            title="Supprimer définitivement"
                          >
                            <Trash2 size={13} />
                          </button>
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
        <Pagination pagination={pagination} onPageChange={(p) => loadReviews(p)} />
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, type: '', review: null, loading: false })}
        onConfirm={handleAction}
        loading={confirmState.loading}
        title={
          confirmState.type === 'hide'
            ? 'Masquer cet avis'
            : confirmState.type === 'restore'
            ? 'Restaurer cet avis'
            : 'Supprimer définitivement cet avis'
        }
        message={
          confirmState.type === 'hide'
            ? 'Cet avis ne sera plus visible sur l’application mobile, mais restera archivé.'
            : confirmState.type === 'restore'
            ? 'Cet avis redeviendra visible pour tous les utilisateurs.'
            : 'Cette action supprimera l’avis et mettra à jour le score de confiance du prestataire.'
        }
        variant={confirmState.type === 'restore' ? 'primary' : 'danger'}
        confirmText={confirmState.type === 'hide' ? 'Masquer' : confirmState.type === 'restore' ? 'Restaurer' : 'Supprimer'}
      />
    </div>
  );
}
