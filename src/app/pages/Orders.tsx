import { useState, useEffect } from 'react';
import {
  Search, Filter, Eye, X, Phone, MapPin, Clock,
  CreditCard, User, Package, ArrowLeft, CheckCircle2,
  Printer, List, Map, ChevronDown, ChevronRight, TruckIcon
} from 'lucide-react';
import api from '../services/api';

const statusColor: Record<string, { bg: string; text: string }> = {
  'Recebido': { bg: '#fffbeb', text: '#d97706' },
  'pendente': { bg: '#fffbeb', text: '#d97706' },
  'Confirmado': { bg: '#eff6ff', text: '#2563eb' },
  'confirmado': { bg: '#eff6ff', text: '#2563eb' },
  'Em Separação': { bg: '#f5f3ff', text: '#7c3aed' },
  'em_separacao': { bg: '#f5f3ff', text: '#7c3aed' },
  'Pronto': { bg: '#ecfeff', text: '#0891b2' },
  'pronto': { bg: '#ecfeff', text: '#0891b2' },
  'Saiu para Entrega': { bg: '#fff7ed', text: '#ea580c' },
  'saiu_para_entrega': { bg: '#fff7ed', text: '#ea580c' },
  'Entregue': { bg: '#f0fdf4', text: '#16a34a' },
  'entregue': { bg: '#f0fdf4', text: '#16a34a' },
  'Cancelado': { bg: '#fef2f2', text: '#dc2626' },
  'cancelado': { bg: '#fef2f2', text: '#dc2626' },
};

const statusLabels: Record<string, string> = {
  'pendente': 'Recebido',
  'confirmado': 'Confirmado',
  'em_separacao': 'Em Separação',
  'pronto': 'Pronto',
  'saiu_para_entrega': 'Saiu para Entrega',
  'entregue': 'Entregue',
  'cancelado': 'Cancelado',
};

