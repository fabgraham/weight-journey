import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { test } from 'node:test';

// Load pure TypeScript modules without requiring the Expo runtime.
const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const dateUrl = moduleUrl(transpile(readFileSync(new URL('../src/shared/date.ts', import.meta.url), 'utf8')));
const source = transpile(readFileSync(new URL('../src/features/weight/search.ts', import.meta.url), 'utf8'))
  .replace('"../../shared/date"', JSON.stringify(dateUrl));
const { searchWeights } = await import(moduleUrl(source));
const { interpretWeightQuestion } = await import(moduleUrl(transpile(
  readFileSync(new URL('../../api/src/weightSearch.ts', import.meta.url), 'utf8'),
)));
const entries = [
  { id: 'latest', date: '2026-10-10', weight_kg: 64 },
  { id: 'old', date: '2025-02-12', weight_kg: 80 },
  { id: 'boundary', date: '2026-10-01', weight_kg: 65 },
  { id: 'above', date: '2026-09-25', weight_kg: 65.5 },
  { id: 'tied', date: '2026-10-05', weight_kg: 64 },
].map((entry) => ({ ...entry, created_at: entry.date }));
const ids = (question) => searchWeights(entries, question).entries.map((entry) => entry.id);

test('more than finds the last strictly greater weight across all history', () => {
  const result = searchWeights(entries, 'When was the last time my weight was more than 65kg?');
  assert.deepEqual(result.entries.map((entry) => entry.id), ['above']);
  assert.match(result.answer, /65.5 kg on 25 September 2026/);
});
test('the requested wording includes weights exactly at the threshold', () => {
  for (const question of [
    'When was the last times I was 65kg or more?',
    'When was the last time I was 65 kg or more?',
    'When were the last times I was 65 kilograms or above?',
    'When was I last 65kg or higher?',
  ]) {
    const result = searchWeights(entries, question);
    assert.equal(result.supported, true, question);
    assert.deepEqual(result.entries.map((entry) => entry.id), ['boundary'], question);
    assert.match(result.answer, /65 kg on 1 October 2026/);
  }
  assert.deepEqual(ids('Show weights 65kg or less'), ['latest', 'tied', 'boundary']);
  assert.deepEqual(ids('Show weights 65,5kg or more'), ['above', 'old']);
});
test('first and last depend on dates, not input order', () => {
  assert.deepEqual(ids('When was the first time my weight was above 65 kg?'), ['old']);
  assert.deepEqual(ids('When was I last above 65kg?'), ['above']);
  assert.deepEqual(ids('When did I first weigh under 65kg?'), ['tied']);
});
test('strict and inclusive thresholds and decimal commas', () => {
  assert.deepEqual(ids('Show weights below 65kg'), ['latest', 'tied']);
  assert.deepEqual(ids('Show weights at least 65kg'), ['boundary', 'above', 'old']);
  assert.deepEqual(ids('Show weights at most 65kg'), ['latest', 'tied', 'boundary']);
  assert.deepEqual(ids('Exactly 65,5kg'), ['above']);
  assert.deepEqual(ids('>=65.5kg'), ['above', 'old']);
});
test('extremes include every tied entry', () => {
  assert.deepEqual(ids('What was my lowest weight?'), ['latest', 'tied']);
  assert.deepEqual(ids('What was my highest weight?'), ['old']);
});
test('empty history and no matches return explicit answers', () => {
  assert.match(searchWeights([], 'Last weight above 65kg').answer, /No weight entries/);
  assert.match(searchWeights(entries, 'Show weights above 100kg').answer, /No recorded weights/);
});
test('unsupported qualifiers, units, and negations are rejected', () => {
  for (const question of ['Show weights below 70kg last month', 'Was I not above 65kg?', 'Show weights below 150lb', 'Show weights 150lb or more', 'Show weights 65kg or more last month', 'Why did my weight go up?', 'Show weights between 60 and 70kg last month', 'Show weights between 64lb and 65kg', 'Show weights strictly between 64 and 65kg', 'Show weights not between 64 and 65kg']) {
    assert.equal(searchWeights(entries, question).supported, false, question);
  }
});
test('the requested range question finds the latest inclusive match', () => {
  const history = [...entries, { id: 'new-outside', date: '2026-10-12', weight_kg: 66 }];
  for (const question of ['find when I last weighed between 64 and 65kg', 'When did I last weigh between 64kg and 65kg?', 'Last weight between 64 and 65kg']) {
    const result = searchWeights(history, question);
    assert.equal(result.supported, true, question);
    assert.deepEqual(result.entries.map((entry) => entry.id), ['latest'], question);
    assert.match(result.answer, /between 64 and 65 kg \(inclusive\).*64 kg on 10 October 2026/);
  }
  assert.deepEqual(ids('Show weights between 64 and 65kg'), ['latest', 'tied', 'boundary']);
  assert.deepEqual(ids('First weight between 64 and 65kg'), ['boundary']);
  assert.deepEqual(ids('Show weights between 65 and 65,5kg'), ['boundary', 'above']);
  assert.deepEqual(ids('Last weight between 65 and 65kg'), ['boundary']);
});
test('range search handles empty results and rejects reversed bounds', () => {
  assert.match(searchWeights([], 'Last weight between 64 and 65kg').answer, /No weight entries/);
  assert.match(searchWeights(entries, 'Last weight between 60 and 61kg').answer, /No recorded weights/);
  assert.equal(searchWeights(entries, 'Last weight between 65 and 64kg').supported, false);
});
test('Claude range interpretations execute locally without losing either bound', async () => {
  const interpretation = await interpretWeightQuestion('Find my latest weigh-in in the 64 to 65 kilo range', 'test-key', async () =>
    new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({
      kind: 'range', minimum: 64, maximum: 65, order: 'last',
    }) }] })),
  );
  assert.equal(interpretation.question, 'last weight between 64 and 65kg');
  const result = searchWeights(entries, interpretation.question);
  assert.equal(result.supported, true);
  assert.deepEqual(result.entries.map((entry) => entry.id), ['latest']);
});
test('search does not mutate the history', () => {
  const before = JSON.stringify(entries);
  searchWeights(entries, 'Show weights above 60kg');
  assert.equal(JSON.stringify(entries), before);
});
test('Claude interpretation executes against local history with inclusive matching', async () => {
  const interpretation = await interpretWeightQuestion('Find my most recent weigh-in of at least 65 kilos', 'test-key', async () =>
    new Response(JSON.stringify({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify({ kind: 'comparison', operator: '>=', value: 65, order: 'last' }) }],
    })),
  );
  const result = searchWeights(entries, interpretation.question);
  assert.equal(result.supported, true);
  assert.deepEqual(result.entries.map((entry) => entry.id), ['boundary']);
  assert.match(result.answer, /65 kg on 1 October 2026/);
});
