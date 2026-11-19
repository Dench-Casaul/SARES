/**
 * Disciplinary case status: the single source of truth for what state a case
 * is in, what that means, and which changes are allowed.
 *
 * Every page (Students, Dashboard, Reports, Case Assessment, exports) reads
 * status through these helpers instead of checking raw fields, so they can't
 * disagree.
 *
 * Storage: new writes set `case_status` (canonical) AND the legacy fields
 * (`status`, `mediation_status`) so older records, exports and reports keep
 * working. Records written before `case_status` existed are mapped from the
 * legacy fields by `getCaseStatus`.
 */

export const CASE_STATUS = Object.freeze({
  PENDING_MEDIATION: 'pending_mediation',
  PENDING_SANCTION: 'pending_sanction',
  SERVING_SUSPENSION: 'serving_suspension', // derived from suspension dates, never stored
  SERVED: 'served',
  RESOLVED_MEDIATION: 'resolved_mediation',
  NO_READMISSION: 'no_readmission',
});

/** Values that may be stored in `case_status` (Firestore rules enforce the same list). */
export const STORED_CASE_STATUSES = Object.freeze([
  CASE_STATUS.PENDING_MEDIATION,
  CASE_STATUS.PENDING_SANCTION,
  CASE_STATUS.SERVED,
  CASE_STATUS.RESOLVED_MEDIATION,
  CASE_STATUS.NO_READMISSION,
]);

const STATUS_INFO = Object.freeze({
  [CASE_STATUS.PENDING_MEDIATION]: { label: 'Pending Mediation', open: true, tone: 'pending' },
  [CASE_STATUS.PENDING_SANCTION]: { label: 'Pending Sanction', open: true, tone: 'pending' },
  [CASE_STATUS.SERVING_SUSPENSION]: { label: 'Serving Suspension', open: true, tone: 'active' },
  [CASE_STATUS.SERVED]: { label: 'Served', open: false, tone: 'closed' },
  [CASE_STATUS.RESOLVED_MEDIATION]: { label: 'Resolved Through Mediation', open: false, tone: 'closed' },
  [CASE_STATUS.NO_READMISSION]: { label: 'No-readmission', open: false, tone: 'final' },
});

const lower = (value) => String(value || '').trim().toLowerCase();

export function isMediationCase(violation) {
  return lower(violation?.intervention_type) === 'mediation';
}

/** True when the handbook sanction text is a no-readmission outcome. */
export function isNoReadmissionSanction(sanctionText) {
  return lower(sanctionText).includes('no-readmission');
}

function sanctionText(violation) {
  return violation?.recommended_sanction || violation?.sanction || '';
}

/**
 * The stored state of a case (ignores suspension dates).
 * Uses `case_status` when present, otherwise maps the legacy fields.
 */
export function getCaseStatus(violation) {
  const explicit = lower(violation?.case_status);
  if (STORED_CASE_STATUSES.includes(explicit)) return explicit;

  const status = lower(violation?.status);
  const mediationStatus = lower(violation?.mediation_status);
  const isResolved = (value) => value === 'resolved' || value === 'resolved through mediation';

  if (status === 'served') return CASE_STATUS.SERVED;
  if (status === 'no-readmission') return CASE_STATUS.NO_READMISSION;

  if (isMediationCase(violation)) {
    if (isResolved(status) || isResolved(mediationStatus)) return CASE_STATUS.RESOLVED_MEDIATION;
    if (status === 'recorded' || mediationStatus === 'proceeded_to_sanction') return CASE_STATUS.PENDING_SANCTION;
    return CASE_STATUS.PENDING_MEDIATION;
  }

  if (isResolved(status)) return CASE_STATUS.SERVED;
  // Older records never stored no-readmission explicitly; fall back to the sanction wording.
  if (isNoReadmissionSanction(sanctionText(violation))) return CASE_STATUS.NO_READMISSION;
  return CASE_STATUS.PENDING_SANCTION;
}

