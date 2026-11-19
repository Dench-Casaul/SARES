import { isOpenCase } from './caseStatus.js';

// Pure helpers behind the dashboard. Kept free of React and Firebase so they can
// be unit tested (see test/dashboardStats.test.js).

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const SEVERITY_CATEGORIES = Object.freeze([
  { key: 'light', label: 'Light', color: '#38bdf8' },
  { key: 'less_serious', label: 'Less Serious', color: '#f59e0b' },
  { key: 'serious', label: 'Serious', color: '#f97316' },
  { key: 'very_serious', label: 'Very Serious', color: '#dc2626' },
]);

export const SCOPE_VIEWS = Object.freeze([
  { value: 'all', label: 'All schools' },
  { value: 'elementary', label: 'Elementary' },
  { value: 'high_school', label: 'High School' },
]);

export function getScopeLabel(scope) {
  return SCOPE_VIEWS.find((view) => view.value === scope)?.label || 'All schools';
}

/** Parses `YYYY-MM-DD` as a local date (not UTC), or a Firestore Timestamp / Date. */
export function parseRecordDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/** e.g. "Nov 19, 2026". Falls back to the raw value if it can't be parsed. */
export function formatDisplayDate(value) {
  const date = parseRecordDate(value);
  if (!date) return typeof value === 'string' ? value : '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Open cases need action: pending mediation, pending sanction, or serving a suspension. */
export function isPendingViolation(violation, now = new Date()) {
  return isOpenCase(violation, now);
}

/** Superadmin school filter: a school's view also includes shared records. */
export function filterByScopeView(records, scopeView) {
  if (!scopeView || scopeView === 'all') return records;
  return records.filter((record) => record.school_scope === scopeView || record.school_scope === 'shared');
}

/**
 * Violation counts for the last `monthCount` months, oldest first.
 * Months are built from the 1st of each month, so running this on the 29th–31st
 * can't skip or repeat a month.
 */
export function getMonthlyTrends(violations, now = new Date(), monthCount = 6) {
  const buckets = [];
  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({
      key: `${monthStart.getFullYear()}-${monthStart.getMonth()}`,
      month: SHORT_MONTHS[monthStart.getMonth()],
      label: `${SHORT_MONTHS[monthStart.getMonth()]} ${monthStart.getFullYear()}`,
      count: 0,
    });
  }
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  violations.forEach((violation) => {
    const date = parseRecordDate(violation.incident_date);
    if (!date) return;
    const bucket = byKey.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket.count += 1;
  });
  return buckets.map(({ month, label, count }) => ({ month, label, count }));
}

export function countNewThisMonth(violations, now = new Date()) {
  const thisMonth = [now.getFullYear(), now.getMonth()];
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = [lastMonthDate.getFullYear(), lastMonthDate.getMonth()];
  let current = 0;
  let previous = 0;
  violations.forEach((violation) => {
    const date = parseRecordDate(violation.incident_date);
    if (!date) return;
    if (date.getFullYear() === thisMonth[0] && date.getMonth() === thisMonth[1]) current += 1;
    else if (date.getFullYear() === lastMonth[0] && date.getMonth() === lastMonth[1]) previous += 1;
  });
  return { thisMonth: current, lastMonth: previous };
}

/** Whole-number percentages that always add up to 100 (largest remainder method). */
export function toPercentDistribution(entries, total) {
  if (!entries.length || total <= 0) return entries.map((entry) => ({ ...entry, percent: 0 }));

  const withBase = entries.map((entry, index) => {
    const raw = (entry.count / total) * 100;
    const base = Math.floor(raw);
    return { entry, base, fraction: raw - base, index };
  });
  let remainder = 100 - withBase.reduce((sum, item) => sum + item.base, 0);
  [...withBase]
    .sort((a, b) => b.fraction - a.fraction)
    .forEach((item) => {
      if (remainder > 0 && item.fraction > 0) {
        item.base += 1;
        remainder -= 1;
      }
    });
  return withBase.map(({ entry, base }) => ({ ...entry, percent: base }));
}

/** Counts per severity, in severity order. Percentages are of categorised violations. */
export function getCategoryStats(violations) {
  const counts = Object.fromEntries(SEVERITY_CATEGORIES.map(({ key }) => [key, 0]));
  violations.forEach((violation) => {
    if (Object.hasOwn(counts, violation.subcategory_id)) counts[violation.subcategory_id] += 1;
  });
  const entries = SEVERITY_CATEGORIES.map((category) => ({ ...category, count: counts[category.key] }));
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  return { total, categories: toPercentDistribution(entries, total) };
}

export function getViolationName(violation) {
  return violation?.offense_variety || violation?.category_name || 'Unspecified';
}

/** Most frequent violations. `percent` is the share of ALL violations, not just the top ones. */
export function getTopViolations(violations, limit = 5) {
  const counts = new Map();
  violations.forEach((violation) => {
    const name = getViolationName(violation);
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  const total = violations.length;
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, percent: total ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function getRecordTimeMs(violation) {
  const created = parseRecordDate(violation?.created_at);
  if (created) return created.getTime();
  return parseRecordDate(violation?.incident_date)?.getTime() || 0;
}

/** Most recently recorded violations first. */
export function getRecentViolations(violations, limit = 5) {
  return [...violations]
    .sort((a, b) => getRecordTimeMs(b) - getRecordTimeMs(a))
    .slice(0, limit);
}

/** Every student with at least one pending case: most pending first, then the longest waiting. */
export function getStudentsWithPendingCases(violations, now = new Date()) {
  const grouped = new Map();
  violations.forEach((violation) => {
    if (!isPendingViolation(violation, now)) return;
    const key = violation.student_id || violation.student_name || 'unknown';
    if (!grouped.has(key)) {
      grouped.set(key, {
        student_id: violation.student_id,
        student_name: violation.student_name,
        student_number: violation.student_number,
        year_level: violation.year_level,
        pendingCount: 0,
        oldestIncidentMs: Infinity,
        oldestIncidentDate: '',
      });
    }
    const student = grouped.get(key);
    student.pendingCount += 1;
    const incidentMs = parseRecordDate(violation.incident_date)?.getTime();
    if (incidentMs !== undefined && incidentMs < student.oldestIncidentMs) {
      student.oldestIncidentMs = incidentMs;
      student.oldestIncidentDate = violation.incident_date;
    }
  });
  return [...grouped.values()]
    .sort((a, b) => b.pendingCount - a.pendingCount || a.oldestIncidentMs - b.oldestIncidentMs)
    .map((student) => {
      const result = { ...student };
      delete result.oldestIncidentMs;
      return result;
    });
}

export function getInitials(name) {
  if (!name || typeof name !== 'string') return 'ST';
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ST';
}

/** First name for the greeting; null when the profile only has an email. */
export function getGreetingName(fullName) {
  const name = String(fullName || '').trim();
  if (!name || name.includes('@')) return null;
  return name.split(/\s+/)[0];
}
