import { X } from "lucide-react";

type OptionObservationModalProps = {
  optionName: string;
  value: string;
  primaryColor: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function OptionObservationModal({
  optionName,
  value,
  primaryColor,
  onChange,
  onClose,
  onSave,
}: OptionObservationModalProps) {
  return (
    <div className="fixed inset-0 z-[160] flex items-end bg-slate-950/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Observação de ${optionName}`}>
      <div className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-950">Observação do adicional</h3>
            <p className="mt-1 text-sm text-slate-500">{optionName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Fechar"><X className="h-4 w-4" /></button>
        </div>
        <textarea autoFocus value={value} onChange={(event) => onChange(event.target.value)} maxLength={500} placeholder="Ex.: sem cebola" className="mt-4 min-h-28 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none" />
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => onChange("")} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Limpar</button>
          <button type="button" onClick={onSave} className="flex-1 rounded-xl px-4 py-3 text-sm font-extrabold text-white" style={{ backgroundColor: primaryColor }}>Salvar observação</button>
        </div>
      </div>
    </div>
  );
}
