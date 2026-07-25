import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  Search,
  Store,
  UserRound,
} from "lucide-react";
import api from "@/shared/lib/api";
import { formatBrasiliaDate } from "@/shared/lib/dateTime";

type FeedbackRating = "ruim" | "bom" | "otimo";

interface FeedbackItem {
  id: string;
  pedido_id: string;
  pedido_numero?: string | null;
  loja_id: string;
  loja_nome: string;
  avaliacao: FeedbackRating;
  justificativa?: string | null;
  origem?: string | null;
  criado_em: string;
}

interface CustomerFeedbackGroup {
  cliente_id: string | null;
  cliente_nome: string;
  cliente_email?: string | null;
  cliente_telefone?: string | null;
  total_feedbacks: number;
  total_ruim: number;
  total_bom: number;
  total_otimo: number;
  primeiro_feedback_em: string;
  ultimo_feedback_em: string;
  feedbacks: FeedbackItem[];
}

interface FeedbackResponse {
  data?: {
    data?: CustomerFeedbackGroup[];
    total?: number;
    total_pages?: number;
  };
  message?: string;
}

const PAGE_SIZE = 10;

const ratingLabel: Record<FeedbackRating, string> = {
  ruim: "Ruim",
  bom: "Bom",
  otimo: "Ótimo",
};

const ratingStyle: Record<FeedbackRating, string> = {
  ruim: "border-red-200 bg-red-50 text-red-700",
  bom: "border-amber-200 bg-amber-50 text-amber-700",
  otimo: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function getErrorMessage(error: unknown) {
  const candidate = error as { response?: { data?: { message?: string } } };
  return candidate.response?.data?.message || "Erro ao carregar feedbacks dos clientes";
}

function getFeedbackGroupKey(group: CustomerFeedbackGroup) {
  return group.cliente_id
    || group.cliente_email
    || group.cliente_telefone
    || group.feedbacks[0]?.id
    || group.cliente_nome;
}

export function FeedbacksScreen() {
  const [groups, setGroups] = useState<CustomerFeedbackGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("todos");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<FeedbackResponse>("/pedidos/avaliacoes-experiencia/clientes", {
        params: {
          page,
          per_page: PAGE_SIZE,
          busca: appliedSearch || undefined,
          avaliacao: ratingFilter === "todos" ? undefined : ratingFilter,
        },
      });
      const payload = response.data?.data;

      setGroups(Array.isArray(payload?.data) ? payload.data : []);
      setPagination({
        total: Number(payload?.total || 0),
        total_pages: Math.max(1, Number(payload?.total_pages || 1)),
      });
    } catch (fetchError) {
      setError(getErrorMessage(fetchError));
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, ratingFilter]);

  useEffect(() => {
    void fetchFeedbacks();
  }, [fetchFeedbacks]);

  const applySearch = () => {
    setPage(1);
    setAppliedSearch(search.trim());
  };

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((current) => ({
      ...current,
      [groupKey]: !(current[groupKey] !== false),
    }));
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <MessageSquare className="h-6 w-6 text-primary" />
              Feedbacks dos clientes
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Avaliações da experiência de compra enviadas para sua loja.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchFeedbacks()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applySearch();
                }}
                placeholder="Buscar por cliente, pedido ou comentário..."
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-10 pr-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <select
              value={ratingFilter}
              onChange={(event) => {
                setPage(1);
                setRatingFilter(event.target.value);
              }}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="todos">Todas avaliações</option>
              <option value="otimo">Ótimo</option>
              <option value="bom">Bom</option>
              <option value="ruim">Ruim</option>
            </select>
            <button
              type="button"
              onClick={applySearch}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Buscar
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-r-lg border-l-4 border-red-500 bg-red-50 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {loading && groups.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-slate-400" />
              <p className="text-slate-500">Carregando feedbacks...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <MessageSquare className="h-8 w-8 text-slate-400" />
              </div>
              <h2 className="mb-1 text-lg font-medium text-slate-900">Nenhum feedback encontrado</h2>
              <p className="text-slate-500">Ajuste os filtros ou aguarde novas avaliações dos clientes.</p>
            </div>
          ) : (
            groups.map((group) => {
              const groupKey = getFeedbackGroupKey(group);
              const isCollapsed = collapsedGroups[groupKey] !== false;
              const GroupIcon = isCollapsed ? ChevronRight : ChevronDown;

              return (
                <section key={groupKey} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleGroup(groupKey)}
                        className="flex max-w-full items-center gap-2 rounded-md text-left transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        aria-expanded={!isCollapsed}
                      >
                        <GroupIcon className="h-4 w-4 shrink-0 text-slate-500" />
                        <UserRound className="h-5 w-5 shrink-0 text-primary" />
                        <h2 className="truncate text-lg font-semibold text-slate-900">{group.cliente_nome}</h2>
                      </button>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span>{group.cliente_email || "Sem email"}</span>
                        <span>{group.cliente_telefone || "Sem telefone"}</span>
                        <span>
                          Último feedback: {formatBrasiliaDate(group.ultimo_feedback_em, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-sm">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <div className="font-semibold text-slate-900">{group.total_feedbacks}</div>
                        <div className="text-xs text-slate-500">Total</div>
                      </div>
                      <div className="rounded-lg bg-emerald-50 px-3 py-2">
                        <div className="font-semibold text-emerald-700">{group.total_otimo}</div>
                        <div className="text-xs text-emerald-700">Ótimo</div>
                      </div>
                      <div className="rounded-lg bg-amber-50 px-3 py-2">
                        <div className="font-semibold text-amber-700">{group.total_bom}</div>
                        <div className="text-xs text-amber-700">Bom</div>
                      </div>
                      <div className="rounded-lg bg-red-50 px-3 py-2">
                        <div className="font-semibold text-red-700">{group.total_ruim}</div>
                        <div className="text-xs text-red-700">Ruim</div>
                      </div>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-100">
                      {group.feedbacks.map((feedback) => (
                        <div
                          key={feedback.id}
                          className="grid gap-3 px-4 py-3 lg:grid-cols-[130px_1fr_180px] lg:items-start"
                        >
                          <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${ratingStyle[feedback.avaliacao]}`}>
                            {ratingLabel[feedback.avaliacao]}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                              <Store className="h-4 w-4 text-slate-400" />
                              <span className="truncate">{feedback.loja_nome}</span>
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              Pedido {feedback.pedido_numero || feedback.pedido_id.slice(0, 8)}
                              {feedback.origem ? ` · ${feedback.origem}` : ""}
                            </div>
                            {feedback.justificativa && (
                              <p className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal leading-relaxed text-slate-700">
                                {feedback.justificativa}
                              </p>
                            )}
                          </div>
                          <div className="text-sm text-slate-500 lg:text-right">
                            {formatBrasiliaDate(feedback.criado_em, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row">
          <div className="text-sm text-slate-500">
            Página {page} de {pagination.total_pages} · {pagination.total} cliente(s)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={loading || page <= 1}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pagination.total_pages, current + 1))}
              disabled={loading || page >= pagination.total_pages}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
