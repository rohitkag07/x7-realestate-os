import assert from 'node:assert/strict';
import test from 'node:test';
import { renderTemplateParameters } from './campaign-runner.js';

test('renders template parameters in numeric placeholder order', () => {
  const values = renderTemplateParameters(
    { 2: 'business_name', 1: 'contact_name', 3: 'literal:Tomorrow 4 PM' },
    { contact_name: 'Rohit', business_name: 'WhatsAI' },
  );
  assert.deepEqual(values, ['Rohit', 'WhatsAI', 'Tomorrow 4 PM']);
});

test('uses an empty string when a mapped contact value is absent', () => {
  assert.deepEqual(renderTemplateParameters({ 1: 'contact_name' }, {}), ['']);
});
