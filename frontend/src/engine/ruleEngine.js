/**
 * SARES Rule Engine v2 — Handbook-based sanctions only.
 *
 * Sanctions are now strictly derived from the handbook:
 *  - Minor offenses: 1st / 2nd / 3rd offense → fixed sanction text
 *  - Major offenses: admin-selected severity score (1–10) → mapped sanction text
 *
 * The previous contextual severity / modifier engine has been replaced per
 * technical adviser recommendation (May 2026 consultation).
 */

import {
  getMinorSanctionByOffenseNumber,
  getMajorSanctionByScore,
  isIllegalActivityOffense,
  getOffenseById,
} from '../data/handbookIndex.js';

/** Month (1–12) when the school year label rolls over. Default 6 = June (PH). */
export const SCHOOL_YEAR_START_MONTH = 6;

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

export function doesViolationCount(violation) {
  const interventionType = String(violation?.intervention_type || '').toLowerCase();
  const mediationStatus = String(violation?.mediation_status || '').toLowerCase();
  const status = String(violation?.status || '').toLowerCase();
  return !(interventionType === 'mediation' && (mediationStatus === 'resolved' || status === 'resolved'));
}

/**
 * @param {string} isoDate — `YYYY-MM-DD`
 * @returns {string} e.g. `2025-2026`
 */
export function getSchoolYearKey(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const [y, m] = isoDate.split('-').map(Number);
  if (!y || !m) return '';
  const start = m >= SCHOOL_YEAR_START_MONTH ? y : y - 1;
  return `${start}-${start + 1}`;
}

/**
 * Counts how many minor violations this student has already committed in the
 * current school year (across ALL minor categories — cumulative counting).
 *
 * @param {string} studentId
 * @param {string} schoolYearKey
 * @param {object[]} existingViolations — raw Firestore violation payloads
 */
export function countPriorMinorOffenses(studentId, schoolYearKey, existingViolations = []) {
  return existingViolations.filter(
    (v) =>
      String(v?.student_id) === String(studentId) &&
      String(v?.school_year_key) === String(schoolYearKey) &&
      String(v?.offense_type).toLowerCase() === 'minor' &&
      doesViolationCount(v)
  ).length;
}

/**
 * Evaluates handbook-based sanction for a MINOR offense.
 *
 * @param {object} params
 * @param {string} params.studentId
 * @param {string} params.incidentDate — YYYY-MM-DD
 * @param {string} params.offenseId — e.g. "m-l-1-1"
 * @param {object[]} params.existingViolations
 * @returns {object} recommendation payload
 */
export function evaluateMinorOffense({ studentId, incidentDate, offenseId, existingViolations = [] }) {
  const schoolYearKey = getSchoolYearKey(incidentDate);
  const priorCount = countPriorMinorOffenses(studentId, schoolYearKey, existingViolations);
  const offenseNumber = clamp(priorCount + 1, 1, 3);

  const tier = getMinorSanctionByOffenseNumber(offenseNumber);
  const offenseData = getOffenseById(offenseId);
  const suggestAuthorities = isIllegalActivityOffense(offenseId);

  return {
    offenseType: 'minor',
    offenseNumber,
    offenseLabel: tier?.label ?? `${offenseNumber} Offense`,
    recommendedSanction: tier?.sanction ?? '— (sanction not found)',
    suggestAuthorities,
    schoolYearKey,
    priorMinorCount: priorCount,
    offenseTitle: offenseData?.title ?? offenseId,
    handbookSection: 'Minor Offense Sanction Schedule',
    notes: [
      `Cumulative minor offense count for school year ${schoolYearKey}: ${priorCount} prior, this is #${offenseNumber}.`,
      ...(suggestAuthorities
        ? ['⚠ This violation may involve illegal activity. Consider referral to proper authorities.']
        : []),
    ],
  };
}

