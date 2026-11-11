import type { User } from 'firebase/auth';
import { createContext } from 'react';

export interface AuthState {
  /** 'loading' until Firebase has restored the session and the admin check has finished. */
  status: 'loading' | 'ready';
  user: User | null;
  isAdmin: boolean;
  /** False when Firebase is not configured — sign-in is unavailable. */
  isAvailable: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);
