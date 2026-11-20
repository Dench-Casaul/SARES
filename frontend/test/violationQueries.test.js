import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isMissingIndexError, listRecentSchoolYears } from '../src/queryHelpers.js';

const LOG_RETENTION_DAYS = Number(
  /export const LOG_RETENTION_DAYS = (\d+)/.exec(readFileSync(new URL('../src/activityLog.js', import.meta.url), 'utf8'))?.[1]
);

test('listRecentSchoolYears counts back from the current school year', () => {
  assert.deepEqual(listRecentSchoolYears('2026-2027', 3), ['2026-2027', '2025-2026', '2024-2025']);
  assert.deepEqual(listRecentSchoolYears('', 3), []);
});

test('only a missing-index error triggers the full-read fallback', () => {
  assert.equal(isMissingIndexError({ code: 'failed-precondition' }), true);
  assert.equal(isMissingIndexError({ code: 'permission-denied' }), false);
  assert.equal(isMissingIndexError(null), false);
});

test('the app and the Firestore rules use the same log retention period', () => {
  assert.ok(LOG_RETENTION_DAYS > 0);
  const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
  assert.match(rules, new RegExp(`duration\\.value\\(${LOG_RETENTION_DAYS}, 'd'\\)`));
});
