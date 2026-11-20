import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_REPORT_FILTERS,
  countActiveFilters,
  describeReportScope,
  filterReportCases,
  formatIsoDate,
  getReportDate,
  getReportSanction,
  listGradeLevels,
  listSchoolYearMonths,
  summarizeReportCases,
} from '../src/reportsData.js';

const now = new Date(2026, 10, 20); // November 20, 2026

const cases = [
  {
    id: 'a', student_id: 's1', student_name: 'Juan Dela Cruz', student_number: '1001', year_level: 'Grade 10',
    incident_date: '2026-11-05', offense_type: 'minor', subcategory_id: 'light', offense_variety: 'Improper uniform',
    status: 'served', case_status: 'served', recommended_sanction: 'Verbal warning',
  },
  {
    id: 'b', student_id: 's1', student_name: 'Juan Dela Cruz', student_number: '1001', year_level: 'Grade 10',
    incident_date: '2026-10-12', offense_type: 'minor', subcategory_id: 'light', offense_variety: 'Improper uniform',
    status: 'recorded', case_status: 'pending_sanction', recommended_sanction: 'Reminder to parents',
  },
  {
    id: 'c', student_id: 's2', student_name: 'Maria Santos', student_number: '1002', year_level: 'Grade 2',
    incident_date: '2026-11-18', offense_type: 'major', subcategory_id: 'serious', offense_variety: 'Bullying',
    intervention_type: 'mediation', status: 'resolved', mediation_status: 'resolved', case_status: 'resolved_mediation',
    recommended_sanction: 'Suspension (1-2 days)',
  },
];

test('summary counts use the same cases as the table, including mediation-resolved ones', () => {
  const summary = summarizeReportCases(cases, now);
  assert.equal(summary.totalCases, 3);
  assert.equal(summary.minor, 2);
  assert.equal(summary.major, 1);
  assert.equal(summary.students, 2);
  assert.equal(summary.repeatStudents, 1);
  assert.equal(summary.open, 1);
  assert.equal(summary.resolvedThroughMediation, 1);
  assert.deepEqual(summary.mostCommon, { name: 'Improper uniform', count: 2 });
  assert.equal(summarizeReportCases([], now).mostCommon, null);
});

test('filters combine month, grade level, offense level, status and search', () => {
  const ids = (filters) => filterReportCases(cases, { ...DEFAULT_REPORT_FILTERS, ...filters }, now).map((record) => record.id);

  assert.deepEqual(ids({}), ['c', 'a', 'b']); // newest incident first
  assert.deepEqual(ids({ month: '2026-11' }), ['c', 'a']);
  assert.deepEqual(ids({ gradeLevel: 'Grade 10' }), ['a', 'b']);
  assert.deepEqual(ids({ offenseLevel: 'serious' }), ['c']);
  assert.deepEqual(ids({ status: 'open' }), ['b']);
  assert.deepEqual(ids({ status: 'resolved_mediation' }), ['c']);
  assert.deepEqual(ids({ search: 'juan uniform' }), ['a', 'b']);
  assert.deepEqual(ids({ search: '1002' }), ['c']);
  assert.deepEqual(ids({ month: '2026-11', gradeLevel: 'Grade 10' }), ['a']);
});

test('a case resolved through mediation shows no sanction', () => {
  assert.equal(getReportSanction(cases[2]), '');
  assert.equal(getReportSanction(cases[0]), 'Verbal warning');
});

test('school year months run June to May and stop at the current month', () => {
  const months = listSchoolYearMonths('2026-2027', now);
  assert.equal(months[0].value, '2026-06');
  assert.equal(months[0].label, 'June 2026');
  assert.equal(months.at(-1).value, '2026-11');
  assert.equal(listSchoolYearMonths('2025-2026', now).length, 12);
  assert.deepEqual(listSchoolYearMonths('', now), []);
});

test('grade levels sort naturally', () => {
  assert.deepEqual(listGradeLevels(cases), ['Grade 2', 'Grade 10']);
});

test('report dates are local, so early-morning records keep their day', () => {
  const recordedEarly = { created_at: { seconds: new Date(2026, 10, 20, 6, 30).getTime() / 1000 } };
  assert.equal(formatIsoDate(getReportDate(recordedEarly)), '2026-11-20');
  assert.equal(formatIsoDate(getReportDate({ incident_date: '2026-11-05' })), '2026-11-05');
});

test('the report scope line describes every active filter', () => {
  const months = listSchoolYearMonths('2026-2027', now);
  assert.equal(describeReportScope({ schoolYear: '2026-2027', filters: DEFAULT_REPORT_FILTERS, months }), 'SY 2026-2027');
  assert.equal(
    describeReportScope({
      schoolYear: '2026-2027',
      filters: { month: '2026-11', gradeLevel: 'Grade 10', offenseLevel: 'serious', status: 'open', search: 'Juan' },
      months,
    }),
    'SY 2026-2027 · November 2026 · Grade 10 · Serious offenses · Open (needs action) · matching "Juan"'
  );
  assert.equal(countActiveFilters({ ...DEFAULT_REPORT_FILTERS, status: 'open', search: ' x ' }), 2);
});
