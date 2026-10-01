import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Eye, Calendar, Phone, Maximize2 } from 'lucide-react';
import api from '../services/api';
import { Spinner } from '../components/common/Spinner';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';
import { useToast } from '../context/ToastContext';

export function VerificationsPage() {
  const { showToast } = useToast();

  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');

  // Preview / Action Modals
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);
  const [rejectModal, setRejectModal] = useState({ isOpen: false, requestId: null, reason: '' });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRequests(1);
  }, [status]);

  async function loadRequests(page = pagination.page) {
    setLoading(true);
    try {
      const res = await api.get(`/verifications?status=${status}&page=${page}&limit=20`);
      setRequests(res.data.data.requests || res.data.data || []);
      if (res.data.data.pagination) {
        setPagination(res.data.data.pagination);
      }
    } catch {
      showToast('Erreur lors du chargement des vérifications', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id, badgeType = 'verified_id') {
    setProcessing(true);
    try {
      await api.patch(`/verifications/${id}/approve`, { badgeType });
      showToast(
        `Demande approuvée avec le badge ${badgeType === 'verified' ? 'Vérifié Complet' : 'ID Certifié'}`,
        'success'
      );
      setSelectedRequest(null);
      loadRequests(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de l’approbation', 'error');
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject(e) {
    e.preventDefault();
    if (!rejectModal.reason.trim()) {
      showToast('Veuillez indiquer un motif de rejet', 'warning');
      return;
    }

    setProcessing(true);
    try {
      await api.patch(`/verifications/${rejectModal.requestId}/reject`, {
        reason: rejectModal.reason.trim(),
      });
      showToast('Demande rejetée avec notification au prestataire', 'info');
      setRejectModal({ isOpen: false, requestId: null, reason: '' });
      setSelectedRequest(null);
      loadRequests(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors du rejet', 'error');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0B162C' }}>Demandes de Vérification</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Examen des pièces d'identité (CNI) et certification des profils de prestataires
          </p>
        </div>

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: 6, background: '#FFFFFF', padding: 4, borderRadius: 12, border: '1px solid #E2E8F0' }}>
          {[
            { id: 'pending', label: 'En attente' },
            { id: 'approved', label: 'Approuvées' },
            { id: 'rejected', label: 'Rejetées' },
            { id: 'all', label: 'Toutes' },
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

      {/* Grid of verification requests */}
      {loading ? (
        <Spinner center size={36} text="Chargement des demandes..." />
      ) : requests.length === 0 ? (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: 60,
            textAlign: 'center',
            border: '1px solid #E2E8F0',
          }}
        >
          <CheckCircle2 size={44} color="#10B981" style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0B162C' }}>
            Aucune demande de vérification {status === 'pending' ? 'en attente' : ''}
          </h3>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Tous les dossiers ont été traités.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {requests.map((r) => {
            const isPending = r.status === 'pending';

            return (
              <div
                key={r.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 18,
                  padding: 22,
                  border: isPending ? '1.5px solid #FDE68A' : '1px solid #E2E8F0',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0B162C', margin: 0 }}>
                        {r.provider_name}
                      </h3>
                      <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                        {r.provider_specialty || 'Prestataire'} • Tel : {r.phone}
                      </div>
                    </div>
                    <Badge
                      label={r.status === 'pending' ? 'En attente' : r.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                      variant={r.status === 'pending' ? 'warning' : r.status === 'approved' ? 'success' : 'danger'}
                      size="xs"
                    />
                  </div>

                  <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 14 }}>
                    Demande déposée le{' '}
                    {new Date(r.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>

                  {/* Documents preview */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                    {r.cni_front_url && (
                      <div
                        onClick={() => setZoomImage({ url: r.cni_front_url, title: 'CNI Recto' })}
                        style={{
                          position: 'relative',
                          width: '50%',
                          height: 100,
                          borderRadius: 10,
                          overflow: 'hidden',
                          border: '1px solid #E2E8F0',
                          cursor: 'pointer',
                        }}
                      >
                        <img
                          src={r.cni_front_url}
                          alt="CNI Recto"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 4,
                            left: 4,
                            background: 'rgba(0,0,0,0.65)',
                            color: '#FFFFFF',
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontWeight: 700,
                          }}
                        >
                          Recto
                        </div>
                      </div>
                    )}

                    {r.cni_back_url && (
                      <div
                        onClick={() => setZoomImage({ url: r.cni_back_url, title: 'CNI Verso' })}
                        style={{
                          position: 'relative',
                          width: '50%',
                          height: 100,
                          borderRadius: 10,
                          overflow: 'hidden',
                          border: '1px solid #E2E8F0',
                          cursor: 'pointer',
                        }}
                      >
                        <img
                          src={r.cni_back_url}
                          alt="CNI Verso"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 4,
                            left: 4,
                            background: 'rgba(0,0,0,0.65)',
                            color: '#FFFFFF',
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontWeight: 700,
                          }}
                        >
                          Verso
                        </div>
                      </div>
                    )}
                  </div>

                  {r.review_note && (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        fontSize: 12,
                        color: '#475569',
                        marginBottom: 14,
                      }}
                    >
                      <strong>Note de traitement :</strong> {r.review_note}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {isPending ? (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      onClick={() => handleApprove(r.id, 'verified_id')}
                      disabled={processing}
                      style={{
                        flex: 1,
                        padding: '9px 0',
                        borderRadius: 10,
                        background: '#3B82F6',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      title="Valider la pièce d'identité"
                    >
                      ID Vérifié
                    </button>
                    <button
                      onClick={() => handleApprove(r.id, 'verified')}
                      disabled={processing}
                      style={{
                        flex: 1,
                        padding: '9px 0',
                        borderRadius: 10,
                        background: '#10B981',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      title="Valider en Vérifié Complet"
                    >
                      Vérifié Pro
                    </button>
                    <button
                      onClick={() => setRejectModal({ isOpen: true, requestId: r.id, reason: '' })}
                      disabled={processing}
                      style={{
                        padding: '9px 12px',
                        borderRadius: 10,
                        background: '#FEF2F2',
                        color: '#DC2626',
                        border: '1px solid #FECACA',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      title="Rejeter avec motif"
                    >
                      Rejeter
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 10, textAlign: 'right' }}>
                    Traité par {r.reviewed_by_name || 'Admin'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Zoom Image Modal */}
      <Modal
        isOpen={Boolean(zoomImage)}
        onClose={() => setZoomImage(null)}
        title={zoomImage?.title || 'Visualisation du document'}
        maxWidth={760}
      >
        {zoomImage && (
          <div style={{ textAlign: 'center' }}>
            <img
              src={zoomImage.url}
              alt="Document CNI"
              style={{
                width: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: 12,
                boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
              }}
            />
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, requestId: null, reason: '' })}
        title="Rejeter la demande de vérification"
        maxWidth={460}
      >
        <form onSubmit={handleReject}>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
            Veuillez indiquer le motif du rejet. Ce message sera transmis au prestataire pour lui permettre de corriger sa demande.
          </p>

          <div style={{ marginBottom: 20 }}>
            <textarea
              required
              rows={4}
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="Ex: Photos floues, CNI périmée, nom ne correspondant pas au profil..."
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
              onClick={() => setRejectModal({ isOpen: false, requestId: null, reason: '' })}
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
                background: '#EF4444',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: processing ? 'not-allowed' : 'pointer',
              }}
            >
              {processing ? 'Envoi...' : 'Confirmer le rejet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
