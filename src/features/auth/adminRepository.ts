import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { requireFirestore } from '@/lib/firebase/client';

export type AdminCheck = 'admin' | 'not-admin' | 'error';

/**
 * A user is an admin when `admins/{lower-case email}` exists. Firestore rules only let users read
 * their own admin doc, and every write is re-checked server-side by the rules.
 * 'error' means the check itself failed (offline, rules not deployed…), not that the user isn't one.
 */
export async function checkIsAdmin(user: User): Promise<AdminCheck> {
  if (!user.email || !user.emailVerified) return 'not-admin';
  try {
    const snapshot = await getDoc(doc(requireFirestore(), 'admins', user.email.toLowerCase()));
    return snapshot.exists() ? 'admin' : 'not-admin';
  } catch (error) {
    console.warn('Admin check failed.', error);
    return 'error';
  }
}
