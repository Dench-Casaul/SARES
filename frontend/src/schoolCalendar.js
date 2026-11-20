/**
 * School year calendar: decides which school year a date belongs to.
 *
 * Each school year starts on its opening day, which the superadmin sets in
 * Rule Management → School Year (stored in Firestore at rules/school_calendar).
 * Years without a configured opening day start on June 1.
 *
 * A case's school year is saved on the case when it is recorded
 * (`school_year_key`), so changing an opening day later does not move
 * existing cases between years.
 */

export const DEFAULT_START_MONTH = 6; // June
export const DEFAULT_START_DAY = 1;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

let configuredStarts = {};

function isValidIsoDate(value) {
  const match = ISO_DATE.exec(String(value || ''));
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Checks an opening-day map `{ '2026': '2026-06-16', … }`. Each opening day must
 * be a real date in its own start year. Returns the valid entries and the errors.
 */
export function validateSchoolYearStarts(starts = {}) {
  const valid = {};
  const errors = [];
  Object.entries(starts || {}).forEach(([startYear, isoDate]) => {
    if (!/^\d{4}$/.test(startYear)) {
      errors.push(`"${startYear}" is not a school year start year.`);
    } else if (!isValidIsoDate(isoDate)) {
      errors.push(`SY ${startYear}-${Number(startYear) + 1}: "${isoDate}" is not a valid date.`);
    } else if (!String(isoDate).startsWith(`${startYear}-`)) {
      errors.push(`SY ${startYear}-${Number(startYear) + 1} must open during ${startYear}.`);
    } else {
      valid[startYear] = isoDate;
    }
  });
  return { valid, errors };
}

/** Applies the opening days loaded from Firestore. Invalid entries are ignored. */
export function setSchoolYearStarts(starts = {}) {
  configuredStarts = validateSchoolYearStarts(starts).valid;
}

export function getSchoolYearStarts() {
  return { ...configuredStarts };
}

/** Opening day (`YYYY-MM-DD`) of the school year that starts in `startYear`. */
export function getSchoolYearStartDate(startYear) {
  const year = Number(startYear);
  return configuredStarts[String(year)]
    || `${year}-${String(DEFAULT_START_MONTH).padStart(2, '0')}-${String(DEFAULT_START_DAY).padStart(2, '0')}`;
}

/** Whether the opening day of `startYear` was set by the school (not the June 1 default). */
export function isSchoolYearStartConfigured(startYear) {
  return Boolean(configuredStarts[String(startYear)]);
}

/**
 * School year of a date, e.g. `2025-11-20` → `2025-2026`.
 * @param {string} isoDate — `YYYY-MM-DD`
 */
export function getSchoolYearKey(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const date = isoDate.slice(0, 10);
  const year = Number(date.slice(0, 4));
  if (!isValidIsoDate(date) || !year) return '';
  const start = date >= getSchoolYearStartDate(year) ? year : year - 1;
  return `${start}-${start + 1}`;
}

/** First and last day (`YYYY-MM-DD`) of a school year key such as `2026-2027`. */
export function getSchoolYearRange(schoolYearKey) {
  const startYear = Number(String(schoolYearKey || '').split('-')[0]);
  if (!schoolYearKey || !Number.isFinite(startYear)) return null;
  const nextStart = getSchoolYearStartDate(startYear + 1);
  const [y, m, d] = nextStart.split('-').map(Number);
  const lastDay = new Date(y, m - 1, d - 1);
  const end = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  return { start: getSchoolYearStartDate(startYear), end };
}
