import { useMemo, useState } from "react";
import { ArrowRightLeft, CircleAlert, Loader2, Search, X } from "lucide-react";

type MesaTransferModalProps = {
  sourceMesa: any;
  sourceComanda: any;
  mesas: any[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (destination: any, reason: string) => void;
};

const normalizeSearch = (value: unknown) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const formatMoney = (value: unknown) =>
  Number(value || 0).toFixed(2).replace(".", ",");

export const getMesaTransferMode = (
  sourceMesa: any,
  destination: any,
  sourceComanda?: any,
): "transferencia" | "uniao" | null => {
  if (!destination?.id || destination.id === sourceMesa?.id || destination.ativa === false) return null;
  if (destination.status === "bloqueada" || destination.solicitacao_abertura) return null;
  const destinationComanda = destination.comanda_aberta;
  if (destinationComanda) {
    const sourceStatus = sourceComanda?.status || sourceMesa?.comanda_aberta?.status;
    return destinationComanda.status === "aberta" && (!sourceStatus || sourceStatus === "aberta")
      ? "uniao"
      : null;
  }
  return ["livre", "reservada"].includes(destination.status) ? "transferencia" : null;
};

export function MesaTransferModal({
  sourceMesa,
  sourceComanda,
  mesas,
  busy,
  onClose,
  onConfirm,
}: MesaTransferModalProps) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");
  const destinations = useMemo(() => {
    const search = normalizeSearch(query.trim());
    return mesas.filter((mesa) => {
      if (!getMesaTransferMode(sourceMesa, mesa, sourceComanda)) return false;
      if (!search) return true;
      return normalizeSearch(`${mesa.numero} ${mesa.nome || ""}`).includes(search);
    });
  }, [mesas, query, sourceComanda, sourceMesa]);
  const destination = destinations.find((mesa) => mesa.id === selectedId) || null;
  const mode = destination ? getMesaTransferMode(sourceMesa, destination, sourceComanda) : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-slate-950">Transferir mesa {sourceMesa?.numero}</h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Comanda {sourceComanda?.numero_comanda || sourceComanda?.id} · R$ {formatMoney(sourceComanda?.total)}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar mesa por número ou nome"
              className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {destinations.map((mesa) => {
              const itemMode = getMesaTransferMode(sourceMesa, mesa, sourceComanda);
              const selected = selectedId === mesa.id;
              return (
                <button
                  key={mesa.id}
                  type="button"
                  onClick={() => setSelectedId(mesa.id)}
                  className={`rounded-xl border p-3 text-left transition-colors ${selected ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-extrabold text-slate-950">Mesa {mesa.numero}</div>
                      {mesa.nome && <div className="text-xs text-slate-500">{mesa.nome}</div>}
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase ${itemMode === "uniao" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                      {itemMode === "uniao" ? "Unir" : mesa.status}
                    </span>
                  </div>
                  {mesa.comanda_aberta && (
                    <div className="mt-2 rounded-lg bg-white/80 px-2 py-1.5 text-xs text-slate-600">
                      {mesa.comanda_aberta.numero_comanda} · R$ {formatMoney(mesa.comanda_aberta.total)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {destinations.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              Nenhuma mesa disponível para esta transferência.
            </div>
          )}

          {destination && (
            <div className={`mt-4 rounded-xl border p-3 ${mode === "uniao" ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50"}`}>
              <div className="flex items-start gap-2">
                <CircleAlert className={`mt-0.5 h-4 w-4 shrink-0 ${mode === "uniao" ? "text-amber-700" : "text-blue-700"}`} />
                <div className="text-sm text-slate-700">
                  <strong>{mode === "uniao" ? "Unir comandas" : "Transferir comanda"}</strong>
                  <p className="mt-1 text-xs leading-relaxed">
                    {mode === "uniao"
                      ? `A comanda da mesa ${destination.numero} permanecerá e receberá todos os participantes, pedidos e valores da mesa ${sourceMesa.numero}.`
                      : `A comanda completa será movida da mesa ${sourceMesa.numero} para a mesa ${destination.numero}.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">Motivo (opcional)</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value.slice(0, 500))}
              placeholder="Ex.: cliente solicitou mudança de lugar"
              className="min-h-20 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
            />
          </label>
        </div>

        <footer className="grid gap-2 border-t border-slate-100 p-4 sm:grid-cols-2 sm:px-5">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-50">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => destination && onConfirm(destination, reason.trim())}
            disabled={!destination || busy}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50 ${mode === "uniao" ? "bg-amber-600" : "bg-[#122a4c]"}`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "uniao" ? "Confirmar união" : "Confirmar transferência"}
          </button>
        </footer>
      </div>
    </div>
  );
}
