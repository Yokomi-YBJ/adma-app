import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';

export const useNetworkStore = create((set) => ({
  isOnline: true,
  connectionType: null,
  subscribe: () => {
    const unsub = NetInfo.addEventListener((state) => {
      set({ isOnline: state.isConnected && state.isInternetReachable !== false, connectionType: state.type });
    });
    return unsub;
  },
}));
