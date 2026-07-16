import { useState, useEffect } from 'react';
import { Search, CreditCard, Smartphone, Banknote, CheckCircle2, Clock, XCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/shared/lib/api';
import { systemToast } from '@/shared/components/SystemToast';
import { formatBrasiliaDate } from '@/shared/lib/dateTime';
import { MfaApprovalModal, type MfaApproval } from '@/shared/components/MfaApprovalModal';
import { authService } from '@/features/auth/services/authService';

const PRIMARY = '#122a4c';

const statusStyle: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  'Pago': { bg: '#f0fdf4', text: '#16a34a', icon: CheckCircle2 },
  'Pendente': { bg: '#fffbeb', text: '#d97706', icon: Clock },
  'Em processamento': { bg: '#eff6ff', text: '#2563eb', icon: Clock },
  'Reembolsado': { bg: '#eff6ff', text: '#2563eb', icon: RefreshCw },
  'Cancelado': { bg: '#fef2f2', text: '#dc2626', icon: XCircle },
  'Rejeitado': { bg: '#fef2f2', text: '#dc2626', icon: XCircle },
  'Expirado': { bg: '#f3f4f6', text: '#6b7280', icon: XCircle },
};

const methodIcon: Record<string, typeof CreditCard> = {
  'Cartão de Crédito': CreditCard,
  'Cartão de Débito': CreditCard,
  'PIX': Smartphone,
  'Dinheiro': Banknote,
};

const statusApiFilter: Record<string, string | undefined> = {
  Todos: undefined,
  Pago: 'aprovado',
  Pendente: 'pendente',
  'Em processamento': 'em_processamento',
  Reembolsado: 'estornado',
  Rejeitado: 'rejeitado',
  Cancelado: 'cancelado',
  Expirado: 'expirado',
};

const PAGE_SIZE = 20;