const bairroColors = [
  { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', dot: '#3b82f6' },
  { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', dot: '#22c55e' },
  { bg: '#fdf4ff', border: '#e9d5ff', text: '#7e22ce', dot: '#a855f7' },
  { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', dot: '#f97316' },
  { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', dot: '#ef4444' },
  { bg: '#f0fdfa', border: '#99f6e4', text: '#0f766e', dot: '#14b8a6' },
  { bg: '#fefce8', border: '#fef08a', text: '#854d0e', dot: '#eab308' },
  { bg: '#f8fafc', border: '#e2e8f0', text: '#334155', dot: '#64748b' },
];

const allStatuses = ['Todos', 'Recebido', 'Confirmado', 'Em Separação', 'Pronto', 'Saiu para Entrega', 'Entregue', 'Cancelado'];
const statusFlow = ['Recebido', 'Confirmado', 'Em Separação', 'Pronto', 'Saiu para Entrega', 'Entregue'];
const PRIMARY = '#122a4c';

const orderItemsMock = [
  { name: 'Arroz Camil 1kg', qty: 2, price: 8.49, obs: '' },
  { name: 'Leite Italac 1L', qty: 4, price: 4.89, obs: '' },
];

const extractBairro = (address: string) => {
  if (!address) return 'Não informado';
  const parts = address.split('–');
  return parts.length > 1 ? parts[1].trim() : 'Não informado';
};

// Print comanda for a single order
const printComanda = (order: any, orderItems: any[] = orderItemsMock) => {
  const subtotal = orderItems.reduce((a, i) => a + (i.price_unit * i.quantity || i.price * i.qty), 0);
  const delivery = order.type === 'Entrega' || order.tipo_pedido === 'entrega' ? (order.taxa_entrega || 6.99) : 0;
  const total = order.total || order.valor_total || 0;
  
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comanda ${order.numero_pedido || order.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', Courier, monospace; max-width: 300px; margin: 0 auto; padding: 16px; font-size: 12px; color: #000; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .large { font-size: 15px; }
    .divider-solid { border-top: 1px solid #000; margin: 8px 0; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .row-total { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-bottom: 3px; }
    .obs { font-size: 10px; color: #555; margin: 0 0 5px 16px; font-style: italic; }
    p { margin-bottom: 4px; }
    .tag { display: inline-block; border: 1px solid #000; padding: 1px 6px; font-size: 11px; margin: 2px 0; }
  </style>
</head>
<body>
  <div class="center">
    <p class="large bold">SÃO JORGE SUPER</p>
    <p style="font-size:10px">CNPJ: 00.000.000/0001-00</p>
    <p style="font-size:10px">Rua São Jorge, 100 – Centro</p>
    <p style="font-size:10px">Tel: (11) 3000-0000</p>
  </div>
  <div class="divider-solid"></div>
  <div class="center">
    <p class="bold large">COMANDA DE PEDIDO</p>
    <p>Pedido: <span class="bold">${order.numero_pedido || order.id}</span></p>
    <p>Data: ${new Date(order.created_at || new Date()).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date(order.created_at || new Date()).toLocaleTimeString('pt-BR')}</p>
    <span class="tag">${(order.tipo_pedido || order.type || '').toUpperCase()}</span>
  </div>
  <div class="divider"></div>
  <p><span class="bold">Cliente:</span> ${order.cliente?.nome || order.customer || 'Não informado'}</p>
  <p><span class="bold">Telefone:</span> ${order.cliente?.telefone || order.phone || 'Não informado'}</p>
  ${(order.type === 'Entrega' || order.tipo_pedido === 'entrega') ? `<p><span class="bold">Endereço:</span> ${order.endereco_cliente?.logradouro || order.address || 'Não informado'}</p><p><span class="bold">Bairro:</span> ${order.endereco_cliente?.bairro || extractBairro(order.address || '')}</p>` : ''}
  <div class="divider"></div>
  <p class="bold" style="margin-bottom:6px">ITENS DO PEDIDO:</p>
  ${orderItems.map(i => `
    <div class="row">
      <span>${i.quantity || i.qty}x ${i.produto?.nome || i.name}</span>
      <span>R$ ${((i.price_unit || i.price) * (i.quantity || i.qty)).toFixed(2).replace('.', ',')}</span>
    </div>
    ${i.observacoes || i.obs ? `<p class="obs">Obs: ${i.observacoes || i.obs}</p>` : ''}
  `).join('')}
  <div class="divider"></div>
  <div class="row"><span>Subtotal</span><span>R$ ${subtotal.toFixed(2).replace('.', ',')}</span></div>
  ${(order.type === 'Entrega' || order.tipo_pedido === 'entrega') ? `<div class="row"><span>Taxa de entrega</span><span>R$ ${delivery.toFixed(2).replace('.', ',')}</span></div>` : '<div class="row"><span>Retirada na loja</span><span>Grátis</span></div>'}
  <div class="row"><span>Desconto</span><span>R$ ${(order.desconto || 0).toFixed(2).replace('.', ',')}</span></div>
  <div class="divider-solid"></div>
  <div class="row-total"><span>TOTAL A PAGAR</span><span>R$ ${parseFloat(total).toFixed(2).replace('.', ',')}</span></div>
  <div class="divider"></div>
  <p><span class="bold">Pagamento:</span> ${order.pagamento?.metodo || order.payment || 'Não informado'}</p>
  <div class="divider-solid"></div>
  <div class="center" style="margin-top: 8px;">
    <p>Obrigado pela preferência!</p>
    <p class="bold" style="margin-top:4px">São Jorge Super</p>
    <p style="font-size:10px;margin-top:2px">www.saojorgesuper.com.br</p>
  </div>
  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=420,height=650');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
};

const printBairroRoute = (bairro: string, bairroOrders: any[]) => {
  const total = bairroOrders.reduce((a, o) => a + parseFloat(o.valor_total || o.total || 0), 0);
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Rota – ${bairro}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', Courier, monospace; max-width: 300px; margin: 0 auto; padding: 16px; font-size: 12px; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .divider-solid { border-top: 1px solid #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
    p { margin-bottom: 4px; }
    .order-block { border: 1px dashed #555; padding: 8px; margin-bottom: 8px; }
    .num { display: inline-block; width: 18px; height: 18px; border: 1px solid #000; text-align: center; line-height: 18px; margin-right: 4px; font-size: 10px; }
  </style>
</head>
<body>
  <div class="center">
    <p class="bold" style="font-size:15px">SÃO JORGE SUPER</p>
    <p style="font-size:10px">FOLHA DE ROTA</p>
  </div>
  <div class="divider-solid"></div>
  <div class="center">
    <p class="bold" style="font-size:13px">BAIRRO: ${bairro.toUpperCase()}</p>
    <p>Data: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
    <p>${bairroOrders.length} pedido${bairroOrders.length !== 1 ? 's' : ''} · R$ ${total.toFixed(2).replace('.', ',')}</p>
  </div>
  <div class="divider"></div>
  ${bairroOrders.map((o, i) => `
    <div class="order-block">
      <p><span class="num">${i + 1}</span> <span class="bold">${o.numero_pedido || o.id}</span> – ${statusLabels[o.status] || o.status}</p>
      <p class="bold" style="margin-top:4px">${o.cliente?.nome || o.customer || 'Não informado'}</p>
      <p>${o.cliente?.telefone || o.phone || 'Não informado'}</p>
      <p>${o.endereco_cliente?.logradouro || o.address || 'Não informado'}</p>
      <div class="divider"></div>
      <div class="row"><span>Total</span><span class="bold">R$ ${parseFloat(o.valor_total || o.total || 0).toFixed(2).replace('.', ',')}</span></div>
      <div class="row"><span>Pagamento</span><span>${o.pagamento?.metodo || o.payment || 'Não informado'}</span></div>
    </div>
  `).join('')}
  <div class="divider-solid"></div>
  <div class="row bold"><span>TOTAL DA ROTA</span><span>R$ ${total.toFixed(2).replace('.', ',')}</span></div>
  <div style="margin-top:12px">
    <p>Entregador: _______________________</p>
    <p style="margin-top:8px">Saída: ______ Retorno: ______</p>
  </div>
  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=420,height=700');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
};

export function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [selected, setSelected] = useState<any | null>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'lista' | 'bairros'>('lista');
  const [expandedBairros, setExpandedBairros] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const PER_PAGE = 20;

  useEffect(() => {
    setOrders([]);
    setPage(1);
    fetchOrders(1, true);
  }, [statusFilter, typeFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setOrders([]);
      setPage(1);
      fetchOrders(1, true);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchOrders = async (pageNum = 1, reset = false) => {
    try {
      setLoading(true);
      const params: any = { 
        page: pageNum, 
        per_page: PER_PAGE + 1, // Pesquisa 21 para saber se tem mais
        status: statusFilter === 'Todos' ? undefined : Object.keys(statusLabels).find(k => statusLabels[k] === statusFilter),
        tipo_pedido: typeFilter === 'Todos' ? undefined : typeFilter.toLowerCase(),
        busca: search || undefined
      };
      
      const response = await api.get('/pedidos', { params });
      const rawData = response.data.data;
      const data = Array.isArray(rawData) ? rawData : rawData?.data || [];
      
      const more = data.length > PER_PAGE;
      const displayData = more ? data.slice(0, PER_PAGE) : data;
      
      setHasMore(more);
      setOrders(prev => reset ? displayData : [...prev, ...displayData]);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    fetchOrders(page + 1);
  };

  const fetchOrderItems = async (orderId: string) => {
    try {
      const response = await api.get('/itens_pedido', { params: { pedido_id: orderId } });
      setSelectedItems(response.data.data || []);
    } catch (error) {
      console.error('Error fetching order items:', error);
      // fallback
      try {
        const resp2 = await api.get(`/pedidos/${orderId}/itens`);
        setSelectedItems(resp2.data.data || []);
      } catch (err2) {
         setSelectedItems(orderItemsMock);
      }
    }
  };

  const handleSelectOrder = (order: any) => {
    setSelected(order);
    setSelectedItems([]);
    fetchOrderItems(order.id);
  };

  const advanceStatus = async (id: string, currentStatus: string) => {
    const rawStatus = currentStatus.toLowerCase().replace(' ', '_').replace('ç', 'c').replace('ã', 'a');
    
    // Map current status to next status in backend format
    const backendStatusFlow = ['pendente', 'confirmado', 'em_separacao', 'pronto', 'saiu_para_entrega', 'entregue'];
    let idx = backendStatusFlow.indexOf(rawStatus);
    
    // If not found in exact format, try to match by label
    if (idx === -1) {
       const mapped = Object.entries(statusLabels).find(([k, v]) => v === currentStatus);
       if (mapped) idx = backendStatusFlow.indexOf(mapped[0]);
    }
    
    if (idx >= 0 && idx < backendStatusFlow.length - 1) {
      const nextStatus = backendStatusFlow[idx + 1];
      try {
        await api.patch(`/pedidos/${id}/status`, { status: nextStatus });
        
        // Update local state
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: nextStatus } : o));
        if (selected?.id === id) {
          setSelected((p: any) => p ? { ...p, status: nextStatus } : null);
        }
      } catch (error) {
        console.error('Error updating status', error);
      }
    }
  };

  const cancelOrder = async (id: string) => {
     try {
        await api.patch(`/pedidos/${id}/cancelar`);
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelado' } : o));
        if (selected?.id === id) setSelected((p: any) => p ? { ...p, status: 'cancelado' } : null);
     } catch (error) {
        console.error('Error canceling order', error);
     }
  };

  const getStatusLabel = (status: string) => statusLabels[status] || status;

  const filtered = orders.filter(o => {
    const customerName = (o.cliente?.nome || o.customer || '').toLowerCase();
    const orderId = (o.numero_pedido || o.id || '').toLowerCase();
    const matchSearch = customerName.includes(search.toLowerCase()) || orderId.includes(search.toLowerCase());
    
    // No longer filtering by status/type in memory as we do it in API
    return matchSearch;
  });

  const deliveryOrders = filtered.filter(o => (o.tipo_pedido || o.type || '').toLowerCase() === 'entrega');
  const bairroGroups: Record<string, { orders: any[]; total: number; colorIdx: number }> = {};
  const bairroColorMap: Record<string, number> = {};
  
  deliveryOrders.forEach(o => {
    const bairro = o.endereco_cliente?.bairro || extractBairro(o.address || '');
    if (!bairroGroups[bairro]) {
      bairroColorMap[bairro] = Object.keys(bairroColorMap).length % bairroColors.length;
      bairroGroups[bairro] = { orders: [], total: 0, colorIdx: bairroColorMap[bairro] };
    }
    bairroGroups[bairro].orders.push(o);
    bairroGroups[bairro].total += parseFloat(o.valor_total || o.total || 0);
  });
  
  const sortedBairros = Object.entries(bairroGroups).sort((a, b) => b[1].orders.length - a[1].orders.length);

  const toggleBairro = (bairro: string) => {
    setExpandedBairros(p => ({ ...p, [bairro]: !p[bairro] }));
  };

  if (loading && orders.length === 0) {
    return (
      <div className="p-5 flex-1 h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }}></div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left panel: list or bairros */}
      <div className={`flex flex-col ${selected ? 'hidden lg:flex lg:w-1/2 xl:w-3/5' : 'flex-1'}`}>

        {/* Filters bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por pedido ou cliente..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1"
              />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 bg-white hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
            </button>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode('lista')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={viewMode === 'lista' ? { backgroundColor: PRIMARY, color: 'white' } : { color: '#6b7280' }}
              >
                <List className="w-3.5 h-3.5" /> Lista
              </button>
              <button
                onClick={() => setViewMode('bairros')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={viewMode === 'bairros' ? { backgroundColor: PRIMARY, color: 'white' } : { color: '#6b7280' }}
              >
                <Map className="w-3.5 h-3.5" /> Por Bairro
              </button>
            </div>
            {viewMode === 'bairros' && (
              <span className="text-xs text-gray-400">Somente pedidos de entrega</span>
            )}
          </div>

          {viewMode === 'lista' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {allStatuses.map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0"
                  style={statusFilter === s
                    ? { backgroundColor: PRIMARY, color: 'white' }
                    : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
                >
                  {s}
                </button>
              ))}
              <div className="w-px h-4 bg-gray-200 flex-shrink-0 mx-1" />
              {['Todos', 'Entrega', 'Retirada'].map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0"
                  style={typeFilter === t
                    ? { backgroundColor: '#e0e7ff', color: '#3730a3' }
                    : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Count bar */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
          {viewMode === 'lista' ? (
            <span className="text-xs text-gray-500">{filtered.length} pedido{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</span>
          ) : (
            <span className="text-xs text-gray-500">{sortedBairros.length} bairro{sortedBairros.length !== 1 ? 's' : ''} · {deliveryOrders.length} pedido{deliveryOrders.length !== 1 ? 's' : ''} de entrega</span>
          )}
        </div>

        {/* ── LISTA VIEW ─────────────────────────────── */}
        {viewMode === 'lista' && (
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filtered.map(order => {
              const statusDisplay = getStatusLabel(order.status);
              const sc = statusColor[order.status] ?? statusColor['Recebido'];
              const isSelected = selected?.id === order.id;
              const isEntrega = (order.tipo_pedido || order.type || '').toLowerCase() === 'entrega';
              
              return (
                <div
                  key={order.id}
                  onClick={() => handleSelectOrder(order)}
                  className={`px-4 py-3.5 cursor-pointer transition-colors hover:bg-gray-50 ${isSelected ? 'bg-blue-50/50 border-l-2' : ''}`}
                  style={isSelected ? { borderLeftColor: PRIMARY } : {}}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">{order.numero_pedido || order.id}</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: sc.bg, color: sc.text }}>
                          {statusDisplay}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{isEntrega ? 'Entrega' : 'Retirada'}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">{order.cliente?.nome || order.customer || 'Desconhecido'}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(order.created_at || new Date()).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1"><CreditCard className="w-3 h-3" />{order.pagamento?.metodo || order.payment || 'Pendente'}</span>
                        {isEntrega && (
                          <span className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{order.endereco_cliente?.bairro || extractBairro(order.address || '')}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-gray-800">R$ {parseFloat(order.valor_total || order.total || 0).toFixed(2).replace('.', ',')}</div>
                      <button
                        onClick={e => { e.stopPropagation(); handleSelectOrder(order); }}
                        className="mt-1 text-xs flex items-center gap-1 ml-auto hover:underline"
                        style={{ color: PRIMARY }}
                      >
                        <Eye className="w-3 h-3" /> Detalhes
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {hasMore && (
              <div className="p-4 flex justify-center border-t border-gray-100">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-2 rounded-full border text-sm font-medium transition-colors hover:bg-gray-50 flex items-center gap-2"
                  style={{ borderColor: PRIMARY, color: PRIMARY }}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderTopColor: PRIMARY }}></div>
                  ) : (
                    'Carregar mais pedidos'
                  )}
                </button>
              </div>
            )}

            {filtered.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Package className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">Nenhum pedido encontrado</p>
              </div>
            )}
          </div>
        )}

        {/* ── POR BAIRRO VIEW ────────────────────────── */}
        {viewMode === 'bairros' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sortedBairros.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <TruckIcon className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">Nenhum pedido de entrega encontrado</p>
              </div>
            )}
            {sortedBairros.map(([bairro, group], idx) => {
              const col = bairroColors[group.colorIdx];
              const isExpanded = expandedBairros[bairro] !== false; // expanded by default
              const activeOrders = group.orders.filter(o => !['entregue', 'cancelado', 'Entregue', 'Cancelado'].includes(o.status));
              const deliveredCount = group.orders.filter(o => ['entregue', 'Entregue'].includes(o.status)).length;
              return (
                <div
                  key={bairro}
                  className="rounded-xl border overflow-hidden"
                  style={{ borderColor: col.border, backgroundColor: col.bg }}
                >
                  {/* Bairro header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                    onClick={() => toggleBairro(bairro)}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                      style={{ backgroundColor: col.dot }}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: col.text }}>{bairro}</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                          style={{ backgroundColor: col.dot }}
                        >
                          {group.orders.length} pedido{group.orders.length !== 1 ? 's' : ''}
                        </span>
                        {activeOrders.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white border" style={{ color: col.text, borderColor: col.border }}>
                            {activeOrders.length} ativo{activeOrders.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {deliveredCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                            {deliveredCount} entregue{deliveredCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: col.text, opacity: 0.75 }}>
                        Total: R$ {group.total.toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); printBairroRoute(bairro, group.orders); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors hover:opacity-80"
                        style={{ borderColor: col.border, backgroundColor: 'white', color: col.text }}
                        title="Imprimir folha de rota"
                      >
                        <Printer className="w-3 h-3" />
                        <span className="hidden sm:inline">Rota</span>
                      </button>
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: col.text }} />
                        : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: col.text }} />
                      }
                    </div>
                  </div>

                  {/* Orders in this bairro */}
                  {isExpanded && (
                    <div className="bg-white border-t divide-y" style={{ borderColor: col.border }}>
                      {group.orders.map((order, oIdx) => {
                        const statusDisplay = getStatusLabel(order.status);
                        const sc = statusColor[order.status] ?? statusColor['Recebido'];
                        return (
                          <div
                            key={order.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => handleSelectOrder(order)}
                          >
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0"
                              style={{ backgroundColor: col.dot, fontSize: '10px', fontWeight: 700 }}
                            >
                              {oIdx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-gray-800">{order.numero_pedido || order.id}</span>
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                                  style={{ backgroundColor: sc.bg, color: sc.text }}
                                >
                                  {statusDisplay}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 mt-0.5 truncate">{order.cliente?.nome || order.customer}</div>
                              <div className="text-xs text-gray-400 mt-0.5 truncate">{order.endereco_cliente?.logradouro || (order.address?.split('–')[0]?.trim())}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-gray-400">{order.cliente?.telefone || order.phone}</span>
                                <span className="text-[11px] text-gray-400">· {order.pagamento?.metodo || order.payment}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-semibold text-gray-700">R$ {parseFloat(order.valor_total || order.total || 0).toFixed(2).replace('.', ',')}</div>
                              <div className="flex items-center gap-1 mt-1">
                                <button
                                  onClick={e => { e.stopPropagation(); printComanda(order); }}
                                  className="text-[11px] flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors"
                                  title="Imprimir comanda"
                                >
                                  <Printer className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); handleSelectOrder(order); }}
                                  className="text-[11px] flex items-center gap-1 hover:underline"
                                  style={{ color: PRIMARY }}
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── DETAIL PANEL ───────────────────────────────── */}
      {selected && (
        <div className="flex-1 lg:border-l border-gray-200 overflow-y-auto bg-white">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3.5 flex items-center gap-3 z-10">
            <button onClick={() => setSelected(null)} className="lg:hidden text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-gray-900 font-semibold">Pedido {selected.numero_pedido || selected.id}</h2>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: (statusColor[selected.status] ?? statusColor['Recebido']).bg,
                    color: (statusColor[selected.status] ?? statusColor['Recebido']).text
                  }}
                >
                  {getStatusLabel(selected.status)}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                 {new Date(selected.created_at || new Date()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {(selected.tipo_pedido || selected.type || '').toUpperCase() === 'ENTREGA' ? 'Entrega' : 'Retirada'}
              </div>
            </div>
            <button
              onClick={() => printComanda(selected, selectedItems)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              title="Imprimir comanda"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Imprimir</span>
            </button>
            <button onClick={() => setSelected(null)} className="hidden lg:block text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Timeline */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {statusFlow.map((s, i) => {
                  const currentDisplay = getStatusLabel(selected.status);
                  const curIdx = statusFlow.indexOf(currentDisplay) >= 0 ? statusFlow.indexOf(currentDisplay) : 0;
                  const done = i <= curIdx;
                  return (
                    <div key={s} className="flex items-center gap-1 flex-shrink-0">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: done ? PRIMARY : '#e5e7eb' }}
                        >
                          {done
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            : <div className="w-2 h-2 rounded-full bg-gray-400" />}
                        </div>
                        <span className="text-[9px] text-gray-500 mt-1 text-center max-w-12 leading-tight">{s}</span>
                      </div>
                      {i < statusFlow.length - 1 && (
                        <div className="w-6 h-0.5 mb-3 flex-shrink-0" style={{ backgroundColor: i < curIdx ? PRIMARY : '#e5e7eb' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer info */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h4 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
                <User className="w-4 h-4" style={{ color: PRIMARY }} /> Dados do Cliente
              </h4>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-800">{selected.cliente?.nome || selected.customer || 'Sem nome'}</div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="w-3.5 h-3.5" />{selected.cliente?.telefone || selected.phone || 'Sem telefone'}
                </div>
                {(selected.tipo_pedido || selected.type || '').toLowerCase() === 'entrega' && (
                  <>
                    <div className="flex items-start gap-2 text-sm text-gray-500">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>{selected.endereco_cliente ? `${selected.endereco_cliente.logradouro}, ${selected.endereco_cliente.numero} - ${selected.endereco_cliente.complemento || ''}` : selected.address}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: '#e0e7ff', color: '#3730a3' }}
                      >
                        Bairro: {selected.endereco_cliente?.bairro || extractBairro(selected.address || '')}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h4 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" style={{ color: PRIMARY }} /> Itens do Pedido
              </h4>
              <div className="space-y-2.5">
                {selectedItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-700">{item.quantity || item.qty}x {item.produto?.nome || item.name}</div>
                      {(item.observacoes || item.obs) && <div className="text-xs text-gray-400 italic mt-0.5">{item.observacoes || item.obs}</div>}
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      R$ {((item.price_unit || item.price) * (item.quantity || item.qty)).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 mt-3 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span><span>R$ {(parseFloat(selected.subtotal || selected.total || 0)).toFixed(2).replace('.', ',')}</span>
                </div>
                {(selected.tipo_pedido || selected.type || '').toLowerCase() === 'entrega' ? (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Taxa de entrega</span><span>R$ {(parseFloat(selected.taxa_entrega || 6.99)).toFixed(2).replace('.', ',')}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Retirada na loja</span><span className="text-green-600">Grátis</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Desconto</span><span className="text-green-600">-R$ {(parseFloat(selected.desconto || 0)).toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-800">
                  <span>Total</span><span>R$ {parseFloat(selected.valor_total || selected.total || 0).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h4 className="text-gray-700 font-semibold mb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4" style={{ color: PRIMARY }} /> Pagamento
              </h4>
              <div className="text-sm text-gray-600">{selected.pagamento?.metodo || selected.payment || 'Não informado'}</div>
              <div className="mt-1 text-xs text-green-600 font-medium">✓ {selected.pagamento?.status || 'Confirmado'}</div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {getStatusLabel(selected.status) !== 'Entregue' && getStatusLabel(selected.status) !== 'Cancelado' && (
                <button
                  onClick={() => advanceStatus(selected.id, getStatusLabel(selected.status))}
                  className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {getStatusLabel(selected.status) === 'Recebido' && 'Confirmar Pedido'}
                  {getStatusLabel(selected.status) === 'Confirmado' && 'Iniciar Separação'}
                  {getStatusLabel(selected.status) === 'Em Separação' && 'Marcar como Pronto'}
                  {getStatusLabel(selected.status) === 'Pronto' && 'Enviar para Entrega'}
                  {getStatusLabel(selected.status) === 'Saiu para Entrega' && 'Confirmar Entrega'}
                </button>
              )}
              <button
                onClick={() => printComanda(selected, selectedItems)}
                className="w-full py-2.5 rounded-lg text-gray-700 text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Imprimir Comanda
              </button>
              {getStatusLabel(selected.status) !== 'Cancelado' && getStatusLabel(selected.status) !== 'Entregue' && (
                <button
                  onClick={() => cancelOrder(selected.id)}
                  className="w-full py-2.5 rounded-lg text-red-600 text-sm font-medium border border-red-200 hover:bg-red-50 transition-colors"
                >
                  Cancelar Pedido
                </button>
              )}
              <button className="w-full py-2.5 rounded-lg text-gray-600 text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" /> Entrar em Contato
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
