import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import api from '@/shared/lib/api';
import { formatBrasiliaDate } from '@/shared/lib/dateTime';

type Severity = 'critica' | 'normal';
type ActorOption = { id: string; nome: string; perfil: string };

type AuditChange = {
  campo: string;
  rotulo?: string;
  anterior?: unknown;
  novo?: unknown;
};

type AuditEvent = {
  id: string;
  criticidade: Severity;
  categoria: string;
  chave_acao: string;
  ator_usuario_id?: string | null;
  ator_nome_snapshot: string;
  ator_perfil_snapshot: string;
  entidade_tipo: string;
  entidade_id?: string | null;
  entidade_rotulo?: string | null;
  mensagem: string;
  motivo?: string | null;
  ocorrido_em: string;
  alteracoes?: AuditChange[];
  detalhes?: Record<string, unknown>;
  ator_nao_administrador?: boolean;
};

const PAGE_SIZE = 20;
const CATEGORIES = [
  ['pedidos', 'Pedidos'],
  ['comandas', 'Comandas'],
  ['caixa', 'Caixa'],
  ['financeiro', 'Financeiro'],
  ['usuarios', 'Usuários e segurança'],
  ['catalogo', 'Catálogo'],
  ['estoque', 'Estoque'],
  ['configuracoes', 'Configurações'],
  ['entregas', 'Entregas'],
  ['clientes', 'Clientes'],
  ['marketing', 'Marketing'],
  ['outros', 'Outros'],
] as const;

