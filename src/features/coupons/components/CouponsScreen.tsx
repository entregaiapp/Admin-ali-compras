import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Power, Ticket, X, Copy, Check, Search } from 'lucide-react';
import api from '@/shared/lib/api';
import { dateInputInBrasilia, endOfBrasiliaDayInput, formatBrasiliaDate } from '@/shared/lib/dateTime';
import { showSystemNotice } from '@/shared/components/SystemToast';
import { ADMIN_STORE_THEME_UPDATED_EVENT } from '@/shared/constants/uiEvents';

const PRIMARY = '#122a4c';
const getApiData = (payload: any) => payload?.data?.data ?? payload?.data ?? payload;

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((character) => character + character).join('')
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(value)) return `rgba(18, 42, 76, ${alpha})`;

  const number = Number.parseInt(value, 16);
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
};

type CouponStatusFilter = 'Todos' | 'Ativo' | 'Inativo' | 'Encerrado';
const toNullableNumber = (value: string) => {
  if (value.trim() === '') return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const toNullableInteger = (value: string) => {
  if (value.trim() === '') return null;
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue >= 0 ? numericValue : null;
};

function CouponForm({ coupon, onClose, onSuccess, primaryColor }: { coupon?: any; onClose: () => void; onSuccess: () => void; primaryColor: string }) {
  const defaultType = coupon?.type || 'Percentual';
  const [type, setType] = useState(defaultType);
  const [code, setCode] = useState(coupon?.name || '');
  const [value, setValue] = useState(coupon?.raw_value || '');
  const [expires, setExpires] = useState(coupon?.raw_expires || '');
  const [maxUse, setMaxUse] = useState(coupon?.maxUse || '');
  const [perCustomerUse, setPerCustomerUse] = useState(coupon?.perCustomerUse || '');
  const [minOrder, setMinOrder] = useState(coupon?.minOrder || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [loading, onClose]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const tipoMapping: Record<string, string> = {
        'Percentual': 'percentual',
        'Fixo': 'fixo'
      };

      const payload = {
        codigo: code,
        tipo_desconto: tipoMapping[type] || 'percentual',
        valor_desconto: toNullableNumber(String(value)) ?? 0,
        limite_uso_total: toNullableInteger(String(maxUse)),
        limite_uso_por_cliente: toNullableInteger(String(perCustomerUse)),
        valor_minimo_pedido: toNullableNumber(String(minOrder)),
        expira_em: endOfBrasiliaDayInput(expires),
        ativo: coupon ? coupon.raw_ativo : true,
      };
      
      if (coupon?.id) {
        await api.patch(`/cupons/${coupon.id}`, payload);
      } else {
        await api.post('/cupons', payload);
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving coupon', error);
      showSystemNotice(error?.response?.data?.error?.message || 'Não foi possível salvar o cupom. Verifique os campos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{coupon ? 'Editar cupom' : 'Novo cupom'}</h2>
            <p className="mt-0.5 text-xs text-gray-500">Configure as regras de utilização.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100" title="Fechar (Esc)" aria-label="Fechar modal"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Código do cupom *</label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase bg-white focus:outline-none"
              placeholder="Ex: DESCONTO10"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Tipo de desconto</label>
            <div className="grid grid-cols-2 gap-2">
              {['Percentual', 'Fixo'].map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="py-2 rounded-lg text-xs font-medium border-2 transition-colors"
                  type="button"
                  style={type === t ? { borderColor: primaryColor, backgroundColor: hexToRgba(primaryColor, 0.07), color: primaryColor } : { borderColor: '#e5e7eb', backgroundColor: 'white', color: '#6b7280' }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">{type === 'Percentual' ? 'Percentual (%)' : 'Valor (R$)'} *</label>
            <input
              value={value}
              onChange={e => setValue(e.target.value)}
              type="number"
              min="0"
              step={type === 'Percentual' ? '1' : '0.01'}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
              placeholder={type === 'Percentual' ? '10' : '15.00'}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Validade</label>
              <input 
                type="date" 
                value={expires}
                onChange={e => setExpires(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Quantidade total de usos</label>
              <input 
                type="number" 
                min="0"
                value={maxUse}
                onChange={e => setMaxUse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" 
                placeholder="Sem limite" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Usos por cliente</label>
            <input
              type="number"
              min="0"
              value={perCustomerUse}
              onChange={e => setPerCustomerUse(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
              placeholder="Sem limite por cliente"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Valor mínimo de pedido (R$)</label>
            <input 
              type="number" 
              min="0"
              step="0.01"
              value={minOrder}
              onChange={e => setMinOrder(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" 
              placeholder="0.00 = sem mínimo" 
            />
          </div>
          <div className="flex gap-2 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50">Cancelar</button>
            <button type="button" onClick={handleSubmit} disabled={loading} className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
              {loading ? 'Salvando...' : (coupon ? 'Salvar alterações' : 'Criar cupom')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CouponsScreen() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null | undefined>(undefined);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [primaryColor, setPrimaryColor] = useState(PRIMARY);
  const [statusFilter, setStatusFilter] = useState<CouponStatusFilter>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  const user = (() => {
    try {
      const userJson = localStorage.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  })();

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await api.get('/cupons');
      const rawData = res.data.data;
      const data = Array.isArray(rawData) ? rawData : rawData?.data || [];
      
      const mapped = data.map((c: any) => {
        const typeMapping: Record<string, string> = {
          'percentual': 'Percentual',
          'fixo': 'Fixo'
        };

        const isExpired = c.expira_em && new Date(c.expira_em) < new Date();
        const status = !c.ativo ? 'Inativo' : isExpired ? 'Encerrado' : 'Ativo';

        let formattedValue = '—';
        if (c.tipo_desconto === 'percentual') formattedValue = `${parseFloat(c.valor_desconto)}%`;
        if (c.tipo_desconto === 'fixo') formattedValue = `R$ ${parseFloat(c.valor_desconto).toFixed(2).replace('.', ',')}`;

        let expDate = 'Sem validade';
        let rawExpires = '';
        if (c.expira_em) {
           const d = new Date(c.expira_em);
           expDate = formatBrasiliaDate(d);
           rawExpires = dateInputInBrasilia(d);
        }

        return {
          id: c.id,
          name: c.codigo,
          type: typeMapping[c.tipo_desconto] || 'Percentual',
          value: formattedValue,
          expires: expDate,
          raw_expires: rawExpires,
          status,
          raw_ativo: c.ativo,
          raw_value: c.valor_desconto,
          maxUse: c.limite_uso_total ?? '',
          perCustomerUse: c.limite_uso_por_cliente ?? '',
          used: c.quantidade_usada ?? c.usos_total ?? 0,
          remainingUses: c.usos_restantes ?? null,
          minOrder: c.valor_minimo_pedido || ''
        };
      });

      setCoupons(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();

    if (user?.loja_id) {
      api.get(`/lojas/${user.loja_id}/configuracoes`)
        .then((response) => {
          const rawConfig = getApiData(response);
          const config = Array.isArray(rawConfig) ? rawConfig[0] || {} : rawConfig || {};
          setPrimaryColor(config.cor_primaria || PRIMARY);
        })
        .catch((error) => console.error('Error fetching store configuration:', error));
    }
  }, []);

  useEffect(() => {
    const handleStoreThemeUpdated = (event: Event) => {
      const nextPrimaryColor = (event as CustomEvent<{ primaryColor?: string }>).detail?.primaryColor;
      if (nextPrimaryColor) setPrimaryColor(nextPrimaryColor);
    };

    window.addEventListener(ADMIN_STORE_THEME_UPDATED_EVENT, handleStoreThemeUpdated);
    return () => window.removeEventListener(ADMIN_STORE_THEME_UPDATED_EVENT, handleStoreThemeUpdated);
  }, []);

  const toggle = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/cupons/${id}/ativo`, { ativo: !currentStatus });
      fetchCoupons();
    } catch (err) {
      console.error('Error toggling coupon status', err);
    }
  };

  const copy = (id: string, code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const couponCounts = useMemo(() => ({
    Todos: coupons.length,
    Ativo: coupons.filter((coupon) => coupon.status === 'Ativo').length,
    Inativo: coupons.filter((coupon) => coupon.status === 'Inativo').length,
    Encerrado: coupons.filter((coupon) => coupon.status === 'Encerrado').length,
  }), [coupons]);

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');
  const filteredCoupons = useMemo(() => coupons.filter((coupon) => {
    const matchesStatus = statusFilter === 'Todos' || coupon.status === statusFilter;
    const matchesSearch = !normalizedSearch
      || String(coupon.name || '').toLocaleLowerCase('pt-BR').includes(normalizedSearch)
      || String(coupon.type || '').toLocaleLowerCase('pt-BR').includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  }), [coupons, normalizedSearch, statusFilter]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-50/70">
      {editing !== undefined && (
        <CouponForm
          coupon={editing}
          primaryColor={primaryColor}
          onClose={() => setEditing(undefined)}
          onSuccess={fetchCoupons}
        />
      )}

      <div className="flex min-h-[56px] items-end justify-between gap-3 border-b border-gray-200 bg-white px-4">
        <div className="flex h-full min-w-0 items-end overflow-x-auto" role="tablist" aria-label="Status dos cupons">
          {(['Todos', 'Ativo', 'Inativo', 'Encerrado'] as CouponStatusFilter[]).map((status) => {
            const selected = statusFilter === status;
            const label = status === 'Todos' ? 'Todos' : status === 'Ativo' ? 'Ativos' : status === 'Inativo' ? 'Inativos' : 'Encerrados';
            return (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setStatusFilter(status)}
                className="relative flex h-full min-h-[56px] shrink-0 items-center gap-2 px-3.5 text-sm font-semibold transition-colors"
                style={{ color: selected ? primaryColor : '#64748b' }}
              >
                {label}
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{
                    backgroundColor: selected ? hexToRgba(primaryColor, 0.1) : '#f1f5f9',
                    color: selected ? primaryColor : '#64748b',
                  }}
                >
                  {couponCounts[status]}
                </span>
                {selected && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t-full" style={{ backgroundColor: primaryColor }} />}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setEditing(null)}
          className="mb-2.5 flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo cupom</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por código ou tipo de desconto"
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:bg-white"
            />
          </div>
          <div className="hidden px-2 text-right sm:block">
            <div className="text-xs font-medium text-gray-500">Usos registrados</div>
            <div className="text-sm font-bold text-gray-800">{coupons.reduce((total, coupon) => total + Number(coupon.used || 0), 0)}</div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200" style={{ borderTopColor: primaryColor }} />
            Carregando cupons...
          </div>
        ) : filteredCoupons.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredCoupons.map((coupon) => {
              const maxUse = Number(coupon.maxUse || 0);
              const used = Number(coupon.used || 0);
              const percentage = maxUse > 0 ? Math.min(Math.round((used / maxUse) * 100), 100) : 0;
              const usageColor = percentage > 90 ? '#dc2626' : percentage > 70 ? '#d97706' : '#16a34a';
              const statusStyle = coupon.status === 'Ativo'
                ? { backgroundColor: '#f0fdf4', color: '#16a34a' }
                : coupon.status === 'Encerrado'
                  ? { backgroundColor: '#f3f4f6', color: '#6b7280' }
                  : { backgroundColor: '#fef2f2', color: '#dc2626' };

              return (
                <article key={coupon.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-gray-300">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: hexToRgba(primaryColor, 0.08), color: primaryColor }}>
                          <Ticket className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <code className="truncate font-mono text-sm font-bold text-gray-900">{coupon.name}</code>
                            <button type="button" onClick={() => copy(coupon.id, coupon.name)} className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" title="Copiar código" aria-label="Copiar código">
                              {copied === coupon.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          <span className="text-xs text-gray-500">{coupon.type}</span>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={statusStyle}>{coupon.status}</span>
                    </div>

                    <div className="mt-3 flex items-end justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                      <div>
                        <div className="text-[10px] font-medium text-gray-500">Desconto</div>
                        <div className="text-lg font-bold text-green-700">{coupon.value}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-medium text-gray-500">Validade</div>
                        <div className="text-xs font-semibold text-gray-700">{coupon.expires}</div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border border-gray-100 px-2.5 py-2">
                        <div className="text-gray-400">Pedido mínimo</div>
                        <div className="mt-0.5 font-semibold text-gray-700">{coupon.minOrder ? `R$ ${Number(coupon.minOrder).toFixed(2).replace('.', ',')}` : 'Sem mínimo'}</div>
                      </div>
                      <div className="rounded-lg border border-gray-100 px-2.5 py-2">
                        <div className="text-gray-400">Por cliente</div>
                        <div className="mt-0.5 font-semibold text-gray-700">{coupon.perCustomerUse !== '' ? coupon.perCustomerUse : 'Sem limite'}</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
                        <span>{used} de {maxUse || '∞'} usos</span>
                        {maxUse > 0 && <span className="font-semibold" style={{ color: usageColor }}>{percentage}%</span>}
                      </div>
                      {maxUse > 0 && (
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: usageColor }} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-gray-100 bg-gray-50/70 p-2.5">
                    <button type="button" onClick={() => setEditing(coupon)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50">
                      <Edit2 className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(coupon.id, coupon.raw_ativo)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-colors ${coupon.raw_ativo ? 'border-red-100 bg-red-50 text-red-700 hover:bg-red-100' : 'border-green-100 bg-green-50 text-green-700 hover:bg-green-100'}`}
                    >
                      <Power className="h-3.5 w-3.5" /> {coupon.raw_ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-300">
              <Ticket className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-gray-800">Nenhum cupom encontrado</h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500">Altere a busca ou o filtro para visualizar outros cupons.</p>
            {coupons.length === 0 && (
              <button type="button" onClick={() => setEditing(null)} className="mt-4 rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: primaryColor }}>
                Criar primeiro cupom
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
