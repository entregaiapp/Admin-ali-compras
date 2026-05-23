import { createBrowserRouter, Navigate } from "react-router";
import { AdminLayout } from "@/app/layouts/AdminLayout";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { DriverLayout } from "@/app/layouts/DriverLayout";
import { RootLayout } from "@/app/layouts/RootLayout";
import { LoginPage } from "@/pages/Login/LoginPage";
import { DashboardPage } from "@/pages/Dashboard/DashboardPage";
import { OrdersPage } from "@/pages/Orders/OrdersPage";
import { ProductsPage } from "@/pages/Products/ProductsPage";
import { ProductCsvImportPage } from "@/pages/Products/ProductCsvImportPage";
import { CategoriesPage } from "@/pages/Categories/CategoriesPage";
import { PromotionsPage } from "@/pages/Promotions/PromotionsPage";
import { BannersPage } from "@/pages/Banners/BannersPage";
import { CustomersPage } from "@/pages/Customers/CustomersPage";
import { DeliveriesPage } from "@/pages/Deliveries/DeliveriesPage";
import { CouponsPage } from "@/pages/Coupons/CouponsPage";
import { PaymentsPage } from "@/pages/Payments/PaymentsPage";
import { ReportsPage } from "@/pages/Reports/ReportsPage";
import { UsersPage } from "@/pages/Users/UsersPage";
import { SystemPermissionsPage } from "@/pages/SystemPermissions/SystemPermissionsPage";
import { SettingsPage } from "@/pages/Settings/SettingsPage";
import { EntregadoresPage } from "@/pages/Entregadores/EntregadoresPage";
import { NotificationsPage } from "@/pages/Notifications/NotificationsPage";
import { MyDeliveriesPage } from "@/pages/Driver/MyDeliveriesPage";
import { RouteDetailPage } from "@/pages/Driver/RouteDetailPage";

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      {
        Component: AuthLayout,
        children: [
          { path: "/login", Component: LoginPage },
          { path: "/reset-password", Component: LoginPage },
        ],
      },
      {
        path: "/driver",
        Component: DriverLayout,
        children: [
          { index: true, element: <MyDeliveriesPage /> },
          { path: "route/:id", Component: RouteDetailPage },
        ],
      },
      {
        path: "/",
        Component: AdminLayout,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", Component: DashboardPage },
          { path: "orders", Component: OrdersPage },
          { path: "pedidos", Component: OrdersPage },
          { path: "products", Component: ProductsPage },
          { path: "produtos", Component: ProductsPage },
          { path: "products/import", Component: ProductCsvImportPage },
          { path: "products-import", element: <Navigate to="/products/import" replace /> },
          { path: "importar-produtos", element: <Navigate to="/products/import" replace /> },
          { path: "categories", Component: CategoriesPage },
          { path: "categorias", Component: CategoriesPage },
          { path: "promotions", Component: PromotionsPage },
          { path: "banners", Component: BannersPage },
          { path: "customers", Component: CustomersPage },
          { path: "clientes", Component: CustomersPage },
          { path: "deliveries", Component: DeliveriesPage },
          { path: "coupons", Component: CouponsPage },
          { path: "payments", Component: PaymentsPage },
          { path: "reports", Component: ReportsPage },
          { path: "users", Component: UsersPage },
          { path: "permissions", Component: SystemPermissionsPage },
          { path: "settings", Component: SettingsPage },
          { path: "configuracoes", Component: SettingsPage },
          { path: "entregadores", Component: EntregadoresPage },
          { path: "notifications", Component: NotificationsPage },
        ],
      },
    ],
  },
]);
