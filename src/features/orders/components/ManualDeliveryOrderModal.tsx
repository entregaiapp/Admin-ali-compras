import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, CreditCard, Loader2, MapPin,
  Minus, Package, Plus, Search, ShoppingBasket, Store, Trash2, UserRound, X,
} from "lucide-react";
import api from "@/shared/lib/api";

const unwrap = (response: any) => response?.data?.data ?? response?.data;
const list = (response: any) => {
  const data = unwrap(response);
  return Array.isArray(data) ? data : data?.data || [];
};
const apiError = (error: any) =>
  error?.response?.data?.error?.message || error?.response?.data?.message || "Não foi possível concluir a operação.";
const money = (value: any) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const effectivePrice = (item: any) => {
  if (item?.preco_app_taxa_ativa) {
    return Number(item?.preco_promocional_app ?? item?.preco_app ?? item?.preco_promocional ?? item?.preco ?? 0);
  }
  return Number(item?.preco_promocional ?? item?.preco ?? 0);
};
const DEFAULT_PAYMENT_METHODS = ["PIX", "Cartão de Crédito", "Cartão de Débito", "Dinheiro"];
const PAYMENT_METHOD_VALUES: Record<string, string> = {
  "PIX": "pix",
  "Cartão de Crédito": "cartao_credito",
  "Cartão de Débito": "cartao_debito",
  "Dinheiro": "dinheiro",
  "Vale Refeição": "vale_refeicao",
  "Vale Alimentação": "vale_alimentacao",
};
const CARD_PAYMENT_VALUES = new Set(["cartao_credito", "cartao_debito"]);
const paymentMethodCaption = (value: string) =>
  value === "dinheiro" || CARD_PAYMENT_VALUES.has(value)
    ? "Pagar na entrega"
    : "Pagamento externo ao app";
const STEPS = [
  { id: 1, label: "Contato", icon: UserRound },
  { id: 2, label: "Produtos", icon: ShoppingBasket },
  { id: 3, label: "Endereço", icon: MapPin },
  { id: 4, label: "Pagamento", icon: CreditCard },
];

