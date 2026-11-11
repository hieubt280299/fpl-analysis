import type { ReactNode } from 'react';
import { EmptyState, LoadingState } from '@/components/ui';
import { useAuth } from './useAuth';

/** Renders children only for admins. Server-side protection is enforced by firestore.rules. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, user, isAdmin, isAvailable } = useAuth();

  if (!isAvailable) {
    return (
      <EmptyState title="Admin features are unavailable">
        Firebase is not configured for this deployment. See README.md → “Firebase setup”.
      </EmptyState>
    );
  }
  if (status === 'loading') return <LoadingState label="Checking permissions…" />;
  if (!user) {
    return (
      <EmptyState title="Admins only">Sign in with an admin Google account to continue.</EmptyState>
    );
  }
  if (!isAdmin) {
    return (
      <EmptyState title="Not an admin">
        {user.email} is not on the admin list. Ask an existing admin to add a document named{' '}
        <code className="rounded bg-slate-100 px-1">{user.email?.toLowerCase()}</code> to the{' '}
        <code className="rounded bg-slate-100 px-1">admins</code> collection.
      </EmptyState>
    );
  }
  return <>{children}</>;
}
