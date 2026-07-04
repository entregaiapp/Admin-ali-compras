import { CheckCircle2, Loader2, Zap } from 'lucide-react';
import type { AdminCacheProgress, AdminCacheWarmupResult } from '../services/adminCacheWarmup';

type AdminCacheWarmupModalProps = {
  open: boolean;
  status: AdminCacheProgress;
  result?: AdminCacheWarmupResult | null;
  error?: string | null;
  onClose: () => void;
};

export function AdminCacheWarmupModal({ open, status, result, error, onClose }: AdminCacheWarmupModalProps) {
  if (!open) return null;

  const completed = Boolean(result);
  const failed = Boolean(error);
  const canClose = completed || failed;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#eef2f9]">
            {completed ? (
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            ) : failed ? (
              <Zap className="h-6 w-6 text-amber-600" />
            ) : (
              <>
                <Loader2 className="absolute h-7 w-7 animate-spin text-[#122a4c]" />
                <Zap className="h-3.5 w-3.5 text-[#122a4c]" />
              </>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-gray-900">
              {completed ? 'Sistema preparado' : failed ? 'Não foi possível concluir' : 'Deixando o sistema ultrarrápido'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {completed
                ? `${result.cachedResources} informações e ${result.cachedImages} imagens foram preparadas neste dispositivo.`
                : error || status.message}
            </p>
          </div>
        </div>

        {!failed && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-gray-500">{status.detail || 'Preparando dados'}</span>
              <span className="font-semibold text-[#122a4c]">{status.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#122a4c]/10">
              <div
                className="h-full rounded-full bg-[#122a4c] transition-all duration-300 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, status.progress))}%` }}
              />
            </div>
          </div>
        )}

        {completed && result.skippedResources > 0 && (
          <p className="mt-3 text-xs text-amber-700">Alguns dados indisponíveis foram ignorados e poderão ser atualizados na próxima execução.</p>
        )}

        {canClose && (
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-lg bg-[#122a4c] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a3d6e]"
          >
            Concluir
          </button>
        )}
      </div>
    </div>
  );
}
