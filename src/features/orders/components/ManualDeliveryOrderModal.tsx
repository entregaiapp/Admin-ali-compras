import { useEffect, useMemo, useRef, useState } from "react";
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
  error?.response?.data?.error?.message || error?.response?.data?.message || "Não foi possível concluir a operação.";
const money = (value: any) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const normalizeSearchText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
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
const effectivePrice = (item: any, withoutAppTax = false) => {
  if (!withoutAppTax && item?.preco_app_taxa_ativa) {
    return Number(item?.preco_promocional_app ?? item?.preco_app ?? item?.preco_a_partir_de_app ?? item?.preco_a_partir_de ?? item?.preco_promocional ?? item?.preco ?? 0);
  }
  return Number(item?.preco_a_partir_de ?? item?.preco_promocional ?? item?.preco ?? 0);
};
const productPriceLabel = (product: any, withoutAppTax = false) => {
  const price = effectivePrice(product, withoutAppTax);
  if (!Number.isFinite(price) || price <= 0) {
    return product?.modo_compra === "configuravel" ? "Preco na configuracao" : "Sem preco";
  }
  return product?.modo_compra === "configuravel" ? `A partir de ${money(price)}` : money(price);
};
const isPromotionActive = (promotional: any, endsAt: any) =>
  promotional != null && (!endsAt || new Date(endsAt).getTime() >= Date.now());
const DEFAULT_PAYMENT_METHODS = ["PIX", "Cartão de Crédito", "Cartão de Débito", "Dinheiro"];
const PAYMENT_METHOD_VALUES: Record<string, string> = {
  "PIX": "pix",
  "Cartão de Crédito": "cartao_credito",
  "Cartão de Débito": "cartao_debito",
  "Dinheiro": "dinheiro",
  "Vale Refeição": "vale_refeicao",
  "Vale Alimentação": "vale_alimentacao",
  "Fiado": "fiado",
};
const CARD_PAYMENT_VALUES = new Set(["cartao_credito", "cartao_debito"]);
const paymentMethodCaption = (value: string) =>
  value === "fiado"
    ? "Conta fiado do contato"
    :
  value === "dinheiro" || CARD_PAYMENT_VALUES.has(value)
    ? "Pagar na entrega"
    : "Pagamento externo ao app";
const STEP_CONTACT = 1;
const STEP_COLLABORATOR = 2;
const STEP_PRODUCTS = 3;
const STEP_ADDRESS = 4;
const STEP_PAYMENT = 5;
const STEPS = [
  { id: STEP_CONTACT, label: "Contato", icon: UserRound },
  { id: STEP_COLLABORATOR, label: "Colaborador", icon: UserRound },
  { id: STEP_PRODUCTS, label: "Produtos", icon: ShoppingBasket },
  { id: STEP_ADDRESS, label: "Endereço", icon: MapPin },
  { id: STEP_PAYMENT, label: "Pagamento", icon: CreditCard },
];

const EMPTY_ADDRESS = {
  rua: "", numero: "", bairro: "", cidade: "", estado: "", cep: "", complemento: "", ponto_referencia: "",
};

const normalizeSavedAddress = (savedAddress: any) => {
  if (!savedAddress) return { ...EMPTY_ADDRESS };
  return {
    rua: savedAddress.rua || "",
    numero: savedAddress.numero || "",
    bairro: savedAddress.bairro || "",
    cidade: savedAddress.cidade || "",
    estado: savedAddress.estado || "",
    cep: savedAddress.cep || "",
    complemento: savedAddress.complemento || "",
    ponto_referencia: savedAddress.ponto_referencia || "",
  };
};

const formatSavedAddress = (savedAddress: any) => {
  if (!savedAddress) return "";
  return [
    [savedAddress.rua, savedAddress.numero].filter(Boolean).join(", "),
    savedAddress.bairro,
    savedAddress.cidade,
  ].filter(Boolean).join(" - ");
};

