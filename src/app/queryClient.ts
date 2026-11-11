import { QueryClient } from '@tanstack/react-query';
import { FirebaseNotConfiguredError } from '@/lib/firebase/client';
import { FplApiError } from '@/lib/fpl/client';

const MAX_RETRIES = 2;

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof FplApiError && error.isClientError) return false;
  if (error instanceof FirebaseNotConfiguredError) return false;
  // Firestore permission errors will not fix themselves.
  if (error instanceof Error && 'code' in error && error.code === 'permission-denied') return false;
  return failureCount < MAX_RETRIES;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        refetchOnWindowFocus: true,
        staleTime: 60_000,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
