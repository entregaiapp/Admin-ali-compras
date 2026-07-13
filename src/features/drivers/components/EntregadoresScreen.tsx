import { useState, useEffect } from 'react';
import { 
  Truck, User, Phone, Plus, Search, Filter, X, 
  Bike, Car, MoreVertical, Edit2, Trash2, CheckCircle2, AlertCircle,
  Key, Mail, Lock, Shield
} from 'lucide-react';
import api from '@/shared/lib/api';
import { showSystemNotice } from '@/shared/components/SystemToast';

const PRIMARY = '#122a4c';

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
  'bloqueado': { bg: '#fef2f2', text: '#dc2626' }
};

const getApiData = (payload: any) => payload?.data?.data || payload?.data || payload;

export function EntregadoresScreen() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
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
  }, []);

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

  const filteredCouriers = couriers.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.telefone && c.telefone.includes(searchTerm))
  );

  return (
    <div className="p-5 space-y-5 overflow-y-auto flex-1 h-full bg-gray-50/50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-gray-900 font-bold text-2xl tracking-tight">Entregadores</h2>
          <p className="text-gray-500 text-sm mt-0.5 font-medium">Gestão de pessoal de entrega da loja</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:shadow-lg active:scale-95"
          style={{ backgroundColor: PRIMARY }}
        >
          <Plus className="w-4 h-4" />
          Novo Entregador
        </button>
        <button
          onClick={() => handleOpenVehicleModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold text-sm transition-all hover:bg-gray-50 active:scale-95"
        >
          <Car className="w-4 h-4" />
          Novo Automóvel
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: couriers.length, icon: Truck, color: PRIMARY, bg: '#eef2f9' },
          { label: 'Ativos', value: couriers.filter(c => c.status === 'ativo' || c.status === 'disponivel').length, icon: CheckCircle2, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Em Rota', value: couriers.filter(c => c.status === 'ocupado').length, icon: Bike, color: '#ea580c', bg: '#fff7ed' },
          { label: 'Automóveis', value: vehicles.length, icon: Car, color: '#2563eb', bg: '#eff6ff' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
          <Filter className="w-4 h-4" />
          Filtros
        </button>
      </div>

      {/* Table/List */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Entregador</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Veículo</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Documento</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCouriers.map(courier => {
                const vehicle = courier.automovel || vehicles.find((item) => item.id === courier.automovel_id);
                const vehicleType = vehicle?.tipo || courier.tipo_veiculo;
                const VehicleIcon = vehicleIcons[vehicleType] || User;
                const sc = statusColors[courier.status] || { bg: '#f3f4f6', text: '#6b7280' };
                return (
                  <tr key={courier.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {courier.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{courier.nome}</div>
                          <div className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {courier.telefone || 'Sem telefone'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 border border-gray-200 w-fit">
                        <VehicleIcon className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold capitalize">
                          {vehicle ? `${vehicle.marca || ''} ${vehicle.modelo || ''}`.trim() : courier.tipo_veiculo || 'N/A'}
                        </span>
                      </div>
                      {vehicle?.placa && <div className="text-[11px] text-gray-400 mt-1">{vehicle.placa}</div>}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 font-medium">{courier.documento || '—'}</td>
                    <td className="px-5 py-4">
                      <span 
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight"
                        style={{ backgroundColor: sc.bg, color: sc.text }}
                      >
                        {courier.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenModal(courier)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setIsDeleting(courier.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredCouriers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Truck className="w-12 h-12 mb-3 opacity-20" />
                      <p className="font-medium">Nenhum entregador encontrado</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {vehicles.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Automóveis</h3>
              <p className="text-xs text-gray-500">Veículos disponíveis para vincular aos entregadores</p>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {vehicles.map((vehicle) => (
              <button
                key={vehicle.id}
                onClick={() => handleOpenVehicleModal(vehicle)}
                className="w-full px-5 py-3 text-left hover:bg-gray-50 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Car className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-800 truncate">
                      {[vehicle.marca, vehicle.modelo].filter(Boolean).join(' ') || 'Automóvel'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {[vehicle.tipo, vehicle.placa, vehicle.cor].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{vehicle.entregador_nome || 'Sem vínculo'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{formData.id ? 'Editar Entregador' : 'Novo Entregador'}</h3>
                <p className="text-xs text-gray-500 font-medium">Preencha os dados abaixo</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nome Completo</label>
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
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Telefone</label>
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
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Veículo</label>
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
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Automóvel vinculado</label>
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
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Documento (CPF/CNH)</label>
                  <input
                    type="text"
                    value={formData.documento}
                    onChange={e => setFormData({ ...formData, documento: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
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
                      <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4"></div>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-700">Criar login de acesso</span>
                      <p className="text-[10px] text-gray-500 font-medium">Permite que o entregador use o app</p>
                    </div>
                  </label>

                  {formData.createLogin && (
                    <div className="mt-4 grid grid-cols-1 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-top-2 duration-200">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">E-mail de Acesso</label>
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
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Senha Temporária</label>
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
                  className="flex-1 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {submitting ? 'Salvando...' : formData.id ? 'Salvar Alterações' : 'Criar Entregador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{vehicleForm.id ? 'Editar Automóvel' : 'Novo Automóvel'}</h3>
                <p className="text-xs text-gray-500 font-medium">Cadastre o veículo usado nas entregas</p>
              </div>
              <button onClick={() => setIsVehicleModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleVehicleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tipo</label>
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
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
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
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Marca</label>
                  <input value={vehicleForm.marca} onChange={e => setVehicleForm({ ...vehicleForm, marca: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm" placeholder="Honda" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Modelo</label>
                  <input required value={vehicleForm.modelo} onChange={e => setVehicleForm({ ...vehicleForm, modelo: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm" placeholder="CG 160" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Placa</label>
                  <input value={vehicleForm.placa} onChange={e => setVehicleForm({ ...vehicleForm, placa: e.target.value.toUpperCase() })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm uppercase" placeholder="ABC1D23" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Cor</label>
                  <input value={vehicleForm.cor} onChange={e => setVehicleForm({ ...vehicleForm, cor: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm" placeholder="Vermelha" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Ano</label>
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
                  className="flex-1 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {submitting ? 'Salvando...' : vehicleForm.id ? 'Salvar Automóvel' : 'Criar Automóvel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {isDeleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Excluir Entregador?</h3>
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
