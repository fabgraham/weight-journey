import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { askWeightHistory } from '../dist/weightAssistant.js';
import { readWeightHistory } from '../dist/weightHistoryTool.js';
import { createSearchRoutes, searchRoutes } from '../dist/routes/search.js';

const rows = [
  { id: 'a', date: '2026-01-01', weight_kg: '65.0' },
  { id: 'b', date: '2026-10-14', weight_kg: '64.0' },
];
const reply = (content, stop_reason = 'end_turn') => new Response(JSON.stringify({ content, stop_reason }));
const final = (ids = ['read1'], extra = {}) => reply([{ type: 'text', text: JSON.stringify({
  supported: true, answer: 'Found 2 recorded weights in 2026.', comment: 'The last recorded weight is 1 kg lower than the first.', result_set_ids: ids, ...extra,
}) }]);
const tool = (input = { selection: 'all' }, id = 'read1') => ({ type: 'tool_use', id, name: 'read_weight_history', input });
const noRead = async () => assert.fail('Database must not be accessed');
const ask = (question, fetcher, read = noRead) => askWeightHistory(question, read, 'test-key', fetcher, 'wrkspc_test', '2026-10-14');

test('date-restricted range uses parameterized SELECT and returns records plus Claude comment', async () => {
  let calls = 0;
  let reads = 0;
  const question = 'Give me all weights between 64 and 65kg this year';
  const result = await ask(question, async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    assert.equal(options.headers['anthropic-workspace-id'], 'wrkspc_test');
    assert.equal(options.headers['x-api-key'], 'test-key');
    assert.ok(options.signal);
    const payload = JSON.parse(options.body);
    assert.equal(payload.model, 'claude-sonnet-5-5');
    assert.equal(payload.max_tokens, 4096);
    assert.deepEqual(payload.thinking, { type: 'adaptive' });
    assert.equal(payload.output_config.effort, 'medium');
    assert.equal(payload.output_config.format.type, 'json_schema');
    assert.deepEqual(payload.output_config.format.schema.required, ['supported', 'answer', 'comment', 'result_set_ids']);
    assert.equal(payload.output_config.format.schema.additionalProperties, false);
    assert.match(payload.system, /2026-10-14/);
    assert.equal(payload.tools[0].name, 'read_weight_history');
    if (calls === 1) {
      assert.deepEqual(payload.messages, [{ role: 'user', content: question }]);
      return reply([
        { type: 'thinking', thinking: 'Resolve the year and request matching records.', signature: 'provider-signature' },
        tool({ selection: 'all', minimum: 64, maximum: 65, start_date: '2026-01-01', end_date: '2026-12-31' }),
      ], 'tool_use');
    }
    assert.equal(payload.messages[1].role, 'assistant');
    assert.deepEqual(payload.messages[1].content[0], {
      type: 'thinking', thinking: 'Resolve the year and request matching records.', signature: 'provider-signature',
    });
    const evidence = JSON.parse(payload.messages[2].content[0].content);
    assert.equal(evidence.result_set_id, 'read1');
    assert.equal(evidence.count, 2);
    assert.equal(evidence.average_kg, 64.5);
    assert.equal(evidence.change_kg, -1);
    assert.deepEqual(Object.keys(evidence.first), ['id', 'date', 'weight_kg']);
    return final();
  }, async (sql, values) => {
    reads++;
    assert.match(sql, /^SELECT id, TO_CHAR\(date/);
    assert.match(sql, /date >= \$1 AND date <= \$2 AND weight_kg >= \$3 AND weight_kg <= \$4/);
    assert.deepEqual(values, ['2026-01-01', '2026-12-31', 64, 65]);
    assert.doesNotMatch(sql, /created_at|profile|injection|INSERT|UPDATE|DELETE/);
    return { rows };
  });
  assert.equal(calls, 2);
  assert.equal(reads, 1);
  assert.deepEqual(result.entries.map(e => [e.id, e.weight_kg]), [['b', 64], ['a', 65]]);
  assert.match(result.comment, /1 kg lower/);
});

