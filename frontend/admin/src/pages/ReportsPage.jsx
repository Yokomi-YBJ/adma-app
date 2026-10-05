import { useState, useEffect } from 'react';
import {
  Flag, CheckCircle, XCircle, AlertTriangle, Briefcase, MessageSquare,
  Ban, EyeOff, Trash2, RefreshCw, ShieldCheck,
} from 'lucide-react';
import api from '../services/api';
import { Spinner } from '../components/common/Spinner';
import { Badge } from '../components/common/Badge';
import { Pagination } from '../components/common/Pagination';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useToast } from '../context/ToastContext';

const REASON_LABELS = {
  fake_provider:         'Fausse fiche / arnaque',
  wrong_number:          'Mauvais numéro',
  wrong_info:            'Informations incorrectes',
  activity_not_exist:    'Activité inexistante',
  problematic_behavior:  'Comportement problématique',
  fake_review:           'Faux avis',
  offensive:             'Contenu offensant',
  defamation:            'Diffamation',
  spam:                  'Spam',
  other:                 'Autre',
};

export function ReportsPage() {
  const { showToast } = useToast();

  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState('pending');
  const [targetType, setTargetType] = useState('all');

  // Modal d'action détaillée
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    report: null,
    selectedAction: '',
    note: '',
  });
  const [processing, setProcessing] = useState(false);

  // Modal rapide pour "Classer sans suite"
  const [quickDismiss, setQuickDismiss] = useState({ isOpen: false, report: null, loading: false });

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

  function openActionModal(report) {
    // Action pré-sélectionnée selon le type de cible
    const defaultAction = report.target_type === 'provider' ? 'suspend_provider' : 'hide_review';
    setActionModal({
      isOpen: true,
      report,
      selectedAction: defaultAction,
      note: '',
    });
  }

  async function handleApplyAction() {
    const { report, selectedAction, note } = actionModal;
    if (!selectedAction) {
      showToast('Veuillez sélectionner une action', 'warning');
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/reports/${report.id}/action`, {
        action: selectedAction,
        note:   note.trim() || null,
      });
      showToast('Action appliquée et signalement résolu', 'success');
      setActionModal({ isOpen: false, report: null, selectedAction: '', note: '' });
      loadReports(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors du traitement', 'error');
    } finally {
      setProcessing(false);
    }
  }

  async function handleQuickDismiss() {
    const { report } = quickDismiss;
    setQuickDismiss((prev) => ({ ...prev, loading: true }));

    try {
      await api.post(`/reports/${report.id}/action`, { action: 'dismiss' });
      showToast('Signalement classé sans suite', 'info');
      setQuickDismiss({ isOpen: false, report: null, loading: false });
      loadReports(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors du classement', 'error');
      setQuickDismiss((prev) => ({ ...prev, loading: false }));
    }
  }

  // Actions disponibles selon le type de cible
  function getAvailableActions(report) {
    if (report.target_type === 'provider') {
      const providerActive = report.target_data?.is_active;
      return [
        {
          id: 'suspend_provider',
          label: 'Suspendre le prestataire signalé',
          description: 'Retire immédiatement la fiche de l\'application et empêche sa visibilité.',
          icon: Ban,
          color: '#DC2626',
          bg: '#FEF2F2',
          disabled: !providerActive,
        },
        {
          id: 'activate_provider',
          label: 'Réactiver le prestataire',
          description: 'Rétablit la fiche si le signalement s\'avère infondé.',
          icon: ShieldCheck,
          color: '#059669',
          bg: '#ECFDF5',
          disabled: providerActive,
        },
        {
          id: 'resolve_only',
          label: 'Marquer comme résolu sans action',
          description: 'Clôture le signalement sans modifier la fiche du prestataire.',
          icon: CheckCircle,
          color: '#0B162C',
          bg: '#F1F5F9',
          disabled: false,
        },
      ];
    }

    // target_type === 'review'
    return [
      {
        id: 'hide_review',
        label: 'Masquer l\'avis signalé',
        description: 'L\'avis ne sera plus visible par les utilisateurs, mais reste archivé.',
        icon: EyeOff,
        color: '#D97706',
        bg: '#FFFBEB',
        disabled: false,
      },
      {
        id: 'delete_review',
        label: 'Supprimer définitivement l\'avis',
        description: 'Supprime l\'avis et recalcule le score de confiance du prestataire.',
        icon: Trash2,
        color: '#DC2626',
        bg: '#FEF2F2',
        disabled: false,
      },
      {
        id: 'resolve_only',
        label: 'Marquer comme résolu sans action',
        description: 'Clôture le signalement sans modifier l\'avis.',
        icon: CheckCircle,
        color: '#0B162C',
        bg: '#F1F5F9',
        disabled: false,
      },
    ];
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0B162C' }}>Signalements</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Traitez les litiges et appliquez des actions concrètes sur les contenus signalés
          </p>
        </div>

        {/* Filtres statut */}
        <div style={{ display: 'flex', gap: 6, background: '#FFFFFF', padding: 4, borderRadius: 12, border: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
          {[
            { id: 'pending',   label: 'En attente' },
            { id: 'resolved',  label: 'Résolus' },
            { id: 'dismissed', label: 'Classés' },
            { id: 'all',       label: 'Tous' },
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

      {/* Filtre cible */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'all',      label: 'Toutes cibles' },
          { id: 'provider', label: 'Prestataires' },
          { id: 'review',   label: 'Avis' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTargetType(t.id)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: `1px solid ${targetType === t.id ? '#5FC2BA' : '#E2E8F0'}`,
              background: targetType === t.id ? '#EBF7F7' : '#FFFFFF',
              color: targetType === t.id ? '#0D9488' : '#64748B',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Liste */}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reports.map((r) => {
            const isPending = r.status === 'pending';
            const isProvider = r.target_type === 'provider';
            const isReview   = r.target_type === 'review';
            const TargetIcon = isProvider ? Briefcase : MessageSquare;
            const reasonLabel = REASON_LABELS[r.reason] || r.reason;

            return (
              <div
                key={r.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  padding: 22,
                  border: isPending ? '1.5px solid #FECACA' : '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                {/* En-tête */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: '#FEF2F2',
                        color: '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <TargetIcon size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#0B162C' }}>
                        {reasonLabel}
                      </div>
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                        Cible : {r.target_type === 'provider' ? 'Prestataire' : 'Avis'} • Signalé le{' '}
                        {new Date(r.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  <Badge
                    label={r.status === 'pending' ? 'En attente' : r.status === 'resolved' ? 'Résolu' : 'Classé'}
                    variant={r.status === 'pending' ? 'danger' : r.status === 'resolved' ? 'success' : 'default'}
                    size="xs"
                  />
                </div>

                {/* Description du signalement */}
                {r.description && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      fontSize: 13,
                      color: '#334155',
                      lineHeight: 1.5,
                      marginBottom: 14,
                      fontStyle: 'italic',
                    }}
                  >
                    "{r.description}"
                  </div>
                )}

                {/* Cible */}
                {r.target_data && (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: isProvider ? '#EBF7F7' : '#FFFBEB',
                      border: `1px solid ${isProvider ? '#9FDEDA' : '#FDE68A'}`,
                      marginBottom: 14,
                    }}
                  >
                    {isProvider && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#0D9488', textTransform: 'uppercase', marginBottom: 6 }}>
                          Prestataire signalé
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0B162C', marginBottom: 4 }}>
                          {r.target_data.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>
                          {r.target_data.specialty} • {r.target_data.city_name || 'Ville non renseignée'}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                          <Badge
                            label={r.target_data.is_active ? 'Actif' : 'Suspendu'}
                            variant={r.target_data.is_active ? 'success' : 'danger'}
                            size="xs"
                          />
                          <Badge label={`Plan : ${r.target_data.plan}`} variant="navy" size="xs" />
                          <Badge
                            label={`Confiance : ${r.target_data.trust_score}%`}
                            variant="primary"
                            size="xs"
                          />
                        </div>
                      </>
                    )}

                    {isReview && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#D97706', textTransform: 'uppercase', marginBottom: 6 }}>
                          Avis signalé
                        </div>
                        <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, marginBottom: 8, fontStyle: 'italic' }}>
                          "{r.target_data.comment || '(sans commentaire)'}"
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <Badge
                            label={r.target_data.verdict === 'recommend' ? 'Recommandé' : r.target_data.verdict === 'discourage' ? 'Déconseillé' : 'Neutre'}
                            variant={r.target_data.verdict === 'recommend' ? 'success' : r.target_data.verdict === 'discourage' ? 'danger' : 'warning'}
                            size="xs"
                          />
                          <Badge
                            label={r.target_data.status === 'hidden' ? 'Masqué' : 'Visible'}
                            variant={r.target_data.status === 'hidden' ? 'default' : 'primary'}
                            size="xs"
                          />
                          <Badge label={`Prestataire : ${r.target_data.provider_name || '—'}`} variant="default" size="xs" />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Signalé par */}
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 14 }}>
                  Signalé par : <strong style={{ color: '#475569' }}>{r.reporter_name || 'Utilisateur anonyme'}</strong>
                </div>

                {/* Actions */}
                {isPending ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => openActionModal(r)}
                      style={{
                        flex: 1,
                        minWidth: 180,
                        padding: '10px 16px',
                        borderRadius: 10,
                        background: '#0B162C',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <ShieldCheck size={14} />
                      <span>Traiter le signalement</span>
                    </button>

                    <button
                      onClick={() => setQuickDismiss({ isOpen: true, report: r, loading: false })}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 10,
                        background: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        color: '#64748B',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Classer sans suite
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'right' }}>
                    Traité par <strong>{r.resolver_name || 'Admin'}</strong> le{' '}
                    {new Date(r.resolved_at).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal d'action détaillée */}
      {actionModal.isOpen && (
      <Modal
        isOpen={true}
        onClose={() => setActionModal({ isOpen: false, report: null, selectedAction: '', note: '' })}
        title="Traiter le signalement"
        maxWidth={560}
      >
        <div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
              Choisissez l'action à appliquer. Le signalement sera automatiquement marqué comme résolu.
            </div>

            {/* Liste des actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {getAvailableActions(actionModal.report).map((act) => {
                const Icon = act.icon;
                const isSelected = actionModal.selectedAction === act.id;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => !act.disabled && setActionModal({ ...actionModal, selectedAction: act.id })}
                    disabled={act.disabled}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: 14,
                      borderRadius: 12,
                      border: `2px solid ${isSelected ? '#0B162C' : '#E2E8F0'}`,
                      background: isSelected ? act.bg : '#FFFFFF',
                      cursor: act.disabled ? 'not-allowed' : 'pointer',
                      opacity: act.disabled ? 0.5 : 1,
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: act.bg,
                        color: act.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0B162C', marginBottom: 2 }}>
                        {act.label}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
                        {act.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Note */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 6 }}>
                Note interne (optionnel)
              </label>
              <textarea
                rows={3}
                value={actionModal.note}
                onChange={(e) => setActionModal({ ...actionModal, note: e.target.value })}
                placeholder="Justifiez votre décision..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1.5px solid #E2E8F0',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Boutons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setActionModal({ isOpen: false, report: null, selectedAction: '', note: '' })}
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
                type="button"
                onClick={handleApplyAction}
                disabled={processing || !actionModal.selectedAction}
                style={{
                  padding: '9px 20px',
                  borderRadius: 10,
                  background: '#0B162C',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: processing || !actionModal.selectedAction ? 'not-allowed' : 'pointer',
                  opacity: processing || !actionModal.selectedAction ? 0.7 : 1,
                }}
              >
                {processing ? 'Traitement...' : 'Confirmer l\'action'}
              </button>
            </div>
        </div>
      </Modal>
      )}

      {/* Confirm rapide pour dismiss */}
      {quickDismiss.isOpen && (
      <ConfirmModal
        isOpen={true}
        onClose={() => setQuickDismiss({ isOpen: false, report: null, loading: false })}
        onConfirm={handleQuickDismiss}
        loading={quickDismiss.loading}
        title="Classer sans suite"
        message="Ce signalement sera marqué comme classé sans suite. Aucune action ne sera appliquée sur la cible."
        variant="primary"
        confirmText="Classer"
      />
      )}
    </div>
  );
}