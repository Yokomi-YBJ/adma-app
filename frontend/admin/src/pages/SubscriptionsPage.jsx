import { useState, useEffect } from 'react';
import { CreditCard, Plus, XCircle, Search, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { Spinner } from '../components/common/Spinner';
import { Badge } from '../components/common/Badge';
import { Pagination } from '../components/common/Pagination';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useToast } from '../context/ToastContext';

const PLAN_LABELS = {
  free:         'Gratuit',
  premium:      'Premium',
  professional: 'Professionnel',
  enterprise:   'Entreprise',
};

const PLAN_RANK = {
  free:         0,
  premium:      1,
  professional: 2,
  enterprise:   3,
};

const MAX_DAYS = 90;

export function SubscriptionsPage() {
  const { showToast } = useToast();

  const [subscriptions, setSubscriptions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');

  // Modal d'attribution
  const [activateModal, setActivateModal] = useState(false);
  const [providersList, setProvidersList] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [form, setForm] = useState({
    providerId: '',
    plan: '',
    days: 30,
  });
  const [submitting, setSubmitting] = useState(false);

  // Modal d'annulation
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
    setForm({ providerId: '', plan: '', days: 30 });
    setLoadingProviders(true);
    try {
      // Nouveau endpoint qui exclut déjà les plans enterprise (non upgradables)
      const res = await api.get('/subscriptions/upgradable');
      setProvidersList(res.data.data || []);
    } catch {
      showToast('Impossible de charger la liste des prestataires', 'error');
      setProvidersList([]);
    } finally {
      setLoadingProviders(false);
    }
  }

  // Retourne le prestataire sélectionné
  const selectedProvider = providersList.find((p) => String(p.id) === String(form.providerId));

  // Retourne la liste des plans valides pour l'upgrade du prestataire sélectionné
  const availablePlans = selectedProvider
    ? selectedProvider.upgradablePlans || []
    : [];

  async function handleManualActivate(e) {
    e.preventDefault();

    if (!form.providerId) {
      showToast('Sélectionnez un prestataire', 'warning');
      return;
    }
    if (!form.plan) {
      showToast('Sélectionnez un plan', 'warning');
      return;
    }
    if (form.days < 1 || form.days > MAX_DAYS) {
      showToast(`La durée doit être comprise entre 1 et ${MAX_DAYS} jours`, 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/subscriptions/activate', {
        providerId: parseInt(form.providerId, 10),
        plan:       form.plan,
        days:       parseInt(form.days, 10),
      });
      showToast('Abonnement attribué avec succès', 'success');
      setActivateModal(false);
      loadSubscriptions(1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de l’attribution', 'error');
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
    free:         'default',
    premium:      'primary',
    professional: 'navy',
    enterprise:   'purple',
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0B162C' }}>Abonnements &amp; Forfaits</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Suivi des plans souscrits et attribution manuelle (upgrades uniquement, max 90 jours)
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

      {/* Filtres */}
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
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
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
                boxSizing: 'border-box',
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

      {/* Tableau */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Prestataire', 'Plan', 'Montant', 'Début', 'Fin', 'Activé via', 'Statut', 'Actions'].map((h) => (
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
                        <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>
                          {String(s.user_phone || '').replace(/^\+?237/, '').replace(/^(\d{3})\d+(\d{2})$/, '$1*****$2')}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <Badge label={PLAN_LABELS[s.plan] || s.plan} variant={planVariant[s.plan] || 'default'} size="xs" />
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

        <Pagination pagination={pagination} onPageChange={(p) => loadSubscriptions(p)} />
      </div>

      {/* Modal d'attribution */}
      {activateModal && (
      <Modal
        isOpen={true}
        onClose={() => setActivateModal(false)}
        title="Attribuer un abonnement"
        maxWidth={520}
      >
        {loadingProviders ? (
          <Spinner center size={28} text="Chargement des prestataires..." />
        ) : (
          <form onSubmit={handleManualActivate}>
            {/* Prestataire */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 6 }}>
                Prestataire *
              </label>
              <select
                required
                value={form.providerId}
                onChange={(e) => {
                  const providerId = e.target.value;
                  const prov = providersList.find((p) => String(p.id) === String(providerId));
                  setForm({
                    ...form,
                    providerId,
                    // Suggestion auto du premier plan upgradable
                    plan: prov?.upgradablePlans?.[0] || '',
                  });
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1.5px solid #E2E8F0',
                  fontSize: 13,
                  background: '#FFFFFF',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">-- Choisir un prestataire --</option>
                {providersList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({PLAN_LABELS[p.plan] || p.plan})
                  </option>
                ))}
              </select>

              {selectedProvider && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: '#EBF7F7',
                    fontSize: 12,
                    color: '#0D9488',
                    fontWeight: 600,
                  }}
                >
                  Plan actuel : {PLAN_LABELS[selectedProvider.plan] || selectedProvider.plan}
                </div>
              )}
            </div>

            {/* Plan cible */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 6 }}>
                Nouveau plan (upgrade uniquement) *
              </label>
              {!selectedProvider ? (
                <div style={{ fontSize: 12, color: '#94A3B8', padding: '10px 0' }}>
                  Sélectionnez d'abord un prestataire
                </div>
              ) : availablePlans.length === 0 ? (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    fontSize: 12,
                    color: '#92400E',
                    fontWeight: 600,
                  }}
                >
                  Ce prestataire est déjà en plan Entreprise. Aucun upgrade possible.
                </div>
              ) : (
                <select
                  required
                  value={form.plan}
                  onChange={(e) => setForm({ ...form, plan: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #E2E8F0',
                    fontSize: 13,
                    background: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                >
                  {availablePlans.map((p) => (
                    <option key={p} value={p}>
                      {PLAN_LABELS[p] || p}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Durée */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 6 }}>
                Durée (jours) * — Max {MAX_DAYS}
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
                  boxSizing: 'border-box',
                }}
              >
                <option value={7}>7 jours (Essai)</option>
                <option value={30}>30 jours (1 mois)</option>
                <option value={60}>60 jours (2 mois)</option>
                <option value={90}>90 jours (3 mois - max)</option>
              </select>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6, lineHeight: 1.4 }}>
                La durée s'ajoute à la date d'expiration actuelle du prestataire si elle est encore valide.
              </div>
            </div>

            {/* Boutons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
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
                disabled={submitting || !selectedProvider || !form.plan || availablePlans.length === 0}
                style={{
                  padding: '9px 20px',
                  borderRadius: 10,
                  background: '#5FC2BA',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting || !selectedProvider || !form.plan ? 0.6 : 1,
                }}
              >
                {submitting ? 'Attribution...' : 'Confirmer'}
              </button>
            </div>
          </form>
        )}
      </Modal>
      )}

      {/* Confirm cancel */}
      {confirmCancel.isOpen && (
      <ConfirmModal
        isOpen={true}
        onClose={() => setConfirmCancel({ isOpen: false, sub: null, loading: false })}
        onConfirm={handleCancelSubscription}
        loading={confirmCancel.loading}
        title="Annuler l'abonnement"
        message={`Voulez-vous annuler l'abonnement de ${confirmCancel.sub?.provider_name} ? Le prestataire repassera immédiatement au plan gratuit.`}
        variant="danger"
        confirmText="Annuler l'abonnement"
      />
      )}
    </div>
  );
}