import type { ReactNode } from 'react';
import { EmptyState, LoadingState } from '@/components/ui';
import { useAuth } from './useAuth';

/** Renders children only for admins. Server-side protection is enforced by firestore.rules. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, user, isAdmin, isAvailable } = useAuth();

  if (!isAvailable) {
    return (
      <EmptyState title="Admin tools are off">Firebase is not set up. See README.md.</EmptyState>
    );
  }
  if (status === 'loading') return <LoadingState label="Checking…" />;
  if (!user || !isAdmin) {
    return <EmptyState title="Admins only">Please sign in with an admin account.</EmptyState>;
  }
  return <>{children}</>;
}
