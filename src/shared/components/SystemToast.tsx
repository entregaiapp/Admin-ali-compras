import type { ReactNode } from "react";
import {
  CircleAlert,
  CircleCheckBig,
  CircleX,
  Info,
} from "lucide-react";
import { toast, Toaster } from "sonner";

export type SystemToastVariant = "success" | "error" | "warning" | "info";

type SystemToastOptions = {
  title?: string;
  duration?: number;
};

const DEFAULT_TITLES: Record<SystemToastVariant, string> = {
  success: "Tudo certo",
  error: "Não foi possível concluir",
  warning: "Atenção",
  info: "Informação",
};

const normalizeMessage = (message: unknown) => {
  if (typeof message === "string" && message.trim()) return message.trim();

  if (message && typeof message === "object" && "message" in message) {
    const nestedMessage = (message as { message?: unknown }).message;
    if (typeof nestedMessage === "string" && nestedMessage.trim()) {
      return nestedMessage.trim();
    }
  }

  return "Não foi possível concluir a operação.";
};

const show = (
  variant: SystemToastVariant,
  message: unknown,
  options: SystemToastOptions = {},
) => {
  const description = normalizeMessage(message);
  const title = options.title || DEFAULT_TITLES[variant];
  const duration = options.duration ?? (variant === "error" ? 6000 : 4500);

  return toast[variant](title, {
    description,
    duration,
  });
};

export const systemToast = {
  success: (message: unknown, options?: SystemToastOptions) =>
    show("success", message, options),
  error: (message: unknown, options?: SystemToastOptions) =>
    show("error", message, options),
  warning: (message: unknown, options?: SystemToastOptions) =>
    show("warning", message, options),
  info: (message: unknown, options?: SystemToastOptions) =>
    show("info", message, options),
};

const SUCCESS_MESSAGE_PATTERN =
  /\b(sucesso|conclu[ií]d|finalizad|salv[oa]|criad[oa]|atualizad[oa]|copiad[oa]|enviad[oa]|baixad[oa]|exclu[ií]d[oa]|registrad[oa]|abert[oa]|fechad[oa]|liberad[oa]|confirmad[oa]|solicitad[oa])\b/i;
const ERROR_MESSAGE_PATTERN =
  /n[aã]o foi poss[ií]vel|\berro\b|\bfalh|indispon[ií]vel|n[aã]o foi identific|bloqueou/i;

/**
 * Compatibilidade com os avisos existentes. Novos fluxos devem usar
 * `systemToast.success`, `systemToast.error`, `systemToast.warning` ou
 * `systemToast.info` de forma explícita.
 */
export function showSystemNotice(message: unknown, title = "Atenção") {
  const normalizedMessage = normalizeMessage(message);
  const textForClassification = `${title} ${normalizedMessage}`;
  const variant: SystemToastVariant = ERROR_MESSAGE_PATTERN.test(textForClassification)
    ? "error"
    : SUCCESS_MESSAGE_PATTERN.test(textForClassification)
      ? "success"
      : "warning";

  return show(variant, normalizedMessage, {
    title: title === "Atenção" ? undefined : title,
  });
}

const TOAST_ICONS: Record<SystemToastVariant, ReactNode> = {
  success: <CircleCheckBig className="h-5 w-5" aria-hidden="true" />,
  error: <CircleX className="h-5 w-5" aria-hidden="true" />,
  warning: <CircleAlert className="h-5 w-5" aria-hidden="true" />,
  info: <Info className="h-5 w-5" aria-hidden="true" />,
};

export function SystemToastHost() {
  return (
    <Toaster
      position="top-right"
      duration={4500}
      visibleToasts={4}
      expand
      richColors
      closeButton
      icons={TOAST_ICONS}
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border !shadow-lg",
          title: "!text-sm !font-semibold",
          description: "!text-sm !leading-5",
          closeButton: "!border-gray-200 !bg-white !text-gray-500",
        },
      }}
    />
  );
}
