import { useEffect, useMemo, useState } from 'react';
import { 
  Truck, User, Phone, Plus, Search, X, Bike, Car, Edit2, Trash2,
  CheckCircle2, Mail, Lock, UsersRound, Gauge, Wrench
} from 'lucide-react';
import api from '@/shared/lib/api';
import { showSystemNotice } from '@/shared/components/SystemToast';
import { ADMIN_STORE_THEME_UPDATED_EVENT } from '@/shared/constants/uiEvents';

const PRIMARY = '#122a4c';

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((character) => character + character).join('')
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(value)) return `rgba(18, 42, 76, ${alpha})`;

  const number = Number.parseInt(value, 16);
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
};

const formatStatus = (status?: string) => {
  const labels: Record<string, string> = {
    ativo: 'Ativo',
    disponivel: 'Disponível',
    ocupado: 'Em rota',
    inativo: 'Inativo',
    bloqueado: 'Bloqueado',
    manutencao: 'Em manutenção',
  };

  return labels[status || ''] || status || 'Não informado';
};

const formatVehicleType = (type?: string) => {
  const labels: Record<string, string> = {
    moto: 'Moto',
    carro: 'Carro',
    bike: 'Bicicleta',
    van: 'Van',
    outro: 'Outro',
  };

  return labels[type || ''] || type || 'Não informado';
};

const vehicleIcons: Record<string, any> = {
  'moto': Truck,
  'carro': Car,
  'bike': Bike,
  'van': Car,
  'outro': User
};

const statusColors: Record<string, { bg: string; text: string }> = {
  'ativo': { bg: '#f0fdf4', text: '#16a34a' },
  'disponivel': { bg: '#f0fdf4', text: '#16a34a' },
  'ocupado': { bg: '#fff7ed', text: '#ea580c' },
  'inativo': { bg: '#fef2f2', text: '#dc2626' },
  'bloqueado': { bg: '#fef2f2', text: '#dc2626' },
  'manutencao': { bg: '#fff7ed', text: '#c2410c' },
};

const getApiData = (payload: any) => payload?.data?.data || payload?.data || payload;

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-gray-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      Carregando informações...
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center text-gray-400">
      <Icon className="mb-2 h-9 w-9 opacity-40" />
      <p className="text-sm font-medium">{message}</p>
      <p className="mt-1 text-xs">Altere a busca ou o filtro para visualizar outros resultados.</p>
    </div>
  );
}

