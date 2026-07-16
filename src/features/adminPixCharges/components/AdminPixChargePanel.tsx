import { useState } from "react";
import { Copy, MessageCircle, RefreshCw, RotateCcw, XCircle } from "lucide-react";
import { showSystemNotice } from "@/shared/components/SystemToast";
import { formatBrasiliaDate } from "@/shared/lib/dateTime";
import { adminPixChargeService } from "../services/adminPixChargeService";
import type { AdminPixCharge } from "../types/adminPixCharge";

const money = (value: number) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const labels: Record<string, string> = {
  aguardando_dados: "Aguardando dados do cliente", gerando: "Gerando Pix", pendente: "Aguardando pagamento",
  aprovado: "Pago", expirado: "Expirado", cancelado: "Cancelado", substituido: "Substituído", falha: "Falha na geração",
};

export function AdminPixChargePanel({ initialCharge, customerName, onChange }: {
  initialCharge: AdminPixCharge;
  customerName?: string;
  onChange: (charge: AdminPixCharge) => void;
}) {
  const [busy, setBusy] = useState("");
  const charge = initialCharge;
  const payment = charge.pagamento_atual;
  const linkExpired = new Date(charge.token_expira_em).getTime() <= Date.now();
  const terminal = ["aprovado", "cancelado"].includes(charge.estado) || linkExpired;

  const run = async (action: "refresh" | "regenerate" | "cancel") => {
    try {
      setBusy(action);
      onChange(await adminPixChargeService[action](charge.pedido_id));
    } catch (error: any) {
      showSystemNotice(error?.response?.data?.error?.message || error?.response?.data?.message || "Não foi possível atualizar a cobrança Pix.");
    } finally { setBusy(""); }
  };

  const copy = async (value?: string | null) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    showSystemNotice("Copiado para a área de transferência.");
  };

  const sendWhatsApp = () => {
    const expires = payment?.data_expiracao ? formatBrasiliaDate(payment.data_expiracao, { dateStyle: "short", timeStyle: "short" }) : "conforme exibido no link";
    const message = `Olá, ${customerName || "cliente"}! O Pix do pedido ${charge.numero_pedido}, no valor de ${money(charge.total)}, vence em ${expires}. Pague pelo link: ${charge.link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase text-blue-700">Pix por link administrativo</p><h3 className="font-semibold text-gray-900">{labels[charge.estado] || charge.estado}</h3></div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-gray-800">{money(charge.total)}</span>
      </div>
      {payment?.qr_code_base64 && <img src={`data:image/png;base64,${payment.qr_code_base64}`} alt="QR Code Pix" className="mx-auto mt-4 h-44 w-44 rounded-lg bg-white p-2" />}
      {payment?.qr_code && <button type="button" onClick={() => void copy(payment.qr_code)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold"><Copy className="h-4 w-4" /> Copiar código Pix</button>}
      <button type="button" onClick={() => void copy(charge.link)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold"><Copy className="h-4 w-4" /> Copiar link de pagamento</button>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={sendWhatsApp} className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" /> WhatsApp</button>
        <button type="button" disabled={busy !== "" || !payment} onClick={() => void run("refresh")} className="flex items-center justify-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy === "refresh" ? "animate-spin" : ""}`} /> Atualizar</button>
        {!terminal && <button type="button" disabled={busy !== ""} onClick={() => void run("regenerate")} className="flex items-center justify-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"><RotateCcw className="h-4 w-4" /> Regenerar</button>}
        {!terminal && <button type="button" disabled={busy !== ""} onClick={() => void run("cancel")} className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"><XCircle className="h-4 w-4" /> Cancelar cobrança</button>}
      </div>
      {charge.historico?.length > 0 && <div className="mt-4 border-t border-blue-100 pt-3"><p className="text-xs font-bold uppercase text-gray-500">Histórico</p>{charge.historico.map((item: any) => <div key={item.id} className="mt-1 flex justify-between text-xs text-gray-600"><span>{labels[item.estado] || item.estado}</span><span>Tentativa {item.tentativa}</span></div>)}</div>}
    </section>
  );
}
