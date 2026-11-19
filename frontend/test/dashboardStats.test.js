import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countNewThisMonth,
  filterByScopeView,
  formatDisplayDate,
  getCategoryStats,
  getGreetingName,
  getMonthlyTrends,
  getRecentViolations,
  getStudentsWithPendingCases,
  getTopViolations,
  toPercentDistribution,
} from '../src/dashboardStats.js';

test('monthly trends never skip or repeat a month at the end of a month', () => {
  for (const day of [28, 29, 30, 31]) {
    const trends = getMonthlyTrends([], new Date(2026, 11, day));
    assert.deepEqual(trends.map((t) => t.label), [
      'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026',
    ]);
  }
  // March 31 → previous months include February without overflowing into March.
  const march = getMonthlyTrends([], new Date(2026, 2, 31));
  assert.deepEqual(march.map((t) => t.month), ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']);
});

test('monthly trends count incidents by local calendar month', () => {
  const trends = getMonthlyTrends([
    { incident_date: '2026-11-01' },
    { incident_date: '2026-11-30' },
    { incident_date: '2026-10-31' },
    { incident_date: '2025-11-15' }, // outside the window
    { incident_date: '' },
  ], new Date(2026, 10, 19));
  assert.equal(trends.at(-1).label, 'Nov 2026');
  assert.equal(trends.at(-1).count, 2);
  assert.equal(trends.at(-2).count, 1);
  assert.equal(trends.reduce((sum, t) => sum + t.count, 0), 3);
});

test('new-this-month compares with last month, including across a year boundary', () => {
  const counts = countNewThisMonth([
    { incident_date: '2026-01-05' },
    { incident_date: '2025-12-20' },
    { incident_date: '2025-12-01' },
    { incident_date: '2025-11-30' },
  ], new Date(2026, 0, 10));
  assert.deepEqual(counts, { thisMonth: 1, lastMonth: 2 });
});

test('percent distribution always sums to 100 and leaves zero entries at 0', () => {
  const result = toPercentDistribution([{ count: 1 }, { count: 1 }, { count: 1 }, { count: 0 }], 3);
  assert.equal(result.reduce((sum, r) => sum + r.percent, 0), 100);
  assert.equal(result[3].percent, 0);
});

test('category stats keep severity order and count each category', () => {
  const { total, categories } = getCategoryStats([
    { subcategory_id: 'serious' },
    { subcategory_id: 'light' },
    { subcategory_id: 'light' },
    { subcategory_id: 'unknown' },
  ]);
  assert.equal(total, 3);
  assert.deepEqual(categories.map((c) => [c.key, c.count]), [
    ['light', 2], ['less_serious', 0], ['serious', 1], ['very_serious', 0],
  ]);
  assert.equal(categories.reduce((sum, c) => sum + c.percent, 0), 100);
});

test('top violations report their share of ALL violations', () => {
  const violations = [
    ...Array(2).fill({ offense_variety: 'Tardiness' }),
    { offense_variety: 'Cheating' },
    ...Array(7).fill({ category_name: 'Other' }),
  ];
  const top = getTopViolations(violations, 2);
  assert.deepEqual(top, [
    { name: 'Other', count: 7, percent: 70 },
    { name: 'Tardiness', count: 2, percent: 20 },
  ]);
});

test('recent violations sort by record time, newest first', () => {
  const recent = getRecentViolations([
    { id: 'a', created_at: { seconds: 1_790_000_100 } },
    { id: 'b', created_at: { seconds: 1_790_000_300 } },
    { id: 'c', incident_date: '2020-01-01' }, // no created_at: falls back to the incident date
    { id: 'd', created_at: { seconds: 1_790_000_200 } },
  ], 3);
  assert.deepEqual(recent.map((v) => v.id), ['b', 'd', 'a']);
});

test('pending students group every pending case and exclude served ones', () => {
  const students = getStudentsWithPendingCases([
    { student_id: 's1', student_name: 'Ana', status: 'recorded', incident_date: '2026-11-10' },
    { student_id: 's1', student_name: 'Ana', status: 'recorded', incident_date: '2026-10-02' },
    { student_id: 's2', student_name: 'Ben', status: 'recorded', incident_date: '2026-09-01' },
    { student_id: 's3', student_name: 'Cy', status: 'served', incident_date: '2026-09-01' },
  ]);
  assert.deepEqual(students.map((s) => [s.student_id, s.pendingCount, s.oldestIncidentDate]), [
    ['s1', 2, '2026-10-02'],
    ['s2', 1, '2026-09-01'],
  ]);
});

test('school filter includes shared records and "all" returns everything', () => {
  const records = [{ school_scope: 'elementary' }, { school_scope: 'high_school' }, { school_scope: 'shared' }];
  assert.equal(filterByScopeView(records, 'all').length, 3);
  assert.deepEqual(filterByScopeView(records, 'elementary').map((r) => r.school_scope), ['elementary', 'shared']);
});

test('display dates are readable and do not shift a day', () => {
  assert.equal(formatDisplayDate('2026-11-19'), 'Nov 19, 2026');
  assert.equal(formatDisplayDate('not a date'), 'not a date');
  assert.equal(formatDisplayDate(null), '');
});

test('greeting uses the first name, never an email address', () => {
  assert.equal(getGreetingName('Maria Cruz'), 'Maria');
  assert.equal(getGreetingName('maria@ows.edu.ph'), null);
  assert.equal(getGreetingName(''), null);
});