/** Parses `YYYY-MM-DD` as a local calendar day (midnight), or returns null. */
export function parseCalendarDay(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Suspension timing for a case: 'none' | 'scheduled' | 'active' | 'completed'. */
export function getSuspensionPhase(violation, now = new Date()) {
  const start = parseCalendarDay(violation?.suspension_start);
  const end = parseCalendarDay(violation?.suspension_end);
  if (!start || !end) return 'none';
  const today = startOfDay(now).getTime();
  if (today > end.getTime()) return 'completed';
  if (today >= start.getTime()) return 'active';
  return 'scheduled';
}

/**
 * The status to show and count right now. A pending sanction with suspension
 * dates is "Serving Suspension" during the suspension and "Served" after it
 * ends — computed from the dates, so nothing has to be written when a
 * suspension finishes.
 */
export function getEffectiveCaseStatus(violation, now = new Date()) {
  const stored = getCaseStatus(violation);
  if (stored !== CASE_STATUS.PENDING_SANCTION) return stored;
  const phase = getSuspensionPhase(violation, now);
  if (phase === 'active') return CASE_STATUS.SERVING_SUSPENSION;
  if (phase === 'completed') return CASE_STATUS.SERVED;
  return stored;
}

export function getCaseStatusLabel(status) {
  return STATUS_INFO[status]?.label || 'Unknown';
}

export function getCaseStatusTone(status) {
  return STATUS_INFO[status]?.tone || 'pending';
}

/** Open = still needs action (pending mediation, pending sanction, serving suspension). */
export function isOpenCase(violation, now = new Date()) {
  return Boolean(STATUS_INFO[getEffectiveCaseStatus(violation, now)]?.open);
}

/** A case resolved through mediation does not count toward the offense number. */
export function countsTowardOffenses(violation) {
  return getCaseStatus(violation) !== CASE_STATUS.RESOLVED_MEDIATION;
}

/** True when the handbook sanction should be hidden (resolved through mediation). */
export function isResolvedThroughMediation(violation) {
  return getCaseStatus(violation) === CASE_STATUS.RESOLVED_MEDIATION;
}

/**
 * Status changes a counselor may make from the case's current state.
 * Closed cases can be reopened (corrections happen); every change is confirmed
 * and recorded in the case's status history.
 */
export function getAllowedTransitions(violation, now = new Date()) {
  const stored = getCaseStatus(violation);
  const effective = getEffectiveCaseStatus(violation, now);
  const mediation = isMediationCase(violation);

  // A completed suspension is served by its dates; changing it means editing the dates.
  if (stored === CASE_STATUS.PENDING_SANCTION && effective === CASE_STATUS.SERVED) return [];

  switch (effective) {
    case CASE_STATUS.PENDING_MEDIATION:
      return [CASE_STATUS.PENDING_SANCTION, CASE_STATUS.RESOLVED_MEDIATION];
    case CASE_STATUS.PENDING_SANCTION: {
      const next = [CASE_STATUS.SERVED];
      if (isNoReadmissionSanction(sanctionText(violation))) next.push(CASE_STATUS.NO_READMISSION);
      if (mediation) next.push(CASE_STATUS.PENDING_MEDIATION);
      return next;
    }
    case CASE_STATUS.SERVING_SUSPENSION:
      return [CASE_STATUS.SERVED];
    case CASE_STATUS.SERVED:
      return [CASE_STATUS.PENDING_SANCTION];
    case CASE_STATUS.RESOLVED_MEDIATION:
      return [CASE_STATUS.PENDING_MEDIATION];
    case CASE_STATUS.NO_READMISSION:
      return [CASE_STATUS.PENDING_SANCTION];
    default:
      return [];
  }
}

/** Label for a status change option, e.g. "Mark as Served" / "Reopen case". */
export function getTransitionLabel(from, to) {
  const closedFrom = STATUS_INFO[from] && !STATUS_INFO[from].open;
  if (closedFrom && STATUS_INFO[to]?.open) return `Reopen as ${getCaseStatusLabel(to)}`;
  if (from === CASE_STATUS.PENDING_MEDIATION && to === CASE_STATUS.PENDING_SANCTION) return 'Escalate to Sanction';
  if (from === CASE_STATUS.PENDING_SANCTION && to === CASE_STATUS.PENDING_MEDIATION) return 'Return to Mediation';
  return `Mark as ${getCaseStatusLabel(to)}`;
}

/**
 * Firestore fields to write for a status. Keeps the legacy fields in step with
 * `case_status` so older screens, reports and exports stay correct.
 */
export function getStatusFields(nextStatus, violation = {}) {
  const mediation = isMediationCase(violation);
  switch (nextStatus) {
    case CASE_STATUS.PENDING_MEDIATION:
      return { case_status: nextStatus, status: 'pending', mediation_status: 'pending' };
    case CASE_STATUS.PENDING_SANCTION:
      return {
        case_status: nextStatus,
        status: 'recorded',
        ...(mediation ? { mediation_status: 'proceeded_to_sanction' } : {}),
      };
    case CASE_STATUS.SERVED:
      return { case_status: nextStatus, status: 'served' };
    case CASE_STATUS.RESOLVED_MEDIATION:
      return { case_status: nextStatus, status: 'resolved', mediation_status: 'resolved' };
    case CASE_STATUS.NO_READMISSION:
      return { case_status: nextStatus, status: 'no-readmission' };
    default:
      throw new Error(`Unknown case status: ${nextStatus}`);
  }
}

/** Status fields for a newly recorded case. */
export function getInitialStatusFields({ intervention_type, recommended_sanction }) {
  if (lower(intervention_type) === 'mediation') {
    return getStatusFields(CASE_STATUS.PENDING_MEDIATION, { intervention_type });
  }
  if (isNoReadmissionSanction(recommended_sanction)) {
    return getStatusFields(CASE_STATUS.NO_READMISSION, { intervention_type });
  }
  return getStatusFields(CASE_STATUS.PENDING_SANCTION, { intervention_type });
}

/** Whether suspension dates can be set: the sanction calls for suspension and the case isn't closed. */
export function canScheduleSuspension(violation, now = new Date()) {
  const hasDates = Boolean(violation?.suspension_start || violation?.suspension_end);
  const mentionsSuspension = lower(sanctionText(violation)).includes('suspension');
  if (!(hasDates || mentionsSuspension || violation?.suspension_eligible)) return false;
  const stored = getCaseStatus(violation);
  return stored === CASE_STATUS.PENDING_SANCTION || (hasDates && getEffectiveCaseStatus(violation, now) !== CASE_STATUS.NO_READMISSION);
}
