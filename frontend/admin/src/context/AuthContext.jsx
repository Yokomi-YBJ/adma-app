import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('adma_admin_user'));
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adma_admin_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.get('/auth/me')
      .then((res) => {
        setAdmin(res.data.data);
        localStorage.setItem('adma_admin_user', JSON.stringify(res.data.data));
      })
      .catch(() => {
        localStorage.removeItem('adma_admin_token');
        localStorage.removeItem('adma_admin_user');
        setAdmin(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  function login(token, adminData) {
    localStorage.setItem('adma_admin_token', token);
    localStorage.setItem('adma_admin_user', JSON.stringify(adminData));
    setAdmin(adminData);
  }

  function logout() {
    localStorage.removeItem('adma_admin_token');
    localStorage.removeItem('adma_admin_user');
    setAdmin(null);
  }

  function updateAdmin(updatedData) {
    const newAdmin = { ...admin, ...updatedData };
    localStorage.setItem('adma_admin_user', JSON.stringify(newAdmin));
    setAdmin(newAdmin);
  }

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, updateAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
