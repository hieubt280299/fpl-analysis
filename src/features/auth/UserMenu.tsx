import { FirebaseError } from 'firebase/app';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { useAuth } from './useAuth';

const IGNORED_SIGN_IN_ERRORS = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
]);

export function UserMenu() {
  const { status, user, isAvailable, signIn, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!isAvailable) return null;
  if (status === 'loading') return <div className="h-8 w-20 animate-pulse rounded bg-white/10" />;

  const handleSignIn = async () => {
    setBusy(true);
    try {
      await signIn();
    } catch (error) {
      if (!(error instanceof FirebaseError && IGNORED_SIGN_IN_ERRORS.has(error.code))) {
        console.error(error);
        window.alert('Sign-in failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="text-white/90 hover:bg-white/10 hover:text-white"
        loading={busy}
        onClick={() => void handleSignIn()}
      >
        Admin sign in
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className="hidden max-w-[12rem] truncate text-sm text-white/90 sm:inline"
        title={user.email ?? ''}
      >
        {user.displayName ?? user.email}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="text-white/90 hover:bg-white/10 hover:text-white"
        onClick={() => void signOut()}
      >
        Sign out
      </Button>
    </div>
  );
}
