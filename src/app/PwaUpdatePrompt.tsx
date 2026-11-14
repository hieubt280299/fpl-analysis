import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui';

/** Installed apps can stay open for days: look for a new version every hour. */
const UPDATE_CHECK_MS = 60 * 60 * 1000;

/**
 * Registers the service worker and, when a new version has been downloaded, asks the user to
 * update (instead of reloading under their feet).
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      window.setInterval(() => {
        if (navigator.onLine) void registration.update();
      }, UPDATE_CHECK_MS);
    },
    onRegisterError(error) {
      console.error('Service worker registration failed', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div role="status" className="above-bottom-nav fixed inset-x-0 z-50 px-4">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
        <span className="flex-1">A new version is ready.</span>
        <Button size="sm" onClick={() => void updateServiceWorker(true)}>
          Update
        </Button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="rounded px-1.5 text-white/70 hover:text-white"
          aria-label="Later"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
