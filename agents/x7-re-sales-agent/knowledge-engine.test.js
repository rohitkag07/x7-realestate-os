import assert from 'node:assert/strict';
import test from 'node:test';
import { findKnowledgeReply, prepareKnowledgeItems } from './knowledge-engine.js';

const items = [
  { id: 'fees-id', type: 'pricing', title: 'Consultation fees', question: 'What is the consultation fee?', content: 'Our consultation fee is Rs 500.', keywords: ['fees', 'charge', 'kitna lagega'], status: 'published', is_active: true },
  { id: 'location-id', type: 'location', title: 'Clinic location', content: 'We are at Vijay Nagar, Indore.', keywords: ['location', 'address', 'kaha hai'], status: 'published', is_active: true },
  { id: 'draft-id', type: 'offer', title: 'Draft offer', content: 'Hidden', keywords: ['offer'], status: 'draft', is_active: true },
];

test('matches exact owner-approved knowledge with Hinglish and typo tolerance', () => {
  assert.equal(findKnowledgeReply('fees kya hai?', items)?.item.id, 'fees-id');
  assert.equal(findKnowledgeReply('kitna lgega?', items)?.item.id, 'fees-id');
  assert.equal(findKnowledgeReply('clinic kaha hai', items)?.item.id, 'location-id');
});

test('never exposes draft, inactive, empty, or unrelated knowledge', () => {
  assert.equal(findKnowledgeReply('offer batao', items), null);
  assert.equal(findKnowledgeReply('mera parcel kab aayega', items), null);
  assert.deepEqual(prepareKnowledgeItems([{ ...items[0], is_active: false }]), []);
});
