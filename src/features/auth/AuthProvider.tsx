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
}

/**
 * Only admins can sign in. Any other Google account is signed out right away and shown a short
 * message — there is nothing for non-admins to do while signed in.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(() => ({
    status: isFirebaseConfigured ? 'loading' : 'ready',
    user: null,
  }));
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const auth = firebaseAuth;
    if (!auth) return undefined;
    let latestRequest = 0;
    return onAuthStateChanged(auth, (user) => {
      const request = ++latestRequest;
      if (!user) {
        setSession({ status: 'ready', user: null });
        return;
      }
      setSession({ status: 'loading', user: null });
      void checkIsAdmin(user).then(async (result) => {
        if (request !== latestRequest) return; // the user changed while we were checking
        if (result === 'admin') {
          setSession({ status: 'ready', user });
          return;
        }
        setNotice(
          result === 'not-admin'
            ? `${user.email ?? 'This account'} is not an admin. Only admins can sign in.`
            : 'Could not check your admin rights. Please try again.',
        );
        await firebaseSignOut(auth);
      });
    });
  }, []);

  const signIn = useCallback(async () => {
    setNotice(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(requireAuth(), provider);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(requireAuth());
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  const value = useMemo<AuthState>(
    () => ({
      ...session,
      isAdmin: session.user !== null,
      isAvailable: isFirebaseConfigured,
      notice,
      dismissNotice,
      signIn,
      signOut,
    }),
    [session, notice, dismissNotice, signIn, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
