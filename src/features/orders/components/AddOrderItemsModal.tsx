import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CreditCard, Loader2, Minus, Package, Plus, Search, Trash2, X } from "lucide-react";
import api from "@/shared/lib/api";

const unwrap = (response: any) => response?.data?.data ?? response?.data;
const PRODUCT_CATALOG_PAGE_SIZE = 100;
const paginatedList = (response: any) => {
  const rawData = response?.data;
  const data = Array.isArray(rawData?.data)
    ? rawData
    : Array.isArray(rawData?.data?.data)
      ? rawData.data
      : unwrap(response);
  const products = Array.isArray(data) ? data : data?.data || [];
  return {
    products,
    total: Number(data?.total ?? products.length),
    page: Number(data?.page ?? 1),
    totalPages: Math.max(1, Number(data?.total_pages ?? 1)),
  };
};
const mergeUniqueProducts = (current: any[], next: any[]) => {
  const known = new Set(current.map((product) => product.id));
  return [...current, ...next.filter((product) => !known.has(product.id))];
};
const apiError = (error: any) =>
  error?.response?.data?.error?.message || error?.response?.data?.message || "Não foi possível concluir. Tente novamente.";
const money = (value: any) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const effectivePrice = (item: any) => {
  if (item?.preco_app_taxa_ativa) {
    return Number(item?.preco_promocional_app ?? item?.preco_app ?? item?.preco_a_partir_de ?? item?.preco_promocional ?? item?.preco ?? 0);
  }
  return Number(item?.preco_a_partir_de ?? item?.preco_promocional ?? item?.preco ?? 0);
};
const productPriceLabel = (product: any) => {
  const price = effectivePrice(product);
  if (!Number.isFinite(price) || price <= 0) {
    return product?.modo_compra === "configuravel" ? "Preço na configuração" : "Sem preço";
  }
  return product?.modo_compra === "configuravel" ? `A partir de ${money(price)}` : money(price);
};
const isPromotionActive = (promotional: any, endsAt: any) =>
  promotional != null && (!endsAt || new Date(endsAt).getTime() >= Date.now());