export function ManualDeliveryOrderModal({ lojaId, onClose, onCreated }: {
  lojaId: string; onClose: () => void; onCreated: () => void;
}) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [contactQuery, setContactQuery] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [contact, setContact] = useState<any>(null);
  const [quick, setQuick] = useState({ nome: "", telefone: "" });
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [lines, setLines] = useState<any[]>([]);
  const [configuring, setConfiguring] = useState<any>(null);
  const [selectedVariation, setSelectedVariation] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<any[]>([]);
  const [configurationNotes, setConfigurationNotes] = useState("");
  const [address, setAddress] = useState<any>({
    rua: "", numero: "", bairro: "", cidade: "", estado: "", cep: "", complemento: "", ponto_referencia: "",
  });
  const [pickupAtStore, setPickupAtStore] = useState(false);
  const [store, setStore] = useState<any>(null);
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<string[]>(DEFAULT_PAYMENT_METHODS);
  const [payment, setPayment] = useState("dinheiro");
  const [semTroco, setSemTroco] = useState(true);
  const [trocoPara, setTrocoPara] = useState("");

  useEffect(() => {
    setCatalogLoading(true);
    api.get("/produtos_loja", { params: { ativo: true, per_page: 100 } })
      .then((response) => setProducts(list(response)))
      .catch(() => setError("Não foi possível carregar o catálogo."))
      .finally(() => setCatalogLoading(false));
  }, []);

  useEffect(() => {
    Promise.allSettled([
      api.get(`/lojas/${lojaId}`),
      api.get(`/lojas/${lojaId}/configuracoes`),
    ]).then(([storeResult, configResult]) => {
      setStore(storeResult.status === "fulfilled" ? unwrap(storeResult.value) : null);
      const config = configResult.status === "fulfilled" ? unwrap(configResult.value) : null;
      const methods = Array.isArray(config?.formas_pagamento) && config.formas_pagamento.length
        ? config.formas_pagamento
        : DEFAULT_PAYMENT_METHODS;
      setAcceptedPaymentMethods(methods);
      setPayment(PAYMENT_METHOD_VALUES[methods[0]] || String(methods[0]).toLowerCase());
    });
  }, [lojaId]);

  useEffect(() => {
    const search = contactQuery.trim();
    if (!search) { setContacts([]); setContactLoading(false); return; }
    setContactLoading(true);
    const timer = window.setTimeout(() => {
      api.get("/pedidos/admin-delivery/contacts", { params: { busca: search } })
        .then((response) => setContacts(list(response)))
        .catch(() => setContacts([]))
        .finally(() => setContactLoading(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [contactQuery]);

  useEffect(() => {
    if (!configuring || !selectedVariation) return;
    setSelectedOptions((current) => current.reduce<any[]>((next, selection) => {
      const group = (configuring.grupos || []).find((item: any) => item.id === selection.grupo_id);
      if (!group) return next;
      const rule = (group.regras_variacao || []).find(
        (item: any) => item.variacao_produto_loja_id === selectedVariation,
      );
      const maximum = Number(rule?.maximo_selecoes ?? group.maximo_selecoes ?? 99);
      const groupSelections = next.filter((item) => item.grupo_id === group.id);
      const used = group.permite_quantidade
        ? groupSelections.reduce((sum, item) => sum + Number(item.quantidade || 1), 0)
        : groupSelections.length;
      if (used >= maximum) return next;
      const quantity = group.permite_quantidade
        ? Math.min(Number(selection.quantidade || 1), maximum - used)
        : 1;
      return quantity > 0 ? [...next, { ...selection, quantidade: quantity }] : next;
    }, []));
  }, [configuring, selectedVariation]);

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLocaleLowerCase("pt-BR");
    if (!search) return products;
    return products.filter((product) =>
      [product.nome, product.codigo_interno, product.categoria_nome]
        .some((value) => String(value || "").toLocaleLowerCase("pt-BR").includes(search))
    );
  }, [products, productSearch]);

  const estimatedSubtotal = useMemo(() => lines.reduce(
    (sum, line) => sum + Number(line.preco || 0) * Number(line.quantidade || 0), 0,
  ), [lines]);

  const chooseContact = (selected: any) => {
    setContact(selected); setQuick({ nome: selected.nome, telefone: selected.telefone }); setError(""); setStep(2);
  };
  const createQuickContact = () => {
    if (!quick.nome.trim() || quick.telefone.replace(/\D/g, "").length < 8) {
      setError("Informe nome e telefone válidos."); return;
    }
    chooseContact({ id: `new-${Date.now()}`, ...quick, novo: true });
  };

  const addProduct = async (product: any) => {
    setError("");
    if (product.modo_compra !== "configuravel") {
      setLines((current) => [...current, {
        client_line_id: crypto.randomUUID(), produto_loja_id: product.id,
        quantidade: 1, selecoes: [], nome: product.nome, preco: effectivePrice(product),
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
    } catch (caught) { setError(apiError(caught)); } finally { setBusy(false); }
  };

  const optionSelection = (groupId: string, optionId: string) =>
    selectedOptions.find((selection) => selection.grupo_id === groupId && selection.opcao_id === optionId);
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
    if ((configuring.variacoes || []).length && !selectedVariation) { setError("Selecione uma variação."); return; }
    for (const group of configuring.grupos || []) {
      const { minimum, maximum } = getGroupLimits(group);
      const count = countGroupSelections(group);
      if (count < minimum || count > maximum) {
        setError(`O grupo “${group.nome}” exige entre ${minimum} e ${maximum} seleções.`); return;
      }
    }
    const variation = (configuring.variacoes || []).find((item: any) => item.id === selectedVariation);
    setLines((current) => [...current, {
      client_line_id: crypto.randomUUID(), produto_loja_id: product.id,
      variacao_produto_loja_id: selectedVariation || null, quantidade: 1,
      selecoes: selectedOptions, nome: product.nome,
      observacoes: configurationNotes.trim() || undefined,
      detalhe: [variation?.nome, selectedOptions.length ? `${selectedOptions.length} opção(ões)` : ""].filter(Boolean).join(" · "),
      preco: effectivePrice(variation) || effectivePrice(product),
    }]);
    setConfiguring(null); setSelectedOptions([]); setConfigurationNotes(""); setError("");
  };
  const changeLineQuantity = (index: number, delta: number) => setLines((current) => current
    .map((line, currentIndex) => currentIndex === index ? { ...line, quantidade: Math.max(0, Number(line.quantidade) + delta) } : line)
    .filter((line) => line.quantidade > 0));

  const submit = async () => {
    if (!contact || !lines.length) return;
    setBusy(true); setError("");
    try {
      const geo = pickupAtStore ? null : unwrap(await api.post("/geocode-address", {
        street: address.rua, number: address.numero, neighborhood: address.bairro,
        city: address.cidade, state: address.estado, zipCode: address.cep,
        complement: address.complemento, tenantId: lojaId,
      }));
      await api.post("/pedidos/admin-delivery", {
        tipo_pedido: pickupAtStore ? "retirada" : "entrega",
        contato: { nome: contact.nome, telefone: contact.telefone },
        itens: lines.map(({ nome, detalhe, preco, ...line }) => line),
        endereco: pickupAtStore ? null : {
          ...address, latitude: geo.latitude, longitude: geo.longitude,
          geocoding_provider: geo.geocodingProvider, geocoding_source: geo.geocodingSource,
          formatted_address: geo.formattedAddress, google_place_id: geo.placeId,
        },
        pagamento: {
          forma_pagamento: payment,
          sem_troco: payment === "dinheiro" ? semTroco : undefined,
          troco_para: payment === "dinheiro" && !semTroco ? Number(trocoPara.replace(",", ".")) : undefined,
        },
      });
      onCreated(); onClose();
    } catch (caught) { setError(apiError(caught)); } finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-5">
    <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="border-b bg-white px-5 py-4 sm:px-7">
        <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-slate-900">Novo pedido delivery</h2><p className="text-sm text-slate-500">Pedido feito pelo atendimento da loja</p></div><button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <div className="mt-5 grid grid-cols-4 gap-2">{STEPS.map((item) => { const Icon=item.icon; const active=item.id===step; const done=item.id<step; return <div key={item.id} className="flex items-center gap-2"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${done?'bg-emerald-600 text-white':active?'bg-blue-600 text-white':'bg-slate-100 text-slate-400'}`}>{done?<Check className="h-4 w-4"/>:<Icon className="h-4 w-4"/>}</div><span className={`hidden text-sm font-semibold sm:block ${active?'text-blue-700':'text-slate-500'}`}>{item.label}</span></div>})}</div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-5 sm:p-7">
        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {step===1 && <div className="mx-auto max-w-2xl space-y-6"><section className="rounded-xl border bg-white p-5"><h3 className="font-bold text-slate-900">Localizar contato</h3><p className="mb-4 text-sm text-slate-500">Pesquise pelo nome ou número de telefone.</p><div className="relative"><Search className="absolute left-3 top-3 h-5 w-5 text-slate-400"/><input autoFocus value={contactQuery} onChange={(event)=>setContactQuery(event.target.value)} placeholder="Ex.: Maria ou (81) 99999-9999" className="w-full rounded-xl border py-2.5 pl-10 pr-10 outline-none focus:border-blue-500"/>{contactLoading&&<Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-blue-600"/>}</div>{contactQuery&&<div className="mt-3 overflow-hidden rounded-xl border">{contacts.length?contacts.map((item)=><button key={item.id} onClick={()=>chooseContact(item)} className="flex w-full items-center justify-between border-b bg-white p-3 text-left last:border-0 hover:bg-blue-50"><span><b className="block text-slate-800">{item.nome}</b><small className="text-slate-500">{item.telefone}</small></span><ArrowRight className="h-4 w-4 text-blue-600"/></button>):!contactLoading&&<p className="bg-white p-4 text-center text-sm text-slate-500">Nenhum contato encontrado.</p>}</div>}</section><section className="rounded-xl border bg-white p-5"><h3 className="font-bold text-slate-900">Cadastrar contato rápido</h3><p className="mb-4 text-sm text-slate-500">Será vinculado somente a esta loja.</p><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Nome<input value={quick.nome} onChange={(event)=>setQuick({...quick,nome:event.target.value})} className="mt-1 w-full rounded-lg border p-2.5" placeholder="Nome do cliente"/></label><label className="text-sm font-medium text-slate-700">Telefone<input value={quick.telefone} onChange={(event)=>setQuick({...quick,telefone:event.target.value})} className="mt-1 w-full rounded-lg border p-2.5" placeholder="(00) 00000-0000"/></label></div><button onClick={createQuickContact} className="mt-4 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700">Continuar com novo contato</button></section></div>}

        {step===2 && <div className="grid gap-5 lg:grid-cols-[1fr_360px]"><section className="rounded-xl border bg-white p-4"><div className="mb-3"><h3 className="font-bold text-slate-900">Adicionar produtos</h3><p className="text-sm text-slate-500">Pesquise pelo nome, código ou categoria.</p></div><div className="relative mb-3"><Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400"/><input value={productSearch} onChange={(event)=>setProductSearch(event.target.value)} placeholder="Buscar produto pelo nome..." className="w-full rounded-lg border py-2 pl-10 pr-3"/></div><div className="max-h-[430px] overflow-y-auto rounded-lg border">{catalogLoading?<div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600"/></div>:filteredProducts.length?filteredProducts.map((product)=><button key={product.id} onClick={()=>addProduct(product)} className="flex w-full items-center justify-between gap-3 border-b p-3 text-left last:border-0 hover:bg-blue-50"><span className="min-w-0"><b className="block truncate text-slate-800">{product.nome}</b><small className="text-slate-500">{product.modo_compra==='configuravel'?'Escolher tamanho e opções':money(effectivePrice(product))}</small></span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700"><Plus className="h-4 w-4"/></span></button>):<p className="p-8 text-center text-sm text-slate-500">Nenhum produto encontrado.</p>}</div></section><aside className="rounded-xl border bg-white p-4"><div className="flex items-center justify-between"><h3 className="font-bold text-slate-900">Resumo do pedido</h3><span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">{lines.length} itens</span></div><p className="mb-3 text-sm text-slate-500">Contato: {contact?.nome}</p><div className="max-h-[360px] space-y-2 overflow-y-auto">{lines.length?lines.map((line,index)=><div key={line.client_line_id} className="rounded-lg border p-3"><div className="flex justify-between gap-2"><span><b className="block text-sm">{line.nome}</b>{line.detalhe&&<small className="text-slate-500">{line.detalhe}</small>}</span><button onClick={()=>setLines(lines.filter((_,current)=>current!==index))} className="text-red-500"><Trash2 className="h-4 w-4"/></button></div><div className="mt-2 flex items-center justify-between"><div className="flex items-center rounded-lg border"><button onClick={()=>changeLineQuantity(index,-1)} className="p-1.5"><Minus className="h-3 w-3"/></button><b className="w-7 text-center text-sm">{line.quantidade}</b><button onClick={()=>changeLineQuantity(index,1)} className="p-1.5"><Plus className="h-3 w-3"/></button></div><span className="text-sm font-semibold">{money(line.preco*line.quantidade)}</span></div></div>):<div className="py-10 text-center text-slate-400"><Package className="mx-auto mb-2 h-8 w-8"/><p className="text-sm">Adicione produtos ao pedido</p></div>}</div><div className="mt-4 flex justify-between border-t pt-3 font-bold"><span>Subtotal estimado</span><span>{money(estimatedSubtotal)}</span></div></aside></div>}

        {step===3 && <div className="mx-auto max-w-3xl space-y-4"><button type="button" onClick={()=>{setPickupAtStore(true);setError("")}} className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left ${pickupAtStore?'border-emerald-600 bg-emerald-50':'border-slate-200 bg-white hover:border-emerald-300'}`}><span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Store className="h-5 w-5"/></span><span className="flex-1"><b className="block text-slate-900">Retirada no endereço da loja</b><small className="text-slate-500">{store?.nome || 'Loja'} · não precisa informar endereço de entrega</small></span>{pickupAtStore&&<Check className="h-5 w-5 text-emerald-600"/>}</button><section className={`rounded-xl border bg-white p-5 ${pickupAtStore?'opacity-60':''}`}><div className="mb-5 flex items-start justify-between gap-4"><div><h3 className="font-bold text-slate-900">Entrega no endereço do contato</h3><p className="text-sm text-slate-500">Preencha o endereço; a localização será encontrada ao finalizar.</p></div>{pickupAtStore&&<button type="button" onClick={()=>setPickupAtStore(false)} className="shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold text-blue-700">Usar entrega</button>}</div><fieldset disabled={pickupAtStore} className="grid gap-4 sm:grid-cols-6"><label className="text-sm font-medium sm:col-span-2">CEP<input value={address.cep} onChange={(e)=>setAddress({...address,cep:e.target.value})} className="mt-1 w-full rounded-lg border p-2.5"/></label><label className="text-sm font-medium sm:col-span-4">Rua<input value={address.rua} onChange={(e)=>setAddress({...address,rua:e.target.value})} className="mt-1 w-full rounded-lg border p-2.5"/></label><label className="text-sm font-medium sm:col-span-2">Número<input value={address.numero} onChange={(e)=>setAddress({...address,numero:e.target.value})} className="mt-1 w-full rounded-lg border p-2.5"/></label><label className="text-sm font-medium sm:col-span-4">Complemento<input value={address.complemento} onChange={(e)=>setAddress({...address,complemento:e.target.value})} className="mt-1 w-full rounded-lg border p-2.5"/></label><label className="text-sm font-medium sm:col-span-3">Bairro<input value={address.bairro} onChange={(e)=>setAddress({...address,bairro:e.target.value})} className="mt-1 w-full rounded-lg border p-2.5"/></label><label className="text-sm font-medium sm:col-span-2">Cidade<input value={address.cidade} onChange={(e)=>setAddress({...address,cidade:e.target.value})} className="mt-1 w-full rounded-lg border p-2.5"/></label><label className="text-sm font-medium sm:col-span-1">UF<input maxLength={2} value={address.estado} onChange={(e)=>setAddress({...address,estado:e.target.value.toUpperCase()})} className="mt-1 w-full rounded-lg border p-2.5 uppercase"/></label><label className="text-sm font-medium sm:col-span-6">Ponto de referência<input value={address.ponto_referencia} onChange={(e)=>setAddress({...address,ponto_referencia:e.target.value})} className="mt-1 w-full rounded-lg border p-2.5"/></label></fieldset></section></div>}

        {step===4 && <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2"><section className="rounded-xl border bg-white p-5"><h3 className="font-bold">Forma de pagamento</h3><p className="mt-1 text-xs text-slate-500">Apenas para controle. Cartão e dinheiro serão cobrados na entrega.</p><div className="mt-4 space-y-2">{acceptedPaymentMethods.map((method)=>{const value=PAYMENT_METHOD_VALUES[method]||String(method).toLowerCase();const selected=payment===value;return <button type="button" key={method} onClick={()=>setPayment(value)} className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left ${selected?'border-blue-500 bg-blue-50':'border-slate-200 hover:border-blue-200'}`}><CreditCard className={selected?'text-blue-700':'text-slate-400'}/><span className="flex-1"><b className="block">{method}</b><small className="text-slate-500">{paymentMethodCaption(value)}</small></span>{selected&&<Check className="h-5 w-5 text-blue-600"/>}</button>})}</div>{payment==='dinheiro'&&<><label className="mt-4 flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={semTroco} onChange={(e)=>setSemTroco(e.target.checked)} className="h-4 w-4"/> Não precisa de troco</label>{!semTroco&&<label className="mt-3 block text-sm font-medium">Troco para<input value={trocoPara} onChange={(e)=>setTrocoPara(e.target.value)} placeholder="0,00" inputMode="decimal" className="mt-1 w-full rounded-lg border p-2.5"/></label>}</>}</section><section className="rounded-xl border bg-white p-5"><h3 className="font-bold">Conferência</h3><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt>Contato</dt><dd className="font-semibold">{contact?.nome}</dd></div><div className="flex justify-between"><dt>Telefone</dt><dd>{contact?.telefone}</dd></div><div className="flex justify-between"><dt>Produtos</dt><dd>{lines.length}</dd></div><div className="flex justify-between"><dt>{pickupAtStore?'Retirada':'Entrega'}</dt><dd className="max-w-[190px] text-right">{pickupAtStore?(store?.nome||'Na loja'):`${address.rua}, ${address.numero}`}</dd></div><div className="flex justify-between border-t pt-3 text-base font-bold"><dt>Subtotal estimado</dt><dd>{money(estimatedSubtotal)}</dd></div></dl></section></div>}
      </main>
      <footer className="flex items-center justify-between border-t bg-white px-5 py-4 sm:px-7"><button disabled={step===1||busy} onClick={()=>{setError("");setStep(step-1)}} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 font-semibold text-slate-700 disabled:opacity-40"><ArrowLeft className="h-4 w-4"/> Voltar</button>{step<4?<button disabled={(step===2&&!lines.length)||(step===3&&!pickupAtStore&&(!address.rua||!address.numero||!address.bairro||!address.cidade||!address.estado))} onClick={()=>{setError("");setStep(step+1)}} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-40">Continuar <ArrowRight className="h-4 w-4"/></button>:<button disabled={busy||(payment==='dinheiro'&&!semTroco&&!trocoPara)} onClick={submit} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Check className="h-4 w-4"/>} Criar pedido</button>}</footer>
    </div>
    {configuring&&<div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/50 p-3"><div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="flex justify-between border-b pb-4"><div><h3 className="text-lg font-bold">Configurar {configuring.produto?.nome}</h3><p className="text-sm text-slate-500">Escolha variação e opções obrigatórias.</p></div><button onClick={()=>setConfiguring(null)}><X/></button></div>{(configuring.variacoes||[]).length>0&&<div className="mt-5"><p className="mb-2 text-sm font-bold">Variação</p><div className="grid gap-2 sm:grid-cols-2">{configuring.variacoes.map((variation:any)=><button key={variation.id} onClick={()=>setSelectedVariation(variation.id)} className={`rounded-xl border-2 p-3 text-left ${selectedVariation===variation.id?'border-blue-600 bg-blue-50':'border-slate-200'}`}><b>{variation.nome}</b><span className="float-right text-sm">{money(effectivePrice(variation))}</span></button>)}</div></div>}{(configuring.grupos||[]).map((group:any)=>{const limits=getGroupLimits(group);const count=countGroupSelections(group);return <section key={group.id} className="mt-5"><div className="flex justify-between"><p className="font-bold">{group.nome}</p><span className={`rounded-full px-2 py-0.5 text-xs ${count>=limits.minimum?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{count}/{limits.maximum}</span></div><p className="mb-2 text-xs text-slate-500">Escolha de {limits.minimum} até {limits.maximum}</p><div className="space-y-2">{(group.opcoes||[]).map((option:any)=>{const selected=optionSelection(group.id,option.id);const limitReached=!selected&&count>=limits.maximum;return <div key={option.id} className={`flex items-center justify-between rounded-xl border p-3 ${selected?'border-blue-500 bg-blue-50':''}`}><button disabled={limitReached} onClick={()=>toggleOption(group,option)} className="flex flex-1 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-45"><span className={`h-5 w-5 rounded-${group.tipo_selecao==='unica'?'full':'md'} border-2 ${selected?'border-blue-600 bg-blue-600 shadow-[inset_0_0_0_3px_white]':''}`}/><span><b className="block text-sm">{option.nome}</b>{Number(option.preco_adicional||0)>0&&<small className="text-slate-500">+ {money(option.preco_adicional)}</small>}</span></button>{selected&&group.permite_quantidade&&<div className="flex items-center rounded-lg border bg-white"><button onClick={()=>changeOptionQuantity(group,option,-1)} className="p-1.5"><Minus className="h-3 w-3"/></button><b className="w-7 text-center text-sm">{selected.quantidade}</b><button disabled={count>=limits.maximum} onClick={()=>changeOptionQuantity(group,option,1)} className="p-1.5 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-3 w-3"/></button></div>}</div>})}</div></section>})}<label className="mt-5 block text-sm font-semibold text-slate-700">Observação do item<textarea value={configurationNotes} onChange={(event)=>setConfigurationNotes(event.target.value)} maxLength={500} placeholder="Ex.: sem cebola, molho separado..." className="mt-1 min-h-20 w-full resize-y rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-blue-500"/></label><div className="mt-6 flex justify-end gap-2 border-t pt-4"><button onClick={()=>setConfiguring(null)} className="rounded-lg border px-4 py-2">Cancelar</button><button onClick={saveConfiguredLine} className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white">Adicionar ao pedido</button></div></div></div>}
  </div>;
}
