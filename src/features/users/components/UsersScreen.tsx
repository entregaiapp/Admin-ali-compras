import { useState, useEffect } from 'react';
import { Plus, Edit2, Power, Shield, X } from 'lucide-react';
import api from '@/shared/lib/api';
import { showSystemNotice } from '@/shared/components/SystemNoticeModal';

const PRIMARY = '#122a4c';

const roles = ['Administrador', 'Operador', 'Separador', 'Entregador', 'Financeiro'];

const roleColors: Record<string, { bg: string; text: string }> = {
  'Administrador': { bg: '#eef2f9', text: PRIMARY },
  'Operador': { bg: '#f0fdf4', text: '#16a34a' },
  'Separador': { bg: '#f5f3ff', text: '#7c3aed' },
  'Entregador': { bg: '#fff7ed', text: '#ea580c' },
  'Financeiro': { bg: '#ecfeff', text: '#0891b2' }
};

interface Permission {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
}

const getLoggedUser = () => {
  try {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  } catch {
    return null;
  }
};

const rolePermissions: Record<string, string[]> = {
  'Administrador': ['dashboard', 'pedidos', 'produtos', 'categorias', 'banners', 'clientes', 'cupons', 'entregadores', 'usuarios', 'configuracoes', 'financeiro', 'estoque'],
  'Operador': ['dashboard', 'pedidos', 'produtos', 'categorias', 'clientes', 'estoque'],
  'Separador': ['pedidos', 'estoque'],
  'Entregador': ['pedidos', 'entregadores'],
  'Financeiro': ['dashboard', 'financeiro', 'relatorios']
};