test('invalid filters and attempts to supply SQL or other tables never reach the database', async () => {
  for (const input of [null, [], {}, { selection: 'all', sql: 'DROP TABLE weight_entries' },
    { selection: 'all', table: 'profile' }, { selection: 'all', minimum: '64' },
    { selection: 'all', minimum: -1 }, { selection: 'all', maximum: Infinity },
    { selection: 'all', minimum: 65, maximum: 64 }, { selection: 'all', minimum_exclusive: true },
    { selection: 'all', start_date: "2026-01-01' OR 1=1" }, { selection: 'all', start_date: '2026-02-30' },
    { selection: 'all', start_date: '2026-11-01', end_date: '2026-01-01' }, { selection: 'all', start_date: '2026-13-01' },
    { selection: 'all', maximum: 65, maximum_exclusive: 'true' }, { selection: 'delete' }]) {
    await assert.rejects(readWeightHistory(input, noRead));
  }
});

test('strict bounds, chronological selections, and tied extremes are deterministic', async () => {
  const history = [...rows, { id: 'c', date: '2026-10-15', weight_kg: '64.0' }];
  for (const [selection, ids] of [['first', ['a']], ['last', ['c']], ['lowest', ['b', 'c']], ['highest', ['a']]]) {
    const result = await readWeightHistory({ selection, minimum: 63, maximum: 66, minimum_exclusive: true, maximum_exclusive: true }, async (sql, values) => {
      assert.match(sql, /weight_kg > \$1 AND weight_kg < \$2/);
      assert.deepEqual(values, [63, 66]);
      return { rows: history };
    });
    assert.deepEqual(result.entries.map(e => e.id), ids);
  }
});

test('the app gets complete results while Claude receives only a labelled sample', async () => {
  const many = Array.from({ length: 40 }, (_, i) => ({ id: String(i), date: '2026-10-14', weight_kg: i % 2 ? 64 : 65 }));
  let calls = 0;
  const result = await ask('Show all weights', async (_, options) => {
    if (++calls === 1) return reply([tool()], 'tool_use');
    const evidence = JSON.parse(JSON.parse(options.body).messages[2].content[0].content);
    assert.equal(evidence.count, 40);
    assert.equal(evidence.sample_entries.length, 30);
    assert.equal(evidence.sample_is_complete, false);
    assert.equal(evidence.average_kg, 64.5);
    return final(['read1'], { answer: 'Found 40 weights.', comment: null });
  }, async () => ({ rows: many }));
  assert.equal(result.entries.length, 40);
  assert.equal(result.comment, null);
  await assert.rejects(readWeightHistory({ selection: 'all' }, async () => ({ rows: Array(5001).fill(rows[0]) })), /narrow the date range/);
});

test('period comparisons select verified result sets and deduplicate overlapping records', async () => {
  let calls = 0;
  let reads = 0;
  const result = await ask('Compare two periods', async () => ++calls === 1
    ? reply([tool({ selection: 'all', start_date: '2026-01-01' }, 'period1'), tool({ selection: 'all', start_date: '2026-10-01' }, 'period2')], 'tool_use')
    : final(['period1', 'period2']), async () => ({ rows: ++reads === 1 ? rows : [rows[1]] }));
  assert.equal(reads, 2);
  assert.deepEqual(result.entries.map(e => e.id), ['b', 'a']);
});

test('an omitted optional comment does not reject otherwise valid supporting records', async () => {
  let calls = 0;
  const result = await ask('Give me all weights between 64 and 65kg this year', async () => ++calls === 1
    ? reply([tool({ selection: 'all', minimum: 64, maximum: 65, start_date: '2026-01-01', end_date: '2026-12-31' })], 'tool_use')
    : reply([{ type: 'text', text: JSON.stringify({ supported: true, answer: 'Found 2 weights.', result_set_ids: ['read1'] }) }]), async () => ({ rows }));
  assert.equal(result.comment, null);
  assert.deepEqual(result.entries.map(e => e.id), ['b', 'a']);
});

