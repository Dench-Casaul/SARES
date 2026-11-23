/**
 * SARES Rule Engine — progressive handbook sanctions by offense level and school.
 */

import {
  getHighestSanctionTier,
  getSanctionByOffenseNumber,
  isIllegalActivityOffense,
  getOffenseById,
} from '../data/handbookIndex.js';
import { formatIdentifiedSanction, ordinal } from './sanctionLabel.js';
import { getSchoolScopeForYear } from '../schoolScope.js';
import { countsTowardOffenses, isOpenCase } from '../caseStatus.js';
import { DEFAULT_START_MONTH, getSchoolYearKey } from '../schoolCalendar.js';

// School years start on the opening day set in Rule Management (see schoolCalendar.js).
export { getSchoolYearKey };

/** Default opening month when no opening day is configured (6 = June). */
export const SCHOOL_YEAR_START_MONTH = DEFAULT_START_MONTH;

/** Whether a case counts toward the student's offense number (see caseStatus.js). */
export function doesViolationCount(violation) {
  return countsTowardOffenses(violation);
}

/** True when the case needs no further action (served, resolved, no-readmission, completed suspension). */
export function isViolationServed(violation, now = new Date()) {
  return !isOpenCase(violation, now);
}

/** Counts prior incidents in the same offense level and school year. */
export function getRecordTimeMs(record, { treatMissingAsLatest = false } = {}) {
  const created = record?.created_at;
  if (created?.seconds) return created.seconds * 1000;
  if (typeof created?.toMillis === 'function') return created.toMillis();
  if (typeof created?.toDate === 'function') return created.toDate().getTime();
  if (typeof created === 'number') return created;
  if (typeof created === 'string') {
    const parsed = Date.parse(created);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return treatMissingAsLatest ? Number.MAX_SAFE_INTEGER : 0;
}

function incidentDateKey(record) {
  return String(record?.incident_date || '').slice(0, 10);
}

/** True when `prior` happened before `current` (incident date, then created_at, then id). */
export function isViolationEarlierThan(prior, current = {}) {
  const priorDate = incidentDateKey(prior);
  const currentDate = incidentDateKey(current);
  if (priorDate && currentDate && priorDate !== currentDate) {
    return priorDate < currentDate;
  }

  const priorCreated = getRecordTimeMs(prior);
  const currentCreated = getRecordTimeMs(current, { treatMissingAsLatest: true });
  if (priorCreated !== currentCreated) return priorCreated < currentCreated;

  const priorId = String(prior?.id || prior?.violation_id || '');
  const currentId = String(current?.id || current?.violation_id || '');
  if (priorId && currentId) return priorId < currentId;
  return Boolean(priorId);
}

export function countPriorOffenses(
  studentId,
  schoolYearKey,
  subcategoryId,
  existingViolations = [],
  currentIncident = {}
) {
  return existingViolations.filter(
    (v) =>
      String(v?.student_id) === String(studentId) &&
      String(v?.school_year_key) === String(schoolYearKey) &&
      String(v?.subcategory_id) === String(subcategoryId) &&
      doesViolationCount(v) &&
      isViolationEarlierThan(v, currentIncident)
  ).length;
}

/**
 * Checks whether a recorded case's stored offense number still matches the
 * student's records. Offense numbers (and their sanctions) are fixed when a
 * case is recorded; they can drift if an earlier case is later resolved
 * through mediation, reopened, or recorded with an earlier incident date.
 * Returns null when they match (or can't be checked), otherwise
 * `{ recorded, current }` so the counselor can review it. Nothing is changed
 * automatically: re-issuing a sanction is a counselor decision.
 */
export function getOffenseNumberReview(violation, studentViolations = []) {
  const recorded = Number(violation?.cumulative_offense_number ?? violation?.offense_number);
  if (!Number.isFinite(recorded) || recorded < 1) return null;
  if (!violation?.school_year_key || !violation?.subcategory_id || !violation?.student_id) return null;
  if (!countsTowardOffenses(violation)) return null;

  const violationId = String(violation.id || violation.violation_id || '');
  const others = studentViolations.filter((other) => (
    String(other?.id || other?.violation_id || '') !== violationId
  ));
  const current = countPriorOffenses(
    violation.student_id,
    violation.school_year_key,
    violation.subcategory_id,
    others,
    { incident_date: violation.incident_date, created_at: violation.created_at, id: violationId }
  ) + 1;
  return current === recorded ? null : { recorded, current };
}

/**
 * Evaluates handbook-based sanction for an offense at any level.
 *
 * @param {object} params
 * @param {'minor'|'major'} params.offenseType
 * @param {string} params.studentId
 * @param {string} params.incidentDate — YYYY-MM-DD
 * @param {string} params.offenseId
 * @param {string} params.subcategoryId
 * @param {string} params.schoolScope
 * @param {object[]} [params.existingViolations]
 * @returns {object} recommendation payload
 */
export function evaluateOffense({
  offenseType,
  studentId,
  incidentDate,
  offenseId,
  subcategoryId,
  schoolScope,
  existingViolations = [],
  currentIncident = {},
}) {
  const schoolYearKey = getSchoolYearKey(incidentDate);
  const offenseData = getOffenseById(offenseId);
  const level = subcategoryId || offenseData?.group?.subcategoryId || '';
  const resolvedOffenseType = offenseData?.group?.categoryId || offenseType || '';
  const priorCount = countPriorOffenses(studentId, schoolYearKey, level, existingViolations, {
    incident_date: incidentDate,
    created_at: currentIncident.created_at,
    id: currentIncident.id,
  });
  const offenseNumber = priorCount + 1;
  const resolvedSchoolScope = schoolScope || getSchoolScopeForYear(currentIncident.year_level || currentIncident.year);
  let tier = getSanctionByOffenseNumber(
    resolvedOffenseType,
    level,
    resolvedSchoolScope,
    offenseNumber
  );
  // Repeat offenses past the end of the schedule keep the highest listed sanction
  // (never "no sanction") and are flagged so the counselor escalates for review.
  let beyondSchedule = false;
  let scheduleMaxOffense = null;
  if (!tier) {
    const highest = getHighestSanctionTier(resolvedOffenseType, level, resolvedSchoolScope);
    if (highest && offenseNumber > Number(highest.offenseNumber)) {
      tier = { ...highest, label: `${ordinal(offenseNumber)} Offense` };
      beyondSchedule = true;
      scheduleMaxOffense = Number(highest.offenseNumber);
    }
  }
  const suggestAuthorities = isIllegalActivityOffense(offenseId);
  const levelLabel = {
    light: 'Light',
    less_serious: 'Less Serious',
    serious: 'Serious',
    very_serious: 'Very Serious',
  }[level] || 'selected';
  const schoolLabel = resolvedSchoolScope === 'elementary'
    ? 'Elementary'
    : resolvedSchoolScope === 'high_school' ? 'High School' : 'selected school';

  return {
    offenseType: resolvedOffenseType,
    offenseNumber,
    cumulativeOffenseNumber: offenseNumber,
    offenseLabel: tier?.label ?? `${offenseNumber} Offense`,
    recommendedSanction: tier?.sanction
      ?? `No additional sanction is listed for ${levelLabel} offenses in the ${schoolLabel} schedule.`,
    // False when the handbook has no sanction for this student's level/schedule;
    // the case must not be recorded with a sanction until the rules are fixed.
    sanctionFound: Boolean(tier?.sanction),
    suggestAuthorities,
    schoolYearKey,
    priorOffenseCount: priorCount,
    offenseTitle: offenseData?.title ?? offenseId,
    subcategoryId: level,
    schoolScope: resolvedSchoolScope,
    handbookSection: 'Progressive Discipline Table',
    beyondSchedule,
    scheduleMaxOffense,
    notes: [
      `Cumulative ${levelLabel.toLowerCase()} offense count for school year ${schoolYearKey}: ${priorCount} prior, this is #${offenseNumber} for ${schoolLabel}.`,
      ...(beyondSchedule
        ? [`⚠ The handbook schedule ends at the ${ordinal(scheduleMaxOffense)} offense. The highest listed sanction applies; refer this repeat offense to the principal/discipline committee for review.`]
        : []),
      ...(suggestAuthorities
        ? ['⚠ This violation may involve illegal activity. Consider referral to proper authorities.']
        : []),
    ],
  };
}

/**
 * Unified entry point for Violation page.
 */
export function evaluateSaresRecommendation({
  offenseType,
  offenseId,
  studentId,
  incidentDate,
  subcategoryId,
  schoolScope,
  yearLevel,
  existingViolations = [],
  currentIncident = {},
}) {
  return evaluateOffense({
    offenseType,
    studentId,
    incidentDate,
    offenseId,
    subcategoryId,
    schoolScope: schoolScope || getSchoolScopeForYear(yearLevel),
    existingViolations,
    currentIncident,
  });
}

/**
 * Students whose offense number differs between two violation snapshots, e.g.
 * the list loaded when the form opened (`before`) and a fresh read just before
 * saving (`after`). Used to stop a save when another case was recorded meanwhile.
 *
 * @returns {{ student: object, beforeNumber: number, afterNumber: number, beforeLabel: string, afterLabel: string }[]}
 */
export function findOffenseNumberChanges({ students = [], offense = {}, before = [], after = [] }) {
  const evaluateWith = (student, violations) => evaluateSaresRecommendation({
    offenseType: offense.offenseType,
    offenseId: offense.offenseId,
    studentId: student.student_id,
    incidentDate: offense.incidentDate,
    subcategoryId: offense.subcategoryId,
    schoolScope: student.school_scope || getSchoolScopeForYear(student.year_level || student.year),
    yearLevel: student.year_level || student.year,
    existingViolations: violations,
    currentIncident: { incident_date: offense.incidentDate },
  });

  return students.flatMap((student) => {
    const previous = evaluateWith(student, before);
    const current = evaluateWith(student, after);
    if (previous.offenseNumber === current.offenseNumber) return [];
    return [{
      student,
      beforeNumber: previous.offenseNumber,
      afterNumber: current.offenseNumber,
      beforeLabel: previous.offenseLabel,
      afterLabel: current.offenseLabel,
    }];
  });
}

export function buildViolationRecordsForStudents({
  incidentData,
  selectedStudents = [],
  existingViolations = [],
}) {
  const groupIncidentId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return selectedStudents.map((student, index) => {
    const studentRec = evaluateSaresRecommendation({
      offenseType: incidentData.offense_type,
      offenseId: incidentData.offense_id,
      studentId: student.student_id,
      incidentDate: incidentData.incident_date,
      subcategoryId: incidentData.subcategory_id,
      schoolScope: student.school_scope || getSchoolScopeForYear(student.year_level || student.year),
      yearLevel: student.year_level || student.year,
      existingViolations,
      currentIncident: incidentData,
    });

    // Always this student's own result: never borrow another student's sanction,
    // which could come from a different school level's schedule.
    const recommendedSanction = studentRec.recommendedSanction;
    const offenseNumberForRecord = studentRec.offenseNumber;

    return {
      ...incidentData,
      student_id: student.student_id,
      student_name: student.full_name || '',
      student_number: student.student_number || '',
      year_level: student.year_level || '',
      school_scope: student.school_scope || getSchoolScopeForYear(student.year_level || student.year),
      offense_number: offenseNumberForRecord,
      cumulative_offense_number: offenseNumberForRecord,
      recommended_sanction: recommendedSanction,
      identified_sanction: formatIdentifiedSanction({
        offense_type: incidentData.offense_type,
        offense_number: offenseNumberForRecord,
        cumulative_offense_number: offenseNumberForRecord,
        school_year_key: studentRec.schoolYearKey || incidentData.school_year_key,
        recommended_sanction: recommendedSanction,
        intervention_type: incidentData.intervention_type,
        status: incidentData.status,
        mediation_status: incidentData.mediation_status,
      }),
      generated_explanation: incidentData.generated_explanation,
      explanation_source: incidentData.explanation_source,
      ai_assisted_solution: incidentData.ai_assisted_solution,
      ai_assisted_solution_source: incidentData.ai_assisted_solution_source,
      suggest_authorities: studentRec.suggestAuthorities || incidentData.suggest_authorities,
      beyond_schedule: studentRec.beyondSchedule,
      status: incidentData.status || 'recorded',
      created_by: incidentData.created_by || 'system',
      school_year_key: studentRec.schoolYearKey || incidentData.school_year_key,
      engine_mode: incidentData.engine_mode || 'handbook_v2',
      created_at: incidentData.created_at,
      group_incident_id: groupIncidentId,
      group_size: selectedStudents.length,
      group_index: index + 1,
      group_role: selectedStudents.length > 1 ? 'group-member' : 'single',
    };
  });
}
