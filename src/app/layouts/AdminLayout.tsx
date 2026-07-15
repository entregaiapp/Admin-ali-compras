import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router';
import {
  LayoutDashboard, ShoppingCart, Package,  Grid3X3, Tag, Image, Users, Truck, User,
  Ticket, CreditCard, BarChart3, UserCog, Settings, Bell, Menu, X, LogOut,
  ChevronRight, Key, Bike, UtensilsCrossed, Wallet, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import api from '@/shared/lib/api';
import logo from '@/assets/logo.png';
import { CREATE_ORDER_SHORTCUT_PARAM } from '@/features/orders/constants';
import { ADMIN_COLLAPSE_SIDEBAR_EVENT } from '@/shared/constants/uiEvents';

const PRIMARY = '#122a4c';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', slug: 'dashboard' },
  { label: 'Minhas Entregas', icon: Bike, path: '/driver', slug: 'entregadores' },
  { label: 'Pedidos', icon: ShoppingCart, path: '/orders', slug: 'pedidos' },
  { label: 'Salão', icon: UtensilsCrossed, path: '/salao', slug: 'salao' },
  { label: 'Produtos', icon: Package, path: '/products', slug: 'produtos' },
  { label: 'Categorias', icon: Grid3X3, path: '/categories', slug: 'categorias' },
  { label: 'Promoções', icon: Tag, path: '/promotions', slug: 'produtos' }, // Using 'produtos' perm for promotions too or we can add 'promocoes'
  { label: 'Banners', icon: Image, path: '/banners', slug: 'banners' },
  { label: 'Notificações', icon: Bell, path: '/notifications', slug: 'notificacoes' },
  { label: 'Clientes', icon: Users, path: '/customers', slug: 'clientes' },
  { label: 'Entregas', icon: Truck, path: '/deliveries', slug: 'entregadores' },
  { label: 'Entregadores', icon: User, path: '/entregadores', slug: 'entregadores' },
  { label: 'Cupons', icon: Ticket, path: '/coupons', slug: 'cupons' },
  { label: 'Pagamentos', icon: CreditCard, path: '/payments', slug: 'financeiro' },
  { label: 'Caixa', icon: Wallet, path: '/cash', slug: 'caixa' },
  { label: 'Fiados', icon: Wallet, path: '/fiados', slug: 'fiados' },
  { label: 'Relatórios', icon: BarChart3, path: '/reports', slug: 'financeiro' },
  { label: 'Usuários', icon: UserCog, path: '/users', slug: 'usuarios' },
  { label: 'Configurações', icon: Settings, path: '/settings', slug: 'configuracoes' },
];

const navGroups = [
  { title: 'Visão geral', paths: ['/dashboard'] },
  { title: 'Operação', paths: ['/driver', '/orders', '/salao', '/deliveries', '/entregadores'] },
  { title: 'Cardápio', paths: ['/products', '/categories'] },
  { title: 'Marketing e vendas', paths: ['/promotions', '/coupons', '/banners', '/notifications'] },
  { title: 'Clientes', paths: ['/customers'] },
  { title: 'Financeiro', paths: ['/payments', '/cash', '/fiados', '/reports'] },
  { title: 'Administração', paths: ['/users', '/settings'] },
];

const superAdminItems = [
  { label: 'Permissões', icon: Key, path: '/permissions' },
];


const routeAliases: Record<string, string> = {
  '/pedidos': '/orders',
  '/produtos': '/products',
  '/products-import': '/products',
  '/importar-produtos': '/products',
  '/categorias': '/categories',
  '/clientes': '/customers',
  '/caixa': '/cash',
  '/configuracoes': '/settings',
};

const resolveNavItemForPath = (pathname: string) => {
  const alias = Object.entries(routeAliases)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([legacyPath]) => pathname === legacyPath || pathname.startsWith(`${legacyPath}/`));
  const normalizedPath = alias ? pathname.replace(alias[0], alias[1]) : pathname;

  return navItems.find((item) => normalizedPath === item.path || normalizedPath.startsWith(`${item.path}/`)) || null;
};

