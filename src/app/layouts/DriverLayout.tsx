import { Outlet, useNavigate, useLocation } from 'react-router';
import { BadgeDollarSign, CalendarDays, HandCoins, Loader2, Store, Truck, LogOut, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import api from '@/shared/lib/api';

const PRIMARY = '#122a4c';

type DriverFeeStop = {
  id: string;
  routeName?: string | null;
  orderNumber?: string | null;
  dailyTicketNumber?: string | null;
  customerName?: string | null;
  neighborhood?: string | null;
  deliveryFee?: number | string | null;
  deliveredAt?: string | null;
};

type DriverFeeSummary = {
  date: string;
  totalFee: number;
  deliveredCount: number;
  stops: DriverFeeStop[];
};

const getDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const money = (value: number | string | null | undefined) => (
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
);

const formatTime = (value?: string | null) => {
  if (!value) return '--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export function DriverLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [storeName, setStoreName] = useState('São Jorge Super');
  const [feesOpen, setFeesOpen] = useState(false);
  const [feeDate, setFeeDate] = useState(getDateInputValue);
  const [feeSummary, setFeeSummary] = useState<DriverFeeSummary | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);

  const user = (() => {
    try {
      const userJson = localStorage.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
      return null;
    }
  })();

  useEffect(() => {
    if (user?.loja_id) {
      api.get(`/lojas/${user.loja_id}`).then(res => {
        if (res.data?.success) setStoreName(res.data.data.nome);
      }).catch(() => {});
    }
  }, [user?.loja_id]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const fetchFeeSummary = useCallback(async () => {
    try {
      setFeeLoading(true);
      setFeeError(null);
      const response = await api.get('/delivery-routes/my-delivery-fees', {
        params: { date: feeDate },
      });
      setFeeSummary(response.data?.data || null);
    } catch (error: any) {
      setFeeError(error?.response?.data?.message || error?.response?.data?.error || 'Não foi possível carregar as taxas.');
    } finally {
      setFeeLoading(false);
    }
  }, [feeDate]);

  useEffect(() => {
    if (feesOpen) void fetchFeeSummary();
  }, [feesOpen, fetchFeeSummary]);

  const navItems = [
    { label: 'Minhas Entregas', icon: Truck, path: '/driver' },
    { label: 'Sair', icon: LogOut, path: '/login', action: handleLogout },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Topbar */}
      <header className="text-white px-4 h-16 flex items-center justify-between shadow-md shrink-0 z-50" style={{ backgroundColor: PRIMARY }}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg shrink-0">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-white/60 leading-tight uppercase tracking-wider font-bold">
              {storeName}
            </span>
            <span className="text-sm font-semibold truncate">
              {user?.nome || 'Usuário'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full border border-white/20">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs font-medium">Disponível</span>
          </div>
          <button
            type="button"
            onClick={() => setFeesOpen(true)}
            className="relative p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Ver saldo de taxas de entrega"
            title="Saldo de taxas"
          >
            <BadgeDollarSign className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Faixa de turno (mobile only) */}
      <div className="sm:hidden bg-white border-b border-gray-200 px-4 py-2 shrink-0">
        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium uppercase tracking-tighter">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          <span>Turno ativo · Disponível para rotas</span>
        </div>
      </div>

      {/* Content Area */}
      <main className="flex-1 min-h-0 overflow-y-auto relative">
        <div className="max-w-3xl mx-auto min-h-full">
          <Outlet />
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="h-16 bg-white border-t border-gray-200 flex items-center shrink-0 z-50">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/driver' && location.pathname.startsWith('/driver/route'));
          const isLogout = item.label === 'Sair';
          
          return (
            <button
              key={item.label}
              onClick={() => item.action ? item.action() : navigate(item.path)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? 'text-[#122a4c]' : 'text-gray-400'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {feesOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 px-0 sm:items-center sm:px-4"
          onClick={() => setFeesOpen(false)}
        >
          <div
            className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                  <HandCoins className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Taxas do dia</h2>
                  <p className="text-xs text-gray-500">Pedidos entregues por você</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFeesOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-3 block text-xs font-semibold uppercase text-gray-500">
              Dia
              <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2.5">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={feeDate}
                  onChange={(event) => setFeeDate(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none"
                />
              </div>
            </label>

            <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 p-4">
              <div className="text-xs font-semibold uppercase text-green-700">Total em taxas</div>
              <div className="mt-1 text-3xl font-bold text-green-900">
                {feeLoading ? '...' : money(feeSummary?.totalFee)}
              </div>
              <div className="mt-1 text-xs text-green-800">
                {feeLoading ? 'Calculando...' : `${feeSummary?.deliveredCount || 0} pedido(s) entregue(s)`}
              </div>
            </div>

            {feeError && (
              <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
                {feeError}
              </div>
            )}

            <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
              {feeLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm font-medium text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando taxas...
                </div>
              ) : feeSummary?.stops?.length ? (
                feeSummary.stops.map((stop) => (
                  <div key={stop.id} className="rounded-2xl border border-gray-200 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-900">
                          {stop.customerName || 'Cliente'}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500">
                          Pedido {stop.dailyTicketNumber || stop.orderNumber || 'sem número'} · {formatTime(stop.deliveredAt)}
                        </div>
                        <div className="mt-1 truncate text-xs text-gray-500">
                          {stop.neighborhood || 'Sem bairro'}
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-bold text-green-700">
                        {money(stop.deliveryFee)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                  Nenhuma taxa de entrega registrada nesse dia.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
