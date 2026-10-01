import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/layout/Layout';
import { Spinner } from './components/common/Spinner';

// Lazy loading all pages for fast bundle & initial load
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const UsersPage = lazy(() => import('./pages/UsersPage').then((m) => ({ default: m.UsersPage })));
const ProvidersPage = lazy(() => import('./pages/ProvidersPage').then((m) => ({ default: m.ProvidersPage })));
const VerificationsPage = lazy(() => import('./pages/VerificationsPage').then((m) => ({ default: m.VerificationsPage })));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage').then((m) => ({ default: m.ReviewsPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage').then((m) => ({ default: m.SubscriptionsPage })));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage })));
const AdminLogsPage = lazy(() => import('./pages/AdminLogsPage').then((m) => ({ default: m.AdminLogsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));

function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={36} text="Authentification..." />
      </div>
    );
  }

  return admin ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense
            fallback={
              <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spinner size={36} text="Chargement d'ADMA Admin..." />
              </div>
            }
          >
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/users" element={<UsersPage />} />
                        <Route path="/providers" element={<ProvidersPage />} />
                        <Route path="/verifications" element={<VerificationsPage />} />
                        <Route path="/reviews" element={<ReviewsPage />} />
                        <Route path="/reports" element={<ReportsPage />} />
                        <Route path="/subscriptions" element={<SubscriptionsPage />} />
                        <Route path="/payments" element={<PaymentsPage />} />
                        <Route path="/categories" element={<CategoriesPage />} />
                        <Route path="/logs" element={<AdminLogsPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
