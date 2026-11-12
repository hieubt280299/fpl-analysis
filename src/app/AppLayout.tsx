import { NavLink, Outlet, ScrollRestoration } from 'react-router';
import { cn } from '@/components/ui';
import { useAuth, UserMenu } from '@/features/auth';
import { isFirebaseConfigured } from '@/lib/firebase/client';
import { FplUpdatingBanner } from './FplUpdatingBanner';

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white',
  );
}

export function AppLayout() {
  const { isAdmin, notice, dismissNotice } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-brand-800 text-white shadow">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 font-bold tracking-tight">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
            FPL Analysis
          </NavLink>
          <nav className="flex flex-1 items-center gap-1" aria-label="Main">
            <NavLink to="/league" className={navClass}>
              Mini-league
            </NavLink>
            <NavLink to="/fdr" className={navClass}>
              Fixture difficulty
            </NavLink>
            {isAdmin && (
              <NavLink to="/settings" className={navClass}>
                Settings
              </NavLink>
            )}
          </nav>
          <UserMenu />
        </div>
      </header>

      {notice && (
        <div className="border-b border-red-200 bg-red-50" role="alert">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-sm text-red-900">
            <span>{notice}</span>
            <button
              type="button"
              onClick={dismissNotice}
              className="rounded px-2 text-red-700 hover:bg-red-100"
              aria-label="Close message"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <FplUpdatingBanner />

      {!isFirebaseConfigured && (
        <div className="border-b border-amber-200 bg-amber-50">
          <p className="mx-auto max-w-6xl px-4 py-2 text-xs text-amber-900">
            Firebase is not configured — showing FPL data with default settings. Saved months and
            admin tools are unavailable. See README.md.
          </p>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500">
          Data from the official Fantasy Premier League API. Not affiliated with the Premier League.
        </p>
      </footer>
      <ScrollRestoration />
    </div>
  );
}
