/**
 * Reports page logic: filtering, summary counts, and the export scope label.
 * Kept free of React and Firebase so it can be unit tested (test/reportsData.test.js).
 */
import {
  CASE_STATUS,
  getCaseStatusLabel,
  getCaseStatusTone,
  getEffectiveCaseStatus,
  isOpenCase,
  isResolvedThroughMediation,
} from './caseStatus.js';
import { SCHOOL_YEAR_START_MONTH } from './engine/ruleEngine.js';
import { parseRecordDate } from './dashboardStats.js';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const OFFENSE_LEVELS = Object.freeze([
  { value: 'light', label: 'Light', type: 'minor' },
  { value: 'less_serious', label: 'Less Serious', type: 'minor' },
  { value: 'serious', label: 'Serious', type: 'major' },
  { value: 'very_serious', label: 'Very Serious', type: 'major' },
]);

export const STATUS_FILTERS = Object.freeze([
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open (needs action)' },
  { value: CASE_STATUS.SERVED, label: getCaseStatusLabel(CASE_STATUS.SERVED) },
  { value: CASE_STATUS.RESOLVED_MEDIATION, label: getCaseStatusLabel(CASE_STATUS.RESOLVED_MEDIATION) },
  { value: CASE_STATUS.NO_READMISSION, label: getCaseStatusLabel(CASE_STATUS.NO_READMISSION) },
]);

export const DEFAULT_REPORT_FILTERS = Object.freeze({
  month: 'all',
  gradeLevel: 'all',
  offenseLevel: 'all',
  status: 'all',
  search: '',
});

/** The date a case happened: the incident date, or when it was recorded for older cases. Local time. */
export function getReportDate(record) {
  return parseRecordDate(record?.incident_date) || parseRecordDate(record?.created_at);
}

/** `YYYY-MM-DD` in local time (not UTC, which can show the previous day in the Philippines). */
export function formatIsoDate(date) {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Grade level recorded on the case (the student's grade at the time of the incident). */
export function getGradeLevel(record) {
  return String(record?.year_level || record?.student_year || record?.year || '').trim() || 'Unspecified';
}

export function getOffenseLevelLabel(subcategoryId) {
  return OFFENSE_LEVELS.find((level) => level.value === subcategoryId)?.label || '';
}

/** Months of a school year (June to May) up to the current month: [{ value: '2026-06', label: 'June 2026' }, …]. */
export function listSchoolYearMonths(schoolYearKey, now = new Date()) {
  const start = Number(String(schoolYearKey || '').split('-')[0]);
  if (!schoolYearKey || !Number.isFinite(start)) return [];
  const months = [];
  for (let offset = 0; offset < 12; offset += 1) {
    const date = new Date(start, SCHOOL_YEAR_START_MONTH - 1 + offset, 1);
    if (date > now) break;
    months.push({ value: monthKey(date), label: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}` });
  }
  return months;
}

/** Distinct grade levels in the data, in natural order (Grade 2 before Grade 10). */
export function listGradeLevels(records = []) {
  return [...new Set(records.map(getGradeLevel))]
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }));
}

function matchesSearch(record, term) {
  if (!term) return true;
  const haystack = [
    record.student_name,
    record.student_number,
    record.case_number,
    record.offense_variety,
    record.category_name,
    record.group_title,
  ].map((value) => String(value || '').toLowerCase()).join(' ');
  return term.toLowerCase().split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

function matchesStatus(record, status, now) {
  if (status === 'all') return true;
  if (status === 'open') return isOpenCase(record, now);
  return getEffectiveCaseStatus(record, now) === status;
}

/** Cases matching the filters, newest incident first. */
export function filterReportCases(records = [], filters = DEFAULT_REPORT_FILTERS, now = new Date()) {
  const search = String(filters.search || '').trim();
  return records
    .filter((record) => {
      if (filters.month && filters.month !== 'all') {
        const date = getReportDate(record);
        if (!date || monthKey(date) !== filters.month) return false;
      }
      if (filters.gradeLevel && filters.gradeLevel !== 'all' && getGradeLevel(record) !== filters.gradeLevel) return false;
      if (filters.offenseLevel && filters.offenseLevel !== 'all' && record.subcategory_id !== filters.offenseLevel) return false;
      if (!matchesStatus(record, filters.status || 'all', now)) return false;
      return matchesSearch(record, search);
    })
    .sort((left, right) => (getReportDate(right)?.getTime() || 0) - (getReportDate(left)?.getTime() || 0));
}

/**
 * Summary of the filtered cases. Every count uses the same set of cases as the
 * table, so the numbers on the page always agree with each other.
 */
export function summarizeReportCases(records = [], now = new Date()) {
  const studentCaseCounts = new Map();
  const violationCounts = new Map();
  let minor = 0;
  let major = 0;
  let open = 0;
  let resolvedThroughMediation = 0;

  records.forEach((record) => {
    const studentKey = String(record.student_id || record.student_number || record.student_name || record.id);
    studentCaseCounts.set(studentKey, (studentCaseCounts.get(studentKey) || 0) + 1);
    const violation = record.offense_variety || record.category_name || 'Unspecified';
    violationCounts.set(violation, (violationCounts.get(violation) || 0) + 1);
    if (record.offense_type === 'major') major += 1;
    else if (record.offense_type === 'minor') minor += 1;
    if (isOpenCase(record, now)) open += 1;
    if (isResolvedThroughMediation(record)) resolvedThroughMediation += 1;
  });

  const [mostCommonName, mostCommonCount] = [...violationCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0] || [null, 0];

  return {
    totalCases: records.length,
    minor,
    major,
    students: studentCaseCounts.size,
    repeatStudents: [...studentCaseCounts.values()].filter((count) => count > 1).length,
    open,
    resolvedThroughMediation,
    mostCommon: mostCommonName ? { name: mostCommonName, count: mostCommonCount } : null,
  };
}

/** Sanction shown in reports; none for a case resolved through mediation. */
export function getReportSanction(record) {
  if (isResolvedThroughMediation(record)) return '';
  return String(record?.recommended_sanction || '').trim();
}

export function getReportStatus(record, now = new Date()) {
  const status = getEffectiveCaseStatus(record, now);
  return { status, label: getCaseStatusLabel(status), tone: getCaseStatusTone(status) };
}

export function countActiveFilters(filters = DEFAULT_REPORT_FILTERS) {
  return ['month', 'gradeLevel', 'offenseLevel', 'status'].filter((key) => filters[key] && filters[key] !== 'all').length
    + (String(filters.search || '').trim() ? 1 : 0);
}

/** One line describing exactly what a report contains, e.g. for the exported document header. */
export function describeReportScope({ schoolYear, filters = DEFAULT_REPORT_FILTERS, months = [] }) {
  const parts = [schoolYear === 'all' ? 'All school years' : `SY ${schoolYear}`];
  if (filters.month && filters.month !== 'all') {
    parts.push(months.find((month) => month.value === filters.month)?.label || filters.month);
  }
  if (filters.gradeLevel && filters.gradeLevel !== 'all') parts.push(filters.gradeLevel);
  if (filters.offenseLevel && filters.offenseLevel !== 'all') parts.push(`${getOffenseLevelLabel(filters.offenseLevel)} offenses`);
  if (filters.status && filters.status !== 'all') {
    parts.push(STATUS_FILTERS.find((option) => option.value === filters.status)?.label || filters.status);
  }
  const search = String(filters.search || '').trim();
  if (search) parts.push(`matching "${search}"`);
  return parts.join(' · ');
}
