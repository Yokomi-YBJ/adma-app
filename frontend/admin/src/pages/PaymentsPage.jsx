import { useState, useEffect } from 'react';
import { CircleDollarSign, Search, CheckCircle2, Clock, XCircle, ArrowUpRight } from 'lucide-react';
import api from '../services/api';
import { Spinner } from '../components/common/Spinner';
import { Badge } from '../components/common/Badge';
import { Pagination } from '../components/common/Pagination';
import { useToast } from '../context/ToastContext';

export function PaymentsPage() {
  const { showToast } = useToast();

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ totalSuccess: 0, countSuccess: 0, countFailed: 0, countPending: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState('all');
  const [operator, setOperator] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    loadPayments(1);
  }, [status, operator]);

  async function loadPayments(page = pagination.page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 20,
        status,
        operator,
        ...(q.trim() && { q: q.trim() }),
      });

      const res = await api.get(`/payments?${params.toString()}`);
      setPayments(res.data.data.payments || []);
      if (res.data.data.summary) {
        setSummary(res.data.data.summary);
      }
      if (res.data.data.pagination) {
        setPagination(res.data.data.pagination);
      }
    } catch {
      showToast('Erreur lors du chargement des paiements', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    loadPayments(1);
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0B162C' }}>Paiements & Transactions</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
          Historique des transactions Mobile Money (Orange Money, MTN MoMo) via KPay
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#FFFFFF', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Volume Encaissé</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981', marginTop: 4 }}>
            {summary.totalSuccess?.toLocaleString('fr-FR')} FCFA
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Paiements Réussis</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0B162C', marginTop: 4 }}>
            {summary.countSuccess}
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Paiements en attente</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#F59E0B', marginTop: 4 }}>
            {summary.countPending}
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Échecs ou Refus</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#EF4444', marginTop: 4 }}>
            {summary.countFailed}
          </div>
        </div>
      </div>

      {/* Filters */}
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
              placeholder="Rechercher par référence, téléphone payeur ou nom..."
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
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1.5px solid #E2E8F0',
              fontSize: 13,
              color: '#0B162C',
              background: '#FFFFFF',
            }}
          >
            <option value="all">Tous les opérateurs</option>
            <option value="orange_cmr">Orange Money</option>
            <option value="mtn_momo_cmr">MTN MoMo</option>
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
            <option value="completed">Complétés</option>
            <option value="pending">En attente</option>
            <option value="failed">Échoués</option>
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
                {['Prestataire', 'Payeur', 'Opérateur', 'Montant', 'Réf. Transaction', 'Date', 'Statut'].map((h) => (
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
                    <Spinner size={30} text="Chargement des paiements..." />
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
                    Aucune transaction trouvée.
                  </td>
                </tr>
              ) : (
                payments.map((pay) => {
                  const isSuccess = pay.status === 'completed';
                  const isFailed = pay.status === 'failed';
                  const isPending = pay.status === 'pending';

                  return (
                    <tr key={pay.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <strong style={{ color: '#0B162C', fontSize: 14 }}>{pay.provider_name}</strong>
                        <div style={{ fontSize: 11, color: '#64748B' }}>Plan : {pay.provider_plan}</div>
                      </td>

                      <td style={{ padding: '14px 18px', fontSize: 13, color: '#0B162C' }}>
                        <div>{pay.phone_number || pay.user_phone}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>{pay.user_name}</div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: pay.mobile_operator === 'orange_cmr' ? '#FFF7ED' : '#FEF9C3',
                            color: pay.mobile_operator === 'orange_cmr' ? '#C2410C' : '#854D0E',
                            border: `1px solid ${pay.mobile_operator === 'orange_cmr' ? '#FFEDD5' : '#FEF08A'}`,
                          }}
                        >
                          {pay.mobile_operator === 'orange_cmr' ? 'Orange Money' : 'MTN MoMo'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', fontSize: 14, fontWeight: 800, color: '#0B162C' }}>
                        {pay.amount?.toLocaleString('fr-FR')} {pay.currency || 'XAF'}
                      </td>

                      <td style={{ padding: '14px 18px', fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>
                        <div>{pay.kpay_reference || pay.kpay_payment_id || `PAY#${pay.id}`}</div>
                        {pay.failure_reason && (
                          <div style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>{pay.failure_reason}</div>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px', fontSize: 12, color: '#64748B' }}>
                        {new Date(pay.created_at).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <Badge
                          label={isSuccess ? 'Succès' : isPending ? 'En attente' : isFailed ? 'Échoué' : pay.status}
                          variant={isSuccess ? 'success' : isPending ? 'warning' : 'danger'}
                          size="xs"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination pagination={pagination} onPageChange={(p) => loadPayments(p)} />
      </div>
    </div>
  );
}
