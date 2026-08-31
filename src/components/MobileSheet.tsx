import { useId, type ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export function MobileSheet({ open, title, description, onClose, children, className = "" }: Props) {
  const titleId = useId();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={`flex max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[92vh] sm:max-w-2xl sm:rounded-3xl ${className}`}>
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-6">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-2xl font-semibold sm:text-3xl">{title}</h2>
            {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
          </div>
          <button onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-full bg-zinc-100 p-2 text-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900" aria-label={`Close ${title}`}>
            <X className="mx-auto h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
          {children}
        </div>
      </div>
    </div>
  );
}
