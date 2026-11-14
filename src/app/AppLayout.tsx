import type { ReactNode } from 'react';
import { NavLink, Outlet, ScrollRestoration } from 'react-router';
import { cn } from '@/components/ui';
import { useAuth, UserMenu } from '@/features/auth';
import { isFirebaseConfigured } from '@/lib/firebase/client';
import { FplUpdatingBanner } from './FplUpdatingBanner';
import { InstallAppButton } from './InstallAppButton';
import { PwaUpdatePrompt } from './PwaUpdatePrompt';

interface NavItem {
  to: string;
  label: string;
  /** Shorter label for the mobile tab bar. */
  tabLabel: string;
  icon: ReactNode;
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'h-6 w-6',
  'aria-hidden': true,
};

const LEAGUE: NavItem = {
  to: '/league',
  label: 'Mini-league',
  tabLabel: 'Mini-league',
  icon: (
    <svg {...iconProps}>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 6h2a2 2 0 0 1 0 4h-2M7 6H5a2 2 0 0 0 0 4h2" />
    </svg>
  ),
};

const FDR: NavItem = {
  to: '/fdr',
  label: 'Fixture difficulty',
  tabLabel: 'FDR',
  icon: (
    <svg {...iconProps}>
      <path d="M5 20v-6M12 20V9M19 20V4" />
    </svg>
  ),
};

const SETTINGS: NavItem = {
  to: '/settings',
  label: 'Settings',
  tabLabel: 'Settings',
  icon: (
    <svg {...iconProps}>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  ),
};

function topNavClass({ isActive }: { isActive: boolean }) {
  return cn(
    'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white',
  );
}

function tabClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
    isActive ? 'text-brand-700' : 'text-slate-500 hover:text-slate-800',
  );
}

export function AppLayout() {
  const { isAdmin, notice, dismissNotice } = useAuth();
  const items = isAdmin ? [LEAGUE, FDR, SETTINGS] : [LEAGUE, FDR];

  return (
    <div className="clear-bottom-nav flex min-h-dvh flex-col">
      <header className="safe-top sticky top-0 z-30 bg-brand-800 text-white shadow">
        <div className="safe-x mx-auto flex h-14 max-w-6xl items-center gap-4">
          <NavLink to="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
            <span>FPL Analysis</span>
          </NavLink>
          {/* Desktop/tablet navigation; phones use the bottom tab bar. */}
          <nav className="hidden flex-1 items-center gap-1 sm:flex" aria-label="Main">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} className={topNavClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <InstallAppButton />
            <UserMenu />
          </div>
        </div>
      </header>

      {notice && (
        <div className="border-b border-red-200 bg-red-50" role="alert">
          <div className="safe-x mx-auto flex max-w-6xl items-center justify-between gap-3 py-2 text-sm text-red-900">
            <span>{notice}</span>
            <button
              type="button"
              onClick={dismissNotice}
              className="rounded px-2 py-1 text-red-700 hover:bg-red-100"
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
          <p className="safe-x mx-auto max-w-6xl py-2 text-xs text-amber-900">
            Firebase is not set up: showing FPL data only. See README.md.
          </p>
        </div>
      )}

      <main className="safe-x mx-auto w-full max-w-6xl flex-1 py-4 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <p className="safe-x mx-auto max-w-6xl py-4 text-xs text-slate-500">
          Data from the official Fantasy Premier League API. Not affiliated with the Premier League.
        </p>
      </footer>

      {/* Mobile tab bar (thumb-friendly, like an app). */}
      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur sm:hidden"
        aria-label="Main"
      >
        <div
          className={cn(
            'mx-auto grid max-w-md',
            items.length === 3 ? 'grid-cols-3' : 'grid-cols-2',
          )}
        >
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className={tabClass}>
              {item.icon}
              {item.tabLabel}
            </NavLink>
          ))}
        </div>
      </nav>

      <PwaUpdatePrompt />
      <ScrollRestoration />
    </div>
  );
}
