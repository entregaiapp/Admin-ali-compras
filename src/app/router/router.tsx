import type { ComponentType } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { AdminLayout } from "@/app/layouts/AdminLayout";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { DriverLayout } from "@/app/layouts/DriverLayout";
import { RootLayout } from "@/app/layouts/RootLayout";

type PageModule = Record<string, ComponentType>;

const lazyPage = (
  importer: () => Promise<PageModule>,
  exportName: string,
) => async () => {
  const pageModule = await importer();
  return { Component: pageModule[exportName] };
};

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      {
        Component: AuthLayout,
        children: [
          {
            path: "/login",
            lazy: lazyPage(() => import("@/pages/Login/LoginPage"), "LoginPage"),
          },
          {
            path: "/reset-password",
            lazy: lazyPage(() => import("@/pages/Login/LoginPage"), "LoginPage"),
          },
        ],
      },
      {
        path: "/driver",
        Component: DriverLayout,
        children: [
          {
            index: true,
            lazy: lazyPage(
              () => import("@/pages/Driver/MyDeliveriesPage"),
              "MyDeliveriesPage",
            ),
          },
          {
            path: "route/:id",
            lazy: lazyPage(
              () => import("@/pages/Driver/RouteDetailPage"),
              "RouteDetailPage",
            ),
          },
        ],
      },
      {
        path: "/",
        Component: AdminLayout,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          {
            path: "dashboard",
            lazy: lazyPage(
              () => import("@/pages/Dashboard/DashboardPage"),
              "DashboardPage",
            ),
          },
          {
            path: "orders",
            lazy: lazyPage(() => import("@/pages/Orders/OrdersPage"), "OrdersPage"),
          },
          {
            path: "pedidos",
            lazy: lazyPage(() => import("@/pages/Orders/OrdersPage"), "OrdersPage"),
          },
          {
            path: "salao",
            lazy: lazyPage(() => import("@/pages/Salao/SalaoPage"), "SalaoPage"),
          },
          {
            path: "products",
            lazy: lazyPage(
              () => import("@/pages/Products/ProductsPage"),
              "ProductsPage",
            ),
          },
          {
            path: "produtos",
            lazy: lazyPage(
              () => import("@/pages/Products/ProductsPage"),
              "ProductsPage",
            ),
          },
          {
            path: "products/import",
            lazy: lazyPage(
              () => import("@/pages/Products/ProductCsvImportPage"),
              "ProductCsvImportPage",
            ),
          },
          {
            path: "products/import-ai",
            lazy: lazyPage(
              () => import("@/pages/Products/MenuImportPage"),
              "MenuImportPage",
            ),
          },
          { path: "products-import", element: <Navigate to="/products/import" replace /> },
          { path: "importar-produtos", element: <Navigate to="/products/import" replace /> },
          {
            path: "categories",
            lazy: lazyPage(
              () => import("@/pages/Categories/CategoriesPage"),
              "CategoriesPage",
            ),
          },
          {
            path: "categorias",
            lazy: lazyPage(
              () => import("@/pages/Categories/CategoriesPage"),
              "CategoriesPage",
            ),
          },
          {
            path: "promotions",
            lazy: lazyPage(
              () => import("@/pages/Promotions/PromotionsPage"),
              "PromotionsPage",
            ),
          },
          {
            path: "banners",
            lazy: lazyPage(() => import("@/pages/Banners/BannersPage"), "BannersPage"),
          },
          {
            path: "customers",
            lazy: lazyPage(
              () => import("@/pages/Customers/CustomersPage"),
              "CustomersPage",
            ),
          },
          {
            path: "clientes",
            lazy: lazyPage(
              () => import("@/pages/Customers/CustomersPage"),
              "CustomersPage",
            ),
          },
          {
            path: "deliveries",
            lazy: lazyPage(
              () => import("@/pages/Deliveries/DeliveriesPage"),
              "DeliveriesPage",
            ),
          },
          {
            path: "coupons",
            lazy: lazyPage(() => import("@/pages/Coupons/CouponsPage"), "CouponsPage"),
          },
          {
            path: "payments",
            lazy: lazyPage(
              () => import("@/pages/Payments/PaymentsPage"),
              "PaymentsPage",
            ),
          },
          {
            path: "cash",
            lazy: lazyPage(() => import("@/pages/Cash/CashPage"), "CashPage"),
          },
          {
            path: "caixa",
            lazy: lazyPage(() => import("@/pages/Cash/CashPage"), "CashPage"),
          },
          {
            path: "fiados",
            lazy: lazyPage(() => import("@/pages/Fiados/FiadosPage"), "FiadosPage"),
          },
          {
            path: "reports",
            lazy: lazyPage(() => import("@/pages/Reports/ReportsPage"), "ReportsPage"),
          },
          {
            path: "users",
            lazy: lazyPage(() => import("@/pages/Users/UsersPage"), "UsersPage"),
          },
          {
            path: "activities",
            lazy: lazyPage(
              () => import("@/pages/AuditLogs/AuditLogsPage"),
              "AuditLogsPage",
            ),
          },
          {
            path: "permissions",
            lazy: lazyPage(
              () => import("@/pages/SystemPermissions/SystemPermissionsPage"),
              "SystemPermissionsPage",
            ),
          },
          {
            path: "settings",
            lazy: lazyPage(
              () => import("@/pages/Settings/SettingsPage"),
              "SettingsPage",
            ),
          },
          {
            path: "configuracoes",
            lazy: lazyPage(
              () => import("@/pages/Settings/SettingsPage"),
              "SettingsPage",
            ),
          },
          {
            path: "entregadores",
            lazy: lazyPage(
              () => import("@/pages/Entregadores/EntregadoresPage"),
              "EntregadoresPage",
            ),
          },
          {
            path: "notifications",
            lazy: lazyPage(
              () => import("@/pages/Notifications/NotificationsPage"),
              "NotificationsPage",
            ),
          },
        ],
      },
    ],
  },
]);