export function PaymentsScreen() {
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [refundingPaymentId, setRefundingPaymentId] = useState('');
  const [refundApprovalPayment, setRefundApprovalPayment] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1, per_page: PAGE_SIZE });

  const user = (() => {
    try {
      const userJson = localStorage.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  })();
  const canRefundPayments = ['administrador', 'operador', 'separador', 'financeiro'].includes(user?.perfil);

  const fetchPayments = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const payRes = await api.get('/pagamentos', {
        params: {
          page,
          per_page: PAGE_SIZE,
          status: statusApiFilter[statusFilter],
        },
      });

      const pagamentosRaw = payRes.data.data;
      const pagamentos = Array.isArray(pagamentosRaw) ? pagamentosRaw : pagamentosRaw?.data || [];

      if (!Array.isArray(pagamentosRaw) && pagamentosRaw) {
        setPagination({
          total: Number(pagamentosRaw.total || 0),
          total_pages: Math.max(1, Number(pagamentosRaw.total_pages || 1)),
          per_page: Number(pagamentosRaw.per_page || PAGE_SIZE),
        });
      }

      const mapped = pagamentos.map((p: any) => {
        const methodMapping: Record<string, string> = {
          'credit_card': 'Cartão de Crédito',
          'debit_card': 'Cartão de Débito',
          'cartao_credito': 'Cartão de Crédito',
          'cartao_debito': 'Cartão de Débito',
          'pix': 'PIX',
          'cash': 'Dinheiro',
          'dinheiro': 'Dinheiro',
        };

        const statusMapping: Record<string, string> = {
          'aprovado': 'Pago',
          'pago': 'Pago',
          'pendente': 'Pendente',
          'em_processamento': 'Em processamento',
          'processando': 'Em processamento',
          'estornado': 'Reembolsado',
          'reembolsado': 'Reembolsado',
          'cancelado': 'Cancelado',
          'rejeitado': 'Rejeitado',
          'expirado': 'Expirado'
        };

        return {
          id: p.pedido_numero || (p.id ? p.id.split('-')[0].toUpperCase() : '---'),
          originalId: p.id,
          customer: p.cliente_nome || 'Cliente Desconhecido',
          method: methodMapping[p.forma_pagamento] || 'Dinheiro',
          value: parseFloat(p.valor) || 0,
          status: statusMapping[p.status] || 'Pendente',
          date: formatBrasiliaDate(p.criado_em, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          cashChange: p.forma_pagamento === 'dinheiro'
            ? p.sem_troco
              ? 'Sem troco'
              : p.troco_para != null
                ? `Troco para R$ ${Number(p.troco_para || 0).toFixed(2).replace('.', ',')}`
                : ''
            : '',
          origin: p.metadata?.origem_pagamento === 'ADMIN_LINK_PIX'
            ? 'Pix por link administrativo'
            : '',
        };
      });

      setPayments(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const getApiErrorMessage = (error: any, fallback: string) => {
    const payload = error?.response?.data;
    const message = (
      payload?.message ||
      payload?.error?.message ||
      payload?.error ||
      error?.message ||
      fallback
    );

    if (/collector.*hasn'?t enough available money/i.test(message)) {
      return 'O recebedor não possui saldo disponível suficiente para concluir o reembolso.';
    }

    if (/refund failed/i.test(message)) {
      return 'Não foi possível fazer o reembolso pelo meio de pagamento. Verifique o saldo disponível.';
    }

    return message;
  };

  const refundPayment = async (payment: any, approval?: MfaApproval) => {
    if (!payment?.originalId || payment.status !== 'Pago' || refundingPaymentId) return;

    try {
      setRefundingPaymentId(payment.originalId);
      await api.post(`/payment-gateways/payment/${payment.originalId}/refund`, approval ? { mfa_approval: approval } : {});
      systemToast.success('Reembolso solicitado com sucesso.');
      await fetchPayments({ silent: true });
    } catch (error) {
      console.error('Error refunding payment:', error);
      systemToast.error(
        getApiErrorMessage(error, 'Não foi possível realizar o reembolso. Tente novamente.'),
        { title: 'Erro no reembolso' }
      );
    } finally {
      setRefundingPaymentId('');
      setRefundApprovalPayment(null);
    }
  };

  const requestRefund = async (payment: any) => {
    try {
      const mfa = await authService.getMfaStatus();
      if (mfa.refund_required) {
        setRefundApprovalPayment(payment);
        return;
      }
      await refundPayment(payment);
    } catch (error) {
      systemToast.error('Não foi possível verificar a preferência de segurança.', {
        title: 'Erro no reembolso',
      });
    }
  };

  useEffect(() => {
    fetchPayments();
    const intervalId = window.setInterval(() => {
      fetchPayments({ silent: true });
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [page, statusFilter]);

  const filtered = payments.filter(p => {
    const matchSearch = p.customer.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'Todos' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const total = filtered.reduce((a, p) => a + (p.status === 'Pago' ? p.value : 0), 0);
  const pending = filtered.reduce((a, p) => a + (p.status === 'Pendente' ? p.value : 0), 0);
  const refunded = filtered.reduce((a, p) => a + (p.status === 'Reembolsado' ? p.value : 0), 0);

  return (
    <div className="p-5 space-y-5 overflow-y-auto flex-1 h-full relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }}></div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Total Recebido</div>
          <div className="text-xl font-semibold" style={{ color: '#16a34a' }}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-gray-400 mt-0.5">{filtered.filter(p => p.status === 'Pago').length} pagamentos</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Pendente</div>
          <div className="text-xl font-semibold text-amber-600">R$ {pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-gray-400 mt-0.5">{filtered.filter(p => p.status === 'Pendente').length} pagamentos</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Reembolsado</div>
          <div className="text-xl font-semibold text-blue-600">R$ {refunded.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-gray-400 mt-0.5">{filtered.filter(p => p.status === 'Reembolsado').length} pagamentos</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por pedido ou cliente..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['Todos', 'Pago', 'Pendente', 'Em processamento', 'Reembolsado', 'Rejeitado', 'Cancelado', 'Expirado'].map(s => (
            <button
              key={s}
              onClick={() => {
                setPage(1);
                setStatusFilter(s);
              }}
              className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
              style={statusFilter === s ? { backgroundColor: PRIMARY, color: 'white' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pedido/Ref</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Método</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Data/Hora</th>
                {canRefundPayments && (
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canRefundPayments ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                    {loading ? 'Carregando...' : 'Nenhum pagamento encontrado.'}
                  </td>
                </tr>
              ) : filtered.map(payment => {
                const sc = statusStyle[payment.status] || statusStyle['Pendente'];
                const StatusIcon = sc.icon;
                const MethodIcon = methodIcon[payment.method] ?? CreditCard;
                return (
                  <tr key={payment.originalId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-gray-700">#{payment.id}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{payment.customer}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <MethodIcon className="w-4 h-4" />
                        <span className="text-sm">{payment.method}</span>
                      </div>
                      {payment.cashChange && (
                        <div className="mt-1 text-xs text-gray-400">
                          {payment.cashChange}
                        </div>
                      )}
                      {payment.origin && <div className="mt-1 text-xs font-medium text-blue-700">{payment.origin}</div>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      R$ {payment.value.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: sc.bg, color: sc.text }}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">{payment.date}</td>
                    {canRefundPayments && (
                      <td className="px-4 py-3 text-right">
                        {payment.status === 'Pago' ? (
                          <button
                            type="button"
                            onClick={() => void requestRefund(payment)}
                            disabled={refundingPaymentId === payment.originalId}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Reembolsar pagamento"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${refundingPaymentId === payment.originalId ? 'animate-spin' : ''}`}
                            />
                            Reembolsar
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="text-sm text-gray-500">
          Página {page} de {pagination.total_pages} · {pagination.total} pagamento(s)
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={loading || page <= 1}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(pagination.total_pages, current + 1))}
            disabled={loading || page >= pagination.total_pages}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <MfaApprovalModal
        open={Boolean(refundApprovalPayment)}
        title="Aprovar reembolso"
        description={refundApprovalPayment ? `Confirme o reembolso total de R$ ${refundApprovalPayment.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para ${refundApprovalPayment.customer}.` : ""}
        loading={Boolean(refundingPaymentId)}
        onClose={() => setRefundApprovalPayment(null)}
        onConfirm={(approval) => void refundPayment(refundApprovalPayment, approval)}
      />
    </div>
  );
}
