import { create } from 'zustand';

export const useModalStore = create((set, get) => ({
  queue: [],
  currentModal: null,

  show: ({
    type = 'error', // 'error' | 'warning' | 'success' | 'info' | 'network' | 'session' | 'permission' | 'payment'
    title = '',
    message = '',
    confirmText = null,
    cancelText = null,
    onConfirm = null,
    onCancel = null,
    destructive = false,
    dismissible = true,
  }) => {
    const newModal = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm,
      onCancel,
      destructive,
      dismissible: dismissible !== false,
    };

    const current = get().currentModal;
    if (!current) {
      set({ currentModal: newModal });
    } else {
      set((state) => ({ queue: [...state.queue, newModal] }));
    }
  },

  confirm: () => {
    const { currentModal, queue } = get();
    if (currentModal?.onConfirm) {
      try {
        currentModal.onConfirm();
      } catch (e) {
        console.error('[useModalStore] onConfirm error:', e);
      }
    }

    if (queue.length > 0) {
      const [next, ...remaining] = queue;
      set({ currentModal: next, queue: remaining });
    } else {
      set({ currentModal: null });
    }
  },

  dismiss: () => {
    const { currentModal, queue } = get();
    if (currentModal && !currentModal.dismissible) {
      return; // Ne pas fermer un modal non-dismissible
    }

    if (currentModal?.onCancel) {
      try {
        currentModal.onCancel();
      } catch (e) {
        console.error('[useModalStore] onCancel error:', e);
      }
    }

    if (queue.length > 0) {
      const [next, ...remaining] = queue;
      set({ currentModal: next, queue: remaining });
    } else {
      set({ currentModal: null });
    }
  },

  clear: () => set({ queue: [], currentModal: null }),
}));
