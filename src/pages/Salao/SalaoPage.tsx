import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Armchair,
  CircleAlert,
  ChefHat,
  ClipboardList,
  CreditCard,
  Download,
  Printer,
  KeyRound,
  Loader2,
  MessageSquareText,
  Plus,
  QrCode,
  RefreshCw,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
  UserCheck,
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
import { productsService } from "@/features/products";
import { showSystemNotice } from "@/shared/components/SystemNoticeModal";
import api from "@/shared/lib/api";
import { SalaoProductConfiguratorModal } from "./SalaoProductConfiguratorModal";

const PRIMARY = "#122a4c";
const SALAO_PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_debito", label: "Cartão de débito" },
  { value: "cartao_credito", label: "Cartão de crédito" },
];

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
    Number(activeComanda?.novos_itens || 0) > 0 ||
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

const formatMoney = (value: unknown) =>
  Number(value || 0)
    .toFixed(2)
    .replace(".", ",");

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
  const [comandas, setComandas] = useState<any[]>([]);
  const [kds, setKds] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [currentStore, setCurrentStore] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingTable, setCreatingTable] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [selectedComanda, setSelectedComanda] = useState<any | null>(null);
  const [comandaModule, setComandaModule] = useState<
    "mesa" | "participantes" | "pedidos"
  >("mesa");
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
  const [configurationLoading, setConfigurationLoading] = useState(false);
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemNotes, setItemNotes] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [latestPin, setLatestPin] = useState("");
  const [realtimeMesaId, setRealtimeMesaId] = useState("");
  const [qrDownloadMesa, setQrDownloadMesa] = useState<any | null>(null);
  const [deleteMesaTarget, setDeleteMesaTarget] = useState<any | null>(null);
  const [closeMesaTarget, setCloseMesaTarget] = useState<any | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");
  const loadingRef = useRef(false);
  const queuedManualRefreshRef = useRef(false);
  const selectedComandaIdRef = useRef("");
  const hasLoadedRef = useRef(false);
  const productsLoadedRef = useRef(false);
  const soundEnabledRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const realtimeRefreshTimeoutRef = useRef<number | null>(null);
  const lastRealtimeAlertAtRef = useRef(0);
  const comandaDetailRef = useRef<HTMLDivElement | null>(null);

  const loadCurrentStore = useCallback(async () => {
    if (!user?.loja_id) return null;
    if (currentStore?.id === user.loja_id) return currentStore;

    const response = await api.get(`/lojas/${user.loja_id}`);
    const store = response.data?.data || response.data;
    setCurrentStore(store);
    return store;
  }, [currentStore, user?.loja_id]);

  useEffect(() => {
    selectedComandaIdRef.current = selectedComanda?.id || "";
  }, [selectedComanda?.id]);

  useEffect(() => {
    void loadCurrentStore().catch(() => undefined);
  }, [loadCurrentStore]);

  const playRealtimeAlert = useCallback(() => {
    if (!soundEnabledRef.current) return;
    const audio = audioContextRef.current;
    if (!audio) return;
    if (audio.state === "suspended") void audio.resume();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.25);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.25);
  }, []);

  const load = useCallback(
    async (
      options: {
        silent?: boolean;
        includeProducts?: boolean;
        manual?: boolean;
      } = {},
    ) => {
      if (!user?.loja_id) return;
      if (loadingRef.current) {
        if (options.manual) queuedManualRefreshRef.current = true;
        return;
      }
      loadingRef.current = true;
      const shouldShowLoading = !options.silent && !hasLoadedRef.current;
      if (shouldShowLoading) setLoading(true);
      if (options.manual) setRefreshing(true);
      try {
        const selectedComandaId = selectedComandaIdRef.current;
        const [
          tablesPayload,
          tabsPayload,
          kdsPayload,
          productsPayload,
          selectedComandaPayload,
        ] = await Promise.all([
          salaoService.listMesas({ loja_id: user.loja_id, per_page: 100 }),
          salaoService.listComandas({ loja_id: user.loja_id, per_page: 100 }),
          salaoService.listKds({ loja_id: user.loja_id }),
          options.includeProducts || !productsLoadedRef.current
            ? productsService.getStoreProductsPage(
                { page: 1, perPage: 100, activeOnly: true },
                { forceRefresh: true },
              )
            : Promise.resolve(null),
          selectedComandaId
            ? salaoService.getComanda(selectedComandaId).catch(() => null)
            : Promise.resolve(null),
        ]);
        setMesas(sortMesasByNumber(unwrapList(tablesPayload)));
        setComandas(
          unwrapList(tabsPayload).filter(
            (item: any) => !["paga", "cancelada"].includes(item.status),
          ),
        );
        setKds(unwrapList(kdsPayload));
        if (
          selectedComandaPayload &&
          selectedComandaIdRef.current === selectedComandaId
        ) {
          setSelectedComanda(selectedComandaPayload);
        }
        if (productsPayload) {
          setProducts(productsPayload.products || []);
          productsLoadedRef.current = true;
        }
        hasLoadedRef.current = true;
      } catch (error: any) {
        if (!options.silent) {
          showSystemNotice(
            error?.response?.data?.message ||
              error?.message ||
              "Não foi possível carregar o salão.",
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        loadingRef.current = false;
        if (queuedManualRefreshRef.current) {
          queuedManualRefreshRef.current = false;
          void load({ manual: true, includeProducts: true });
        }
      }
    },
    [user?.loja_id],
  );

  useEffect(() => {
    void load({ includeProducts: true });
  }, [load]);

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
    const enableSound = () => {
      soundEnabledRef.current = true;
      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass)
          audioContextRef.current = new AudioContextClass();
      }
      if (audioContextRef.current?.state === "suspended")
        void audioContextRef.current.resume();
    };
    window.addEventListener("pointerdown", enableSound, { once: true });
    window.addEventListener("keydown", enableSound, { once: true });
    return () => {
      window.removeEventListener("pointerdown", enableSound);
      window.removeEventListener("keydown", enableSound);
      if (audioContextRef.current) void audioContextRef.current.close();
      audioContextRef.current = null;
    };
  }, []);

  useEffect(() => {
    const lojaId = user?.loja_id;
    const accessToken = localStorage.getItem("token") || "";
    const realtime = lojaId ? createSalaoAdminRealtime(accessToken) : null;
    if (!realtime || !lojaId) return;

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
        const now = Date.now();
        if (now - lastRealtimeAlertAtRef.current >= 1200) {
          lastRealtimeAlertAtRef.current = now;
          playRealtimeAlert();
        }
        if (realtimeRefreshTimeoutRef.current)
          window.clearTimeout(realtimeRefreshTimeoutRef.current);
        realtimeRefreshTimeoutRef.current = window.setTimeout(() => {
          realtimeRefreshTimeoutRef.current = null;
          void load({ silent: true });
        }, 150);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void load({ silent: true });
      });

    const reconcile = () => void load({ silent: true });
    window.addEventListener("focus", reconcile);
    window.addEventListener("online", reconcile);
    document.addEventListener("visibilitychange", reconcile);

    return () => {
      window.removeEventListener("focus", reconcile);
      window.removeEventListener("online", reconcile);
      document.removeEventListener("visibilitychange", reconcile);
      if (realtimeRefreshTimeoutRef.current)
        window.clearTimeout(realtimeRefreshTimeoutRef.current);
      void realtime.removeChannel(channel);
    };
  }, [load, playRealtimeAlert, user?.loja_id]);

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
      await load();
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
      setSelectedComanda(result);
      setComandaModule("mesa");
      if (result?.pin) {
        setLatestPin(result.pin);
        showSystemNotice(`Comanda aberta. PIN da mesa: ${result.pin}`);
      }
      setTab("comandas");
      await load();
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
      setComandaModule("mesa");
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

    setTab("comandas");
    await selectComanda(mesa.comanda_aberta);
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
      await load({ manual: true });
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
      await load();
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

  const addConfiguredProductToComanda = async (item: {
    variationId: string;
    selections: Array<{ group: any; option: any; quantity: number }>;
    quantity: number;
    notes: string;
  }) => {
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
        selecoes: item.selections.map(
          ({ group, option, quantity: optionQuantity }) => ({
            grupo_id: group.id,
            opcao_id: option.id,
            quantidade: optionQuantity,
            nome_grupo: group.nome,
            nome_opcao: option.nome,
            preco_unitario: Number(option.preco_adicional || 0),
            preco_contribuicao:
              Number(option.preco_adicional || 0) * optionQuantity,
          }),
        ),
      });
      setSelectedComanda(updated);
      setConfiguringProduct(null);
      setComandaModule("pedidos");
      await load();
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

  const closeAccount = async (comanda: any) => {
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
      if (result?.mesa_liberada) {
        setSelectedComanda(null);
      } else {
        const detail = await salaoService.getComanda(comanda.id);
        setSelectedComanda(detail);
      }
      setCloseMesaTarget(null);
      await load({ manual: true });
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
    await closeAccount(comanda);
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
      await load();
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

  const confirmPayment = async (comanda: any) => {
    setActionBusy(`payment-${comanda.id}`);
    try {
      await salaoService.confirmPayment(comanda.id, {
        forma_pagamento: paymentMethod,
      });
      setPaymentTarget(null);
      setSelectedComanda(null);
      await load();
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
      await load();
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

  const printSalaoComanda = (comanda: any) => {
    const printWindow = window.open("", "_blank", "width=420,height=650");
    if (!printWindow) {
      showSystemNotice(
        "Não foi possível abrir a janela de impressão. Verifique se o navegador bloqueou pop-ups.",
      );
      return;
    }

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
    for (const item of arrayOrEmpty<any>(comanda.itens).filter(
      (item) => item.status !== "cancelado",
    )) {
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
          <div class="row product-row"><span>${escapePrintHtml(item.quantidade)}x ${escapePrintHtml(item.nome_produto)}</span><span>R$ ${formatMoney(item.preco_total)}</span></div>
          ${arrayOrEmpty<any>(item.selecoes)
            .map(
              (selection) =>
                `<p class="option">${escapePrintHtml(selection.nome_grupo)}: ${escapePrintHtml(selection.nome_opcao)}</p>`,
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
    const total = arrayOrEmpty<any>(comanda.itens)
      .filter((item) => item.status !== "cancelado")
      .reduce((sum, item) => sum + Number(item.preco_total || 0), 0);
    const splitPeople = Number(comanda.quantidade_pessoas_divisao || 1);
    const dailyTicketNumber = getDailyTicketNumber(comanda);
    const division =
      splitPeople > 1
        ? `<div class="divider"></div><div class="row"><span>Divisão (${splitPeople} pessoas)</span><span>R$ ${formatMoney(total / splitPeople)} por pessoa</span></div>`
        : "";

    printWindow.document.write(`<!DOCTYPE html>
      <html lang="pt-BR"><head><meta charset="UTF-8"><title>Comanda ${escapePrintHtml(comanda.numero_comanda)}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}html,body{width:80mm;min-height:30mm}body{font-family:'Courier New',Courier,monospace;width:80mm;min-height:30mm;max-width:80mm;margin:0 auto;padding:3mm;font-size:16px;font-weight:700;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}body *{color:#000!important;font-weight:700}.center{text-align:center}.bold{font-weight:800}.large{font-size:19px}.divider-solid{border-top:1px solid #000;margin:8px 0}.divider{border-top:1px dashed #000;margin:8px 0}.row{display:flex;justify-content:space-between;gap:8px;margin-bottom:3px}.row-total{display:flex;justify-content:space-between;gap:8px;font-size:18px;font-weight:800;margin-bottom:3px}.person{padding:8px 0}.person-title{font-weight:800;margin-bottom:6px}.subtotal{margin-top:6px;font-weight:800}.option{font-size:14px;margin:0 0 2px 16px}.obs{font-size:22px;line-height:1.12;margin:0 0 7px 16px;font-style:italic}.tag{display:inline-block;border:1px solid #000;padding:1px 6px;font-size:15px;margin:2px 0}.ticket-number{border:2px solid #000;padding:8px 4px;margin:8px 0;text-align:center}.ticket-label{font-size:15px;font-weight:800;letter-spacing:0}.ticket-value{display:block;font-size:42px;line-height:1;font-weight:900;margin-top:3px}.product-row{font-size:26px;line-height:1.12;margin-bottom:7px}.product-row span:first-child{flex:1}.product-row span:last-child{white-space:nowrap}p{margin-bottom:4px}@page{size:80mm 200mm;margin:0}@media print{html,body{width:80mm;min-height:30mm}body{margin:0;padding:3mm}}
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
  };

  const productList = productSearch.trim()
    ? productSearchResults || []
    : products;
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
  const activeTabClass = "bg-white text-gray-900 shadow-sm";
  const tableStatusClass: Record<string, string> = {
    livre: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
    ocupada: "bg-rose-100 text-rose-800 ring-1 ring-rose-200",
    reservada: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    aguardando_conta: "bg-blue-100 text-blue-800 ring-1 ring-blue-200",
    aguardando_garcom: "bg-violet-100 text-violet-800 ring-1 ring-violet-200",
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-3 py-2 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 sm:text-xl">
              Salão
            </h1>
            <p className="text-xs text-gray-500 sm:text-sm">
              Mesas, comandas, atendimento e cozinha.
            </p>
          </div>
          <button
            onClick={() => void load({ manual: true, includeProducts: true })}
            disabled={loading || refreshing}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#122a4c] px-3 py-2 text-xs font-semibold text-white shadow-md shadow-blue-200 hover:bg-[#0b1e38] disabled:opacity-60 sm:min-h-11 sm:px-4 sm:text-sm"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading || refreshing ? "animate-spin" : ""}`}
            />
            {loading || refreshing ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
        <div className="mt-3 flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 scrollbar-hide">
          {[
            ["mesas", Armchair, "Mesas", pendingMesas.length],
            ["comandas", ClipboardList, "Comandas", pendingMesas.length],
            ["kds", ChefHat, "KDS", 0],
          ].map(([id, Icon, label, pendingCount]) => (
            <button
              key={String(id)}
              onClick={() => setTab(id as any)}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold sm:min-h-11 sm:gap-2 sm:px-4 sm:text-sm ${tab === id ? activeTabClass : "text-gray-500"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {Number(pendingCount) > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 pb-20 sm:p-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Carregando salão...
          </div>
        ) : tab === "mesas" ? (
          <div className="space-y-4">
            <div className="flex w-full max-w-sm gap-2">
              <input
                value={newTableNumber}
                onChange={(event) => setNewTableNumber(event.target.value)}
                placeholder="Número da mesa"
                className="h-12 flex-1 rounded-xl border border-gray-300 px-3 text-base"
              />
              <button
                onClick={() => void createMesa()}
                disabled={creatingTable || !newTableNumber.trim()}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: PRIMARY }}
              >
                <Plus className="h-4 w-4" />
                Mesa
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {mesas.map((mesa) => {
                const pendingAction = getMesaPendingAction(mesa);
                const hasOpenComanda = Boolean(mesa.comanda_aberta);
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
                    className={`relative min-h-32 rounded-xl border p-3 pb-14 shadow-sm transition-all ${
                      realtimeMesaId === mesa.id
                        ? "border-emerald-500 bg-emerald-100 ring-4 ring-emerald-200 animate-pulse"
                        : pendingAction?.cardClass || "border-gray-200 bg-white"
                    } ${hasOpenComanda ? "cursor-pointer hover:border-blue-300 hover:shadow-md" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs text-gray-500">Mesa</div>
                        <div className="text-xl font-semibold text-gray-900">
                          {mesa.numero}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${tableStatusClass[mesa.status] || "bg-gray-100 text-gray-700"}`}
                      >
                        {mesa.status?.replace(/_/g, " ")}
                      </span>
                    </div>
                    {pendingAction && (
                      <div
                        className={`mt-2 inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold ${pendingAction.className}`}
                      >
                        <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          Ação pendente: {pendingAction.label}
                        </span>
                      </div>
                    )}
                    {mesa.comanda_aberta && (
                      <div
                        className={`mt-3 space-y-2 rounded-md px-3 py-2 text-xs text-gray-700 ${pendingAction ? "bg-white/60" : "bg-gray-50"}`}
                      >
                        <div>R$ {formatMoney(mesa.comanda_aberta.total)}</div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setCloseMesaTarget(mesa);
                          }}
                          disabled={actionBusy === `close-${mesa.comanda_aberta.id}`}
                          className="inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#122a4c] px-2 py-1 text-xs font-bold text-white disabled:opacity-60"
                        >
                          {actionBusy === `close-${mesa.comanda_aberta.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Receipt className="h-3.5 w-3.5" />
                          )}
                          Fechar mesa
                        </button>
                      </div>
                    )}
                    {!mesa.comanda_aberta && (
                      <div className="mt-3 space-y-1.5 sm:mt-4 sm:space-y-2">
                        <button
                          onClick={() => void openComanda(mesa)}
                          disabled={actionBusy === `open-${mesa.id}`}
                          className="min-h-9 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
                        >
                          {actionBusy === `open-${mesa.id}` ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />{" "}
                              Abrindo...
                            </span>
                          ) : (
                            "Abrir comanda"
                          )}
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      title="Área crítica: excluir mesa"
                      aria-label="Área crítica: excluir mesa"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteMesaTarget(mesa);
                      }}
                      onKeyDown={(event) => event.stopPropagation()}
                      disabled={actionBusy === `delete-${mesa.id}`}
                      className="absolute bottom-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {actionBusy === `delete-${mesa.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : tab === "comandas" ? (
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,360px)_1fr] xl:gap-4">
            <div className="space-y-3">
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
                    className={`min-h-16 w-full rounded-xl border p-3 text-left shadow-sm hover:border-blue-200 active:scale-[0.99] sm:min-h-20 sm:p-4 ${
                      pendingAction
                        ? `${pendingAction.cardClass} ${selectedComanda?.id === comanda.id ? "ring-4 ring-blue-200" : ""}`
                        : selectedComanda?.id === comanda.id
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                          : getSalaoStatusStyle(comanda.status).card
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {comanda.numero_comanda}
                        </div>
                        <div className="text-sm text-gray-500">
                          Mesa {comanda.mesa?.numero}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          R$ {formatMoney(comanda.total)}
                        </div>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold uppercase ${cardStatusClass}`}
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
                        className={`mt-2 inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold ${pendingAction.className}`}
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
              className="scroll-mt-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4"
            >
              {selectedComanda ? (
                <>
                  <div className="sticky top-0 z-30 -mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-gray-100 bg-white px-4 py-2 shadow-sm scrollbar-hide">
                    {[
                      ["mesa", Armchair, "Mesa"],
                      ["pedidos", ShoppingCart, "Produtos e pedidos"],
                      ["participantes", UserCheck, "Participantes"],
                    ].map(([id, Icon, label]) => (
                      <button
                        key={String(id)}
                        onClick={() =>
                          setComandaModule(id as typeof comandaModule)
                        }
                        className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold sm:min-h-11 sm:gap-2 sm:px-3 sm:py-2 sm:text-xs ${comandaModule === id ? "bg-[#122a4c] text-white shadow-sm" : "bg-slate-100 text-slate-600"}`}
                      >
                        <Icon className="h-4 w-4" /> {label}
                      </button>
                    ))}
                  </div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-blue-800" />
                      <span className="text-xs font-semibold text-blue-900">
                        PIN da mesa
                      </span>
                      <span className="text-lg font-extrabold tracking-widest text-blue-950">
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
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2 py-1 text-xs font-semibold text-blue-800 disabled:opacity-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Novo PIN
                    </button>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5">
                    <div className="order-2 lg:order-none">
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
                          comandaModule === "mesa" ||
                          comandaModule === "participantes"
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
                            comandaModule === "participantes"
                              ? "rounded-lg border border-gray-100 bg-gray-50 p-2.5 md:col-span-2 sm:p-3"
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
                            ? "mt-3 space-y-1.5 sm:mt-4 sm:space-y-2"
                            : "hidden"
                        }
                      >
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 sm:mb-3">
                          <ClipboardList className="h-4 w-4" />
                          Pedidos da mesa
                        </div>
                        {(selectedComanda.itens || []).length === 0 ? (
                          <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                            Nenhum produto adicionado.
                          </div>
                        ) : (
                          selectedComanda.itens.map((item: any) => (
                            <div
                              key={item.id}
                              className={`flex items-start justify-between gap-2 rounded-lg border border-gray-100 p-2.5 sm:gap-3 sm:p-3 ${item.status === "cancelado" ? "bg-slate-50 opacity-75" : ""}`}
                            >
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900">
                                  {item.nome_produto}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                                  <span>
                                    {item.quantidade} x R${" "}
                                    {formatMoney(item.preco_unitario)}
                                  </span>
                                  <span
                                    className={`inline-flex rounded-full border px-2 py-0.5 font-bold ${getSalaoStatusStyle(item.status).badge}`}
                                  >
                                    {getSalaoStatusStyle(item.status).label}
                                  </span>
                                </div>
                                {(item.adicionado_por || item.autor_label) && (
                                  <div className="mt-1 text-xs font-semibold text-blue-700">
                                    {salaoItemAuthorLabel(item)}
                                  </div>
                                )}
                                {item.observacoes && (
                                  <div className="mt-1 text-xs text-gray-500">
                                    {item.observacoes}
                                  </div>
                                )}
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-2">
                                <div className="text-sm font-semibold text-gray-900">
                                  R$ {formatMoney(item.preco_total)}
                                </div>
                                <button
                                  type="button"
                                  title="Remover produto da mesa"
                                  aria-label={`Remover ${item.nome_produto}`}
                                  onClick={() => void removeItemFromComanda(item)}
                                  disabled={
                                    item.status === "cancelado" ||
                                    !["aberta", "aguardando_conta"].includes(
                                      selectedComanda.status,
                                    ) ||
                                    actionBusy === `remove-item-${item.id}`
                                  }
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-40"
                                >
                                  {actionBusy === `remove-item-${item.id}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div
                        className={
                          comandaModule === "pedidos"
                            ? "mt-3 grid gap-2 sm:mt-5 sm:flex sm:flex-wrap"
                            : "hidden"
                        }
                      >
                        <button
                          onClick={() => printSalaoComanda(selectedComanda)}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 sm:min-h-12 sm:px-4 sm:text-sm"
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
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 sm:min-h-12 sm:px-4 sm:text-sm"
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
                              setPaymentTarget(selectedComanda);
                            }}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white sm:min-h-12 sm:px-4 sm:text-sm"
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
                          ? "order-1 self-start rounded-xl border border-gray-100 bg-gray-50 p-2.5 shadow-sm lg:order-none lg:sticky lg:top-3 lg:p-3"
                          : "hidden"
                      }
                    >
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <ShoppingCart className="h-4 w-4" />
                        Adicionar produto
                      </div>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          value={productSearch}
                          onChange={(event) =>
                            setProductSearch(event.target.value)
                          }
                          placeholder="Buscar produto"
                          className="h-12 w-full rounded-xl border border-gray-300 pl-9 pr-3 text-base"
                        />
                      </div>

                      <div className="mt-3 max-h-52 space-y-2 overflow-auto sm:max-h-64">
                        {searchingProducts ? (
                          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Buscando produtos...
                          </div>
                        ) : productList.length > 0 ? (
                          productList.map((product) => (
                          <button
                            key={product.id}
                            onClick={() =>
                              void selectProductForComanda(product)
                            }
                            className={`flex w-full items-center justify-between gap-3 rounded-lg border bg-white p-3 text-left ${
                              selectedProductId === product.id
                                ? "border-blue-300"
                                : "border-gray-200"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-gray-900">
                                {productName(product)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {product.modo_compra === "configuravel"
                                  ? "Personalizar adicionais"
                                  : product.categoria_nome ||
                                    product.categoria_caminho ||
                                    "Sem categoria"}
                              </div>
                            </div>
                            <div className="shrink-0 text-sm font-semibold text-gray-900">
                              R$ {formatMoney(productPrice(product))}
                            </div>
                          </button>
                          ))
                        ) : (
                          <div className="rounded-lg border border-gray-200 bg-white p-3 text-center text-sm text-gray-500">
                            Nenhum produto encontrado.
                          </div>
                        )}
                      </div>
                      {productSearch.trim() &&
                        !searchingProducts &&
                        productSearchTotal > productList.length && (
                          <div className="mt-2 text-xs text-gray-500">
                            Mostrando {productList.length} de{" "}
                            {productSearchTotal} produtos encontrados.
                          </div>
                        )}

                      {configurationLoading && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin" />{" "}
                          Carregando variações e adicionais...
                        </div>
                      )}
                      <div className="mt-2 grid grid-cols-[84px_1fr] gap-2 sm:mt-3 sm:grid-cols-[92px_1fr]">
                        <input
                          value={itemQuantity}
                          onChange={(event) =>
                            setItemQuantity(event.target.value)
                          }
                          className="h-12 rounded-xl border border-gray-300 px-3 text-base"
                          inputMode="decimal"
                          placeholder="Qtd."
                        />
                        <input
                          value={itemNotes}
                          onChange={(event) => setItemNotes(event.target.value)}
                          className="h-12 rounded-xl border border-gray-300 px-3 text-base"
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
                        className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 sm:mt-3 sm:min-h-12 sm:px-4 sm:text-sm"
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
                </>
              ) : (
                <div className="text-sm text-gray-500">
                  Selecione uma comanda.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-3">
            {kds.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border p-4 shadow-sm ${getSalaoStatusStyle(item.status).card}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {item.nome_produto}
                    </div>
                    <div className="text-sm text-gray-500">
                      Mesa {item.mesa?.numero} · {item.numero_comanda}
                    </div>
                    {item.nome_variacao && (
                      <div className="mt-1 text-xs font-semibold text-slate-700">
                        Variação: {item.nome_variacao}
                      </div>
                    )}
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-bold ${getSalaoStatusStyle(item.status).badge}`}
                  >
                    {getSalaoStatusStyle(item.status).label}
                  </span>
                </div>
                {arrayOrEmpty<any>(item.selecoes).length > 0 && (
                  <div className="mt-3 rounded-lg border border-blue-100 bg-white/80 px-3 py-2">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-blue-700">
                      Adicionais e opções
                    </div>
                    <div className="mt-1.5 space-y-1">
                      {arrayOrEmpty<any>(item.selecoes).map((selection, index) => {
                        const quantity = Number(selection.quantidade || 1);
                        const extra = Number(selection.preco_contribuicao || 0);
                        return (
                          <div key={selection.id || `${item.id}-selection-${index}`} className="flex items-start justify-between gap-3 text-xs text-slate-700">
                            <span className="min-w-0 break-words">
                              <span className="font-semibold">{selection.nome_grupo || "Opção"}:</span>{" "}
                              {selection.nome_opcao || "Opção"}
                              {quantity > 1 ? ` x${quantity}` : ""}
                              {selection.fracao ? ` (${selection.fracao})` : ""}
                            </span>
                            {extra > 0 && (
                              <span className="shrink-0 font-semibold text-slate-900">
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
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-white/80 px-3 py-2 text-sm text-amber-950">
                    <MessageSquareText className="mt-0.5 h-4 w-4 flex-none text-amber-700" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
                        Observação
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap break-words font-medium">
                        {String(item.observacoes).trim()}
                      </p>
                    </div>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {["recebido", "preparando", "pronto", "entregue"].map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() => void updateKds(item, status)}
                        disabled={actionBusy.startsWith(`kds-${item.id}-`)}
                        className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold capitalize text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        {actionBusy === `kds-${item.id}-${status}` && (
                          <Loader2 className="h-3 w-3 animate-spin" />
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
      {paymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
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
            <div className="mt-5 grid gap-2">
              {SALAO_PAYMENT_METHODS.map((method) => {
                const active = paymentMethod === method.value;
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value)}
                    disabled={actionBusy === `payment-${paymentTarget.id}`}
                    className={`flex min-h-11 items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-bold disabled:opacity-60 ${
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {method.label}
                    {active && (
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => setPaymentTarget(null)}
                disabled={actionBusy === `payment-${paymentTarget.id}`}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={() => void confirmPayment(paymentTarget)}
                disabled={actionBusy === `payment-${paymentTarget.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {actionBusy === `payment-${paymentTarget.id}` && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Confirmar pagamento
              </button>
            </div>
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
      {configuringProduct && (
        <SalaoProductConfiguratorModal
          product={configuringProduct.product}
          configuration={configuringProduct.configuration}
          busy={addingItem}
          onClose={() => setConfiguringProduct(null)}
          onConfirm={(item) => void addConfiguredProductToComanda(item)}
        />
      )}
    </div>
  );
}
