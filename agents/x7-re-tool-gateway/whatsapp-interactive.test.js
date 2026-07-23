import assert from 'node:assert/strict';
import test from 'node:test';
import { buildButtonMessage, buildListMessage, buildTemplateMessage } from './whatsapp-interactive.js';

test('builds a three-button quick reply payload', () => {
  const payload = buildButtonMessage({
    to: '+91 7869161842',
    body: 'What would you like to do?',
    buttons: [
      { title: 'Book Visit', payload: 'rule:book-visit' },
      { title: 'See Price', payload: 'rule:price' },
      { title: 'Talk to Owner', payload: 'handoff:owner' },
    ],
  });
  assert.equal(payload.type, 'interactive');
  assert.equal(payload.interactive.action.buttons.length, 3);
  assert.equal(payload.interactive.action.buttons[0].reply.id, 'rule:book-visit');
});

test('rejects more than three quick reply buttons', () => {
  assert.throws(() => buildButtonMessage({
    to: '917869161842',
    body: 'Choose',
    buttons: [1, 2, 3, 4].map((number) => ({ title: `Option ${number}`, payload: `option-${number}` })),
  }), /1 to 3/);
});

test('builds a list with no more than ten rows', () => {
  const payload = buildListMessage({
    to: '917869161842',
    body: 'Choose a service',
    buttonText: 'View services',
    sections: [{ title: 'Services', rows: [{ title: 'Consultation', payload: 'service:consultation' }] }],
  });
  assert.equal(payload.interactive.type, 'list');
  assert.equal(payload.interactive.action.sections[0].rows[0].id, 'service:consultation');
});

test('builds a template with ordered body parameters', () => {
  const payload = buildTemplateMessage({
    to: '917869161842',
    name: 'appointment_reminder',
    language: 'en_US',
    bodyParameters: ['Rohit', 'WhatsAI'],
  });
  assert.deepEqual(payload.template.components[0].parameters.map((item) => item.text), ['Rohit', 'WhatsAI']);
});
