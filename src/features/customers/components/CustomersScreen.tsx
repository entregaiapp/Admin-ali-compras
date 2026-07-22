import { useState, useEffect } from 'react';
import { Search, Eye, X, Phone, Mail, MapPin, ShoppingBag, ArrowLeft, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/shared/lib/api';
import { formatBrasiliaDate } from '@/shared/lib/dateTime';

const PRIMARY = '#122a4c';
const CUSTOMERS_PER_PAGE = 20;
const API_CUSTOMERS_PER_PAGE = 100;
const CUSTOMER_FILTERS = ['Todos', 'Melhores clientes', 'Recorrentes', 'Novos', 'Inativos'];

const toNumber = (value: any) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const normalized = String(value)
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: any) => (
  `R$ ${toNumber(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
);

const getCustomerTotal = (customer: any) => (
  toNumber(
    customer.total_gasto ??
    customer.totalGasto ??
    customer.valor_total ??
    customer.total_compras ??
    customer.total
  )
);

const getCustomerOrdersCount = (customer: any) => (
  Number(customer.total_pedidos ?? customer.orders ?? customer.pedidos ?? 0) || 0
);

const getWhatsappPhone = (phone: any) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.startsWith('55') ? digits : `55${digits}`;
};

const getPaginationPages = (page: number, totalPages: number) => {
  const pages = new Set<number>([1, totalPages]);
  for (let current = page - 1; current <= page + 1; current += 1) {
    if (current >= 1 && current <= totalPages) pages.add(current);
  }
  return Array.from(pages).sort((a, b) => a - b);
};

function CustomerDetail({ customer, onClose }: { customer: any; onClose: () => void }) {
  const [custOrders, setCustOrders] = useState<any[]>([]);
  const [orderStats, setOrderStats] = useState({ count: 0, total: 0 });
  
  useEffect(() => {
    // Optionally fetch recent orders for this customer
    api.get(`/pedidos?cliente_id=${customer.id}`).then(res => {
       const data = res.data.data;
       const orders = Array.isArray(data) ? data : data?.data || [];
       setOrderStats({
         count: orders.length,
         total: orders.reduce((sum: number, order: any) => sum + toNumber(order.valor_total ?? order.total), 0),
       });
       setCustOrders(orders.slice(0, 4));
    }).catch(console.error);
  }, [customer.id]);

  const customerOrdersCount = getCustomerOrdersCount(customer);
  const customerTotal = getCustomerTotal(customer);
  const ordersCount = customerOrdersCount || orderStats.count;
  const totalSpent = customerTotal || orderStats.total;
  const whatsappPhone = getWhatsappPhone(customer.telefone);
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Olá, ${customer.nome || ''}!`)}`
    : null;

  return (
    <div className="flex-1 lg:border-l border-gray-200 overflow-y-auto bg-white">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3.5 flex items-center gap-3 z-10">
        <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-gray-900 font-semibold">{customer.nome}</h2>
          <div className="text-xs text-gray-400 mt-0.5">
            Cliente da loja desde {formatBrasiliaDate(customer.store_customer_created_at || customer.criado_em, { month: 'short', year: 'numeric' })}
          </div>
        </div>
        <button onClick={onClose} className="hidden lg:block text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pedidos', value: ordersCount, color: PRIMARY },
            { label: 'Total Gasto', value: formatCurrency(totalSpent), color: '#16a34a' },
            { label: 'Ticket Médio', value: `R$ ${(ordersCount > 0 ? (totalSpent / ordersCount) : 0).toFixed(2).replace('.', ',')}`, color: '#7c3aed' },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="font-semibold text-sm" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Contact info */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h4 className="font-semibold text-gray-700 text-sm">Contato</h4>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="w-4 h-4 text-gray-400" />{customer.telefone || 'Não informado'}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4 text-gray-400" />{customer.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />Endereço não cadastrado
          </div>
        </div>

        {/* Order history */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" style={{ color: PRIMARY }} /> Últimos Pedidos
          </h4>
          <div className="space-y-2.5">
            {custOrders.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-2">Nenhum pedido encontrado.</p>
            ) : (
              custOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-gray-700">#{order.id.split('-')[0]}</div>
                    <div className="text-xs text-gray-400">{formatBrasiliaDate(order.criado_em)} · {order.tipo_pedido}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-700">{formatCurrency(order.valor_total ?? order.total)}</div>
                    <span className="text-[11px]" style={{ color: order.status === 'entregue' ? '#16a34a' : order.status === 'cancelado' ? '#dc2626' : '#d97706' }}>
                      {order.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> Entrar em Contato
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="w-full py-2.5 rounded-lg border border-gray-200 text-sm text-gray-400 bg-gray-50 cursor-not-allowed flex items-center justify-center gap-2"
              title="Cliente sem WhatsApp cadastrado"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp não cadastrado
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CustomersScreen() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [selected, setSelected] = useState<any | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;

    const loadCustomers = async () => {
      try {
        setLoading(true);

        const firstResponse = await api.get('/clientes', {
          params: { page: 1, per_page: API_CUSTOMERS_PER_PAGE },
        });
        const firstPayload = firstResponse.data?.data;
        const firstCustomers = Array.isArray(firstPayload) ? firstPayload : firstPayload?.data || [];
        const totalApiPages = Array.isArray(firstPayload) ? 1 : Number(firstPayload?.total_pages || 1);

        const remainingResponses = totalApiPages > 1
          ? await Promise.all(
            Array.from({ length: totalApiPages - 1 }, (_, index) => (
              api.get('/clientes', {
                params: { page: index + 2, per_page: API_CUSTOMERS_PER_PAGE },
              })
            ))
          )
          : [];

        const remainingCustomers = remainingResponses.flatMap(response => {
          const payload = response.data?.data;
          return Array.isArray(payload) ? payload : payload?.data || [];
        });

        if (active) setCustomers([...firstCustomers, ...remainingCustomers]);
      } catch (err) {
        console.error('Error fetching customers', err);
        if (active) setCustomers([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadCustomers();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);

  const filtered = customers
    .filter(c => {
      const matchSearch = (c.nome || '').toLowerCase().includes(search.toLowerCase()) ||
                          (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
                          (c.telefone || '').toLowerCase().includes(search.toLowerCase());

      const ordersCount = getCustomerOrdersCount(c);
      const createdAt = c.criado_em ? new Date(c.criado_em).getTime() : 0;
      const isRecentCustomer = createdAt > 0 && Date.now() - createdAt <= 30 * 24 * 60 * 60 * 1000;

      if (filter === 'Melhores clientes') return matchSearch && getCustomerTotal(c) > 0;
      if (filter === 'Recorrentes') return matchSearch && ordersCount >= 2;
      if (filter === 'Novos') return matchSearch && (ordersCount <= 1 || isRecentCustomer);
      if (filter === 'Inativos') return matchSearch && c.status === 'inativo';

      return matchSearch;
    })
    .sort((customerA, customerB) => {
      if (filter !== 'Melhores clientes') return 0;

      const totalDifference = getCustomerTotal(customerB) - getCustomerTotal(customerA);
      if (totalDifference !== 0) return totalDifference;

      const ordersDifference = getCustomerOrdersCount(customerB) - getCustomerOrdersCount(customerA);
      if (ordersDifference !== 0) return ordersDifference;

      return String(customerA.nome || '').localeCompare(String(customerB.nome || ''), 'pt-BR');
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / CUSTOMERS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safePage - 1) * CUSTOMERS_PER_PAGE;
  const paginatedCustomers = filtered.slice(pageStartIndex, pageStartIndex + CUSTOMERS_PER_PAGE);
  const paginationPages = getPaginationPages(safePage, totalPages);
  const visibleStart = filtered.length === 0 ? 0 : pageStartIndex + 1;
  const visibleEnd = Math.min(pageStartIndex + CUSTOMERS_PER_PAGE, filtered.length);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div className="flex h-full">
      {/* List */}
      <div className={`flex flex-col ${selected ? 'hidden lg:flex lg:w-1/2 xl:w-3/5' : 'flex-1'}`}>
        <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {CUSTOMER_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
                style={filter === f ? { backgroundColor: PRIMARY, color: 'white' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <span className="text-xs text-gray-500">{filtered.length} clientes</span>
          {!loading && filtered.length > 0 && (
            <span className="text-xs text-gray-400">
              Exibindo {visibleStart}-{visibleEnd}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto relative">
          {loading ? (
             <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
               <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }}></div>
             </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Pedidos</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ação</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginatedCustomers.map(customer => {
                  const isActive = customer.status === 'ativo';
                  const ordersCount = getCustomerOrdersCount(customer);
                  const totalSpent = getCustomerTotal(customer);

                  return (
                    <tr
                      key={customer.id}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${selected?.id === customer.id ? 'bg-blue-50/40' : ''}`}
                      onClick={() => setSelected(customer)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                            style={{ backgroundColor: PRIMARY }}
                          >
                            {(customer.nome || 'CL').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">{customer.nome}</div>
                            <div className="text-xs text-gray-400">{customer.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="font-medium text-gray-700">{ordersCount}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="font-medium text-gray-700">{formatCurrency(totalSpent)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={isActive
                            ? { backgroundColor: '#f0fdf4', color: '#16a34a' }
                            : { backgroundColor: '#fef2f2', color: '#dc2626' }}
                        >
                          {customer.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={e => { e.stopPropagation(); setSelected(customer); }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p className="text-sm">Nenhum cliente encontrado</p>
            </div>
          )}
        </div>

        {!loading && filtered.length > CUSTOMERS_PER_PAGE && (
          <div className="border-t border-gray-200 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-xs text-gray-500">
              Página {safePage} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={safePage === 1}
                className="h-8 px-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>

              {paginationPages.map((page, index) => {
                const previousPage = paginationPages[index - 1];
                const showGap = previousPage && page - previousPage > 1;

                return (
                  <div key={page} className="flex items-center gap-1">
                    {showGap && <span className="px-1 text-xs text-gray-400">...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className="h-8 min-w-8 px-2 rounded-lg border text-xs font-medium transition-colors"
                      style={safePage === page
                        ? { borderColor: PRIMARY, backgroundColor: PRIMARY, color: 'white' }
                        : { borderColor: '#e5e7eb', color: '#4b5563' }}
                    >
                      {page}
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={safePage === totalPages}
                className="h-8 px-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
              >
                Próxima
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && <CustomerDetail customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
