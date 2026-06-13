import { useEffect, useState } from "react";
import { KeyRound, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { authService } from "@/features/auth/services/authService";
import type { MfaStatus } from "@/features/auth/types/auth";
import api from "@/shared/lib/api";

export function SecurityMfaPanel() {
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [enrollment, setEnrollment] = useState<{ id: string; totp: { qr_code: string; secret: string } } | null>(null);
  const [verificationFactorId, setVerificationFactorId] = useState("");
  const [pendingPreference, setPendingPreference] = useState<{
    key: "login_required" | "refund_required";
    value: boolean;
  } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => setStatus(await authService.getMfaStatus());
  useEffect(() => { void load().catch(() => setError("Não foi possível carregar os autenticadores.")); }, []);

  const enroll = async (preference?: typeof pendingPreference) => {
    try {
      setLoading(true);
      setError("");
      setPendingPreference(preference || null);
      setVerificationFactorId("");
      setEnrollment(await authService.enrollMfa());
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Não foi possível cadastrar outro autenticador.");
    } finally {
      setLoading(false);
    }
  };

  const savePreference = async (
    key: "login_required" | "refund_required",
    value: boolean,
  ) => {
    setStatus(await authService.updateMfaPreferences({ [key]: value }));
  };

  const changePreference = async (
    key: "login_required" | "refund_required",
    value: boolean,
  ) => {
    if (!status) return;

    try {
      setLoading(true);
      setError("");

      if (value && status.factors.length === 0) {
        await enroll({ key, value });
        return;
      }

      if (status.factors.length > 0 && status.aal !== "aal2") {
        setPendingPreference({ key, value });
        setVerificationFactorId(status.factors[0].id);
        setEnrollment(null);
        setCode("");
        return;
      }

      await savePreference(key, value);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Não foi possível alterar a preferência.");
    } finally {
      setLoading(false);
    }
  };

  const confirmAuthenticator = async () => {
    const factorId = enrollment?.id || verificationFactorId;
    if (!factorId || code.length !== 6) return;
    try {
      setLoading(true);
      setError("");
      const challenge = await authService.challengeMfa(factorId);
      authService.persistSession(await authService.verifyMfa(factorId, challenge.id, code));
      if (pendingPreference) {
        await savePreference(pendingPreference.key, pendingPreference.value);
      }
      setEnrollment(null);
      setVerificationFactorId("");
      setPendingPreference(null);
      setCode("");
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Código inválido.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (factorId: string) => {
    try {
      setLoading(true);
      await api.delete(`/auth/mfa/factors/${factorId}`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Não foi possível remover o autenticador.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-gray-800"><ShieldCheck className="h-4 w-4" />Preferências de segurança</h3>
          <p className="mt-1 text-sm text-gray-500">Escolha quando sua loja deve exigir autenticação em dois fatores.</p>
        </div>
        <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
          {[
            {
              key: "login_required" as const,
              title: "Exigir 2FA para entrar",
              description: "Solicita o código TOTP depois da senha nesta conta de administrador.",
              enabled: status?.login_required || false,
            },
            {
              key: "refund_required" as const,
              title: "Exigir 2FA para reembolsos",
              description: "Solicita aprovação TOTP antes de qualquer reembolso da loja.",
              enabled: status?.refund_required || false,
            },
          ].map((preference) => (
            <div key={preference.key} className="flex items-center justify-between gap-4 p-4">
              <div>
                <div className="text-sm font-semibold text-gray-800">{preference.title}</div>
                <div className="mt-0.5 text-xs text-gray-500">{preference.description}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preference.enabled}
                onClick={() => void changePreference(preference.key, !preference.enabled)}
                disabled={loading || !status}
                className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-60 ${preference.enabled ? "bg-blue-950" : "bg-gray-300"}`}
              >
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${preference.enabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-gray-800"><KeyRound className="h-4 w-4" />Aplicativos autenticadores</h3>
            <p className="mt-1 text-sm text-gray-500">O QR code só é exibido quando você inicia um novo cadastro.</p>
          </div>
          <button onClick={() => void enroll()} disabled={loading} className="flex items-center gap-1 rounded-lg bg-blue-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"><Plus className="h-4 w-4" />Adicionar</button>
        </div>
        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="mt-4 space-y-2">
          {status?.factors.length === 0 && !enrollment && (
            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">Nenhum autenticador cadastrado.</div>
          )}
          {status?.factors.map((factor) => (
            <div key={factor.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm">
              <span>{factor.friendly_name || "Aplicativo autenticador"}</span>
              <button onClick={() => void remove(factor.id)} disabled={loading} title="Remover autenticador"><Trash2 className="h-4 w-4 text-red-500" /></button>
            </div>
          ))}
        </div>
        {(enrollment || verificationFactorId) && (
          <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4 text-center">
          {enrollment ? (
            <>
              <img src={enrollment.totp.qr_code} alt="QR code do novo autenticador" className="mx-auto h-40 w-40" />
              <p className="mt-2 text-xs text-gray-600">Chave manual: <span className="font-mono">{enrollment.totp.secret}</span></p>
            </>
          ) : (
            <p className="text-sm text-gray-700">Informe o código do seu autenticador para confirmar esta alteração.</p>
          )}
          <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-center font-mono tracking-[0.3em]" />
          <button onClick={() => void confirmAuthenticator()} disabled={loading || code.length !== 6} className="mt-3 rounded-lg bg-blue-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Confirmar código</button>
          </div>
        )}
      </div>
    </div>
  );
}
