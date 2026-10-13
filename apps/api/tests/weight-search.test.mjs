import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { interpretWeightQuestion, toSearchQuestion, WEIGHT_SEARCH_MODEL } from '../dist/weightSearch.js';
import { searchRoutes } from '../dist/routes/search.js';

const mockMessage = (query, stop_reason = 'end_turn') => new Response(JSON.stringify({
  stop_reason, content: [{ type: 'text', text: JSON.stringify(query) }],
}));

test('fallback uses Haiku 5.5, a bounded output, and sends only the question', async () => {
  let calls = 0;
  const question = 'Find my most recent weigh-in of at least 65 kilos';
  const result = await interpretWeightQuestion(question, 'test-key', async (url, options) => {
    calls += 1;
    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    assert.equal(options.headers['x-api-key'], 'test-key');
    const payload = JSON.parse(options.body);
    assert.equal(payload.model, 'claude-haiku-5-5');
    assert.equal(payload.model, WEIGHT_SEARCH_MODEL);
    assert.equal(payload.max_tokens, 256);
    assert.deepEqual(payload.thinking, { type: 'disabled' });
    assert.deepEqual(payload.output_config, { effort: 'low' });
    assert.deepEqual(payload.messages, [{ role: 'user', content: question }]);
    assert.ok(options.signal);
    return mockMessage({ kind: 'comparison', operator: '>=', value: 65, order: 'last' });
  });
  assert.deepEqual(result, { question: 'last weight >= 65kg' });
  assert.equal(calls, 1);
});

test('only supported operations are converted to executable searches', () => {
  assert.equal(toSearchQuestion({ kind: 'comparison', operator: '<', value: 65.5, order: 'all' }), 'Show weights < 65.5kg');
  assert.equal(toSearchQuestion({ kind: 'extreme', direction: 'lowest' }), 'What was my lowest weight?');
  assert.equal(toSearchQuestion({ kind: 'unsupported' }), null);
  for (const query of [null, [], { kind: 'sql', sql: 'DROP TABLE weight_entries' },
    { kind: 'comparison', operator: '>=', value: '65', order: 'last' },
    { kind: 'comparison', operator: '>=', value: 65, order: 'last', since: '2026-01-01' },
    { kind: 'comparison', operator: '>=', value: Infinity, order: 'last' },
    { kind: 'comparison', operator: '>=', value: -1, order: 'last' },
    { kind: 'extreme', direction: 'lowest', units: 'lb' }]) {
    assert.throws(() => toSearchQuestion(query));
  }
});

test('missing key and invalid questions make no provider calls', async () => {
  const fetcher = async () => { assert.fail('Provider must not be called'); };
  for (const question of ['', ' ', null, 'a'.repeat(501)]) {
    await assert.rejects(interpretWeightQuestion(question, 'test-key', fetcher), (error) => error.status === 400);
  }
  await assert.rejects(interpretWeightQuestion('Find my minimum weight', '', fetcher), (error) => error.status === 503);
});

test('provider failures, refusals and truncated or invalid outputs fail safely', async () => {
  const fetchers = [
    async () => { throw new Error('private provider detail'); },
    async () => new Response('private provider detail', { status: 401 }),
    async () => mockMessage({ kind: 'extreme', direction: 'lowest' }, 'max_tokens'),
    async () => mockMessage({ kind: 'unsupported' }, 'refusal'),
    async () => new Response('invalid JSON'),
    async () => mockMessage({ kind: 'sql' }),
  ];
  for (const fetcher of fetchers) {
    await assert.rejects(interpretWeightQuestion('Find my minimum weight', 'test-key', fetcher), (error) => {
      assert.ok([502, 503].includes(error.status));
      assert.doesNotMatch(error.message, /private provider detail|test-key/);
      return true;
    });
  }
});

test('HTTP route rejects malformed requests and returns unavailable without a key', async () => {
  const response = await searchRoutes.request('/', { method: 'POST', body: '{' });
  assert.equal(response.status, 400);
  const invalid = await searchRoutes.request('/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: 123 }),
  });
  assert.equal(invalid.status, 400);
  const originalKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const unavailable = await searchRoutes.request('/', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: 'Find my minimum weight' }),
    });
    assert.equal(unavailable.status, 503);
    assert.match((await unavailable.json()).error, /not configured/);
  } finally {
    if (originalKey !== undefined) process.env.ANTHROPIC_API_KEY = originalKey;
  }
});
