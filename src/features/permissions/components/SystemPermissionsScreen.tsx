import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, X, Key } from 'lucide-react';
import api from '@/shared/lib/api';
import { showSystemNotice } from '@/shared/components/SystemNoticeModal';

const PRIMARY = '#122a4c';

interface Permission {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
}

function PermissionForm({ permission, onClose, onSuccess }: { permission?: Permission | null; onClose: () => void; onSuccess: () => void }) {
  const [nome, setNome] = useState(permission?.nome || '');
  const [slug, setSlug] = useState(permission?.slug || '');
  const [descricao, setDescricao] = useState(permission?.descricao || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const payload = { nome, slug, descricao };

      if (permission) {
        await api.put(`/usuarios/permissoes/${permission.slug}`, payload);
      } else {
        await api.post('/usuarios/permissoes', payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      showSystemNotice('Não foi possível salvar a permissão. Verifique se a identificação não está repetida.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">{permission ? 'Editar Permissão' : 'Nova Permissão do Sistema'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Nome Amigável *</label>
            <input 
              value={nome} 
              onChange={e => setNome(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1" 
              placeholder="Ex: Gerenciar Pedidos" 
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Identificação *</label>
            <input 
              value={slug} 
              onChange={e => setSlug(e.target.value)} 
              disabled={!!permission}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 disabled:opacity-70 focus:outline-none focus:ring-1" 
              placeholder="Ex: pedidos" 
            />
            {!permission && <p className="text-[10px] text-gray-400 mt-1">Use uma identificação curta e sem repetir.</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Descrição</label>
            <textarea 
              value={descricao} 
              onChange={e => setDescricao(e.target.value)} 
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1" 
              placeholder="Descreva o que esta permissão libera..." 
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-all shadow-sm" style={{ backgroundColor: PRIMARY }}>
            {loading ? 'Salvando...' : (permission ? 'Salvar Alterações' : 'Criar Permissão')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SystemPermissionsScreen() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [editing, setEditing] = useState<Permission | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/usuarios/permissoes/todas');
      setPermissions(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleDelete = async (slug: string) => {
    if (!confirm('Tem certeza que deseja excluir esta permissão? Isso pode afetar o acesso de vários usuários.')) return;
    try {
      await api.delete(`/usuarios/permissoes/${slug}`);
      fetchPermissions();
    } catch (err) {
      console.error(err);
      showSystemNotice('Não foi possível excluir a permissão.');
    }
  };

  const userJson = localStorage.getItem('user');
  const loggedUser = userJson ? JSON.parse(userJson) : null;
  const isSuperAdmin = loggedUser?.perfil === 'superadmin';

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center">
        <Shield className="w-12 h-12 text-red-100 mb-4" />
        <h3 className="text-gray-900 font-semibold text-lg">Acesso Restrito ao Superadmin</h3>
        <p className="text-gray-500 max-w-sm mt-2">Apenas administradores globais da plataforma podem gerenciar a lista mestre de permissões.</p>
      </div>
    );
  }

  return (
    <div className="p-5 overflow-y-auto flex-1 h-full relative">
      {editing !== undefined && <PermissionForm permission={editing} onClose={() => setEditing(undefined)} onSuccess={fetchPermissions} />}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-gray-900 font-semibold">Permissões do Sistema</h2>
          <p className="text-gray-500 text-sm mt-0.5">Gerencie a lista global de módulos e permissões disponíveis</p>
        </div>
        <button
          onClick={() => setEditing(null)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: PRIMARY }}
        >
          <Plus className="w-4 h-4" /> Nova Permissão
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }}></div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Permissão</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Identificação</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Descrição</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {permissions.map(perm => (
                <tr key={perm.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Key className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-gray-800">{perm.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="px-1.5 py-0.5 bg-gray-100 rounded text-[11px] text-gray-600 font-mono">{perm.slug}</code>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs text-gray-500 line-clamp-1">{perm.descricao || 'Sem descrição'}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditing(perm)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(perm.slug)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
