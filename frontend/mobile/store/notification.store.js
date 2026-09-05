import { create } from 'zustand';
import api from '../services/api';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount:   0,
  loading:       false,

  load: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/notifications?limit=50');
      const notifs = res.data.data || [];
      set({ notifications: notifs, unreadCount: notifs.filter(n => !n.is_read).length, loading: false });
    } catch { set({ loading: false }); }
  },

  markRead: async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    set((s) => ({
      notifications: s.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
      unreadCount:   Math.max(0, s.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    set((s) => ({ notifications: s.notifications.map(n => ({ ...n, is_read: true })), unreadCount: 0 }));
  },

  addNotification: (notif) => {
    set((s) => ({ notifications: [notif, ...s.notifications], unreadCount: s.unreadCount + 1 }));
  },
}));
