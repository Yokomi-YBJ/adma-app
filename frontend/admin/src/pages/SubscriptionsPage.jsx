import { useState, useEffect } from 'react';
import { CreditCard, Plus, XCircle, Search, Calendar, CheckCircle2, User } from 'lucide-react';
import api from '../services/api';
import { Spinner } from '../components/common/Spinner';
import { Badge } from '../components/common/Badge';
import { Pagination } from '../components/common/Pagination';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useToast } from '../context/ToastContext';

export function SubscriptionsPage() {
  const { showToast } = useToast();

  const [subscriptions, setSubscriptions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');

  // Manual activation modal
  const [activateModal, setActivateModal] = useState(false);
  const [providersList, setProvidersList] = useState([]);
  const [form, setForm] = useState({ providerId: '', plan: 'premium', days: 30 });
  const [submitting, setSubmitting] = useState(false);

  // Cancel modal
  const [confirmCancel, setConfirmCancel] = useState({ isOpen: false, sub: null, loading: false });

  useEffect(() => {
    loadSubscriptions(1);
  }, [plan, status]);

  async function loadSubscriptions(page = pagination.page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 20,
        plan,
        status,
        ...(q.trim() && { q: q.trim() }),
      });

      const res = await api.get(`/subscriptions?${params.toString()}`);
      setSubscriptions(res.data.data.subscriptions || []);
      if (res.data.data.pagination) {
        setPagination(res.data.data.pagination);
      }
    } catch {
      showToast('Erreur chargement des abonnements', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function openActivateModal() {
    setActivateModal(true);
    try {
      const res = await api.get('/providers?limit=100');
      setProvidersList(res.data.data.providers || []);
    } catch {
      showToast('Impossible de charger la liste des prestataires', 'error');
    }
  }

  async function handleManualActivate(e) {
    e.preventDefault();
    if (!form.providerId) {
      showToast('Sélectionnez un prestataire', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/subscriptions/activate', {
        providerId: parseInt(form.providerId, 10),
        plan: form.plan,
        days: parseInt(form.days, 10),
      });
      showToast('Abonnement activé avec succès !', 'success');
      setActivateModal(false);
      setForm({ providerId: '', plan: 'premium', days: 30 });
      loadSubscriptions(1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de l’activation', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelSubscription() {
    const { sub } = confirmCancel;
    setConfirmCancel((prev) => ({ ...prev, loading: true }));

    try {
      await api.patch(`/subscriptions/${sub.id}/cancel`);
      showToast('Abonnement annulé', 'success');
      setConfirmCancel({ isOpen: false, sub: null, loading: false });
      loadSubscriptions(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de l’annulation', 'error');
      setConfirmCancel((prev) => ({ ...prev, loading: false }));
    }
  }

  const planVariant = {
    free: 'default',
    premium: 'primary',
    professional: 'navy',
    enterprise: 'purple',
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0B162C' }}>Abonnements & Forfaits</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Suivi des plans souscrits (Premium, Professionnel, Entreprise) et attributions manuelles
          </p>
        </div>

        <button
          onClick={openActivateModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 12,
            background: '#5FC2BA',
            color: '#FFFFFF',
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(95, 194, 186, 0.3)',
          }}
        >
          <Plus size={16} />
          <span>Attribuer un abonnement</span>
        </button>
      </div>

      {/* Filter Bar */}
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadSubscriptions(1);
          }}
          style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260 }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 12 }} />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher par nom de prestataire ou téléphone..."
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
            }}
          >
            <option value="all">Tous les plans</option>
            <option value="premium">Premium</option>
            <option value="professional">Professionnel</option>
            <option value="enterprise">Entreprise</option>
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
            <option value="active">Actifs</option>
            <option value="expired">Expirés</option>
            <option value="cancelled">Annulés</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Prestataire', 'Plan', 'Montant', 'Début', 'Fin (Échéance)', 'Activé via', 'Statut', 'Actions'].map((h) => (
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
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center' }}>
                    <Spinner size={30} text="Chargement des abonnements..." />
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
                    Aucun abonnement trouvé.
                  </td>
                </tr>
              ) : (
                subscriptions.map((s) => {
                  const isActive = s.status === 'active';
                  const isExpired = s.status === 'expired';

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#0B162C', fontSize: 14 }}>
                          {s.provider_name}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>{s.phone}</div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <Badge label={s.plan} variant={planVariant[s.plan] || 'default'} size="xs" />
                      </td>

                      <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 700, color: '#0B162C' }}>
                        {s.amount ? `${s.amount.toLocaleString('fr-FR')} FCFA` : 'Offert (Admin)'}
                      </td>

                      <td style={{ padding: '14px 18px', fontSize: 12, color: '#64748B' }}>
                        {new Date(s.start_date).toLocaleDateString('fr-FR')}
                      </td>

                      <td style={{ padding: '14px 18px', fontSize: 12, color: '#0B162C', fontWeight: 600 }}>
                        {new Date(s.end_date).toLocaleDateString('fr-FR')}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <Badge
                          label={s.activated_by === 'admin' ? 'Manuel Admin' : 'Paiement KPay'}
                          variant={s.activated_by === 'admin' ? 'navy' : 'primary'}
                          size="xs"
                        />
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <Badge
                          label={isActive ? 'Actif' : isExpired ? 'Expiré' : 'Annulé'}
                          variant={isActive ? 'success' : isExpired ? 'warning' : 'danger'}
                          size="xs"
                        />
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        {isActive && (
                          <button
                            onClick={() => setConfirmCancel({ isOpen: true, sub: s, loading: false })}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 8,
                              background: '#FEF2F2',
                              border: '1px solid #FECACA',
                              color: '#DC2626',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            Annuler
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination pagination={pagination} onPageChange={(p) => loadSubscriptions(p)} />
      </div>

      {/* Manual Activation Modal */}
      <Modal isOpen={activateModal} onClose={() => setActivateModal(false)} title="Attribuer un abonnement manuel" maxWidth={500}>
        <form onSubmit={handleManualActivate}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0B162C', marginBottom: 6 }}>
              Sélectionner le prestataire
            </label>
            <select
              required
              value={form.providerId}
              onChange={(e) => setForm({ ...form, providerId: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1.5px solid #E2E8F0',
                fontSize: 13,
                background: '#FFFFFF',
              }}
            >
              <option value="">-- Choisir un professionnel --</option>
              {providersList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.phone} - {p.city_name || 'Cameroun'})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0B162C', marginBottom: 6 }}>
              Plan d'abonnement
            </label>
            <select
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1.5px solid #E2E8F0',
                fontSize: 13,
                background: '#FFFFFF',
              }}
            >
              <option value="premium">Premium (visibilité accrue, galerie 3 photos)</option>
              <option value="professional">Professionnel (galerie 6 photos, mise en avant top recherche)</option>
              <option value="enterprise">Entreprise (badge officiel, portée maximale)</option>
            </select>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0B162C', marginBottom: 6 }}>
              Durée de validité
            </label>
            <select
              value={form.days}
              onChange={(e) => setForm({ ...form, days: parseInt(e.target.value, 10) })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1.5px solid #E2E8F0',
                fontSize: 13,
                background: '#FFFFFF',
              }}
            >
              <option value={7}>7 jours (Essai)</option>
              <option value={30}>30 jours (1 mois)</option>
              <option value={90}>90 jours (3 mois)</option>
              <option value={180}>180 jours (6 mois)</option>
              <option value={365}>365 jours (1 an)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setActivateModal(false)}
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
              disabled={submitting}
              style={{
                padding: '9px 20px',
                borderRadius: 10,
                background: '#5FC2BA',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Activation...' : 'Confirmer l’activation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmCancel.isOpen}
        onClose={() => setConfirmCancel({ isOpen: false, sub: null, loading: false })}
        onConfirm={handleCancelSubscription}
        loading={confirmCancel.loading}
        title="Annuler l’abonnement"
        message={`Voulez-vous annuler l'abonnement de ${confirmCancel.sub?.provider_name} ? Le prestataire repassera immédiatement au plan gratuit.`}
        variant="danger"
        confirmText="Annuler l'abonnement"
      />
    </div>
  );
}
