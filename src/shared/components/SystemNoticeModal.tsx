import { useEffect, useState } from "react";
import { X } from "lucide-react";

type SystemNoticeModalProps = {
  title?: string;
  message: string;
  primaryColor?: string;
  onClose: () => void;
};

export function SystemNoticeModal({
  title = "Atenção",
  message,
  primaryColor = "#122a4c",
  onClose,
}: SystemNoticeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800">{title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-700">{message}</p>
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-white text-xs font-semibold transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type SystemNoticePayload = {
  title?: string;
  message: string;
};

const SYSTEM_NOTICE_EVENT = "system-notice";

const normalizeNoticeMessage = (message: unknown) => {
  if (typeof message === "string") return message;
  if (message && typeof message === "object" && "message" in message) {
    const nestedMessage = (message as { message?: unknown }).message;
    if (typeof nestedMessage === "string") return nestedMessage;
  }

  return "Não foi possível concluir a operação.";
};

export function showSystemNotice(message: unknown, title = "Atenção") {
  window.dispatchEvent(
    new CustomEvent<SystemNoticePayload>(SYSTEM_NOTICE_EVENT, {
      detail: { title, message: normalizeNoticeMessage(message) },
    }),
  );
}

export function SystemNoticeHost() {
  const [notice, setNotice] = useState<SystemNoticePayload | null>(null);

  useEffect(() => {
    const handleNotice = (event: Event) => {
      const detail = (event as CustomEvent<SystemNoticePayload>).detail;
      if (detail?.message) setNotice(detail);
    };

    window.addEventListener(SYSTEM_NOTICE_EVENT, handleNotice);
    return () => window.removeEventListener(SYSTEM_NOTICE_EVENT, handleNotice);
  }, []);

  if (!notice) return null;

  return (
    <SystemNoticeModal
      title={notice.title}
      message={notice.message}
      onClose={() => setNotice(null)}
    />
  );
}
