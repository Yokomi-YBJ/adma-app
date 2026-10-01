import { useState, useEffect } from 'react';
import { Search, Eye, Edit2, ShieldAlert, ShieldCheck, CheckCircle2, XCircle, Star, Phone, MapPin } from 'lucide-react';
import api from '../services/api';
import { Pagination } from '../components/common/Pagination';
import { Spinner } from '../components/common/Spinner';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useToast } from '../context/ToastContext';

export function ProvidersPage() {
  const { showToast } = useToast();

  const [providers, setProviders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [plan, setPlan] = useState('all');
  const [verification, setVerification] = useState('all');

  // Modals
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmState, setConfirmState] = useState({ isOpen: false, type: '', provider: null, loading: false });

  useEffect(() => {
    loadProviders(1);
  }, [status, plan, verification]);

  async function loadProviders(page = pagination.page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 20,
        status,
        plan,
        verification,
        ...(q.trim() && { q: q.trim() }),
      });

      const res = await api.get(`/providers?${params.toString()}`);
      setProviders(res.data.data.providers || []);
      setPagination(res.data.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch {
      showToast('Erreur lors du chargement des prestataires', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    loadProviders(1);
  }

  async function openProviderDetails(id) {
    setDetailsLoading(true);
    setSelectedProvider({ id });
    try {
      const res = await api.get(`/providers/${id}`);
      setSelectedProvider(res.data.data);
      setEditForm({
        name: res.data.data.name || '',
        specialty: res.data.data.specialty || '',
        plan: res.data.data.plan || 'free',
        verification_status: res.data.data.verification_status || 'none',
        is_active: res.data.data.is_active ? 1 : 0,
      });
    } catch {
      showToast('Impossible de charger les détails du prestataire', 'error');
      setSelectedProvider(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!selectedProvider) return;
    setSavingEdit(true);

    try {
      await api.put(`/providers/${selectedProvider.id}`, editForm);
      showToast('Fiche prestataire mise à jour avec succès', 'success');
      setSelectedProvider(null);
      loadProviders(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la modification', 'error');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleStatus() {
    const { provider, type } = confirmState;
    setConfirmState((prev) => ({ ...prev, loading: true }));

    try {
      if (type === 'suspend') {
        await api.patch(`/providers/${provider.id}/suspend`);
        showToast(`Prestataire ${provider.name} suspendu`, 'success');
      } else if (type === 'activate') {
        await api.patch(`/providers/${provider.id}/activate`);
        showToast(`Prestataire ${provider.name} réactivé`, 'success');
      } else if (type === 'delete') {
        await api.delete(`/providers/${provider.id}`);
        showToast(`Prestataire ${provider.name} supprimé/archivé`, 'success');
      }
      setConfirmState({ isOpen: false, type: '', provider: null, loading: false });
      loadProviders(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de l’opération', 'error');
      setConfirmState((prev) => ({ ...prev, loading: false }));
    }
  }

  const planVariant = {
    free: 'default',
    premium: 'primary',
    professional: 'navy',
    enterprise: 'purple',
  };

  const verifVariant = {
    none: 'default',
    pending: 'warning',
    verified_id: 'info',
    verified: 'success',
  };

  return (
    <div className="fade-in">
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0B162C' }}>Prestataires</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Gestion, validation et modération de l'ensemble des professionnels ({pagination.total} total)
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
              placeholder="Rechercher par nom, spécialité, téléphone..."
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
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
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
            <option value="all">Tous les plans</option>
            <option value="free">Gratuit</option>
            <option value="premium">Premium</option>
            <option value="professional">Professionnel</option>
            <option value="enterprise">Entreprise</option>
          </select>

          <select
            value={verification}
            onChange={(e) => setVerification(e.target.value)}
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
            <option value="all">Toutes vérifications</option>
            <option value="none">Non vérifié</option>
            <option value="verified_id">ID Vérifié</option>
            <option value="verified">Vérifié Complet</option>
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
              outline: 'none',
            }}
          >
            <option value="all">Tous statuts</option>
            <option value="active">Actifs</option>
            <option value="suspended">Suspendus</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Prestataire', 'Ville / Catégorie', 'Plan', 'Vérification', 'Score Confiance', 'Statut', 'Actions'].map((h) => (
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
                    <Spinner size={30} text="Chargement des prestataires..." />
                  </td>
                </tr>
              ) : providers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
                    Aucun prestataire trouvé.
                  </td>
                </tr>
              ) : (
                providers.map((p) => {
                  const isActive = Boolean(p.is_active);

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      {/* Name & Specialty */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 12,
                              background: '#5FC2BA20',
                              color: '#0D9488',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 15,
                              flexShrink: 0,
                            }}
                          >
                            {p.name?.charAt(0) || 'P'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0B162C', fontSize: 14 }}>{p.name}</div>
                            <div style={{ fontSize: 12, color: '#64748B' }}>
                              {p.specialty || 'Spécialité non renseignée'} • <span style={{ color: '#0B162C' }}>{p.phone}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* City / Category */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: 13, color: '#0B162C', fontWeight: 600 }}>{p.city_name || '—'}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>{p.category_name || 'Général'}</div>
                      </td>

                      {/* Plan */}
                      <td style={{ padding: '14px 18px' }}>
                        <Badge label={p.plan} variant={planVariant[p.plan] || 'default'} size="xs" />
                      </td>

                      {/* Verification Status */}
                      <td style={{ padding: '14px 18px' }}>
                        <Badge
                          label={
                            p.verification_status === 'verified_id'
                              ? 'ID Certifié'
                              : p.verification_status === 'verified'
                              ? 'Vérifié Pro'
                              : 'Non vérifié'
                          }
                          variant={verifVariant[p.verification_status] || 'default'}
                          size="xs"
                        />
                      </td>

                      {/* Trust score */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Star size={14} color="#F59E0B" fill="#F59E0B" />
                          <strong style={{ color: '#0B162C', fontSize: 13 }}>{p.trust_score}%</strong>
                          <span style={{ fontSize: 11, color: '#94A3B8' }}>({p.review_count} avis)</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px' }}>
                        <Badge label={isActive ? 'Actif' : 'Suspendu'} variant={isActive ? 'success' : 'danger'} size="xs" />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => openProviderDetails(p.id)}
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
                            title="Gérer la fiche"
                          >
                            <Edit2 size={13} />
                            <span>Gérer</span>
                          </button>

                          {isActive ? (
                            <button
                              onClick={() => setConfirmState({ isOpen: true, type: 'suspend', provider: p, loading: false })}
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
                              title="Suspendre le prestataire"
                            >
                              <XCircle size={14} />
                              <span>Suspendre</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmState({ isOpen: true, type: 'activate', provider: p, loading: false })}
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
                              title="Réactiver le prestataire"
                            >
                              <CheckCircle2 size={14} />
                              <span>Activer</span>
                            </button>
                          )}
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
        <Pagination pagination={pagination} onPageChange={(p) => loadProviders(p)} />
      </div>

      {/* Edit / Detail Modal */}
      <Modal
        isOpen={Boolean(selectedProvider)}
        onClose={() => setSelectedProvider(null)}
        title={`Fiche : ${selectedProvider?.name || 'Prestataire'}`}
        maxWidth={640}
      >
        {detailsLoading ? (
          <Spinner center size={32} text="Chargement des données..." />
        ) : editForm ? (
          <form onSubmit={handleSaveEdit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 4 }}>
                  Nom commercial
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #E2E8F0',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 4 }}>
                  Spécialité
                </label>
                <input
                  type="text"
                  value={editForm.specialty}
                  onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #E2E8F0',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 4 }}>
                  Plan d'abonnement
                </label>
                <select
                  value={editForm.plan}
                  onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #E2E8F0',
                    fontSize: 14,
                    background: '#FFFFFF',
                  }}
                >
                  <option value="free">Gratuit</option>
                  <option value="premium">Premium</option>
                  <option value="professional">Professionnel</option>
                  <option value="enterprise">Entreprise</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 4 }}>
                  Statut de Vérification
                </label>
                <select
                  value={editForm.verification_status}
                  onChange={(e) => setEditForm({ ...editForm, verification_status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #E2E8F0',
                    fontSize: 14,
                    background: '#FFFFFF',
                  }}
                >
                  <option value="none">Non vérifié</option>
                  <option value="verified_id">ID Vérifié (badge bleu)</option>
                  <option value="verified">Vérifié Complet (badge vert)</option>
                </select>
              </div>
            </div>

            {/* Photos */}
            {selectedProvider.photos?.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 8 }}>
                  Galerie Photos ({selectedProvider.photos.length})
                </div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
                  {selectedProvider.photos.map((ph) => (
                    <img
                      key={ph.id}
                      src={ph.url}
                      alt="Photo prestataire"
                      style={{
                        width: 90,
                        height: 70,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid #E2E8F0',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: 10,
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
                disabled={savingEdit}
                style={{
                  padding: '9px 20px',
                  borderRadius: 10,
                  background: '#5FC2BA',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: savingEdit ? 'not-allowed' : 'pointer',
                  opacity: savingEdit ? 0.7 : 1,
                }}
              >
                {savingEdit ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      {/* Confirmation modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, type: '', provider: null, loading: false })}
        onConfirm={handleToggleStatus}
        loading={confirmState.loading}
        title={
          confirmState.type === 'suspend'
            ? 'Suspendre le prestataire'
            : confirmState.type === 'activate'
            ? 'Réactiver le prestataire'
            : 'Supprimer le prestataire'
        }
        message={
          confirmState.type === 'suspend'
            ? `Voulez-vous suspendre ${confirmState.provider?.name} ? Sa fiche ne sera plus visible sur l’application mobile.`
            : confirmState.type === 'activate'
            ? `Voulez-vous réactiver la fiche de ${confirmState.provider?.name} ?`
            : `Attention : cette action va archiver la fiche de ${confirmState.provider?.name}.`
        }
        variant={confirmState.type === 'activate' ? 'primary' : 'danger'}
        confirmText={confirmState.type === 'suspend' ? 'Suspendre' : confirmState.type === 'activate' ? 'Réactiver' : 'Supprimer'}
      />
    </div>
  );
}
