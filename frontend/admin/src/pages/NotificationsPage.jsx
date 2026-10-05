import { useState, useEffect } from 'react';
import {
  Bell, Send, Megaphone, Gift, Info, AlertCircle, Radio, Calendar,
  Users, Briefcase, Layers, Tag, History, Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import api from '../services/api';
import { Spinner } from '../components/common/Spinner';
import { Badge } from '../components/common/Badge';
import { Pagination } from '../components/common/Pagination';
import { useToast } from '../context/ToastContext';

const TYPES = [
  { id: 'ad',           label: 'Publicité',        icon: Megaphone,    color: '#7C3AED', bg: '#FAF5FF' },
  { id: 'promo',        label: 'Promotion',        icon: Gift,         color: '#EC4899', bg: '#FDF2F8' },
  { id: 'announcement', label: 'Annonce',          icon: Radio,        color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'info',         label: 'Information',      icon: Info,         color: '#0D9488', bg: '#F0FDFA' },
  { id: 'important',    label: 'Message important', icon: AlertCircle, color: '#DC2626', bg: '#FEF2F2' },
];

const TARGETS = [
  { id: 'all',       label: 'Tous les utilisateurs',       icon: Users },
  { id: 'providers', label: 'Tous les prestataires',        icon: Briefcase },
  { id: 'plan',      label: 'Prestataires par plan',        icon: Layers },
  { id: 'category',  label: 'Prestataires par catégorie',   icon: Tag },
];

const PLAN_LABELS = {
  free:         'Gratuit',
  premium:      'Premium',
  professional: 'Professionnel',
  enterprise:   'Entreprise',
};

export function NotificationsPage() {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('compose'); // 'compose' | 'history'

  // Form
  const [form, setForm] = useState({
    titleFr:     '',
    titleEn:     '',
    titleFul:    '',
    bodyFr:      '',
    bodyEn:      '',
    bodyFul:     '',
    type:        'info',
    targetType:  'all',
    targetValue: '',
    scheduledAt: '',
  });
  const [sending, setSending] = useState(false);

  // Targets disponibles (plans + catégories)
  const [availableTargets, setAvailableTargets] = useState({ plans: [], categories: [] });

  // History
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadAvailableTargets();
    loadHistory(1);
  }, []);

  async function loadAvailableTargets() {
    try {
      const res = await api.get('/notifications/targets');
      setAvailableTargets(res.data.data || { plans: [], categories: [] });
    } catch {
      // Silencieux
    }
  }

  async function loadHistory(page = 1) {
    setLoadingHistory(true);
    try {
      const res = await api.get(`/notifications/history?page=${page}&limit=20`);
      setHistory(res.data.data.broadcasts || []);
      setPagination(res.data.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch {
      showToast('Erreur chargement de l\'historique', 'error');
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.titleFr.trim() || !form.bodyFr.trim()) {
      showToast('Titre et message en français requis', 'warning');
      return;
    }
    if (['plan', 'category'].includes(form.targetType) && !form.targetValue) {
      showToast('Sélectionnez une cible', 'warning');
      return;
    }

    setSending(true);
    try {
      const payload = {
        titleFr:     form.titleFr.trim(),
        titleEn:     form.titleEn.trim() || undefined,
        titleFul:    form.titleFul.trim() || undefined,
        bodyFr:      form.bodyFr.trim(),
        bodyEn:      form.bodyEn.trim() || undefined,
        bodyFul:     form.bodyFul.trim() || undefined,
        type:        form.type,
        targetType:  form.targetType,
        targetValue: form.targetValue || undefined,
        scheduledAt: form.scheduledAt || undefined,
      };

      const res = await api.post('/notifications/broadcast', payload);
      const wasScheduled = !!form.scheduledAt;

      showToast(
        wasScheduled
          ? `Notification programmée pour le ${new Date(form.scheduledAt).toLocaleString('fr-FR')}`
          : 'Envoi en cours...',
        'success'
      );

      // Reset
      setForm({
        titleFr: '', titleEn: '', titleFul: '',
        bodyFr: '', bodyEn: '', bodyFul: '',
        type: 'info', targetType: 'all', targetValue: '', scheduledAt: '',
      });

      // Bascule sur l'historique pour voir le statut
      setActiveTab('history');
      loadHistory(1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de l\'envoi', 'error');
    } finally {
      setSending(false);
    }
  }

  function getTypeConfig(typeId) {
    return TYPES.find((t) => t.id === typeId) || TYPES[3];
  }

  function getTargetLabel(b) {
    switch (b.target_type) {
      case 'all':       return 'Tous les utilisateurs';
      case 'providers': return 'Tous les prestataires';
      case 'plan':      return `Plan ${PLAN_LABELS[b.target_value] || b.target_value}`;
      case 'category':  return `Catégorie #${b.target_value}`;
      default:          return b.target_type;
    }
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0B162C', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={24} />
          Notifications & Communication
        </h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
          Envoyez des annonces, promotions et messages ciblés à vos utilisateurs
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #E2E8F0' }}>
        {[
          { id: 'compose', label: 'Nouvelle notification', icon: Send },
          { id: 'history', label: 'Historique', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${isActive ? '#5FC2BA' : 'transparent'}`,
                color: isActive ? '#0B162C' : '#64748B',
                fontSize: 14,
                fontWeight: isActive ? 700 : 600,
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'all 0.15s',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenu */}
      {activeTab === 'compose' ? (
        <form onSubmit={handleSubmit}>
          {/* Section Type */}
          <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 24, border: '1px solid #E2E8F0', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0B162C', marginBottom: 16 }}>
              1. Type de notification
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = form.type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm({ ...form, type: t.id })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 12,
                      borderRadius: 12,
                      border: `2px solid ${isSelected ? t.color : '#E2E8F0'}`,
                      background: isSelected ? t.bg : '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Icon size={18} color={t.color} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? t.color : '#475569' }}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section Cible */}
          <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 24, border: '1px solid #E2E8F0', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0B162C', marginBottom: 16 }}>
              2. Destinataires
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
              {TARGETS.map((t) => {
                const Icon = t.icon;
                const isSelected = form.targetType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm({ ...form, targetType: t.id, targetValue: '' })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 12,
                      borderRadius: 12,
                      border: `2px solid ${isSelected ? '#5FC2BA' : '#E2E8F0'}`,
                      background: isSelected ? '#EBF7F7' : '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Icon size={18} color={isSelected ? '#0D9488' : '#64748B'} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#0D9488' : '#475569' }}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sous-cible plan */}
            {form.targetType === 'plan' && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 6 }}>
                  Plan ciblé *
                </label>
                <select
                  value={form.targetValue}
                  onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                  style={{
                    width: '100%',
                    maxWidth: 320,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #E2E8F0',
                    fontSize: 13,
                    background: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">-- Choisir un plan --</option>
                  {availableTargets.plans.map((p) => (
                    <option key={p} value={p}>{PLAN_LABELS[p] || p}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sous-cible catégorie */}
            {form.targetType === 'category' && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 6 }}>
                  Catégorie ciblée *
                </label>
                <select
                  value={form.targetValue}
                  onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                  style={{
                    width: '100%',
                    maxWidth: 320,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #E2E8F0',
                    fontSize: 13,
                    background: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">-- Choisir une catégorie --</option>
                  {availableTargets.categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name_fr}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Section Contenu */}
          <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 24, border: '1px solid #E2E8F0', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0B162C', marginBottom: 16 }}>
              3. Contenu du message
            </h3>

            {/* Titre FR */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 6 }}>
                Titre (Français) *
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={form.titleFr}
                onChange={(e) => setForm({ ...form, titleFr: e.target.value })}
                placeholder="Ex: Nouvelle fonctionnalité disponible !"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1.5px solid #E2E8F0',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Message FR */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 6 }}>
                Message (Français) *
              </label>
              <textarea
                required
                maxLength={500}
                rows={3}
                value={form.bodyFr}
                onChange={(e) => setForm({ ...form, bodyFr: e.target.value })}
                placeholder="Décrivez votre annonce en quelques phrases..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1.5px solid #E2E8F0',
                  fontSize: 14,
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, textAlign: 'right' }}>
                {form.bodyFr.length}/500 caractères
              </div>
            </div>

            {/* Traductions optionnelles */}
            <details style={{ marginTop: 12 }}>
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#5FC2BA',
                  padding: '8px 0',
                }}
              >
                Ajouter des traductions (Anglais, Fulfulde) — optionnel
              </summary>
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 6 }}>
                      Titre (Anglais)
                    </label>
                    <input
                      type="text"
                      maxLength={200}
                      value={form.titleEn}
                      onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                      placeholder="Optionnel"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1.5px solid #E2E8F0',
                        fontSize: 14,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 6 }}>
                      Titre (Fulfulde)
                    </label>
                    <input
                      type="text"
                      maxLength={200}
                      value={form.titleFul}
                      onChange={(e) => setForm({ ...form, titleFul: e.target.value })}
                      placeholder="Optionnel"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1.5px solid #E2E8F0',
                        fontSize: 14,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 6 }}>
                      Message (Anglais)
                    </label>
                    <textarea
                      maxLength={500}
                      rows={2}
                      value={form.bodyEn}
                      onChange={(e) => setForm({ ...form, bodyEn: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1.5px solid #E2E8F0',
                        fontSize: 14,
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 6 }}>
                      Message (Fulfulde)
                    </label>
                    <textarea
                      maxLength={500}
                      rows={2}
                      value={form.bodyFul}
                      onChange={(e) => setForm({ ...form, bodyFul: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1.5px solid #E2E8F0',
                        fontSize: 14,
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Section Programmation */}
          <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 24, border: '1px solid #E2E8F0', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0B162C', marginBottom: 16 }}>
              4. Envoi
            </h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 6 }}>
                  Programmer (optionnel)
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #E2E8F0',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                  Laissez vide pour un envoi immédiat. Précision de livraison ±5 minutes.
                </div>
              </div>
            </div>
          </div>

          {/* Bouton envoyer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="submit"
              disabled={sending || !form.titleFr.trim() || !form.bodyFr.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 28px',
                borderRadius: 12,
                background: '#5FC2BA',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 15,
                fontWeight: 700,
                cursor: sending || !form.titleFr.trim() || !form.bodyFr.trim() ? 'not-allowed' : 'pointer',
                opacity: sending || !form.titleFr.trim() || !form.bodyFr.trim() ? 0.6 : 1,
                boxShadow: '0 4px 12px rgba(95, 194, 186, 0.3)',
              }}
            >
              <Send size={18} />
              <span>{sending ? 'Envoi...' : form.scheduledAt ? 'Programmer' : 'Envoyer maintenant'}</span>
            </button>
          </div>
        </form>
      ) : (
        /* Historique */
        <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {['Titre', 'Type', 'Cible', 'Envoyé le', 'Destinataires', 'Statut'].map((h) => (
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
                {loadingHistory ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 48, textAlign: 'center' }}>
                      <Spinner size={30} text="Chargement de l'historique..." />
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
                      Aucune notification envoyée pour le moment.
                    </td>
                  </tr>
                ) : (
                  history.map((b) => {
                    const typeConf = getTypeConfig(b.type);
                    const Icon = typeConf.icon;
                    const isSent = b.status === 'sent';
                    const isScheduled = b.status === 'scheduled';
                    const isFailed = b.status === 'failed';
                    const isSending = b.status === 'sending';

                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, color: '#0B162C', fontSize: 14, marginBottom: 2 }}>
                            {b.title_fr}
                          </div>
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>
                            par {b.admin_name}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Icon size={14} color={typeConf.color} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: typeConf.color }}>
                              {typeConf.label}
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px', fontSize: 13, color: '#475569' }}>
                          {getTargetLabel(b)}
                        </td>

                        <td style={{ padding: '14px 18px', fontSize: 12, color: '#64748B' }}>
                          {b.sent_at
                            ? new Date(b.sent_at).toLocaleString('fr-FR', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                              })
                            : isScheduled
                            ? `Prévu : ${new Date(b.scheduled_at).toLocaleString('fr-FR', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                              })}`
                            : '—'}
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          {isSent ? (
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0B162C' }}>
                              {b.recipients_count}
                              {b.failed_count > 0 && (
                                <span style={{ fontSize: 11, color: '#EF4444', marginLeft: 4 }}>
                                  ({b.failed_count} échecs)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: '#94A3B8' }}>—</span>
                          )}
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <Badge
                            label={
                              isSent ? 'Envoyée'
                              : isScheduled ? 'Programmée'
                              : isSending ? 'En cours'
                              : isFailed ? 'Échouée'
                              : b.status
                            }
                            variant={
                              isSent ? 'success'
                              : isScheduled ? 'warning'
                              : isSending ? 'primary'
                              : isFailed ? 'danger'
                              : 'default'
                            }
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

          <Pagination pagination={pagination} onPageChange={(p) => loadHistory(p)} />
        </div>
      )}
    </div>
  );
}