const normalizeSearchText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
const getSearchMatchRank = (
  item: any,
  search: string,
  secondaryFields: string[] = ["descricao"],
) => {
  const name = normalizeSearchText(String(item?.nome || ""));
  if (!search) return 0;
  if (name === search) return 0;
  if (name.startsWith(search)) return 1;
  if (name.includes(search)) return 2;

  const secondaryText = normalizeSearchText(
    secondaryFields.map((field) => item?.[field] || "").join(" "),
  );
  if (secondaryText.startsWith(search)) return 3;
  if (secondaryText.includes(search)) return 4;
  return Number.POSITIVE_INFINITY;
};
const sortSearchMatches = (
  items: any[],
  searchText: string,
  secondaryFields?: string[],
) => {
  const search = normalizeSearchText(searchText.trim());
  if (!search) return items;
  return items
    .map((item, index) => ({
      item,
      index,
      rank: getSearchMatchRank(item, search, secondaryFields),
    }))
    .filter((entry) => Number.isFinite(entry.rank))
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      const nameCompare = String(a.item?.nome || "").localeCompare(
        String(b.item?.nome || ""),
        "pt-BR",
        { sensitivity: "base" },
      );
      return nameCompare || a.index - b.index;
    })
    .map((entry) => entry.item);
};
const hexToRgba = (hex: string, alpha: number) => {
  const clean = String(hex || "").replace("#", "").trim();
  const normalized = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean;
  const number = Number.parseInt(normalized, 16);
  if (!Number.isFinite(number)) return `rgba(37, 99, 235, ${alpha})`;
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};
const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "cartao_credito", label: "Cartão de crédito" },
  { value: "cartao_debito", label: "Cartão de débito" },
  { value: "dinheiro", label: "Dinheiro" },
];
const makeLineId = () =>
  window.crypto?.randomUUID?.() || `line-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function AddOrderItemsModal({
  order,
  isPaid,
  primaryColor = "#2563eb",
  onClose,
  onAdjusted,
}: {
  order: any;
  isPaid: boolean;
  primaryColor?: string;
  onClose: () => void;
  onAdjusted: (result: any) => void;
}) {
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogLoadingMore, setCatalogLoadingMore] = useState(false);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogTotalPages, setCatalogTotalPages] = useState(1);
  const [lines, setLines] = useState<any[]>([]);
  const [configuring, setConfiguring] = useState<any>(null);
  const [selectedVariation, setSelectedVariation] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<any[]>([]);
  const [optionSearches, setOptionSearches] = useState<Record<string, string>>({});
  const [configurationNotes, setConfigurationNotes] = useState("");
  const [motivo, setMotivo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");
  const [paymentObservation, setPaymentObservation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const firstOptionSearchRef = useRef<HTMLInputElement | null>(null);
  const primarySoft = hexToRgba(primaryColor, 0.1);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedProductSearch(productSearch.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [productSearch]);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    api.get("/produtos_loja", {
      params: {
        ativo: true,
        busca: debouncedProductSearch || undefined,
        page: 1,
        per_page: PRODUCT_CATALOG_PAGE_SIZE,
      },
    })
      .then((response) => {
        if (cancelled) return;
        const payload = paginatedList(response);
        setProducts(
          sortSearchMatches(payload.products, debouncedProductSearch, [
            "categoria_nome",
            "descricao",
            "codigo_barras",
            "codigo_interno",
          ]),
        );
        setCatalogPage(payload.page);
        setCatalogTotal(payload.total);
        setCatalogTotalPages(payload.totalPages);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar os produtos.");
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedProductSearch]);

  useEffect(() => {
    if (!configuring) return;
    setOptionSearches({});
    if (!(configuring.grupos || []).some((group: any) => (group.opcoes || []).length > 5)) return;
    window.setTimeout(() => {
      firstOptionSearchRef.current?.focus();
      firstOptionSearchRef.current?.select();
    }, 0);
  }, [configuring]);

  const hasMoreCatalogProducts = catalogPage < catalogTotalPages;
  const loadMoreProducts = async () => {
    if (catalogLoadingMore || !hasMoreCatalogProducts) return;
    setCatalogLoadingMore(true);
    try {
      const response = await api.get("/produtos_loja", {
        params: {
          ativo: true,
          busca: debouncedProductSearch || undefined,
          page: catalogPage + 1,
          per_page: PRODUCT_CATALOG_PAGE_SIZE,
        },
      });
      const payload = paginatedList(response);
      setProducts((current) =>
        sortSearchMatches(
          mergeUniqueProducts(current, payload.products),
          debouncedProductSearch,
          ["categoria_nome", "descricao", "codigo_barras", "codigo_interno"],
        ),
      );
      setCatalogPage(payload.page);
      setCatalogTotal(payload.total);
      setCatalogTotalPages(payload.totalPages);
    } catch {
      setError("Não foi possível carregar mais produtos.");
    } finally {
      setCatalogLoadingMore(false);
    }
  };

  const addProduct = async (product: any) => {
    setError("");
    if (product.modo_compra !== "configuravel") {
      setLines((current) => [...current, {
        client_line_id: makeLineId(),
        produto_loja_id: product.id,
        variacao_produto_loja_id: null,
        quantidade: 1,
        selecoes: [],
        nome: product.nome,
      }]);
      return;
    }
    setBusy(true);
    try {
      const config = unwrap(await api.get(`/produtos_loja/${product.id}/configuracao`));
      setConfiguring(config);
      setSelectedVariation(config?.variacoes?.[0]?.id || "");
      setSelectedOptions([]);
      setConfigurationNotes("");
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setBusy(false);
    }
  };

  const selectedVariationData = useMemo(
    () => (configuring?.variacoes || []).find((item: any) => item.id === selectedVariation),
    [configuring, selectedVariation],
  );
  const getOptionOverride = (option: any) =>
    (option.precos_variacao || []).find((item: any) =>
      item.variacao_produto_loja_id === selectedVariation ||
      (selectedVariationData?.chave_cliente && item.variacao_chave_cliente === selectedVariationData.chave_cliente)
    );
  const isOptionAvailable = (option: any) => getOptionOverride(option)?.disponivel !== false && option?.ativa !== false;
  const getOptionPrice = (option: any) => {
    const override = getOptionOverride(option);
    const regularPrice = override?.preco_adicional ?? option.preco_adicional ?? 0;
    const promotionalPrice = override ? override.preco_promocional : option.preco_promocional;
    const promotionEndsAt = override ? override.promocao_ate : option.promocao_ate;
    return isPromotionActive(promotionalPrice, promotionEndsAt) && Number(promotionalPrice) < Number(regularPrice)
      ? Number(promotionalPrice)
      : Number(regularPrice);
  };
  const getVisibleOptions = (group: any) => {
    const search = normalizeSearchText(optionSearches[group.id] || "");
    const options = (group.opcoes || []).filter(isOptionAvailable);
    if (!search) return options;
    return sortSearchMatches(options, search, ["descricao"]);
  };
  const getGroupLimits = (group: any) => {
    const rule = (group.regras_variacao || []).find(
      (item: any) => item.variacao_produto_loja_id === selectedVariation,
    );
    return {
      minimum: Number(rule?.minimo_selecoes ?? group.minimo_selecoes ?? 0),
      maximum: Number(rule?.maximo_selecoes ?? group.maximo_selecoes ?? 99),
    };
  };
  const countGroupSelections = (group: any, selections = selectedOptions) => {
    const groupSelections = selections.filter((selection) => selection.grupo_id === group.id);
    return group.permite_quantidade
      ? groupSelections.reduce((sum, selection) => sum + Number(selection.quantidade || 1), 0)
      : groupSelections.length;
  };
  const optionSelection = (groupId: string, optionId: string) =>
    selectedOptions.find((selection) => selection.grupo_id === groupId && selection.opcao_id === optionId);
  const toggleOption = (group: any, option: any) => setSelectedOptions((current) => {
    const existing = current.find((selection) => selection.grupo_id === group.id && selection.opcao_id === option.id);
    if (existing) return current.filter((selection) => selection !== existing);
    if (group.tipo_selecao === "unica") {
      return [...current.filter((selection) => selection.grupo_id !== group.id), { grupo_id: group.id, opcao_id: option.id, quantidade: 1 }];
    }
    const { maximum } = getGroupLimits(group);
    if (countGroupSelections(group, current) >= maximum) return current;
    return [...current, { grupo_id: group.id, opcao_id: option.id, quantidade: 1 }];
  });
  const changeOptionQuantity = (group: any, option: any, delta: number) => setSelectedOptions((current) => {
    const selection = current.find((item) => item.grupo_id === group.id && item.opcao_id === option.id);
    if (!selection) return current;
    const next = Number(selection.quantidade || 1) + delta;
    if (next < 1) return current.filter((item) => item !== selection);
    const { maximum } = getGroupLimits(group);
    if (delta > 0 && countGroupSelections(group, current) >= maximum) return current;
    if (next > Number(option.quantidade_maxima || 99)) return current;
    return current.map((item) => item === selection ? { ...item, quantidade: next } : item);
  });
  const saveConfiguredLine = () => {
    const product = configuring?.produto;
    if (!product) return;
    if ((configuring.variacoes || []).length && !selectedVariation) {
      setError("Selecione uma variacao.");
      return;
    }
    for (const group of configuring.grupos || []) {
      const { minimum, maximum } = getGroupLimits(group);
      const count = countGroupSelections(group);
      if (count < minimum || count > maximum) {
        setError(`O grupo "${group.nome}" exige entre ${minimum} e ${maximum} selecoes.`);
        return;
      }
    }
    const variation = (configuring.variacoes || []).find((item: any) => item.id === selectedVariation);
    setLines((current) => [...current, {
      client_line_id: makeLineId(),
      produto_loja_id: product.id,
      variacao_produto_loja_id: selectedVariation || null,
      quantidade: 1,
      selecoes: selectedOptions,
      observacoes: configurationNotes.trim() || undefined,
      nome: product.nome,
      detalhe: [variation?.nome, selectedOptions.length ? `${selectedOptions.length} opções` : ""].filter(Boolean).join(" - "),
    }]);
    setConfiguring(null);
    setSelectedOptions([]);
    setConfigurationNotes("");
    setError("");
  };
  const changeLineQuantity = (index: number, delta: number) => setLines((current) => current
    .map((line, currentIndex) => currentIndex === index ? { ...line, quantidade: Math.max(0, Number(line.quantidade) + delta) } : line)
    .filter((line) => line.quantidade > 0));

  const submit = async () => {
    if (!lines.length) return;
    if (isPaid && !paymentMethod) {
      setError("Informe a forma de pagamento complementar.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload: any = {
        itens: lines.map(({ nome, detalhe, client_line_id, ...line }) => line),
        motivo: motivo.trim() || undefined,
      };
      if (isPaid) {
        payload.pagamento_complementar = {
          forma_pagamento: paymentMethod,
          observacao: paymentObservation.trim() || undefined,
        };
      }
      const response = await api.post(`/pedidos/${order.id}/itens/admin-add`, payload);
      onAdjusted(unwrap(response));
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setBusy(false);
    }
  };

  let optionSearchRefAssigned = false;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-3">
      <div className="flex h-[calc(100vh-1rem)] w-[98vw] max-w-[96rem] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[calc(100vh-1.5rem)]">
        <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Adicionar produtos</h2>
            <p className="text-sm text-slate-500">Pedido {order?.numero_pedido || order?.numero || ""}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-5">
          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
            <section className="rounded-xl border bg-white p-4">
              <div className="mb-3">
                <h3 className="font-bold text-slate-900">Catalogo</h3>
                <p className="text-sm text-slate-500">O backend recalcula os valores ao salvar.</p>
                {catalogTotal > 0 && (
                  <p className="mt-1 text-xs font-semibold text-slate-500">{products.length} de {catalogTotal} produtos carregados</p>
                )}
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Buscar produto" className="w-full rounded-lg border py-2 pl-10 pr-3" />
              </div>
              <div className="max-h-[58vh] overflow-y-auto rounded-lg border xl:max-h-[620px]">
                {catalogLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin" style={{ color: primaryColor }} /></div>
                ) : products.length ? (
                  <>
                    {products.map((product) => (
                      <button key={product.id} onClick={() => addProduct(product)} className="flex w-full items-center justify-between gap-3 border-b p-3 text-left last:border-0 hover:bg-slate-50">
                        <span className="min-w-0">
                          <b className="block truncate text-slate-800">{product.nome}</b>
                          <small className="text-slate-500">{product.categoria_nome || (product.modo_compra === "configuravel" ? "Configurar opcoes" : "Produto")}</small>
                        </span>
                        <span className="ml-auto shrink-0 text-right">
                          <b className="block text-sm text-slate-900">{productPriceLabel(product)}</b>
                          {product.modo_compra === "configuravel" && <small className="text-slate-500">Configurar</small>}
                        </span>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: primarySoft, color: primaryColor }}>
                          <Plus className="h-4 w-4" />
                        </span>
                      </button>
                    ))}
                    {hasMoreCatalogProducts && (
                      <div className="border-t bg-white p-3 text-center">
                        <button type="button" disabled={catalogLoadingMore} onClick={loadMoreProducts} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
                          {catalogLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                          Carregar mais produtos
                        </button>
                      </div>
                    )}
                  </>
                ) : <p className="p-8 text-center text-sm text-slate-500">Nenhum produto encontrado.</p>}
              </div>
            </section>
            <aside className="space-y-4">
              <section className="rounded-xl border bg-white p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Itens do ajuste</h3>
                  <span className="rounded-full px-2 py-1 text-xs font-bold" style={{ backgroundColor: primarySoft, color: primaryColor }}>{lines.length}</span>
                </div>
                <div className="mt-3 max-h-[280px] space-y-2 overflow-y-auto">
                  {lines.length ? lines.map((line, index) => (
                    <div key={line.client_line_id} className="rounded-lg border p-3">
                      <div className="flex justify-between gap-2">
                        <span>
                          <b className="block text-sm">{line.nome}</b>
                          {line.detalhe && <small className="text-slate-500">{line.detalhe}</small>}
                        </span>
                        <button onClick={() => setLines(lines.filter((_, current) => current !== index))} className="text-red-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="mt-2 flex w-fit items-center rounded-lg border">
                        <button onClick={() => changeLineQuantity(index, -1)} className="p-1.5"><Minus className="h-3 w-3" /></button>
                        <b className="w-7 text-center text-sm">{line.quantidade}</b>
                        <button onClick={() => changeLineQuantity(index, 1)} className="p-1.5"><Plus className="h-3 w-3" /></button>
                      </div>
                    </div>
                  )) : (
                    <div className="py-10 text-center text-slate-400">
                      <Package className="mx-auto mb-2 h-8 w-8" />
                      <p className="text-sm">Nenhum produto adicionado</p>
                    </div>
                  )}
                </div>
              </section>
              <section className="rounded-xl border bg-white p-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Motivo
                  <textarea value={motivo} onChange={(event) => setMotivo(event.target.value)} maxLength={500} className="mt-1 min-h-20 w-full resize-y rounded-lg border p-2 font-normal" placeholder="Ex.: cliente pediu adicional por WhatsApp" />
                </label>
              </section>
              {isPaid && (
                <section className="rounded-xl border bg-white p-4">
                  <h3 className="flex items-center gap-2 font-bold text-slate-900"><CreditCard className="h-4 w-4" /> Pagamento da diferença</h3>
                  <div className="mt-3 grid gap-2">
                    {PAYMENT_METHODS.map((method) => {
                      const selected = paymentMethod === method.value;
                      return (
                        <button key={method.value} type="button" onClick={() => setPaymentMethod(method.value)} className="flex items-center justify-between rounded-lg border p-2 text-sm" style={selected ? { borderColor: primaryColor, backgroundColor: primarySoft } : undefined}>
                          {method.label}
                          {selected && <Check className="h-4 w-4" style={{ color: primaryColor }} />}
                        </button>
                      );
                    })}
                  </div>
                  <input value={paymentObservation} onChange={(event) => setPaymentObservation(event.target.value)} className="mt-3 w-full rounded-lg border p-2 text-sm" placeholder="Observação do pagamento" />
                </section>
              )}
            </aside>
          </div>
        </main>
        <footer className="flex items-center justify-end gap-2 border-t bg-white px-5 py-4">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button>
          <button disabled={busy || !lines.length || (isPaid && !paymentMethod)} onClick={submit} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar ajuste
          </button>
        </footer>
      </div>
      {configuring && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/50 p-3">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-bold">Configurar {configuring.produto?.nome}</h3>
                <p className="text-sm text-slate-500">Selecione a variação e as opções obrigatórias.</p>
              </div>
              <button onClick={() => setConfiguring(null)}><X /></button>
            </div>
            {(configuring.variacoes || []).length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-bold">Variação</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(configuring.variacoes || []).map((variation: any) => {
                    const selected = selectedVariation === variation.id;
                    return (
                      <button key={variation.id} onClick={() => setSelectedVariation(variation.id)} className="rounded-xl border-2 p-3 text-left" style={selected ? { borderColor: primaryColor, backgroundColor: primarySoft } : { borderColor: "#e2e8f0" }}>
                        <b>{variation.nome}</b>
                        <span className="float-right text-sm">{money(effectivePrice(variation))}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {(configuring.grupos || []).map((group: any) => {
              const limits = getGroupLimits(group);
              const count = countGroupSelections(group);
              const searchable = (group.opcoes || []).length > 5;
              const visibleOptions = getVisibleOptions(group);
              const attachSearchRef = searchable && !optionSearchRefAssigned;
              if (attachSearchRef) optionSearchRefAssigned = true;
              return (
                <section key={group.id} className="mt-5">
                  <div className="flex justify-between">
                    <p className="font-bold">{group.nome}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${count >= limits.minimum ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{count}/{limits.maximum}</span>
                  </div>
                  <p className="mb-2 text-xs text-slate-500">Escolha de {limits.minimum} até {limits.maximum}</p>
                  {searchable && (
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        ref={attachSearchRef ? firstOptionSearchRef : undefined}
                        value={optionSearches[group.id] || ""}
                        onChange={(event) => setOptionSearches((current) => ({ ...current, [group.id]: event.target.value }))}
                        placeholder={`Buscar em ${group.nome}`}
                        className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    {visibleOptions.length ? visibleOptions.map((option: any) => {
                      const selected = optionSelection(group.id, option.id);
                      const limitReached = !selected && count >= limits.maximum;
                      const optionPrice = getOptionPrice(option);
                      return (
                        <div key={option.id} className="flex items-center justify-between rounded-xl border p-3" style={selected ? { borderColor: primaryColor, backgroundColor: primarySoft } : { borderColor: "#e2e8f0" }}>
                          <button disabled={limitReached} onClick={() => toggleOption(group, option)} className="flex flex-1 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-45">
                            <span
                              className="h-5 w-5 border-2"
                              style={{
                                ...(selected ? { borderColor: primaryColor, backgroundColor: primaryColor, boxShadow: "inset 0 0 0 3px white" } : { borderColor: "#cbd5e1" }),
                                borderRadius: group.tipo_selecao === "unica" ? "9999px" : "6px",
                              }}
                            />
                            <span>
                              <b className="block text-sm">{option.nome}</b>
                              {optionPrice > 0 && <small className="text-slate-500">+ {money(optionPrice)}</small>}
                            </span>
                          </button>
                          {selected && group.permite_quantidade && (
                            <div className="flex items-center rounded-lg border bg-white">
                              <button onClick={() => changeOptionQuantity(group, option, -1)} className="p-1.5"><Minus className="h-3 w-3" /></button>
                              <b className="w-7 text-center text-sm">{selected.quantidade}</b>
                              <button disabled={count >= limits.maximum} onClick={() => changeOptionQuantity(group, option, 1)} className="p-1.5 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-3 w-3" /></button>
                            </div>
                          )}
                        </div>
                      );
                    }) : <p className="rounded-xl border border-dashed p-4 text-center text-sm text-slate-500">Nenhum adicional encontrado.</p>}
                  </div>
                </section>
              );
            })}
            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Observação do item
              <textarea value={configurationNotes} onChange={(event) => setConfigurationNotes(event.target.value)} maxLength={500} className="mt-1 min-h-20 w-full resize-y rounded-xl border p-3 font-normal outline-none" />
            </label>
            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
              <button onClick={() => setConfiguring(null)} className="rounded-lg border px-4 py-2">Cancelar</button>
              <button onClick={saveConfiguredLine} className="rounded-lg px-5 py-2 font-semibold text-white" style={{ backgroundColor: primaryColor }}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
