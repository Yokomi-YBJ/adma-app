import { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2, FolderPlus, CheckCircle2, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { Spinner } from '../components/common/Spinner';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useToast } from '../context/ToastContext';

export function CategoriesPage() {
  const { showToast } = useToast();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({
    nameFr: '',
    nameEn: '',
    nameFul: '',
    parentId: '',
    icon: '',
    sortOrder: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete modal
  const [deleteState, setDeleteState] = useState({ isOpen: false, category: null, loading: false });

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data || []);
    } catch {
      showToast('Erreur chargement des catégories', 'error');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal(parentId = '') {
    setEditingCategory(null);
    setForm({
      nameFr: '',
      nameEn: '',
      nameFul: '',
      parentId: parentId ? String(parentId) : '',
      icon: '',
      sortOrder: 0,
    });
    setModalOpen(true);
  }

  function openEditModal(cat) {
    setEditingCategory(cat);
    setForm({
      nameFr: cat.name_fr || '',
      nameEn: cat.name_en || '',
      nameFul: cat.name_ful || '',
      parentId: cat.parent_id ? String(cat.parent_id) : '',
      icon: cat.icon || '',
      sortOrder: cat.sort_order || 0,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        nameFr: form.nameFr.trim(),
        nameEn: form.nameEn.trim(),
        nameFul: form.nameFul.trim(),
        parentId: form.parentId ? parseInt(form.parentId, 10) : null,
        icon: form.icon.trim() || null,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      };

      if (editingCategory) {
        await api.patch(`/categories/${editingCategory.id}`, payload);
        showToast('Catégorie mise à jour avec succès', 'success');
      } else {
        await api.post('/categories', payload);
        showToast('Catégorie créée avec succès', 'success');
      }

      setModalOpen(false);
      loadCategories();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de l’enregistrement', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteCategory() {
    const { category } = deleteState;
    setDeleteState((prev) => ({ ...prev, loading: true }));

    try {
      await api.delete(`/categories/${category.id}`);
      showToast('Catégorie supprimée avec succès', 'success');
      setDeleteState({ isOpen: false, category: null, loading: false });
      loadCategories();
    } catch (err) {
      showToast(err.response?.data?.message || 'Impossible de supprimer cette catégorie', 'error');
      setDeleteState((prev) => ({ ...prev, loading: false }));
    }
  }

  const parentCategories = categories.filter((c) => !c.parent_id);

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0B162C' }}>Catégories & Métiers</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Organisation des métiers en Français, Anglais et Fulfulde pour l'application mobile
          </p>
        </div>

        <button
          onClick={() => openCreateModal('')}
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
          <span>Nouvelle catégorie</span>
        </button>
      </div>

      {loading ? (
        <Spinner center size={36} text="Chargement des catégories..." />
      ) : categories.length === 0 ? (
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 48, textAlign: 'center', color: '#94A3B8' }}>
          Aucune catégorie créée.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {parentCategories.map((parent) => {
            const subcats = categories.filter((c) => c.parent_id === parent.id);

            return (
              <div
                key={parent.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  border: '1px solid #E2E8F0',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                {/* Parent category header */}
                <div
                  style={{
                    padding: '16px 20px',
                    background: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: '#5FC2BA',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Layers size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#0B162C' }}>
                        {parent.name_fr}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>
                        EN: {parent.name_en} • FUL: {parent.name_ful || '—'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>
                      {parent.provider_count || 0} prestataires rattachés
                    </span>

                    <button
                      onClick={() => openCreateModal(parent.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        background: '#EBF7F7',
                        border: '1px solid #9FDEDA',
                        color: '#0D9488',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title="Ajouter un sous-métier"
                    >
                      <Plus size={13} />
                      <span>Sous-catégorie</span>
                    </button>

                    <button
                      onClick={() => openEditModal(parent)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        color: '#0B162C',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      onClick={() => setDeleteState({ isOpen: true, category: parent, loading: false })}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        color: '#EF4444',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Subcategories list */}
                {subcats.length > 0 ? (
                  <div style={{ padding: '8px 20px' }}>
                    {subcats.map((sub) => (
                      <div
                        key={sub.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 0',
                          borderBottom: '1px solid #F1F5F9',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 16 }}>
                          <ChevronRight size={14} color="#94A3B8" />
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#0B162C' }}>
                              {sub.name_fr}
                            </span>
                            <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 8 }}>
                              ({sub.name_en} / {sub.name_ful || '—'})
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 12, color: '#64748B' }}>
                            {sub.provider_count || 0} prestataires
                          </span>

                          <button
                            onClick={() => openEditModal(sub)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748B',
                              cursor: 'pointer',
                              padding: 4,
                            }}
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            onClick={() => setDeleteState({ isOpen: true, category: sub, loading: false })}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#EF4444',
                              cursor: 'pointer',
                              padding: 4,
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '14px 20px', fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>
                    Aucune sous-catégorie pour le moment.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Modifier la catégorie' : 'Créer une catégorie'}
        maxWidth={520}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 4 }}>
              Nom en Français (ex: Mécanicien, Électricien...) *
            </label>
            <input
              type="text"
              required
              value={form.nameFr}
              onChange={(e) => setForm({ ...form, nameFr: e.target.value })}
              placeholder="Français"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 10,
                border: '1.5px solid #E2E8F0',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 4 }}>
              Nom en Anglais (ex: Mechanic, Electrician...) *
            </label>
            <input
              type="text"
              required
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              placeholder="English"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 10,
                border: '1.5px solid #E2E8F0',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 4 }}>
              Nom en Fulfulde (Pulaar)
            </label>
            <input
              type="text"
              value={form.nameFul}
              onChange={(e) => setForm({ ...form, nameFul: e.target.value })}
              placeholder="Fulfulde"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 10,
                border: '1.5px solid #E2E8F0',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 4 }}>
              Catégorie parente
            </label>
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 10,
                border: '1.5px solid #E2E8F0',
                fontSize: 14,
                background: '#FFFFFF',
              }}
            >
              <option value="">Aucune (Catégorie principale)</option>
              {parentCategories
                .filter((p) => !editingCategory || p.id !== editingCategory.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_fr}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 4 }}>
                Identifiant Icône
              </label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="ex: wrench, car, zap"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: '1.5px solid #E2E8F0',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 4 }}>
                Ordre de tri
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: '1.5px solid #E2E8F0',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
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
              {submitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={deleteState.isOpen}
        onClose={() => setDeleteState({ isOpen: false, category: null, loading: false })}
        onConfirm={handleDeleteCategory}
        loading={deleteState.loading}
        title="Supprimer la catégorie"
        message={`Êtes-vous certain de vouloir supprimer la catégorie "${deleteState.category?.name_fr}" ?`}
        variant="danger"
        confirmText="Supprimer"
      />
    </div>
  );
}
