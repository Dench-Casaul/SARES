import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CASE_STATUS,
  canScheduleSuspension,
  countsTowardOffenses,
  getAllowedTransitions,
  getCaseStatus,
  getEffectiveCaseStatus,
  getInitialStatusFields,
  getStatusFields,
  isOpenCase,
  isResolvedThroughMediation,
} from '../src/caseStatus.js';
import { getOffenseNumberReview } from '../src/engine/ruleEngine.js';

const S = CASE_STATUS;

test('legacy records map to one clear status', () => {
  const cases = [
    [{ intervention_type: 'sanction', status: 'recorded' }, S.PENDING_SANCTION],
    [{ intervention_type: 'sanction', status: 'pending' }, S.PENDING_SANCTION],
    [{ status: '' }, S.PENDING_SANCTION],
    [{ intervention_type: 'sanction', status: 'served' }, S.SERVED],
    [{ intervention_type: 'mediation', status: 'pending', mediation_status: 'pending' }, S.PENDING_MEDIATION],
    [{ intervention_type: 'mediation', status: 'recorded', mediation_status: 'proceeded_to_sanction' }, S.PENDING_SANCTION],
    [{ intervention_type: 'mediation', status: 'resolved', mediation_status: 'resolved' }, S.RESOLVED_MEDIATION],
    [{ intervention_type: 'mediation', status: 'pending', mediation_status: 'resolved' }, S.RESOLVED_MEDIATION],
    [{ intervention_type: 'mediation', status: 'Resolved Through Mediation' }, S.RESOLVED_MEDIATION],
    // Escalated mediation that was later served
    [{ intervention_type: 'mediation', status: 'served', mediation_status: 'proceeded_to_sanction' }, S.SERVED],
    [{ status: 'no-readmission' }, S.NO_READMISSION],
    // Older records only had the sanction wording
    [{ status: 'recorded', recommended_sanction: 'No-readmission for the next school year' }, S.NO_READMISSION],
    // ...but a served one stays served
    [{ status: 'served', recommended_sanction: 'No-readmission' }, S.SERVED],
  ];
  for (const [record, expected] of cases) {
    assert.equal(getCaseStatus(record), expected, JSON.stringify(record));
  }
});

test('the explicit case_status wins over legacy fields and sanction wording', () => {
  assert.equal(getCaseStatus({
    case_status: 'pending_sanction', status: 'recorded', recommended_sanction: 'No-readmission',
  }), S.PENDING_SANCTION);
});

test('suspension dates drive "serving" and "served" without any write', () => {
  const v = { status: 'recorded', suspension_start: '2026-11-16', suspension_end: '2026-11-20' };
  assert.equal(getEffectiveCaseStatus(v, new Date(2026, 10, 15)), S.PENDING_SANCTION);
  assert.equal(getEffectiveCaseStatus(v, new Date(2026, 10, 16, 7)), S.SERVING_SUSPENSION);
  assert.equal(getEffectiveCaseStatus(v, new Date(2026, 10, 20, 23)), S.SERVING_SUSPENSION);
  assert.equal(getEffectiveCaseStatus(v, new Date(2026, 10, 21)), S.SERVED);
  // Dates never turn a closed or mediation case into "served"
  assert.equal(getEffectiveCaseStatus({ ...v, status: 'no-readmission' }, new Date(2026, 10, 25)), S.NO_READMISSION);
  assert.equal(getEffectiveCaseStatus({ ...v, intervention_type: 'mediation', status: 'pending' }, new Date(2026, 10, 25)), S.PENDING_MEDIATION);
});

test('open vs closed is the same everywhere', () => {
  const now = new Date(2026, 10, 19);
  assert.equal(isOpenCase({ status: 'recorded' }, now), true);
  assert.equal(isOpenCase({ intervention_type: 'mediation', status: 'pending' }, now), true);
  assert.equal(isOpenCase({ status: 'served' }, now), false);
  assert.equal(isOpenCase({ status: 'no-readmission' }, now), false);
  assert.equal(isOpenCase({ intervention_type: 'mediation', status: 'resolved' }, now), false);
});

test('only mediation-resolved cases stop counting toward offense numbers', () => {
  assert.equal(countsTowardOffenses({ intervention_type: 'mediation', status: 'resolved' }), false);
  assert.equal(countsTowardOffenses({ intervention_type: 'mediation', status: 'pending' }), true);
  assert.equal(countsTowardOffenses({ status: 'served' }), true);
  assert.equal(countsTowardOffenses({ status: 'no-readmission' }), true);
  assert.equal(isResolvedThroughMediation({ case_status: 'resolved_mediation' }), true);
});

test('escalated mediation cases can now be marked served', () => {
  const escalated = { intervention_type: 'mediation', status: 'recorded', mediation_status: 'proceeded_to_sanction' };
  assert.deepEqual(getAllowedTransitions(escalated), [S.SERVED, S.PENDING_MEDIATION]);
});

