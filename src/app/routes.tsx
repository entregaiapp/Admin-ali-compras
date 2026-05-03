import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { Products } from './pages/Products';
import { Categories } from './pages/Categories';
import { Promotions } from './pages/Promotions';
// import { Banners } from './pages/Banners';
import { Customers } from './pages/Customers';
import { Deliveries } from './pages/Deliveries';
import { Coupons } from './pages/Coupons';
import { Payments } from './pages/Payments';
import { Reports } from './pages/Reports';
import { Users } from './pages/Users';
import { SystemPermissions } from './pages/SystemPermissions';
import { Settings } from './pages/Settings';
import { Notifications } from './pages/Notifications';

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', Component: Dashboard },
      { path: 'orders', Component: Orders },
      { path: 'products', Component: Products },
      { path: 'categories', Component: Categories },
      { path: 'promotions', Component: Promotions },
      // { path: 'banners', Component: Banners },
      { path: 'customers', Component: Customers },
      { path: 'deliveries', Component: Deliveries },
      { path: 'coupons', Component: Coupons },
      { path: 'payments', Component: Payments },
      { path: 'reports', Component: Reports },
      { path: 'users', Component: Users },
      { path: 'permissions', Component: SystemPermissions },
      { path: 'settings', Component: Settings },
      { path: 'notifications', Component: Notifications },
    ],
  },
]);
