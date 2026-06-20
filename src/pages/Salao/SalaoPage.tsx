import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Armchair,
  ChefHat,
  ClipboardList,
  CreditCard,
  Download,
  KeyRound,
  Loader2,
  Plus,
  QrCode,
  RefreshCw,
  Receipt,
  Search,
  ShoppingCart,
  UserCheck,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import { salaoService } from "@/features/salao/services/salaoService";
import { createSalaoAdminRealtime, salaoTenantTopic } from "@/features/salao/services/salaoRealtime";
import { productsService } from "@/features/products";
import { showSystemNotice } from "@/shared/components/SystemNoticeModal";

const PRIMARY = "#122a4c";

const resolveClientBaseUrl = () => {
  const configured = import.meta.env.VITE_CLIENTE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const { protocol, hostname, port, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") return origin;
  if (hostname === "admin.deliplaytecnologia.com") {
    return "https://cliente.deliplaytecnologia.com";
  }
  if (hostname.startsWith("admin.")) {
    return `${protocol}//${hostname.replace(/^admin\./, "cliente.")}${port ? `:${port}` : ""}`;
  }
  return origin;
};

const CLIENT_BASE_URL = resolveClientBaseUrl();

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

const formatMoney = (value: unknown) =>
  Number(value || 0).toFixed(2).replace(".", ",");

const productName = (product: any) =>
  product?.nome || product?.produto?.nome || "Produto";

const productPrice = (product: any) =>
  Number(product?.preco_promocional || product?.preco || 0);

export function SalaoPage() {
  const user = useMemo(getUser, []);
  const [tab, setTab] = useState<"mesas" | "comandas" | "kds">("mesas");
  const [mesas, setMesas] = useState<any[]>([]);
  const [comandas, setComandas] = useState<any[]>([]);
  const [openingRequests, setOpeningRequests] = useState<any[]>([]);
  const [kds, setKds] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingTable, setCreatingTable] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [selectedComanda, setSelectedComanda] = useState<any | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProductConfiguration, setSelectedProductConfiguration] = useState<any | null>(null);
  const [configurationLoading, setConfigurationLoading] = useState(false);
  const [selectedVariationId, setSelectedVariationId] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Array<{ group: any; option: any; quantity: number }>>([]);
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemNotes, setItemNotes] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [latestPin, setLatestPin] = useState("");
  const [realtimeMesaId, setRealtimeMesaId] = useState("");
  const loadingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const productsLoadedRef = useRef(false);
  const soundEnabledRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

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

  const load = useCallback(async (options: { silent?: boolean; includeProducts?: boolean } = {}) => {
    if (!user?.loja_id) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    const shouldShowLoading = !options.silent && !hasLoadedRef.current;
    if (shouldShowLoading) setLoading(true);
    try {
      const [tablesPayload, tabsPayload, requestsPayload, kdsPayload, productsPayload] = await Promise.all([
        salaoService.listMesas({ loja_id: user.loja_id, per_page: 100 }),
        salaoService.listComandas({ loja_id: user.loja_id, per_page: 100 }),
        salaoService.listOpeningRequests({ loja_id: user.loja_id, status: "pendente" }),
        salaoService.listKds({ loja_id: user.loja_id }),
        options.includeProducts || !productsLoadedRef.current
          ? productsService.getStoreProductsPage({ page: 1, perPage: 100, activeOnly: true }, { forceRefresh: true })
          : Promise.resolve(null),
      ]);
      setMesas(unwrapList(tablesPayload));
      setComandas(unwrapList(tabsPayload).filter((item: any) => !["paga", "cancelada"].includes(item.status)));
      setOpeningRequests(unwrapList(requestsPayload));
      setKds(unwrapList(kdsPayload));
      if (productsPayload) {
        setProducts(productsPayload.products || []);
        productsLoadedRef.current = true;
      }
      hasLoadedRef.current = true;
    } catch (error: any) {
      if (!options.silent) {
        showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel carregar o salao.");
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [user?.loja_id]);

  useEffect(() => {
    void load({ includeProducts: true });
  }, [load]);

  useEffect(() => {
    const enableSound = () => {
      soundEnabledRef.current = true;
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) audioContextRef.current = new AudioContextClass();
      }
      if (audioContextRef.current?.state === "suspended") void audioContextRef.current.resume();
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
          window.setTimeout(() => setRealtimeMesaId((current) => current === payload.mesaId ? "" : current), 6000);
        }
        playRealtimeAlert();
        void load({ silent: true });
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
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel criar a mesa.");
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
      if (result?.pin) {
        setLatestPin(result.pin);
        showSystemNotice(`Comanda aberta. PIN da mesa: ${result.pin}`);
      }
      setTab("comandas");
      await load();
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel abrir a comanda.");
    } finally {
      setActionBusy("");
    }
  };

  const approveOpeningRequest = async (request: any) => {
    setActionBusy(`approve-${request.id}`);
    try {
      const result = await salaoService.approveOpeningRequest(request.id);
      setSelectedComanda(result.comanda);
      setLatestPin(result.comanda?.pin || "");
      setTab("comandas");
      showSystemNotice(`Solicitacao aprovada. PIN da mesa: ${result.comanda?.pin || "gerado"}`);
      await load();
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel aprovar a solicitacao.");
    } finally {
      setActionBusy("");
    }
  };

  const refuseOpeningRequest = async (request: any) => {
    setActionBusy(`refuse-${request.id}`);
    try {
      await salaoService.refuseOpeningRequest(request.id);
      await load();
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel recusar a solicitacao.");
    } finally {
      setActionBusy("");
    }
  };

  const selectComanda = async (comanda: any) => {
    // A list/table response is a summary and does not carry the participant list.
    // Clear it before fetching the detail to avoid rendering summary-only fields as details.
    setSelectedComanda(null);
    try {
      const detail = await salaoService.getComanda(comanda.id);
      setSelectedComanda(detail);
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel carregar a comanda.");
    }
  };

  const downloadQrCode = async (mesa: any) => {
    setActionBusy(`qr-${mesa.id}`);
    try {
      const result = await salaoService.rotateMesaQr(mesa.id);
      const url = `${CLIENT_BASE_URL}/mercado/${mesa.loja_id}/mesa/${result.qr_token}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 720,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: PRIMARY, light: "#ffffff" },
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `qr-mesa-${mesa.numero}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      showSystemNotice("QR Code baixado. O QR anterior desta mesa foi substituido.");
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel baixar o QR Code.");
    } finally {
      setActionBusy("");
    }
  };

  const addProductToComanda = async () => {
    if (!selectedComanda?.id || !selectedProductId) return;
    const quantity = Number(itemQuantity.replace(",", "."));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      showSystemNotice("Informe uma quantidade valida.");
      return;
    }
    setAddingItem(true);
    try {
      const updated = await salaoService.addItem(selectedComanda.id, {
        produto_loja_id: selectedProductId,
        variacao_produto_loja_id: selectedVariationId || undefined,
        quantidade: quantity,
        observacoes: itemNotes.trim() || undefined,
        configuracao_versao: selectedProductConfiguration?.versao,
        selecoes: selectedOptions.map(({ group, option, quantity: optionQuantity }) => ({
          grupo_id: group.id,
          opcao_id: option.id,
          quantidade: optionQuantity,
          nome_grupo: group.nome,
          nome_opcao: option.nome,
          preco_unitario: Number(option.preco_adicional || 0),
          preco_contribuicao: Number(option.preco_adicional || 0) * optionQuantity,
        })),
      });
      setSelectedComanda(updated);
      setSelectedProductId("");
      setSelectedProductConfiguration(null);
      setSelectedVariationId("");
      setSelectedOptions([]);
      setItemQuantity("1");
      setItemNotes("");
      await load();
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel adicionar o produto.");
    } finally {
      setAddingItem(false);
    }
  };

  const selectProductForComanda = async (product: any) => {
    setSelectedProductId(product.id);
    setSelectedProductConfiguration(null);
    setSelectedVariationId("");
    setSelectedOptions([]);
    if (product.modo_compra !== "configuravel") return;
    setConfigurationLoading(true);
    try {
      const configuration = await productsService.getProductConfiguration(product.id);
      setSelectedProductConfiguration(configuration);
      setSelectedVariationId(configuration?.variacoes?.[0]?.id || "");
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.message || "Não foi possível carregar as opções do produto.");
    } finally {
      setConfigurationLoading(false);
    }
  };

  const toggleOption = (group: any, option: any) => {
    setSelectedOptions((current) => {
      const selected = current.find((item) => item.group.id === group.id && item.option.id === option.id);
      if (selected) return current.filter((item) => !(item.group.id === group.id && item.option.id === option.id));
      if (group.tipo_selecao === "unica") return [...current.filter((item) => item.group.id !== group.id), { group, option, quantity: 1 }];
      const groupCount = current.filter((item) => item.group.id === group.id).reduce((sum, item) => sum + item.quantity, 0);
      if (groupCount >= Number(group.maximo_selecoes || 1)) return current;
      return [...current, { group, option, quantity: 1 }];
    });
  };

  const closeAccount = async (comanda: any) => {
    setActionBusy(`close-${comanda.id}`);
    try {
      await salaoService.closeAccount(comanda.id, {
        tipo: "compartilhada",
        percentual_taxa_servico: 10,
      });
      const detail = await salaoService.getComanda(comanda.id);
      setSelectedComanda(detail);
      await load();
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel fechar a conta.");
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
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel gerar novo PIN.");
    } finally {
      setActionBusy("");
    }
  };

  const confirmPayment = async (comanda: any) => {
    setActionBusy(`payment-${comanda.id}`);
    try {
      await salaoService.confirmPayment(comanda.id);
      setSelectedComanda(null);
      await load();
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel confirmar o pagamento.");
    } finally {
      setActionBusy("");
    }
  };

  const unblockParticipant = async (participant: any) => {
    setActionBusy(`unblock-${participant.id}`);
    try {
      await salaoService.unblockParticipant(participant.id);
      if (selectedComanda?.id) setSelectedComanda(await salaoService.getComanda(selectedComanda.id));
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel desbloquear o participante.");
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
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel atualizar o item.");
    } finally {
      setActionBusy("");
    }
  };

  const filteredProducts = products.filter((product) =>
    productName(product).toLowerCase().includes(productSearch.trim().toLowerCase()),
  );
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const configurationIsValid = !selectedProductConfiguration || (selectedProductConfiguration.grupos || []).every((group: any) => {
    const selectedCount = selectedOptions.filter((item) => item.group.id === group.id).reduce((sum, item) => sum + item.quantity, 0);
    return selectedCount >= Number(group.minimo_selecoes || 0) && selectedCount <= Number(group.maximo_selecoes || Number.MAX_SAFE_INTEGER);
  });
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
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Salao</h1>
            <p className="text-sm text-gray-500">Mesas, comandas, atendimento e cozinha.</p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#122a4c] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:bg-[#0b1e38] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
        <div className="mt-4 inline-flex rounded-lg bg-gray-100 p-1">
          {[
            ["mesas", Armchair, "Mesas"],
            ["comandas", ClipboardList, "Comandas"],
            ["kds", ChefHat, "KDS"],
          ].map(([id, Icon, label]) => (
            <button
              key={String(id)}
              onClick={() => setTab(id as any)}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm ${tab === id ? activeTabClass : "text-gray-500"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Carregando salao...
          </div>
        ) : tab === "mesas" ? (
          <div className="space-y-4">
            {openingRequests.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <UserCheck className="h-4 w-4" />
                  Solicitações de abertura pendentes
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {openingRequests.map((request) => (
                    <div key={request.id} className="rounded-lg border border-amber-200 bg-white p-3">
                      <div className="font-semibold text-gray-900">Mesa {request.mesa?.numero}</div>
                      <div className="text-sm text-gray-600">{request.nome_snapshot || "Cliente"}</div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => void approveOpeningRequest(request)}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-emerald-600 px-2 py-2 text-xs font-semibold text-white"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Aprovar
                        </button>
                        <button
                          onClick={() => void refuseOpeningRequest(request)}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-gray-200 px-2 py-2 text-xs font-semibold text-gray-700"
                        >
                          <X className="h-3.5 w-3.5" />
                          Recusar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex max-w-sm gap-2">
              <input
                value={newTableNumber}
                onChange={(event) => setNewTableNumber(event.target.value)}
                placeholder="Numero da mesa"
                className="h-10 flex-1 rounded-lg border border-gray-300 px-3 text-sm"
              />
              <button
                onClick={() => void createMesa()}
                disabled={creatingTable}
                className="inline-flex items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: PRIMARY }}
              >
                <Plus className="h-4 w-4" />
                Mesa
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {mesas.map((mesa) => (
                <div
                  key={mesa.id}
                  className={`rounded-lg border bg-white p-4 shadow-sm transition-all ${
                    realtimeMesaId === mesa.id
                      ? "border-emerald-500 ring-4 ring-emerald-200 animate-pulse"
                      :
                    mesa.destaque === "abertura_pendente"
                      ? "border-amber-300 ring-2 ring-amber-100"
                      : mesa.destaque === "novo_pedido"
                        ? "border-emerald-300 ring-2 ring-emerald-100"
                        : mesa.destaque === "aguardando_conta" || mesa.destaque === "aguardando_pagamento"
                          ? "border-blue-300 ring-2 ring-blue-100"
                          : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-gray-500">Mesa</div>
                      <div className="text-2xl font-semibold text-gray-900">{mesa.numero}</div>
                    </div>
                    <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide ${tableStatusClass[mesa.status] || "bg-gray-100 text-gray-700"}`}>
                      {mesa.status?.replace(/_/g, " ")}
                    </span>
                  </div>
                  {mesa.solicitacao_abertura && (
                    <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Cliente solicitou a abertura: {mesa.solicitacao_abertura.nome_snapshot || "Cliente"}
                    </div>
                  )}
                  {mesa.comanda_aberta && (
                    <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-700">
                      <div>{mesa.comanda_aberta.numero_comanda} · R$ {formatMoney(mesa.comanda_aberta.total)}</div>
                      {mesa.comanda_aberta.novos_itens > 0 && <div className="font-semibold text-emerald-700">Novo pedido no KDS</div>}
                      {mesa.comanda_aberta.status === "aguardando_conta" && <div className="font-semibold text-blue-700">Conta solicitada</div>}
                      {mesa.comanda_aberta.status === "fechada" && <div className="font-semibold text-blue-700">Aguardando pagamento</div>}
                    </div>
                  )}
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => void openComanda(mesa)}
                      disabled={Boolean(mesa.comanda_aberta) || actionBusy === `open-${mesa.id}`}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-50"
                    >
                      {actionBusy === `open-${mesa.id}` ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Abrindo...</span> : mesa.comanda_aberta ? `Comanda ${mesa.comanda_aberta.numero_comanda}` : "Abrir comanda"}
                    </button>
                    <button
                      onClick={() => void downloadQrCode(mesa)}
                      disabled={actionBusy === `qr-${mesa.id}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700"
                    >
                      {actionBusy === `qr-${mesa.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      {actionBusy === `qr-${mesa.id}` ? "Gerando QR Code..." : "Baixar QR Code"}
                    </button>
                    {mesa.comanda_aberta && (
                      <button
                        onClick={() => {
                          setTab("comandas");
                          void selectComanda(mesa.comanda_aberta);
                        }}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        Ver comanda
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : tab === "comandas" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(260px,360px)_1fr]">
            <div className="space-y-3">
              {comandas.map((comanda) => (
                <button
                  key={comanda.id}
                  onClick={() => void selectComanda(comanda)}
                  className={`w-full rounded-lg border bg-white p-4 text-left shadow-sm hover:border-blue-200 ${
                    selectedComanda?.id === comanda.id ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{comanda.numero_comanda}</div>
                      <div className="text-sm text-gray-500">Mesa {comanda.mesa?.numero}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">R$ {formatMoney(comanda.total)}</div>
                      <div className="text-xs capitalize text-gray-500">{comanda.status}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              {selectedComanda ? (
                <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
                  <div>
                    <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="font-semibold text-gray-900">{selectedComanda.numero_comanda}</h2>
                        <p className="inline-flex rounded-md bg-blue-100 px-2 py-1 text-sm font-bold text-blue-800">Mesa {selectedComanda.mesa?.numero}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="text-xl font-semibold text-gray-900">R$ {formatMoney(selectedComanda.total)}</div>
                        <div className="text-xs capitalize text-gray-500">{selectedComanda.status?.replace(/_/g, " ")}</div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                          <KeyRound className="h-4 w-4" />
                          PIN da sessão
                        </div>
                        <div className="text-2xl font-semibold tracking-widest text-gray-950">{latestPin || selectedComanda.pin || "----"}</div>
                        <button
                          onClick={() => void regeneratePin(selectedComanda)}
                          disabled={!["aberta", "aguardando_conta"].includes(selectedComanda.status)}
                          className="mt-2 inline-flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Gerar novo PIN
                        </button>
                      </div>
                      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <div className="mb-2 text-sm font-semibold text-gray-900">Participantes</div>
                        <div className="space-y-1">
                          {arrayOrEmpty<any>(selectedComanda.participantes).map((participant) => (
                            <div key={participant.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className="truncate text-gray-700">{participant.nome_snapshot || participant.nome}</span>
                              {participant.status === "bloqueado" ? (
                                <button
                                  onClick={() => void unblockParticipant(participant)}
                                  className="rounded-md bg-red-50 px-2 py-1 font-semibold text-red-700"
                                >
                                  Desbloquear PIN
                                </button>
                              ) : (
                                <span className="rounded-full bg-white px-2 py-1 capitalize text-gray-500">{participant.status || "ativo"}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {(selectedComanda.itens || []).length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                          Nenhum produto adicionado.
                        </div>
                      ) : (
                        selectedComanda.itens.map((item: any) => (
                          <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 p-3">
                            <div>
                              <div className="font-medium text-gray-900">{item.nome_produto}</div>
                              <div className="text-xs text-gray-500">
                                {item.quantidade} x R$ {formatMoney(item.preco_unitario)} · {item.status}
                              </div>
                              {item.adicionado_por && <div className="mt-1 text-xs font-semibold text-blue-700">Adicionado por {item.adicionado_por}</div>}
                              {item.observacoes && <div className="mt-1 text-xs text-gray-500">{item.observacoes}</div>}
                            </div>
                            <div className="text-sm font-semibold text-gray-900">R$ {formatMoney(item.preco_total)}</div>
                          </div>
                        ))
                      )}
                    </div>

                    <button
                      onClick={() => void closeAccount(selectedComanda)}
                      disabled={(selectedComanda.itens || []).length === 0 || selectedComanda.status === "fechada" || actionBusy === `close-${selectedComanda.id}`}
                      className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      {actionBusy === `close-${selectedComanda.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                      {actionBusy === `close-${selectedComanda.id}` ? "Finalizando conta..." : "Fechar conta compartilhada"}
                    </button>
                    {["fechada", "aguardando_conta"].includes(selectedComanda.status) && (
                      <button
                        onClick={() => void confirmPayment(selectedComanda)}
                        className="ml-2 mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        <CreditCard className="h-4 w-4" />
                        Confirmar pagamento
                      </button>
                    )}
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <ShoppingCart className="h-4 w-4" />
                      Adicionar produto
                    </div>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        value={productSearch}
                        onChange={(event) => setProductSearch(event.target.value)}
                        placeholder="Buscar produto"
                        className="h-10 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm"
                      />
                    </div>

                    <div className="mt-3 max-h-64 space-y-2 overflow-auto">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => void selectProductForComanda(product)}
                          className={`flex w-full items-center justify-between gap-3 rounded-lg border bg-white p-3 text-left ${
                            selectedProductId === product.id ? "border-blue-300" : "border-gray-200"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-gray-900">{productName(product)}</div>
                            <div className="text-xs text-gray-500">{product.categoria_nome || product.categoria_caminho || "Sem categoria"}</div>
                          </div>
                          <div className="shrink-0 text-sm font-semibold text-gray-900">R$ {formatMoney(productPrice(product))}</div>
                        </button>
                      ))}
                    </div>

                    {configurationLoading && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando variações e adicionais...</div>
                    )}
                    {selectedProductConfiguration && (
                      <div className="mt-3 max-h-72 space-y-3 overflow-auto rounded-lg border border-blue-100 bg-blue-50 p-3">
                        <div className="text-xs font-bold text-blue-900">Configure o item antes de adicionar</div>
                        {(selectedProductConfiguration.variacoes || []).length > 0 && (
                          <div>
                            <div className="mb-1 text-xs font-semibold text-gray-700">Variação / tamanho</div>
                            <div className="flex flex-wrap gap-2">
                              {selectedProductConfiguration.variacoes.map((variation: any) => (
                                <button key={variation.id} onClick={() => setSelectedVariationId(variation.id)} className={`rounded-md border px-2 py-1 text-xs font-semibold ${selectedVariationId === variation.id ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-700"}`}>{variation.nome} · R$ {formatMoney(variation.preco_promocional || variation.preco)}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        {(selectedProductConfiguration.grupos || []).map((group: any) => {
                          const selectedCount = selectedOptions.filter((item) => item.group.id === group.id).reduce((sum, item) => sum + item.quantity, 0);
                          return (
                            <div key={group.id} className="border-t border-blue-100 pt-2">
                              <div className="mb-1 flex justify-between gap-2"><span className="text-xs font-semibold text-gray-800">{group.nome}</span><span className="text-[10px] text-gray-500">{group.minimo_selecoes > 0 ? "Obrigatório" : "Opcional"} · {selectedCount}/{group.maximo_selecoes}</span></div>
                              <div className="space-y-1">
                                {(group.opcoes || []).filter((option: any) => option.ativa !== false).map((option: any) => {
                                  const selected = selectedOptions.some((item) => item.group.id === group.id && item.option.id === option.id);
                                  return <button key={option.id} onClick={() => toggleOption(group, option)} className={`flex w-full items-center justify-between rounded-md border px-2 py-2 text-left text-xs ${selected ? "border-blue-500 bg-white" : "border-transparent bg-white/70"}`}><span>{selected ? "✓ " : ""}{option.nome}</span><span>{Number(option.preco_adicional || 0) > 0 ? `+ R$ ${formatMoney(option.preco_adicional)}` : ""}</span></button>;
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-[92px_1fr] gap-2">
                      <input
                        value={itemQuantity}
                        onChange={(event) => setItemQuantity(event.target.value)}
                        className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                        inputMode="decimal"
                        placeholder="Qtd."
                      />
                      <input
                        value={itemNotes}
                        onChange={(event) => setItemNotes(event.target.value)}
                        className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                        placeholder="Observacao"
                      />
                    </div>
                    <button
                      onClick={() => void addProductToComanda()}
                      disabled={!selectedProduct || addingItem || configurationLoading || !configurationIsValid || selectedComanda.status !== "aberta"}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      {addingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {addingItem ? "Adicionando..." : "Adicionar a mesa"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Selecione uma comanda.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-3">
            {kds.map((item) => (
              <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">{item.nome_produto}</div>
                    <div className="text-sm text-gray-500">
                      Mesa {item.mesa?.numero} · {item.numero_comanda}
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs capitalize text-amber-700">
                    {item.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["recebido", "preparando", "pronto", "entregue"].map((status) => (
                    <button
                      key={status}
                      onClick={() => void updateKds(item, status)}
                      disabled={actionBusy.startsWith(`kds-${item.id}-`)}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs capitalize text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      {actionBusy === `kds-${item.id}-${status}` && <Loader2 className="h-3 w-3 animate-spin" />}
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
