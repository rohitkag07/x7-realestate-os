import assert from 'node:assert/strict';
import test from 'node:test';
import { findKeywordReply, normalizeMessage, prepareKeywordRules } from './keyword-engine.js';
import { checkMandatoryHandoff } from './assistant-contract.js';

const rules = [
  { id: 'fees', label: 'Fees', keywords: ['fees', 'price'], match_type: 'word', reply: 'Fees are Rs 1,500.', priority: 10, enabled: true, intent: 'price' },
  { id: 'hello', label: 'Hello', keywords: ['hi'], match_type: 'exact', reply: 'Hello!', priority: 20, enabled: true },
  { id: 'visit', label: 'Visit', keywords: ['site visit'], match_type: 'contains', reply: 'Choose a slot.', priority: 5, enabled: true, handoff: true, intent: 'booking' },
  { id: 'location', label: 'Location', keywords: ['location'], match_type: 'word', reply: 'We are on Super Corridor.', priority: 100, enabled: true, intent: 'location' },
];

test('normalizes Unicode, punctuation, case, whitespace, and repeated typo characters', () => {
  assert.equal(normalizeMessage('  FEEES!!!  Kitni? '), 'fees kitni');
});

test('preserves direct exact, word, and contains matching semantics', () => {
  assert.equal(findKeywordReply('HI', rules)?.rule.id, 'hello');
  assert.equal(findKeywordReply('hi there', rules)?.rule.id, undefined);
  assert.equal(findKeywordReply('What are your fees?', rules)?.rule.id, 'fees');
  assert.equal(findKeywordReply('Can I arrange a SITE VISIT tomorrow?', rules)?.rule.id, 'visit');
  assert.equal(findKeywordReply('priceless', rules), null);
});

test('keeps priority, specificity, longest keyword, and stable tie ordering', () => {
  assert.equal(findKeywordReply('fees', [{ id: 'exact-low', keywords: ['fees'], match_type: 'exact', reply: 'A', priority: 1 }, { id: 'contains-high', keywords: ['fee'], match_type: 'contains', reply: 'B', priority: 2 }])?.rule.id, 'contains-high');
  assert.equal(findKeywordReply('fees', [{ id: 'contains', keywords: ['fee'], match_type: 'contains', reply: 'A', priority: 1 }, { id: 'exact', keywords: ['fees'], match_type: 'exact', reply: 'B', priority: 1 }])?.rule.id, 'exact');
  assert.equal(findKeywordReply('site visit', [{ id: 'site', keywords: ['site'], match_type: 'contains', reply: 'A', priority: 1 }, { id: 'site-visit', keywords: ['site visit'], match_type: 'contains', reply: 'B', priority: 1 }])?.rule.id, 'site-visit');
  assert.equal(findKeywordReply('hello', [{ id: 'first', keywords: ['hello'], match_type: 'word', reply: 'A', priority: 1 }, { id: 'second', keywords: ['hello'], match_type: 'word', reply: 'B', priority: 1 }])?.rule.id, 'first');
});

test('still handles malformed, disabled, unicode, and literal inputs safely', () => {
  assert.equal(findKeywordReply('', rules), null);
  assert.equal(findKeywordReply('offer', [{ keywords: ['offer'], reply: 'No', enabled: false }]), null);
  assert.equal(findKeywordReply('fees', [{ keywords: [], reply: 'No' }, null]), null);
  assert.equal(findKeywordReply('फीस कितनी है?', [{ id: 'fees-hi', keywords: ['फीस'], match_type: 'word', reply: 'फीस Rs 1,500 है।' }])?.rule.id, 'fees-hi');
  assert.equal(findKeywordReply('price .* please', [{ id: 'literal', keywords: ['.*'], match_type: 'contains', reply: 'Literal match' }]), null);
  assert.deepEqual(prepareKeywordRules([{ keywords: [' Fees ', 'fees'], reply: 'A' }])[0].keywords, ['fees']);
});

test('matches Tier-2 Hinglish and typo variants conservatively', () => {
  assert.equal(findKeywordReply('kitna lgega?', rules)?.rule.id, 'fees');
  assert.equal(findKeywordReply('fess kya hai', rules)?.rule.id, 'fees');
  assert.equal(findKeywordReply('loc bhejo', rules)?.rule.id, 'location');
});

test('does not match unrelated text', () => {
  assert.equal(findKeywordReply('mera parcel kab aayega', rules), null);
  assert.equal(findKeywordReply('hello bhai', rules), null);
});

test('clinic emergency safety remains ahead of playbook matching', () => {
  assert.equal(checkMandatoryHandoff('Patient has chest pain', 'clinic'), 'chest pain');
});
