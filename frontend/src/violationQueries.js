/**
 * Violation reads that fetch only what a page needs, to stay inside the free
 * Firestore quota (50,000 document reads per day). Every document a query
 * returns counts as one read, so "load every violation" gets more expensive
 * each school year; these queries keep the cost flat.
 *
 * Several queries need composite indexes (firestore.indexes.json). Until those
 * are deployed, Firestore rejects the query with `failed-precondition`; each
 * helper then falls back to the old full read so the app keeps working.
 */
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { queryForUserScope } from './firestoreAccess';
import { isRecordInTrash } from './recordStatus';
import { isMissingIndexError, listRecentSchoolYears } from './queryHelpers';

export { isMissingIndexError, listRecentSchoolYears };

const violations = () => collection(db, 'violations');

function toActiveRecords(snapshot) {
  return snapshot.docs
    .map((violationDoc) => ({ id: violationDoc.id, ...violationDoc.data() }))
    .filter((record) => !isRecordInTrash(record));
}

async function withIndexFallback(label, run, fallback) {
  try {
    return await run();
  } catch (error) {
    if (!isMissingIndexError(error)) throw error;
    console.warn(`${label}: Firestore index not deployed yet, so every violation was read instead. Deploy firestore.indexes.json to fix.`, error);
    return fallback();
  }
}

/** Every active violation in the user's scope. Expensive: use only when the page truly needs all of them. */
export async function fetchAllViolations(profile) {
  return toActiveRecords(await getDocs(queryForUserScope(violations(), profile)));
}

/**
 * All active violations of the given students (any school year). Used for offense
 * counting, which only ever looks at the students involved in an incident.
 */
export async function fetchViolationsForStudents(profile, studentIds = []) {
  const ids = [...new Set(studentIds.map((id) => String(id || '')).filter(Boolean))];
  if (ids.length === 0) return [];

  return withIndexFallback(
    'Student violation query',
    async () => {
      const snapshots = await Promise.all(ids.map((id) => (
        getDocs(queryForUserScope(query(violations(), where('student_id', '==', id)), profile))
      )));
      return snapshots.flatMap(toActiveRecords);
    },
    async () => (await fetchAllViolations(profile)).filter((record) => ids.includes(String(record.student_id)))
  );
}

/** The most recently recorded violations, newest first. */
export async function fetchRecentViolations(profile, count = 50) {
  return withIndexFallback(
    'Recent violation query',
    async () => toActiveRecords(await getDocs(queryForUserScope(
      query(violations(), orderBy('created_at', 'desc'), limit(count)),
      profile
    ))),
    async () => (await fetchAllViolations(profile))
      .sort((left, right) => (right.created_at?.seconds || 0) - (left.created_at?.seconds || 0))
      .slice(0, count)
  );
}

/** Query for one school year's violations (e.g. `2026-2027`), for listeners. */
export function schoolYearViolationsQuery(profile, schoolYearKey) {
  return queryForUserScope(query(violations(), where('school_year_key', '==', schoolYearKey)), profile);
}

/** Query for every violation in scope, for listeners. */
export function allViolationsQuery(profile) {
  return queryForUserScope(violations(), profile);
}
