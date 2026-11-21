import { describe, expect, it, vi } from 'vitest';
import { handleFplRequest, resolveFplTarget } from './fpl';

const at = (query: string) => new URL(`https://app.example/api/fpl?${query}`);

describe('resolveFplTarget', () => {
  it('maps allow-listed paths to the FPL API, adding the trailing slash FPL requires', () => {
    expect(resolveFplTarget(at('path=bootstrap-static'))?.url.href).toBe(
      'https://fantasy.premierleague.com/api/bootstrap-static/',
    );
    expect(resolveFplTarget(at('path=event-status/'))?.url.href).toBe(
      'https://fantasy.premierleague.com/api/event-status/',
    );
    expect(resolveFplTarget(at('path=entry%2F130307%2Fhistory%2F'))?.url.href).toBe(
      'https://fantasy.premierleague.com/api/entry/130307/history/',
    );
    expect(resolveFplTarget(at('path=entry/130307/event/11/picks/'))?.url.href).toBe(
      'https://fantasy.premierleague.com/api/entry/130307/event/11/picks/',
    );
    expect(resolveFplTarget(at('path=event/11/live/'))?.url.href).toBe(
      'https://fantasy.premierleague.com/api/event/11/live/',
    );
    expect(resolveFplTarget(at('path=fixtures/&event=11'))?.url.href).toBe(
      'https://fantasy.premierleague.com/api/fixtures/?event=11',
    );
  });

  it('forwards only allow-listed query parameters', () => {
    const target = resolveFplTarget(
      at(
        'path=leagues-classic/758527/standings/&page_standings=2&phase=1&evil=1&page_new_entries=1',
      ),
    );
    expect(target?.url.searchParams.get('page_standings')).toBe('2');
    expect(target?.url.searchParams.get('phase')).toBe('1');
    expect(target?.url.searchParams.has('evil')).toBe(false);
    expect(target?.url.searchParams.has('path')).toBe(false);
  });

  it('rejects anything not on the allow-list', () => {
    for (const path of [
      'me/',
      'entry/abc/history/',
      '../secret/',
      'entry/1/transfers/',
      'entry/1/event/x/picks/',
      'event/11/live/extra/',
      '',
    ]) {
      expect(resolveFplTarget(at(`path=${encodeURIComponent(path)}`))).toBeNull();
    }
  });
});

describe('handleFplRequest', () => {
  it('proxies the upstream body with CDN cache headers', async () => {
    const fetchImpl = vi.fn(
      async (_input: string | URL | Request) => new Response('{"ok":true}', { status: 200 }),
    );
    const response = await handleFplRequest(
      new Request(at('path=fixtures/')),
      fetchImpl as unknown as typeof fetch,
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('{"ok":true}');
    expect(response.headers.get('cache-control')).toContain('s-maxage=60');
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe(
      'https://fantasy.premierleague.com/api/fixtures/',
    );
  });

  it('does not cache upstream errors', async () => {
    const fetchImpl = async () => new Response('The game is being updated.', { status: 503 });
    const response = await handleFplRequest(new Request(at('path=fixtures/')), fetchImpl);
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('returns 404 for unsupported endpoints and 405 for non-GET methods', async () => {
    expect((await handleFplRequest(new Request(at('path=me/')))).status).toBe(404);
    expect(
      (await handleFplRequest(new Request(at('path=fixtures/'), { method: 'POST' }))).status,
    ).toBe(405);
  });

  it('returns 502 when FPL cannot be reached', async () => {
    const fetchImpl = async () => {
      throw new Error('network down');
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await handleFplRequest(new Request(at('path=fixtures/')), fetchImpl);
    expect(response.status).toBe(502);
  });
});
