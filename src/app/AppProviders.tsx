import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useState, type ReactNode } from 'react';
import { AuthProvider } from '@/features/auth';
import { createPersistOptions } from './persistence';
import { createQueryClient } from './queryClient';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const [persistOptions] = useState(createPersistOptions);
  const content = <AuthProvider>{children}</AuthProvider>;

  // Without browser storage (private mode etc.) the app works the same, just without the cache.
  if (!persistOptions) {
    return <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>;
  }
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      {content}
    </PersistQueryClientProvider>
  );
}
