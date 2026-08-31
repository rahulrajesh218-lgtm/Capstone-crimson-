import { Download, Share } from "lucide-react";

type Props = {
  canInstall: boolean;
  isIosSafari: boolean;
  isStandalone: boolean;
  onInstall: () => Promise<void>;
};

export function InstallAppCard({ canInstall, isIosSafari, isStandalone, onInstall }: Props) {
  if (isStandalone) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="font-semibold text-emerald-900">Zentaskra is installed</p>
        <p className="mt-1 text-sm text-emerald-800">You’re using the standalone app experience.</p>
      </div>
    );
  }

  if (!canInstall && !isIosSafari) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-start gap-3">
        <img src="/icons/pwa-192.png" alt="" className="h-12 w-12 rounded-xl" />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">Install Zentaskra</h3>
          <p className="mt-1 text-sm text-zinc-500">Launch faster from your home screen in a focused app window.</p>
        </div>
      </div>
      {canInstall ? (
        <button onClick={onInstall} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#02031c] px-4 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900">
          <Download className="h-5 w-5" /> Install app
        </button>
      ) : (
        <div className="mt-4 rounded-xl bg-white p-3 text-sm text-zinc-700">
          <p className="flex items-center gap-2 font-semibold"><Share className="h-4 w-4" /> On iPhone Safari</p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-zinc-600">
            <li>Tap Share</li>
            <li>Tap “Add to Home Screen”</li>
            <li>Confirm Zentaskra</li>
          </ol>
        </div>
      )}
    </div>
  );
}
