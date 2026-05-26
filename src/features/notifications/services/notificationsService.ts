import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging';
import api from '@/shared/lib/api';
import { firebaseVapidKey, firebaseWebConfig } from '@/shared/lib/firebaseConfig';

export interface InternalNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  read_at: string | null;
  created_at: string;
}

export type CampaignAudience =
  | 'all_customers'
  | 'recent_customers'
  | 'inactive_customers'
  | 'never_ordered'
  | 'loyal_customers'
  | 'high_value_customers'
  | 'birthday_month';

export interface PushCampaign {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  deep_link: string | null;
  audience: CampaignAudience;
  audience_config: {
    min_orders?: number;
    min_total?: number;
    month?: number;
  };
  status: 'draft' | 'sending' | 'sent' | 'failed' | 'scheduled';
  created_at: string;
  total_devices: number;
  total_sent: number;
  total_failed: number;
}

const DEVICE_TOKEN_STORAGE_KEY = 'admin_notification_fcm_token';

const firebaseConfigured = () => Boolean(
  firebaseWebConfig.apiKey && firebaseWebConfig.projectId && firebaseWebConfig.messagingSenderId && firebaseWebConfig.appId
);

async function getWebMessaging() {
  if (!firebaseConfigured() || !(await isSupported())) return null;
  const app = getApps()[0] || initializeApp(firebaseWebConfig);
  return getMessaging(app);
}

export async function enableAdminPush() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    throw new Error('Este navegador não suporta notificações push.');
  }

  if (!firebaseVapidKey) {
    throw new Error('A chave VITE_FIREBASE_VAPID_KEY não foi incluída no build do painel admin.');
  }

  const messaging = await getWebMessaging();
  if (!messaging) {
    throw new Error('FCM Web Push requer um navegador compatível e execução em HTTPS ou localhost.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permissão de notificações não concedida.');
  }

  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(messaging, {
    vapidKey: firebaseVapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) throw new Error('Não foi possível registrar este dispositivo.');

  await api.post('/notifications/register-device', {
    fcm_token: token,
    platform: 'web',
    app_type: 'admin_panel',
  });
  localStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, token);
  window.dispatchEvent(new Event('admin-push-enabled'));

  return token;
}

export async function disableAdminPush() {
  const token = localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY);
  if (!token) return;
  try {
    await api.post('/notifications/deactivate-device', { fcm_token: token });
  } finally {
    localStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY);
  }
}

export async function listenForAdminPush(callback: (payload: MessagePayload) => void) {
  const messaging = await getWebMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    window.dispatchEvent(new CustomEvent('notification-received', { detail: payload.data }));
    callback(payload);
  });
}

export async function fetchNotifications() {
  const response = await api.get<{ data: InternalNotification[] }>('/notifications');
  return response.data.data || [];
}

export async function readNotification(id: string) {
  const response = await api.patch<{ data: InternalNotification }>(`/notifications/${id}/read`);
  return response.data.data;
}

export async function fetchCampaigns() {
  const response = await api.get<{ data: PushCampaign[] }>('/tenant/notifications/campaigns');
  return response.data.data || [];
}

export async function createCampaign(input: {
  title: string;
  body: string;
  image_url?: string | null;
  deep_link?: string | null;
  audience: CampaignAudience;
  audience_config?: PushCampaign['audience_config'];
}) {
  const response = await api.post<{ data: PushCampaign }>('/tenant/notifications/campaigns', input);
  return response.data.data;
}
