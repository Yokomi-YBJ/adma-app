import { useState, useEffect } from 'react';
import { User, Lock, Shield, UserPlus, CheckCircle2, UserCheck, UserX } from 'lucide-react';
import api from '../services/api';
import { Spinner } from '../components/common/Spinner';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function ProfilePage() {
  const { admin, updateAdmin } = useAuth();
  const { showToast } = useToast();

  // Profile Form
  const [profileForm, setProfileForm] = useState({ fullName: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  // Admins List
  const [adminsList, setAdminsList] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  // Create Admin Modal
  const [createModal, setCreateModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: '', fullName: '', password: '' });
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  useEffect(() => {
    if (admin) {
      setProfileForm({ fullName: admin.fullName || '', email: admin.email || '' });
    }
    loadAdmins();
  }, [admin]);

  async function loadAdmins() {
    setLoadingAdmins(true);
    try {
      const res = await api.get('/admins');
      setAdminsList(res.data.data || []);
    } catch {
      // Ignored if non-superadmin
    } finally {
      setLoadingAdmins(false);
    }
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await api.put('/profile', profileForm);
      updateAdmin(res.data.data);
      showToast('Profil mis à jour avec succès', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la mise à jour', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('Les deux mots de passe ne correspondent pas', 'warning');
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/profile/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      showToast('Mot de passe changé avec succès', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur changement de mot de passe', 'error');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleCreateAdmin(e) {
    e.preventDefault();
    setCreatingAdmin(true);

    try {
      await api.post('/admins', newAdmin);
      showToast('Nouvel administrateur créé avec succès', 'success');
      setCreateModal(false);
      setNewAdmin({ email: '', fullName: '', password: '' });
      loadAdmins();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la création', 'error');
    } finally {
      setCreatingAdmin(false);
    }
  }

  async function toggleAdmin(id) {
    try {
      const res = await api.patch(`/admins/${id}/toggle`);
      showToast(res.data.message || 'Statut administrateur modifié', 'success');
      loadAdmins();
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur modification statut', 'error');
    }
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0B162C' }}>Mon Profil & Équipe Admin</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
          Gestion de vos accès, sécurité de votre compte et administration des rôles
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 28 }}>
        {/* Profile Card */}
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 24, border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
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
              }}
            >
              <User size={18} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0B162C', margin: 0 }}>
              Informations du compte
            </h3>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 4 }}>
                Nom complet
              </label>
              <input
                type="text"
                required
                value={profileForm.fullName}
                onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
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

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 4 }}>
                Adresse Email
              </label>
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
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

            <button
              type="submit"
              disabled={savingProfile}
              style={{
                padding: '9px 18px',
                borderRadius: 10,
                background: '#5FC2BA',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: savingProfile ? 'not-allowed' : 'pointer',
              }}
            >
              {savingProfile ? 'Enregistrement...' : 'Mettre à jour'}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 24, border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={18} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0B162C', margin: 0 }}>
              Sécurité du mot de passe
            </h3>
          </div>

          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 4 }}>
                Mot de passe actuel
              </label>
              <input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
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

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 4 }}>
                Nouveau mot de passe (8 car. min)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
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

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 4 }}>
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                required
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
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

            <button
              type="submit"
              disabled={savingPassword}
              style={{
                padding: '9px 18px',
                borderRadius: 10,
                background: '#0B162C',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: savingPassword ? 'not-allowed' : 'pointer',
              }}
            >
              {savingPassword ? 'Modification...' : 'Changer le mot de passe'}
            </button>
          </form>
        </div>
      </div>

      {/* Admin Team Management Card */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 24, border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0B162C', margin: 0 }}>
              Équipe d'Administration ({adminsList.length})
            </h3>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Comptes ayant accès à ce portail d'administration
            </p>
          </div>

          <button
            onClick={() => setCreateModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              background: '#5FC2BA',
              color: '#FFFFFF',
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <UserPlus size={14} />
            <span>Ajouter un administrateur</span>
          </button>
        </div>

        {loadingAdmins ? (
          <Spinner center size={28} />
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {['Nom', 'Email', 'Dernière connexion', 'Statut', 'Action'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adminsList.map((adm) => {
                  const isCurrent = adm.id === admin?.id;
                  const isActive = Boolean(adm.is_active);

                  return (
                    <tr key={adm.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0B162C', fontSize: 13 }}>
                        {adm.full_name} {isCurrent && <span style={{ color: '#5FC2BA', fontSize: 11 }}>(Vous)</span>}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748B' }}>
                        {adm.email}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#94A3B8' }}>
                        {adm.last_login_at ? new Date(adm.last_login_at).toLocaleString('fr-FR') : 'Jamais'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Badge label={isActive ? 'Actif' : 'Désactivé'} variant={isActive ? 'success' : 'danger'} size="xs" />
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {!isCurrent && (
                          <button
                            onClick={() => toggleAdmin(adm.id)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              background: isActive ? '#FEF2F2' : '#ECFDF5',
                              border: `1px solid ${isActive ? '#FECACA' : '#A7F3D0'}`,
                              color: isActive ? '#DC2626' : '#059669',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {isActive ? 'Désactiver' : 'Activer'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Créer un administrateur" maxWidth={460}>
        <form onSubmit={handleCreateAdmin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 4 }}>
              Nom complet *
            </label>
            <input
              type="text"
              required
              value={newAdmin.fullName}
              onChange={(e) => setNewAdmin({ ...newAdmin, fullName: e.target.value })}
              placeholder="ex: Jean Dupont"
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
              Email professionnel *
            </label>
            <input
              type="email"
              required
              value={newAdmin.email}
              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
              placeholder="admin@adma.cm"
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

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0B162C', marginBottom: 4 }}>
              Mot de passe initial (8 car. min) *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newAdmin.password}
              onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
              placeholder="••••••••••••"
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setCreateModal(false)}
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
              disabled={creatingAdmin}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                background: '#5FC2BA',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: creatingAdmin ? 'not-allowed' : 'pointer',
              }}
            >
              {creatingAdmin ? 'Création...' : 'Créer l’administrateur'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
