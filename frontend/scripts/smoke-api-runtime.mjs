// Exercise the shipped server bundle using native Node ESM, without tsx/Vite.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
assert.match(readFileSync(new URL('../api/index.ts', import.meta.url), 'utf8'), /app\.bundle\.mjs/);
const {default:app} = await import('../server/app.bundle.mjs');
assert.equal(typeof app, 'function');
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
try {
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'ok');
  console.log('PASS: native ESM bundle imports and Express health returns 200.');
} finally { await new Promise(resolve => server.close(resolve)); }
