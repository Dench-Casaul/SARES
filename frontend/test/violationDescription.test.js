import test from 'node:test';
import assert from 'node:assert/strict';
import { getViolationDescription } from '../src/engine/violationDescription.js';

test('prefers the incident narrative when available', () => {
  assert.deepEqual(getViolationDescription({
    incident_description: '  What happened  ',
    ai_counselor_recommendation: 'Recommendation',
    ai_assisted_solution: 'Suggestion',
  }), {
    label: 'Incident Description',
    text: 'What happened',
    source: 'incident_description',
  });
});

test('uses counselor recommendation or AI-assisted solution when no narrative was entered', () => {
  assert.deepEqual(getViolationDescription({
    incident_description: ' ',
    ai_counselor_recommendation: '  Counselor recommendation  ',
    ai_assisted_solution: 'Prevention suggestion',
  }), {
    label: 'Counselor Recommendation',
    text: 'Counselor recommendation',
    source: 'ai_counselor_recommendation',
  });

  assert.deepEqual(getViolationDescription({
    ai_assisted_solution: '  Prevention suggestion  ',
  }), {
    label: 'AI-Assisted Solution',
    text: 'Prevention suggestion',
    source: 'ai_assisted_solution',
  });
});

test('returns an empty incident description when no text was provided', () => {
  assert.deepEqual(getViolationDescription({}), {
    label: 'Incident Description',
    text: '',
    source: null,
  });
});
