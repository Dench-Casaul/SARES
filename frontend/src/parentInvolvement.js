import { CASE_STATUS, getCaseStatus } from './caseStatus.js';

/**
 * Parent/guardian involvement, following the school handbook.
 *
 * Requirements come only from what the case's handbook sanction states:
 *   "reminder to parents"                   → Parent reminder
 *   "parent conference"                     → Parent conference
 *   "written commitment from parents/..."   → Written commitment
 * Sanctions that don't mention parents create no requirement. The counselor
 * records the outcome of each requirement on the case (`parent_involvement`).
 */

export const PARENT_REQUIREMENT_TYPES = Object.freeze({
  REMINDER: 'reminder',
  CONFERENCE: 'conference',
  COMMITMENT: 'commitment',
});

export const CONTACT_METHODS = Object.freeze(['Phone call', 'SMS / message', 'Letter', 'In person']);

export const PARENT_REQUIREMENTS = Object.freeze([
  {
    type: PARENT_REQUIREMENT_TYPES.REMINDER,
    label: 'Parent reminder',
    description: 'Inform the parent/guardian of the offense (verbal or written reminder).',
    pattern: /reminders?\s+to\s+(the\s+)?parents?/i,
    outcomes: { done: 'Informed', not_completed: 'Could not be reached' },
  },
  {
    type: PARENT_REQUIREMENT_TYPES.CONFERENCE,
    label: 'Parent conference',
    description: 'The parent/guardian attends a conference about the offense.',
    pattern: /parents?['’]?\s+conference/i,
    outcomes: { done: 'Attended', not_completed: 'Did not attend' },
  },
  {
    type: PARENT_REQUIREMENT_TYPES.COMMITMENT,
    label: 'Written commitment',
    description: 'The parent/guardian signs a written commitment.',
    pattern: /written\s+commitment\s+from\s+(the\s+)?parents?/i,
    outcomes: { done: 'Signed', not_completed: 'Not signed' },
  },
]);

export const REQUIREMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  DONE: 'done',
  NOT_COMPLETED: 'not_completed',
});

function sanctionText(violation) {
  return String(violation?.recommended_sanction || violation?.sanction || '');
}

/** The handbook's parent requirements for this sanction text, in handbook order. */
export function getParentRequirementsForSanction(text) {
  const sanction = String(text || '');
  return PARENT_REQUIREMENTS.filter((requirement) => requirement.pattern.test(sanction));
}

/**
 * Parent requirements that apply to a case. Mediation cases have no sanction
 * applied yet, so nothing is required until the case is escalated.
 */
export function getParentRequirements(violation) {
  const status = getCaseStatus(violation);
  if (status === CASE_STATUS.PENDING_MEDIATION || status === CASE_STATUS.RESOLVED_MEDIATION) return [];
  return getParentRequirementsForSanction(sanctionText(violation));
}

export function getRequirementDefinition(type) {
  return PARENT_REQUIREMENTS.find((requirement) => requirement.type === type) || null;
}

/** The recorded outcome for one requirement (pending if nothing recorded yet). */
export function getRequirementRecord(violation, type) {
  const record = violation?.parent_involvement?.[type];
  if (!record || typeof record !== 'object') return { status: REQUIREMENT_STATUS.PENDING };
  const status = Object.values(REQUIREMENT_STATUS).includes(record.status) ? record.status : REQUIREMENT_STATUS.PENDING;
  return { ...record, status };
}

export function getRequirementStatusLabel(type, status) {
  if (status === REQUIREMENT_STATUS.PENDING) return 'Pending';
  return getRequirementDefinition(type)?.outcomes?.[status] || 'Recorded';
}

/** Applicable requirements with their recorded outcomes. */
export function getParentInvolvementSummary(violation) {
  return getParentRequirements(violation).map((requirement) => {
    const record = getRequirementRecord(violation, requirement.type);
    return {
      ...requirement,
      record,
      statusLabel: getRequirementStatusLabel(requirement.type, record.status),
    };
  });
}

/** Requirements with no recorded outcome yet. */
export function getPendingParentRequirements(violation) {
  return getParentInvolvementSummary(violation).filter((item) => item.record.status === REQUIREMENT_STATUS.PENDING);
}

const clean = (value, max) => String(value || '').trim().slice(0, max);

/** Normalises a form entry into the stored record for one requirement. */
export function buildRequirementRecord(type, form, userProfile, now = new Date()) {
  if (!getRequirementDefinition(type)) throw new Error(`Unknown parent requirement: ${type}`);
  const status = Object.values(REQUIREMENT_STATUS).includes(form?.status) ? form.status : REQUIREMENT_STATUS.PENDING;
  const record = {
    status,
    parent_name: clean(form?.parent_name, 120),
    relationship: clean(form?.relationship, 60),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(form?.date || '')) ? form.date : '',
    notes: clean(form?.notes, 2000),
    recorded_by: userProfile?.user_id || '',
    recorded_by_email: userProfile?.email || '',
    recorded_at: now.toISOString(),
  };
  if (type === PARENT_REQUIREMENT_TYPES.REMINDER) {
    record.method = CONTACT_METHODS.includes(form?.method) ? form.method : '';
  }
  if (type === PARENT_REQUIREMENT_TYPES.CONFERENCE) {
    record.attendees = clean(form?.attendees, 300);
    record.parent_agreements = clean(form?.parent_agreements, 2000);
  }
  if (type === PARENT_REQUIREMENT_TYPES.COMMITMENT) {
    record.commitment = clean(form?.commitment, 2000);
  }
  return record;
}

/** One-line description of a recorded outcome, for reports and the PDF. */
export function describeRequirementRecord(item) {
  const { record } = item;
  const parts = [item.statusLabel];
  if (record.date) parts.push(record.date);
  const who = [record.parent_name, record.relationship && `(${record.relationship})`].filter(Boolean).join(' ');
  if (who) parts.push(who);
  if (record.method) parts.push(`via ${record.method}`);
  if (record.attendees) parts.push(`attended by ${record.attendees}`);
  let line = parts.join(' · ');
  const detail = record.parent_agreements || record.commitment || record.notes;
  if (detail) line += ` — ${detail}`;
  return line;
}