function RouteAccessDenied({ onGoHome }: { onGoHome: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-xl border border-amber-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <Key className="h-5 w-5" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">Você não tem permissão para acessar esta rota</h2>
        <p className="mt-2 text-sm text-gray-500">
          Entre em contato com um administrador caso precise liberar este acesso.
        </p>
        <button
          type="button"
          onClick={onGoHome}
          className="mt-5 rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: PRIMARY }}
        >
          Ir para uma área disponível
        </button>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [storeName, setStoreName] = useState('Carregando...');
  const [salaoEnabled, setSalaoEnabled] = useState<boolean | null>(null);
  const [fiadoEnabled, setFiadoEnabled] = useState<boolean | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
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

  if (user?.perfil === 'cliente') {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    try {
      localStorage.setItem('admin_sidebar_collapsed', String(sidebarCollapsed));
    } catch {
      // Ignore storage errors; the visual state still works for this session.
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    const handleCollapseSidebar = () => {
      setSidebarOpen(false);
      setSidebarCollapsed(true);
    };

    window.addEventListener(ADMIN_COLLAPSE_SIDEBAR_EVENT, handleCollapseSidebar);
    return () => {
      window.removeEventListener(ADMIN_COLLAPSE_SIDEBAR_EVENT, handleCollapseSidebar);
    };
  }, []);
  
  useEffect(() => {
    if (user?.loja_id) {
      Promise.allSettled([
        api.get(`/lojas/${user.loja_id}`),
        api.get(`/salao/lojas/${user.loja_id}/modulos`),
      ]).then(([storeResult, modulesResult]) => {
        if (storeResult.status === 'fulfilled' && storeResult.value.data?.success) {
          setStoreName(storeResult.value.data.data.nome);
        } else {
          setStoreName('Minha Loja');
        }

        const modules = modulesResult.status === 'fulfilled'
          ? (modulesResult.value.data?.data ?? modulesResult.value.data)
          : [];
        setSalaoEnabled(Array.isArray(modules) && modules.some(module => module.slug === 'salao' && module.enabled === true));
        setFiadoEnabled(Array.isArray(modules) && modules.some(module => module.slug === 'fiado' && module.enabled === true));
      });
    } else {
      setStoreName('Admin Master');
      setSalaoEnabled(false);
      setFiadoEnabled(false);
    }
  }, [user?.loja_id]);

  useEffect(() => {
    let active = true;
    let unlisten = () => {};
    let listenerStarting = false;

    const updateCount = (event: Event) => {
      const count = (event as CustomEvent<number>).detail;
      if (Number.isInteger(count) && count >= 0) setUnreadCount(count);
    };

    const startForegroundListener = async () => {
      if (listenerStarting || !localStorage.getItem('admin_notification_fcm_token')) return;
      listenerStarting = true;
      const { listenForAdminPush } = await import('@/features/notifications/services/notificationsService');
      const cleanup = await listenForAdminPush((payload) => {
        if (!active) return;
        setUnreadCount((current) => current + 1);
        if ('Notification' in window && Notification.permission === 'granted') {
          const data = payload.data || {};
          const foregroundNotification = new Notification(data.title || 'Nova notificação', { body: data.body });
          foregroundNotification.onclick = () => {
            window.focus();
            if (data.route) navigate(data.route);
          };
        }
      });
      if (active) {
        unlisten = cleanup;
      } else {
        cleanup();
      }
    };

    void startForegroundListener();
    window.addEventListener('admin-notification-count-updated', updateCount);
    window.addEventListener('admin-push-enabled', startForegroundListener);

    return () => {
      active = false;
      unlisten();
      window.removeEventListener('admin-notification-count-updated', updateCount);
      window.removeEventListener('admin-push-enabled', startForegroundListener);
    };
  }, [navigate]);

  const isActive = (path: string) => {
    const legacyProductImportPath = location.pathname === '/products-import' || location.pathname === '/importar-produtos';
    return location.pathname === path || location.pathname.startsWith(path + '/') || (path === '/products' && legacyProductImportPath);
  };

  const handleLogout = async () => {
    if (localStorage.getItem('admin_notification_fcm_token')) {
      const { disableAdminPush } = await import('@/features/notifications/services/notificationsService');
      await disableAdminPush().catch(() => {});
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const canViewNavItem = (item: (typeof navItems)[number]) => {
    if (user?.perfil === 'entregador') return item.path === '/driver';
    // Hide "Minhas Entregas" from non-drivers to keep sidebar clean
    if (item.path === '/driver') return false;
    if (item.path === '/salao' && salaoEnabled !== true) return false;
    if (item.path === '/fiados' && fiadoEnabled !== true) return false;
    if (user?.perfil === 'superadmin' || user?.perfil === 'administrador') return true;
    return user?.permissions?.includes(item.slug);
  };

  const ordersNavItem = navItems.find((item) => item.slug === 'pedidos');
  const canAccessOrders = Boolean(ordersNavItem && canViewNavItem(ordersNavItem));

  useEffect(() => {
    const handleCreateOrderShortcut = (event: KeyboardEvent) => {
      if (event.key !== 'F10' || event.repeat || !canAccessOrders) return;

      event.preventDefault();
      const shortcutParams = new URLSearchParams();
      shortcutParams.set(CREATE_ORDER_SHORTCUT_PARAM, String(Date.now()));
      navigate(`/orders?${shortcutParams.toString()}`);
      setSidebarOpen(false);
    };

    window.addEventListener('keydown', handleCreateOrderShortcut);
    return () => window.removeEventListener('keydown', handleCreateOrderShortcut);
  }, [canAccessOrders, navigate]);

  const visibleNavGroups = navGroups
    .map(group => ({
      ...group,
      items: group.paths
        .map(path => navItems.find(item => item.path === path))
        .filter((item): item is (typeof navItems)[number] => Boolean(item))
        .filter(canViewNavItem),
    }))
    .filter(group => group.items.length > 0);

  const currentNavItem = resolveNavItemForPath(location.pathname);
  const currentRouteModuleLoading =
    (currentNavItem?.path === '/salao' && salaoEnabled === null) ||
    (currentNavItem?.path === '/fiados' && fiadoEnabled === null);
  const currentRouteAccessDenied =
    !currentRouteModuleLoading &&
    (
      (location.pathname.startsWith('/permissions') && user?.perfil !== 'superadmin') ||
      Boolean(currentNavItem && !canViewNavItem(currentNavItem))
    );
  const firstAvailableRoute = visibleNavGroups[0]?.items[0]?.path || '/login';
  const handleGoToAvailableRoute = () => {
    navigate(firstAvailableRoute, { replace: true });
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-[210] flex w-64 flex-col transition-[transform,width] duration-300 ease-in-out ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
        style={{ backgroundColor: PRIMARY }}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 border-b border-white/10 px-5 py-5 ${sidebarCollapsed ? 'lg:flex-col lg:justify-center lg:px-3 lg:py-4' : ''}`}>
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center">
            <img src={logo} alt="" className="h-11 w-11 object-contain drop-shadow-sm" />
          </div>
          <div className={sidebarCollapsed ? 'lg:hidden' : ''}>
            <div className="text-white font-semibold text-sm leading-tight truncate max-w-[140px]">{storeName}</div>
            <div className="text-white/50 text-xs">Entregaí Admin</div>
          </div>
          <button
            type="button"
            className={`ml-auto hidden h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white ${sidebarCollapsed ? 'lg:ml-0 lg:flex' : 'lg:flex'}`}
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          <button
            className="ml-auto lg:hidden text-white/60 hover:text-white"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className={`flex-1 overflow-y-auto px-3 py-3 ${sidebarCollapsed ? 'lg:px-2' : ''}`}>
          {visibleNavGroups.map((group, groupIndex) => (
            <section key={group.title} className={groupIndex === 0 ? '' : 'mt-4'}>
              <h2 className={`px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/35 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                {group.title}
              </h2>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
                      title={sidebarCollapsed ? item.label : undefined}
                      aria-label={sidebarCollapsed ? item.label : undefined}
                      style={{
                        backgroundColor: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: active ? 'white' : 'rgba(255,255,255,0.65)',
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                      {active && <ChevronRight className={`ml-auto h-3.5 w-3.5 opacity-70 ${sidebarCollapsed ? 'lg:hidden' : ''}`} />}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {user?.perfil === 'superadmin' && (
            <>
              <div className={`px-3 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-wider text-white/35 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>Master</div>
              {superAdminItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                    className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
                    title={sidebarCollapsed ? item.label : undefined}
                    aria-label={sidebarCollapsed ? item.label : undefined}
                    style={{
                      backgroundColor: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                      color: active ? 'white' : 'rgba(255,255,255,0.65)',
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                    {active && <ChevronRight className={`ml-auto h-3.5 w-3.5 opacity-70 ${sidebarCollapsed ? 'lg:hidden' : ''}`} />}
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {/* User */}
        <div className={`border-t border-white/10 p-3 ${sidebarCollapsed ? 'lg:px-2' : ''}`}>
          <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`} style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              <span className={sidebarCollapsed ? 'lg:hidden' : ''}>AM</span>
              <User className={`hidden h-4 w-4 ${sidebarCollapsed ? 'lg:block' : ''}`} />
            </div>
            <div className={`flex-1 min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <div className="text-white text-xs font-medium truncate">{user?.nome || 'Usuário'}</div>
              <div className="text-white/50 text-xs truncate">{user?.perfil || 'Administrador'}</div>
            </div>
            <button
              className={`text-white/40 transition-colors hover:text-white ${sidebarCollapsed ? 'lg:hidden' : ''}`}
              onClick={() => void handleLogout()}
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
              {currentNavItem?.label ?? 'Painel'}
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
          {currentRouteModuleLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div
                className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200"
                style={{ borderColor: `${PRIMARY}40`, borderTopColor: PRIMARY }}
              />
            </div>
          ) : currentRouteAccessDenied ? (
            <RouteAccessDenied onGoHome={handleGoToAvailableRoute} />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
