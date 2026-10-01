import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, KeyRound, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminId, setAdminId] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSendOTP(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      setAdminId(res.data.data.adminId);
      setStep(2);
      showToast('Un code de vérification a été envoyé par email', 'info');
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/verify-otp', { adminId, code });
      login(res.data.data.token, res.data.data.admin);
      showToast('Connexion réussie ! Bienvenue.', 'success');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Code de vérification invalide ou expiré');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0B162C 0%, #1C2942 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 68,
              height: 68,
              borderRadius: 22,
              background: '#5FC2BA',
              marginBottom: 16,
              boxShadow: '0 8px 30px rgba(95, 194, 186, 0.35)',
            }}
          >
            <span style={{ fontSize: 34, fontWeight: 900, color: '#FFFFFF' }}>A</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#FFFFFF', letterSpacing: 4 }}>ADMA</h1>
          <p style={{ fontSize: 14, color: '#94A3B8', marginTop: 4 }}>Portail d'Administration Sécurisé</p>
        </div>

        {/* Card */}
        <div
          className="fade-in"
          style={{
            background: '#FFFFFF',
            borderRadius: 24,
            padding: 36,
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          }}
        >
          {error && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                padding: '12px 16px',
                borderRadius: 12,
                fontSize: 13,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOTP}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0B162C', marginBottom: 6 }}>
                Connexion
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 24 }}>
                Saisissez vos identifiants pour recevoir un code OTP
              </p>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0B162C', marginBottom: 6 }}>
                  Email Administrateur
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color="#94A3B8" style={{ position: 'absolute', left: 14, top: 15 }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@adma.cm"
                    style={{
                      width: '100%',
                      padding: '13px 14px 13px 44px',
                      borderRadius: 12,
                      border: '1.5px solid #E2E8F0',
                      fontSize: 15,
                      color: '#0B162C',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 26 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0B162C', marginBottom: 6 }}>
                  Mot de passe
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="#94A3B8" style={{ position: 'absolute', left: 14, top: 15 }} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    style={{
                      width: '100%',
                      padding: '13px 14px 13px 44px',
                      borderRadius: 12,
                      border: '1.5px solid #E2E8F0',
                      fontSize: 15,
                      color: '#0B162C',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 12,
                  background: '#5FC2BA',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(95, 194, 186, 0.4)',
                }}
              >
                <span>{loading ? 'Vérification...' : 'Continuer avec OTP'}</span>
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0B162C', marginBottom: 6 }}>
                Code de Vérification
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 24 }}>
                Un code à 6 chiffres a été envoyé à <strong>{email}</strong>
              </p>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0B162C', marginBottom: 6 }}>
                  Code OTP (6 chiffres)
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={18} color="#94A3B8" style={{ position: 'absolute', left: 14, top: 15 }} />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    style={{
                      width: '100%',
                      padding: '13px 14px 13px 44px',
                      borderRadius: 12,
                      border: '1.5px solid #E2E8F0',
                      fontSize: 18,
                      letterSpacing: 6,
                      fontWeight: 700,
                      color: '#0B162C',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 12,
                  background: '#5FC2BA',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: loading || code.length !== 6 ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(95, 194, 186, 0.4)',
                }}
              >
                <span>{loading ? 'Validation...' : 'Valider et accéder'}</span>
                {!loading && <ShieldCheck size={18} />}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  width: '100%',
                  marginTop: 14,
                  padding: 10,
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <ArrowLeft size={16} />
                <span>Retour aux identifiants</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
