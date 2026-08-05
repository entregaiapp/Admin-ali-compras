import type { Dispatch, RefObject, SetStateAction } from "react";
import {
  AlertTriangle,
  Archive,
  Bell,
  BellOff,
  CalendarDays,
  ChevronDown,
  CreditCard,
  List,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { allStatuses } from "@/features/orders/constants";
import { hexToRgba } from "@/features/orders/utils/orderUtils";
import type {
  ArchivedOrderTypeFilter,
  OrderCounterKey,
  OrderTab,
  QuickOrderFilter,
} from "@/features/orders/utils/ordersScreenUtils";

type ViewMode = "lista" | "bairros" | "arquivados";

type SoundControl = {
  autoplayBlocked: boolean;
  arm: () => void;
};

type OrdersToolbarProps = {
  activeFiltersCount: number;
  activeListGroup: any;
  advancedFiltersOpen: boolean;
  advancedFiltersRef: RefObject<HTMLDivElement | null>;
  allDeliveryOrders: any[];
  archivedEndDate: string;
  archivedGroups: any[];
  archivedStartDate: string;
  archivedTotalOrders: number;
  archivedTypeFilter: ArchivedOrderTypeFilter;
  archivedTypeOptions: Array<{ value: ArchivedOrderTypeFilter; label: string }>;
  availableOrderTabs: ReadonlyArray<{ value: OrderTab; label: string }>;
  bairroFilter: string;
  bairroOptions: string[];
  canCreateManualOrder: boolean;
  checkingNewOrders: boolean;
  delayedOrdersCount: number;
  deliveryOrders: any[];
  deliverySound: SoundControl;
  deliverySoundEnabled: boolean;
  filtered: any[];
  hasPendingDeliveryPrint: boolean;
  hasPendingPickupPrint: boolean;
  inProgressOrdersCount: Record<"entrega" | "retirada", number>;
  isGlobalSearchActive: boolean;
  mobileFiltersOpen: boolean;
  newOrdersCount: Record<OrderCounterKey, number>;
  ordersFullscreen: boolean;
  pendingPaymentsCount: number;
  pickupSound: SoundControl;
  pickupSoundEnabled: boolean;
  primaryColor: string;
  quickOrderFilter: QuickOrderFilter;
  refreshCooldownActive: boolean;
  refreshingOrders: boolean;
  search: string;
  selectedDeliveryCount: number;
  statusFilter: string;
  totalNewOrdersCount: number;
  typeFilter: OrderTab;
  viewMode: ViewMode;
  changeViewMode: (mode: ViewMode) => void;
  handleNewOrdersButton: () => void;
  openSelectedOrdersModal: () => void;
  refreshCurrentOrderTab: () => Promise<void>;
  setAdvancedFiltersOpen: Dispatch<SetStateAction<boolean>>;
  setArchivedEndDate: Dispatch<SetStateAction<string>>;
  setArchivedStartDate: Dispatch<SetStateAction<string>>;
  setArchivedTypeFilter: Dispatch<SetStateAction<ArchivedOrderTypeFilter>>;
  setBairroFilter: Dispatch<SetStateAction<string>>;
  setDeliverySoundEnabled: Dispatch<SetStateAction<boolean>>;
  setManualOrderOpen: Dispatch<SetStateAction<boolean>>;
  setMobileFiltersOpen: Dispatch<SetStateAction<boolean>>;
  setPickupSoundEnabled: Dispatch<SetStateAction<boolean>>;
  setQuickOrderFilter: Dispatch<SetStateAction<QuickOrderFilter>>;
  setSearch: Dispatch<SetStateAction<string>>;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  setTypeFilter: Dispatch<SetStateAction<OrderTab>>;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  toggleOrdersFullscreen: () => Promise<void>;
};

export function OrdersToolbar({
  activeFiltersCount,
  activeListGroup,
  advancedFiltersOpen,
  advancedFiltersRef,
  allDeliveryOrders,
  archivedEndDate,
  archivedGroups,
  archivedStartDate,
  archivedTotalOrders,
  archivedTypeFilter,
  archivedTypeOptions,
  availableOrderTabs,
  bairroFilter,
  bairroOptions,
  canCreateManualOrder,
  changeViewMode,
  checkingNewOrders,
  delayedOrdersCount,
  deliveryOrders,
  deliverySound,
  deliverySoundEnabled,
  filtered,
  handleNewOrdersButton,
  hasPendingDeliveryPrint,
  hasPendingPickupPrint,
  inProgressOrdersCount,
  isGlobalSearchActive,
  mobileFiltersOpen,
  newOrdersCount,
  openSelectedOrdersModal,
  ordersFullscreen,
  pendingPaymentsCount,
  pickupSound,
  pickupSoundEnabled,
  primaryColor,
  quickOrderFilter,
  refreshCooldownActive,
  refreshCurrentOrderTab,
  refreshingOrders,
  search,
  selectedDeliveryCount,
  setAdvancedFiltersOpen,
  setArchivedEndDate,
  setArchivedStartDate,
  setArchivedTypeFilter,
  setBairroFilter,
  setDeliverySoundEnabled,
  setManualOrderOpen,
  setMobileFiltersOpen,
  setPickupSoundEnabled,
  setQuickOrderFilter,
  setSearch,
  setStatusFilter,
  setTypeFilter,
  setViewMode,
  statusFilter,
  toggleOrdersFullscreen,
  totalNewOrdersCount,
  typeFilter,
  viewMode,
}: OrdersToolbarProps) {
  return (
    <>
              <div className="border-b border-gray-200 bg-white px-3 sm:px-4">
                {viewMode === "arquivados" ? (
                  <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Archive className="h-5 w-5" />
                      </div>
                      <div>
                        <h1 className="text-lg font-bold text-gray-900">
                          Arquivados
                        </h1>
                        <p className="text-xs text-gray-500">
                          Pedidos agrupados pelo dia em que foram realizados
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                      <CalendarDays className="h-4 w-4" />
                      {archivedGroups.length} dia{archivedGroups.length !== 1 ? "s" : ""} · {archivedTotalOrders} pedido{archivedTotalOrders !== 1 ? "s" : ""}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <div
                      className="flex min-w-0 flex-1 gap-1 overflow-x-auto"
                      role="tablist"
                      aria-label="Tipos de pedido"
                    >
                      {availableOrderTabs.map((tab) => {
                      const active = typeFilter === tab.value;
                      const type = tab.value.toLowerCase() as OrderCounterKey;
                      const count = newOrdersCount[type];
                      const inProgressCount = type === "entrega" || type === "retirada"
                        ? inProgressOrdersCount[type]
                        : null;
                      return (
                        <button
                          key={tab.value}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => {
                            if (tab.value !== "Entrega") {
                              setBairroFilter("Todos");
                              if (viewMode === "bairros") changeViewMode("lista");
                            }
                            if (active && count > 0) {
                              void refreshCurrentOrderTab();
                            } else {
                              setQuickOrderFilter(null);
                              setTypeFilter(tab.value);
                            }
                          }}
                          className={`relative isolate inline-flex min-w-24 items-center justify-center gap-1.5 overflow-hidden border-b-2 px-4 py-2 text-sm font-semibold transition-all duration-200 sm:min-w-28 ${active ? "text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"}`}
                          style={active ? { borderBottomColor: primaryColor, color: primaryColor } : undefined}
                        >
                          {active && (
                            <>
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-x-0 bottom-0 h-7"
                                style={{
                                  background: `linear-gradient(to top, ${hexToRgba(primaryColor, 0.13)} 0%, ${hexToRgba(primaryColor, 0.055)} 38%, ${hexToRgba(primaryColor, 0)} 100%)`,
                                }}
                              />
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-x-3 bottom-0 h-1 blur-md"
                                style={{
                                  backgroundColor: hexToRgba(primaryColor, 0.22),
                                }}
                              />
                            </>
                          )}
                          <span className="relative z-10 flex flex-col items-center leading-tight">
                            <span>{tab.label}</span>
                            {inProgressCount !== null && (
                              <span
                                className={`mt-1 text-[10px] font-medium leading-none ${active ? "opacity-80" : "text-gray-400"}`}
                              >
                                {inProgressCount} em andamento
                              </span>
                            )}
                          </span>
                          {count > 0 && (
                            <span
                              className="relative z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                              style={{ backgroundColor: primaryColor }}
                              title={`${count} pedido${count === 1 ? " novo" : "s novos"}`}
                            >
                              {count > 99 ? "99+" : count}
                            </span>
                          )}
                          {active && checkingNewOrders && (
                            <span className="absolute right-1 top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-gray-300" />
                          )}
                        </button>
                      );
                      })}
                    </div>
                    <div className="flex shrink-0 items-center justify-end gap-1 border-t border-gray-100 py-1.5 sm:border-l sm:border-t-0 sm:py-0 sm:pl-3">
                      <button
                      type="button"
                      disabled={refreshingOrders || refreshCooldownActive}
                      onClick={handleNewOrdersButton}
                      className="relative ml-auto inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 sm:my-1 sm:h-8 sm:w-8"
                      style={{ backgroundColor: primaryColor }}
                      title={refreshingOrders ? "Atualizando pedidos..." : refreshCooldownActive ? "Aguarde alguns segundos para atualizar novamente" : totalNewOrdersCount > 0 ? `${totalNewOrdersCount} pedido${totalNewOrdersCount === 1 ? " novo" : "s novos"}` : "Atualizar pedidos"}
                      aria-label={refreshingOrders ? "Atualizando pedidos" : refreshCooldownActive ? "Atualização temporariamente bloqueada" : totalNewOrdersCount > 0 ? `Atualizar ${totalNewOrdersCount} pedidos novos` : "Atualizar pedidos"}
                      aria-busy={refreshingOrders}
                    >
                      <RefreshCw className={`h-4 w-4 ${checkingNewOrders || refreshingOrders ? "animate-spin" : ""}`} />
                      {totalNewOrdersCount > 0 && (
                        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white">
                          {totalNewOrdersCount > 99 ? "99+" : totalNewOrdersCount}
                        </span>
                      )}
                      </button>
                      <button
                      type="button"
                      onClick={() => {
                        if (deliverySoundEnabled && deliverySound.autoplayBlocked) {
                          deliverySound.arm();
                          return;
                        }
                        const nextEnabled = !deliverySoundEnabled;
                        setDeliverySoundEnabled(nextEnabled);
                        if (nextEnabled) deliverySound.arm();
                      }}
                      className={`relative inline-flex h-10 flex-none items-center justify-center gap-1.5 rounded-lg border px-2 transition-all sm:my-1 sm:h-8 ${
                        deliverySoundEnabled && deliverySound.autoplayBlocked
                          ? "animate-pulse border-amber-400 bg-amber-500 text-white"
                          : hasPendingDeliveryPrint && deliverySoundEnabled
                          ? "animate-pulse border-red-300 bg-red-600 text-white"
                          : deliverySoundEnabled
                            ? "border-transparent text-white"
                            : "border-gray-200 bg-white text-gray-400"
                      }`}
                      style={
                        deliverySoundEnabled && !hasPendingDeliveryPrint
                          ? { backgroundColor: primaryColor }
                          : undefined
                      }
                      title={
                        deliverySoundEnabled && deliverySound.autoplayBlocked
                          ? "Clique para liberar o som do Delivery"
                          : deliverySoundEnabled
                            ? "Som do Delivery ativado"
                            : "Som do Delivery desativado"
                      }
                      aria-label={
                        deliverySoundEnabled && deliverySound.autoplayBlocked
                          ? "Liberar som do Delivery"
                          : deliverySoundEnabled
                            ? "Som do Delivery ativado"
                            : "Som do Delivery desativado"
                      }
                      aria-pressed={deliverySoundEnabled}
                    >
                      {deliverySoundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                      <span className="text-[10px] font-semibold leading-none">
                        Delivery
                      </span>
                      {hasPendingDeliveryPrint && (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-amber-400" />
                      )}
                      </button>
                      <button
                      type="button"
                      onClick={() => {
                        if (pickupSoundEnabled && pickupSound.autoplayBlocked) {
                          pickupSound.arm();
                          return;
                        }
                        const nextEnabled = !pickupSoundEnabled;
                        setPickupSoundEnabled(nextEnabled);
                        if (nextEnabled) pickupSound.arm();
                      }}
                      className={`relative inline-flex h-10 flex-none items-center justify-center gap-1.5 rounded-lg border px-2 transition-all sm:my-1 sm:h-8 ${
                        pickupSoundEnabled && pickupSound.autoplayBlocked
                          ? "animate-pulse border-amber-400 bg-amber-500 text-white"
                          : hasPendingPickupPrint && pickupSoundEnabled
                          ? "animate-pulse border-red-300 bg-red-600 text-white"
                          : pickupSoundEnabled
                            ? "border-transparent text-white"
                            : "border-gray-200 bg-white text-gray-400"
                      }`}
                      style={
                        pickupSoundEnabled && !hasPendingPickupPrint
                          ? { backgroundColor: primaryColor }
                          : undefined
                      }
                      title={
                        pickupSoundEnabled && pickupSound.autoplayBlocked
                          ? "Clique para liberar o som da Retirada"
                          : pickupSoundEnabled
                            ? "Som da Retirada ativado"
                            : "Som da Retirada desativado"
                      }
                      aria-label={
                        pickupSoundEnabled && pickupSound.autoplayBlocked
                          ? "Liberar som da Retirada"
                          : pickupSoundEnabled
                            ? "Som da Retirada ativado"
                            : "Som da Retirada desativado"
                      }
                      aria-pressed={pickupSoundEnabled}
                    >
                      {pickupSoundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                      <span className="text-[10px] font-semibold leading-none">
                        Retirada
                      </span>
                      {hasPendingPickupPrint && (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-amber-400" />
                      )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleOrdersFullscreen()}
                        className={`relative inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg border transition-all hover:bg-gray-50 sm:my-1 sm:h-8 sm:w-8 ${
                          ordersFullscreen
                            ? "border-transparent text-white"
                            : "border-gray-200 bg-white text-gray-500"
                        }`}
                        style={ordersFullscreen ? { backgroundColor: primaryColor } : undefined}
                        title={ordersFullscreen ? "Sair da tela cheia" : "Abrir pedidos em tela cheia"}
                        aria-label={ordersFullscreen ? "Sair da tela cheia" : "Abrir pedidos em tela cheia"}
                        aria-pressed={ordersFullscreen}
                      >
                        {ordersFullscreen ? (
                          <Minimize2 className="h-4 w-4" />
                        ) : (
                          <Maximize2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Filters bar */}
              <div className="border-b border-gray-200 bg-white px-3 py-2 sm:px-4 sm:py-2.5">
                <div className="flex items-center gap-2 md:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen((open) => !open)}
                    className="flex h-11 flex-1 items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-700"
                    aria-expanded={mobileFiltersOpen}
                    aria-controls="pedidos-filtros"
                  >
                    <span className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      Filtros e visualização
                      {activeFiltersCount > 0 && (
                        <span
                          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {activeFiltersCount}
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${mobileFiltersOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {canCreateManualOrder && (
                    <button
                      type="button"
                      onClick={() => setManualOrderOpen(true)}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Plus className="h-4 w-4" />
                      Criar
                    </button>
                  )}
                </div>
      
                <div
                  id="pedidos-filtros"
                  className={`${mobileFiltersOpen ? "flex" : "hidden"} mt-2 flex-col gap-2 md:mt-0 md:flex xl:flex-row xl:items-center xl:justify-between`}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-end">
                    {canCreateManualOrder && (
                      <button
                        type="button"
                        onClick={() => setManualOrderOpen(true)}
                        className="hidden h-10 shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white md:inline-flex"
                        style={{ backgroundColor: primaryColor }}
                        title="Criar pedido — atalho F10"
                      >
                        <Plus className="h-4 w-4" />
                        Criar pedido
                        <kbd className="ml-1 rounded border border-white/25 bg-white/10 px-1.5 py-0.5 font-sans text-[10px] font-bold leading-none text-white/90">
                          F10
                        </kbd>
                      </button>
                    )}
      
                    <div
                      className={`grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 ${viewMode === "arquivados" ? "xl:grid-cols-3 2xl:grid-cols-5" : viewMode === "bairros" ? "xl:grid-cols-3" : "xl:grid-cols-[minmax(320px,1fr)_auto]"}`}
                    >
                      <div className="relative">
                        <label className="sr-only">
                          Busca global
                        </label>
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          value={search}
                          onChange={(e) => {
                            const nextSearch = e.target.value;
                            setSearch(nextSearch);
                            if (nextSearch.trim() && viewMode === "bairros") {
                              setViewMode("lista");
                            }
                          }}
                          placeholder="Buscar por comanda, pedido ou cliente"
                          className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:ring-1"
                        />
                      </div>
      
                      {viewMode === "lista" && (
                        <div ref={advancedFiltersRef} className="relative w-full self-end sm:w-auto">
                          <button
                            type="button"
                            onClick={() => setAdvancedFiltersOpen((open) => !open)}
                            className={`flex h-10 w-full min-w-28 items-center justify-between rounded-lg border bg-white px-3 text-sm font-semibold transition-colors hover:bg-gray-50 hover:text-gray-900 sm:w-auto ${
                              advancedFiltersOpen || statusFilter !== "Todos"
                                ? "text-slate-900"
                                : "border-gray-200 text-gray-700"
                            }`}
                            style={
                              advancedFiltersOpen || statusFilter !== "Todos"
                                ? { borderColor: primaryColor }
                                : undefined
                            }
                            aria-expanded={advancedFiltersOpen}
                            aria-controls="pedidos-filtros-avancados"
                          >
                            <span className="flex items-center gap-2">
                              <SlidersHorizontal className="h-4 w-4" />
                              Filtros
                              {statusFilter !== "Todos" && (
                                <span
                                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                                  style={{ backgroundColor: primaryColor }}
                                >
                                  1
                                </span>
                              )}
                            </span>
                            <ChevronDown
                              className={`ml-2 h-4 w-4 transition-transform ${advancedFiltersOpen ? "rotate-180" : ""}`}
                            />
                          </button>
      
                          {advancedFiltersOpen && (
                            <div
                              id="pedidos-filtros-avancados"
                              className="mt-2 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.12)] md:absolute md:right-0 md:top-[calc(100%+6px)] md:z-50 md:mt-0 md:w-64"
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-xs font-semibold text-slate-900">
                                    Filtrar pedidos
                                  </div>
                                  <div className="text-[11px] text-gray-400">
                                    Selecione o status desejado
                                  </div>
                                </div>
                                {statusFilter !== "Todos" && (
                                  <button
                                    type="button"
                                    onClick={() => setStatusFilter("Todos")}
                                    className="text-[11px] font-semibold text-gray-500 hover:text-gray-900"
                                  >
                                    Limpar
                                  </button>
                                )}
                              </div>
                              <label
                                htmlFor="pedidos-status-filtro"
                                className="mb-1 block text-[11px] font-semibold text-gray-500"
                              >
                                Status do pedido
                              </label>
                              <select
                                id="pedidos-status-filtro"
                                value={statusFilter}
                                onChange={(event) => {
                                  setStatusFilter(event.target.value);
                                  setAdvancedFiltersOpen(false);
                                }}
                                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-1"
                              >
                                {allStatuses.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
      
                      {viewMode !== "lista" && <div id="pedidos-filtros-avancados">
                        <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                          Status
                        </label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1"
                        >
                          {allStatuses.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>}
      
                      {viewMode === "arquivados" && (
                        <div>
                          <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                            Tipo
                          </label>
                          <select
                            value={archivedTypeFilter}
                            onChange={(e) =>
                              setArchivedTypeFilter(e.target.value as ArchivedOrderTypeFilter)
                            }
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1"
                          >
                            {archivedTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
      
                      {viewMode === "arquivados" && (
                        <>
                          <div>
                            <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                              Data inicial
                            </label>
                            <input
                              type="date"
                              value={archivedStartDate}
                              max={archivedEndDate || undefined}
                              onChange={(e) => setArchivedStartDate(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                              Data final
                            </label>
                            <input
                              type="date"
                              value={archivedEndDate}
                              min={archivedStartDate || undefined}
                              onChange={(e) => setArchivedEndDate(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1"
                            />
                          </div>
                        </>
                      )}
      
                      {viewMode === "bairros" && (
                        <div>
                          <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">
                            Bairro
                          </label>
                          <select
                            value={bairroFilter}
                            onChange={(e) => setBairroFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1"
                          >
                            <option value="Todos">Todos os bairros</option>
                            {bairroOptions.map((bairro) => (
                              <option key={bairro} value={bairro}>
                                {bairro}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
      
                    {activeFiltersCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setStatusFilter("Todos");
                          if (viewMode === "arquivados") {
                            setArchivedTypeFilter("Todos");
                            setArchivedStartDate("");
                            setArchivedEndDate("");
                          } else {
                            setBairroFilter("Todos");
                          }
                          setQuickOrderFilter(null);
                        }}
                        className="h-10 shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
      
                  <div className="grid w-full shrink-0 grid-cols-2 gap-0.5 self-start rounded-lg border border-gray-200 bg-white p-0.5 sm:flex sm:w-auto xl:self-center">
                    <button
                      onClick={() => changeViewMode("lista")}
                      className="flex min-h-10 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all sm:min-h-9"
                      style={
                        viewMode === "lista"
                          ? { backgroundColor: primaryColor, color: "white" }
                          : { color: "#6b7280" }
                      }
                    >
                      <List className="w-3.5 h-3.5" /> Lista
                    </button>
                    {typeFilter === "Entrega" && (
                      <button
                        onClick={() => changeViewMode("bairros")}
                        className="flex min-h-10 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all sm:min-h-9"
                        style={
                          viewMode === "bairros"
                            ? { backgroundColor: primaryColor, color: "white" }
                            : { color: "#6b7280" }
                        }
                      >
                        <MapIcon className="w-3.5 h-3.5" /> Por bairro
                      </button>
                    )}
                    <button
                      onClick={() => changeViewMode("arquivados")}
                      className="flex min-h-10 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all sm:min-h-9"
                      style={
                        viewMode === "arquivados"
                          ? { backgroundColor: primaryColor, color: "white" }
                          : { color: "#6b7280" }
                      }
                    >
                      <Archive className="w-3.5 h-3.5" /> Arquivados
                    </button>
                  </div>
                </div>
      
                {viewMode === "bairros" && (
                  <div className="mt-3 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    A visualização por bairro mostra pedidos de entrega e também
                    respeita busca, status e bairro selecionado.
                  </div>
                )}
              </div>
      
              {/* Count bar */}
              <div className="border-b border-gray-100 bg-white px-3 py-2 sm:px-4">
                {viewMode === "lista" ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-700">
                      {filtered.length} pedido{filtered.length !== 1 ? "s" : ""}{" "}
                      encontrado{filtered.length !== 1 ? "s" : ""}
                      {isGlobalSearchActive ? " em todos os tipos" : ""}
                    </span>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {(delayedOrdersCount > 0 || quickOrderFilter === "delayed") && (
                        <button
                          type="button"
                          onClick={() =>
                            setQuickOrderFilter((current) =>
                              current === "delayed" ? null : "delayed",
                            )
                          }
                          aria-pressed={quickOrderFilter === "delayed"}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                            quickOrderFilter === "delayed"
                              ? "border-red-600 bg-red-600 text-white ring-2 ring-red-200"
                              : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          }`}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          {delayedOrdersCount} atrasado{delayedOrdersCount !== 1 ? "s" : ""}
                        </button>
                      )}
                      {(pendingPaymentsCount > 0 || quickOrderFilter === "pending") && (
                        <button
                          type="button"
                          onClick={() =>
                            setQuickOrderFilter((current) =>
                              current === "pending" ? null : "pending",
                            )
                          }
                          aria-pressed={quickOrderFilter === "pending"}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                            quickOrderFilter === "pending"
                              ? "border-amber-600 bg-amber-600 text-white ring-2 ring-amber-200"
                              : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                          }`}
                        >
                          <CreditCard className="h-4 w-4" />
                          {pendingPaymentsCount} pagamento{pendingPaymentsCount !== 1 ? "s" : ""} pendente{pendingPaymentsCount !== 1 ? "s" : ""}
                        </button>
                      )}
                      {selectedDeliveryCount > 0 && (
                        <button
                          onClick={openSelectedOrdersModal}
                          className="h-8 rounded-lg px-2.5 text-xs font-semibold text-white"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Adicionar {selectedDeliveryCount} à entrega
                        </button>
                      )}
                    </div>
                  </div>
                ) : viewMode === "arquivados" ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-gray-500">
                      {archivedTotalOrders} pedido{archivedTotalOrders !== 1 ? "s" : ""}{" "}
                      arquivado{archivedTotalOrders !== 1 ? "s" : ""} em{" "}
                      {archivedGroups.length} dia{archivedGroups.length !== 1 ? "s" : ""}
                    </span>
                    {activeListGroup && (
                      <span className="text-xs font-semibold text-gray-700">
                        Dia selecionado: {activeListGroup.title}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-500">
                      Pedidos não atribuídos: {deliveryOrders.length} · Já atribuídos:{" "}
                      {allDeliveryOrders.length - deliveryOrders.length}
                    </span>
                    {selectedDeliveryCount > 0 && (
                      <button
                        onClick={openSelectedOrdersModal}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Adicionar {selectedDeliveryCount} à entrega
                      </button>
                    )}
                  </div>
                )}
              </div>
    </>
  );
}