const getLoggedUser = () => {
  try {
    const userJson = localStorage.getItem("user");
    return userJson ? JSON.parse(userJson) : null;
  } catch {
    return null;
  }
};

const phoneSearchPattern = /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9?\d{4})[-.\s]?\d{4}/;
const onlyDigits = (value: string) => String(value || "").replace(/\D/g, "");
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

export function ManualDeliveryOrderModal({ lojaId, primaryColor = "#2563eb", fiadoEnabled = false, onClose, onCreated }: {
  lojaId: string; primaryColor?: string; fiadoEnabled?: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [contactQuery, setContactQuery] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [contact, setContact] = useState<any>(null);
  const [fiadoColaborador, setFiadoColaborador] = useState<boolean | null>(null);
  const [quick, setQuick] = useState({ nome: "", telefone: "" });
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
  const [address, setAddress] = useState<any>({ ...EMPTY_ADDRESS });
  const [pickupAtStore, setPickupAtStore] = useState(false);
  const [store, setStore] = useState<any>(null);
  const [themePrimary, setThemePrimary] = useState(primaryColor);
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<string[]>(DEFAULT_PAYMENT_METHODS);
  const [payment, setPayment] = useState("dinheiro");
  const [semTroco, setSemTroco] = useState(true);
  const [trocoPara, setTrocoPara] = useState("");
  const quickNameRef = useRef<HTMLInputElement | null>(null);
  const quickPhoneRef = useRef<HTMLInputElement | null>(null);
  const firstOptionSearchRef = useRef<HTMLInputElement | null>(null);
  const loggedUser = useMemo(() => getLoggedUser(), []);
  const primary = themePrimary || primaryColor || "#2563eb";
  const primarySoft = hexToRgba(primary, 0.1);
  const primaryBorder = hexToRgba(primary, 0.35);
  const buttonStyle = { backgroundColor: primary };
  const activeSteps = useMemo(
    () => (fiadoEnabled ? STEPS : STEPS.filter((item) => item.id !== STEP_COLLABORATOR)),
    [fiadoEnabled],
  );
  const currentStepIndex = activeSteps.findIndex((item) => item.id === step);
  const previousStep = currentStepIndex > 0 ? activeSteps[currentStepIndex - 1]?.id : null;
  const nextStep = currentStepIndex >= 0 ? activeSteps[currentStepIndex + 1]?.id : null;
  const inferredQuickContact = useMemo(() => inferQuickContactFromQuery(contactQuery), [contactQuery]);
  const hasInferredQuickContact = Boolean(inferredQuickContact.nome || inferredQuickContact.telefone);
  const usePricesWithoutAppTax = fiadoEnabled && fiadoColaborador === true;
  const contactStepBlocked = step === STEP_CONTACT && !contact;
  const collaboratorStepBlocked = step === STEP_COLLABORATOR && fiadoColaborador === null;

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
        setProducts(payload.products);
        setCatalogPage(payload.page);
        setCatalogTotal(payload.total);
        setCatalogTotalPages(payload.totalPages);
      })
      .catch(() => {
        if (!cancelled) setError("Nao foi possivel carregar o catalogo.");
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedProductSearch]);

  useEffect(() => {
    Promise.allSettled([
      api.get(`/lojas/${lojaId}`),
      api.get(`/lojas/${lojaId}/configuracoes`),
    ]).then(([storeResult, configResult]) => {
      setStore(storeResult.status === "fulfilled" ? unwrap(storeResult.value) : null);
      const config = configResult.status === "fulfilled" ? unwrap(configResult.value) : null;
      setThemePrimary(config?.cor_primaria || primaryColor);
      const methods = Array.isArray(config?.formas_pagamento) && config.formas_pagamento.length
        ? config.formas_pagamento
        : DEFAULT_PAYMENT_METHODS;
      const nextMethods = fiadoEnabled && !methods.includes("Fiado") ? [...methods, "Fiado"] : methods;
      setAcceptedPaymentMethods(nextMethods);
      setPayment(PAYMENT_METHOD_VALUES[nextMethods[0]] || String(nextMethods[0]).toLowerCase());
    });
  }, [fiadoEnabled, lojaId, primaryColor]);

  useEffect(() => {
    if (!configuring) return;
    setOptionSearches({});
    const hasSearchableGroup = (configuring.grupos || []).some((group: any) => (group.opcoes || []).length > 5);
    if (!hasSearchableGroup) return;
    window.setTimeout(() => {
      firstOptionSearchRef.current?.focus();
      firstOptionSearchRef.current?.select();
    }, 0);
  }, [configuring]);

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
      const option = (group.opcoes || []).find((item: any) => item.id === selection.opcao_id);
      if (!option || !isOptionAvailable(option)) return next;
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
      setProducts((current) => mergeUniqueProducts(current, payload.products));
      setCatalogPage(payload.page);
      setCatalogTotal(payload.total);
      setCatalogTotalPages(payload.totalPages);
    } catch {
      setError("Nao foi possivel carregar mais produtos.");
    } finally {
      setCatalogLoadingMore(false);
    }
  };

  const estimatedSubtotal = useMemo(() => lines.reduce(
    (sum, line) => sum + Number(line.preco || 0) * Number(line.quantidade || 0), 0,
  ), [lines]);

  const profileContact = useMemo(() => {
    const name = loggedUser?.nome || loggedUser?.name || store?.nome || "Usuário da loja";
    const phoneValue = loggedUser?.telefone || loggedUser?.celular || loggedUser?.phone || store?.telefone || "";
    return {
      nome: String(name || "").trim(),
      telefone: String(phoneValue || "").trim(),
    };
  }, [loggedUser, store]);

  const useMyProfile = () => {
    if (!profileContact.nome || profileContact.telefone.replace(/\D/g, "").length < 8) {
      setError("Seu perfil nao possui telefone valido. Preencha o contato rapido para continuar.");
      return;
    }
    chooseContact({ id: `profile-${loggedUser?.id || "store"}`, ...profileContact, perfil_loja: true });
  };

  const chooseContact = (selected: any) => {
    setContact(selected);
    setFiadoColaborador(null);
    setLines([]);
    setConfiguring(null);
    setQuick({ nome: selected.nome, telefone: selected.telefone });
    setAddress(normalizeSavedAddress(selected.ultimo_endereco));
    setPickupAtStore(false);
    setError("");
    setStep(fiadoEnabled ? STEP_COLLABORATOR : STEP_PRODUCTS);
  };
  const answerFiadoCollaborator = (isCollaborator: boolean) => {
    setFiadoColaborador(isCollaborator);
    setLines([]);
    setConfiguring(null);
    setError("");
    setStep(STEP_PRODUCTS);
  };
  const mergeQuickContactDraft = (draft = inferredQuickContact) => {
    if (!draft.nome && !draft.telefone) return;
    setQuick((current) => ({
      nome: draft.nome || current.nome,
      telefone: draft.telefone || current.telefone,
    }));
  };
  const handleContactQueryChange = (value: string) => {
    setContactQuery(value);
    mergeQuickContactDraft(inferQuickContactFromQuery(value));
  };
  const useTypedContactDraft = () => {
    mergeQuickContactDraft();
    window.setTimeout(() => {
      if (!inferredQuickContact.nome) quickNameRef.current?.focus();
      else if (!inferredQuickContact.telefone) quickPhoneRef.current?.focus();
    }, 0);
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
        quantidade: 1, selecoes: [], nome: product.nome, preco: effectivePrice(product, usePricesWithoutAppTax),
      }]);
      return;
    }
    setBusy(true);
    try {
      const config = unwrap(await api.get(`/produtos_loja/${product.id}/configuracao`));
      setConfiguring(config);
      setSelectedVariation(config?.variacoes?.[0]?.id || "");
      setSelectedOptions([]);
      setOptionSearches({});
      setConfigurationNotes("");
    } catch (caught) { setError(apiError(caught)); } finally { setBusy(false); }
  };

  const optionSelection = (groupId: string, optionId: string) =>
    selectedOptions.find((selection) => selection.grupo_id === groupId && selection.opcao_id === optionId);
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
    return options.filter((option: any) =>
      normalizeSearchText(`${option.nome || ""} ${option.descricao || ""}`).includes(search)
    );
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
  const configuredUnitPrice = useMemo(() => {
    if (!configuring?.produto) return 0;
    let basePrice = effectivePrice(selectedVariationData, usePricesWithoutAppTax) || effectivePrice(configuring.produto, usePricesWithoutAppTax);
    let optionsPrice = 0;

    for (const group of configuring.grupos || []) {
      const groupSelections = selectedOptions.filter((selection) => selection.grupo_id === group.id);
      if (group.tipo_selecao === "fracionada" && groupSelections.length > 0) {
        const fraction = 1 / groupSelections.length;
        const fractionalPrice = groupSelections.reduce((sum, selection) => {
          const option = (group.opcoes || []).find((item: any) => item.id === selection.opcao_id);
          return option ? sum + getOptionPrice(option) * fraction : sum;
        }, 0);
        if (group.substitui_preco_base) basePrice = fractionalPrice;
        else optionsPrice += fractionalPrice;
        continue;
      }
      for (const selection of groupSelections) {
        const option = (group.opcoes || []).find((item: any) => item.id === selection.opcao_id);
        if (!option) continue;
        const quantity = group.permite_quantidade ? Number(selection.quantidade || 1) : 1;
        optionsPrice += getOptionPrice(option) * quantity;
      }
    }

    return Number((basePrice + optionsPrice).toFixed(2));
  }, [configuring, selectedOptions, selectedVariationData, usePricesWithoutAppTax]);
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
      preco: configuredUnitPrice,
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
          colaborador: fiadoEnabled ? fiadoColaborador === true : undefined,
          fiado_colaborador: fiadoEnabled ? fiadoColaborador === true : undefined,
          sem_troco: payment === "dinheiro" ? semTroco : undefined,
          troco_para: payment === "dinheiro" && !semTroco ? Number(trocoPara.replace(",", ".")) : undefined,
        },
      });
      onCreated(); onClose();
    } catch (caught) { setError(apiError(caught)); } finally { setBusy(false); }
  };

  let optionSearchRefAssigned = false;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-3">
      <div className="flex h-[calc(100vh-1rem)] w-[98vw] max-w-[96rem] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[calc(100vh-1.5rem)]">
        <header className="border-b bg-white px-5 py-4 sm:px-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Novo pedido delivery</h2>
              <p className="text-sm text-slate-500">Pedido feito pelo atendimento da loja</p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-5 grid gap-2" style={{ gridTemplateColumns: `repeat(${activeSteps.length}, minmax(0, 1fr))` }}>
            {activeSteps.map((item) => {
              const Icon = item.icon;
              const active = item.id === step;
              const itemIndex = activeSteps.findIndex((candidate) => candidate.id === item.id);
              const done = itemIndex >= 0 && currentStepIndex >= 0 && itemIndex < currentStepIndex;
              const highlighted = active || done;
              return (
                <div key={item.id} className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={highlighted ? { ...buttonStyle, color: "white" } : { backgroundColor: "#f1f5f9", color: "#94a3b8" }}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className="hidden text-sm font-semibold sm:block" style={{ color: highlighted ? primary : "#64748b" }}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-5 sm:p-7">
          {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {step === STEP_CONTACT && (
            <div className="mx-auto max-w-2xl space-y-6">
              <section className="rounded-xl border bg-white p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">Localizar contato</h3>
                    <p className="text-sm text-slate-500">Pesquise pelo nome ou número de telefone.</p>
                  </div>
                  <button
                    type="button"
                    onClick={useMyProfile}
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    style={buttonStyle}
                  >
                    <UserRound className="h-4 w-4" />
                    Usar meu perfil
                  </button>
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    autoFocus
                    value={contactQuery}
                    onChange={(event) => handleContactQueryChange(event.target.value)}
                    placeholder="Ex.: Maria ou (81) 99999-9999"
                    className="w-full rounded-xl border py-2.5 pl-10 pr-10 outline-none"
                    style={{ borderColor: contactQuery ? primaryBorder : undefined }}
                  />
                  {contactLoading && <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin" style={{ color: primary }} />}
                </div>
                {contactQuery && (
                  <div className="mt-3 overflow-hidden rounded-xl border">
                    {contacts.length ? contacts.map((item) => (
                      <button key={item.id} onClick={() => chooseContact(item)} className="flex w-full items-center justify-between gap-3 border-b bg-white p-3 text-left last:border-0 hover:bg-slate-50">
                        <span className="min-w-0">
                          <b className="block text-slate-800">{item.nome}</b>
                          <small className="text-slate-500">{item.telefone}</small>
                          {item.ultimo_endereco && (
                            <small className="mt-1 block truncate text-slate-500">
                              Ultimo endereco salvo: {formatSavedAddress(item.ultimo_endereco)}
                            </small>
                          )}
                          {Number(item.fiado_saldo_aberto || 0) > 0 && (
                            <small className="mt-1 block font-semibold text-amber-700">
                              Fiado em aberto: {money(item.fiado_saldo_aberto)} em {Number(item.fiado_pedidos_abertos || 0)} pedido{Number(item.fiado_pedidos_abertos || 0) === 1 ? "" : "s"}
                            </small>
                          )}
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0" style={{ color: primary }} />
                      </button>
                    )) : !contactLoading && (
                      <div className="bg-white p-4 text-center text-sm text-slate-500">
                        <p>Nenhum contato encontrado.</p>
                        {hasInferredQuickContact && (
                          <button
                            type="button"
                            onClick={useTypedContactDraft}
                            className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white"
                            style={buttonStyle}
                          >
                            <Plus className="h-4 w-4" />
                            Usar dado digitado
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-xl border bg-white p-5">
                <h3 className="font-bold text-slate-900">Cadastrar contato rápido</h3>
                <p className="mb-4 text-sm text-slate-500">Será vinculado somente a esta loja.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Nome
                    <input ref={quickNameRef} value={quick.nome} onChange={(event) => setQuick({ ...quick, nome: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5" placeholder="Nome do cliente" />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Telefone
                    <input ref={quickPhoneRef} value={quick.telefone} onChange={(event) => setQuick({ ...quick, telefone: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5" placeholder="(00) 00000-0000" />
                  </label>
                </div>
                <button onClick={createQuickContact} className="mt-4 rounded-lg px-4 py-2.5 font-semibold text-white" style={buttonStyle}>
                  Continuar com novo contato
                </button>
              </section>
            </div>
          )}

          {step === STEP_COLLABORATOR && (
            <div className="mx-auto max-w-xl">
              <section className="rounded-xl border bg-white p-6 text-center">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Colaborador</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                  {contact?.nome} é colaborador?
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Se não for colaborador, a taxa do app será aplicada quando estiver configurada.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => answerFiadoCollaborator(true)}
                    className="rounded-xl border-2 px-5 py-4 text-base font-bold text-slate-900"
                    style={{ borderColor: primary, backgroundColor: primarySoft }}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => answerFiadoCollaborator(false)}
                    className="rounded-xl border-2 border-slate-200 px-5 py-4 text-base font-bold text-slate-900 hover:bg-slate-50"
                  >
                    Não
                  </button>
                </div>
              </section>
            </div>
          )}

          {step === STEP_PRODUCTS && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
              <section className="rounded-xl border bg-white p-4">
                <div className="mb-3">
                  <h3 className="font-bold text-slate-900">Adicionar produtos</h3>
                  <p className="text-sm text-slate-500">Pesquise pelo nome, código ou categoria.</p>
                  {fiadoEnabled && fiadoColaborador !== null && (
                    <p className="mt-1 text-xs font-semibold" style={{ color: primary }}>
                      {usePricesWithoutAppTax ? "Colaborador: preços sem taxa" : "Não colaborador: taxa do app aplicada quando configurada"}
                    </p>
                  )}
                  {catalogTotal > 0 && (
                    <p className="mt-1 text-xs font-semibold text-slate-500">{products.length} de {catalogTotal} produtos carregados</p>
                  )}
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                  <input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Buscar produto pelo nome..." className="w-full rounded-lg border py-2 pl-10 pr-3" />
                </div>
                <div className="max-h-[58vh] overflow-y-auto rounded-lg border xl:max-h-[620px]">
                  {catalogLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" style={{ color: primary }} /></div>
                  ) : products.length ? (
                    <>
                      {products.map((product) => (
                        <button key={product.id} onClick={() => addProduct(product)} className="flex w-full items-center justify-between gap-3 border-b p-3 text-left last:border-0 hover:bg-slate-50">
                          <span className="min-w-0">
                            <b className="block truncate text-slate-800">{product.nome}</b>
                            <small className="text-slate-500">{product.categoria_nome || (product.modo_compra === "configuravel" ? "Configurar opcoes" : "Produto")}</small>
                          </span>
                          <span className="ml-auto shrink-0 text-right">
                            <b className="block text-sm text-slate-900">{productPriceLabel(product, usePricesWithoutAppTax)}</b>
                            {product.modo_compra === "configuravel" && <small className="text-slate-500">Configurar</small>}
                          </span>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: primarySoft, color: primary }}>
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

              <aside className="rounded-xl border bg-white p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Resumo do pedido</h3>
                  <span className="rounded-full px-2 py-1 text-xs font-bold" style={{ backgroundColor: primarySoft, color: primary }}>{lines.length} itens</span>
                </div>
                <p className="mb-3 text-sm text-slate-500">Contato: {contact?.nome}</p>
                <div className="max-h-[360px] space-y-2 overflow-y-auto">
                  {lines.length ? lines.map((line, index) => (
                    <div key={line.client_line_id} className="rounded-lg border p-3">
                      <div className="flex justify-between gap-2">
                        <span>
                          <b className="block text-sm">{line.nome}</b>
                          {line.detalhe && <small className="text-slate-500">{line.detalhe}</small>}
                        </span>
                        <button onClick={() => setLines(lines.filter((_, current) => current !== index))} className="text-red-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-lg border">
                          <button onClick={() => changeLineQuantity(index, -1)} className="p-1.5"><Minus className="h-3 w-3" /></button>
                          <b className="w-7 text-center text-sm">{line.quantidade}</b>
                          <button onClick={() => changeLineQuantity(index, 1)} className="p-1.5"><Plus className="h-3 w-3" /></button>
                        </div>
                        <span className="text-sm font-semibold">{money(line.preco * line.quantidade)}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="py-10 text-center text-slate-400">
                      <Package className="mx-auto mb-2 h-8 w-8" />
                      <p className="text-sm">Adicione produtos ao pedido</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-between border-t pt-3 font-bold">
                  <span>Subtotal estimado</span>
                  <span>{money(estimatedSubtotal)}</span>
                </div>
              </aside>
            </div>
          )}

          {step === STEP_ADDRESS && (
            <div className="mx-auto max-w-3xl space-y-4">
              <button
                type="button"
                onClick={() => { setPickupAtStore(true); setError(""); }}
                className="flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left"
                style={pickupAtStore ? { borderColor: primary, backgroundColor: primarySoft } : { borderColor: "#e2e8f0", backgroundColor: "white" }}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: primarySoft, color: primary }}><Store className="h-5 w-5" /></span>
                <span className="flex-1"><b className="block text-slate-900">Retirada no endereço da loja</b><small className="text-slate-500">{store?.nome || "Loja"} · não precisa informar endereço de entrega</small></span>
                {pickupAtStore && <Check className="h-5 w-5" style={{ color: primary }} />}
              </button>
              <section className={`rounded-xl border bg-white p-5 ${pickupAtStore ? "opacity-60" : ""}`}>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div><h3 className="font-bold text-slate-900">Entrega no endereço do contato</h3><p className="text-sm text-slate-500">Preencha o endereço; a localização será encontrada ao finalizar.</p></div>
                  {pickupAtStore && <button type="button" onClick={() => setPickupAtStore(false)} className="shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold" style={{ color: primary }}>Usar entrega</button>}
                </div>
                <fieldset disabled={pickupAtStore} className="grid gap-4 sm:grid-cols-6">
                  <label className="text-sm font-medium sm:col-span-2">CEP<input value={address.cep} onChange={(e) => setAddress({ ...address, cep: e.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label>
                  <label className="text-sm font-medium sm:col-span-4">Rua<input value={address.rua} onChange={(e) => setAddress({ ...address, rua: e.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label>
                  <label className="text-sm font-medium sm:col-span-2">Número<input value={address.numero} onChange={(e) => setAddress({ ...address, numero: e.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label>
                  <label className="text-sm font-medium sm:col-span-4">Complemento<input value={address.complemento} onChange={(e) => setAddress({ ...address, complemento: e.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label>
                  <label className="text-sm font-medium sm:col-span-3">Bairro<input value={address.bairro} onChange={(e) => setAddress({ ...address, bairro: e.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label>
                  <label className="text-sm font-medium sm:col-span-2">Cidade<input value={address.cidade} onChange={(e) => setAddress({ ...address, cidade: e.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label>
                  <label className="text-sm font-medium sm:col-span-1">UF<input maxLength={2} value={address.estado} onChange={(e) => setAddress({ ...address, estado: e.target.value.toUpperCase() })} className="mt-1 w-full rounded-lg border p-2.5 uppercase" /></label>
                  <label className="text-sm font-medium sm:col-span-6">Ponto de referência<input value={address.ponto_referencia} onChange={(e) => setAddress({ ...address, ponto_referencia: e.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label>
                </fieldset>
              </section>
            </div>
          )}

          {step === STEP_PAYMENT && (
            <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2">
              <section className="rounded-xl border bg-white p-5">
                <h3 className="font-bold">Forma de pagamento</h3>
                <p className="mt-1 text-xs text-slate-500">Apenas para controle. Cartão e dinheiro serão cobrados na entrega.</p>
                <div className="mt-4 space-y-2">
                  {acceptedPaymentMethods.map((method) => {
                    const value = PAYMENT_METHOD_VALUES[method] || String(method).toLowerCase();
                    const selected = payment === value;
                    return (
                      <button type="button" key={method} onClick={() => setPayment(value)} className="flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left" style={selected ? { borderColor: primary, backgroundColor: primarySoft } : { borderColor: "#e2e8f0" }}>
                        <CreditCard style={{ color: selected ? primary : "#94a3b8" }} />
                        <span className="flex-1"><b className="block">{method}</b><small className="text-slate-500">{paymentMethodCaption(value)}</small></span>
                        {selected && <Check className="h-5 w-5" style={{ color: primary }} />}
                      </button>
                    );
                  })}
                </div>
                {payment === "dinheiro" && (
                  <>
                    <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={semTroco} onChange={(e) => setSemTroco(e.target.checked)} className="h-4 w-4" /> Não precisa de troco</label>
                    {!semTroco && <label className="mt-3 block text-sm font-medium">Troco para<input value={trocoPara} onChange={(e) => setTrocoPara(e.target.value)} placeholder="0,00" inputMode="decimal" className="mt-1 w-full rounded-lg border p-2.5" /></label>}
                  </>
                )}
              </section>
              <section className="rounded-xl border bg-white p-5">
                <h3 className="font-bold">Conferência</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between"><dt>Contato</dt><dd className="font-semibold">{contact?.nome}</dd></div>
                  <div className="flex justify-between"><dt>Telefone</dt><dd>{contact?.telefone}</dd></div>
                  <div className="flex justify-between"><dt>Produtos</dt><dd>{lines.length}</dd></div>
                  <div className="flex justify-between"><dt>{pickupAtStore ? "Retirada" : "Entrega"}</dt><dd className="max-w-[190px] text-right">{pickupAtStore ? (store?.nome || "Na loja") : `${address.rua}, ${address.numero}`}</dd></div>
                  <div className="flex justify-between border-t pt-3 text-base font-bold"><dt>Subtotal estimado</dt><dd>{money(estimatedSubtotal)}</dd></div>
                </dl>
              </section>
            </div>
          )}
        </main>

        <footer className="flex items-center justify-between border-t bg-white px-5 py-4 sm:px-7">
          <button disabled={!previousStep || busy} onClick={() => { setError(""); if (previousStep) setStep(previousStep); }} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 font-semibold text-slate-700 disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Voltar</button>
          {nextStep ? (
            <button disabled={contactStepBlocked || collaboratorStepBlocked || (step === STEP_PRODUCTS && !lines.length) || (step === STEP_ADDRESS && !pickupAtStore && (!address.rua || !address.numero || !address.bairro || !address.cidade || !address.estado))} onClick={() => { setError(""); setStep(nextStep); }} className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold text-white disabled:opacity-40" style={buttonStyle}>Continuar <ArrowRight className="h-4 w-4" /></button>
          ) : (
            <button disabled={busy || (payment === "dinheiro" && !semTroco && !trocoPara)} onClick={submit} className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold text-white disabled:opacity-50" style={buttonStyle}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Criar pedido</button>
          )}
        </footer>
      </div>

      {configuring && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/50 p-3">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-bold">Configurar {configuring.produto?.nome}</h3>
                <p className="text-sm text-slate-500">Escolha variação e opções obrigatórias.</p>
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
                      <button key={variation.id} onClick={() => setSelectedVariation(variation.id)} className="rounded-xl border-2 p-3 text-left" style={selected ? { borderColor: primary, backgroundColor: primarySoft } : { borderColor: "#e2e8f0" }}>
                        <b>{variation.nome}</b>
                        <span className="float-right text-sm">{money(effectivePrice(variation, usePricesWithoutAppTax))}</span>
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
                        <div key={option.id} className="flex items-center justify-between rounded-xl border p-3" style={selected ? { borderColor: primary, backgroundColor: primarySoft } : { borderColor: "#e2e8f0" }}>
                          <button disabled={limitReached} onClick={() => toggleOption(group, option)} className="flex flex-1 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-45">
                            <span
                              className="h-5 w-5 border-2"
                              style={{
                                ...(selected ? { borderColor: primary, backgroundColor: primary, boxShadow: "inset 0 0 0 3px white" } : { borderColor: "#cbd5e1" }),
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
              <textarea value={configurationNotes} onChange={(event) => setConfigurationNotes(event.target.value)} maxLength={500} placeholder="Ex.: sem cebola, molho separado..." className="mt-1 min-h-20 w-full resize-y rounded-xl border border-slate-200 p-3 font-normal outline-none" />
            </label>
            <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Total do item</p>
                <p className="text-lg font-bold text-slate-900">{money(configuredUnitPrice)}</p>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfiguring(null)} className="rounded-lg border px-4 py-2">Cancelar</button>
                <button onClick={saveConfiguredLine} className="rounded-lg px-5 py-2 font-semibold text-white" style={buttonStyle}>Adicionar ao pedido</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
