import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Armchair,
  Bell,
  BellOff,
  CircleAlert,
  ChefHat,
  ClipboardList,
  Clock3,
  CreditCard,
  Download,
  Printer,
  KeyRound,
  Loader2,
  Maximize2,
  MessageSquareText,
  Minimize2,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  Receipt,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  UserRound,
} from "lucide-react";
import { salaoService } from "@/features/salao/services/salaoService";
import {
  generateMesaQrImage,
  mesaQrArtworkFileName,
  writeMesaQrPrintDocument,
} from "@/features/salao/services/mesaQrArtwork";
import {
  createSalaoAdminRealtime,
  salaoTenantTopic,
} from "@/features/salao/services/salaoRealtime";
import {
  createSingleFlightRunner,
  createSalaoRealtimeRefreshScheduler,
  readSalaoListPayload,
  shouldReconcileSalaoVisibility,
} from "@/features/salao/services/salaoRealtimeRefresh";
import {
  formatSalaoQuantity,
  formatSalaoQuantityInput,
} from "@/features/salao/utils/salaoQuantity";
import {
  formatMesaOpenDuration,
  reconcileMesaOpenTimes,
  registerMesaOpenTime,
  removeMesaOpenTime,
  type MesaOpenTimes,
} from "@/features/salao/utils/mesaOpenTime";
import { productsService } from "@/features/products";
import { showSystemNotice } from "@/shared/components/SystemToast";
import api from "@/shared/lib/api";
import { SalaoProductConfiguratorModal } from "./SalaoProductConfiguratorModal";
import type { ComandaPrintMode } from "@/features/orders/utils/print";
import {
  ComandaPrintModeModal,
  KitchenPrintSelectionModal,
} from "@/features/orders/components/ComandaPrintModals";
import {
  buildKitchenPrintSelectionItems,
  getKitchenPrintStorageKey,
  markKitchenItemsPrinted,
  readKitchenPrintedKeys,
  type KitchenPrintSelectionItem,
} from "@/features/orders/utils/kitchenPrintTracking";
import { printingService } from "@/features/printing/services/printingService";
import {
  useAlertSoundPreference,
  usePersistentAttentionSound,
} from "@/shared/hooks/usePersistentAttentionSound";
import { ADMIN_COLLAPSE_SIDEBAR_EVENT } from "@/shared/constants/uiEvents";

const PRIMARY = "#122a4c";
const TABLE_CARD_SCALE_STORAGE_KEY = "admin_salao_table_card_scale";
const TABLE_CARD_SCALE_MIN = 0.78;
const TABLE_CARD_SCALE_MAX = 1.32;
const TABLE_CARD_SCALE_STEP = 0.02;
const KDS_CARD_SCALE_STORAGE_KEY = "admin_salao_kds_card_scale";
const KDS_CARD_SCALE_MIN = 0.78;
const KDS_CARD_SCALE_MAX = 1.32;
const KDS_CARD_SCALE_STEP = 0.02;
type StorePrintMode = "agent_silencioso" | "navegador_windows" | "agent_com_fallback";

const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ||
  error?.response?.data?.error?.message ||
  error?.message ||
  fallback;

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return `rgba(18, 42, 76, ${alpha})`;

  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const clampTableCardScale = (value: unknown) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 1;
  return Math.min(TABLE_CARD_SCALE_MAX, Math.max(TABLE_CARD_SCALE_MIN, numericValue));
};

const getStoredTableCardScale = () => {
  if (typeof window === "undefined") return 1;
  return clampTableCardScale(localStorage.getItem(TABLE_CARD_SCALE_STORAGE_KEY));
};

const clampKdsCardScale = (value: unknown) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 1;
  return Math.min(KDS_CARD_SCALE_MAX, Math.max(KDS_CARD_SCALE_MIN, numericValue));
};

const getStoredKdsCardScale = () => {
  if (typeof window === "undefined") return 1;
  return clampKdsCardScale(localStorage.getItem(KDS_CARD_SCALE_STORAGE_KEY));
};

const SALAO_PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_debito", label: "Cartão de débito" },
  { value: "cartao_credito", label: "Cartão de crédito" },
];
const SALAO_FIADO_PAYMENT_METHOD = { value: "fiado", label: "Fiado" };

const SALAO_STATUS_STYLES: Record<
  string,
  { label: string; badge: string; card: string }
> = {
  aberta: {
    label: "Aberta",
    badge: "border-emerald-300 bg-emerald-100 text-emerald-900",
    card: "border-emerald-200 bg-emerald-50",
  },
  aguardando_conta: {
    label: "Conta solicitada",
    badge: "border-blue-300 bg-blue-100 text-blue-900",
    card: "border-blue-300 bg-blue-50",
  },
  fechada: {
    label: "Conta fechada",
    badge: "border-violet-300 bg-violet-100 text-violet-900",
    card: "border-violet-300 bg-violet-50",
  },
  paga: {
    label: "Paga",
    badge: "border-emerald-300 bg-emerald-100 text-emerald-900",
    card: "border-emerald-200 bg-emerald-50",
  },
  cancelada: {
    label: "Cancelada",
    badge: "border-rose-300 bg-rose-100 text-rose-900",
    card: "border-rose-300 bg-rose-50",
  },
  rascunho: {
    label: "Rascunho",
    badge: "border-slate-300 bg-slate-100 text-slate-700",
    card: "border-slate-300 bg-slate-50",
  },
  enviado: {
    label: "Enviado",
    badge: "border-amber-300 bg-amber-100 text-amber-900",
    card: "border-amber-300 bg-amber-50",
  },
  recebido: {
    label: "Recebido",
    badge: "border-sky-300 bg-sky-100 text-sky-900",
    card: "border-sky-300 bg-sky-50",
  },
  preparando: {
    label: "Em preparo",
    badge: "border-orange-300 bg-orange-100 text-orange-900",
    card: "border-orange-300 bg-orange-50",
  },
  pronto: {
    label: "Pronto",
    badge: "border-emerald-300 bg-emerald-100 text-emerald-900",
    card: "border-emerald-300 bg-emerald-50",
  },
  entregue: {
    label: "Entregue",
    badge: "border-violet-300 bg-violet-100 text-violet-900",
    card: "border-violet-300 bg-violet-50",
  },
  cancelado: {
    label: "Cancelado",
    badge: "border-rose-300 bg-rose-100 text-rose-900",
    card: "border-rose-300 bg-rose-50",
  },
};

const getSalaoStatusStyle = (status: unknown) =>
  SALAO_STATUS_STYLES[String(status || "").toLowerCase()] || {
    label: String(status || "Sem status").replace(/_/g, " "),
    badge: "border-gray-300 bg-gray-100 text-gray-700",
    card: "border-gray-200 bg-white",
  };

const getMesaPendingAction = (mesa: any, comanda?: any) => {
  const activeComanda = mesa?.comanda_aberta || comanda;

  if (mesa?.solicitacao_abertura || mesa?.destaque === "abertura_pendente") {
    return {
      label: "Aprovar abertura",
      className: "border-amber-200 bg-white/70 text-amber-900",
      cardClass: "border-amber-300 bg-amber-100 ring-2 ring-amber-200",
    };
  }
  if (mesa?.status === "aguardando_garcom" || mesa?.destaque === "aguardando_garcom") {
    return {
      label: "GarÃ§om solicitado",
      className: "border-violet-200 bg-white/70 text-violet-900",
      cardClass: "border-violet-300 bg-violet-100 ring-2 ring-violet-200",
    };
  }
  if (
    activeComanda?.status === "aguardando_conta" ||
    mesa?.destaque === "aguardando_conta"
  ) {
    return {
      label: "Conta solicitada",
      className: "border-blue-200 bg-white/70 text-blue-900",
      cardClass: "border-blue-300 bg-blue-100 ring-2 ring-blue-200",
    };
  }
  if (
    activeComanda?.status === "fechada" ||
    mesa?.destaque === "aguardando_pagamento"
  ) {
    return {
      label: "Confirmar pagamento",
      className: "border-violet-200 bg-white/70 text-violet-900",
      cardClass: "border-violet-300 bg-violet-100 ring-2 ring-violet-200",
    };
  }
  if (
    Number(activeComanda?.novos_itens_cliente || 0) > 0 ||
    mesa?.destaque === "novo_pedido"
  ) {
    return {
      label: "Novo pedido no KDS",
      className: "border-emerald-200 bg-white/70 text-emerald-900",
      cardClass: "border-emerald-300 bg-emerald-100 ring-2 ring-emerald-200",
    };
  }
  return null;
};

const isMesaCustomerAttentionPending = (mesa: any) => {
  const activeComanda = mesa?.comanda_aberta;
  return (
    Boolean(mesa?.solicitacao_abertura || mesa?.destaque === "abertura_pendente") ||
    mesa?.status === "aguardando_garcom" ||
    mesa?.destaque === "aguardando_garcom" ||
    activeComanda?.status === "aguardando_conta" ||
    mesa?.destaque === "aguardando_conta" ||
    Number(activeComanda?.novos_itens_cliente || 0) > 0 ||
    mesa?.destaque === "novo_pedido"
  );
};

const resolveClientBaseUrl = () => {
  const productionClientUrl = "https://cliente.entregaiapp.com.br";
  const configured = import.meta.env.VITE_CLIENTE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const { hostname, origin } = window.location;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return origin;
  }

  return productionClientUrl;
};

const CLIENT_BASE_URL = resolveClientBaseUrl();
const TENANT_ROOT_DOMAIN = (import.meta.env.VITE_TENANT_ROOT_DOMAIN || "entregaiapp.com.br").replace(/^\*\./, "").replace(/\/$/, "");

const buildMesaQrPublicUrl = (loja: any, lojaId: string, qrToken: string) => {
  if (loja?.subdomain) {
    return `https://${loja.subdomain}.${TENANT_ROOT_DOMAIN}/mesa/${qrToken}`;
  }

  return `${CLIENT_BASE_URL}/mercado/${lojaId}/mesa/${qrToken}`;
};

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const unwrapList = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

type SalaoLoadResource =
  | "mesas"
  | "comandas"
  | "kds"
  | "selectedComanda"
  | "products";

const phoneSearchPattern = /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9?\d{4})[-.\s]?\d{4}/;
const onlyDigits = (value: string) => String(value || "").replace(/\D/g, "");

const sanitizeQuantityInput = (value: string) => {
  const numericValue = String(value || "").replace(/[^0-9,.]/g, "");
  const separatorIndex = numericValue.search(/[,.]/);

  if (separatorIndex < 0) return numericValue;

  return (
    numericValue.slice(0, separatorIndex + 1) +
    numericValue.slice(separatorIndex + 1).replace(/[,.]/g, "")
  );
};
const compactText = (value: string) => String(value || "").replace(/\s+/g, " ").trim();
const inferQuickContactFromQuery = (query: string) => {
  const value = compactText(query);
  if (!value) return { nome: "", telefone: "" };

  const phoneMatch = value.match(phoneSearchPattern);
  const phoneText = phoneMatch?.[0]?.trim() || "";
  const fallbackDigits = onlyDigits(value);
  const hasPhone = onlyDigits(phoneText || value).length >= 8;

  if (!hasPhone) return { nome: value, telefone: "" };

  const nome = phoneMatch ? compactText(value.replace(phoneMatch[0], " ")) : "";
  return {
    nome,
    telefone: phoneText || fallbackDigits || value,
  };
};

const arrayOrEmpty = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? value : [];

const sortMesasByNumber = (items: any[]) =>
  [...items].sort((first, second) =>
    String(first?.numero ?? "").localeCompare(
      String(second?.numero ?? ""),
      "pt-BR",
      {
        numeric: true,
        sensitivity: "base",
      },
    ),
  );

const normalizeMesaSearch = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const normalizeProductSearch = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/Ã§/g, "c")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const getProductCategoryText = (product: any) =>
  [
    product?.categoria_nome,
    product?.categoria_caminho,
    product?.categoria_loja_nome,
    product?.categoria_global_nome,
    product?.categoria?.nome,
  ]
    .filter(Boolean)
    .join(" ");

const includesEverySearchToken = (value: string, tokens: string[]) =>
  tokens.length > 0 && tokens.every((token) => value.includes(token));

const getProductSearchPriority = (product: any, query: string) => {
  if (!query) return 0;

  const tokens = query.split(" ").filter(Boolean);
  const name = normalizeProductSearch(productName(product));
  const brand = normalizeProductSearch(product?.marca || product?.produto?.marca);
  const category = normalizeProductSearch(getProductCategoryText(product));
  const description = normalizeProductSearch(product?.descricao || product?.produto?.descricao);

  if (name.startsWith(query)) return 0;
  if (name.includes(query) || includesEverySearchToken(name, tokens)) return 1;
  if (
    brand.includes(query) ||
    category.includes(query) ||
    includesEverySearchToken(brand, tokens) ||
    includesEverySearchToken(category, tokens)
  ) return 2;
  if (description.includes(query) || includesEverySearchToken(description, tokens)) return 3;
  return 4;
};

const sortProductsBySearchPriority = (items: any[], query: string) => {
  const normalizedQuery = normalizeProductSearch(query);
  if (!normalizedQuery) return items;

  return [...items].sort((first, second) => {
    const priority =
      getProductSearchPriority(first, normalizedQuery) -
      getProductSearchPriority(second, normalizedQuery);
    if (priority !== 0) return priority;

    return productName(first).localeCompare(productName(second), "pt-BR", {
      numeric: true,
      sensitivity: "base",
    });
  });
};

const formatMoney = (value: unknown) =>
  Number(value || 0)
    .toFixed(2)
    .replace(".", ",");

const salaoPrintItemName = (item: any) =>
  [item?.nome_produto || "Produto", item?.nome_variacao]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" - ");

const salaoPrintSelectionLine = (selection: any) => {
  const quantity = Number(selection?.quantidade || 1);
  const fraction = Number(selection?.fracao || 0);
  const suffix = [
    quantity > 1 ? `x${formatSalaoQuantity(quantity)}` : "",
    fraction > 0 ? `${Math.round(fraction * 100)}%` : "",
  ].filter(Boolean).join(", ");
  return `${selection?.nome_grupo || "Opção"}: ${selection?.nome_opcao || "Opção"}${suffix ? ` (${suffix})` : ""}`;
};

const toCents = (value: unknown) => Math.round(Number(value || 0) * 100);
const parseCurrencyInputCents = (value: string) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};
const formatCents = (value: number) =>
  (Math.max(0, value) / 100).toFixed(2).replace(".", ",");

type SalaoPaymentLine = {
  forma_pagamento: string;
  valor: string;
};

type SalaoConfiguredItemInput = {
  variationId: string;
  selections: Array<{
    group: any;
    option: any;
    quantity: number;
    fraction?: number | null;
    unitPrice: number;
    contribution: number;
  }>;
  quantity: number;
  notes: string;
};

const escapePrintHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getDailyTicketNumber = (value: any) => {
  const formatted = String(value?.numero_comanda_codigo || "").trim();
  if (formatted) return formatted;

  const numeric = Number(value?.numero_comanda_diario);
  return Number.isFinite(numeric) && numeric > 0
    ? String(numeric).padStart(5, "0")
    : "";
};

const salaoItemAuthorLabel = (item: any) => {
  if (item?.autor_label) return item.autor_label;
  if (item?.participante_id)
    return item?.adicionado_por || item?.autor_nome || "Cliente";
  if (item?.enviado_por === "garcom")
    return `Pedido adicionado pelo garçom - ${item?.adicionado_por || item?.autor_nome || "Garçom"}`;
  return `Pedido adicionado pelo atendimento - ${item?.adicionado_por || item?.autor_nome || "Atendimento"}`;
};

const salaoStaffGroupLabel = (item: any) =>
  salaoItemAuthorLabel(item).replace(
    /^Pedido adicionado/,
    "Pedidos adicionados",
  );

const productName = (product: any) =>
  product?.nome || product?.produto?.nome || "Produto";

const productPrice = (product: any) =>
  Number(product?.preco_promocional || product?.preco || 0);

