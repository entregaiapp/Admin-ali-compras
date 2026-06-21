import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Armchair,
  ChefHat,
  ClipboardList,
  CreditCard,
  Download,
  Printer,
  KeyRound,
  Loader2,
  Plus,
  QrCode,
  RefreshCw,
  Receipt,
  Search,
  ShoppingCart,
  UserCheck,
} from "lucide-react";
import QRCode from "qrcode";
import { salaoService } from "@/features/salao/services/salaoService";
import { createSalaoAdminRealtime, salaoTenantTopic } from "@/features/salao/services/salaoRealtime";
import { productsService } from "@/features/products";
import { showSystemNotice } from "@/shared/components/SystemNoticeModal";

const PRIMARY = "#122a4c";

const SALAO_STATUS_STYLES: Record<string, { label: string; badge: string; card: string }> = {
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

const escapePrintHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingTable, setCreatingTable] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [selectedComanda, setSelectedComanda] = useState<any | null>(null);
  const [comandaModule, setComandaModule] = useState<"mesa" | "participantes" | "pedidos" | "adicionar">("mesa");
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
  const [qrDownloadMesa, setQrDownloadMesa] = useState<any | null>(null);
  const loadingRef = useRef(false);
  const queuedManualRefreshRef = useRef(false);
  const selectedComandaIdRef = useRef("");
  const hasLoadedRef = useRef(false);
  const productsLoadedRef = useRef(false);
  const soundEnabledRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const comandaDetailRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    selectedComandaIdRef.current = selectedComanda?.id || "";
  }, [selectedComanda?.id]);

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

  const load = useCallback(async (options: { silent?: boolean; includeProducts?: boolean; manual?: boolean } = {}) => {
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
      const [tablesPayload, tabsPayload, kdsPayload, productsPayload, selectedComandaPayload] = await Promise.all([
        salaoService.listMesas({ loja_id: user.loja_id, per_page: 100 }),
        salaoService.listComandas({ loja_id: user.loja_id, per_page: 100 }),
        salaoService.listKds({ loja_id: user.loja_id }),
        options.includeProducts || !productsLoadedRef.current
          ? productsService.getStoreProductsPage({ page: 1, perPage: 100, activeOnly: true }, { forceRefresh: true })
          : Promise.resolve(null),
        selectedComandaId ? salaoService.getComanda(selectedComandaId).catch(() => null) : Promise.resolve(null),
      ]);
      setMesas(unwrapList(tablesPayload));
      setComandas(unwrapList(tabsPayload).filter((item: any) => !["paga", "cancelada"].includes(item.status)));
      setKds(unwrapList(kdsPayload));
      if (selectedComandaPayload && selectedComandaIdRef.current === selectedComandaId) {
        setSelectedComanda(selectedComandaPayload);
      }
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
      setRefreshing(false);
      loadingRef.current = false;
      if (queuedManualRefreshRef.current) {
        queuedManualRefreshRef.current = false;
        void load({ manual: true, includeProducts: true });
      }
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
      setComandaModule("mesa");
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

  const selectComanda = async (comanda: any) => {
    // A list/table response is a summary and does not carry the participant list.
    // Clear it before fetching the detail to avoid rendering summary-only fields as details.
    setSelectedComanda(null);
    setLatestPin("");
    try {
      const detail = await salaoService.getComanda(comanda.id);
      setSelectedComanda(detail);
      setComandaModule("mesa");
      requestAnimationFrame(() => comandaDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel carregar a comanda.");
    }
  };

  const downloadQrCode = async (mesa: any, generateNew = false) => {
    setActionBusy(`qr-${mesa.id}`);
    try {
      const result = generateNew
        ? await salaoService.rotateMesaQr(mesa.id)
        : await salaoService.getMesaQr(mesa.id);
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
      showSystemNotice(generateNew ? "Novo QR Code criado e baixado. O QR anterior foi substituído." : "QR Code atual baixado.");
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel baixar o QR Code.");
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
      const url = `${CLIENT_BASE_URL}/mercado/${mesa.loja_id}/mesa/${result.qr_token}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 900,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: PRIMARY, light: "#ffffff" },
      });
      printWindow.document.write(`<!doctype html><html><head><title>QR Code - Mesa ${mesa.numero}</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:32px;color:#122a4c}img{width:360px;max-width:100%;margin:24px auto;display:block}h1{margin:0;font-size:28px}p{color:#475569;font-size:16px}@media print{body{padding:0}}</style></head><body><h1>Mesa ${mesa.numero}</h1><p>Aponte a câmera para abrir o cardápio e pedir.</p><img src="${dataUrl}" alt="QR Code da Mesa ${mesa.numero}"><p>${mesa.loja_nome || ""}</p><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`);
      printWindow.document.close();
    } catch (error: any) {
      printWindow.close();
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel imprimir o QR Code.");
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
      setComandaModule("pedidos");
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

  const printSalaoComanda = (comanda: any) => {
    const printWindow = window.open("", "_blank", "width=420,height=650");
    if (!printWindow) {
      showSystemNotice("Não foi possível abrir a janela de impressão. Verifique se o navegador bloqueou pop-ups.");
      return;
    }

    const participants = arrayOrEmpty<any>(comanda.participantes);
    const participantNames = new Map(participants.map((participant) => [participant.id, participant.nome_snapshot || participant.nome || "Cliente"]));
    const groups = new Map<string, { name: string; items: any[]; total: number }>();
    for (const item of arrayOrEmpty<any>(comanda.itens).filter((item) => item.status !== "cancelado")) {
      const key = item.participante_id || "atendimento";
      const group = groups.get(key) || {
        name: participantNames.get(key) || item.adicionado_por || "Atendimento",
        items: [],
        total: 0,
      };
      group.items.push(item);
      group.total += Number(item.preco_total || 0);
      groups.set(key, group);
    }

    const groupedItems = [...groups.values()].map((group) => `
      <section class="person">
        <p class="person-title">${escapePrintHtml(group.name)}</p>
        ${group.items.map((item) => `
          <div class="row"><span>${escapePrintHtml(item.quantidade)}x ${escapePrintHtml(item.nome_produto)}</span><span>R$ ${formatMoney(item.preco_total)}</span></div>
          ${arrayOrEmpty<any>(item.selecoes).map((selection) => `<p class="option">${escapePrintHtml(selection.nome_grupo)}: ${escapePrintHtml(selection.nome_opcao)}</p>`).join("")}
          ${item.observacoes ? `<p class="obs">Obs: ${escapePrintHtml(item.observacoes)}</p>` : ""}
        `).join("")}
        <div class="row subtotal"><span>Total de ${escapePrintHtml(group.name)}</span><span>R$ ${formatMoney(group.total)}</span></div>
      </section>
    `).join("");
    const total = arrayOrEmpty<any>(comanda.itens)
      .filter((item) => item.status !== "cancelado")
      .reduce((sum, item) => sum + Number(item.preco_total || 0), 0);
    const splitPeople = Number(comanda.quantidade_pessoas_divisao || 1);
    const division = splitPeople > 1
      ? `<div class="divider"></div><div class="row"><span>Divisão (${splitPeople} pessoas)</span><span>R$ ${formatMoney(total / splitPeople)} por pessoa</span></div>`
      : "";

    printWindow.document.write(`<!DOCTYPE html>
      <html lang="pt-BR"><head><meta charset="UTF-8"><title>Comanda ${escapePrintHtml(comanda.numero_comanda)}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box} body{font-family:'Courier New',Courier,monospace;max-width:300px;margin:0 auto;padding:16px;font-size:12px;color:#000}.center{text-align:center}.bold{font-weight:bold}.large{font-size:15px}.divider-solid{border-top:1px solid #000;margin:8px 0}.divider{border-top:1px dashed #000;margin:8px 0}.row{display:flex;justify-content:space-between;gap:8px;margin-bottom:3px}.row-total{display:flex;justify-content:space-between;gap:8px;font-size:14px;font-weight:bold;margin-bottom:3px}.person{padding:8px 0}.person-title{font-weight:bold;margin-bottom:6px}.subtotal{margin-top:6px;font-weight:bold}.option{font-size:10px;margin:0 0 2px 16px}.obs{font-size:10px;color:#555;margin:0 0 5px 16px;font-style:italic}.tag{display:inline-block;border:1px solid #000;padding:1px 6px;font-size:11px;margin:2px 0}p{margin-bottom:4px}@media print{body{padding:0}}
      </style></head><body>
        <div class="center">
          <p class="bold large">COMANDA DO SALÃO</p>
          <p>Comanda: <span class="bold">${escapePrintHtml(comanda.numero_comanda)}</span></p>
          <p>Data: ${new Date().toLocaleString("pt-BR")}</p>
          <span class="tag">MESA ${escapePrintHtml(comanda.mesa?.numero || "-")}</span>
        </div>
        <div class="divider"></div>
        <p class="bold">ITENS POR PARTICIPANTE:</p>
        ${groupedItems || '<p>Nenhum item lançado.</p>'}
        <div class="divider-solid"></div>
        <div class="row-total"><span>TOTAL GERAL</span><span>R$ ${formatMoney(total)}</span></div>
        ${division}
        <div class="divider-solid"></div>
        <div class="center"><p>Obrigado pela preferência!</p></div>
        <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
      </body></html>`);
    printWindow.document.close();
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
      <div className="border-b border-gray-200 bg-white px-3 py-2 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 sm:text-xl">Salao</h1>
            <p className="text-xs text-gray-500 sm:text-sm">Mesas, comandas, atendimento e cozinha.</p>
          </div>
          <button
            onClick={() => void load({ manual: true, includeProducts: true })}
            disabled={loading || refreshing}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#122a4c] px-3 py-2 text-xs font-semibold text-white shadow-md shadow-blue-200 hover:bg-[#0b1e38] disabled:opacity-60 sm:min-h-11 sm:px-4 sm:text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading || refreshing ? "animate-spin" : ""}`} />
            {loading || refreshing ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
        <div className="mt-3 flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 scrollbar-hide">
          {[
            ["mesas", Armchair, "Mesas"],
            ["comandas", ClipboardList, "Comandas"],
            ["kds", ChefHat, "KDS"],
          ].map(([id, Icon, label]) => (
            <button
              key={String(id)}
              onClick={() => setTab(id as any)}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold sm:min-h-11 sm:gap-2 sm:px-4 sm:text-sm ${tab === id ? activeTabClass : "text-gray-500"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 pb-20 sm:p-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Carregando salao...
          </div>
        ) : tab === "mesas" ? (
          <div className="space-y-4">
            <div className="flex w-full max-w-sm gap-2">
              <input
                value={newTableNumber}
                onChange={(event) => setNewTableNumber(event.target.value)}
                placeholder="Numero da mesa"
                className="h-12 flex-1 rounded-xl border border-gray-300 px-3 text-base"
              />
              <button
                onClick={() => void createMesa()}
                disabled={creatingTable}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: PRIMARY }}
              >
                <Plus className="h-4 w-4" />
                Mesa
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
              {mesas.map((mesa) => (
                <div
                  key={mesa.id}
                  className={`rounded-lg border bg-white p-3 shadow-sm transition-all sm:p-4 ${
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
                      <div className="text-xl font-semibold text-gray-900 sm:text-2xl">{mesa.numero}</div>
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
                  <div className="mt-3 space-y-1.5 sm:mt-4 sm:space-y-2">
                    <button
                      onClick={() => void openComanda(mesa)}
                      disabled={Boolean(mesa.comanda_aberta) || actionBusy === `open-${mesa.id}`}
                      className="min-h-10 w-full rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-50 sm:min-h-11 sm:py-2 sm:text-sm"
                    >
                      {actionBusy === `open-${mesa.id}` ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Abrindo...</span> : mesa.comanda_aberta ? `Comanda ${mesa.comanda_aberta.numero_comanda}` : "Abrir comanda"}
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setQrDownloadMesa(mesa)}
                        disabled={actionBusy === `qr-${mesa.id}` || actionBusy === `print-qr-${mesa.id}`}
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-60 sm:min-h-11 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
                      >
                        {actionBusy === `qr-${mesa.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        {actionBusy === `qr-${mesa.id}` ? "Gerando..." : "Baixar QR"}
                      </button>
                      <button
                        onClick={() => void printQrCode(mesa)}
                        disabled={actionBusy === `qr-${mesa.id}` || actionBusy === `print-qr-${mesa.id}`}
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60 sm:min-h-11 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
                      >
                        {actionBusy === `print-qr-${mesa.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                        {actionBusy === `print-qr-${mesa.id}` ? "Preparando..." : "Imprimir QR"}
                      </button>
                    </div>
                    {mesa.comanda_aberta && (
                      <button
                        onClick={() => {
                          setTab("comandas");
                          void selectComanda(mesa.comanda_aberta);
                        }}
                        className="min-h-10 w-full rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold sm:min-h-11 sm:py-2 sm:text-sm"
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
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,360px)_1fr] xl:gap-4">
            <div className="space-y-3">
              {comandas.map((comanda) => (
                <button
                  key={comanda.id}
                  onClick={() => void selectComanda(comanda)}
                  className={`min-h-16 w-full rounded-xl border p-3 text-left shadow-sm hover:border-blue-200 active:scale-[0.99] sm:min-h-20 sm:p-4 ${
                    selectedComanda?.id === comanda.id ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : getSalaoStatusStyle(comanda.status).card
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{comanda.numero_comanda}</div>
                      <div className="text-sm text-gray-500">Mesa {comanda.mesa?.numero}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">R$ {formatMoney(comanda.total)}</div>
                      <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${getSalaoStatusStyle(comanda.status).badge}`}>
                        {getSalaoStatusStyle(comanda.status).label}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div ref={comandaDetailRef} className="scroll-mt-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
              {selectedComanda ? (
                <>
                  <div className="sticky top-0 z-30 -mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-gray-100 bg-white px-4 py-2 shadow-sm scrollbar-hide">
                    {[
                      ["mesa", Armchair, "Mesa"],
                      ["adicionar", ShoppingCart, "Adicionar produto"],
                      ["pedidos", ClipboardList, "Pedidos"],
                      ["participantes", UserCheck, "Participantes"],
                    ].map(([id, Icon, label]) => (
                      <button key={String(id)} onClick={() => setComandaModule(id as typeof comandaModule)} className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold sm:min-h-11 sm:gap-2 sm:px-3 sm:py-2 sm:text-xs ${comandaModule === id ? "bg-[#122a4c] text-white shadow-sm" : "bg-slate-100 text-slate-600"}`}>
                        <Icon className="h-4 w-4" /> {label}
                      </button>
                    ))}
                  </div>
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5">
                  <div className="order-2 lg:order-none">
                    <div className={comandaModule === "mesa" ? "flex flex-col gap-2 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between" : "hidden"}>
                      <div>
                        <h2 className="font-semibold text-gray-900">{selectedComanda.numero_comanda}</h2>
                        <p className="inline-flex rounded-md bg-blue-100 px-2 py-1 text-sm font-bold text-blue-800">Mesa {selectedComanda.mesa?.numero}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="text-lg font-semibold text-gray-900 sm:text-xl">R$ {formatMoney(selectedComanda.total)}</div>
                        <div className="text-xs capitalize text-gray-500">{selectedComanda.status?.replace(/_/g, " ")}</div>
                      </div>
                    </div>

                    <div className={comandaModule === "mesa" || comandaModule === "participantes" ? "mt-3 grid gap-2 md:grid-cols-2 sm:mt-4 sm:gap-3" : "hidden"}>
                      <div className={comandaModule === "mesa" ? "rounded-lg border border-gray-100 bg-gray-50 p-2.5 sm:p-3" : "hidden"}>
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                          <KeyRound className="h-4 w-4" />
                          PIN da sessão
                        </div>
                        <div className="text-xl font-semibold tracking-widest text-gray-950 sm:text-2xl">{latestPin || selectedComanda.pin_atual || selectedComanda.pin || "----"}</div>
                        <button
                          onClick={() => void regeneratePin(selectedComanda)}
                          disabled={!["aberta", "aguardando_conta"].includes(selectedComanda.status)}
                          className="mt-2 inline-flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Gerar novo PIN
                        </button>
                      </div>
                      <div className={comandaModule === "participantes" ? "rounded-lg border border-gray-100 bg-gray-50 p-2.5 md:col-span-2 sm:p-3" : "hidden"}>
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

                    <div className={comandaModule === "pedidos" ? "mt-3 space-y-1.5 sm:mt-4 sm:space-y-2" : "hidden"}>
                      {(selectedComanda.itens || []).length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                          Nenhum produto adicionado.
                        </div>
                      ) : (
                        selectedComanda.itens.map((item: any) => (
                          <div key={item.id} className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 p-2.5 sm:gap-3 sm:p-3">
                            <div>
                              <div className="font-medium text-gray-900">{item.nome_produto}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                                <span>{item.quantidade} x R$ {formatMoney(item.preco_unitario)}</span>
                                <span className={`inline-flex rounded-full border px-2 py-0.5 font-bold ${getSalaoStatusStyle(item.status).badge}`}>
                                  {getSalaoStatusStyle(item.status).label}
                                </span>
                              </div>
                              {item.adicionado_por && <div className="mt-1 text-xs font-semibold text-blue-700">Adicionado por {item.adicionado_por}</div>}
                              {item.observacoes && <div className="mt-1 text-xs text-gray-500">{item.observacoes}</div>}
                            </div>
                            <div className="text-sm font-semibold text-gray-900">R$ {formatMoney(item.preco_total)}</div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className={comandaModule === "pedidos" ? "mt-3 grid gap-2 sm:mt-5 sm:flex sm:flex-wrap" : "hidden"}>
                      <button
                        onClick={() => printSalaoComanda(selectedComanda)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 sm:min-h-12 sm:px-4 sm:text-sm"
                      >
                        <Printer className="h-4 w-4" />
                        Imprimir comanda
                      </button>
                      <button
                        onClick={() => void closeAccount(selectedComanda)}
                        disabled={(selectedComanda.itens || []).length === 0 || selectedComanda.status === "fechada" || actionBusy === `close-${selectedComanda.id}`}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 sm:min-h-12 sm:px-4 sm:text-sm"
                        style={{ backgroundColor: PRIMARY }}
                      >
                        {actionBusy === `close-${selectedComanda.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                        {actionBusy === `close-${selectedComanda.id}` ? "Finalizando conta..." : "Fechar conta compartilhada"}
                      </button>
                      {["fechada", "aguardando_conta"].includes(selectedComanda.status) && (
                        <button
                          onClick={() => void confirmPayment(selectedComanda)}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white sm:min-h-12 sm:px-4 sm:text-sm"
                        >
                          <CreditCard className="h-4 w-4" />
                          Confirmar pagamento
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={comandaModule === "adicionar" ? "order-1 sticky top-[52px] z-20 self-start rounded-xl border border-gray-100 bg-gray-50 p-2.5 shadow-sm lg:order-none lg:top-3 lg:p-3" : "hidden"}>
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
                        className="h-12 w-full rounded-xl border border-gray-300 pl-9 pr-3 text-base"
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
                      <div className="mt-2 max-h-64 space-y-2 overflow-auto rounded-lg border border-blue-100 bg-blue-50 p-2.5 sm:mt-3 sm:max-h-72 sm:space-y-3 sm:p-3">
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

                    <div className="mt-2 grid grid-cols-[84px_1fr] gap-2 sm:mt-3 sm:grid-cols-[92px_1fr]">
                      <input
                        value={itemQuantity}
                        onChange={(event) => setItemQuantity(event.target.value)}
                        className="h-12 rounded-xl border border-gray-300 px-3 text-base"
                        inputMode="decimal"
                        placeholder="Qtd."
                      />
                      <input
                        value={itemNotes}
                        onChange={(event) => setItemNotes(event.target.value)}
                        className="h-12 rounded-xl border border-gray-300 px-3 text-base"
                        placeholder="Observacao"
                      />
                    </div>
                    <button
                      onClick={() => void addProductToComanda()}
                      disabled={!selectedProduct || addingItem || configurationLoading || !configurationIsValid || selectedComanda.status !== "aberta"}
                      className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 sm:mt-3 sm:min-h-12 sm:px-4 sm:text-sm"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      {addingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {addingItem ? "Adicionando..." : "Adicionar a mesa"}
                    </button>
                  </div>
                </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">Selecione uma comanda.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-3">
            {kds.map((item) => (
              <div key={item.id} className={`rounded-lg border p-4 shadow-sm ${getSalaoStatusStyle(item.status).card}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">{item.nome_produto}</div>
                    <div className="text-sm text-gray-500">
                      Mesa {item.mesa?.numero} · {item.numero_comanda}
                    </div>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-xs font-bold ${getSalaoStatusStyle(item.status).badge}`}>
                    {getSalaoStatusStyle(item.status).label}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["recebido", "preparando", "pronto", "entregue"].map((status) => (
                    <button
                      key={status}
                      onClick={() => void updateKds(item, status)}
                      disabled={actionBusy.startsWith(`kds-${item.id}-`)}
                      className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold capitalize text-gray-700 hover:bg-gray-50 disabled:opacity-60"
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
      {qrDownloadMesa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-extrabold text-slate-950">Baixar QR Code</h2>
            <p className="mt-2 text-sm text-slate-600">Você quer baixar o QR atual da mesa ou criar um novo? Ao criar outro, os QR Codes impressos anteriormente deixam de funcionar.</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button onClick={() => void downloadQrCode(qrDownloadMesa, false)} disabled={Boolean(actionBusy)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-60">Baixar QR atual</button>
              <button onClick={() => void downloadQrCode(qrDownloadMesa, true)} disabled={Boolean(actionBusy)} className="rounded-xl bg-[#122a4c] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">Criar e baixar novo</button>
            </div>
            <button onClick={() => setQrDownloadMesa(null)} disabled={Boolean(actionBusy)} className="mt-3 w-full rounded-xl px-4 py-2 text-sm font-bold text-slate-500">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
