import { useState, useEffect } from 'react';
import { Plus, Edit2, Power, Ticket, X, Copy, Check } from 'lucide-react';
import api from '../services/api';

const PRIMARY = '#122a4c';

function CouponForm({ coupon, onClose, onSuccess }: { coupon?: any; onClose: () => void; onSuccess: () => void }) {
  const defaultType = coupon?.type || 'Percentual';
  const [type, setType] = useState(defaultType);
  const [code, setCode] = useState(coupon?.name || '');
  const [value, setValue] = useState(coupon?.raw_value || '');
  const [expires, setExpires] = useState(coupon?.raw_expires || '');
  const [maxUse, setMaxUse] = useState(coupon?.maxUse || '');
  const [minOrder, setMinOrder] = useState(coupon?.minOrder || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const tipoMapping: Record<string, string> = {
        'Percentual': 'percentual',
        'Fixo': 'fixo',
        'Frete Grátis': 'frete_gratis'
      };

      const payload = {
        codigo: code,
        tipo_desconto: tipoMapping[type] || 'percentual',
        valor_desconto: type !== 'Frete Grátis' ? parseFloat(value) : 0,
        limite_uso_total: parseInt(maxUse) || null,
        valor_minimo_pedido: parseFloat(minOrder) || null,
        expira_em: expires ? new Date(expires).toISOString() : null,
        ativo: coupon ? coupon.raw_ativo : true,
        // Mock loja_id for now, in a real app it'd be from auth context
        loja_id: '123e4567-e89b-12d3-a456-426614174000' 
      };
      
      if (coupon?.id) {
        await api.patch(`/cupons/${coupon.id}`, payload);
      } else {
        await api.post('/cupons', payload);
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving coupon', error);
      alert('Erro ao salvar cupom. Verifique os campos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">{coupon ? 'Editar Cupom' : 'Novo Cupom'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
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
            <div className="grid grid-cols-3 gap-2">
              {['Percentual', 'Fixo', 'Frete Grátis'].map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="py-2 rounded-lg text-xs font-medium border-2 transition-colors"
                  style={type === t ? { borderColor: PRIMARY, backgroundColor: '#eef2f9', color: PRIMARY } : { borderColor: '#e5e7eb', backgroundColor: 'white', color: '#6b7280' }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          {type !== 'Frete Grátis' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">{type === 'Percentual' ? 'Percentual (%)' : 'Valor (R$)'} *</label>
              <input
                value={value}
                onChange={e => setValue(e.target.value)}
                type="number"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
                placeholder={type === 'Percentual' ? '10' : '15.00'}
              />
            </div>
          )}
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
              <label className="block text-sm text-gray-600 mb-1.5">Uso máximo</label>
              <input 
                type="number" 
                value={maxUse}
                onChange={e => setMaxUse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" 
                placeholder="500" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Valor mínimo de pedido (R$)</label>
            <input 
              type="number" 
              value={minOrder}
              onChange={e => setMinOrder(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" 
              placeholder="0.00 = sem mínimo" 
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: PRIMARY }}>
            {loading ? 'Salvando...' : (coupon ? 'Salvar' : 'Criar Cupom')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Coupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null | undefined>(undefined);
  const [copied, setCopied] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await api.get('/cupons');
      const rawData = res.data.data;
      const data = Array.isArray(rawData) ? rawData : rawData?.data || [];
      
      const mapped = data.map((c: any) => {
        const typeMapping: Record<string, string> = {
          'percentual': 'Percentual',
          'fixo': 'Fixo',
          'frete_gratis': 'Frete Grátis'
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
           expDate = d.toLocaleDateString('pt-BR');
           rawExpires = d.toISOString().split('T')[0];
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
          maxUse: c.limite_uso_total || 0,
          used: 0, // Mocked for now, pending usages integration
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
  }, []);

  const toggle = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/cupons/${id}/status`, { ativo: !currentStatus });
      fetchCoupons();
    } catch (err) {
      console.error('Error toggling coupon status', err);
    }
  };

  const copy = (id: number, code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-5 overflow-y-auto flex-1 h-full relative">
      {editing !== undefined && <CouponForm coupon={editing} onClose={() => setEditing(undefined)} onSuccess={fetchCoupons} />}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-gray-900 font-semibold">Cupons Promocionais</h2>
          <p className="text-gray-500 text-sm mt-0.5">{coupons.filter(c => c.status === 'Ativo').length} cupons ativos</p>
        </div>
        <button
          onClick={() => setEditing(null)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: PRIMARY }}
        >
          <Plus className="w-4 h-4" /> Novo Cupom
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }}></div>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map(coupon => {
            const pct = coupon.maxUse > 0 ? Math.round((coupon.used / coupon.maxUse) * 100) : 0;
            return (
              <div key={coupon.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#eef2f9' }}>
                      <Ticket className="w-5 h-5" style={{ color: PRIMARY }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="font-mono font-bold text-gray-800">{coupon.name}</code>
                        <button
                          onClick={() => copy(coupon.id, coupon.name)}
                          className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {copied === coupon.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={coupon.status === 'Ativo'
                            ? { backgroundColor: '#f0fdf4', color: '#16a34a' }
                            : coupon.status === 'Encerrado'
                            ? { backgroundColor: '#f3f4f6', color: '#9ca3af' }
                            : { backgroundColor: '#fef2f2', color: '#dc2626' }}
                        >
                          {coupon.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500">{coupon.type}</span>
                        {coupon.value !== '—' && <span className="text-xs font-semibold text-green-600">{coupon.value}</span>}
                        <span className="text-xs text-gray-500">Validade: {coupon.expires}</span>
                      </div>
                      {/* Usage bar */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-gray-500">{coupon.used} de {coupon.maxUse || '∞'} usos</span>
                          {coupon.maxUse > 0 && <span className="text-[11px] font-medium" style={{ color: pct > 90 ? '#dc2626' : pct > 70 ? '#d97706' : '#16a34a' }}>{pct}%</span>}
                        </div>
                        {coupon.maxUse > 0 && (
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: pct > 90 ? '#dc2626' : pct > 70 ? '#d97706' : '#16a34a' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setEditing(coupon)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggle(coupon.id, coupon.raw_ativo)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                      <Power className="w-3.5 h-3.5" />
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
}