import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Bell, CheckCheck, Megaphone, Send, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  createCampaign,
  enableAdminPush,
  fetchCampaigns,
  fetchNotifications,
  readNotification,
  type InternalNotification,
  type PushCampaign,
} from '../services/notificationsService';

const PRIMARY = '#122a4c';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  sending: 'Enviando',
  sent: 'Enviada',
  failed: 'Falhou',
  scheduled: 'Agendada',
};

export function NotificationsScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'history' | 'campaigns'>('history');
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);
  const [campaigns, setCampaigns] = useState<PushCampaign[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', image_url: '', deep_link: '/promocoes' });

  const setNotificationItems = (items: InternalNotification[]) => {
    setNotifications(items);
    window.dispatchEvent(new CustomEvent('admin-notification-count-updated', {
      detail: items.filter((item) => !item.read_at).length,
    }));
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      setNotificationItems(await fetchNotifications());
    } catch (error: any) {
      setFeedback(error?.response?.data?.message || 'Não foi possível carregar notificações.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      setCampaigns(await fetchCampaigns());
      setCampaignsLoaded(true);
    } catch (error: any) {
      setFeedback(error?.response?.data?.message || 'Não foi possível carregar campanhas.');
    } finally {
      setLoadingCampaigns(false);
    }
  };

  useEffect(() => {
    void loadHistory();
    const refresh = () => void loadHistory();
    window.addEventListener('notification-received', refresh);
    return () => window.removeEventListener('notification-received', refresh);
  }, []);

  useEffect(() => {
    if (tab === 'campaigns' && !campaignsLoaded && !loadingCampaigns) {
      void loadCampaigns();
    }
  }, [tab, campaignsLoaded, loadingCampaigns]);

  const unread = useMemo(() => notifications.filter((item) => !item.read_at).length, [notifications]);

  const markRead = async (notification: InternalNotification) => {
    if (!notification.read_at) {
      const updated = await readNotification(notification.id);
      setNotificationItems(notifications.map((item) => item.id === updated.id ? updated : item));
    }
    if (notification.data?.route) navigate(notification.data.route);
  };

  const markAllRead = async () => {
    const updates = await Promise.all(
      notifications.filter((item) => !item.read_at).map((item) => readNotification(item.id))
    );
    const map = new Map(updates.map((item) => [item.id, item]));
    setNotificationItems(notifications.map((item) => map.get(item.id) || item));
  };

  const activatePush = async () => {
    try {
      await enableAdminPush();
      setFeedback('Push administrativo ativado neste dispositivo para alertas de novos pedidos. Campanhas são recebidas apenas no app cliente.');
    } catch (error: any) {
      setFeedback(error?.message || 'Não foi possível ativar notificações.');
    }
  };

  const submitCampaign = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback('');
    try {
      const campaign = await createCampaign({
        title: form.title,
        body: form.body,
        image_url: form.image_url || null,
        deep_link: form.deep_link || null,
      });
      setForm({ title: '', body: '', image_url: '', deep_link: '/promocoes' });
      if (campaign.total_devices === 0) {
        setFeedback('Histórico criado, mas nenhum cliente desta loja ativou notificações push.');
      } else if (campaign.total_sent === 0) {
        setFeedback('Nenhum push foi entregue. Verifique a configuração FCM do backend.');
      } else {
        setFeedback('Campanha enviada por push.');
      }
      setCampaigns((items) => [campaign, ...items.filter((item) => item.id !== campaign.id)]);
      setCampaignsLoaded(true);
      setTab('campaigns');
    } catch (error: any) {
      setFeedback(error?.response?.data?.message || error?.message || 'Não foi possível enviar a campanha.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-5 overflow-y-auto flex-1 h-full max-w-5xl mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-gray-900 font-semibold">Notificações</h2>
          <p className="text-gray-500 text-sm mt-0.5">Alertas operacionais e campanhas push</p>
        </div>
        <button onClick={activatePush} title="Receber alertas administrativos, como novos pedidos" className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <Smartphone className="w-4 h-4" /> Ativar alertas admin
        </button>
      </div>

      {feedback && <div className="mb-4 rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">{feedback}</div>}

      <div className="flex gap-2 border-b border-gray-200 mb-5">
        <button onClick={() => setTab('history')} className="px-4 py-3 text-sm font-medium border-b-2" style={{ borderColor: tab === 'history' ? PRIMARY : 'transparent', color: tab === 'history' ? PRIMARY : '#64748b' }}>
          Histórico {unread > 0 && `(${unread})`}
        </button>
        <button onClick={() => setTab('campaigns')} className="px-4 py-3 text-sm font-medium border-b-2" style={{ borderColor: tab === 'campaigns' ? PRIMARY : 'transparent', color: tab === 'campaigns' ? PRIMARY : '#64748b' }}>
          Campanhas Push
        </button>
      </div>

      {tab === 'history' && (
        <section>
          <div className="flex justify-end mb-3">
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1.5 text-sm" style={{ color: PRIMARY }}>
                <CheckCheck className="w-4 h-4" /> Marcar todas como lidas
              </button>
            )}
          </div>
          {loadingHistory ? <p className="text-sm text-gray-500">Carregando...</p> : (
            <div className="space-y-2">
              {notifications.map((item) => (
                <button key={item.id} onClick={() => void markRead(item)} className={`w-full text-left flex items-start gap-3 p-4 rounded-md border ${item.read_at ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'}`}>
                  <div className="w-9 h-9 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-4 h-4 text-blue-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{item.title}</div>
                    <div className="text-sm text-gray-600 mt-0.5">{item.body}</div>
                    <div className="text-xs text-gray-400 mt-1">{formatDate(item.created_at)}</div>
                  </div>
                  {!item.read_at && <span className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: PRIMARY }} />}
                </button>
              ))}
              {!notifications.length && <p className="text-sm text-gray-500 py-8 text-center">Nenhuma notificação.</p>}
            </div>
          )}
        </section>
      )}

      {tab === 'campaigns' && (
        <div className="grid lg:grid-cols-[minmax(280px,360px)_1fr] gap-6">
          <form onSubmit={submitCampaign} className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="w-4 h-4" style={{ color: PRIMARY }} />
              <h3 className="text-sm font-semibold text-gray-900">Nova campanha</h3>
            </div>
            <input required maxLength={120} placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <textarea required maxLength={500} rows={4} placeholder="Mensagem" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none" />
            <input type="url" placeholder="URL de imagem (opcional)" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="Link interno, ex.: /promocoes" value={form.deep_link} onChange={(e) => setForm({ ...form, deep_link: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <div className="text-xs text-gray-500">Público: clientes desta loja que ativaram push no app cliente.</div>
            <button disabled={submitting} className="flex items-center justify-center gap-2 w-full rounded-md px-4 py-2 text-sm text-white disabled:opacity-60" style={{ backgroundColor: PRIMARY }}>
              <Send className="w-4 h-4" /> {submitting ? 'Enviando...' : 'Enviar agora'}
            </button>
          </form>
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Campanhas enviadas</h3>
            {loadingCampaigns ? <p className="text-sm text-gray-500 mb-3">Carregando...</p> : null}
            <div className="overflow-x-auto border border-gray-200 rounded-md bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Campanha</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-right px-3 py-2 font-medium">Enviados</th>
                    <th className="text-right px-3 py-2 font-medium">Falhas</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-t border-gray-100">
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-800">{campaign.title}</div>
                        <div className="text-xs text-gray-400">{formatDate(campaign.created_at)} | {campaign.total_devices || 0} dispositivos</div>
                      </td>
                      <td className="px-3 py-3 text-gray-600">{statusLabels[campaign.status] || campaign.status}</td>
                      <td className="px-3 py-3 text-right text-green-700">{campaign.total_sent || 0}</td>
                      <td className="px-3 py-3 text-right text-red-700">{campaign.total_failed || 0}</td>
                    </tr>
                  ))}
                  {!loadingCampaigns && !campaigns.length && (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhuma campanha enviada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
