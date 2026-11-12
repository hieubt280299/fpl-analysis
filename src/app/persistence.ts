import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import type { Query } from '@tanstack/react-query';
import type {
  PersistedClient,
  Persister,
  PersistQueryClientOptions,
} from '@tanstack/react-query-persist-client';

/**
 * Browser cache for FPL data (localStorage). When FPL is unreachable — it is "being updated" for
 * an hour or two around deadlines and after each gameweek — returning visitors still see the last
 * data they loaded, with its timestamp. Firestore data (settings, months) is never cached here.
 */
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Bump whenever the shape of cached (mapped) FPL data changes, to discard old caches. */
export const CACHE_BUSTER = 'fpl-v2';

const STORAGE_KEY = 'fpl-analysis:query-cache';

/** Only FPL queries that hold data are cached — including ones whose latest refresh failed. */
export function shouldPersistQuery(query: Pick<Query, 'queryKey' | 'state'>): boolean {
  return query.queryKey[0] === 'fpl' && query.state.data !== undefined;
}

/**
 * A query saved right after a failed refresh still holds good data. Restore it as a plain
 * success so the page shows the data (it refetches immediately anyway) instead of an old error.
 */
export function sanitizeRestoredClient(client: PersistedClient): PersistedClient {
  for (const query of client.clientState.queries) {
    if (query.state.status === 'error' && query.state.data !== undefined) {
      query.state = {
        ...query.state,
        status: 'success',
        error: null,
        errorUpdatedAt: 0,
        fetchFailureCount: 0,
        fetchFailureReason: null,
      };
    }
  }
  return client;
}

function browserStorage(): Storage | undefined {
  try {
    const storage = window.localStorage;
    const probe = '__fpl_analysis_probe__';
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return storage;
  } catch {
    return undefined; // private mode / storage disabled: run without the cache
  }
}

export function createPersistOptions(): Omit<PersistQueryClientOptions, 'queryClient'> | null {
  const storage = browserStorage();
  if (!storage) return null;
  const base = createSyncStoragePersister({ storage, key: STORAGE_KEY, throttleTime: 2_000 });
  const persister: Persister = {
    persistClient: (client) => base.persistClient(client),
    removeClient: () => base.removeClient(),
    restoreClient: async () => {
      const client = await base.restoreClient();
      return client ? sanitizeRestoredClient(client) : client;
    },
  };
  return {
    persister,
    maxAge: CACHE_MAX_AGE_MS,
    buster: CACHE_BUSTER,
    dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
  };
}
