import { useEffect, useMemo, useState } from "react";
import {
  Armchair,
  ChefHat,
  ClipboardList,
  Download,
  Loader2,
  Plus,
  QrCode,
  RefreshCw,
  Receipt,
  Search,
  ShoppingCart,
} from "lucide-react";
import QRCode from "qrcode";
import { salaoService } from "@/features/salao/services/salaoService";
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
  const [kds, setKds] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingTable, setCreatingTable] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [selectedComanda, setSelectedComanda] = useState<any | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemNotes, setItemNotes] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  const load = async () => {
    if (!user?.loja_id) return;
    setLoading(true);
    try {
      const [tablesPayload, tabsPayload, kdsPayload, productsPayload] = await Promise.all([
        salaoService.listMesas({ loja_id: user.loja_id, per_page: 100 }),
        salaoService.listComandas({ loja_id: user.loja_id, status: "aberta", per_page: 100 }),
        salaoService.listKds({ loja_id: user.loja_id }),
        productsService.getStoreProductsPage({ page: 1, perPage: 100, activeOnly: true }, { forceRefresh: true }),
      ]);
      setMesas(unwrapList(tablesPayload));
      setComandas(unwrapList(tabsPayload));
      setKds(unwrapList(kdsPayload));
      setProducts(productsPayload.products || []);
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel carregar o salao.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

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
    try {
      const result = await salaoService.openComanda({
        loja_id: user.loja_id,
        mesa_id: mesa.id,
        quantidade_pessoas: 1,
      });
      setSelectedComanda(result);
      setTab("comandas");
      await load();
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel abrir a comanda.");
    }
  };

  const selectComanda = async (comanda: any) => {
    setSelectedComanda(comanda);
    try {
      const detail = await salaoService.getComanda(comanda.id);
      setSelectedComanda(detail);
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel carregar a comanda.");
    }
  };

  const downloadQrCode = async (mesa: any) => {
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
        quantidade: quantity,
        observacoes: itemNotes.trim() || undefined,
      });
      setSelectedComanda(updated);
      setSelectedProductId("");
      setItemQuantity("1");
      setItemNotes("");
      await load();
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel adicionar o produto.");
    } finally {
      setAddingItem(false);
    }
  };

  const closeAccount = async (comanda: any) => {
    try {
      await salaoService.closeAccount(comanda.id, {
        tipo: "compartilhada",
        percentual_taxa_servico: 10,
      });
      setSelectedComanda(null);
      await load();
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel fechar a conta.");
    }
  };

  const updateKds = async (item: any, status: string) => {
    try {
      await salaoService.updateItemStatus(item.id, status);
      await load();
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.message || error?.message || "Nao foi possivel atualizar o item.");
    }
  };

  const filteredProducts = products.filter((product) =>
    productName(product).toLowerCase().includes(productSearch.trim().toLowerCase()),
  );
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const activeTabClass = "bg-white text-gray-900 shadow-sm";

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
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
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
                <div key={mesa.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-gray-500">Mesa</div>
                      <div className="text-2xl font-semibold text-gray-900">{mesa.numero}</div>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs capitalize text-gray-700">
                      {mesa.status?.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => void openComanda(mesa)}
                      disabled={Boolean(mesa.comanda_aberta)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-50"
                    >
                      {mesa.comanda_aberta ? `Comanda ${mesa.comanda_aberta.numero_comanda}` : "Abrir comanda"}
                    </button>
                    <button
                      onClick={() => void downloadQrCode(mesa)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700"
                    >
                      <Download className="h-4 w-4" />
                      Baixar QR Code
                    </button>
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
                    selectedComanda?.id === comanda.id ? "border-blue-300" : "border-gray-200"
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
                        <p className="text-sm text-gray-500">Mesa {selectedComanda.mesa?.numero}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="text-xl font-semibold text-gray-900">R$ {formatMoney(selectedComanda.total)}</div>
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
                              {item.observacoes && <div className="mt-1 text-xs text-gray-500">{item.observacoes}</div>}
                            </div>
                            <div className="text-sm font-semibold text-gray-900">R$ {formatMoney(item.preco_total)}</div>
                          </div>
                        ))
                      )}
                    </div>

                    <button
                      onClick={() => void closeAccount(selectedComanda)}
                      disabled={(selectedComanda.itens || []).length === 0}
                      className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      <Receipt className="h-4 w-4" />
                      Fechar conta compartilhada
                    </button>
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
                          onClick={() => setSelectedProductId(product.id)}
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
                      disabled={!selectedProduct || addingItem}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      {addingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Adicionar a mesa
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
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs capitalize text-gray-700 hover:bg-gray-50"
                    >
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