/**
 * Evaluates handbook-based sanction for a MAJOR offense.
 *
 * @param {object} params
 * @param {string} params.offenseId — e.g. "M-s-1-1"
 * @param {number} params.severityScore — admin-selected integer 1–10
 * @param {string} params.incidentDate — YYYY-MM-DD
 * @returns {object} recommendation payload
 */
export function evaluateMajorOffense({ offenseId, severityScore, incidentDate }) {
  const schoolYearKey = getSchoolYearKey(incidentDate);
  const score = clamp(Math.round(severityScore), 1, 10);

  const tier = getMajorSanctionByScore(score);
  const offenseData = getOffenseById(offenseId);
  const suggestAuthorities = isIllegalActivityOffense(offenseId);

  return {
    offenseType: 'major',
    severityScore: score,
    scoreTierLabel: tier?.label ?? `Score ${score}`,
    recommendedSanction: tier?.sanction ?? '— (sanction not found)',
    suggestAuthorities,
    schoolYearKey,
    offenseTitle: offenseData?.title ?? offenseId,
    handbookSection: 'Major Offense Severity-Sanction Map',
    notes: [
      `Severity score assessed: ${score}/10 → ${tier?.sanction ?? 'unknown sanction'}.`,
      ...(suggestAuthorities
        ? ['⚠ This violation may involve illegal activity. Consider referral to proper authorities.']
        : []),
    ],
  };
}

/**
 * Unified entry point for Violation page.
 *
 * @param {object} params
 * @param {'minor'|'major'} params.offenseType
 * @param {string} params.offenseId
 * @param {string} params.studentId
 * @param {string} params.incidentDate
 * @param {number} [params.severityScore] — required if offenseType === 'major'
 * @param {object[]} [params.existingViolations]
 */
export function evaluateSaresRecommendation({
  offenseType,
  offenseId,
  studentId,
  incidentDate,
  severityScore = 1,
  existingViolations = [],
}) {
  if (offenseType === 'minor') {
    return evaluateMinorOffense({ studentId, incidentDate, offenseId, existingViolations });
  }
  return evaluateMajorOffense({ offenseId, severityScore, incidentDate });
}

export function buildViolationRecordsForStudents({
  incidentData,
  selectedStudents = [],
  recommendation,
  existingViolations = [],
}) {
  const groupIncidentId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const offenseNumber = incidentData.offense_type === 'minor' ? (recommendation?.offenseNumber ?? 1) : null;

  return selectedStudents.map((student, index) => {
    const studentRec = evaluateSaresRecommendation({
      offenseType: incidentData.offense_type,
      offenseId: incidentData.offense_id,
      studentId: student.student_id,
      incidentDate: incidentData.incident_date,
      severityScore: incidentData.severity_score,
      existingViolations,
    });

    return {
      ...incidentData,
      student_id: student.student_id,
      student_name: student.full_name || '',
      student_number: student.student_number || '',
      year_level: student.year_level || '',
      offense_number: incidentData.offense_type === 'minor' ? studentRec.offenseNumber : null,
      severity_score: incidentData.offense_type === 'major' ? incidentData.severity_score : null,
      recommended_sanction: studentRec.recommendedSanction || recommendation?.recommendedSanction || incidentData.recommended_sanction,
      generated_explanation: incidentData.generated_explanation,
      explanation_source: incidentData.explanation_source,
      suggest_authorities: studentRec.suggestAuthorities || incidentData.suggest_authorities,
      status: incidentData.status || 'recorded',
      created_by: incidentData.created_by || 'system',
      school_year_key: studentRec.schoolYearKey || incidentData.school_year_key,
      engine_mode: incidentData.engine_mode || 'handbook_v2',
      created_at: incidentData.created_at,
      group_incident_id: groupIncidentId,
      group_size: selectedStudents.length,
      group_index: index + 1,
      group_role: selectedStudents.length > 1 ? 'group-member' : 'single',
      offense_number_for_display: offenseNumber,
    };
  });
}
