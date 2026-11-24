import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAiText, isAiTextSource } from '../src/engine/aiText.js';

test('strips bold markers and turns Markdown bullets into plain bullets', () => {
  const input = [
    '**Recommendation Draft for Counselor Review**',
    '',
    '* **Status:** Advisory recommendation for qualified staff review.',
    '* **Rule-Engine Sanction (Authoritative):** Verbal warning by subject teacher/adviser.',
  ].join('\n');

  assert.equal(formatAiText(input), [
    'Recommendation Draft for Counselor Review',
    '',
    '• Status: Advisory recommendation for qualified staff review.',
    '• Rule-Engine Sanction (Authoritative): Verbal warning by subject teacher/adviser.',
  ].join('\n'));
});

test('keeps numbered steps and removes headings, italics, and code marks', () => {
  const input = '## Next Steps\n1. Hold a *brief* check-in.\n2. Use `restorative` language.';
  assert.equal(formatAiText(input), 'Next Steps\n1. Hold a brief check-in.\n2. Use restorative language.');
});

test('uses a custom bullet and keeps nesting', () => {
  assert.equal(formatAiText('- One\n  - Two', { bullet: '-' }), '- One\n  - Two');
});

test('leaves plain text, words with underscores, and multiplication alone', () => {
  const plain = 'Applicable Policy Reference:\nHandbook Number 2: ID and Identification Violations';
  assert.equal(formatAiText(plain), plain);
  assert.equal(formatAiText('Check school_id records.'), 'Check school_id records.');
});

test('collapses extra blank lines and handles non-strings', () => {
  assert.equal(formatAiText('A\n\n\n\nB\n---\nC'), 'A\n\nB\n\nC');
  assert.equal(formatAiText(null), '');
});

test('recognizes AI description sources', () => {
  assert.equal(isAiTextSource('ai_counselor_recommendation'), true);
  assert.equal(isAiTextSource('ai_assisted_solution'), true);
  assert.equal(isAiTextSource('incident_description'), false);
});
