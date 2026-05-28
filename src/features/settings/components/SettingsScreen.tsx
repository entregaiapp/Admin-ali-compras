import { useState, useEffect, useCallback } from "react";
import {
  Store,
  Clock,
  Truck,
  CreditCard,
  Save,
  Bell,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  MapPin,
  Plus,
  Trash2,
  Map,
  Palette,
  Edit2,
} from "lucide-react";
import api from '@/shared/lib/api';
import LoadingModal from '@/shared/components/ui/LoadingModal';
import { showSystemNotice } from '@/shared/components/SystemNoticeModal';
import { getApiList } from '@/shared/utils/apiData';

const PRIMARY = "#122a4c";

const sections = [
  "Dados do Mercado",
  "Horário de Funcionamento",
  "Entrega",
  "Áreas de Entrega",
  "Pagamentos",
  "Notificações",
];

export function SettingsScreen() {
  const [activeSection, setActiveSection] = useState("Dados do Mercado");
  const [saved, setSaved] = useState(false);
  const [mpStatus, setMpStatus] = useState<any>(null);
  const [loadingMp, setLoadingMp] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [areasEntrega, setAreasEntrega] = useState<any[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [newArea, setNewArea] = useState({
    nome: "",
    bairro: "",
    cidade: "",
    estado: "",
    taxa_entrega: 0,
    tempo_estimado_minutos: 30,
    ativa: true,
  });
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);

  const [formData, setFormData] = useState<any>({
    nome: "",
    cnpj: "",
    razao_social: "",
    telefone: "",
    email: "",
    descricao: "",
    horario_abertura: "",
    horario_fechamento: "",
    valor_minimo_pedido: 0,
    taxa_entrega_padrao: 0,
    // Configurações
    permite_entrega: true,
    permite_retirada: true,
    tempo_medio_entrega_minutos: 30,
    whatsapp_suporte: "",
    cor_primaria: PRIMARY,
    cor_secundaria: "#16a34a",
    slogan: "",
    configId: null,
    horarios: [],
    formas_pagamento: [
      "PIX",
      "Cartão de Crédito",
      "Cartão de Débito",
      "Dinheiro",
    ],
    preferencias_notificacao: [
      "Novo pedido recebido",
      "Status do pedido alterado",
      "Entrega concluída",
    ],
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const lojaId = user.loja_id;

  const checkMpConnection = useCallback(async () => {
    if (!lojaId) return;
    try {
      setLoadingMp(true);
      const response = await api.get(
        `/mercadopago/connection-status/${lojaId}`,
      );
      setMpStatus(response.data.data);
    } catch (error) {
      console.error("Erro ao verificar conexão MP:", error);
    } finally {
      setLoadingMp(false);
    }
  }, [lojaId]);

  const loadAreasEntrega = useCallback(async () => {
    if (!lojaId) return;
    try {
      setLoadingAreas(true);
      const response = await api.get("/areas_entrega", {
        params: { loja_id: lojaId, per_page: 100 },
      });
      setAreasEntrega(getApiList(response.data));
    } catch (error) {
      console.error("Erro ao carregar áreas de entrega:", error);
    } finally {
      setLoadingAreas(false);
    }
  }, [lojaId]);

  const loadData = useCallback(async () => {
    if (!lojaId) return;
    try {
      setLoading(true);
      setError("");

      const [storeRes, configRes, horariosRes] = await Promise.allSettled([
        api.get(`/lojas/${lojaId}`),
        api.get(`/lojas/${lojaId}/configuracoes`),
        api.get(`/horarios_funcionamento/${lojaId}`),
      ]);

      let store: any = {};
      if (storeRes.status === "fulfilled") {
        store = storeRes.value.data?.data || storeRes.value.data;
      } else {
        throw new Error("Falha ao carregar dados da loja");
      }

      let config: any = {};
      if (configRes.status === "fulfilled") {
        const rawData = configRes.value.data?.data || configRes.value.data;
        config = Array.isArray(rawData) ? rawData[0] || {} : rawData || {};
      } else {
        console.warn(
          "Configurações não encontradas ou erro no servidor, usando padrões",
        );
      }

      let horarios = [];
      if (horariosRes.status === "fulfilled") {
        horarios = horariosRes.value.data?.data || [];
      } else {
        console.warn("Horários não encontrados, usando padrões");
      }

      setFormData((prev: any) => ({
        ...prev,
        ...store,
        ...config,
        configId: config.id || null,
        razao_social: store.razao_social || "",
        telefone: store.telefone || "",
        email: store.email || "",
        descricao: store.descricao || "",
        horario_abertura: store.horario_abertura || "",
        horario_fechamento: store.horario_fechamento || "",
        whatsapp_suporte: config.whatsapp_suporte || "",
        cor_primaria: config.cor_primaria || prev.cor_primaria || PRIMARY,
        cor_secundaria:
          config.cor_secundaria || prev.cor_secundaria || "#16a34a",
        slogan: config.slogan || "",
        tempo_medio_entrega_minutos:
          config.tempo_medio_entrega_minutos ??
          prev.tempo_medio_entrega_minutos ??
          30,
        valor_minimo_pedido:
          store.valor_minimo_pedido ?? prev.valor_minimo_pedido ?? 0,
        taxa_entrega_padrao:
          store.taxa_entrega_padrao ?? prev.taxa_entrega_padrao ?? 0,
        formas_pagamento: config.formas_pagamento || prev.formas_pagamento,
        preferencias_notificacao:
          config.preferencias_notificacao || prev.preferencias_notificacao,
        horarios:
          horarios.length > 0
            ? horarios
            : Array.from({ length: 7 }, (_, i) => ({
                dia_semana: i,
                aberto: true,
                horario_abertura: store.horario_abertura || "08:00",
                horario_fechamento: store.horario_fechamento || "22:00",
              })),
      }));
    } catch (err: any) {
      console.error("Erro ao carregar dados:", err);
      setError(err.message || "Falha ao carregar configurações");
    } finally {
      setLoading(false);
    }
  }, [lojaId]);

  useEffect(() => {
    loadData();
    checkMpConnection();
    loadAreasEntrega();
  }, [loadData, checkMpConnection, loadAreasEntrega]);

  const save = async () => {
    try {
      setIsSaving(true);
      setShowSuccess(false);
      setError("");
      const storeData = {
        nome: formData.nome,
        razao_social: formData.razao_social,
        cnpj: formData.cnpj,
        telefone: formData.telefone,
        email: formData.email,
        descricao: formData.descricao,
        horario_abertura: formData.horario_abertura,
        horario_fechamento: formData.horario_fechamento,
        valor_minimo_pedido: Number(formData.valor_minimo_pedido),
        taxa_entrega_padrao: Number(formData.taxa_entrega_padrao),
      };

      const configData = {
        permite_entrega: formData.permite_entrega,
        permite_retirada: formData.permite_retirada,
        tempo_medio_entrega_minutos: Number(
          formData.tempo_medio_entrega_minutos,
        ),
        whatsapp_suporte: formData.whatsapp_suporte,
        formas_pagamento: formData.formas_pagamento,
        preferencias_notificacao: formData.preferencias_notificacao,
      };

      await api.put(`/lojas/${lojaId}`, storeData);

      if (formData.configId) {
        await api.put(`/configuracoes_loja/${formData.configId}`, configData);
      } else {
        const res = await api.post(`/configuracoes_loja`, {
          ...configData,
          loja_id: lojaId,
        });
        // Atualiza o configId após criar
        setFormData((prev: any) => ({
          ...prev,
          configId: res.data?.data?.id || res.data?.id,
        }));
      }

      await api.post("/horarios_funcionamento", {
        horarios: formData.horarios,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setIsSaving(false);
        setShowSuccess(false);
      }, 1500);

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      setError("Erro ao salvar as configurações");
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleScheduleChange = (index: number, field: string, value: any) => {
    setFormData((prev: any) => {
      const newHorarios = [...prev.horarios];
      newHorarios[index] = { ...newHorarios[index], [field]: value };
      return { ...prev, horarios: newHorarios };
    });
  };

  const daysOfWeek = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];

  const handleConnectMp = async () => {
    if (!lojaId) {
      setError("Não foi possível identificar a loja para conectar o Mercado Pago.");
      return;
    }

    try {
      setLoadingMp(true);
      const response = await api.get(`/mercadopago/oauth/authorize-url/${lojaId}`);
      const url = response.data?.data?.url;

      if (!url) {
        throw new Error("URL de autorização do Mercado Pago não retornada.");
      }

      window.location.href = url;
    } catch (err: any) {
      console.error("Erro ao iniciar OAuth Mercado Pago:", err);
      setError(err.response?.data?.error?.message || err.message || "Erro ao conectar Mercado Pago.");
      setLoadingMp(false);
    }
  };

  const paymentMethods = [
    "PIX",
    "Cartão de Crédito",
    "Cartão de Débito",
    "Dinheiro",
    "Vale Refeição",
    "Vale Alimentação",
  ];

  const togglePayment = (method: string) => {
    setFormData((prev: any) => ({
      ...prev,
      formas_pagamento: prev.formas_pagamento.includes(method)
        ? prev.formas_pagamento.filter((p: string) => p !== method)
        : [...prev.formas_pagamento, method],
    }));
  };

  const toggleNotification = (type: string) => {
    setFormData((prev: any) => ({
      ...prev,
      preferencias_notificacao: prev.preferencias_notificacao.includes(type)
        ? prev.preferencias_notificacao.filter((t: string) => t !== type)
        : [...prev.preferencias_notificacao, type],
    }));
  };

  const storeImageUrl =
    formData.logo ||
    formData.foto ||
    formData.foto_url ||
    formData.image ||
    formData.imagem_url ||
    formData.logo_url ||
    "";

  const handleSaveArea = async () => {
    if (!newArea.nome || !newArea.cidade || !newArea.estado) {
      showSystemNotice("Por favor, preencha o nome, cidade e estado.");
      return;
    }

    try {
      setIsSaving(true);
      if (editingAreaId) {
        await api.patch(`/areas_entrega/${editingAreaId}`, {
          ...newArea,
          taxa_entrega: Number(newArea.taxa_entrega),
          tempo_estimado_minutos: Number(newArea.tempo_estimado_minutos),
        });
      } else {
        await api.post("/areas_entrega", {
          ...newArea,
          loja_id: lojaId,
          taxa_entrega: Number(newArea.taxa_entrega),
          tempo_estimado_minutos: Number(newArea.tempo_estimado_minutos),
        });
      }
      setShowAreaModal(false);
      setEditingAreaId(null);
      setNewArea({
        nome: "",
        bairro: "",
        cidade: "",
        estado: "",
        taxa_entrega: 0,
        tempo_estimado_minutos: 30,
        ativa: true,
      });
      loadAreasEntrega();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    } catch (err) {
      console.error("Erro ao salvar área de entrega:", err);
      showSystemNotice("Erro ao salvar área de entrega");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteArea = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta área de entrega?"))
      return;

    try {
      setLoadingAreas(true);
      await api.delete(`/areas_entrega/${id}`);
      loadAreasEntrega();
    } catch (err) {
      console.error("Erro ao excluir área de entrega:", err);
      showSystemNotice("Erro ao excluir área de entrega");
    } finally {
      setLoadingAreas(false);
    }
  };

  const handleToggleAreaStatus = async (area: any) => {
    try {
      await api.put(`/areas_entrega/${area.id}`, {
        ativa: !area.ativa,
      });
      loadAreasEntrega();
    } catch (err) {
      console.error("Erro ao alterar status da área:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-5 overflow-y-auto flex-1 h-full">
      <LoadingModal isOpen={isSaving} success={showSuccess} />
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-gray-900 font-semibold">
            Configurações do Mercado
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Gerencie os dados e regras da operação
          </p>
        </div>
        <button
          onClick={save}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all"
          style={{ backgroundColor: saved ? "#16a34a" : PRIMARY }}
        >
          <Save className="w-4 h-4" />
          {saved ? "Salvo!" : "Salvar"}
        </button>
      </div>

      <div className="flex gap-5 flex-col lg:flex-row">
        {/* Section nav */}
        <div className="lg:w-48 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors"
                style={
                  activeSection === s
                    ? {
                        backgroundColor: "#eef2f9",
                        color: PRIMARY,
                        fontWeight: 600,
                      }
                    : { color: "#6b7280" }
                }
              >
                {s}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          {activeSection === "Dados do Mercado" && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Store className="w-4 h-4" style={{ color: PRIMARY }} />
                <h3 className="font-semibold text-gray-800">
                  Informações Gerais
                </h3>
              </div>
              <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center bg-gray-50 mb-4">
                {storeImageUrl ? (
                  <img
                    src={storeImageUrl}
                    alt={`Imagem do ${formData.nome || "mercado"}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <Store className="w-8 h-8 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Nome do mercado
                  </label>
                  <div className="text-sm font-medium text-gray-800">
                    {formData.nome || "Não informado"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    CNPJ
                  </label>
                  <div className="text-sm font-medium text-gray-800">
                    {formData.cnpj || "Não informado"}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Razão Social
                  </label>
                  <div className="text-sm font-medium text-gray-800">
                    {formData.razao_social || "Não informado"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Telefone Principal
                  </label>
                  <div className="text-sm font-medium text-gray-800">
                    {formData.telefone || "Não informado"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    E-mail Administrativo
                  </label>
                  <div className="text-sm font-medium text-gray-800">
                    {formData.email || "Não informado"}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Sobre o Mercado
                  </label>
                  <div className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {formData.descricao || "Nenhuma descrição informada"}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="w-4 h-4" style={{ color: PRIMARY }} />
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Identidade visual do app
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Somente visualização. A identidade visual é gerenciada
                      pela plataforma.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">
                      Cor primária
                    </label>
                    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <span
                        className="h-8 w-8 rounded-lg border border-gray-200"
                        style={{
                          backgroundColor: formData.cor_primaria || PRIMARY,
                        }}
                      />
                      <span className="text-sm font-medium text-gray-800">
                        {formData.cor_primaria || PRIMARY}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">
                      Cor secundária
                    </label>
                    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <span
                        className="h-8 w-8 rounded-lg border border-gray-200"
                        style={{
                          backgroundColor: formData.cor_secundaria || "#16a34a",
                        }}
                      />
                      <span className="text-sm font-medium text-gray-800">
                        {formData.cor_secundaria || "#16a34a"}
                      </span>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm text-gray-600 mb-1.5">
                      Slogan
                    </label>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800">
                      {formData.slogan || "Não informado"}
                    </div>
                  </div>
                  <div
                    className="sm:col-span-2 rounded-lg border border-gray-100 p-4 text-white"
                    style={{
                      backgroundColor: formData.cor_primaria || PRIMARY,
                    }}
                  >
                    <div className="text-xs text-white/70">
                      Prévia da tela inicial
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {formData.nome || "Nome do mercado"}
                    </div>
                    <div className="text-sm text-white/80">
                      {formData.slogan || "Slogan do mercado"}
                    </div>
                    <div
                      className="mt-3 h-1.5 w-24 rounded-full"
                      style={{
                        backgroundColor: formData.cor_secundaria || "#16a34a",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "Horário de Funcionamento" && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" style={{ color: PRIMARY }} />
                <h3 className="font-semibold text-gray-800">
                  Horário de Funcionamento Semanal
                </h3>
              </div>

              <div className="space-y-3">
                {formData.horarios.map((h: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-white hover:border-gray-200 transition-all gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-[120px]">
                      <div
                        className={`w-2 h-2 rounded-full ${h.aberto ? "bg-green-500" : "bg-gray-300"}`}
                      />
                      <span className="font-medium text-gray-700">
                        {daysOfWeek[h.dia_semana]}
                      </span>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          disabled={!h.aberto}
                          value={h.horario_abertura || "08:00"}
                          onChange={(e) =>
                            handleScheduleChange(
                              idx,
                              "horario_abertura",
                              e.target.value,
                            )
                          }
                          className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary/20"
                        />
                        <span className="text-gray-400">às</span>
                        <input
                          type="time"
                          disabled={!h.aberto}
                          value={h.horario_fechamento || "22:00"}
                          onChange={(e) =>
                            handleScheduleChange(
                              idx,
                              "horario_fechamento",
                              e.target.value,
                            )
                          }
                          className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary/20"
                        />
                      </div>

                      <button
                        onClick={() =>
                          handleScheduleChange(idx, "aberto", !h.aberto)
                        }
                        className={`relative inline-flex h-5 w-9 rounded-full transition-colors flex-shrink-0`}
                        style={{
                          backgroundColor: h.aberto ? PRIMARY : "#d1d5db",
                        }}
                      >
                        <span
                          className="inline-block w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5"
                          style={{
                            transform: `translateX(${h.aberto ? 18 : 2}px)`,
                          }}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 italic">
                * Os clientes podem realizar pedidos em qualquer horário. Pedidos feitos fora do horário de funcionamento serão entregues no próximo dia em que o mercado estiver aberto.
              </p>
            </div>
          )}

          {activeSection === "Entrega" && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-4 h-4" style={{ color: PRIMARY }} />
                <h3 className="font-semibold text-gray-800">
                  Configurações de Entrega
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">
                    Taxa de entrega padrão (R$)
                  </label>
                  <input
                    type="number"
                    name="taxa_entrega_padrao"
                    value={formData.taxa_entrega_padrao}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">
                    Valor mínimo do pedido (R$)
                  </label>
                  <input
                    type="number"
                    name="valor_minimo_pedido"
                    value={formData.valor_minimo_pedido}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">
                    Tempo médio de entrega (min)
                  </label>
                  <input
                    type="number"
                    name="tempo_medio_entrega_minutos"
                    value={formData.tempo_medio_entrega_minutos}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">
                    WhatsApp de Suporte
                  </label>
                  <input
                    name="whatsapp_suporte"
                    value={formData.whatsapp_suporte}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-4 py-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="permite_entrega"
                      checked={formData.permite_entrega}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Permite Entrega
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="permite_retirada"
                      checked={formData.permite_retirada}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Permite Retirada
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeSection === "Áreas de Entrega" && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" style={{ color: PRIMARY }} />
                  <h3 className="font-semibold text-gray-800">
                    Áreas de Entrega
                  </h3>
                </div>
                <button
                  onClick={() => setShowAreaModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-all"
                  style={{ backgroundColor: PRIMARY }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Área
                </button>
              </div>

              {loadingAreas ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : areasEntrega.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Map className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    Nenhuma área de entrega cadastrada.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {areasEntrega.map((area) => (
                    <div
                      key={area.id}
                      className="p-4 border border-gray-200 rounded-xl hover:border-primary/30 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-800 text-sm">
                            {area.nome}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {area.bairro ? `${area.bairro}, ` : ""}
                            {area.cidade} - {area.estado}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleAreaStatus(area)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${area.ativa ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-400"}`}
                            title={area.ativa ? "Desativar" : "Ativar"}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingAreaId(area.id);
                              setNewArea({
                                nome: area.nome,
                                bairro: area.bairro || "",
                                cidade: area.cidade,
                                estado: area.estado,
                                taxa_entrega: area.taxa_entrega,
                                tempo_estimado_minutos: area.tempo_estimado_minutos,
                                ativa: area.ativa,
                              });
                              setShowAreaModal(true);
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteArea(area.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                        <div className="text-xs">
                          <span className="text-gray-500">Taxa: </span>
                          <span className="font-semibold text-gray-700">
                            R$ {Number(area.taxa_entrega).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs">
                          <span className="text-gray-500">Tempo: </span>
                          <span className="font-semibold text-gray-700">
                            {area.tempo_estimado_minutos} min
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === "Pagamentos" && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4" style={{ color: PRIMARY }} />
                <h3 className="font-semibold text-gray-800">
                  Formas de Pagamento
                </h3>
              </div>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <span className="text-sm text-gray-700">{method}</span>
                    <button
                      onClick={() => togglePayment(method)}
                      className="relative inline-flex h-5 w-9 rounded-full transition-colors"
                      style={{
                        backgroundColor: formData.formas_pagamento.includes(
                          method,
                        )
                          ? PRIMARY
                          : "#d1d5db",
                      }}
                    >
                      <span
                        className="inline-block w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5"
                        style={{
                          transform: `translateX(${formData.formas_pagamento.includes(method) ? 18 : 2}px)`,
                        }}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#009ee3] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">MP</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800">
                        Split de Pagamentos (Mercado Pago)
                      </h4>
                      <p className="text-xs text-gray-500">
                        Conecte sua conta para receber pagamentos e split
                        automático
                      </p>
                    </div>
                  </div>
                  {loadingMp ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  ) : mpStatus?.connected ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-600 text-xs font-medium border border-green-100">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Conectado
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-medium border border-amber-100">
                      <XCircle className="w-3.5 h-3.5" />
                      Não conectado
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  {mpStatus?.connected ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">ID da Conta:</span>
                        <span className="font-mono text-gray-700">
                          {mpStatus.mp_user_id}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Status no MP:</span>
                        <span className="capitalize text-gray-700">
                          {mpStatus.onboarding_status || "Aprovado"}
                        </span>
                      </div>
                      <button
                        onClick={handleConnectMp}
                        className="w-full mt-2 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-white transition-colors"
                      >
                        Reconectar Conta
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                        Para ativar o recebimento automático de vendas e o split
                        de comissões da plataforma, você precisa autorizar nossa
                        aplicação no seu Mercado Pago.
                      </p>
                      <button
                        onClick={handleConnectMp}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition-all hover:brightness-110 shadow-sm"
                        style={{ backgroundColor: "#009ee3" }}
                      >
                        <LinkIcon className="w-4 h-4" />
                        Conectar com Mercado Pago
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === "Notificações" && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4" style={{ color: PRIMARY }} />
                <h3 className="font-semibold text-gray-800">
                  Preferências de Notificação
                </h3>
              </div>
              <div className="space-y-3">
                {[
                  "Novo pedido recebido",
                  "Pedido atrasado",
                  "Produto sem estoque",
                  "Falha em pagamento",
                  "Cupom expirando",
                  "Novo cliente cadastrado",
                  "Entrega concluída",
                ].map((notif) => (
                  <div
                    key={notif}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <span className="text-sm text-gray-700">{notif}</span>
                    <button
                      onClick={() => toggleNotification(notif)}
                      className="relative inline-flex h-5 w-9 rounded-full transition-colors"
                      style={{
                        backgroundColor:
                          formData.preferencias_notificacao.includes(notif)
                            ? PRIMARY
                            : "#d1d5db",
                      }}
                    >
                      <span
                        className="inline-block w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5"
                        style={{
                          transform: `translateX(${formData.preferencias_notificacao.includes(notif) ? 18 : 2}px)`,
                        }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nova Área */}
      {showAreaModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Nova Área de Entrega
              </h3>
              <button
                onClick={() => setShowAreaModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                  Nome da Área (ex: Bairro Centro)
                </label>
                <input
                  type="text"
                  value={newArea.nome}
                  onChange={(e) =>
                    setNewArea({ ...newArea, nome: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Nome identificador"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={newArea.bairro}
                    onChange={(e) =>
                      setNewArea({ ...newArea, bairro: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={newArea.cidade}
                    onChange={(e) =>
                      setNewArea({ ...newArea, cidade: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={newArea.estado}
                    onChange={(e) =>
                      setNewArea({
                        ...newArea,
                        estado: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="SP"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                    Taxa (R$)
                  </label>
                  <input
                    type="number"
                    value={newArea.taxa_entrega}
                    onChange={(e) =>
                      setNewArea({
                        ...newArea,
                        taxa_entrega: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                    Tempo (min)
                  </label>
                  <input
                    type="number"
                    value={newArea.tempo_estimado_minutos}
                    onChange={(e) =>
                      setNewArea({
                        ...newArea,
                        tempo_estimado_minutos: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowAreaModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveArea}
                className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all hover:brightness-110 shadow-sm"
                style={{ backgroundColor: PRIMARY }}
              >
                Criar Área
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
