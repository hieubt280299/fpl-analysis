import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { describe, expect, it } from 'vitest';
import { sanitizeRestoredClient, shouldPersistQuery } from './persistence';

type QueryLike = Parameters<typeof shouldPersistQuery>[0];
const query = (queryKey: unknown[], data: unknown): QueryLike =>
  ({ queryKey, state: { data } }) as unknown as QueryLike;

describe('shouldPersistQuery', () => {
  it('caches FPL queries that hold data, and nothing from Firestore', () => {
    expect(shouldPersistQuery(query(['fpl', 'bootstrap'], { gameweeks: [] }))).toBe(true);
    expect(shouldPersistQuery(query(['fpl', 'fixtures'], undefined))).toBe(false);
    expect(shouldPersistQuery(query(['settings', 'fdr'], { gameweekWeights: [] }))).toBe(false);
    expect(shouldPersistQuery(query(['months', 'list'], []))).toBe(false);
  });
});

describe('sanitizeRestoredClient', () => {
  it('restores a query whose last refresh failed as a success that keeps its data', () => {
    const client = {
      timestamp: 1,
      buster: 'x',
      clientState: {
        mutations: [],
        queries: [
          {
            queryKey: ['fpl', 'fixtures'],
            queryHash: '["fpl","fixtures"]',
            state: {
              data: [1, 2, 3],
              dataUpdatedAt: 100,
              status: 'error',
              error: new Error('FPL is updating'),
              errorUpdatedAt: 200,
              fetchFailureCount: 3,
              fetchFailureReason: new Error('FPL is updating'),
              fetchStatus: 'idle',
              dataUpdateCount: 1,
              errorUpdateCount: 1,
              isInvalidated: false,
              fetchMeta: null,
            },
          },
        ],
      },
    } as unknown as PersistedClient;

    const state = sanitizeRestoredClient(client).clientState.queries[0]?.state;
    expect(state).toMatchObject({
      status: 'success',
      error: null,
      data: [1, 2, 3],
      dataUpdatedAt: 100,
    });
  });
});