function UserForm({ user, onClose, onSuccess }: { user?: any; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role || 'Operador');
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAllPermissions = async () => {
      try {
        const res = await api.get('/usuarios/permissoes/todas');
        setAvailablePermissions(res.data.data || []);
      } catch (err) {
        console.error('Error fetching permissions', err);
      }
    };
    fetchAllPermissions();
  }, []);

  useEffect(() => {
    if (user?.id) {
      const fetchUserPermissions = async () => {
        try {
          const res = await api.get(`/usuarios/${user.id}/permissoes`);
          const slugs = (res.data.data || []).map((p: any) => p.slug);
          setSelectedPermissions(slugs);
        } catch (err) {
          console.error('Error fetching user permissions', err);
        }
      };
      fetchUserPermissions();
    } else {
      // Pre-select based on role for new users
      setSelectedPermissions(rolePermissions[role] || []);
    }
  }, [user?.id, role]);

  const togglePermission = (slug: string) => {
    setSelectedPermissions(prev => 
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const perfilMapping: Record<string, string> = {
        'Administrador': 'administrador',
        'Operador': 'operador',
        'Separador': 'separador',
        'Entregador': 'entregador',
        'Financeiro': 'financeiro'
      };

      const payload: any = {
        nome: name,
        email,
        perfil: perfilMapping[role] || 'operador',
        status: user ? user.raw_status : 'ativo'
      };

      if (!user) {
        const loggedUser = getLoggedUser();
        const lojaId = loggedUser?.loja_id;

        if (!lojaId) {
          showSystemNotice('Não foi possível identificar a loja do usuário logado.');
          return;
        }

        payload.senha = password;
        payload.loja_id = lojaId;
      }

      let userId = user?.id;

      if (user?.id) {
        await api.patch(`/usuarios/${user.id}`, payload);
      } else {
        const res = await api.post('/usuarios', payload);
        userId = res.data.data.id;
      }

      // Update permissions
      if (userId) {
        await api.put(`/usuarios/${userId}/permissoes`, { permissionSlugs: selectedPermissions });
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      showSystemNotice('Erro ao salvar usuário. Verifique os campos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">{user ? 'Editar Usuário' : 'Novo Usuário Interno'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Nome completo *</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1" placeholder="João da Silva" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">E-mail *</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1" placeholder="joao@saojorgesuper.com.br" />
            </div>
          </div>
          {!user && (
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Senha temporária *</label>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1" placeholder="••••••••" />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Função / Perfil</label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map(r => {
                const rc = roleColors[r] || roleColors['Operador'];
                return (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className="py-2 px-3 rounded-lg text-xs font-medium border-2 text-left transition-colors"
                    style={role === r ? { borderColor: rc.text, backgroundColor: rc.bg, color: rc.text } : { borderColor: '#e5e7eb', backgroundColor: 'white', color: '#6b7280' }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2 font-medium">Permissões de Acesso</label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
              {availablePermissions.map(perm => (
                <label 
                  key={perm.slug} 
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                    selectedPermissions.includes(perm.slug) 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                      : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    className="rounded text-indigo-600 focus:ring-indigo-500" 
                    checked={selectedPermissions.includes(perm.slug)}
                    onChange={() => togglePermission(perm.slug)}
                  />
                  <div>
                    <div className="text-[11px] font-semibold leading-none">{perm.nome}</div>
                    <div className="text-[9px] opacity-70 mt-0.5 line-clamp-1">{perm.descricao}</div>
                  </div>
                </label>
              ))}
            </div>
            {availablePermissions.length === 0 && <p className="text-xs text-gray-400 italic">Carregando permissões...</p>}
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: PRIMARY }}>
            {loading ? 'Salvando...' : (user ? 'Salvar' : 'Criar Usuário')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function UsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/usuarios');
      const rawData = res.data.data;
      const data = Array.isArray(rawData) ? rawData : rawData?.data || [];

      const mapped = data.map((u: any) => {
        const perfis: Record<string, string> = {
          'administrador': 'Administrador',
          'operador': 'Operador',
          'separador': 'Separador',
          'entregador': 'Entregador',
          'financeiro': 'Financeiro'
        };

        return {
          id: u.id,
          name: u.nome,
          email: u.email,
          role: perfis[u.perfil] || 'Operador',
          raw_perfil: u.perfil,
          status: u.status === 'ativo' ? 'Ativo' : 'Inativo',
          raw_status: u.status,
          lastLogin: u.ultimo_login_em ? new Date(u.ultimo_login_em).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Nunca'
        };
      });

      setUsers(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggle = async (id: string, currentRawStatus: string) => {
    try {
      const newStatus = currentRawStatus === 'ativo' ? 'inativo' : 'ativo';
      await api.patch(`/usuarios/${id}/status`, { status: newStatus });
      fetchUsers();
    } catch (err) {
      console.error('Error toggling status', err);
    }
  };

  const loggedUser = getLoggedUser();
  const canManage = loggedUser?.perfil === 'administrador' || loggedUser?.perfil === 'superadmin';

  if (!canManage && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center">
        <Shield className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="text-gray-900 font-semibold text-lg">Acesso Restrito</h3>
        <p className="text-gray-500 max-w-sm mt-2">Você não tem permissão para gerenciar usuários internos da loja. Apenas administradores podem acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="p-5 overflow-y-auto flex-1 h-full relative">
      {editing !== undefined && <UserForm user={editing} onClose={() => setEditing(undefined)} onSuccess={fetchUsers} />}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-gray-900 font-semibold">Usuários Internos</h2>
          <p className="text-gray-500 text-sm mt-0.5">{users.filter(u => u.status === 'Ativo').length} usuários com acesso ativo</p>
        </div>
        <button
          onClick={() => setEditing(null)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: PRIMARY }}
        >
          <Plus className="w-4 h-4" /> Novo Usuário
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuário</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Função</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Último Acesso</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => {
                const rc = roleColors[user.role] || roleColors['Operador'];
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                          style={{ backgroundColor: PRIMARY }}
                        >
                          {user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800 text-sm">{user.name}</div>
                          <div className="text-xs text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" style={{ color: rc.text }} />
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: rc.bg, color: rc.text }}>
                          {user.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={user.status === 'Ativo'
                          ? { backgroundColor: '#f0fdf4', color: '#16a34a' }
                          : { backgroundColor: '#fef2f2', color: '#dc2626' }}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">{user.lastLogin}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing(user)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggle(user.id, user.raw_status)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
