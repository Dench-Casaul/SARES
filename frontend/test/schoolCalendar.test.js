import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSchoolYearKey,
  getSchoolYearRange,
  setSchoolYearStarts,
  validateSchoolYearStarts,
} from '../src/schoolCalendar.js';
import { evaluateOffense } from '../src/engine/ruleEngine.js';
import { listSchoolYearMonths } from '../src/reportsData.js';

afterEach(() => setSchoolYearStarts({}));

test('without a configured opening day, school years start on June 1', () => {
  assert.equal(getSchoolYearKey('2026-05-31'), '2025-2026');
  assert.equal(getSchoolYearKey('2026-06-01'), '2026-2027');
  assert.equal(getSchoolYearKey(''), '');
  assert.equal(getSchoolYearKey('not-a-date'), '');
});

test('a configured opening day moves the boundary for that year only', () => {
  setSchoolYearStarts({ 2026: '2026-06-16', 2024: '2024-07-29' });

  assert.equal(getSchoolYearKey('2026-06-10'), '2025-2026'); // before classes opened
  assert.equal(getSchoolYearKey('2026-06-16'), '2026-2027');
  assert.equal(getSchoolYearKey('2024-07-15'), '2023-2024');
  assert.equal(getSchoolYearKey('2024-07-29'), '2024-2025');
  assert.equal(getSchoolYearKey('2027-06-01'), '2027-2028'); // 2027 not configured: June 1
});

test('a school year runs until the day before the next one opens', () => {
  setSchoolYearStarts({ 2026: '2026-06-16', 2027: '2027-06-14' });
  assert.deepEqual(getSchoolYearRange('2026-2027'), { start: '2026-06-16', end: '2027-06-13' });
  assert.deepEqual(getSchoolYearRange('2025-2026'), { start: '2025-06-01', end: '2026-06-15' });
});

test('invalid opening days are rejected and ignored', () => {
  const { valid, errors } = validateSchoolYearStarts({
    2026: '2026-06-16',
    2027: '2026-08-01', // wrong year
    2028: '2028-02-30', // not a real date
    abcd: '2029-06-01',
  });
  assert.deepEqual(valid, { 2026: '2026-06-16' });
  assert.equal(errors.length, 3);

  setSchoolYearStarts({ 2027: '2026-08-01' });
  assert.equal(getSchoolYearKey('2027-06-01'), '2027-2028');
});

test('offense counting restarts on the configured opening day', () => {
  setSchoolYearStarts({ 2026: '2026-06-16' });
  const lastYearCase = {
    id: 'prior', student_id: 's1', school_year_key: '2025-2026', subcategory_id: 'light',
    incident_date: '2026-06-05', status: 'served',
  };
  const base = { offenseType: 'minor', studentId: 's1', offenseId: 'x', subcategoryId: 'light', schoolScope: 'high_school', existingViolations: [lastYearCase] };

  assert.equal(evaluateOffense({ ...base, incidentDate: '2026-06-12' }).offenseNumber, 2); // still SY 2025-2026
  assert.equal(evaluateOffense({ ...base, incidentDate: '2026-06-16' }).offenseNumber, 1); // new school year
});

test('report months follow the configured school year', () => {
  setSchoolYearStarts({ 2026: '2026-08-03', 2027: '2027-06-14' });
  const months = listSchoolYearMonths('2026-2027', new Date(2027, 11, 31));
  assert.equal(months[0].value, '2026-08');
  assert.equal(months.at(-1).value, '2027-06'); // the year ends June 13, 2027
});
