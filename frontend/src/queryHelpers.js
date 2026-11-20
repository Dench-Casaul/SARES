/**
 * Small Firebase-free helpers for the read-saving queries (see violationQueries.js),
 * kept separate so they can be unit tested without initialising Firebase.
 */

/** Firestore reports a missing composite index as `failed-precondition`. */
export function isMissingIndexError(error) {
  return error?.code === 'failed-precondition';
}

/** `count` school years ending with the current one, newest first: ['2026-2027', '2025-2026', …]. */
export function listRecentSchoolYears(currentKey, count = 5) {
  const start = Number(String(currentKey || '').split('-')[0]);
  if (!currentKey || !Number.isFinite(start)) return [];
  return Array.from({ length: count }, (_, offset) => `${start - offset}-${start - offset + 1}`);
}