export function SalaoPage() {
  const user = useMemo(getUser, []);
  const [tab, setTab] = useState<"mesas" | "comandas" | "kds">("mesas");
  const [mesas, setMesas] = useState<any[]>([]);
  const [mesaOpenTimes, setMesaOpenTimes] = useState<MesaOpenTimes>({});
  const [openTimeNow, setOpenTimeNow] = useState(() => Date.now());
  const [comandas, setComandas] = useState<any[]>([]);
  const [kds, setKds] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [currentStore, setCurrentStore] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingTable, setCreatingTable] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [appliedTableSearch, setAppliedTableSearch] = useState("");
  const [tableCardScale, setTableCardScale] = useState(getStoredTableCardScale);
  const [kdsCardScale, setKdsCardScale] = useState(getStoredKdsCardScale);
  const [tableScaleControlOpen, setTableScaleControlOpen] = useState(false);
  const [salaoFullscreen, setSalaoFullscreen] = useState(false);
  const kdsFullscreen = salaoFullscreen && tab === "kds";
  const [selectedKdsId, setSelectedKdsId] = useState("");
  const [selectedComanda, setSelectedComanda] = useState<any | null>(null);
  const [comandaModule, setComandaModule] = useState<"mesa" | "pedidos">(
    "mesa",
  );
  const [productSearch, setProductSearch] = useState("");
  const [productSearchResults, setProductSearchResults] = useState<any[] | null>(
    null,
  );
  const [productSearchTotal, setProductSearchTotal] = useState(0);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [configuringProduct, setConfiguringProduct] = useState<{
    product: any;
    configuration: any;
  } | null>(null);
  const [editingConfiguredItem, setEditingConfiguredItem] = useState<{
    item: any;
    product: any;
    configuration: any;
  } | null>(null);
  const [editingSimpleItem, setEditingSimpleItem] = useState<{
    item: any;
    quantity: string;
    notes: string;
  } | null>(null);
  const [configurationLoading, setConfigurationLoading] = useState(false);
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemNotes, setItemNotes] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [latestPin, setLatestPin] = useState("");
  const [realtimeMesaId, setRealtimeMesaId] = useState("");
  const [qrDownloadMesa, setQrDownloadMesa] = useState<any | null>(null);
  const [deleteMesaTarget, setDeleteMesaTarget] = useState<any | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<any | null>(null);
  const [closeMesaTarget, setCloseMesaTarget] = useState<any | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");
  const [paymentLines, setPaymentLines] = useState<SalaoPaymentLine[]>([]);
  const [fiadoEnabled, setFiadoEnabled] = useState(false);
  const [fiadoContactQuery, setFiadoContactQuery] = useState("");
  const [fiadoContacts, setFiadoContacts] = useState<any[]>([]);
  const [fiadoContactLoading, setFiadoContactLoading] = useState(false);
  const [fiadoSelectedContact, setFiadoSelectedContact] = useState<any | null>(null);
  const [fiadoQuickContact, setFiadoQuickContact] = useState({ nome: "", telefone: "" });
  const [printComandaTarget, setPrintComandaTarget] = useState<any | null>(null);
  const [salaoPrintBusy, setSalaoPrintBusy] = useState(false);
  const [kitchenPrintSelection, setKitchenPrintSelection] = useState<{
    comanda: any;
    storageKey: string;
    selectionItems: KitchenPrintSelectionItem[];
  } | null>(null);
  const selectedComandaIdRef = useRef("");
  const hasLoadedRef = useRef(false);
  const productsLoadedRef = useRef(false);
  const productsForceRefreshRef = useRef(false);
  const singleFlightRef = useRef(createSingleFlightRunner<SalaoLoadResource>());
  const fullLoadRef = useRef<{
    running: boolean;
    promise: Promise<void> | null;
    pending: {
      silent: boolean;
      includeProducts: boolean;
      manual: boolean;
    } | null;
  }>({ running: false, promise: null, pending: null });
  const comandaDetailRef = useRef<HTMLDivElement | null>(null);
  const salaoPageRef = useRef<HTMLDivElement | null>(null);
  const kdsCardRefs = useRef(new Map<string, HTMLDivElement>());
  const pendingPShortcutTimeoutRef = useRef<number | null>(null);
  const { enabled: salaoSoundEnabled, setEnabled: setSalaoSoundEnabled } =
    useAlertSoundPreference(user?.loja_id, "salao");
  const hasPendingCustomerAttention = useMemo(
    () => mesas.some(isMesaCustomerAttentionPending),
    [mesas],
  );
  const salaoSound = usePersistentAttentionSound(
    `salao:${user?.loja_id || "sem-loja"}`,
    salaoSoundEnabled,
    hasPendingCustomerAttention,
  );
  const availablePaymentMethods = useMemo(
    () => fiadoEnabled ? [...SALAO_PAYMENT_METHODS, SALAO_FIADO_PAYMENT_METHOD] : SALAO_PAYMENT_METHODS,
    [fiadoEnabled],
  );
  const inferredFiadoQuickContact = useMemo(
    () => inferQuickContactFromQuery(fiadoContactQuery),
    [fiadoContactQuery],
  );

  const loadCurrentStore = useCallback(async () => {
    if (!user?.loja_id) return null;
    if (currentStore?.id === user.loja_id) return currentStore;

    const [storeResult, configResult] = await Promise.allSettled([
      api.get(`/lojas/${user.loja_id}`),
      api.get(`/lojas/${user.loja_id}/configuracoes`),
    ]);
    const store =
      storeResult.status === "fulfilled"
        ? storeResult.value.data?.data || storeResult.value.data || {}
        : {};
    const config =
      configResult.status === "fulfilled"
        ? configResult.value.data?.data || configResult.value.data || {}
        : {};
    const nextStore = {
      ...store,
      slogan: config.slogan,
      whatsapp_suporte: config.whatsapp_suporte,
      impressao_pedido_modo:
        config.impressao_pedido_modo || "agent_com_fallback",
    };
    setCurrentStore(nextStore);
    return nextStore;
  }, [currentStore, user?.loja_id]);

  useEffect(() => {
    selectedComandaIdRef.current = selectedComanda?.id || "";
  }, [selectedComanda?.id]);

  useEffect(() => {
    if (Object.keys(mesaOpenTimes).length === 0) return;

    setOpenTimeNow(Date.now());
    const intervalId = window.setInterval(() => setOpenTimeNow(Date.now()), 30_000);
    return () => window.clearInterval(intervalId);
  }, [mesaOpenTimes]);

  useEffect(() => {
    void loadCurrentStore().catch(() => undefined);
  }, [loadCurrentStore]);

  useEffect(() => {
    if (!user?.loja_id) return;
    api.get(`/salao/lojas/${user.loja_id}/modulos`)
      .then((response) => {
        const modules = unwrapList(response);
        setFiadoEnabled(modules.some((module: any) => module.slug === "fiado" && module.enabled === true));
      })
      .catch(() => setFiadoEnabled(false));
  }, [user?.loja_id]);

  useEffect(() => {
    if (fiadoSelectedContact?.id) {
      setFiadoContacts([]);
      setFiadoContactLoading(false);
      return;
    }
    const search = fiadoContactQuery.trim();
    if (!search) {
      setFiadoContacts([]);
      setFiadoContactLoading(false);
      return;
    }

    setFiadoContactLoading(true);
    const timeoutId = window.setTimeout(() => {
      api.get("/pedidos/admin-delivery/contacts", { params: { busca: search } })
        .then((response) => setFiadoContacts(unwrapList(response)))
        .catch(() => setFiadoContacts([]))
        .finally(() => setFiadoContactLoading(false));
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [fiadoContactQuery, fiadoSelectedContact?.id]);

  useEffect(() => {
    localStorage.setItem(TABLE_CARD_SCALE_STORAGE_KEY, String(tableCardScale));
  }, [tableCardScale]);

  useEffect(() => {
    localStorage.setItem(KDS_CARD_SCALE_STORAGE_KEY, String(kdsCardScale));
  }, [kdsCardScale]);

  useEffect(() => {
    setSelectedKdsId((current) => {
      if (current && kds.some((item) => item.id === current)) return current;
      return kds[0]?.id || "";
    });
  }, [kds]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setSalaoFullscreen(document.fullscreenElement === salaoPageRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(
    () => () => {
      if (pendingPShortcutTimeoutRef.current) {
        window.clearTimeout(pendingPShortcutTimeoutRef.current);
        pendingPShortcutTimeoutRef.current = null;
      }
    },
    [],
  );

  const runSingleFlight = useCallback(
    (resource: SalaoLoadResource, task: () => Promise<void>) =>
      singleFlightRef.current.run(resource, task),
    [],
  );

  const loadMesas = useCallback(async () => {
    if (!user?.loja_id) return;
    return runSingleFlight("mesas", async () => {
      const payload = await salaoService.listMesas({
        loja_id: user.loja_id,
        per_page: 100,
      });
      const list = readSalaoListPayload(payload);
      if (!list) return;
      const nextMesas = sortMesasByNumber(list);
      setMesaOpenTimes(
        reconcileMesaOpenTimes(String(user.loja_id), nextMesas),
      );
      setMesas(nextMesas);
    });
  }, [runSingleFlight, user?.loja_id]);

  const loadComandas = useCallback(async () => {
    if (!user?.loja_id) return;
    return runSingleFlight("comandas", async () => {
      const payload = await salaoService.listComandas({
        loja_id: user.loja_id,
        per_page: 100,
      });
      const list = readSalaoListPayload(payload);
      if (!list) return;
      setComandas(
        list.filter(
          (item: any) => !["paga", "cancelada"].includes(item.status),
        ),
      );
    });
  }, [runSingleFlight, user?.loja_id]);

  const loadKds = useCallback(async () => {
    if (!user?.loja_id) return;
    return runSingleFlight("kds", async () => {
      const payload = await salaoService.listKds({ loja_id: user.loja_id });
      const list = readSalaoListPayload(payload);
      if (list) setKds(list);
    });
  }, [runSingleFlight, user?.loja_id]);

  const loadSelectedComanda = useCallback(async () => {
    return runSingleFlight("selectedComanda", async () => {
      const selectedComandaId = selectedComandaIdRef.current;
      if (!selectedComandaId) return;
      const payload = await salaoService
        .getComanda(selectedComandaId)
        .catch(() => null);
      if (
        payload &&
        selectedComandaIdRef.current === selectedComandaId
      ) {
        setSelectedComanda(payload);
      }
    });
  }, [runSingleFlight]);

  const loadProducts = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh) productsForceRefreshRef.current = true;
      if (productsLoadedRef.current && !productsForceRefreshRef.current) return;
      return runSingleFlight("products", async () => {
        const shouldForceRefresh = productsForceRefreshRef.current;
        productsForceRefreshRef.current = false;
        if (productsLoadedRef.current && !shouldForceRefresh) return;
        const payload = await productsService.getStoreProductsPage(
          { page: 1, perPage: 100, activeOnly: true },
          { forceRefresh: true },
        );
        if (!payload) return;
        setProducts(payload.products || []);
        productsLoadedRef.current = true;
      });
    },
    [runSingleFlight],
  );

  const loadAll = useCallback(
    async (
      options: {
        silent?: boolean;
        includeProducts?: boolean;
        manual?: boolean;
      } = {},
    ) => {
      if (!user?.loja_id) return;
      const control = fullLoadRef.current;
      const request = {
        silent: options.silent === true,
        includeProducts: options.includeProducts === true,
        manual: options.manual === true,
      };
      control.pending = control.pending
        ? {
            silent: control.pending.silent && request.silent,
            includeProducts:
              control.pending.includeProducts || request.includeProducts,
            manual: control.pending.manual || request.manual,
          }
        : request;

      if (control.running) return control.promise || Promise.resolve();

      const execute = async () => {
        control.running = true;
        try {
          while (control.pending) {
            const current = control.pending;
            control.pending = null;
            const shouldShowLoading =
              !current.silent && !hasLoadedRef.current;
            if (shouldShowLoading) setLoading(true);
            if (current.manual) setRefreshing(true);
            try {
              await Promise.all([
                loadMesas(),
                loadComandas(),
                loadKds(),
                loadSelectedComanda(),
                current.includeProducts || !productsLoadedRef.current
                  ? loadProducts(current.includeProducts)
                  : Promise.resolve(),
              ]);
              hasLoadedRef.current = true;
            } catch (error: any) {
              if (!current.silent) {
                showSystemNotice(
                  error?.response?.data?.message ||
                    error?.message ||
                    "Não foi possível carregar o salão.",
                );
              }
            } finally {
              setLoading(false);
              setRefreshing(false);
            }
          }
        } finally {
          control.running = false;
          control.promise = null;
        }
      };

      control.promise = execute();
      return control.promise;
    },
    [
      loadComandas,
      loadKds,
      loadMesas,
      loadProducts,
      loadSelectedComanda,
      user?.loja_id,
    ],
  );

  useEffect(() => {
    void loadAll({ includeProducts: true });
  }, [loadAll]);

  useEffect(() => {
    if (!user?.loja_id) return;

    const search = productSearch.trim();
    if (!search) {
      setProductSearchResults(null);
      setProductSearchTotal(0);
      setSearchingProducts(false);
      return;
    }

    let cancelled = false;
    setSearchingProducts(true);
    const timeoutId = window.setTimeout(() => {
      productsService
        .getStoreProductsPage({
          search,
          page: 1,
          perPage: 100,
          activeOnly: true,
        })
        .then((result) => {
          if (cancelled) return;
          setProductSearchResults(result.products || []);
          setProductSearchTotal(result.total || 0);
        })
        .catch((error) => {
          if (cancelled) return;
          setProductSearchResults([]);
          setProductSearchTotal(0);
          showSystemNotice(
            error?.response?.data?.message ||
              error?.message ||
              "Não foi possível buscar produtos.",
          );
        })
        .finally(() => {
          if (!cancelled) setSearchingProducts(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [productSearch, user?.loja_id]);

  useEffect(() => {
    const lojaId = user?.loja_id;
    const accessToken = localStorage.getItem("token") || "";
    const realtime = lojaId ? createSalaoAdminRealtime(accessToken) : null;
    if (!realtime || !lojaId) return;

    const refreshScheduler = createSalaoRealtimeRefreshScheduler({
      loaders: {
        loadMesas,
        loadComandas,
        loadKds,
        loadSelectedComanda,
        loadAll: () => loadAll({ silent: true }),
      },
      getSelectedComandaId: () => selectedComandaIdRef.current,
    });

    const channel = realtime
      .channel(salaoTenantTopic(lojaId), { config: { private: true } })
      .on("broadcast", { event: "salao:update" }, ({ payload }: any) => {
        if (payload?.mesaId) {
          setRealtimeMesaId(payload.mesaId);
          window.setTimeout(
            () =>
              setRealtimeMesaId((current) =>
                current === payload.mesaId ? "" : current,
              ),
            6000,
          );
        }
        refreshScheduler.schedule(payload);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void loadAll({ silent: true });
      });

    const reconcile = () => void loadAll({ silent: true });
    const reconcileVisibility = () => {
      if (shouldReconcileSalaoVisibility(document.visibilityState)) reconcile();
    };
    window.addEventListener("focus", reconcile);
    window.addEventListener("online", reconcile);
    document.addEventListener("visibilitychange", reconcileVisibility);

    return () => {
      window.removeEventListener("focus", reconcile);
      window.removeEventListener("online", reconcile);
      document.removeEventListener("visibilitychange", reconcileVisibility);
      refreshScheduler.dispose();
      void realtime.removeChannel(channel);
    };
  }, [
    loadAll,
    loadComandas,
    loadKds,
    loadMesas,
    loadSelectedComanda,
    user?.loja_id,
  ]);

  const createMesa = async () => {
    if (!newTableNumber.trim()) return;
    setCreatingTable(true);
    try {
      await salaoService.createMesa({
        loja_id: user.loja_id,
        numero: newTableNumber.trim(),
        capacidade: 4,
      });
      setNewTableNumber("");
      setAppliedTableSearch("");
      await loadAll();
    } catch (error: any) {
      showSystemNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Não foi possível criar a mesa.",
      );
    } finally {
      setCreatingTable(false);
    }
  };

  const openComanda = async (mesa: any) => {
    setActionBusy(`open-${mesa.id}`);
    try {
      const result = await salaoService.openComanda({
        loja_id: user.loja_id,
        mesa_id: mesa.id,
        quantidade_pessoas: 1,
      });
      if (result?.id) {
        setMesaOpenTimes(
          registerMesaOpenTime(
            String(user.loja_id),
            String(mesa.id),
            String(result.id),
          ),
        );
      }
      setSelectedComanda(result);
      setComandaModule("pedidos");
      if (result?.pin) {
        setLatestPin(result.pin);
        showSystemNotice(`Comanda aberta. PIN da mesa: ${result.pin}`);
      }
      setTab("comandas");
      await loadAll();
    } catch (error: any) {
      showSystemNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Não foi possível abrir a comanda.",
      );
    } finally {
      setActionBusy("");
    }
  };

  const selectComanda = async (comanda: any) => {
    // A list/table response is a summary and does not carry the participant list.
    // Clear it before fetching the detail to avoid rendering summary-only fields as details.
    setSelectedComanda(null);
    setLatestPin("");
    try {
      const detail = await salaoService.getComanda(comanda.id);
      setSelectedComanda(detail);
      setComandaModule("pedidos");
      requestAnimationFrame(() =>
        comandaDetailRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      );
    } catch (error: any) {
      showSystemNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Não foi possível carregar a comanda.",
      );
    }
  };

  const openMesa = async (mesa: any) => {
    if (!mesa.comanda_aberta) return;

    if (mesa.status === "aguardando_garcom") {
      setActionBusy(`waiter-${mesa.id}`);
      try {
        const updatedMesa = await salaoService.acknowledgeWaiterCallForMesa(
          mesa.id,
        );
        setMesas((currentMesas) =>
          currentMesas.map((currentMesa) =>
            currentMesa.id === mesa.id
              ? { ...currentMesa, ...updatedMesa }
              : currentMesa,
          ),
        );
      } catch (error: any) {
        showSystemNotice(
          error?.response?.data?.message ||
            error?.message ||
            "Não foi possível confirmar o atendimento do garçom.",
        );
        return;
      } finally {
        setActionBusy("");
      }
    }

    const newCustomerItems = Number(mesa.comanda_aberta?.novos_itens_cliente || 0);
    if (newCustomerItems > 0) {
      setActionBusy(`attention-${mesa.id}`);
      try {
        const result = await salaoService.acknowledgeNewCustomerOrdersForMesa(
          mesa.id,
        );
        const attendedCount = Number(result?.itens_atendidos || 0);
        setMesas((currentMesas) =>
          currentMesas.map((currentMesa) => {
            if (currentMesa.id !== mesa.id) return currentMesa;
            const currentComanda = currentMesa.comanda_aberta || {};
            const remainingCustomerItems = Math.max(
              0,
              Number(currentComanda.novos_itens_cliente || 0) - attendedCount,
            );
            const remainingNewItems = Math.max(
              0,
              Number(currentComanda.novos_itens || 0) - attendedCount,
            );
            return {
              ...currentMesa,
              destaque:
                currentMesa.destaque === "novo_pedido" && remainingCustomerItems === 0
                  ? null
                  : currentMesa.destaque,
              comanda_aberta: {
                ...currentComanda,
                novos_itens: remainingNewItems,
                novos_itens_cliente: remainingCustomerItems,
              },
            };
          }),
        );
      } catch (error: any) {
        showSystemNotice(
          error?.response?.data?.message ||
            error?.message ||
            "NÃ£o foi possÃ­vel confirmar a atenÃ§Ã£o aos novos pedidos da mesa.",
        );
      } finally {
        setActionBusy("");
      }
    }

    setTab("comandas");
    await selectComanda(mesa.comanda_aberta);
    void loadAll({ silent: true });
  };

  const downloadQrCode = async (mesa: any, generateNew = false) => {
    setActionBusy(`qr-${mesa.id}`);
    try {
      const result = generateNew
        ? await salaoService.rotateMesaQr(mesa.id)
        : await salaoService.getMesaQr(mesa.id);
      const loja = await loadCurrentStore();
      const url = buildMesaQrPublicUrl(loja, mesa.loja_id, result.qr_token);
      const dataUrl = await generateMesaQrImage({
        mesa,
        loja,
        qrValue: url,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = mesaQrArtworkFileName(mesa, loja);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showSystemNotice(
        generateNew
          ? "Nova arte de mesa criada e baixada. O QR anterior foi substituído."
          : "Arte de mesa do QR Code atual baixada.",
      );
    } catch (error: any) {
      showSystemNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Não foi possível baixar o QR Code.",
      );
    } finally {
      setActionBusy("");
      setQrDownloadMesa(null);
    }
  };

  const printQrCode = async (mesa: any) => {
    // Open synchronously from the click. Using `noopener` here makes some
    // browsers return null even though the popup was accepted.
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showSystemNotice("Permita a abertura de janela para imprimir o QR Code.");
      return;
    }
    setActionBusy(`print-qr-${mesa.id}`);
    try {
      const result = await salaoService.getMesaQr(mesa.id);
      const loja = await loadCurrentStore();
      const url = buildMesaQrPublicUrl(loja, mesa.loja_id, result.qr_token);
      const dataUrl = await generateMesaQrImage({
        mesa,
        loja,
        qrValue: url,
      });
      writeMesaQrPrintDocument(printWindow, dataUrl, mesa);
    } catch (error: any) {
      printWindow.close();
      showSystemNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Não foi possível imprimir o QR Code.",
      );
    } finally {
      setActionBusy("");
    }
  };

  const deleteMesa = async (mesa: any) => {
    setActionBusy(`delete-${mesa.id}`);
    try {
      await salaoService.deleteMesa(mesa.id);
      if (
        selectedComanda?.mesa_id === mesa.id ||
        selectedComanda?.mesa?.id === mesa.id
      ) {
        setSelectedComanda(null);
      }
      setDeleteMesaTarget(null);
      showSystemNotice(
        `Mesa ${mesa.numero} excluída. O QR Code anterior foi invalidado.`,
      );
      await loadAll({ manual: true });
    } catch (error: any) {
      showSystemNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Não foi possível excluir a mesa.",
      );
    } finally {
      setActionBusy("");
    }
  };

  const addProductToComanda = async () => {
    if (!selectedComanda?.id || !selectedProductId) return;
    if (!["aberta", "aguardando_conta"].includes(selectedComanda.status)) {
      showSystemNotice("Comanda não pode receber novos produtos neste status.");
      return;
    }
    const quantity = Number(itemQuantity.replace(",", "."));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      showSystemNotice("Informe uma quantidade válida.");
      return;
    }
    setAddingItem(true);
    try {
      const updated = await salaoService.addItem(selectedComanda.id, {
        produto_loja_id: selectedProductId,
        quantidade: quantity,
        observacoes: itemNotes.trim() || undefined,
      });
      setSelectedComanda(updated);
      setComandaModule("pedidos");
      setSelectedProductId("");
      setItemQuantity("1");
      setItemNotes("");
      await loadAll();
    } catch (error: any) {
      showSystemNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Não foi possível adicionar o produto.",
      );
    } finally {
      setAddingItem(false);
    }
  };

  const selectProductForComanda = async (product: any) => {
    if (selectedProductId === product.id) {
      setSelectedProductId("");
      setItemQuantity("1");
      setItemNotes("");
      return;
    }

    if (product.modo_compra !== "configuravel") {
      setSelectedProductId(product.id);
      setItemQuantity("1");
      setItemNotes("");
      return;
    }

    setSelectedProductId("");
    setConfiguringProduct(null);
    setConfigurationLoading(true);
    try {
      const configuration = await productsService.getProductConfiguration(
        product.id,
      );
      setConfiguringProduct({ product, configuration });
    } catch (error: any) {
      showSystemNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Não foi possível carregar as opções do produto.",
      );
    } finally {
      setConfigurationLoading(false);
    }
  };

  const buildSalaoSelectionPayload = (item: SalaoConfiguredItemInput) =>
    item.selections.map(
      ({ group, option, quantity: optionQuantity, fraction, unitPrice, contribution }) => ({
        grupo_id: group.id,
        opcao_id: option.id,
        quantidade: optionQuantity,
        nome_grupo: group.nome,
        nome_opcao: option.nome,
        fracao: fraction || undefined,
        preco_unitario: unitPrice,
        preco_contribuicao: contribution,
      }),
    );

  const addConfiguredProductToComanda = async (item: SalaoConfiguredItemInput) => {
    if (!selectedComanda?.id || !configuringProduct) return;
    if (!["aberta", "aguardando_conta"].includes(selectedComanda.status)) {
      setConfiguringProduct(null);
      showSystemNotice("Comanda não pode receber novos produtos neste status.");
      return;
    }
    setAddingItem(true);
    try {
      const updated = await salaoService.addItem(selectedComanda.id, {
        produto_loja_id: configuringProduct.product.id,
        variacao_produto_loja_id: item.variationId || undefined,
        quantidade: item.quantity,
        observacoes: item.notes.trim() || undefined,
        configuracao_versao: configuringProduct.configuration?.versao,
        selecoes: buildSalaoSelectionPayload(item),
      });
      setSelectedComanda(updated);
      setConfiguringProduct(null);
      setComandaModule("pedidos");
      await loadAll();
    } catch (error: any) {
      showSystemNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Não foi possível adicionar o produto.",
      );
    } finally {
      setAddingItem(false);
    }
  };

  const clearKitchenPrintFlagForSalaoItem = (itemId: unknown) => {
    if (!selectedComanda?.id || !itemId) return;
    const storageKey = getKitchenPrintStorageKey("salao", selectedComanda.id);
    const printedKeys = readKitchenPrintedKeys(storageKey);
    if (!printedKeys.delete(String(itemId))) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify([...printedKeys]));
    } catch {
      // A edição continua válida mesmo se o histórico local de impressão estiver bloqueado.
    }
  };

  const openEditComandaItem = async (item: any) => {
    if (!selectedComanda?.id || item.status === "cancelado") return;
    if (!["aberta", "aguardando_conta"].includes(selectedComanda.status)) {
      showSystemNotice("Apenas comandas abertas ou aguardando conta permitem editar produtos.");
      return;
    }

    const hasConfiguration = Boolean(
      item.produto_loja_id &&
      (item.variacao_produto_loja_id || arrayOrEmpty<any>(item.selecoes).length > 0),
    );

    if (!hasConfiguration) {
      setEditingSimpleItem({
        item,
        quantity: formatSalaoQuantityInput(item.quantidade || 1),
        notes: String(item.observacoes || ""),
      });
      return;
    }

    setActionBusy(`load-edit-item-${item.id}`);
    try {
      const configuration = await productsService.getProductConfiguration(item.produto_loja_id);
      const product =
        products.find((candidate) => candidate.id === item.produto_loja_id) ||
        productSearchResults?.find((candidate) => candidate.id === item.produto_loja_id) ||
        {
          id: item.produto_loja_id,
          nome: item.nome_produto,
          preco: item.preco_base,
          preco_promocional: item.preco_base,
        };
      setEditingConfiguredItem({ item, product, configuration });
    } catch (error: any) {
      showSystemNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Não foi possível carregar as opções para editar este produto.",
      );
    } finally {
      setActionBusy("");
    }
  };

  const saveSimpleComandaItemEdit = async () => {
    if (!selectedComanda?.id || !editingSimpleItem) return;
    const quantity = Number(editingSimpleItem.quantity.replace(",", "."));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      showSystemNotice("Informe uma quantidade válida.");
      return;
    }

    setActionBusy(`edit-item-${editingSimpleItem.item.id}`);
    try {
      const updated = await salaoService.updateItem(
        selectedComanda.id,
        editingSimpleItem.item.id,
        {
          quantidade: quantity,
          observacoes: editingSimpleItem.notes.trim() || null,
        },
      );
      setSelectedComanda(updated);
      clearKitchenPrintFlagForSalaoItem(editingSimpleItem.item.id);
      setEditingSimpleItem(null);
      await loadAll();
    } catch (error: any) {
      showSystemNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Não foi possível editar o produto da mesa.",
      );
    } finally {
      setActionBusy("");
    }
  };

  const saveConfiguredComandaItemEdit = async (item: SalaoConfiguredItemInput) => {
    if (!selectedComanda?.id || !editingConfiguredItem) return;
    setActionBusy(`edit-item-${editingConfiguredItem.item.id}`);
    try {
      const updated = await salaoService.updateItem(
        selectedComanda.id,
        editingConfiguredItem.item.id,
        {
          produto_loja_id: editingConfiguredItem.product.id,
          variacao_produto_loja_id: item.variationId || undefined,
          quantidade: item.quantity,
          observacoes: item.notes.trim() || null,
          configuracao_versao: editingConfiguredItem.configuration?.versao,
          selecoes: buildSalaoSelectionPayload(item),
        },
      );
      setSelectedComanda(updated);
      clearKitchenPrintFlagForSalaoItem(editingConfiguredItem.item.id);
      setEditingConfiguredItem(null);
      setComandaModule("pedidos");
      await loadAll();
    } catch (error: any) {
      showSystemNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Não foi possível editar o produto da mesa.",
      );
    } finally {
      setActionBusy("");
    }
  };

  const closeAccount = async (comanda: any, mesaIdOverride?: string) => {
    setActionBusy(`close-${comanda.id}`);
    try {
      const result = await salaoService.closeAccount(comanda.id, {
        tipo: "compartilhada",
        percentual_taxa_servico: 0,
      });
      showSystemNotice(
        result?.contas?.length
          ? "Mesa fechada. Novos pedidos foram bloqueados e o PIN anterior foi invalidado."
          : "Mesa fechada e liberada. O PIN anterior foi invalidado.",
      );
      const mesaId = mesaIdOverride || comanda?.mesa_id || comanda?.mesa?.id;
      if (mesaId) {
        setMesaOpenTimes(
          removeMesaOpenTime(String(user.loja_id), String(mesaId)),
        );
      }
      if (result?.mesa_liberada) {
        setSelectedComanda(null);
      } else {
        const detail = await salaoService.getComanda(comanda.id);
        setSelectedComanda(detail);
      }
      setCloseMesaTarget(null);
      await loadAll({ manual: true });
    } catch (error: any) {
      showSystemNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Não foi possível fechar a mesa.",
      );
    } finally {
      setActionBusy("");
    }
  };

  const closeMesa = async (mesa: any) => {
    const comanda = mesa?.comanda_aberta || mesa;
    if (!comanda?.id) {
      setCloseMesaTarget(null);
      showSystemNotice("Esta mesa não possui comanda aberta para fechar.");
      return;
    }
    await closeAccount(comanda, String(mesa.id));
  };

  const removeItemFromComanda = async (item: any) => {
    if (!selectedComanda?.id || item.status === "cancelado") return;
    if (!["aberta", "aguardando_conta"].includes(selectedComanda.status)) {
      showSystemNotice("Apenas comandas abertas ou aguardando conta permitem remover produtos.");
      return;
    }
    setActionBusy(`remove-item-${item.id}`);
    try {
      await salaoService.removeItem(selectedComanda.id, item.id);
      const detail = await salaoService.getComanda(selectedComanda.id);
      setSelectedComanda(detail);
      setDeleteItemTarget(null);
      await loadAll();
    } catch (error: any) {
      showSystemNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Não foi possível remover o produto da mesa.",
      );
    } finally {
      setActionBusy("");
    }
  };

  const regeneratePin = async (comanda: any) => {
    setActionBusy(`pin-${comanda.id}`);
    try {
      const result = await salaoService.regeneratePin(comanda.id);
      setLatestPin(result.pin);
      showSystemNotice(`Novo PIN da mesa: ${result.pin}`);
    } catch (error: any) {
      showSystemNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Não foi possível gerar novo PIN.",
      );
    } finally {
      setActionBusy("");
    }
  };

  const resetFiadoPaymentContact = () => {
    setFiadoContactQuery("");
    setFiadoContacts([]);
    setFiadoContactLoading(false);
    setFiadoSelectedContact(null);
    setFiadoQuickContact({ nome: "", telefone: "" });
  };

  const chooseFiadoContact = (contact: any) => {
    setFiadoSelectedContact(contact);
    setFiadoQuickContact({
      nome: compactText(contact?.nome || ""),
      telefone: compactText(contact?.telefone || ""),
    });
    setFiadoContactQuery(compactText(`${contact?.nome || ""} ${contact?.telefone || ""}`));
    setFiadoContacts([]);
  };

  const useFiadoQuickContactFromSearch = () => {
    setFiadoSelectedContact(null);
    setFiadoQuickContact((current) => ({
      nome: current.nome || inferredFiadoQuickContact.nome,
      telefone: current.telefone || inferredFiadoQuickContact.telefone,
    }));
  };

  const confirmPayment = async (comanda: any) => {
    const totalCents = toCents(comanda?.total || 0);
    const paymentsByMethod = new Map<string, number>();
    paymentLines.forEach((line) => {
      const valueCents = parseCurrencyInputCents(line.valor);
      if (!line.forma_pagamento || valueCents <= 0) return;
      paymentsByMethod.set(line.forma_pagamento, (paymentsByMethod.get(line.forma_pagamento) || 0) + valueCents);
    });
    const pagamentos = Array.from(paymentsByMethod.entries()).map(([forma_pagamento, valueCents]) => ({
      forma_pagamento,
      valor: Number((valueCents / 100).toFixed(2)),
    }));
    const hasFiadoPayment = pagamentos.some((item) => item.forma_pagamento === "fiado");
    if (hasFiadoPayment && pagamentos.length > 1) {
      showSystemNotice("Fiado deve ser a única forma de pagamento da mesa.");
      return;
    }

    let payload: Record<string, unknown> = pagamentos.length > 1
      ? { pagamentos }
      : { forma_pagamento: pagamentos[0]?.forma_pagamento || paymentMethod };

    if (hasFiadoPayment || payload.forma_pagamento === "fiado") {
      const quickName = compactText(fiadoQuickContact.nome || inferredFiadoQuickContact.nome);
      const quickPhone = compactText(fiadoQuickContact.telefone || inferredFiadoQuickContact.telefone);
      const hasExistingContact = Boolean(fiadoSelectedContact?.id);
      if (!hasExistingContact && (!quickName || onlyDigits(quickPhone).length < 8)) {
        showSystemNotice("Informe uma pessoa existente ou crie um contato rápido com nome e telefone para lançar no fiado.");
        return;
      }
      payload = {
        forma_pagamento: "fiado",
        ...(hasExistingContact
          ? { contato_rapido_delivery_id: fiadoSelectedContact.id }
          : { contato: { nome: quickName, telefone: quickPhone } }),
      };
    }

    if (pagamentos.length > 1 && pagamentos.reduce((sum, item) => sum + toCents(item.valor), 0) !== totalCents) {
      showSystemNotice("A soma dos pagamentos deve ser igual ao total da mesa.");
      return;
    }

    setActionBusy(`payment-${comanda.id}`);
    try {
      await salaoService.confirmPayment(comanda.id, payload);
      setPaymentTarget(null);
      setPaymentLines([]);
      resetFiadoPaymentContact();
      setSelectedComanda(null);
      await loadAll();
    } catch (error: any) {
      showSystemNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Não foi possível confirmar o pagamento.",
      );
    } finally {
      setActionBusy("");
    }
  };

  const unblockParticipant = async (participant: any) => {
    setActionBusy(`unblock-${participant.id}`);
    try {
      await salaoService.unblockParticipant(participant.id);
      if (selectedComanda?.id)
        setSelectedComanda(await salaoService.getComanda(selectedComanda.id));
    } catch (error: any) {
      showSystemNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Não foi possível desbloquear o participante.",
      );
    } finally {
      setActionBusy("");
    }
  };

  const updateKds = async (item: any, status: string) => {
    setActionBusy(`kds-${item.id}-${status}`);
    try {
      await salaoService.updateItemStatus(item.id, status);
      await Promise.all([loadKds(), loadSelectedComanda()]);
    } catch (error: any) {
      showSystemNotice(
        error?.response?.data?.message ||
          error?.message ||
          "Não foi possível atualizar o item.",
      );
    } finally {
      setActionBusy("");
    }
  };

  const setKdsCardRef = (id: string, element: HTMLDivElement | null) => {
    if (element) {
      kdsCardRefs.current.set(id, element);
      return;
    }

    kdsCardRefs.current.delete(id);
  };

  const navigateKdsSelection = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      if (!kds.length) return;

      const currentIndex = Math.max(
        0,
        kds.findIndex((item) => item.id === selectedKdsId),
      );

      if (direction === "left" || direction === "right") {
        const nextIndex =
          direction === "left"
            ? Math.max(0, currentIndex - 1)
            : Math.min(kds.length - 1, currentIndex + 1);
        setSelectedKdsId(kds[nextIndex]?.id || "");
        return;
      }

      const currentItem = kds[currentIndex];
      const currentElement = currentItem
        ? kdsCardRefs.current.get(currentItem.id)
        : null;
      if (!currentElement) return;

      const currentRect = currentElement.getBoundingClientRect();
      const currentCenterX = currentRect.left + currentRect.width / 2;
      let bestMatch: { id: string; score: number } | null = null;

      kds.forEach((item) => {
        if (item.id === currentItem?.id) return;
        const element = kdsCardRefs.current.get(item.id);
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const isAbove = rect.bottom <= currentRect.top + 1;
        const isBelow = rect.top >= currentRect.bottom - 1;
        if ((direction === "up" && !isAbove) || (direction === "down" && !isBelow)) {
          return;
        }

        const centerX = rect.left + rect.width / 2;
        const verticalDistance =
          direction === "up"
            ? currentRect.top - rect.bottom
            : rect.top - currentRect.bottom;
        const horizontalDistance = Math.abs(centerX - currentCenterX);
        const score = verticalDistance * 10000 + horizontalDistance;

        if (!bestMatch || score < bestMatch.score) {
          bestMatch = { id: item.id, score };
        }
      });

      if (bestMatch) setSelectedKdsId(bestMatch.id);
    },
    [kds, selectedKdsId],
  );

  const applyKdsShortcut = useCallback(
    (status: string) => {
      const selectedItem = kds.find((item) => item.id === selectedKdsId);
      if (!selectedItem || actionBusy.startsWith(`kds-${selectedItem.id}-`)) return;
      void updateKds(selectedItem, status);
    },
    [actionBusy, kds, selectedKdsId],
  );

  useEffect(() => {
    const selectedElement = selectedKdsId
      ? kdsCardRefs.current.get(selectedKdsId)
      : null;
    selectedElement?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedKdsId]);

  useEffect(() => {
    if (tab !== "kds" && !kdsFullscreen) return;
    if (
      paymentTarget ||
      closeMesaTarget ||
      qrDownloadMesa ||
        deleteMesaTarget ||
        deleteItemTarget ||
        configuringProduct ||
        editingConfiguredItem ||
        editingSimpleItem ||
        printComandaTarget ||
      kitchenPrintSelection
    ) {
      return;
    }

    const handleKdsKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const target = event.target as HTMLElement | null;
      const targetTag = target?.tagName?.toLowerCase();
      const isTyping =
        target?.isContentEditable ||
        targetTag === "input" ||
        targetTag === "textarea" ||
        targetTag === "select";
      if (isTyping) return;

      const navigationByKey: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      };
      const navigationDirection = navigationByKey[event.key];
      if (navigationDirection) {
        event.preventDefault();
        navigateKdsSelection(navigationDirection);
        return;
      }

      const key = event.key.toLowerCase();
      if (!["r", "p", "e"].includes(key)) return;

      event.preventDefault();
      if (key !== "p" && pendingPShortcutTimeoutRef.current) {
        window.clearTimeout(pendingPShortcutTimeoutRef.current);
        pendingPShortcutTimeoutRef.current = null;
      }

      if (key === "r") {
        applyKdsShortcut("recebido");
        return;
      }

      if (key === "e") {
        applyKdsShortcut("entregue");
        return;
      }

      if (pendingPShortcutTimeoutRef.current) {
        window.clearTimeout(pendingPShortcutTimeoutRef.current);
        pendingPShortcutTimeoutRef.current = null;
        applyKdsShortcut("pronto");
        return;
      }

      pendingPShortcutTimeoutRef.current = window.setTimeout(() => {
        pendingPShortcutTimeoutRef.current = null;
        applyKdsShortcut("preparando");
      }, 360);
    };

    window.addEventListener("keydown", handleKdsKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKdsKeyDown);
      if (pendingPShortcutTimeoutRef.current) {
        window.clearTimeout(pendingPShortcutTimeoutRef.current);
        pendingPShortcutTimeoutRef.current = null;
      }
    };
  }, [
    applyKdsShortcut,
      closeMesaTarget,
      configuringProduct,
      deleteMesaTarget,
      deleteItemTarget,
      editingConfiguredItem,
      editingSimpleItem,
      kdsFullscreen,
    navigateKdsSelection,
    paymentTarget,
    printComandaTarget,
    qrDownloadMesa,
    tab,
    kitchenPrintSelection,
  ]);

  const printSalaoComanda = (
    comanda: any,
    mode: ComandaPrintMode = "cliente_cozinha",
    selectedItems?: any[],
  ) => {
    const printWindow = window.open("", "_blank", "width=420,height=650");
    if (!printWindow) {
      showSystemNotice(
        "Não foi possível abrir a janela de impressão. Verifique se o navegador bloqueou pop-ups.",
      );
      return false;
    }

    const printableItems = (selectedItems || arrayOrEmpty<any>(comanda.itens)).filter(
      (item) => item.status !== "cancelado",
    );
    const participants = arrayOrEmpty<any>(comanda.participantes);
    const participantNames = new Map(
      participants.map((participant) => [
        participant.id,
        participant.nome_snapshot || participant.nome || "Cliente",
      ]),
    );
    const groups = new Map<
      string,
      { name: string; items: any[]; total: number; staff: boolean }
    >();
    for (const item of printableItems) {
      const isStaffItem = !item.participante_id;
      const key = isStaffItem
        ? `${item.enviado_por === "garcom" ? "garcom" : "atendimento"}:${item.adicionado_por || item.autor_nome || "Atendimento"}`
        : item.participante_id;
      const group = groups.get(key) || {
        name: isStaffItem
          ? salaoStaffGroupLabel(item)
          : participantNames.get(key) || salaoItemAuthorLabel(item),
        items: [],
        total: 0,
        staff: isStaffItem,
      };
      group.items.push(item);
      group.total += Number(item.preco_total || 0);
      groups.set(key, group);
    }

    const groupedItems = [...groups.values()]
      .map(
        (group) => `
      <section class="person">
        <p class="person-title">${escapePrintHtml(group.name)}</p>
        ${group.items
          .map(
            (item) => `
          <div class="row product-row"><span>${escapePrintHtml(formatSalaoQuantity(item.quantidade))}x ${escapePrintHtml(salaoPrintItemName(item))}</span><span>R$ ${formatMoney(item.preco_total)}</span></div>
          ${arrayOrEmpty<any>(item.selecoes)
            .map(
              (selection) =>
                `<p class="option">${escapePrintHtml(salaoPrintSelectionLine(selection))}</p>`,
            )
            .join("")}
          ${item.observacoes ? `<p class="obs">Obs: ${escapePrintHtml(item.observacoes)}</p>` : ""}
        `,
          )
          .join("")}
        <div class="row subtotal"><span>${group.staff ? "Subtotal dos pedidos lançados" : `Total de ${escapePrintHtml(group.name)}`}</span><span>R$ ${formatMoney(group.total)}</span></div>
      </section>
    `,
      )
      .join("");
    const total = printableItems
      .reduce((sum, item) => sum + Number(item.preco_total || 0), 0);
    const splitPeople = Number(comanda.quantidade_pessoas_divisao || 1);
    const dailyTicketNumber = getDailyTicketNumber(comanda);
    const division =
      splitPeople > 1
        ? `<div class="divider"></div><div class="row"><span>Divisão (${splitPeople} pessoas)</span><span>R$ ${formatMoney(total / splitPeople)} por pessoa</span></div>`
        : "";

    if (mode === "cozinha") {
      const kitchenItems = printableItems
        .map(
          (item) => `
          <section class="product-block">
            <div class="product-row"><span>${escapePrintHtml(formatSalaoQuantity(item.quantidade))}x ${escapePrintHtml(salaoPrintItemName(item))}</span></div>
            ${arrayOrEmpty<any>(item.selecoes)
              .map(
                (selection) =>
                  `<p class="option">${escapePrintHtml(salaoPrintSelectionLine(selection))}</p>`,
              )
              .join("")}
            ${item.observacoes ? `<p class="obs">Obs: ${escapePrintHtml(item.observacoes)}</p>` : ""}
          </section>
        `,
        )
        .join("");

      printWindow.document.write(`<!DOCTYPE html>
      <html lang="pt-BR"><head><meta charset="UTF-8"><title>Comanda da Cozinha ${escapePrintHtml(comanda.numero_comanda)}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}html,body{width:80mm;min-height:30mm}body{font-family:'Courier New',Courier,monospace;width:80mm;min-height:30mm;max-width:80mm;margin:0 auto;padding:3mm;font-size:19px;font-weight:900;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}body *{color:#000!important;font-weight:900}.center{text-align:center}.bold{font-weight:900}.large{font-size:22px}.divider-solid{border-top:2px solid #000;margin:10px 0}.divider{border-top:1px dashed #000;margin:9px 0}.tag{display:inline-block;border:2px solid #000;padding:2px 8px;font-size:18px;margin:3px 0}.kitchen-meta{border:2px solid #000;padding:6px;margin:8px 0;text-align:left}.kitchen-meta p{font-size:18px;line-height:1.16}.ticket-number{border:3px solid #000;padding:9px 4px;margin:8px 0;text-align:center}.ticket-label{font-size:17px;font-weight:900;letter-spacing:0}.ticket-value{display:block;font-size:54px;line-height:.95;font-weight:900;margin-top:3px}.product-block{border-bottom:2px solid #000;padding-bottom:9px;margin-bottom:10px}.product-row{display:flex;justify-content:space-between;gap:8px;font-size:29px;line-height:1.08;margin-bottom:7px}.product-row span:first-child{flex:1;min-width:0}.option{font-size:22px;line-height:1.1;margin:0 0 5px 12px;padding-left:8px;border-left:3px solid #000}.obs{border:2px solid #000;padding:5px;font-size:24px;line-height:1.1;margin:6px 0 7px 0;font-style:italic}p,.option,.obs,.product-row span{max-width:100%;overflow-wrap:anywhere;word-break:break-word;white-space:normal}p{margin-bottom:4px}@page{size:80mm 200mm;margin:0}@media print{html,body{width:80mm;min-height:30mm}body{margin:0;padding:3mm}}
      </style></head><body>
        <div class="center">
          <p class="bold large">COMANDA DA COZINHA</p>
          ${dailyTicketNumber ? `<div class="ticket-number"><span class="ticket-label">COMANDA DO DIA</span><span class="ticket-value">${escapePrintHtml(dailyTicketNumber)}</span></div>` : ""}
          <span class="tag">MESA ${escapePrintHtml(comanda.mesa?.numero || "-")}</span>
        </div>
        <div class="kitchen-meta">
          <p>Comanda: <span class="bold">${escapePrintHtml(comanda.numero_comanda)}</span></p>
          <p>Mesa: <span class="bold">${escapePrintHtml(comanda.mesa?.numero || "-")}</span></p>
          <p>Data: ${new Date().toLocaleString("pt-BR")}</p>
        </div>
        <div class="divider-solid"></div>
        <p class="bold">PRODUTOS:</p>
        ${kitchenItems || "<p>Nenhum item selecionado.</p>"}
        <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
      </body></html>`);
      printWindow.document.close();
      return true;
    }

    printWindow.document.write(`<!DOCTYPE html>
      <html lang="pt-BR"><head><meta charset="UTF-8"><title>Comanda ${escapePrintHtml(comanda.numero_comanda)}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}html,body{width:80mm;min-height:30mm}body{font-family:'Courier New',Courier,monospace;width:80mm;min-height:30mm;max-width:80mm;margin:0 auto;padding:3mm;font-size:16px;font-weight:700;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}body *{color:#000!important;font-weight:700}.center{text-align:center}.bold{font-weight:800}.large{font-size:19px}.divider-solid{border-top:1px solid #000;margin:8px 0}.divider{border-top:1px dashed #000;margin:8px 0}.row{display:flex;justify-content:space-between;gap:8px;margin-bottom:3px}.row-total{display:flex;justify-content:space-between;gap:8px;font-size:18px;font-weight:800;margin-bottom:3px}.row span:first-child,.row-total span:first-child{min-width:0;overflow-wrap:anywhere;word-break:break-word}.person{padding:8px 0}.person-title{font-weight:800;margin-bottom:6px}.subtotal{margin-top:6px;font-weight:800}.option{font-size:14px;margin:0 0 2px 16px}.obs{font-size:22px;line-height:1.12;margin:0 0 7px 16px;font-style:italic}.tag{display:inline-block;border:1px solid #000;padding:1px 6px;font-size:15px;margin:2px 0}.ticket-number{border:2px solid #000;padding:8px 4px;margin:8px 0;text-align:center}.ticket-label{font-size:15px;font-weight:800;letter-spacing:0}.ticket-value{display:block;font-size:42px;line-height:1;font-weight:900;margin-top:3px}.product-row{font-size:26px;line-height:1.12;margin-bottom:7px}.product-row span:first-child{flex:1;min-width:0}.product-row span:last-child{white-space:nowrap}p,.option,.obs,.product-row span{max-width:100%;overflow-wrap:anywhere;word-break:break-word;white-space:normal}p{margin-bottom:4px}@page{size:80mm 200mm;margin:0}@media print{html,body{width:80mm;min-height:30mm}body{margin:0;padding:3mm}}${mode === "cliente" ? "body{font-size:13px;font-weight:400}body *{font-weight:400}.bold,.person-title,.subtotal,.row-total{font-weight:800}.large{font-size:16px}.ticket-number{border-width:1px;padding:5px 4px}.ticket-label{font-size:12px}.ticket-value{font-size:24px}.product-row{font-size:14px;line-height:1.2;margin-bottom:4px}.option{font-size:12px;line-height:1.2;margin-bottom:3px}.obs{font-size:13px;line-height:1.2;margin-bottom:5px}.row-total{font-size:15px}" : ""}
      </style></head><body>
        <div class="center">
          <p class="bold large">COMANDA DO SALÃO</p>
          ${dailyTicketNumber ? `<div class="ticket-number"><span class="ticket-label">COMANDA DO DIA</span><span class="ticket-value">${escapePrintHtml(dailyTicketNumber)}</span></div>` : ""}
          <p>Comanda: <span class="bold">${escapePrintHtml(comanda.numero_comanda)}</span></p>
          <p>Data: ${new Date().toLocaleString("pt-BR")}</p>
          <span class="tag">MESA ${escapePrintHtml(comanda.mesa?.numero || "-")}</span>
        </div>
        <div class="divider"></div>
        <p class="bold">ITENS DA COMANDA:</p>
        ${groupedItems || "<p>Nenhum item lançado.</p>"}
        <div class="divider-solid"></div>
        <div class="row-total"><span>TOTAL GERAL</span><span>R$ ${formatMoney(total)}</span></div>
        ${division}
        <div class="divider-solid"></div>
        <div class="center"><p>Obrigado pela preferência!</p></div>
        <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
      </body></html>`);
    printWindow.document.close();
    return true;
  };

  const openSalaoPrintModal = (comanda: any) => {
    setPrintComandaTarget(comanda);
  };

  const getSalaoPrintMode = (): StorePrintMode =>
    currentStore?.impressao_pedido_modo || "agent_com_fallback";

  const printSalaoComandaInBrowser = (
    comanda: any,
    mode: ComandaPrintMode,
    selectedItems?: any[],
  ) => printSalaoComanda(comanda, mode, selectedItems);

  const enqueueOrFallbackSalaoPrint = async (
    comanda: any,
    mode: ComandaPrintMode,
    selectedItems?: any[],
    itemIds?: string[],
  ) => {
    const printMode = getSalaoPrintMode();

    if (printMode === "navegador_windows") {
      return printSalaoComandaInBrowser(comanda, mode, selectedItems);
    }

    try {
      await printingService.printSalaoComanda(comanda.id, {
        mode,
        item_ids: itemIds,
        reprint: true,
      });
      return true;
    } catch (error) {
      if (printMode !== "agent_com_fallback") throw error;
      showSystemNotice("Print Agent indisponÃ­vel. Abrindo impressÃ£o pelo Windows.");
      return printSalaoComandaInBrowser(comanda, mode, selectedItems);
    }
  };

  const getSalaoKitchenSelectionItems = (comanda: any, storageKey: string) =>
    buildKitchenPrintSelectionItems(
      arrayOrEmpty<any>(comanda.itens).filter((item) => item.status !== "cancelado"),
      storageKey,
      {
        getName: salaoPrintItemName,
        getQuantity: (item) => Number(item.quantidade || 0),
        getDetails: (item) =>
          arrayOrEmpty<any>(item.selecoes).map(
            (selection) => `${selection.nome_grupo}: ${selection.nome_opcao}`,
          ),
        getNote: (item) => String(item.observacoes || "").trim(),
      },
    );

  const handleSalaoPrintModeSelected = async (mode: ComandaPrintMode) => {
    if (!printComandaTarget || salaoPrintBusy) return;

    if (mode === "cozinha") {
      const storageKey = getKitchenPrintStorageKey(
        "salao",
        printComandaTarget.id,
      );
      const selectionItems = getSalaoKitchenSelectionItems(
        printComandaTarget,
        storageKey,
      );
      const hasPrintedHistory = readKitchenPrintedKeys(storageKey).size > 0;

      if (hasPrintedHistory) {
        setKitchenPrintSelection({
          comanda: printComandaTarget,
          storageKey,
          selectionItems,
        });
        setPrintComandaTarget(null);
        return;
      }

      setSalaoPrintBusy(true);
      try {
        const selectedItems = selectionItems.map((item) => item.item);
        const sent = await enqueueOrFallbackSalaoPrint(
          printComandaTarget,
          "cozinha",
          selectedItems,
          selectedItems.map((item) => String(item.id || "")).filter(Boolean),
        );
        if (sent) {
          markKitchenItemsPrinted(
            storageKey,
            selectionItems.map((item) => item.key),
          );
          showSystemNotice("Comanda enviada para impressÃ£o.");
          setPrintComandaTarget(null);
        }
      } catch (error) {
        showSystemNotice(
          getApiErrorMessage(error, "NÃ£o foi possÃ­vel enviar a comanda para impressÃ£o."),
        );
      } finally {
        setSalaoPrintBusy(false);
      }
      return;
    }

    setSalaoPrintBusy(true);
    try {
      const sent = await enqueueOrFallbackSalaoPrint(printComandaTarget, mode);
      if (sent) {
        showSystemNotice("Comanda enviada para impressÃ£o.");
        setPrintComandaTarget(null);
      }
    } catch (error) {
      showSystemNotice(
        getApiErrorMessage(error, "NÃ£o foi possÃ­vel enviar a comanda para impressÃ£o."),
      );
    } finally {
      setSalaoPrintBusy(false);
    }
  };

  const handlePrintSelectedSalaoKitchenItems = async (itemKeys: string[]) => {
    if (!kitchenPrintSelection || salaoPrintBusy) return;

    const selectedKeys = new Set(itemKeys);
    const selectedItemsForPrint = kitchenPrintSelection.selectionItems
      .filter((item) => selectedKeys.has(item.key))
      .map((item) => item.item);

    setSalaoPrintBusy(true);
    try {
      const sent = await enqueueOrFallbackSalaoPrint(
        kitchenPrintSelection.comanda,
        "cozinha",
        selectedItemsForPrint,
        selectedItemsForPrint.map((item) => String(item.id || "")).filter(Boolean),
      );
      if (sent) {
        markKitchenItemsPrinted(kitchenPrintSelection.storageKey, itemKeys);
        showSystemNotice("Comanda enviada para impressÃ£o.");
        setKitchenPrintSelection(null);
      }
    } catch (error) {
      showSystemNotice(
        getApiErrorMessage(error, "NÃ£o foi possÃ­vel enviar os produtos para impressÃ£o."),
      );
    } finally {
      setSalaoPrintBusy(false);
    }
  };

  const productList = useMemo(() => {
    const search = productSearch.trim();
    if (!search) return products;
    return sortProductsBySearchPriority(productSearchResults || [], search);
  }, [productSearch, productSearchResults, products]);
  const productPool = useMemo(() => {
    const byId = new Map<string, any>();
    for (const product of products) byId.set(product.id, product);
    for (const product of productSearchResults || [])
      byId.set(product.id, product);
    return Array.from(byId.values());
  }, [products, productSearchResults]);
  const selectedProduct = productPool.find(
    (product) => product.id === selectedProductId,
  );
  const tableSearchQuery = newTableNumber.trim();
  const normalizedTableSearchQuery = normalizeMesaSearch(tableSearchQuery);
  const typedTableMatches = useMemo(() => {
    if (!normalizedTableSearchQuery) return [];
    return mesas.filter((mesa) => {
      const number = normalizeMesaSearch(mesa?.numero);
      const name = normalizeMesaSearch(mesa?.nome);
      return (
        number.includes(normalizedTableSearchQuery) ||
        name.includes(normalizedTableSearchQuery)
      );
    });
  }, [mesas, normalizedTableSearchQuery]);
  const visibleMesas = useMemo(() => {
    const search = normalizeMesaSearch(appliedTableSearch);
    if (!search) return mesas;
    return mesas.filter((mesa) => {
      const number = normalizeMesaSearch(mesa?.numero);
      const name = normalizeMesaSearch(mesa?.nome);
      return number.includes(search) || name.includes(search);
    });
  }, [appliedTableSearch, mesas]);
  const canSearchTable = Boolean(tableSearchQuery && typedTableMatches.length > 0);
  const tableActionLabel = canSearchTable ? "Buscar" : "Mesa";
  const TableActionIcon = canSearchTable ? Search : Plus;
  const tableCardScalePercent = Math.round(tableCardScale * 100);
  const tableCardGridMinWidth = Math.round(252 * tableCardScale);
  const tableCardGap = Math.round(10 * tableCardScale);
  const tableCardPadding = Math.round(12 * tableCardScale);
  const tableCardMobilePadding = Math.max(8, Math.round(9 * tableCardScale));
  const tableCardBottomPadding = tableCardPadding;
  const tableCardMobileBottomPadding = tableCardMobilePadding;
  const tableCardMinHeight = Math.round(128 * tableCardScale);
  const tableCardMobileMinHeight = Math.max(112, Math.round(116 * tableCardScale));
  const kdsCardScalePercent = Math.round(kdsCardScale * 100);
  const showingKdsControls = tab === "kds" || kdsFullscreen;
  const activeCardScale = showingKdsControls ? kdsCardScale : tableCardScale;
  const activeCardScalePercent =
    showingKdsControls ? kdsCardScalePercent : tableCardScalePercent;
  const activeCardScaleMin =
    showingKdsControls ? KDS_CARD_SCALE_MIN : TABLE_CARD_SCALE_MIN;
  const activeCardScaleMax =
    showingKdsControls ? KDS_CARD_SCALE_MAX : TABLE_CARD_SCALE_MAX;
  const activeCardScaleStep =
    showingKdsControls ? KDS_CARD_SCALE_STEP : TABLE_CARD_SCALE_STEP;
  const activeCardScaleLabel =
    showingKdsControls ? "Tamanho dos cards do KDS" : "Tamanho dos cards de mesa";
  const kdsCardGridMinWidth = Math.round(344 * kdsCardScale);
  const kdsCardGap = Math.round(12 * kdsCardScale);
  const kdsCardPadding = Math.round(16 * kdsCardScale);
  const kdsCardRadius = Math.round(8 * kdsCardScale);
  const kdsSectionPaddingX = Math.round(12 * kdsCardScale);
  const kdsSectionPaddingY = Math.round(8 * kdsCardScale);
  const handleTableSearchOrCreate = async () => {
    if (!tableSearchQuery) return;
    if (canSearchTable) {
      setAppliedTableSearch(tableSearchQuery);
      return;
    }
    await createMesa();
  };
  const handleCardScaleChange = (value: string) => {
    if (showingKdsControls) {
      setKdsCardScale(clampKdsCardScale(value));
      return;
    }

    setTableCardScale(clampTableCardScale(value));
  };
  const toggleSalaoFullscreen = async () => {
    if (salaoFullscreen) {
      if (document.fullscreenElement) await document.exitFullscreen();
      setSalaoFullscreen(false);
      return;
    }

    const target = salaoPageRef.current;
    if (target?.requestFullscreen) {
      try {
        await target.requestFullscreen();
        window.dispatchEvent(new Event(ADMIN_COLLAPSE_SIDEBAR_EVENT));
      } catch {
        setSalaoFullscreen(true);
        window.dispatchEvent(new Event(ADMIN_COLLAPSE_SIDEBAR_EVENT));
      }
      return;
    }

    setSalaoFullscreen(true);
    window.dispatchEvent(new Event(ADMIN_COLLAPSE_SIDEBAR_EVENT));
  };
  const mesasById = useMemo(
    () => new Map(mesas.map((mesa) => [mesa.id, mesa])),
    [mesas],
  );
  const pendingMesas = useMemo(
    () => mesas.filter((mesa) => Boolean(getMesaPendingAction(mesa))),
    [mesas],
  );
  const selectedMesa = useMemo(() => {
    if (!selectedComanda) return null;
    const mesaId = selectedComanda.mesa_id || selectedComanda.mesa?.id;
    return (
      mesasById.get(mesaId) || {
        ...selectedComanda.mesa,
        loja_id: user?.loja_id,
      }
    );
  }, [mesasById, selectedComanda, user?.loja_id]);
  const canAdminAddItems = selectedComanda
    ? ["aberta", "aguardando_conta"].includes(selectedComanda.status)
    : false;
  const tableStatusClass: Record<string, string> = {
    livre: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
    ocupada: "bg-rose-100 text-rose-800 ring-1 ring-rose-200",
    reservada: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    aguardando_conta: "bg-blue-100 text-blue-800 ring-1 ring-blue-200",
    aguardando_garcom: "bg-violet-100 text-violet-800 ring-1 ring-violet-200",
  };
  const salaoTabs = [
    {
      id: "mesas",
      Icon: Armchair,
      label: "Mesas",
      mobileLabel: "Mesas",
      description: `${pendingMesas.length} mesa${pendingMesas.length === 1 ? "" : "s"} com atenção`,
      count: pendingMesas.length,
    },
    {
      id: "comandas",
      Icon: ClipboardList,
      label: "Comandas",
      mobileLabel: "Comandas",
      description: `${comandas.length} comanda${comandas.length === 1 ? "" : "s"} ativa${comandas.length === 1 ? "" : "s"}`,
      count: pendingMesas.length,
    },
    {
      id: "kds",
      Icon: ChefHat,
      label: "KDS",
      mobileLabel: "KDS",
      description: `${kds.length} item${kds.length === 1 ? "" : "s"} na cozinha`,
      count: 0,
    },
  ] as const;
  const activeSalaoTab =
    salaoTabs.find((item) => item.id === tab) || salaoTabs[0];
  const ActiveSalaoTabIcon = activeSalaoTab.Icon;
  const lockComandaOrdersScroll =
    tab === "comandas" &&
    Boolean(selectedComanda) &&
    comandaModule === "pedidos";

  return (
    <div
      ref={salaoPageRef}
      className={`flex h-full min-h-0 max-w-full flex-col overflow-x-hidden bg-gray-50 ${
        salaoFullscreen ? "fixed inset-0 z-[9999]" : ""
      }`}
    >
      <div className="border-b border-gray-200 bg-white px-2.5 py-2 lg:px-4 lg:py-0 lg:pt-2">
        <div className="lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase text-slate-400">
                Salão
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                  style={{ backgroundColor: PRIMARY }}
                >
                  <ActiveSalaoTabIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-sm font-extrabold text-slate-950">
                    {activeSalaoTab.label}
                  </h1>
                  <p className="truncate text-[11px] font-medium leading-tight text-slate-500">
                    {activeSalaoTab.description}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => void loadAll({ manual: true, includeProducts: true })}
                disabled={loading || refreshing}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm disabled:opacity-45"
                style={{ backgroundColor: PRIMARY }}
                aria-label={loading || refreshing ? "Atualizando salão" : "Atualizar salão"}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading || refreshing ? "animate-spin" : ""}`}
                />
              </button>
              <button
                type="button"
                onClick={() => void toggleSalaoFullscreen()}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition-all ${
                  salaoFullscreen
                    ? "border-transparent text-white"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
                style={salaoFullscreen ? { backgroundColor: PRIMARY } : undefined}
                title={salaoFullscreen ? "Sair da tela cheia" : `Abrir ${activeSalaoTab.label} em tela cheia`}
                aria-label={salaoFullscreen ? "Sair da tela cheia" : `Abrir ${activeSalaoTab.label} em tela cheia`}
                aria-pressed={salaoFullscreen}
              >
                {salaoFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setTableScaleControlOpen((current) => !current)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
                aria-label={activeCardScaleLabel}
                aria-expanded={tableScaleControlOpen}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
          {tableScaleControlOpen && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <span className="min-w-0 flex-1 text-xs font-bold text-slate-600">
                {activeCardScaleLabel}
              </span>
              <input
                type="range"
                min={activeCardScaleMin}
                max={activeCardScaleMax}
                step={activeCardScaleStep}
                value={activeCardScale}
                onChange={(event) => handleCardScaleChange(event.target.value)}
                className="h-1.5 w-28 accent-[#122a4c]"
                aria-label={activeCardScaleLabel}
              />
              <span className="w-9 text-right text-[11px] font-extrabold text-slate-600">
                {activeCardScalePercent}%
              </span>
            </div>
          )}
        </div>
        <div
          className="hidden gap-1 overflow-x-auto scrollbar-hide lg:flex"
          role={kdsFullscreen ? undefined : "tablist"}
          aria-label={kdsFullscreen ? undefined : "Áreas do salão"}
        >
          {kdsFullscreen && (
            <div
              className="inline-flex min-h-12 shrink-0 items-center gap-2 px-1 text-sm font-bold"
              style={{ color: PRIMARY }}
            >
              <ChefHat className="h-4 w-4" />
              KDS
            </div>
          )}
          {!kdsFullscreen && [
            ["mesas", Armchair, "Mesas", pendingMesas.length],
            ["comandas", ClipboardList, "Comandas", pendingMesas.length],
            ["kds", ChefHat, "KDS", 0],
          ].map(([id, Icon, label, pendingCount]) => {
            const active = tab === id;
            return (
              <button
                key={String(id)}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(id as any)}
                className={`relative isolate inline-flex min-w-24 shrink-0 items-center justify-center gap-2 overflow-hidden border-b-2 px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
                style={
                  active ? { borderBottomColor: PRIMARY, color: PRIMARY } : undefined
                }
              >
                {active && (
                  <>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-7"
                      style={{
                        background: `linear-gradient(to top, ${hexToRgba(PRIMARY, 0.13)} 0%, ${hexToRgba(PRIMARY, 0.055)} 38%, ${hexToRgba(PRIMARY, 0)} 100%)`,
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-3 bottom-0 h-1 blur-md"
                      style={{
                        backgroundColor: hexToRgba(PRIMARY, 0.22),
                      }}
                    />
                  </>
                )}
                <Icon className="relative z-10 h-4 w-4" />
                <span className="relative z-10">{label}</span>
                {Number(pendingCount) > 0 && (
                  <span className="relative z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[10px] font-extrabold text-amber-800">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
          <div className="ml-auto flex flex-none items-center gap-2 py-1.5">
            <button
              type="button"
              onClick={() => {
                const nextEnabled = !salaoSoundEnabled;
                setSalaoSoundEnabled(nextEnabled);
                if (nextEnabled) salaoSound.arm();
              }}
              className={`relative inline-flex h-9 w-9 flex-none items-center justify-center rounded-full border shadow-sm transition-all ${
                hasPendingCustomerAttention && salaoSoundEnabled
                  ? "animate-pulse border-red-300 bg-red-600 text-white"
                  : salaoSoundEnabled
                    ? "border-transparent text-white"
                    : "border-gray-200 bg-white text-gray-400"
              }`}
              style={
                salaoSoundEnabled && !hasPendingCustomerAttention
                  ? { backgroundColor: PRIMARY }
                  : undefined
              }
              title={salaoSoundEnabled ? "Som ativado" : "Som desativado"}
              aria-label={salaoSoundEnabled ? "Som ativado" : "Som desativado"}
              aria-pressed={salaoSoundEnabled}
            >
              {salaoSoundEnabled ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
              {hasPendingCustomerAttention && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-amber-400" />
              )}
            </button>
            <button
              type="button"
              onClick={() => void loadAll({ manual: true, includeProducts: true })}
              disabled={loading || refreshing}
              className="relative inline-flex h-9 w-9 flex-none items-center justify-center rounded-full text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-default disabled:opacity-45"
              style={{ backgroundColor: PRIMARY }}
              title={loading || refreshing ? "Atualizando..." : "Atualizar"}
              aria-label={loading || refreshing ? "Atualizando salão" : "Atualizar salão"}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading || refreshing ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={() => void toggleSalaoFullscreen()}
              className={`inline-flex h-9 w-9 flex-none items-center justify-center rounded-full border shadow-sm transition-all hover:border-gray-300 ${
                salaoFullscreen
                  ? "border-transparent text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:text-gray-900"
              }`}
              style={salaoFullscreen ? { backgroundColor: PRIMARY } : undefined}
              title={salaoFullscreen ? "Sair da tela cheia" : `Abrir ${activeSalaoTab.label} em tela cheia`}
              aria-label={salaoFullscreen ? "Sair da tela cheia" : `Abrir ${activeSalaoTab.label} em tela cheia`}
              aria-pressed={salaoFullscreen}
            >
              {salaoFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setTableScaleControlOpen((current) => !current)}
              className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:text-gray-900"
              title="Ajustar tamanho dos cards"
              aria-label={activeCardScaleLabel}
              aria-expanded={tableScaleControlOpen}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            {tableScaleControlOpen && (
              <div className="flex w-44 flex-none items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
                <input
                  type="range"
                  min={activeCardScaleMin}
                  max={activeCardScaleMax}
                  step={activeCardScaleStep}
                  value={activeCardScale}
                  onChange={(event) => handleCardScaleChange(event.target.value)}
                  className="h-1.5 w-full accent-[#122a4c]"
                  aria-label={activeCardScaleLabel}
                />
                <span className="w-9 text-right text-[11px] font-bold text-gray-600">
                  {activeCardScalePercent}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={`min-h-0 flex-1 overflow-x-hidden p-2 pb-16 sm:p-6 sm:pb-28 ${
          lockComandaOrdersScroll
            ? "overflow-y-auto lg:overflow-y-hidden lg:pb-6"
            : "overflow-y-auto lg:pb-20"
        }`}
      >
        {loading ? (
          <div className="flex h-64 items-center justify-center text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Carregando salão...
          </div>
        ) : !kdsFullscreen && tab === "mesas" ? (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex w-full max-w-sm gap-1.5 sm:gap-2">
              <input
                value={newTableNumber}
                onChange={(event) => {
                  setNewTableNumber(event.target.value);
                  if (!event.target.value.trim()) setAppliedTableSearch("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleTableSearchOrCreate();
                  }
                }}
                placeholder="Número da mesa"
                className="h-10 min-w-0 flex-1 rounded-lg border border-gray-300 px-2.5 text-[16px] leading-none sm:h-12 sm:rounded-xl sm:px-3"
              />
              <button
                type="button"
                onClick={() => void handleTableSearchOrCreate()}
                disabled={creatingTable || !tableSearchQuery}
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white disabled:opacity-60 sm:min-h-12 sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm"
                style={{ backgroundColor: PRIMARY }}
              >
                {creatingTable ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" />
                ) : (
                  <TableActionIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
                {creatingTable ? "Criando..." : tableActionLabel}
              </button>
            </div>

            {appliedTableSearch && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span>
                  {visibleMesas.length} mesa{visibleMesas.length !== 1 ? "s" : ""} encontrada{visibleMesas.length !== 1 ? "s" : ""} para "{appliedTableSearch}".
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedTableSearch("");
                    setNewTableNumber("");
                  }}
                  className="font-semibold text-gray-700 underline-offset-2 hover:underline"
                >
                  Limpar busca
                </button>
              </div>
            )}

            <div
              className="grid min-w-0 grid-cols-2 sm:[grid-template-columns:repeat(auto-fill,minmax(min(100%,var(--table-card-grid-min-width)),1fr))]"
              style={{
                gap: tableCardGap,
                "--table-card-grid-min-width": `${tableCardGridMinWidth}px`,
              } as CSSProperties}
            >
              {visibleMesas.map((mesa) => {
                const pendingAction = getMesaPendingAction(mesa);
                const hasOpenComanda = Boolean(mesa.comanda_aberta);
                const mesaOpenedAt = mesaOpenTimes[String(mesa.id)];
                const statusLabel = String(mesa.status || "sem status").replace(
                  /_/g,
                  " ",
                );
                const statusFontSize =
                  (statusLabel.length > 12 ? 7.5 : statusLabel.length > 8 ? 8.5 : 9.5) *
                  tableCardScale;
                const handleMesaClick = () => void openMesa(mesa);

                return (
                  <div
                    key={mesa.id}
                    role={hasOpenComanda ? "button" : undefined}
                    tabIndex={hasOpenComanda ? 0 : undefined}
                    onClick={handleMesaClick}
                    onKeyDown={(event) => {
                      if (
                        hasOpenComanda &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault();
                        handleMesaClick();
                      }
                    }}
                    className={`relative min-w-0 overflow-hidden rounded-lg border shadow-sm transition-all [min-height:var(--table-card-mobile-min-height)] [padding:var(--table-card-mobile-padding)] [padding-bottom:var(--table-card-mobile-bottom-padding)] sm:rounded-xl sm:[min-height:var(--table-card-min-height)] sm:[padding:var(--table-card-padding)] sm:[padding-bottom:var(--table-card-bottom-padding)] ${
                      realtimeMesaId === mesa.id
                        ? "border-emerald-500 bg-emerald-100 ring-4 ring-emerald-200 animate-pulse"
                        : pendingAction?.cardClass || "border-gray-200 bg-white"
                    } ${hasOpenComanda ? "cursor-pointer hover:border-blue-300 hover:shadow-md" : ""}`}
                    style={{
                      "--table-card-mobile-min-height": `${tableCardMobileMinHeight}px`,
                      "--table-card-min-height": `${tableCardMinHeight}px`,
                      "--table-card-mobile-padding": `${tableCardMobilePadding}px`,
                      "--table-card-padding": `${tableCardPadding}px`,
                      "--table-card-mobile-bottom-padding": `${tableCardMobileBottomPadding}px`,
                      "--table-card-bottom-padding": `${tableCardBottomPadding}px`,
                    } as CSSProperties}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <div
                          className="break-words text-gray-500 [overflow-wrap:anywhere]"
                          style={{ fontSize: 12 * tableCardScale }}
                        >
                          Mesa
                        </div>
                        <div
                          className="break-words font-semibold text-gray-900 [overflow-wrap:anywhere]"
                          style={{ fontSize: 20 * tableCardScale, lineHeight: 1.2 }}
                        >
                          {mesa.numero}
                        </div>
                      </div>
                      <span
                        className={`max-w-[58%] shrink-0 break-words rounded-full text-center font-extrabold uppercase leading-none tracking-normal [overflow-wrap:anywhere] sm:tracking-wide ${tableStatusClass[mesa.status] || "bg-gray-100 text-gray-700"}`}
                        style={{
                          fontSize: statusFontSize,
                          padding: `${3 * tableCardScale}px ${6 * tableCardScale}px`,
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    {pendingAction && (
                      <div
                        className={`flex w-full max-w-full min-w-0 items-center overflow-hidden rounded-md border font-bold leading-snug ${pendingAction.className}`}
                        style={{
                          gap: 4 * tableCardScale,
                          marginTop: 6 * tableCardScale,
                          padding: `${3 * tableCardScale}px ${5 * tableCardScale}px`,
                          fontSize: 9.5 * tableCardScale,
                        }}
                      >
                        <CircleAlert
                          className="shrink-0"
                          style={{
                            height: 14 * tableCardScale,
                            width: 14 * tableCardScale,
                          }}
                        />
                        <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                          Ação pendente: {pendingAction.label}
                        </span>
                      </div>
                    )}
                    {mesa.comanda_aberta && (
                      <div
                        className={`min-w-0 overflow-hidden rounded-md text-gray-700 ${pendingAction ? "bg-white/60" : "bg-gray-50"}`}
                        style={{
                          marginTop: 8 * tableCardScale,
                          padding: `${6 * tableCardScale}px ${8 * tableCardScale}px`,
                          fontSize: 11 * tableCardScale,
                        }}
                      >
                        <div
                          className="break-words [overflow-wrap:anywhere]"
                          style={{ marginBottom: 6 * tableCardScale }}
                        >
                          R$ {formatMoney(mesa.comanda_aberta.total)}
                        </div>
                        {mesaOpenedAt && (
                          <div
                            className="flex min-w-0 items-center font-semibold text-gray-600"
                            style={{
                              gap: 4 * tableCardScale,
                              marginBottom: 6 * tableCardScale,
                            }}
                            title="Tempo desde a abertura da mesa neste navegador"
                          >
                            <Clock3
                              className="shrink-0"
                              style={{
                                height: 13 * tableCardScale,
                                width: 13 * tableCardScale,
                              }}
                            />
                            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                              Aberta há {formatMesaOpenDuration(mesaOpenedAt, openTimeNow)}
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setCloseMesaTarget(mesa);
                          }}
                          disabled={actionBusy === `close-${mesa.comanda_aberta.id}`}
                          className="inline-flex w-full items-center justify-center rounded-lg bg-[#122a4c] font-bold text-white disabled:opacity-60"
                          style={{
                            minHeight: 28 * tableCardScale,
                            gap: 4 * tableCardScale,
                            padding: `${3 * tableCardScale}px ${5 * tableCardScale}px`,
                            fontSize: 10.5 * tableCardScale,
                          }}
                        >
                          {actionBusy === `close-${mesa.comanda_aberta.id}` ? (
                            <Loader2
                              className="animate-spin"
                              style={{
                                height: 14 * tableCardScale,
                                width: 14 * tableCardScale,
                              }}
                            />
                          ) : (
                            <Receipt
                              style={{
                                height: 14 * tableCardScale,
                                width: 14 * tableCardScale,
                              }}
                            />
                          )}
                          <span className="hidden sm:inline">Fechar mesa</span>
                          <span className="sm:hidden">Fechar</span>
                        </button>
                      </div>
                    )}
                    {!mesa.comanda_aberta && (
                      <div style={{ marginTop: 8 * tableCardScale }}>
                        <button
                          onClick={() => void openComanda(mesa)}
                          disabled={actionBusy === `open-${mesa.id}`}
                          className="w-full rounded-lg border border-gray-200 font-semibold hover:bg-gray-50 disabled:opacity-50"
                          style={{
                            minHeight: 30 * tableCardScale,
                            padding: `${3 * tableCardScale}px ${5 * tableCardScale}px`,
                            fontSize: 10.5 * tableCardScale,
                          }}
                        >
                          {actionBusy === `open-${mesa.id}` ? (
                            <span
                              className="inline-flex items-center"
                              style={{ gap: 8 * tableCardScale }}
                            >
                              <Loader2
                                className="animate-spin"
                                style={{
                                  height: 16 * tableCardScale,
                                  width: 16 * tableCardScale,
                                }}
                              />{" "}
                              <span className="hidden sm:inline">Abrindo...</span>
                              <span className="sm:hidden">...</span>
                            </span>
                          ) : (
                            <>
                              <span className="hidden sm:inline">Abrir comanda</span>
                              <span className="sm:hidden">Abrir</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : !kdsFullscreen && tab === "comandas" ? (
          <div className={`grid min-w-0 max-w-full gap-2 overflow-x-hidden xl:grid-cols-[minmax(260px,360px)_1fr] xl:gap-4 ${lockComandaOrdersScroll ? "lg:h-full lg:min-h-0" : ""}`}>
            <div className={`space-y-1.5 sm:space-y-3 ${selectedComanda ? "hidden xl:block" : ""} ${lockComandaOrdersScroll ? "min-h-0 overflow-y-auto pr-1" : ""}`}>
              {comandas.map((comanda) => {
                const mesaDaComanda = mesasById.get(
                  comanda.mesa_id || comanda.mesa?.id,
                );
                const pendingAction = getMesaPendingAction(
                  mesaDaComanda,
                  comanda,
                );
                const cardStatus =
                  mesaDaComanda?.status ||
                  comanda.mesa?.status ||
                  comanda.status;
                const cardStatusClass =
                  tableStatusClass[cardStatus] ||
                  getSalaoStatusStyle(comanda.status).badge;
                return (
                  <button
                    key={comanda.id}
                    onClick={() => void selectComanda(comanda)}
                    className={`min-h-12 w-full rounded-lg border p-2 text-left shadow-sm hover:border-blue-200 active:scale-[0.99] sm:min-h-20 sm:rounded-xl sm:p-4 ${
                      pendingAction
                        ? `${pendingAction.cardClass} ${selectedComanda?.id === comanda.id ? "ring-4 ring-blue-200" : ""}`
                        : selectedComanda?.id === comanda.id
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                          : getSalaoStatusStyle(comanda.status).card
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-900 sm:text-base">
                          {comanda.numero_comanda}
                        </div>
                        <div className="text-xs text-gray-500 sm:text-sm">
                          Mesa {comanda.mesa?.numero}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-semibold text-gray-900 sm:text-base">
                          R$ {formatMoney(comanda.total)}
                        </div>
                        <span
                          className={`mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase sm:mt-1 sm:px-2 sm:text-xs ${cardStatusClass}`}
                        >
                          {String(cardStatus || "sem status").replace(
                            /_/g,
                            " ",
                          )}
                        </span>
                      </div>
                    </div>
                    {pendingAction && (
                      <div
                        className={`mt-1.5 inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold sm:mt-2 sm:px-2 sm:py-1 sm:text-[11px] ${pendingAction.className}`}
                      >
                        <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          Ação pendente: {pendingAction.label}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div
              ref={comandaDetailRef}
              className={`max-w-full overflow-x-hidden scroll-mt-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm sm:scroll-mt-4 sm:rounded-xl sm:p-4 ${lockComandaOrdersScroll ? "lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_var(--product-panel-width)] lg:grid-rows-[auto_auto_minmax(0,1fr)] lg:gap-x-5 lg:overflow-hidden" : ""}`}
              style={
                lockComandaOrdersScroll
                  ? ({ "--product-panel-width": "clamp(400px, 46%, 560px)" } as CSSProperties)
                  : undefined
              }
            >
              {selectedComanda ? (
                <>
                  <div
                    className={`mb-2 flex w-full overflow-x-auto border-b border-gray-200 bg-white scrollbar-hide lg:sticky lg:top-0 lg:z-30 lg:-mx-4 lg:mb-4 lg:w-auto lg:px-4 ${lockComandaOrdersScroll ? "lg:col-start-1 lg:row-start-1" : ""}`}
                    role="tablist"
                    aria-label="Detalhes da comanda"
                  >
                    {[
                      {
                        id: "pedidos",
                        Icon: ShoppingCart,
                        label: "Produtos e pedidos",
                        mobileLabel: "Pedidos",
                      },
                      {
                        id: "mesa",
                        Icon: Armchair,
                        label: "Informações da mesa",
                        mobileLabel: "Informações da mesa",
                      },
                    ].map(({ id, Icon, label, mobileLabel }) => {
                      const active = comandaModule === id;

                      return (
                        <button
                          key={String(id)}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() =>
                            setComandaModule(id as typeof comandaModule)
                          }
                          className={`relative isolate inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 overflow-hidden border-b-2 px-2 py-2.5 text-center text-xs font-semibold transition-all duration-200 lg:min-w-40 lg:flex-none lg:gap-2 lg:px-4 lg:py-3 lg:text-sm ${
                            active
                              ? "text-gray-900"
                              : "border-transparent text-gray-500 hover:text-gray-800"
                          }`}
                          style={
                            active
                              ? { borderBottomColor: PRIMARY, color: PRIMARY }
                              : undefined
                          }
                        >
                          {active && (
                            <>
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-x-0 bottom-0 h-7"
                                style={{
                                  background: `linear-gradient(to top, ${hexToRgba(PRIMARY, 0.13)} 0%, ${hexToRgba(PRIMARY, 0.055)} 38%, ${hexToRgba(PRIMARY, 0)} 100%)`,
                                }}
                              />
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-x-3 bottom-0 h-1 blur-md"
                                style={{
                                  backgroundColor: hexToRgba(PRIMARY, 0.22),
                                }}
                              />
                            </>
                          )}
                          <Icon className="relative z-10 h-4 w-4 shrink-0" />
                          <span className="relative z-10 truncate lg:hidden">
                            {mobileLabel}
                          </span>
                          <span className="relative z-10 hidden truncate lg:inline">
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className={`mb-2 flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1.5 sm:mb-3 sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2 ${lockComandaOrdersScroll ? "lg:col-start-1 lg:row-start-2" : ""}`}>
                    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                      <KeyRound className="h-3.5 w-3.5 shrink-0 text-blue-800 sm:h-4 sm:w-4" />
                      <span className="text-[11px] font-semibold text-blue-900 sm:text-xs">
                        PIN da mesa
                      </span>
                      <span className="text-base font-extrabold tracking-widest text-blue-950 sm:text-lg">
                        {latestPin ||
                          selectedComanda.pin_atual ||
                          selectedComanda.pin ||
                          "----"}
                      </span>
                    </div>
                    <button
                      onClick={() => void regeneratePin(selectedComanda)}
                      disabled={
                        !["aberta", "aguardando_conta"].includes(
                          selectedComanda.status,
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-1.5 py-1 text-[11px] font-semibold text-blue-800 disabled:opacity-50 sm:rounded-lg sm:px-2 sm:text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Novo PIN
                    </button>
                  </div>
                  <div className={`grid min-w-0 max-w-full gap-3 overflow-x-hidden lg:gap-5 ${lockComandaOrdersScroll ? "lg:contents" : ""}`}>
                    <div className={`order-2 min-w-0 max-w-full overflow-x-hidden lg:order-none ${lockComandaOrdersScroll ? "lg:col-start-1 lg:row-start-3 lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden" : ""}`}>
                      <div
                        className={
                          comandaModule === "mesa"
                            ? "flex flex-col gap-2 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between"
                            : "hidden"
                        }
                      >
                        <div>
                          <h2 className="font-semibold text-gray-900">
                            {selectedComanda.numero_comanda}
                          </h2>
                          <p className="inline-flex rounded-md bg-blue-100 px-2 py-1 text-sm font-bold text-blue-800">
                            Mesa {selectedComanda.mesa?.numero}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="text-xs text-gray-500">Total</div>
                          <div className="text-lg font-semibold text-gray-900 sm:text-xl">
                            R$ {formatMoney(selectedComanda.total)}
                          </div>
                          <div className="text-xs capitalize text-gray-500">
                            {selectedComanda.status?.replace(/_/g, " ")}
                          </div>
                        </div>
                      </div>

                      <div
                        className={
                          comandaModule === "mesa"
                            ? "mt-3 grid gap-2 md:grid-cols-2 sm:mt-4 sm:gap-3"
                            : "hidden"
                        }
                      >
                        <div
                          className={
                            comandaModule === "mesa"
                              ? "rounded-lg border border-gray-100 bg-gray-50 p-2.5 sm:p-3"
                              : "hidden"
                          }
                        >
                          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <KeyRound className="h-4 w-4" />
                            PIN da sessão
                          </div>
                          <div className="text-xl font-semibold tracking-widest text-gray-950 sm:text-2xl">
                            {latestPin ||
                              selectedComanda.pin_atual ||
                              selectedComanda.pin ||
                              "----"}
                          </div>
                          <button
                            onClick={() => void regeneratePin(selectedComanda)}
                            disabled={
                              !["aberta", "aguardando_conta"].includes(
                                selectedComanda.status,
                              )
                            }
                            className="mt-2 inline-flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 disabled:opacity-50"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Gerar novo PIN
                          </button>
                        </div>
                        <div
                          className={
                            comandaModule === "mesa"
                              ? "rounded-lg border border-gray-100 bg-gray-50 p-2.5 sm:p-3"
                              : "hidden"
                          }
                        >
                          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <QrCode className="h-4 w-4" />
                            QR Code da mesa
                          </div>
                          <p className="text-xs text-gray-500">
                            Baixe ou imprima o acesso ao cardápio desta mesa.
                          </p>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              onClick={() =>
                                selectedMesa && setQrDownloadMesa(selectedMesa)
                              }
                              disabled={
                                !selectedMesa ||
                                actionBusy === `qr-${selectedMesa?.id}` ||
                                actionBusy === `print-qr-${selectedMesa?.id}`
                              }
                              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-60"
                            >
                              {actionBusy === `qr-${selectedMesa?.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                              {actionBusy === `qr-${selectedMesa?.id}`
                                ? "Gerando..."
                                : "Baixar"}
                            </button>
                            <button
                              onClick={() =>
                                selectedMesa && void printQrCode(selectedMesa)
                              }
                              disabled={
                                !selectedMesa ||
                                actionBusy === `qr-${selectedMesa?.id}` ||
                                actionBusy === `print-qr-${selectedMesa?.id}`
                              }
                              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
                            >
                              {actionBusy === `print-qr-${selectedMesa?.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Printer className="h-4 w-4" />
                              )}
                              {actionBusy === `print-qr-${selectedMesa?.id}`
                                ? "Preparando..."
                                : "Imprimir"}
                            </button>
                          </div>
                        </div>
                        <div
                          className={
                            comandaModule === "mesa"
                              ? "order-4 rounded-lg border border-red-100 bg-red-50/60 p-2.5 md:col-span-2 sm:p-3"
                              : "hidden"
                          }
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-sm font-semibold text-red-900">
                                <Trash2 className="h-4 w-4 shrink-0" />
                                Área da mesa
                              </div>
                              <p className="mt-1 text-xs leading-snug text-red-700">
                                Exclui esta mesa e invalida o QR Code impresso.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                selectedMesa && setDeleteMesaTarget(selectedMesa)
                              }
                              disabled={
                                !selectedMesa ||
                                actionBusy === `delete-${selectedMesa?.id}`
                              }
                              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50 sm:min-h-10 sm:px-3"
                            >
                              {actionBusy === `delete-${selectedMesa?.id}` ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Excluir mesa
                            </button>
                          </div>
                        </div>
                        <div
                          className={
                            comandaModule === "mesa"
                              ? "order-3 rounded-lg border border-gray-100 bg-gray-50 p-2.5 md:col-span-2 sm:p-3"
                              : "hidden"
                          }
                        >
                          <div className="mb-2 text-sm font-semibold text-gray-900">
                            Participantes
                          </div>
                          <div className="space-y-1">
                            {arrayOrEmpty<any>(selectedComanda.participantes)
                              .length === 0 ? (
                              <p className="rounded-md bg-white px-3 py-2 text-xs text-gray-500">
                                Nenhum cliente entrou com PIN ainda.
                              </p>
                            ) : (
                              arrayOrEmpty<any>(
                                selectedComanda.participantes,
                              ).map((participant) => (
                                <div
                                  key={participant.id}
                                  className="flex items-center justify-between gap-2 text-xs"
                                >
                                  <span className="truncate text-gray-700">
                                    {participant.nome_snapshot ||
                                      participant.nome}
                                  </span>
                                  {participant.status === "bloqueado" ? (
                                    <button
                                      onClick={() =>
                                        void unblockParticipant(participant)
                                      }
                                      className="rounded-md bg-red-50 px-2 py-1 font-semibold text-red-700"
                                    >
                                      Desbloquear PIN
                                    </button>
                                  ) : (
                                    <span className="rounded-full bg-white px-2 py-1 capitalize text-gray-500">
                                      {(participant.status || "ativo").replace(
                                        /_/g,
                                        " ",
                                      )}
                                    </span>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        className={
                          comandaModule === "pedidos"
                            ? "mt-2 space-y-1.5 sm:mt-4 sm:space-y-2 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:space-y-0"
                            : "hidden"
                        }
                      >
                        <div className="mb-1.5 flex shrink-0 items-center gap-1.5 text-sm font-semibold text-gray-900 sm:mb-3 sm:gap-2">
                          <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Pedidos da mesa
                        </div>
                        <div className="space-y-1.5 sm:space-y-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1.5">
                          {(selectedComanda.itens || []).length === 0 ? (
                            <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-gray-500 sm:p-6 sm:text-sm">
                              Nenhum produto adicionado.
                            </div>
                          ) : (
                            selectedComanda.itens.map((item: any) => {
                            const itemSelections = arrayOrEmpty<any>(item.selecoes);
                            const itemVariation = String(item.nome_variacao || "").trim();
                            const itemNote = String(item.observacoes || "").trim();

                            return (
                              <div
                                key={item.id}
                                className={`flex min-w-0 max-w-full items-start justify-between gap-2 overflow-hidden rounded-lg border border-gray-100 p-2 sm:gap-3 sm:p-3 ${item.status === "cancelado" ? "bg-slate-50 opacity-75" : ""}`}
                              >
                                <div className="min-w-0 flex-1 overflow-hidden">
                                  <div className="break-words text-sm font-medium leading-tight text-gray-900 [overflow-wrap:anywhere] sm:text-base">
                                    {item.nome_produto}
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-gray-500 sm:mt-1 sm:gap-1.5 sm:text-xs">
                                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                                      {formatSalaoQuantity(item.quantidade)} x R${" "}
                                      {formatMoney(item.preco_unitario)}
                                    </span>
                                    <span
                                      className={`inline-flex max-w-full rounded-full border px-2 py-0.5 font-bold ${getSalaoStatusStyle(item.status).badge}`}
                                    >
                                      {getSalaoStatusStyle(item.status).label}
                                    </span>
                                  </div>
                                  {itemVariation && (
                                    <div className="mt-1 break-words text-[11px] font-semibold text-slate-700 [overflow-wrap:anywhere] sm:text-xs">
                                      Tamanho: {itemVariation}
                                    </div>
                                  )}
                                  {itemSelections.length > 0 && (
                                    <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/50 p-2">
                                      <div className="text-[10px] font-bold uppercase text-blue-700 sm:text-[11px]">
                                        Adicionais e opções
                                      </div>
                                      <div className="mt-1 space-y-1">
                                        {itemSelections.map((selection, index) => {
                                          const quantity = Number(selection.quantidade || 1);
                                          const extra = Number(selection.preco_contribuicao || 0);

                                          return (
                                            <div
                                              key={selection.id || `${item.id}-selection-${index}`}
                                              className="flex min-w-0 flex-wrap items-start justify-between gap-2 text-[11px] leading-snug text-slate-700 sm:text-xs"
                                            >
                                              <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                                                <span className="font-semibold">
                                                  {selection.nome_grupo || "Opção"}:
                                                </span>{" "}
                                                {selection.nome_opcao || "Opção"}
                                                {quantity > 1 ? ` x${formatSalaoQuantity(quantity)}` : ""}
                                                {selection.fracao ? ` (${selection.fracao})` : ""}
                                              </span>
                                              {extra > 0 && (
                                                <span className="shrink-0 break-words text-right font-semibold text-slate-900 [overflow-wrap:anywhere]">
                                                  + R$ {formatMoney(extra)}
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {(item.adicionado_por || item.autor_label) && (
                                    <div className="mt-1 break-words text-[11px] font-semibold text-blue-700 [overflow-wrap:anywhere] sm:text-xs">
                                      {salaoItemAuthorLabel(item)}
                                    </div>
                                  )}
                                  {itemNote && (
                                    <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 p-2 text-[11px] text-amber-950 sm:text-xs">
                                      <MessageSquareText className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-700" />
                                      <div className="min-w-0 flex-1">
                                        <div className="font-bold uppercase text-amber-700">
                                          Observação
                                        </div>
                                        <p className="mt-0.5 whitespace-pre-wrap break-words font-medium [overflow-wrap:anywhere]">
                                          {itemNote}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex max-w-[82px] shrink-0 flex-col items-end gap-1.5 sm:max-w-none sm:gap-2">
                                  <div className="break-words text-right text-xs font-semibold text-gray-900 [overflow-wrap:anywhere] sm:text-sm">
                                    R$ {formatMoney(item.preco_total)}
                                  </div>
                                  <button
                                    type="button"
                                    title="Editar produto da mesa"
                                    aria-label={`Editar ${item.nome_produto}`}
                                    onClick={() => void openEditComandaItem(item)}
                                    disabled={
                                      item.status === "cancelado" ||
                                      !["aberta", "aguardando_conta"].includes(
                                        selectedComanda.status,
                                      ) ||
                                      actionBusy === `load-edit-item-${item.id}` ||
                                      actionBusy === `edit-item-${item.id}`
                                    }
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 sm:h-8 sm:w-8"
                                  >
                                    {actionBusy === `load-edit-item-${item.id}` ||
                                    actionBusy === `edit-item-${item.id}` ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" />
                                    ) : (
                                      <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    title="Remover produto da mesa"
                                    aria-label={`Remover ${item.nome_produto}`}
                                    onClick={() => setDeleteItemTarget(item)}
                                    disabled={
                                      item.status === "cancelado" ||
                                      !["aberta", "aguardando_conta"].includes(
                                        selectedComanda.status,
                                      ) ||
                                      actionBusy === `remove-item-${item.id}`
                                    }
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-40 sm:h-8 sm:w-8"
                                  >
                                    {actionBusy === `remove-item-${item.id}` ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                            })
                          )}
                        </div>
                      </div>

                      <div
                        className={
                          comandaModule === "pedidos"
                            ? "mt-2 grid shrink-0 gap-1.5 sm:mt-5 sm:flex sm:flex-wrap sm:gap-2"
                            : "hidden"
                        }
                      >
                        <button
                          onClick={() => openSalaoPrintModal(selectedComanda)}
                          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 sm:min-h-12 sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm"
                        >
                          <Printer className="h-4 w-4" />
                          Imprimir comanda
                        </button>
                        <button
                          onClick={() => void closeAccount(selectedComanda)}
                          disabled={
                            ["fechada", "paga", "cancelada"].includes(selectedComanda.status) ||
                            actionBusy === `close-${selectedComanda.id}`
                          }
                          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50 sm:min-h-12 sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm"
                          style={{ backgroundColor: PRIMARY }}
                        >
                          {actionBusy === `close-${selectedComanda.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Receipt className="h-4 w-4" />
                          )}
                          {actionBusy === `close-${selectedComanda.id}`
                            ? "Fechando mesa..."
                            : "Fechar mesa"}
                        </button>
                        {["fechada", "aguardando_conta"].includes(
                          selectedComanda.status,
                        ) && (
                          <button
                            onClick={() => {
                              setPaymentMethod("dinheiro");
                              setPaymentLines([{
                                forma_pagamento: "dinheiro",
                                valor: formatCents(toCents(selectedComanda.total || 0)),
                              }]);
                              resetFiadoPaymentContact();
                              setPaymentTarget(selectedComanda);
                            }}
                            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white sm:min-h-12 sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm"
                          >
                            <CreditCard className="h-4 w-4" />
                            Confirmar pagamento
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      className={
                          comandaModule === "pedidos"
                          ? "order-1 min-w-0 max-w-full self-start overflow-hidden rounded-lg border border-gray-100 bg-gray-50 p-2 shadow-sm lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:grid lg:h-full lg:min-h-0 lg:self-stretch lg:grid-rows-[auto_auto_minmax(0,1fr)_auto] lg:rounded-xl lg:p-4"
                          : "hidden"
                      }
                    >
                      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900 lg:mb-3 lg:gap-2">
                        <ShoppingCart className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                        Adicionar produto
                      </div>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 sm:left-3 sm:h-4 sm:w-4" />
                        <input
                          value={productSearch}
                          onChange={(event) =>
                            setProductSearch(event.target.value)
                          }
                          placeholder="Buscar produto"
                          className="h-9 w-full rounded-lg border border-gray-300 pl-8 pr-2.5 text-sm sm:h-12 sm:rounded-xl sm:pl-9 sm:pr-3 sm:text-base"
                        />
                      </div>

                      <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto overscroll-contain sm:mt-3 sm:max-h-64 sm:space-y-2 lg:min-h-0 lg:max-h-none lg:overflow-y-scroll lg:pr-2 [scrollbar-gutter:stable]">
                        {searchingProducts ? (
                          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-500 sm:gap-2 sm:p-3 sm:text-sm">
                            <Loader2 className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" />
                            Buscando produtos...
                          </div>
                        ) : productList.length > 0 ? (
                          productList.map((product) => (
                          <button
                            key={product.id}
                            onClick={() =>
                              void selectProductForComanda(product)
                            }
                            aria-pressed={selectedProductId === product.id}
                            className={`flex w-full min-w-0 max-w-full items-center justify-between gap-2 overflow-hidden rounded-lg border p-2 text-left transition-colors sm:gap-3 sm:p-3 ${
                              selectedProductId === product.id
                                ? "border-blue-400 bg-blue-50 shadow-sm ring-1 ring-blue-100"
                                : "border-gray-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <div className="break-words text-sm font-medium leading-tight text-gray-900 [overflow-wrap:anywhere]">
                                {productName(product)}
                              </div>
                              <div className="break-words text-[11px] leading-tight text-gray-500 [overflow-wrap:anywhere] sm:text-xs">
                                {product.modo_compra === "configuravel"
                                  ? "Personalizar adicionais"
                                  : product.categoria_nome ||
                                    product.categoria_caminho ||
                                    "Sem categoria"}
                              </div>
                            </div>
                            <div className="max-w-[72px] shrink-0 break-words text-right text-xs font-semibold text-gray-900 [overflow-wrap:anywhere] sm:max-w-none sm:text-sm">
                              R$ {formatMoney(productPrice(product))}
                            </div>
                          </button>
                          ))
                        ) : (
                          <div className="rounded-lg border border-gray-200 bg-white p-2 text-center text-xs text-gray-500 sm:p-3 sm:text-sm">
                            Nenhum produto encontrado.
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 bg-gray-50 lg:border-t lg:border-gray-200 lg:pt-3">
                      {productSearch.trim() &&
                        !searchingProducts &&
                        productSearchTotal > productList.length && (
                          <div className="mt-2 text-xs text-gray-500">
                            Mostrando {productList.length} de{" "}
                            {productSearchTotal} produtos encontrados.
                          </div>
                        )}

                      {configurationLoading && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 sm:mt-3 sm:gap-2 sm:text-sm">
                          <Loader2 className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" />{" "}
                          Carregando variações e adicionais...
                        </div>
                      )}
                      <div className="mt-2 grid grid-cols-[72px_minmax(0,1fr)] gap-1.5 sm:mt-3 sm:grid-cols-[92px_1fr] sm:gap-2">
                        <input
                          value={itemQuantity}
                          onChange={(event) =>
                            setItemQuantity(sanitizeQuantityInput(event.target.value))
                          }
                          className="h-9 rounded-lg border border-gray-300 px-2.5 text-sm sm:h-12 sm:rounded-xl sm:px-3 sm:text-base"
                          inputMode="decimal"
                          pattern="[0-9]*[,.]?[0-9]*"
                          aria-label="Quantidade do produto"
                          placeholder="Qtd."
                        />
                        <input
                          value={itemNotes}
                          onChange={(event) => setItemNotes(event.target.value)}
                          className="h-9 min-w-0 rounded-lg border border-gray-300 px-2.5 text-sm sm:h-12 sm:rounded-xl sm:px-3 sm:text-base"
                          placeholder="Observação"
                        />
                      </div>
                      <button
                        onClick={() => void addProductToComanda()}
                        disabled={
                          !selectedProduct ||
                          addingItem ||
                          configurationLoading ||
                          !canAdminAddItems
                        }
                        className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50 sm:mt-3 sm:min-h-12 sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm"
                        style={{ backgroundColor: PRIMARY }}
                      >
                        {addingItem ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        {addingItem
                          ? "Adicionando..."
                          : selectedComanda.status === "aguardando_conta"
                            ? "Adicionar pelo admin"
                            : "Adicionar à mesa"}
                      </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">
                  Selecione uma comanda.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            className="grid"
            style={{
              gap: kdsCardGap,
              gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${kdsCardGridMinWidth}px), 1fr))`,
            }}
          >
            {kds.map((item) => (
              <div
                key={item.id}
                ref={(element) => setKdsCardRef(item.id, element)}
                tabIndex={0}
                onClick={() => setSelectedKdsId(item.id)}
                onFocus={() => setSelectedKdsId(item.id)}
                aria-current={selectedKdsId === item.id ? "true" : undefined}
                className={`min-w-0 max-w-full overflow-hidden border shadow-sm outline-none transition-all ${getSalaoStatusStyle(item.status).card} ${
                  selectedKdsId === item.id
                    ? "border-blue-600 ring-4 ring-blue-300"
                    : "hover:border-blue-300"
                }`}
                style={{
                  borderRadius: kdsCardRadius,
                  padding: kdsCardPadding,
                }}
              >
                <div
                  className="flex min-w-0 items-start justify-between"
                  style={{ gap: 12 * kdsCardScale }}
                >
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div
                      className="break-words font-semibold text-gray-900 [overflow-wrap:anywhere]"
                      style={{ fontSize: 14 * kdsCardScale, lineHeight: 1.25 }}
                    >
                      {item.nome_produto}
                    </div>
                    <div
                      className="break-words text-gray-500 [overflow-wrap:anywhere]"
                      style={{ fontSize: 12 * kdsCardScale, lineHeight: 1.3 }}
                    >
                      Mesa {item.mesa?.numero} · {item.numero_comanda}
                    </div>
                    {item.nome_variacao && (
                      <div
                        className="break-words font-semibold text-slate-700 [overflow-wrap:anywhere]"
                        style={{
                          marginTop: 4 * kdsCardScale,
                          fontSize: 11 * kdsCardScale,
                          lineHeight: 1.3,
                        }}
                      >
                        Variação: {item.nome_variacao}
                      </div>
                    )}
                  </div>
                  <span
                    className={`max-w-[88px] shrink-0 break-words rounded-full border text-center font-bold [overflow-wrap:anywhere] sm:max-w-none ${getSalaoStatusStyle(item.status).badge}`}
                    style={{
                      padding: `${4 * kdsCardScale}px ${8 * kdsCardScale}px`,
                      fontSize: 11 * kdsCardScale,
                      lineHeight: 1.2,
                    }}
                  >
                    {getSalaoStatusStyle(item.status).label}
                  </span>
                </div>
                {arrayOrEmpty<any>(item.selecoes).length > 0 && (
                  <div
                    className="rounded-lg border border-blue-100 bg-white/80"
                    style={{
                      marginTop: 12 * kdsCardScale,
                      padding: `${kdsSectionPaddingY}px ${kdsSectionPaddingX}px`,
                    }}
                  >
                    <div
                      className="font-bold uppercase text-blue-700"
                      style={{ fontSize: 11 * kdsCardScale }}
                    >
                      Adicionais e opções
                    </div>
                    <div
                      className="space-y-1"
                      style={{ marginTop: 6 * kdsCardScale }}
                    >
                      {arrayOrEmpty<any>(item.selecoes).map((selection, index) => {
                        const quantity = Number(selection.quantidade || 1);
                        const extra = Number(selection.preco_contribuicao || 0);
                        return (
                          <div
                            key={selection.id || `${item.id}-selection-${index}`}
                            className="flex min-w-0 flex-wrap items-start justify-between text-slate-700"
                            style={{
                              gap: 12 * kdsCardScale,
                              fontSize: 12 * kdsCardScale,
                              lineHeight: 1.3,
                            }}
                          >
                            <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                              <span className="font-semibold">{selection.nome_grupo || "Opção"}:</span>{" "}
                              {selection.nome_opcao || "Opção"}
                              {quantity > 1 ? ` x${formatSalaoQuantity(quantity)}` : ""}
                              {selection.fracao ? ` (${selection.fracao})` : ""}
                            </span>
                            {extra > 0 && (
                              <span className="shrink-0 break-words text-right font-semibold text-slate-900 [overflow-wrap:anywhere]">
                                + R$ {formatMoney(extra)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {String(item.observacoes || "").trim() && (
                  <div
                    className="flex items-start rounded-lg border border-amber-200 bg-white/80 text-amber-950"
                    style={{
                      gap: 8 * kdsCardScale,
                      marginTop: 12 * kdsCardScale,
                      padding: `${kdsSectionPaddingY}px ${kdsSectionPaddingX}px`,
                      fontSize: 13 * kdsCardScale,
                      lineHeight: 1.35,
                    }}
                  >
                    <MessageSquareText
                      className="mt-0.5 flex-none text-amber-700"
                      style={{
                        height: 16 * kdsCardScale,
                        width: 16 * kdsCardScale,
                      }}
                    />
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div
                        className="font-bold uppercase text-amber-700"
                        style={{ fontSize: 11 * kdsCardScale }}
                      >
                        Observação
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap break-words font-medium [overflow-wrap:anywhere]">
                        {String(item.observacoes).trim()}
                      </p>
                    </div>
                  </div>
                )}
                <div
                  className="flex flex-wrap"
                  style={{
                    gap: 8 * kdsCardScale,
                    marginTop: 16 * kdsCardScale,
                  }}
                >
                  {["recebido", "preparando", "pronto", "entregue"].map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() => void updateKds(item, status)}
                        disabled={actionBusy.startsWith(`kds-${item.id}-`)}
                        className="inline-flex items-center rounded-lg border border-gray-200 font-semibold capitalize text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        style={{
                          minHeight: 40 * kdsCardScale,
                          gap: 4 * kdsCardScale,
                          padding: `${8 * kdsCardScale}px ${12 * kdsCardScale}px`,
                          fontSize: 12 * kdsCardScale,
                        }}
                      >
                        {actionBusy === `kds-${item.id}-${status}` && (
                          <Loader2
                            className="animate-spin"
                            style={{
                              height: 12 * kdsCardScale,
                              width: 12 * kdsCardScale,
                            }}
                          />
                        )}
                        {status}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {!kdsFullscreen && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1 shadow-[0_-6px_16px_rgba(15,23,42,0.09)] backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-3 gap-0.5">
            {salaoTabs.map(({ id, Icon, mobileLabel, count }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`relative flex min-h-10 flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 text-[9px] font-extrabold transition-colors ${
                    active
                      ? "bg-[#122a4c] text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="leading-tight">{mobileLabel}</span>
                  {Number(count) > 0 && (
                    <span
                      className={`absolute right-2 top-1 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[8px] font-black ${
                        active
                          ? "bg-white text-[#122a4c]"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}
      {paymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-950">
                  Meio de pagamento
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Selecione como a conta da mesa foi paga para registrar o fluxo correto no caixa.
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  Total: R$ {formatMoney(paymentTarget.total)}
                </p>
              </div>
            </div>
            {(() => {
              const totalCents = toCents(paymentTarget.total || 0);
              const paidCents = paymentLines.reduce((sum, line) => sum + parseCurrencyInputCents(line.valor), 0);
              const remainingCents = Math.max(0, totalCents - paidCents);
              const isComplete = totalCents > 0 && paidCents === totalCents;
              const isFiadoSelected = paymentLines.some((line) => line.forma_pagamento === "fiado");
              const quickContactName = compactText(fiadoQuickContact.nome || inferredFiadoQuickContact.nome);
              const quickContactPhone = compactText(fiadoQuickContact.telefone || inferredFiadoQuickContact.telefone);
              const hasFiadoPerson = Boolean(fiadoSelectedContact?.id) || Boolean(quickContactName && onlyDigits(quickContactPhone).length >= 8);
              const canAddLine = !isFiadoSelected && !isComplete && paymentLines.length < 8 && paymentLines.every((line) => line.forma_pagamento && parseCurrencyInputCents(line.valor) > 0);
              const hasInvalidLine = paymentLines.some((line) => {
                const valueCents = parseCurrencyInputCents(line.valor);
                return (Boolean(line.forma_pagamento) || valueCents > 0) && (!line.forma_pagamento || valueCents <= 0);
              });
              const updateLine = (index: number, patch: Partial<SalaoPaymentLine>) => {
                setPaymentLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
              };
              const updateLineValue = (index: number, rawValue: string) => {
                setPaymentLines((current) => {
                  const otherLinesTotal = current.reduce((sum, line, lineIndex) => sum + (lineIndex === index ? 0 : parseCurrencyInputCents(line.valor)), 0);
                  const nextCents = Math.min(parseCurrencyInputCents(rawValue), Math.max(0, totalCents - otherLinesTotal));
                  return current.map((line, lineIndex) => lineIndex === index ? { ...line, valor: nextCents > 0 ? formatCents(nextCents) : "" } : line);
                });
              };

              return (
                <>
                  <div className="mt-5 space-y-2">
                    {paymentLines.map((line, index) => (
                      <div key={index} className="grid grid-cols-[1fr_132px_36px] gap-2">
                        <select
                          value={line.forma_pagamento}
                          onChange={(event) => {
                            const nextMethod = event.target.value;
                            if (nextMethod === "fiado") {
                              setPaymentMethod("fiado");
                              setPaymentLines([{
                                forma_pagamento: "fiado",
                                valor: formatCents(totalCents),
                              }]);
                              return;
                            }
                            if (line.forma_pagamento === "fiado") resetFiadoPaymentContact();
                            updateLine(index, { forma_pagamento: nextMethod });
                            setPaymentMethod(nextMethod || paymentMethod);
                          }}
                          disabled={actionBusy === `payment-${paymentTarget.id}`}
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-60"
                        >
                          <option value="">Selecione</option>
                          {availablePaymentMethods.map((method) => (
                            <option key={method.value} value={method.value}>{method.label}</option>
                          ))}
                        </select>
                        <input
                          value={line.valor}
                          onChange={(event) => updateLineValue(index, event.target.value)}
                          inputMode="decimal"
                          disabled={isFiadoSelected || actionBusy === `payment-${paymentTarget.id}`}
                          className="h-11 rounded-xl border border-slate-200 px-3 text-right text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-60"
                          placeholder="0,00"
                        />
                        <button
                          type="button"
                          onClick={() => setPaymentLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}
                          disabled={isFiadoSelected || paymentLines.length === 1 || actionBusy === `payment-${paymentTarget.id}`}
                          className="flex h-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          title="Remover forma"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {isFiadoSelected && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-extrabold text-slate-900">Pessoa do fiado</p>
                          <p className="mt-0.5 text-xs font-medium text-slate-600">
                            Escolha um contato existente ou informe nome e telefone para criar um contato rápido.
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            value={fiadoContactQuery}
                            onChange={(event) => {
                              setFiadoContactQuery(event.target.value);
                              setFiadoSelectedContact(null);
                            }}
                            disabled={actionBusy === `payment-${paymentTarget.id}`}
                            className="h-11 w-full rounded-xl border border-amber-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-amber-400 disabled:opacity-60"
                            placeholder="Buscar por nome ou telefone"
                          />
                        </div>
                        {(fiadoContactLoading || fiadoContacts.length > 0) && (
                          <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-amber-200 bg-white">
                            {fiadoContactLoading ? (
                              <div className="flex items-center gap-2 px-3 py-3 text-xs font-semibold text-slate-500">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Buscando contatos...
                              </div>
                            ) : (
                              fiadoContacts.map((contact) => (
                                <button
                                  key={contact.id}
                                  type="button"
                                  onClick={() => chooseFiadoContact(contact)}
                                  className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-amber-50"
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-bold text-slate-800">{contact.nome}</span>
                                    <span className="block truncate text-xs font-medium text-slate-500">{contact.telefone}</span>
                                  </span>
                                  {Number(contact.fiado_saldo_aberto || 0) > 0 && (
                                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">
                                      R$ {formatMoney(contact.fiado_saldo_aberto)}
                                    </span>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                        {(inferredFiadoQuickContact.nome || inferredFiadoQuickContact.telefone) && !fiadoSelectedContact && (
                          <button
                            type="button"
                            onClick={useFiadoQuickContactFromSearch}
                            disabled={actionBusy === `payment-${paymentTarget.id}`}
                            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Usar como contato rápido
                          </button>
                        )}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <input
                          value={fiadoQuickContact.nome}
                          onChange={(event) => {
                            setFiadoSelectedContact(null);
                            setFiadoQuickContact((current) => ({ ...current, nome: event.target.value }));
                          }}
                          disabled={actionBusy === `payment-${paymentTarget.id}`}
                          className="h-11 rounded-xl border border-amber-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-amber-400 disabled:opacity-60"
                          placeholder="Nome"
                        />
                        <input
                          value={fiadoQuickContact.telefone}
                          onChange={(event) => {
                            setFiadoSelectedContact(null);
                            setFiadoQuickContact((current) => ({ ...current, telefone: event.target.value }));
                          }}
                          inputMode="tel"
                          disabled={actionBusy === `payment-${paymentTarget.id}`}
                          className="h-11 rounded-xl border border-amber-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-amber-400 disabled:opacity-60"
                          placeholder="Telefone"
                        />
                      </div>
                      {fiadoSelectedContact?.id && (
                        <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-emerald-700">
                          Contato selecionado: {fiadoSelectedContact.nome}
                        </p>
                      )}
                    </div>
                  )}
                  {canAddLine && (
                    <button
                      type="button"
                      onClick={() => setPaymentLines((current) => [...current, { forma_pagamento: "", valor: "" }])}
                      disabled={actionBusy === `payment-${paymentTarget.id}`}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar forma
                    </button>
                  )}
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Resta pagar</span>
                      <span className={isComplete ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                        R$ {formatCents(remainingCents)}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between text-sm font-semibold text-slate-800">
                      <span>Total da mesa</span>
                      <span>R$ {formatMoney(paymentTarget.total)}</span>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <button
                      onClick={() => {
                        setPaymentTarget(null);
                        setPaymentLines([]);
                        resetFiadoPaymentContact();
                      }}
                      disabled={actionBusy === `payment-${paymentTarget.id}`}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => void confirmPayment(paymentTarget)}
                      disabled={actionBusy === `payment-${paymentTarget.id}` || !isComplete || hasInvalidLine || (isFiadoSelected && !hasFiadoPerson)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {actionBusy === `payment-${paymentTarget.id}` && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Confirmar pagamento
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
      {closeMesaTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-950">
                  Fechar mesa {closeMesaTarget.numero || closeMesaTarget.mesa?.numero}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Ao fechar a mesa, os clientes não poderão fazer novos pedidos nela. O PIN atual será invalidado imediatamente.
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {closeMesaTarget.comanda_aberta?.total || closeMesaTarget.total
                    ? `Total atual: R$ ${formatMoney(closeMesaTarget.comanda_aberta?.total || closeMesaTarget.total)}`
                    : "Se não houver itens, a mesa será liberada."}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => setCloseMesaTarget(null)}
                disabled={Boolean(actionBusy)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={() => void closeMesa(closeMesaTarget)}
                disabled={Boolean(actionBusy)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#122a4c] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {actionBusy === `close-${closeMesaTarget.comanda_aberta?.id || closeMesaTarget.id}` && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Fechar mesa
              </button>
            </div>
          </div>
        </div>
      )}
      {qrDownloadMesa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-extrabold text-slate-950">
              Baixar arte do QR Code
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Você quer baixar a arte com o QR atual da mesa ou criar um novo?
              Ao criar outro, os QR Codes impressos anteriormente deixam de
              funcionar.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => void downloadQrCode(qrDownloadMesa, false)}
                disabled={Boolean(actionBusy)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-60"
              >
                Baixar arte atual
              </button>
              <button
                onClick={() => void downloadQrCode(qrDownloadMesa, true)}
                disabled={Boolean(actionBusy)}
                className="rounded-xl bg-[#122a4c] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                Criar e baixar novo
              </button>
            </div>
            <button
              onClick={() => setQrDownloadMesa(null)}
              disabled={Boolean(actionBusy)}
              className="mt-3 w-full rounded-xl px-4 py-2 text-sm font-bold text-slate-500"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {deleteMesaTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-950">
                  Excluir mesa {deleteMesaTarget.numero}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Esta ação remove a mesa da operação. O QR Code desta mesa
                  também será excluído e qualquer QR impresso anteriormente
                  ficará inválido.
                </p>
                <p className="mt-2 text-sm font-semibold text-red-700">
                  A exclusão será bloqueada se houver cliente, pedidos, conta
                  solicitada ou pagamento pendente.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => setDeleteMesaTarget(null)}
                disabled={Boolean(actionBusy)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={() => void deleteMesa(deleteMesaTarget)}
                disabled={Boolean(actionBusy)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {actionBusy === `delete-${deleteMesaTarget.id}` && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Excluir mesa
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteItemTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-950">
                  Excluir produto da mesa?
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Confirme se deseja remover este produto da comanda da mesa.
                </p>
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="font-bold text-slate-900">
                    {formatSalaoQuantity(deleteItemTarget.quantidade)}x {deleteItemTarget.nome_produto}
                    {deleteItemTarget.nome_variacao ? ` - ${deleteItemTarget.nome_variacao}` : ""}
                  </div>
                  <div className="mt-1 font-semibold text-slate-700">
                    R$ {formatMoney(deleteItemTarget.preco_total)}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => setDeleteItemTarget(null)}
                disabled={Boolean(actionBusy)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={() => void removeItemFromComanda(deleteItemTarget)}
                disabled={Boolean(actionBusy)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {actionBusy === `remove-item-${deleteItemTarget.id}` && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Excluir produto
              </button>
            </div>
          </div>
        </div>
      )}
      {printComandaTarget && (
        <ComandaPrintModeModal
          subtitle={`Comanda ${printComandaTarget.numero_comanda || printComandaTarget.id}`}
          busy={salaoPrintBusy}
          onClose={() => {
            if (!salaoPrintBusy) setPrintComandaTarget(null);
          }}
          onSelect={(mode) => void handleSalaoPrintModeSelected(mode)}
        />
      )}
      {kitchenPrintSelection && (
        <KitchenPrintSelectionModal
          subtitle="Novos produtos ficam marcados por padrão. Produtos já impressos ficam desmarcados."
          items={kitchenPrintSelection.selectionItems}
          busy={salaoPrintBusy}
          onClose={() => {
            if (!salaoPrintBusy) setKitchenPrintSelection(null);
          }}
          onPrint={(itemKeys) => void handlePrintSelectedSalaoKitchenItems(itemKeys)}
        />
      )}
      {editingSimpleItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="break-words text-base font-extrabold text-slate-950 [overflow-wrap:anywhere]">
                  Editar {editingSimpleItem.item.nome_produto}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Ajuste a quantidade ou observação deste item.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSimpleItem(null)}
                disabled={actionBusy === `edit-item-${editingSimpleItem.item.id}`}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Fechar edição"
              >
                Fechar
              </button>
            </div>
            <label className="mt-5 block">
              <span className="mb-1.5 block text-sm font-bold text-slate-800">
                Quantidade
              </span>
              <input
                value={editingSimpleItem.quantity}
                onChange={(event) =>
                  setEditingSimpleItem((current) =>
                    current ? { ...current, quantity: event.target.value } : current,
                  )
                }
                inputMode="decimal"
                className="h-12 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#122a4c]"
              />
            </label>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-bold text-slate-800">
                Observação
              </span>
              <textarea
                value={editingSimpleItem.notes}
                onChange={(event) =>
                  setEditingSimpleItem((current) =>
                    current ? { ...current, notes: event.target.value } : current,
                  )
                }
                maxLength={500}
                className="min-h-24 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#122a4c]"
                placeholder="Ex.: sem cebola, molho separado..."
              />
            </label>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setEditingSimpleItem(null)}
                disabled={actionBusy === `edit-item-${editingSimpleItem.item.id}`}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void saveSimpleComandaItemEdit()}
                disabled={actionBusy === `edit-item-${editingSimpleItem.item.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#122a4c] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {actionBusy === `edit-item-${editingSimpleItem.item.id}` && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Salvar edição
              </button>
            </div>
          </div>
        </div>
      )}
      {configuringProduct && (
        <SalaoProductConfiguratorModal
          product={configuringProduct.product}
          configuration={configuringProduct.configuration}
          busy={addingItem}
          onClose={() => setConfiguringProduct(null)}
          onConfirm={(item) => void addConfiguredProductToComanda(item)}
        />
      )}
      {editingConfiguredItem && (
        <SalaoProductConfiguratorModal
          product={editingConfiguredItem.product}
          configuration={editingConfiguredItem.configuration}
          initialItem={{
            variationId: editingConfiguredItem.item.variacao_produto_loja_id || "",
            selections: editingConfiguredItem.item.selecoes || [],
            quantity: Number(editingConfiguredItem.item.quantidade || 1),
            notes: String(editingConfiguredItem.item.observacoes || ""),
          }}
          busy={actionBusy === `edit-item-${editingConfiguredItem.item.id}`}
          title="Editar item"
          description="Corrija tamanho, adicionais, quantidade ou observação."
          confirmLabel="Salvar edição"
          busyLabel="Salvando..."
          onClose={() => setEditingConfiguredItem(null)}
          onConfirm={(item) => void saveConfiguredComandaItemEdit(item)}
        />
      )}
    </div>
  );
}
