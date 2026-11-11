import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { firebaseAuth, isFirebaseConfigured, requireAuth } from '@/lib/firebase/client';
import { checkIsAdmin } from './adminRepository';
import { AuthContext, type AuthState } from './AuthContext';

interface Session {
  status: AuthState['status'];
  user: User | null;
  isAdmin: boolean;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(() => ({
    status: isFirebaseConfigured ? 'loading' : 'ready',
    user: null,
    isAdmin: false,
  }));

  useEffect(() => {
    if (!firebaseAuth) return undefined;
    let latestRequest = 0;
    return onAuthStateChanged(firebaseAuth, (user) => {
      const request = ++latestRequest;
      if (!user) {
        setSession({ status: 'ready', user: null, isAdmin: false });
        return;
      }
      void checkIsAdmin(user).then((isAdmin) => {
        // Ignore stale results if the user changed while the check was in flight.
        if (request === latestRequest) setSession({ status: 'ready', user, isAdmin });
      });
    });
  }, []);

  const signIn = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(requireAuth(), provider);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(requireAuth());
  }, []);

  const value = useMemo<AuthState>(
    () => ({ ...session, isAvailable: isFirebaseConfigured, signIn, signOut }),
    [session, signIn, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
