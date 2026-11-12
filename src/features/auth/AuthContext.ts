import type { User } from 'firebase/auth';
import { createContext } from 'react';

export interface AuthState {
  /** 'loading' until Firebase has restored the session and the admin check has finished. */
  status: 'loading' | 'ready';
  /** Only admins stay signed in, so a signed-in user is always an admin. */
  user: User | null;
  isAdmin: boolean;
  /** False when Firebase is not configured — sign-in is unavailable. */
  isAvailable: boolean;
  /** Message after a rejected sign-in (e.g. not an admin), until dismissed. */
  notice: string | null;
  dismissNotice: () => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);