const formatRole = (role: string) => role
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'Não informado';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export function AuditLogsScreen() {
  const [severity, setSeverity] = useState<Severity>('critica');
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actors, setActors] = useState<ActorOption[]>([]);
  const [actorId, setActorId] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [onlyStaff, setOnlyStaff] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [totals, setTotals] = useState({ criticas: 0, normais: 0 });

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/auditoria-operacional', {
        params: {
          criticidade: severity,
          categoria: category || undefined,
          ator_usuario_id: actorId || undefined,
          busca: search.trim() || undefined,
          data_inicial: startDate || undefined,
          data_final: endDate || undefined,
          somente_nao_admin: onlyStaff || undefined,
          page,
          per_page: PAGE_SIZE,
        },
      });
      const result = response.data?.data || {};
      setEvents(Array.isArray(result.data) ? result.data : []);
      setPagination({
        total: Number(result.total || 0),
        total_pages: Math.max(1, Number(result.total_pages || 1)),
      });
      setTotals({
        criticas: Number(result.totais?.criticas || 0),
        normais: Number(result.totais?.normais || 0),
      });
    } catch (requestError: unknown) {
      setEvents([]);
      const responseData = axios.isAxiosError(requestError) ? requestError.response?.data : undefined;
      setError(responseData?.error?.message || responseData?.message || 'Não foi possível carregar as atividades.');
    } finally {
      setLoading(false);
    }
  }, [actorId, category, endDate, onlyStaff, page, search, severity, startDate]);

  useEffect(() => {
    api.get('/usuarios', { params: { per_page: 100 } })
      .then((response) => {
        const rawData = response.data?.data;
        const users = Array.isArray(rawData) ? rawData : rawData?.data;
        setActors(Array.isArray(users)
          ? users.filter((user) => user?.id && user?.nome).map((user) => ({ id: user.id, nome: user.nome, perfil: user.perfil || 'usuário' }))
          : []);
      })
      .catch(() => setActors([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchEvents(), 250);
    return () => window.clearTimeout(timer);
  }, [fetchEvents]);

  const openDetails = async (event: AuditEvent) => {
    setSelected(event);
    setDetailLoading(true);
    try {
      const response = await api.get(`/auditoria-operacional/${event.id}`);
      setSelected(response.data?.data || event);
    } catch {
      setError('Não foi possível carregar os detalhes desta atividade.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50/70">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-950">
              <ClipboardList className="h-6 w-6 text-[#122a4c]" />
              Atividades da equipe
            </h1>
            <p className="mt-1 text-sm text-slate-500">Acompanhe, em linguagem clara, o que foi realizado no painel administrativo.</p>
          </div>
          <button type="button" onClick={() => void fetchEvents()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => { setSeverity('critica'); setPage(1); }} className={`rounded-xl border p-4 text-left transition ${severity === 'critica' ? 'border-red-300 bg-red-50 ring-2 ring-red-100' : 'bg-white hover:border-red-200'}`}>
            <div className="flex items-center justify-between"><span className="flex items-center gap-2 font-semibold text-red-800"><ShieldAlert className="h-5 w-5" /> Ações críticas</span><strong className="text-2xl text-red-700">{totals.criticas}</strong></div>
            <p className="mt-1 text-xs text-red-700/80">Exclusões, cancelamentos e alterações sensíveis.</p>
          </button>
          <button type="button" onClick={() => { setSeverity('normal'); setPage(1); }} className={`rounded-xl border p-4 text-left transition ${severity === 'normal' ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100' : 'bg-white hover:border-blue-200'}`}>
            <div className="flex items-center justify-between"><span className="flex items-center gap-2 font-semibold text-blue-800"><CheckCircle2 className="h-5 w-5" /> Ações normais</span><strong className="text-2xl text-blue-700">{totals.normais}</strong></div>
            <p className="mt-1 text-xs text-blue-700/80">Cadastros e atividades rotineiras da operação.</p>
          </button>
        </div>

        <div className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-2 xl:grid-cols-6">
          <label className="relative xl:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar pessoa ou atividade" className="w-full rounded-lg border bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#122a4c]" />
          </label>
          <select value={actorId} onChange={(event) => { setActorId(event.target.value); setPage(1); }} className="rounded-lg border bg-slate-50 px-3 py-2.5 text-sm">
            <option value="">Todas as pessoas</option>
            {actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.nome} · {formatRole(actor.perfil)}</option>)}
          </select>
          <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="rounded-lg border bg-slate-50 px-3 py-2.5 text-sm">
            <option value="">Todas as categorias</option>
            {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <label className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-xs text-slate-600"><Calendar className="h-4 w-4" /><input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} className="min-w-0 bg-transparent" /></label>
          <label className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-xs text-slate-600"><Calendar className="h-4 w-4" /><input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} className="min-w-0 bg-transparent" /></label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 xl:col-span-6">
            <input type="checkbox" checked={onlyStaff} onChange={(event) => { setOnlyStaff(event.target.checked); setPage(1); }} className="h-4 w-4 accent-[#122a4c]" />
            Somente equipe (usuários que não são Administradores)
          </label>
        </div>

        {error && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-5 w-5" />{error}</div>}

        <div className="overflow-hidden rounded-xl border bg-white">
          {loading && events.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500"><RefreshCw className="mx-auto mb-3 h-7 w-7 animate-spin" />Carregando atividades...</div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center"><ClipboardList className="mx-auto mb-3 h-10 w-10 text-slate-300" /><h2 className="font-semibold text-slate-800">Nenhuma atividade encontrada</h2><p className="mt-1 text-sm text-slate-500">Ajuste os filtros ou aguarde novas ações da equipe.</p></div>
          ) : (
            <div className="divide-y">
              {events.map((event) => {
                const nonAdminCritical = event.criticidade === 'critica' && !['administrador', 'superadmin'].includes(event.ator_perfil_snapshot.toLowerCase());
                return (
                  <article key={event.id} className="flex flex-col gap-3 p-4 hover:bg-slate-50 sm:flex-row sm:items-center">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${event.criticidade === 'critica' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {event.criticidade === 'critica' ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${event.criticidade === 'critica' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{event.criticidade === 'critica' ? 'Crítica' : 'Normal'}</span>
                        {nonAdminCritical && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Ação da equipe</span>}
                        <span className="text-xs text-slate-400">{CATEGORIES.find(([value]) => value === event.categoria)?.[1] || event.categoria}</span>
                      </div>
                      <p className="mt-1 font-medium text-slate-900">{event.mensagem}</p>
                      <p className="mt-1 text-xs text-slate-500">{event.ator_nome_snapshot} · {formatRole(event.ator_perfil_snapshot)} · {formatBrasiliaDate(event.ocorrido_em, { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                    <button type="button" onClick={() => void openDetails(event)} className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-[#122a4c] hover:bg-blue-50"><Eye className="h-4 w-4" /> Detalhes</button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 sm:flex-row">
          <span className="text-sm text-slate-500">Página {page} de {pagination.total_pages} · {pagination.total} atividade(s)</span>
          <div className="flex gap-2">
            <button type="button" disabled={loading || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Anterior</button>
            <button type="button" disabled={loading || page >= pagination.total_pages} onClick={() => setPage((current) => Math.min(pagination.total_pages, current + 1))} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Próxima<ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3"><div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${selected.criticidade === 'critica' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{selected.criticidade === 'critica' ? 'Ação crítica' : 'Ação normal'}</span><h2 className="mt-3 text-xl font-bold text-slate-950">{selected.mensagem}</h2><p className="mt-1 text-sm text-slate-500">{selected.ator_nome_snapshot} · {formatRole(selected.ator_perfil_snapshot)}</p></div><button type="button" onClick={() => setSelected(null)} className="rounded-full p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            {detailLoading ? <div className="py-10 text-center text-sm text-slate-500"><RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin" />Carregando detalhes...</div> : (
              <div className="mt-6 space-y-5">
                <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><div><span className="text-xs uppercase text-slate-400">Data e hora</span><p className="text-sm font-medium">{formatBrasiliaDate(selected.ocorrido_em, { dateStyle: 'medium', timeStyle: 'medium' })}</p></div><div><span className="text-xs uppercase text-slate-400">Registro afetado</span><p className="text-sm font-medium">{selected.entidade_rotulo || selected.entidade_tipo}</p></div></div>
                {selected.motivo && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="text-sm font-semibold text-amber-900">Motivo informado</h3><p className="mt-1 text-sm text-amber-800">{selected.motivo}</p></div>}
                <div><h3 className="mb-2 font-semibold text-slate-900">O que mudou</h3>{selected.alteracoes?.length ? <div className="overflow-hidden rounded-xl border"><div className="grid grid-cols-3 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500"><span>Campo</span><span>Antes</span><span>Depois</span></div>{selected.alteracoes.map((change, index) => <div key={`${change.campo}-${index}`} className="grid grid-cols-3 gap-2 border-t px-4 py-3 text-sm"><strong className="text-slate-700">{change.rotulo || change.campo}</strong><span className="break-words text-slate-500">{formatValue(change.anterior)}</span><span className="break-words text-slate-900">{formatValue(change.novo)}</span></div>)}</div> : <p className="rounded-xl border border-dashed p-4 text-sm text-slate-500">Esta atividade não possui comparação antes/depois.</p>}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
