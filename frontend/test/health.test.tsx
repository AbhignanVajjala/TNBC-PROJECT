import React from 'react';
import { act, create } from 'react-test-renderer';
import test from 'node:test';
import assert from 'node:assert/strict';
import { useScienceApiStatus, ScienceApiStatus } from '../src/hooks/useScienceApiStatus';
import { checkExoRankBackend } from '../src/services/api';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let current: ScienceApiStatus;
function Probe() {
  current = useScienceApiStatus();
  return null;
}

const healthy = () => new Response(JSON.stringify({ connected: true }), {
  headers: { 'Content-Type': 'application/json' },
});
const unavailable = () => new Response(JSON.stringify({ connected: false }), {
  status: 502,
  headers: { 'Content-Type': 'application/json' },
});

test('health client accepts a slow successful response beyond the old timeout', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_url, options) => new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => resolve(healthy()), 5500);
    options?.signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(options.signal.reason);
    }, { once: true });
  });
  try {
    assert.equal((await checkExoRankBackend()).connected, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('health client rejects malformed and non-successful health responses', async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const response of [
      new Response('<html>Proxy error</html>', { headers: { 'Content-Type': 'text/html' } }),
      new Response(JSON.stringify({ connected: true }), { status: 502 }),
      new Response(JSON.stringify({ connected: 'true' })),
    ]) {
      globalThis.fetch = async () => response;
      assert.equal((await checkExoRankBackend()).connected, false);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('health client times out an unresponsive probe without throwing', async context => {
  const originalFetch = globalThis.fetch;
  const timeout = new AbortController();
  context.mock.method(AbortSignal, 'timeout', (milliseconds: number) => {
    assert.equal(milliseconds, 18000);
    return timeout.signal;
  });
  globalThis.fetch = (_url, options) => new Promise<Response>((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(options.signal.reason), { once: true });
  });
  try {
    const probe = checkExoRankBackend();
    timeout.abort(new DOMException('Health check timed out', 'TimeoutError'));
    assert.equal((await probe).connected, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('one failed probe stays temporary, retries recover, and available checks use the long interval', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => ++requests === 1 ? unavailable() : healthy();
  let view: ReturnType<typeof create>;
  try {
    await act(async () => { view = create(<Probe />); });
    assert.equal(current, 'temporary-unavailable');
    assert.equal(requests, 1);
    await act(async () => { context.mock.timers.tick(4999); });
    assert.equal(requests, 1);
    await act(async () => { context.mock.timers.tick(1); });
    assert.equal(current, 'available');
    await act(async () => { context.mock.timers.tick(59999); });
    assert.equal(requests, 2);
    await act(async () => { context.mock.timers.tick(1); });
    assert.equal(requests, 3);
  } finally {
    await act(async () => view?.unmount());
    globalThis.fetch = originalFetch;
  }
});

test('three consecutive failures confirm unavailable and a later scheduled check recovers', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => ++requests <= 3 ? unavailable() : healthy();
  let view: ReturnType<typeof create>;
  try {
    await act(async () => { view = create(<Probe />); });
    await act(async () => { context.mock.timers.tick(5000); });
    assert.equal(current, 'temporary-unavailable');
    await act(async () => { context.mock.timers.tick(15000); });
    assert.equal(current, 'unavailable');
    await act(async () => { context.mock.timers.tick(60000); });
    assert.equal(current, 'available');
  } finally {
    await act(async () => view?.unmount());
    globalThis.fetch = originalFetch;
  }
});

test('a pending check stays connecting, never overlaps, and unmount aborts it', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const originalFetch = globalThis.fetch;
  let requests = 0;
  let signal: AbortSignal;
  let resolve: (response: Response) => void;
  globalThis.fetch = (_url, options) => {
    requests += 1;
    signal = options.signal as AbortSignal;
    return new Promise<Response>(done => { resolve = done; });
  };
  let view: ReturnType<typeof create>;
  try {
    await act(async () => { view = create(<Probe />); });
    assert.equal(current, 'connecting');
    await act(async () => { context.mock.timers.tick(120000); });
    assert.equal(requests, 1);
    await act(async () => view.unmount());
    assert.ok(signal.aborted);
    await act(async () => { resolve(healthy()); });
    await act(async () => { context.mock.timers.tick(120000); });
    assert.equal(requests, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
