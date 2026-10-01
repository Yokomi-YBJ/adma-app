import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Briefcase,
  ShieldCheck,
  Flag,
  CircleDollarSign,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '../services/api';
import { StatCard } from '../components/common/StatCard';
import { Spinner } from '../components/common/Spinner';
import { Badge } from '../components/common/Badge';

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const res = await api.get('/stats/dashboard');
      setData(res.data.data);
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Spinner center size={40} text="Chargement du tableau de bord..." />;
  if (!data) return <div style={{ color: '#EF4444', padding: 20 }}>Impossible de charger les statistiques.</div>;

  const revenueGrowth =
    data.revenuePrevMonth > 0
      ? Math.round(((data.revenueThisMonth - data.revenuePrevMonth) / data.revenuePrevMonth) * 100)
      : data.revenueThisMonth > 0
      ? 100
      : 0;

  const planColors = {
    free: '#94A3B8',
    premium: '#5FC2BA',
    professional: '#1C2942',
    enterprise: '#0B162C',
  };

  return (
    <div className="fade-in">
      {/* Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0B162C' }}>Tableau de bord</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
          Vue d'ensemble en temps réel des activités et performances d'ADMA
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid-cards" style={{ marginBottom: 28 }}>
        <StatCard
          label="Utilisateurs"
          value={data.users?.toLocaleString('fr-FR')}
          sub={`+${data.newUsers30d} ces 30 derniers jours`}
          icon={Users}
          color="#5FC2BA"
        />

        <StatCard
          label="Prestataires"
          value={data.providers?.toLocaleString('fr-FR')}
          sub={`${data.verifiedProviders} certifiés / vérifiés`}
          icon={Briefcase}
          color="#1C2942"
        />

        <StatCard
          label="Revenus du mois"
          value={`${data.revenueThisMonth?.toLocaleString('fr-FR')} FCFA`}
          sub={revenueGrowth >= 0 ? `+${revenueGrowth}% vs mois passé` : `${revenueGrowth}% vs mois passé`}
          icon={CircleDollarSign}
          color="#10B981"
          trend={revenueGrowth}
        />

        <StatCard
          label="Vérifications en attente"
          value={data.pendingVerifications}
          sub={data.pendingVerifications > 0 ? 'Action requise' : 'À jour'}
          icon={ShieldCheck}
          color={data.pendingVerifications > 0 ? '#F59E0B' : '#10B981'}
        />

        <StatCard
          label="Signalements"
          value={data.pendingReports}
          sub={data.pendingReports > 0 ? 'Cas non résolus' : 'Aucun litige'}
          icon={Flag}
          color={data.pendingReports > 0 ? '#EF4444' : '#10B981'}
        />

        <StatCard
          label="Avis & Recommandations"
          value={data.reviews?.toLocaleString('fr-FR')}
          sub="Évaluations vérifiées"
          icon={MessageSquare}
          color="#3B82F6"
        />
      </div>

      {/* Main Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Daily Registrations */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '22px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0B162C' }}>
              Nouvelles inscriptions (30 jours)
            </h3>
            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Total : {data.newUsers30d}</span>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.dailyRegistrations}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickFormatter={(d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
              <Tooltip
                formatter={(v) => [v, 'Inscriptions']}
                labelFormatter={(d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              />
              <Line type="monotone" dataKey="count" stroke="#5FC2BA" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Plan Distribution */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '22px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0B162C' }}>
              Répartition des plans d'abonnement
            </h3>
            <Link to="/subscriptions" style={{ fontSize: 12, color: '#5FC2BA', textDecoration: 'none', fontWeight: 600 }}>
              Gérer →
            </Link>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data.planDistribution}
                dataKey="count"
                nameKey="plan"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                label={({ plan, percent }) => `${plan} ${(percent * 100).toFixed(0)}%`}
                fontSize={11}
              >
                {data.planDistribution?.map((p) => (
                  <Cell key={p.plan} fill={planColors[p.plan] || '#5FC2BA'} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [v, 'Prestataires']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Row: Cities and Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Providers by city */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '22px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0B162C' }}>
              Prestataires par Ville
            </h3>
            <Link to="/providers" style={{ fontSize: 12, color: '#5FC2BA', textDecoration: 'none', fontWeight: 600 }}>
              Voir tous →
            </Link>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.cityDistribution} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#0B162C' }} width={110} />
              <Tooltip />
              <Bar dataKey="count" fill="#1C2942" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Admin Actions */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '22px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0B162C' }}>
              Dernières actions d'administration
            </h3>
            <Link to="/logs" style={{ fontSize: 12, color: '#5FC2BA', textDecoration: 'none', fontWeight: 600 }}>
              Historique complet →
            </Link>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.recentActions?.length > 0 ? (
              data.recentActions.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: '#5FC2BA20',
                        color: '#0D9488',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {log.admin_name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0B162C' }}>
                        {log.admin_name} • <span style={{ color: '#64748B' }}>{log.action}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>
                        {new Date(log.created_at).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  <Badge label={log.target_type || 'système'} variant="default" size="xs" />
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>
                Aucune action récente
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
