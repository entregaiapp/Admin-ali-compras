import { useState, useEffect } from 'react';
import { Search, Eye, X, Phone, Mail, MapPin, ShoppingBag, ArrowLeft, MessageCircle, Gift } from 'lucide-react';
import api from '../services/api';

const PRIMARY = '#122a4c';

function CustomerDetail({ customer, onClose }: { customer: any; onClose: () => void }) {
  const [custOrders, setCustOrders] = useState<any[]>([]);
  
  useEffect(() => {
    // Optionally fetch recent orders for this customer
    api.get(`/pedidos?cliente_id=${customer.id}`).then(res => {
       const data = res.data.data;
       const orders = Array.isArray(data) ? data : data?.data || [];
       setCustOrders(orders.slice(0, 4));
    }).catch(console.error);
  }, [customer.id]);

  const ordersCount = customer.orders || 0;
  const totalSpent = customer.total || 0;

  return (
    <div className="flex-1 lg:border-l border-gray-200 overflow-y-auto bg-white">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3.5 flex items-center gap-3 z-10">
        <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-gray-900 font-semibold">{customer.nome}</h2>
          <div className="text-xs text-gray-400 mt-0.5">
            Cliente desde {new Date(customer.criado_em).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
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
            { label: 'Total Gasto', value: `R$ ${totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: '#16a34a' },
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
                    <div className="text-xs text-gray-400">{new Date(order.criado_em).toLocaleDateString('pt-BR')} · {order.tipo_pedido}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-700">R$ {parseFloat(order.valor_total).toFixed(2).replace('.', ',')}</div>
                    <span className="text-[11px]" style={{ color: order.status === 'entregue' ? '#16a34a' : order.status === 'cancelado' ? '#dc2626' : '#d97706' }}>
                      {order.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Internal notes */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="font-semibold text-gray-700 text-sm mb-2">Observações Internas</h4>
          <textarea
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none resize-none"
            rows={3}
            placeholder="Adicione uma nota sobre este cliente..."
          />
          <button className="mt-2 text-xs px-3 py-1.5 rounded-lg font-medium text-white" style={{ backgroundColor: PRIMARY }}>Salvar nota</button>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button className="w-full py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4" /> Entrar em Contato
          </button>
          <button className="w-full py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <Gift className="w-4 h-4" /> Aplicar Cupom ou Benefício
          </button>
        </div>
      </div>
    </div>
  );
}

export function Customers() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [selected, setSelected] = useState<any | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/clientes').then(res => {
      const data = res.data.data;
      setCustomers(Array.isArray(data) ? data : data?.data || []);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching customers', err);
      setLoading(false);
    });
  }, []);

  const filtered = customers.filter(c => {
    const matchSearch = (c.nome || '').toLowerCase().includes(search.toLowerCase()) || 
                        (c.email || '').toLowerCase().includes(search.toLowerCase());
    
    // Como a API atual não retorna contagem de pedidos, 
    // os filtros de 'Recorrentes' e 'Novos' funcionarão apenas com base na lógica disponível
    const ordersCount = c.orders || 0; 
    
    if (filter === 'Recorrentes') return matchSearch && ordersCount > 10;
    if (filter === 'Novos') return matchSearch && ordersCount <= 3;
    if (filter === 'Inativos') return matchSearch && c.status === 'inativo';
    
    return matchSearch;
  });

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
            {['Todos', 'Recorrentes', 'Novos', 'Inativos'].map(f => (
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
                {filtered.map(customer => {
                  const isActive = customer.status === 'ativo';
                  const ordersCount = customer.orders || 0;
                  const totalSpent = customer.total || 0;

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
                        <span className="font-medium text-gray-700">R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
      </div>

      {selected && <CustomerDetail customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