export function EntregadoresScreen() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [primaryColor, setPrimaryColor] = useState(PRIMARY);
  const [activeView, setActiveView] = useState<'couriers' | 'vehicles'>('couriers');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [vehicleForm, setVehicleForm] = useState({
    id: '',
    tipo: 'moto',
    marca: '',
    modelo: '',
    placa: '',
    cor: '',
    ano: '',
    status: 'ativo'
  });

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    nome: '',
    telefone: '',
    tipo_veiculo: 'moto',
    automovel_id: '',
    documento: '',
    status: 'ativo',
    createLogin: false,
    email: '',
    password: ''
  });

  const user = (() => {
    try {
      const userJson = localStorage.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
      return null;
    }
  })();

  const fetchCouriers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/entregadores');
      const data = response.data.data;
      setCouriers(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error('Error fetching couriers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/automoveis', { params: { per_page: 100 } });
      const data = response.data.data;
      setVehicles(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  useEffect(() => {
    fetchCouriers();
    fetchVehicles();

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

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isDeleting) setIsDeleting(null);
      else if (isVehicleModalOpen) setIsVehicleModalOpen(false);
      else if (isModalOpen) setIsModalOpen(false);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isDeleting, isModalOpen, isVehicleModalOpen]);

  const handleOpenModal = (courier?: any) => {
    if (courier) {
      setFormData({
        id: courier.id,
        nome: courier.nome,
        telefone: courier.telefone || '',
        tipo_veiculo: courier.tipo_veiculo || 'moto',
        automovel_id: courier.automovel_id || '',
        documento: courier.documento || '',
        status: courier.status || 'ativo',
        createLogin: false,
        email: '',
        password: ''
      });
    } else {
      setFormData({
        id: '',
        nome: '',
        telefone: '',
        tipo_veiculo: 'moto',
        automovel_id: '',
        documento: '',
        status: 'ativo',
        createLogin: false,
        email: '',
        password: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      const payload = {
        nome: formData.nome,
        telefone: formData.telefone,
        tipo_veiculo: formData.tipo_veiculo,
        automovel_id: formData.automovel_id || null,
        documento: formData.documento,
        status: formData.status,
        loja_id: user?.loja_id
      };

      let courierId = formData.id;
      if (formData.id) {
        await api.patch(`/entregadores/${formData.id}`, payload);
      } else {
        const res = await api.post('/entregadores', payload);
        courierId = getApiData(res)?.id;
      }

      // If requested to create login
      if (formData.createLogin && formData.email && formData.password) {
        if (!courierId) {
          showSystemNotice('Entregador criado, mas não foi possível identificar o vínculo para criar o login.');
          return;
        }

        await api.post('/usuarios', {
          nome: formData.nome,
          email: formData.email,
          senha: formData.password,
          telefone: formData.telefone,
          perfil: 'entregador',
          tipo_usuario: 'entregador',
          status: 'ativo',
          loja_id: user?.loja_id,
          entregador_id: courierId,
          entregadorId: courierId,
          driverId: courierId
        });
      }

      setIsModalOpen(false);
      fetchCouriers();
      fetchVehicles();
    } catch (error) {
      console.error('Error saving courier:', error);
      showSystemNotice('Não foi possível salvar o entregador. Verifique os dados e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenVehicleModal = (vehicle?: any) => {
    setVehicleForm(vehicle ? {
      id: vehicle.id,
      tipo: vehicle.tipo || 'moto',
      marca: vehicle.marca || '',
      modelo: vehicle.modelo || '',
      placa: vehicle.placa || '',
      cor: vehicle.cor || '',
      ano: vehicle.ano ? String(vehicle.ano) : '',
      status: vehicle.status || 'ativo',
    } : {
      id: '',
      tipo: 'moto',
      marca: '',
      modelo: '',
      placa: '',
      cor: '',
      ano: '',
      status: 'ativo',
    });
    setIsVehicleModalOpen(true);
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        tipo: vehicleForm.tipo,
        marca: vehicleForm.marca || null,
        modelo: vehicleForm.modelo,
        placa: vehicleForm.placa || null,
        cor: vehicleForm.cor || null,
        ano: vehicleForm.ano ? Number(vehicleForm.ano) : null,
        status: vehicleForm.status,
      };

      if (vehicleForm.id) {
        await api.patch(`/automoveis/${vehicleForm.id}`, payload);
      } else {
        await api.post('/automoveis', payload);
      }

      setIsVehicleModalOpen(false);
      fetchVehicles();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      showSystemNotice('Não foi possível salvar o automóvel. Verifique os dados e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/entregadores/${id}`);
      setIsDeleting(null);
      fetchCouriers();
    } catch (error) {
      console.error('Error deleting courier:', error);
      showSystemNotice('Não foi possível excluir o entregador.');
    }
  };

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');
  const filteredCouriers = useMemo(() => couriers.filter((courier) => {
    const matchesSearch = !normalizedSearch
      || String(courier.nome || '').toLocaleLowerCase('pt-BR').includes(normalizedSearch)
      || String(courier.telefone || '').includes(normalizedSearch)
      || String(courier.documento || '').includes(normalizedSearch);
    const matchesStatus = statusFilter === 'todos'
      || (statusFilter === 'ativos' && ['ativo', 'disponivel'].includes(courier.status))
      || (statusFilter === 'ocupado' && courier.status === 'ocupado')
      || (statusFilter === 'inativos' && ['inativo', 'bloqueado'].includes(courier.status));

    return matchesSearch && matchesStatus;
  }), [couriers, normalizedSearch, statusFilter]);

  const filteredVehicles = useMemo(() => vehicles.filter((vehicle) => {
    const searchableText = [vehicle.marca, vehicle.modelo, vehicle.placa, vehicle.cor, vehicle.tipo]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('pt-BR');
    const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
    const matchesStatus = statusFilter === 'todos' || vehicle.status === statusFilter;

    return matchesSearch && matchesStatus;
  }), [vehicles, normalizedSearch, statusFilter]);

  const stats = [
    { label: 'Entregadores', value: couriers.length, icon: UsersRound, color: primaryColor, background: hexToRgba(primaryColor, 0.08) },
    { label: 'Ativos', value: couriers.filter((courier) => ['ativo', 'disponivel'].includes(courier.status)).length, icon: CheckCircle2, color: '#16a34a', background: '#f0fdf4' },
    { label: 'Em rota', value: couriers.filter((courier) => courier.status === 'ocupado').length, icon: Gauge, color: '#ea580c', background: '#fff7ed' },
    { label: 'Automóveis', value: vehicles.length, icon: Car, color: primaryColor, background: hexToRgba(primaryColor, 0.08) },
  ];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-50/70">
      <div className="flex min-h-[56px] items-end justify-between gap-3 border-b border-gray-200 bg-white px-4">
        <div className="flex h-full min-w-0 items-end" role="tablist" aria-label="Gestão de entregadores">
          {[
            { id: 'couriers' as const, label: 'Entregadores', count: couriers.length },
            { id: 'vehicles' as const, label: 'Automóveis', count: vehicles.length },
          ].map((tab) => {
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveView(tab.id);
                  setStatusFilter('todos');
                  setSearchTerm('');
                }}
                className="relative flex h-full min-h-[56px] items-center gap-2 px-4 text-sm font-semibold transition-colors"
                style={{ color: isActive ? primaryColor : '#64748b' }}
              >
                {tab.label}
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{
                    backgroundColor: isActive ? hexToRgba(primaryColor, 0.1) : '#f1f5f9',
                    color: isActive ? primaryColor : '#64748b',
                  }}
                >
                  {tab.count}
                </span>
                {isActive && (
                  <span
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-t-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => activeView === 'couriers' ? handleOpenModal() : handleOpenVehicleModal()}
          className="mb-2.5 flex shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{activeView === 'couriers' ? 'Novo entregador' : 'Novo automóvel'}</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: stat.background }}>
                <stat.icon className="h-4.5 w-4.5" style={{ color: stat.color }} />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold leading-5 text-gray-900">{stat.value}</div>
                <div className="truncate text-xs font-medium text-gray-500">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder={activeView === 'couriers' ? 'Buscar por nome, telefone ou documento' : 'Buscar por modelo, placa, marca ou tipo'}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:bg-white"
              style={{ '--tw-ring-color': hexToRgba(primaryColor, 0.2) } as React.CSSProperties}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 outline-none sm:min-w-44"
          >
            <option value="todos">Todos os status</option>
            {activeView === 'couriers' ? (
              <>
                <option value="ativos">Ativos e disponíveis</option>
                <option value="ocupado">Em rota</option>
                <option value="inativos">Inativos e bloqueados</option>
              </>
            ) : (
              <>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
                <option value="manutencao">Em manutenção</option>
              </>
            )}
          </select>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {activeView === 'couriers' ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">Entregador</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">Veículo</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">Documento</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCouriers.map((courier) => {
                    const vehicle = courier.automovel || vehicles.find((item) => item.id === courier.automovel_id);
                    const VehicleIcon = vehicleIcons[vehicle?.tipo || courier.tipo_veiculo] || User;
                    const statusStyle = statusColors[courier.status] || { bg: '#f3f4f6', text: '#6b7280' };
                    return (
                      <tr key={courier.id} className="transition-colors hover:bg-gray-50/70">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                              style={{ backgroundColor: hexToRgba(primaryColor, 0.09), color: primaryColor }}
                            >
                              {String(courier.nome || 'E').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="max-w-60 truncate text-sm font-semibold text-gray-900">{courier.nome || 'Sem nome'}</div>
                              <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                                <Phone className="h-3 w-3" /> {courier.telefone || 'Sem telefone'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <VehicleIcon className="h-4 w-4 text-gray-400" />
                            <span>{vehicle ? [vehicle.marca, vehicle.modelo].filter(Boolean).join(' ') : formatVehicleType(courier.tipo_veiculo)}</span>
                          </div>
                          {vehicle?.placa && <div className="ml-6 mt-0.5 text-xs uppercase text-gray-400">{vehicle.placa}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{courier.documento || 'Não informado'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>
                            {formatStatus(courier.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" onClick={() => handleOpenModal(courier)} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100" title="Editar entregador" aria-label="Editar entregador">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => setIsDeleting(courier.id)} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600" title="Excluir entregador" aria-label="Excluir entregador">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && filteredCouriers.length === 0 && (
                    <tr><td colSpan={5}><EmptyState icon={Truck} message="Nenhum entregador encontrado" /></td></tr>
                  )}
                </tbody>
              </table>
              {loading && <LoadingState />}
            </div>
          ) : (
            <div>
              <div className="hidden grid-cols-[minmax(0,1fr)_140px_180px_80px] gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500 sm:grid">
                <span>Automóvel</span><span>Status</span><span>Vínculo</span><span className="text-right">Ações</span>
              </div>
              <div className="divide-y divide-gray-100">
                {filteredVehicles.map((vehicle) => {
                  const statusStyle = statusColors[vehicle.status] || { bg: '#f3f4f6', text: '#6b7280' };
                  const VehicleIcon = vehicleIcons[vehicle.tipo] || Car;
                  return (
                    <div key={vehicle.id} className="grid gap-3 px-4 py-3 transition-colors hover:bg-gray-50/70 sm:grid-cols-[minmax(0,1fr)_140px_180px_80px] sm:items-center sm:gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: hexToRgba(primaryColor, 0.08), color: primaryColor }}>
                          <VehicleIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-gray-900">{[vehicle.marca, vehicle.modelo].filter(Boolean).join(' ') || 'Automóvel'}</div>
                          <div className="truncate text-xs text-gray-500">{[vehicle.tipo, vehicle.placa, vehicle.cor, vehicle.ano].filter(Boolean).join(' · ') || 'Sem informações adicionais'}</div>
                        </div>
                      </div>
                      <div><span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>{formatStatus(vehicle.status)}</span></div>
                      <div className="truncate text-sm text-gray-500">{vehicle.entregador_nome || 'Sem entregador vinculado'}</div>
                      <div className="flex justify-end">
                        <button type="button" onClick={() => handleOpenVehicleModal(vehicle)} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100" title="Editar automóvel" aria-label="Editar automóvel">
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {!loading && filteredVehicles.length === 0 && <EmptyState icon={Wrench} message="Nenhum automóvel encontrado" />}
              </div>
              {loading && <LoadingState />}
            </div>
          )}
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{formData.id ? 'Editar entregador' : 'Novo entregador'}</h3>
                <p className="mt-0.5 text-xs text-gray-500">Preencha os dados abaixo.</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100" title="Fechar (Esc)" aria-label="Fechar modal">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Nome completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      required
                      type="text"
                      value={formData.nome}
                      onChange={e => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                      placeholder="Ex: João Silva"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      required
                      type="tel"
                      value={formData.telefone}
                      onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                      placeholder="(99) 99999-9999"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Veículo</label>
                  <select
                    value={formData.tipo_veiculo}
                    onChange={e => setFormData({ ...formData, tipo_veiculo: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none"
                  >
                    <option value="moto">Moto</option>
                    <option value="carro">Carro</option>
                    <option value="bike">Bicicleta</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Automóvel vinculado</label>
                  <select
                    value={formData.automovel_id}
                    onChange={e => setFormData({ ...formData, automovel_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none"
                  >
                    <option value="">Sem automóvel vinculado</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {[vehicle.marca, vehicle.modelo, vehicle.placa].filter(Boolean).join(' · ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Documento (CPF/CNH)</label>
                  <input
                    type="text"
                    value={formData.documento}
                    onChange={e => setFormData({ ...formData, documento: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>
                </div>
              </div>

              {/* Login section */}
              {!formData.id && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.createLogin}
                        onChange={e => setFormData({ ...formData, createLogin: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div
                        className="h-6 w-10 rounded-full bg-gray-200 transition-all after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-4"
                        style={{ backgroundColor: formData.createLogin ? primaryColor : undefined }}
                      />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-700">Criar login de acesso</span>
                      <p className="text-[10px] text-gray-500 font-medium">Permite que o entregador use o app</p>
                    </div>
                  </label>

                  {formData.createLogin && (
                    <div className="mt-4 grid grid-cols-1 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-top-2 duration-200">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-600">E-mail de acesso</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                            placeholder="exemplo@email.com"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-600">Senha temporária</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                            placeholder="Min. 6 caracteres"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {submitting ? 'Salvando...' : formData.id ? 'Salvar alterações' : 'Criar entregador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{vehicleForm.id ? 'Editar automóvel' : 'Novo automóvel'}</h3>
                <p className="mt-0.5 text-xs text-gray-500">Cadastre o veículo usado nas entregas.</p>
              </div>
              <button type="button" onClick={() => setIsVehicleModalOpen(false)} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100" title="Fechar (Esc)" aria-label="Fechar modal">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleVehicleSubmit} className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Tipo</label>
                  <select
                    value={vehicleForm.tipo}
                    onChange={e => setVehicleForm({ ...vehicleForm, tipo: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none"
                  >
                    <option value="moto">Moto</option>
                    <option value="carro">Carro</option>
                    <option value="bike">Bicicleta</option>
                    <option value="van">Van</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Status</label>
                  <select
                    value={vehicleForm.status}
                    onChange={e => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="manutencao">Manutenção</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Marca</label>
                  <input value={vehicleForm.marca} onChange={e => setVehicleForm({ ...vehicleForm, marca: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm" placeholder="Honda" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Modelo</label>
                  <input required value={vehicleForm.modelo} onChange={e => setVehicleForm({ ...vehicleForm, modelo: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm" placeholder="CG 160" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Placa</label>
                  <input value={vehicleForm.placa} onChange={e => setVehicleForm({ ...vehicleForm, placa: e.target.value.toUpperCase() })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm uppercase" placeholder="ABC1D23" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Cor</label>
                  <input value={vehicleForm.cor} onChange={e => setVehicleForm({ ...vehicleForm, cor: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm" placeholder="Vermelha" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Ano</label>
                  <input type="number" min={1900} max={2100} value={vehicleForm.ano} onChange={e => setVehicleForm({ ...vehicleForm, ano: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm" placeholder="2024" />
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {submitting ? 'Salvando...' : vehicleForm.id ? 'Salvar automóvel' : 'Criar automóvel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {isDeleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Excluir entregador?</h3>
              <p className="text-sm text-gray-500 mt-2">Esta ação não pode ser desfeita e removerá o vínculo com entregas passadas.</p>
            </div>
            <div className="p-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => setIsDeleting(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-white transition-all"
              >
                Manter
              </button>
              <button
                onClick={() => handleDelete(isDeleting)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-200"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
