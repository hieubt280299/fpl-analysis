import { useState } from 'react';
import { promptInstall, useInstallState } from './installPrompt';

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
    </svg>
  );
}

/**
 * "Install app" in the header — only when the app can be installed and isn't already.
 * Chromium shows its own install dialog; on iPhone/iPad we explain Share → Add to Home Screen.
 */
export function InstallAppButton() {
  const { installed, canPrompt, isIos } = useInstallState();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (installed || (!canPrompt && !isIos)) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (canPrompt ? void promptInstall() : setShowIosHelp((v) => !v))}
        aria-expanded={isIos && !canPrompt ? showIosHelp : undefined}
        className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white sm:h-8"
      >
        <DownloadIcon />
        <span>Install</span>
        <span className="hidden sm:inline">app</span>
      </button>

      {showIosHelp && (
        <div
          role="dialog"
          aria-label="Install on iPhone or iPad"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg bg-white p-3 text-sm text-slate-700 shadow-lg ring-1 ring-slate-200"
        >
          <p className="font-semibold text-slate-900">Add to Home Screen</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5">
            <li>
              Tap <strong>Share</strong> <span aria-hidden="true">(□↑)</span>
            </li>
            <li>
              Tap <strong>Add to Home Screen</strong>
            </li>
          </ol>
          <button
            type="button"
            onClick={() => setShowIosHelp(false)}
            className="mt-2 text-xs font-medium text-brand-700 hover:underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
