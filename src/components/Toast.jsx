import { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-20 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 sm:bottom-6">
      <div
        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl animate-[slideUp_0.3s_ease-out_both] ${
          isError
            ? 'border-rose-500/30 bg-rose-950/80 text-rose-200'
            : 'border-emerald-500/30 bg-emerald-950/80 text-emerald-200'
        }`}
      >
        {isError ? (
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
        ) : (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
        )}
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
        <button onClick={onClose} className="text-current opacity-60 transition hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}