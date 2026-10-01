import { useState, useEffect } from 'react';
import { Search, UserX, UserCheck, Eye, Trash2, Shield, Phone, Calendar } from 'lucide-react';
import api from '../services/api';
import { Pagination } from '../components/common/Pagination';
import { Spinner } from '../components/common/Spinner';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useToast } from '../context/ToastContext';

export function UsersPage() {
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');

  // Modals
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [confirmState, setConfirmState] = useState({ isOpen: false, type: '', user: null, loading: false });

  useEffect(() => {
    loadUsers(1);
  }, [status]);

  async function loadUsers(page = pagination.page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 20,
        status,
        ...(q.trim() && { q: q.trim() }),
      });

      const res = await api.get(`/users?${params.toString()}`);
      setUsers(res.data.data.users || []);
      setPagination(res.data.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      showToast('Erreur lors du chargement des utilisateurs', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    loadUsers(1);
  }

  async function openUserDetails(userId) {
    setDetailsLoading(true);
    setSelectedUser({ id: userId }); // placeholder
    try {
      const res = await api.get(`/users/${userId}`);
      setSelectedUser(res.data.data);
    } catch {
      showToast('Impossible de charger les détails', 'error');
      setSelectedUser(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleToggleStatus() {
    const { user, type } = confirmState;
    setConfirmState((prev) => ({ ...prev, loading: true }));

    try {
      if (type === 'suspend') {
        await api.patch(`/users/${user.id}/suspend`);
        showToast(`Utilisateur ${user.phone} suspendu`, 'success');
      } else if (type === 'activate') {
        await api.patch(`/users/${user.id}/activate`);
        showToast(`Utilisateur ${user.phone} réactivé`, 'success');
      } else if (type === 'delete') {
        await api.delete(`/users/${user.id}`);
        showToast(`Compte de ${user.phone} supprimé`, 'success');
      }
      setConfirmState({ isOpen: false, type: '', user: null, loading: false });
      loadUsers(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de l’opération', 'error');
      setConfirmState((prev) => ({ ...prev, loading: false }));
    }
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0B162C' }}>Utilisateurs</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Gestion de tous les comptes enregistrés sur l'application ADMA ({pagination.total} au total)
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
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
              placeholder="Rechercher par nom ou numéro (+237...)..."
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

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Statut :</span>
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
              outline: 'none',
            }}
          >
            <option value="all">Tous</option>
            <option value="active">Actifs</option>
            <option value="suspended">Suspendus</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 680 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Utilisateur', 'Téléphone', 'Rôle', 'Avis / Signalements', 'Statut', 'Inscrit le', 'Actions'].map((h) => (
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
                    <Spinner size={30} text="Chargement des utilisateurs..." />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
                    Aucun utilisateur trouvé pour ces critères.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSuspended = u.status === 'suspended';
                  const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Utilisateur';

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* Name / Avatar */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: '#5FC2BA20',
                              color: '#0D9488',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 14,
                              flexShrink: 0,
                            }}
                          >
                            {u.first_name?.charAt(0) || u.phone?.slice(-2) || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0B162C', fontSize: 14 }}>
                              {fullName}
                            </div>
                            <div style={{ fontSize: 11, color: '#94A3B8' }}>ID: #{u.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td style={{ padding: '14px 18px', fontSize: 14, color: '#0B162C', fontWeight: 600 }}>
                        {u.phone}
                      </td>

                      {/* Role */}
                      <td style={{ padding: '14px 18px' }}>
                        {u.provider_id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Badge label="Prestataire" variant="primary" size="xs" />
                            <span style={{ fontSize: 11, color: '#64748B' }}>{u.provider_name}</span>
                          </div>
                        ) : (
                          <Badge label="Client" variant="default" size="xs" />
                        )}
                      </td>

                      {/* Reviews / Reports count */}
                      <td style={{ padding: '14px 18px', fontSize: 13, color: '#64748B' }}>
                        <span>{u.review_count || 0} avis</span> •{' '}
                        <span style={{ color: u.report_count > 0 ? '#EF4444' : '#64748B' }}>
                          {u.report_count || 0} sign.
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px' }}>
                        <Badge
                          label={isSuspended ? 'Suspendu' : 'Actif'}
                          variant={isSuspended ? 'danger' : 'success'}
                          size="xs"
                        />
                      </td>

                      {/* Date */}
                      <td style={{ padding: '14px 18px', fontSize: 12, color: '#64748B' }}>
                        {new Date(u.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => openUserDetails(u.id)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 8,
                              background: '#F1F5F9',
                              border: 'none',
                              color: '#0B162C',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                            title="Voir la fiche détaillée"
                          >
                            <Eye size={14} />
                            <span>Voir</span>
                          </button>

                          {isSuspended ? (
                            <button
                              onClick={() => setConfirmState({ isOpen: true, type: 'activate', user: u, loading: false })}
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
                              title="Réactiver le compte"
                            >
                              <UserCheck size={14} />
                              <span>Activer</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmState({ isOpen: true, type: 'suspend', user: u, loading: false })}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                background: '#FEF2F2',
                                border: '1px solid #FECACA',
                                color: '#DC2626',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                              title="Suspendre le compte"
                            >
                              <UserX size={14} />
                              <span>Suspendre</span>
                            </button>
                          )}

                          <button
                            onClick={() => setConfirmState({ isOpen: true, type: 'delete', user: u, loading: false })}
                            style={{
                              padding: '6px 8px',
                              borderRadius: 8,
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="Supprimer / Anonymiser"
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
        <Pagination pagination={pagination} onPageChange={(p) => loadUsers(p)} />
      </div>

      {/* User Details Modal */}
      <Modal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title={selectedUser?.first_name ? `${selectedUser.first_name} ${selectedUser.last_name}` : 'Détails Utilisateur'}
        maxWidth={600}
      >
        {detailsLoading ? (
          <Spinner center size={32} text="Chargement des détails..." />
        ) : selectedUser ? (
          <div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 16,
                  background: '#5FC2BA',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {selectedUser.first_name?.charAt(0) || 'U'}
              </div>
              <div>
                <h4 style={{ fontSize: 18, fontWeight: 800, color: '#0B162C', margin: 0 }}>
                  {selectedUser.first_name} {selectedUser.last_name}
                </h4>
                <div style={{ fontSize: 13, color: '#64748B', display: 'flex', gap: 8, marginTop: 4 }}>
                  <span>Tel : {selectedUser.phone}</span>
                  <span>•</span>
                  <span>Statut : {selectedUser.status}</span>
                </div>
              </div>
            </div>

            {/* Provider Section if any */}
            {selectedUser.provider && (
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: 14,
                  padding: 16,
                  border: '1px solid #E2E8F0',
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: '#5FC2BA', textTransform: 'uppercase', marginBottom: 8 }}>
                  Fiche Prestataire Rattachée
                </div>
                <div style={{ fontWeight: 700, color: '#0B162C', fontSize: 15 }}>
                  {selectedUser.provider.name}
                </div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                  {selectedUser.provider.specialty} • {selectedUser.provider.city_name}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <Badge label={`Plan: ${selectedUser.provider.plan}`} variant="navy" size="xs" />
                  <Badge label={`Score: ${selectedUser.provider.trust_score}%`} variant="success" size="xs" />
                </div>
              </div>
            )}

            {/* Recent Reviews written by user */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0B162C', marginBottom: 10 }}>
                Avis émis par cet utilisateur ({selectedUser.reviews?.length || 0})
              </div>
              {selectedUser.reviews?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedUser.reviews.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        fontSize: 13,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <strong style={{ color: '#0B162C' }}>{r.provider_name}</strong>
                        <Badge label={r.verdict} variant={r.verdict === 'positive' ? 'success' : 'warning'} size="xs" />
                      </div>
                      <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>"{r.comment}"</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#94A3B8' }}>Aucun avis émis</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={() => setSelectedUser(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  background: '#0B162C',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, type: '', user: null, loading: false })}
        onConfirm={handleToggleStatus}
        loading={confirmState.loading}
        title={
          confirmState.type === 'suspend'
            ? 'Suspendre l’utilisateur'
            : confirmState.type === 'activate'
            ? 'Réactiver l’utilisateur'
            : 'Supprimer définitivement le compte'
        }
        message={
          confirmState.type === 'suspend'
            ? `Êtes-vous certain de vouloir suspendre le compte de ${confirmState.user?.first_name || confirmState.user?.phone} ? Il ne pourra plus se connecter.`
            : confirmState.type === 'activate'
            ? `Voulez-vous réactiver le compte de ${confirmState.user?.first_name || confirmState.user?.phone} ?`
            : `Attention : cette action va anonymiser et révoquer le compte de ${confirmState.user?.first_name || confirmState.user?.phone}. Cette action est irréversible.`
        }
        variant={confirmState.type === 'activate' ? 'primary' : 'danger'}
        confirmText={
          confirmState.type === 'suspend'
            ? 'Suspendre'
            : confirmState.type === 'activate'
            ? 'Réactiver'
            : 'Supprimer'
        }
      />
    </div>
  );
}