test('wrong or missing result-set references are corrected once without repeating reads or losing full results', async () => {
  for (const wrongIds of [['a', 'b'], [], ['invented']]) {
    let calls = 0;
    let reads = 0;
    const many = Array.from({ length: 40 }, (_, i) => ({ id: String(i), date: '2026-10-14', weight_kg: 64.5 }));
    const result = await ask('Give me all weights between 64 and 65kg this year', async (_, options) => {
      if (++calls === 1) return reply([tool({ selection: 'all', minimum: 64, maximum: 65, start_date: '2026-01-01', end_date: '2026-12-31' })], 'tool_use');
      if (calls === 2) return final(wrongIds);
      const payload = JSON.parse(options.body);
      assert.equal(payload.messages[3].role, 'assistant');
      assert.equal(payload.messages[4].role, 'user');
      assert.match(payload.messages[4].content, /only available result_set_ids are \["read1"\]/);
      assert.match(payload.messages[4].content, /do not repeat the database reads/);
      return final(['read1'], { answer: 'Found 40 recorded weights this year.' });
    }, async () => { reads++; return { rows: many }; });
    assert.equal(calls, 3);
    assert.equal(reads, 1);
    assert.equal(result.entries.length, 40);
  }
});

test('an empty matching result set retains its reference during answer correction', async () => {
  let calls = 0;
  let reads = 0;
  const result = await ask('Show weights above 200kg this year', async () => {
    if (++calls === 1) return reply([tool({ selection: 'all', minimum: 200 })], 'tool_use');
    return final(calls === 2 ? [] : ['read1'], { answer: 'No matching records.', comment: null });
  }, async () => { reads++; return { rows: [] }; });
  assert.equal(calls, 3);
  assert.equal(reads, 1);
  assert.equal(result.supported, true);
  assert.deepEqual(result.entries, []);
});

test('invalid JSON can be corrected after evidence has been retrieved', async () => {
  let calls = 0;
  const result = await ask('Show weights this year', async () => {
    if (++calls === 1) return reply([tool()], 'tool_use');
    if (calls === 2) return reply([{ type: 'text', text: 'invalid JSON' }]);
    return final();
  }, async () => ({ rows }));
  assert.equal(calls, 3);
  assert.equal(result.entries.length, 2);
});

test('empty searches and clarification have distinct supported states', async () => {
  let calls = 0;
  const empty = await ask('Show weights above 200kg', async () => ++calls === 1
    ? reply([tool({ selection: 'all', minimum: 200, minimum_exclusive: true })], 'tool_use')
    : final(['read1'], { answer: 'No matching records.', comment: null }), async () => ({ rows: [] }));
  assert.equal(empty.supported, true);
  assert.deepEqual(empty.entries, []);
  const unclear = await ask('How am I doing?', async () => final([], { supported: false, answer: 'Which period would you like to compare?', comment: null }));
  assert.equal(unclear.supported, false);
  assert.deepEqual(unclear.entries, []);
});

test('fabricated results, missing evidence, refusals, and truncated or malformed output fail safely', async () => {
  for (const fetcher of [async () => final(), async () => final([]), async () => reply([{ type: 'text', text: '{}' }]),
    async () => reply([{ type: 'text', text: 'not JSON' }]), async () => reply([], 'max_tokens'),
    async () => reply([], 'refusal'), async () => new Response('invalid JSON')]) {
    await assert.rejects(ask('What was my average?', fetcher));
  }
  let calls = 0;
  await assert.rejects(ask('Show history', async () => ++calls === 1 ? reply([tool()], 'tool_use') : final(['invented']), async () => ({ rows })), /valid supporting records/);
  await assert.rejects(ask('Show history', async () => reply([{ ...tool(), name: 'run_sql' }], 'tool_use')), /could not complete/);
});

