import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchActivePlaybook, PlaybookStoreError } from './playbook-store.js';

function mockSupabase(result) {
  const calls = [];
  const query = {
    select(value) { calls.push(['select', value]); return this; },
    eq(column, value) { calls.push(['eq', column, value]); return this; },
    order(column, options) { calls.push(['order', column, options]); return this; },
    limit(value) { calls.push(['limit', value]); return this; },
    maybeSingle() { calls.push(['maybeSingle']); return Promise.resolve(result); },
  };
  return { client: { from(table) { calls.push(['from', table]); return query; } }, calls };
}

const businessId = '11111111-1111-4111-8111-111111111111';
const playbookId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

test('requires a configured Supabase client', async () => {
  await assert.rejects(() => fetchActivePlaybook({ supabase: null, businessId }), (error) => error instanceof PlaybookStoreError && error.status === 503);
});

test('requires business identity', async () => {
  await assert.rejects(() => fetchActivePlaybook({ supabase: {}, businessId: '' }), (error) => error instanceof PlaybookStoreError && error.status === 400);
});

test('loads the latest active playbook within the tenant', async () => {
  const { client, calls } = mockSupabase({ data: { id: playbookId, business_id: businessId, keyword_replies: null, fallback_reply: null }, error: null });
  const playbook = await fetchActivePlaybook({ supabase: client, businessId });
  assert.deepEqual(playbook.keyword_replies, []);
  assert.equal(playbook.fallback_reply, '');
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'business_id' && call[2] === businessId));
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'is_active' && call[2] === true));
});

test('constrains an explicit playbook id as well as business id', async () => {
  const { client, calls } = mockSupabase({ data: { id: playbookId, business_id: businessId, keyword_replies: [], fallback_reply: 'Fallback' }, error: null });
  await fetchActivePlaybook({ supabase: client, businessId, playbookId });
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'id' && call[2] === playbookId));
});

test('never falls back when no tenant playbook exists', async () => {
  const { client } = mockSupabase({ data: null, error: null });
  await assert.rejects(() => fetchActivePlaybook({ supabase: client, businessId }), (error) => error instanceof PlaybookStoreError && error.status === 404);
});

test('surfaces database failures without cross-tenant fallback', async () => {
  const { client } = mockSupabase({ data: null, error: { message: 'database unavailable' } });
  await assert.rejects(() => fetchActivePlaybook({ supabase: client, businessId }), (error) => error instanceof PlaybookStoreError && error.status === 502);
});

test('rejects a mismatched tenant even if the database returns a row', async () => {
  const { client } = mockSupabase({ data: { id: playbookId, business_id: '22222222-2222-4222-8222-222222222222', keyword_replies: [], fallback_reply: 'Wrong tenant' }, error: null });
  await assert.rejects(() => fetchActivePlaybook({ supabase: client, businessId, playbookId }), (error) => error instanceof PlaybookStoreError && error.status === 403);
});
