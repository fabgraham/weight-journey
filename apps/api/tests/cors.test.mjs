import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getAllowedOrigins } from '../dist/cors.js';

test('production remains allowed with absent, incorrect or trailing-slash settings', () => {
  for (const setting of ['', 'invalid', 'https://old-app.vercel.app', ' https://myweightjourney.vercel.app/ ']) {
    assert.ok(getAllowedOrigins(setting).includes('https://myweightjourney.vercel.app'));
  }
  assert.deepEqual(getAllowedOrigins('https://myweightjourney.vercel.app/'), ['https://myweightjourney.vercel.app']);
  assert.ok(getAllowedOrigins('http://localhost:8081/').includes('http://localhost:8081'));
});

test('browser preflight and weight responses allow the live app', async () => {
  const app = new Hono();
  app.use('*', cors({ origin: getAllowedOrigins(' https://myweightjourney.vercel.app/ ') }));
  app.get('/weight', (c) => c.json([]));
  const origin = 'https://myweightjourney.vercel.app';
  const preflight = await app.request('/weight', {
    method: 'OPTIONS', headers: {
      Origin: origin, 'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'content-type,x-api-key',
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  assert.match(preflight.headers.get('Access-Control-Allow-Headers'), /x-api-key/);
  const response = await app.request('/weight', { headers: { Origin: origin } });
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  const unrelated = await app.request('/weight', { headers: { Origin: 'https://unrelated.example' } });
  assert.equal(unrelated.headers.get('Access-Control-Allow-Origin'), null);
});