test('bounded tool loop prevents unending reads and repeated tool IDs', async () => {
  let calls = 0;
  await assert.rejects(ask('Show history', async () => reply([tool({ selection: 'all' }, `read${++calls}`)], 'tool_use'), async () => ({ rows })), /could not finish/);
  assert.equal(calls, 5);
  await assert.rejects(ask('Show history', async () => reply([tool()], 'tool_use'), async () => ({ rows })), /could not complete/);
  await assert.rejects(ask('Show history', async () => reply(Array.from({ length: 9 }, (_, i) => tool({ selection: 'all' }, `read${i}`)), 'tool_use'), async () => ({ rows })), /could not complete/);
});

test('missing key and invalid questions make no provider or database calls', async () => {
  const noFetch = async () => assert.fail('Provider must not be called');
  for (const question of ['', ' ', null, 'a'.repeat(501)]) {
    await assert.rejects(askWeightHistory(question, noRead, 'test-key', noFetch), error => error.status === 400);
  }
  await assert.rejects(askWeightHistory('Show history', noRead, '', noFetch), error => error.status === 503);
});

test('provider errors distinguish credentials, billing, model access, rate limits and workspace failures', async () => {
  for (const [status, message, expected] of [
    [401, 'authentication failed', /rejected the API key/], [400, 'Your credit balance is too low', /credits are unavailable/],
    [404, 'model not found', /Sonnet 5.5 is not available/], [429, 'rate limit', /usage limit/],
    [403, 'forbidden', /permission/], [400, 'invalid parameter', /search configuration/],
    [404, 'Workspace not found', /Check ANTHROPIC_WORKSPACE_ID/],
  ]) await assert.rejects(ask('Show history', async () => new Response(JSON.stringify({ error: { message } }), { status })), expected);
  await assert.rejects(ask('Show history', async () => { throw new Error('private provider detail'); }), error => {
    assert.equal(error.status, 503);
    assert.doesNotMatch(error.message, /private provider detail/);
    return true;
  });
  await assert.rejects(ask('Show history', async () => new Response(JSON.stringify({ error: { message: 'Invalid test-key or sk-ant-private-example' } }), { status: 400 })), error => {
    assert.doesNotMatch(error.message, /test-key|sk-ant-private-example/);
    return true;
  });
});

test('HTTP route returns answer, comment and records and rejects malformed requests', async () => {
  let calls = 0;
  const routes = createSearchRoutes(question => ask(question, async () => ++calls === 1 ? reply([tool()], 'tool_use') : final(), async () => ({ rows })));
  const response = await routes.request('/', { method: 'POST', body: JSON.stringify({ question: 'Show weights this year' }) });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.entries.length, 2);
  assert.match(body.answer, /2026/);
  assert.match(body.comment, /1 kg/);
  assert.equal((await searchRoutes.request('/', { method: 'POST', body: '{' })).status, 400);
  assert.equal((await searchRoutes.request('/', { method: 'POST', body: JSON.stringify({ question: 123 }) })).status, 400);
  const originalKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const unavailable = await searchRoutes.request('/', { method: 'POST', body: JSON.stringify({ question: 'Show history' }) });
    assert.equal(unavailable.status, 503);
    assert.match((await unavailable.json()).error, /not configured/);
  } finally {
    if (originalKey !== undefined) process.env.ANTHROPIC_API_KEY = originalKey;
  }
});

test('HTTP route does not expose database errors', async () => {
  const routes = createSearchRoutes(question => ask(question, async () => reply([tool()], 'tool_use'), async () => { throw new Error('postgres://private-credentials'); }));
  const response = await routes.request('/', { method: 'POST', body: JSON.stringify({ question: 'Show weights' }) });
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private-credentials/);
});
