import { create } from 'zustand';
import api from '../services/api';
import i18n from '../i18n';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount:   0,
  loading:       false,
  error:         null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/notifications?limit=50');
      const notifs = res.data.data || [];
      set({ notifications: notifs, unreadCount: notifs.filter(n => !n.is_read).length, loading: false });
      return true;
    } catch (error) {
      set({ loading: false, error: error.userMessage || i18n.t('errors.generic') });
      return false;
    }
  },

  markRead: async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      set((s) => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
        unreadCount: Math.max(0, s.unreadCount - 1),
        error: null,
      }));
    } catch (error) {
      set({ error: error.userMessage || i18n.t('errors.generic') });
    }
  },

  markAllRead: async () => {
    try {
      await api.patch('/notifications/read-all');
      set((s) => ({
        notifications: s.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0,
        error: null,
      }));
    } catch (error) {
      set({ error: error.userMessage || i18n.t('errors.generic') });
    }
  },

  addNotification: (notif) => {
    set((s) => ({ notifications: [notif, ...s.notifications], unreadCount: s.unreadCount + 1 }));
  },
}));
