import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { requireFirestore } from '@/lib/firebase/client';

/**
 * A user is an admin when `admins/{lower-case email}` exists. Firestore rules only let users read
 * their own admin doc, and every write is re-checked server-side by the rules — this flag only
 * controls what the UI shows.
 */
export async function checkIsAdmin(user: User): Promise<boolean> {
  if (!user.email || !user.emailVerified) return false;
  try {
    const snapshot = await getDoc(doc(requireFirestore(), 'admins', user.email.toLowerCase()));
    return snapshot.exists();
  } catch (error) {
    console.warn('Admin check failed; treating user as non-admin.', error);
    return false;
  }
}
