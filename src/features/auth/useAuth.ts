import { useContext } from 'react';
import { AuthContext, type AuthState } from './AuthContext';

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}

/** Email of the signed-in admin, for `updatedBy` audit fields. Throws if signed out. */
export function useAdminEmail(): () => string {
  const { user } = useAuth();
  return () => {
    const email = user?.email;
    if (!email) throw new Error('You must be signed in as an admin to do this.');
    return email.toLowerCase();
  };
}
