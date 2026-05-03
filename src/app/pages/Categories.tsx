import { useState, useEffect } from 'react';
import { Plus, Edit2, Power, X } from 'lucide-react';
import api from '../services/api';

const PRIMARY = '#122a4c';

function CategoryForm({ cat, onClose, onSuccess }: { cat?: any; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(cat?.nome ?? '');
  const [icon, setIcon] = useState(cat?.icon ?? '🛒');
  const [status, setStatus] = useState(cat?.ativa ? 'Ativo' : 'Inativo');
  const [loading, setLoading] = useState(false);
  const icons = ['🛒','🥛','🥤','🥦','🥩','🍞','🧹','🧴','❄️','🐾','🍎','🧂','🐟','🍷','🧃'];

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const payload = {
        nome: name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        ativa: status === 'Ativo'
      };
      
      if (cat?.id) {
        await api.patch(`/categorias/${cat.id}`, payload);
      } else {
        await api.post('/categorias', payload);
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving category', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">{cat ? 'Editar Categoria' : 'Nova Categoria'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Nome da categoria *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
              placeholder="Ex: Mercearia"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">Ícone (Apenas visualização no Admin)</label>
            <div className="grid grid-cols-8 gap-2">
              {icons.map(ic => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className="w-9 h-9 rounded-lg text-xl flex items-center justify-center border-2 transition-colors"
                  style={{ borderColor: icon === ic ? PRIMARY : 'transparent', backgroundColor: icon === ic ? '#eef2f9' : '#f9fafb' }}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <div className="text-sm font-medium text-gray-700">Categoria ativa</div>
              <div className="text-xs text-gray-400">Visível no app dos clientes</div>
            </div>
            <button
              onClick={() => setStatus(s => s === 'Ativo' ? 'Inativo' : 'Ativo')}
              className="relative inline-flex h-5 w-9 rounded-full transition-colors"
              style={{ backgroundColor: status === 'Ativo' ? PRIMARY : '#d1d5db' }}
            >
              <span
                className="inline-block w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5"
                style={{ transform: `translateX(${status === 'Ativo' ? 18 : 2}px)` }}
              />
            </button>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: PRIMARY }}>
            {loading ? 'Salvando...' : (cat ? 'Salvar' : 'Criar Categoria')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Categories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categorias');
      const data = response.data.data;
      setCategories(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const toggle = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/categorias/${id}/ativa`, { ativa: !currentStatus });
      setCategories(cs => cs.map(c => c.id === id ? { ...c, ativa: !currentStatus } : c));
    } catch (error) {
      console.error('Error updating status', error);
    }
  };

  return (
    <div className="p-5 overflow-y-auto flex-1 h-full">
      {editing !== undefined && <CategoryForm cat={editing} onClose={() => setEditing(undefined)} onSuccess={fetchCategories} />}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-gray-900 font-semibold">Categorias Globais</h2>
          <p className="text-gray-500 text-sm mt-0.5">{categories.length} categorias disponíveis</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }}></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {categories.map(cat => (
            <div
              key={cat.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
            >

              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: '#eef2f9' }}
              >
                {cat.emoji || '📁'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold text-gray-800">{cat.nome}</div>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={cat.ativa
                      ? { backgroundColor: '#f0fdf4', color: '#16a34a' }
                      : { backgroundColor: '#fef2f2', color: '#dc2626' }}
                  >
                    {cat.ativa ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">Visível para clientes</div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <div className="text-[10px] text-gray-300 uppercase font-bold px-2">Global</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}