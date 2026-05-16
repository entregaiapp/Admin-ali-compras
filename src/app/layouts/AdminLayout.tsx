import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router';
import {
  LayoutDashboard, ShoppingCart, Package,  Grid3X3, Tag, Image, Users, Truck, User,
  Ticket, CreditCard, BarChart3, UserCog, Settings, Bell, Menu, X, LogOut,
  ChevronRight, Store, Key, ClipboardList, Bike
} from 'lucide-react';
import { notifications } from '@/shared/constants/mockData';
import api from '@/shared/lib/api';

const PRIMARY = '#122a4c';
const PRIMARY_LIGHT = '#1a3d6e';
const PRIMARY_LIGHTER = '#1e4d87';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', slug: 'dashboard' },
  { label: 'Minhas Entregas', icon: Bike, path: '/driver', slug: 'entregadores' },
  { label: 'Pedidos', icon: ShoppingCart, path: '/orders', slug: 'pedidos' },
  { label: 'Produtos', icon: Package, path: '/products', slug: 'produtos' },
  { label: 'Categorias', icon: Grid3X3, path: '/categories', slug: 'categorias' },
  { label: 'Promoções', icon: Tag, path: '/promotions', slug: 'produtos' }, // Using 'produtos' perm for promotions too or we can add 'promocoes'
  { label: 'Banners', icon: Image, path: '/banners', slug: 'banners' },
  { label: 'Clientes', icon: Users, path: '/customers', slug: 'clientes' },
  { label: 'Entregas', icon: Truck, path: '/deliveries', slug: 'entregadores' },
  { label: 'Entregadores', icon: User, path: '/entregadores', slug: 'entregadores' },
  { label: 'Cupons', icon: Ticket, path: '/coupons', slug: 'cupons' },
  { label: 'Pagamentos', icon: CreditCard, path: '/payments', slug: 'financeiro' },
  { label: 'Relatórios', icon: BarChart3, path: '/reports', slug: 'financeiro' },
  { label: 'Usuários', icon: UserCog, path: '/users', slug: 'usuarios' },
  { label: 'Configurações', icon: Settings, path: '/settings', slug: 'configuracoes' },
];

const superAdminItems = [
  { label: 'Permissões', icon: Key, path: '/permissions' },
];


export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storeName, setStoreName] = useState('Carregando...');
  const navigate = useNavigate();
  const location = useLocation();
  
  const user = (() => {
    try {
      const userJson = localStorage.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
      return null;
    }
  })();

  if (user?.perfil === 'entregador') {
    return <Navigate to="/driver" replace />;
  }
  
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (user?.loja_id) {
      api.get(`/lojas/${user.loja_id}`).then(res => {
        if (res.data?.success) setStoreName(res.data.data.nome);
      }).catch(() => setStoreName('Minha Loja'));
    } else {
      setStoreName('Admin Master');
    }
  }, [user?.loja_id]);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
        style={{ backgroundColor: PRIMARY }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm leading-tight truncate max-w-[140px]">{storeName}</div>
            <div className="text-white/50 text-xs">Painel Admin</div>
          </div>
          <button
            className="ml-auto lg:hidden text-white/60 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {navItems
            .filter(item => {
              if (user?.perfil === 'entregador') {
                return item.path === '/driver';
              }
              // Hide "Minhas Entregas" from non-drivers to keep sidebar clean
              if (item.path === '/driver') return false;

              if (user?.perfil === 'superadmin' || user?.perfil === 'administrador') return true;
              return user?.permissions?.includes(item.slug);
            })
            .map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group`}
                  style={{
                    backgroundColor: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                    color: active ? 'white' : 'rgba(255,255,255,0.65)',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
                </button>
              );
            })}

          {user?.perfil === 'superadmin' && (
            <>
              <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-white/30 uppercase tracking-wider">Master</div>
              {superAdminItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group`}
                    style={{
                      backgroundColor: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                      color: active ? 'white' : 'rgba(255,255,255,0.65)',
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                    {active && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              AM
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{user?.nome || 'Usuário'}</div>
              <div className="text-white/50 text-xs truncate">{user?.perfil || 'Administrador'}</div>
            </div>
            <button
              className="text-white/40 hover:text-white transition-colors"
              onClick={() => navigate('/login')}
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 flex-shrink-0 z-10">
          <button
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <h1 className="text-sm font-semibold text-gray-800">
              {navItems.find(n => isActive(n.path))?.label ?? 'Painel'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/notifications')}
              className="relative w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full text-white text-[10px] font-semibold flex items-center justify-center" style={{ backgroundColor: '#dc2626' }}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
