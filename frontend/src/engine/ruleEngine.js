/**
 * SARES Rule Engine — progressive handbook sanctions by offense level and school.
 */

import {
  getSanctionByOffenseNumber,
  isIllegalActivityOffense,
  getOffenseById,
} from '../data/handbookIndex.js';
import { formatIdentifiedSanction } from './sanctionLabel.js';
import { getSchoolScopeForYear } from '../schoolScope.js';

/** Month (1–12) when the school year label rolls over. Default 6 = June (PH). */
export const SCHOOL_YEAR_START_MONTH = 6;

export function doesViolationCount(violation) {
  const interventionType = String(violation?.intervention_type || '').toLowerCase();
  const mediationStatus = String(violation?.mediation_status || '').toLowerCase();
  const status = String(violation?.status || '').toLowerCase();
  return !(interventionType === 'mediation' && (mediationStatus === 'resolved' || status === 'resolved'));
}

export function isViolationServed(violation) {
  const status = String(violation?.status || '').toLowerCase();
  const interventionType = String(violation?.intervention_type || '').toLowerCase();
  const mediationStatus = String(violation?.mediation_status || '').toLowerCase();
  const isResolved = (value) => ['resolved', 'resolved through mediation'].includes(value);
  return status === 'served' || (
    interventionType === 'mediation' && (isResolved(status) || isResolved(mediationStatus))
  );
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
  const tier = getSanctionByOffenseNumber(
    resolvedOffenseType,
    level,
    resolvedSchoolScope,
    offenseNumber
  );
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
    suggestAuthorities,
    schoolYearKey,
    priorOffenseCount: priorCount,
    offenseTitle: offenseData?.title ?? offenseId,
    subcategoryId: level,
    schoolScope: resolvedSchoolScope,
    handbookSection: 'Progressive Discipline Table',
    notes: [
      `Cumulative ${levelLabel.toLowerCase()} offense count for school year ${schoolYearKey}: ${priorCount} prior, this is #${offenseNumber} for ${schoolLabel}.`,
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

export function buildViolationRecordsForStudents({
  incidentData,
  selectedStudents = [],
  recommendation,
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

    const recommendedSanction = studentRec.recommendedSanction || recommendation?.recommendedSanction || incidentData.recommended_sanction;
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
