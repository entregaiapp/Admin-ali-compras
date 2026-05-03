import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
  success?: boolean;
  successMessage?: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ 
  isOpen, 
  message = 'Salvando alterações...', 
  success = false,
  successMessage = 'Salvo com sucesso!'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl border border-gray-100 min-w-[280px] animate-in zoom-in-95 duration-200">
        {!success ? (
          <>
            <div className="relative">
              <Loader2 className="w-12 h-12 text-primary animate-spin" style={{ color: '#122a4c' }} />
              <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
            </div>
            <p className="text-gray-600 font-medium animate-pulse">{message}</p>
          </>
        ) : (
          <>
            <div className="relative">
              <CheckCircle2 className="w-12 h-12 text-green-500 animate-in zoom-in duration-300" />
              <div className="absolute inset-0 blur-xl bg-green-200/50 rounded-full" />
            </div>
            <p className="text-green-600 font-semibold">{successMessage}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default LoadingModal;
