import assert from 'node:assert/strict';
import test from 'node:test';
import { findKeywordReply, normalizeMessage, prepareKeywordRules } from './keyword-engine.js';
import { checkMandatoryHandoff } from './assistant-contract.js';

const rules = [
  { id: 'fees', label: 'Fees', keywords: ['fees', 'price'], match_type: 'word', reply: 'Fees are Rs 1,500.', priority: 10, enabled: true },
  { id: 'hello', label: 'Hello', keywords: ['hi'], match_type: 'exact', reply: 'Hello!', priority: 20, enabled: true },
  { id: 'visit', label: 'Visit', keywords: ['site visit'], match_type: 'contains', reply: 'Choose a slot.', priority: 5, enabled: true, handoff: true },
];

test('normalizes Unicode, punctuation, case, and whitespace', () => {
  assert.equal(normalizeMessage('  FEES!!!  Kitni? '), 'fees kitni');
});

test('matches an exact rule only against the full message', () => {
  assert.equal(findKeywordReply('HI', rules)?.rule.id, 'hello');
  assert.equal(findKeywordReply('hi there', rules)?.rule.id, undefined);
});

test('matches word rules on word boundaries', () => {
  assert.equal(findKeywordReply('What are your fees?', rules)?.rule.id, 'fees');
  assert.equal(findKeywordReply('price batao', rules)?.rule.id, 'fees');
  assert.equal(findKeywordReply('priceless', rules), null);
});

test('matches contains rules across phrases', () => {
  assert.equal(findKeywordReply('Can I arrange a SITE VISIT tomorrow?', rules)?.rule.id, 'visit');
});

test('returns the exact configured reply without mutation', () => {
  assert.equal(findKeywordReply('fees', rules)?.rule.reply, 'Fees are Rs 1,500.');
});

test('returns the matched normalized keyword for audit', () => {
  assert.equal(findKeywordReply('PRICE?', rules)?.keyword, 'price');
});

test('returns null for blank or unmatched messages', () => {
  assert.equal(findKeywordReply('', rules), null);
  assert.equal(findKeywordReply('opening hours', rules), null);
});

test('ignores disabled rules', () => {
  assert.equal(findKeywordReply('offer', [{ keywords: ['offer'], reply: 'No', enabled: false }]), null);
});

test('ignores malformed rules', () => {
  assert.equal(findKeywordReply('fees', [{ keywords: [], reply: 'No' }, null]), null);
});

test('higher priority wins before match type', () => {
  const match = findKeywordReply('fees', [
    { id: 'exact-low', keywords: ['fees'], match_type: 'exact', reply: 'A', priority: 1 },
    { id: 'contains-high', keywords: ['fee'], match_type: 'contains', reply: 'B', priority: 2 },
  ]);
  assert.equal(match?.rule.id, 'contains-high');
});

test('exact wins at the same priority', () => {
  const match = findKeywordReply('fees', [
    { id: 'contains', keywords: ['fee'], match_type: 'contains', reply: 'A', priority: 1 },
    { id: 'exact', keywords: ['fees'], match_type: 'exact', reply: 'B', priority: 1 },
  ]);
  assert.equal(match?.rule.id, 'exact');
});

test('longer keyword wins at equal priority and match type', () => {
  const match = findKeywordReply('site visit', [
    { id: 'site', keywords: ['site'], match_type: 'contains', reply: 'A', priority: 1 },
    { id: 'site-visit', keywords: ['site visit'], match_type: 'contains', reply: 'B', priority: 1 },
  ]);
  assert.equal(match?.rule.id, 'site-visit');
});

test('stable input order resolves complete ties', () => {
  const match = findKeywordReply('hello', [
    { id: 'first', keywords: ['hello'], match_type: 'word', reply: 'A', priority: 1 },
    { id: 'second', keywords: ['hello'], match_type: 'word', reply: 'B', priority: 1 },
  ]);
  assert.equal(match?.rule.id, 'first');
});

test('deduplicates normalized keywords', () => {
  const [rule] = prepareKeywordRules([{ keywords: [' Fees ', 'fees'], reply: 'A' }]);
  assert.deepEqual(rule.keywords, ['fees']);
});

test('preserves handoff configuration', () => {
  assert.equal(findKeywordReply('site visit', rules)?.rule.handoff, true);
});

test('matches Hindi Unicode keywords deterministically', () => {
  const match = findKeywordReply('फीस कितनी है?', [{ id: 'fees-hi', keywords: ['फीस'], match_type: 'word', reply: 'फीस Rs 1,500 है।' }]);
  assert.equal(match?.rule.id, 'fees-hi');
});

test('treats regex-like keyword text as ordinary text', () => {
  const match = findKeywordReply('price .* please', [{ id: 'literal', keywords: ['.*'], match_type: 'contains', reply: 'Literal match' }]);
  assert.equal(match, null);
});

test('clinic emergency safety is detected before business matching', () => {
  assert.equal(checkMandatoryHandoff('Patient has chest pain', 'clinic'), 'chest pain');
});
