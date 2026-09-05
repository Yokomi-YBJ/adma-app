/**
 * ADMA — Service Notifications Push (Expo EAS)
 */
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import api from './api';
import { useNotificationStore } from '../store/notification.store';

// Vérification si l'app tourne sous Expo Go client
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Handler global
/*Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
    shouldShowBanner: true,
  }),
});

async function setupAndroidChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Adma',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 300, 200, 300],
    lightColor: '#5FC2BA',
    sound: 'default',
  });
  await Notifications.setNotificationChannelAsync('reviews', {
    name: 'Avis',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250],
    lightColor: '#5FC2BA',
  });
  await Notifications.setNotificationChannelAsync('payments', {
    name: 'Paiements',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 200, 500],
    lightColor: '#5FC2BA',
  });
  await Notifications.setNotificationChannelAsync('verifications', {
    name: 'Verification',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#5FC2BA',
  });
}*/

export async function registerForPushNotifications() {
  if (isExpoGo) {
    console.warn('[ADMA] Expo Go ne supporte pas les notifications push distantes sous Android (SDK 53+). Utilisez un Dev Build.');
    return null;
  }

  if (!Device.isDevice) {
    console.warn('[ADMA] Push notifications: appareil physique requis');
    return null;
  }

  await setupAndroidChannels();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn('[ADMA] EAS projectId manquant ou invalide dans app.json');
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.post('/users/push-token', { token: token.data, platform: Platform.OS });
    return token.data;
  } catch (err) {
    console.warn('[ADMA] Erreur token push:', err.message);
    return null;
  }
}

/*export function setupNotificationListeners(navigation) {
  const addStore = useNotificationStore.getState().addNotification;

  const fgSub = Notifications.addNotificationReceivedListener((notif) => {
    const { title, body, data } = notif.request.content;
    addStore({ id: Date.now(), title_fr: title, body_fr: body, data_json: data, is_read: false, created_at: new Date().toISOString() });
  });

  const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (!data) return;

    switch (data.type) {
      case 'new_review':
      case 'review_response':
        if (data.providerId) navigation?.navigate(`provider/${data.providerId}`);
        break;
      case 'verification_approved':
      case 'verification_rejected':
        navigation?.navigate('verification/index'); // Correction du chemin
        break;
      case 'subscription_expiring':
        navigation?.navigate('subscription/plans');
        break;
      default:
        navigation?.navigate('notifications/index');
    }
  });

  return () => { fgSub.remove(); tapSub.remove(); };
}*/