test('allowed status changes', () => {
  const now = new Date(2026, 10, 19);
  assert.deepEqual(getAllowedTransitions({ intervention_type: 'mediation', status: 'pending' }, now), [S.PENDING_SANCTION, S.RESOLVED_MEDIATION]);
  assert.deepEqual(getAllowedTransitions({ status: 'recorded' }, now), [S.SERVED]);
  assert.deepEqual(getAllowedTransitions({ status: 'recorded', recommended_sanction: 'x', case_status: 'pending_sanction' }, now), [S.SERVED]);
  assert.deepEqual(getAllowedTransitions({ status: 'served' }, now), [S.PENDING_SANCTION]);
  assert.deepEqual(getAllowedTransitions({ status: 'no-readmission' }, now), [S.PENDING_SANCTION]);
  assert.deepEqual(getAllowedTransitions({ intervention_type: 'mediation', status: 'resolved' }, now), [S.PENDING_MEDIATION]);
  // Explicitly reopened no-readmission case can be closed again
  assert.deepEqual(getAllowedTransitions({ case_status: 'pending_sanction', recommended_sanction: 'No-readmission' }, now), [S.SERVED, S.NO_READMISSION]);
  // Completed suspension: served by its dates, nothing to change
  assert.deepEqual(getAllowedTransitions({ status: 'recorded', suspension_start: '2026-11-01', suspension_end: '2026-11-05' }, now), []);
  // Active suspension can be ended early
  assert.deepEqual(getAllowedTransitions({ status: 'recorded', suspension_start: '2026-11-18', suspension_end: '2026-11-25' }, now), [S.SERVED]);
});

test('written fields keep legacy fields consistent with case_status', () => {
  const mediation = { intervention_type: 'mediation' };
  assert.deepEqual(getStatusFields(S.PENDING_SANCTION, mediation), { case_status: 'pending_sanction', status: 'recorded', mediation_status: 'proceeded_to_sanction' });
  assert.deepEqual(getStatusFields(S.PENDING_SANCTION, {}), { case_status: 'pending_sanction', status: 'recorded' });
  assert.deepEqual(getStatusFields(S.RESOLVED_MEDIATION, mediation), { case_status: 'resolved_mediation', status: 'resolved', mediation_status: 'resolved' });
  assert.throws(() => getStatusFields('overridden'));
  // Every written combination reads back as the same status
  for (const status of [S.PENDING_MEDIATION, S.PENDING_SANCTION, S.SERVED, S.RESOLVED_MEDIATION, S.NO_READMISSION]) {
    const fields = getStatusFields(status, mediation);
    const legacyOnly = { ...fields };
    delete legacyOnly.case_status;
    assert.equal(getCaseStatus({ ...mediation, ...fields }), status);
    if (status !== S.NO_READMISSION) assert.equal(getCaseStatus({ ...mediation, ...legacyOnly }), status);
  }
});

test('new cases start in the right status', () => {
  assert.equal(getInitialStatusFields({ intervention_type: 'mediation', recommended_sanction: 'No-readmission' }).case_status, S.PENDING_MEDIATION);
  assert.equal(getInitialStatusFields({ intervention_type: 'sanction', recommended_sanction: 'No-readmission next SY' }).case_status, S.NO_READMISSION);
  assert.equal(getInitialStatusFields({ intervention_type: 'sanction', recommended_sanction: 'Written warning' }).case_status, S.PENDING_SANCTION);
});

test('suspension dates only for suspension sanctions on open cases', () => {
  assert.equal(canScheduleSuspension({ status: 'recorded', recommended_sanction: '3-day suspension' }), true);
  assert.equal(canScheduleSuspension({ status: 'recorded', recommended_sanction: 'Written warning', offense_type: 'major' }), false);
  assert.equal(canScheduleSuspension({ status: 'served', recommended_sanction: '3-day suspension' }), false);
  assert.equal(canScheduleSuspension({ status: 'no-readmission', recommended_sanction: 'suspension and no-readmission' }), false);
  // Existing dates stay editable while the case isn't no-readmission
  assert.equal(canScheduleSuspension({ status: 'served', suspension_start: '2026-11-01', suspension_end: '2026-11-03' }), true);
});

test('offense number review flags cases whose recorded number no longer matches', () => {
  const base = { student_id: 's1', school_year_key: '2026-2027', subcategory_id: 'light' };
  const first = { ...base, id: 'a', incident_date: '2026-08-01', created_at: { seconds: 1_790_000_000 }, offense_number: 1, intervention_type: 'mediation', status: 'pending' };
  const second = { ...base, id: 'b', incident_date: '2026-09-01', created_at: { seconds: 1_790_100_000 }, offense_number: 2, status: 'recorded' };
  assert.equal(getOffenseNumberReview(second, [first, second]), null);

  const firstResolved = { ...first, status: 'resolved', mediation_status: 'resolved' };
  assert.deepEqual(getOffenseNumberReview(second, [firstResolved, second]), { recorded: 2, current: 1 });
  // The resolved case itself is never flagged
  assert.equal(getOffenseNumberReview(firstResolved, [firstResolved, second]), null);
  // Records without the needed fields are skipped rather than guessed
  assert.equal(getOffenseNumberReview({ ...second, school_year_key: '' }, [firstResolved, second]), null);
});
