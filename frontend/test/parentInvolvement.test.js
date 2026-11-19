import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildRequirementRecord,
  describeRequirementRecord,
  getParentInvolvementSummary,
  getParentRequirements,
  getParentRequirementsForSanction,
  getPendingParentRequirements,
} from '../src/parentInvolvement.js';

const handbook = JSON.parse(readFileSync(new URL('../src/data/generalizedHandbook.json', import.meta.url), 'utf8'));

function allSanctions(node, out = []) {
  if (Array.isArray(node)) node.forEach((item) => allSanctions(item, out));
  else if (node && typeof node === 'object') {
    if (node.sanction && node.offenseNumber) out.push(node);
    else Object.values(node).forEach((value) => allSanctions(value, out));
  }
  return out;
}

test('requirements match exactly what the handbook states for every sanction', () => {
  const expected = {
    'Verbal/written reminder to parents.': ['reminder'],
    'Parent conference with class adviser.': ['conference'],
    'Parent conference; referral to guidance counselor/designate.': ['conference'],
    'Suspension (5-10 days); disciplinary probation; written commitment from parents/guardians.': ['commitment'],
    'Suspension (10-15 days); disciplinary probation; written commitment from parents/guardians.': ['commitment'],
  };
  const sanctions = allSanctions(handbook);
  assert.ok(sanctions.length >= 26);
  for (const { sanction } of sanctions) {
    const types = getParentRequirementsForSanction(sanction).map((r) => r.type);
    assert.deepEqual(types, expected[sanction] || [], sanction);
  }
});

test('mediation cases have no parent requirement until escalated', () => {
  const sanction = 'Parent conference with class adviser.';
  assert.deepEqual(getParentRequirements({ intervention_type: 'mediation', status: 'pending', recommended_sanction: sanction }), []);
  assert.deepEqual(getParentRequirements({ intervention_type: 'mediation', status: 'resolved', recommended_sanction: sanction }), []);
  const escalated = { intervention_type: 'mediation', status: 'recorded', mediation_status: 'proceeded_to_sanction', recommended_sanction: sanction };
  assert.deepEqual(getParentRequirements(escalated).map((r) => r.type), ['conference']);
});

test('pending requirements drop off once an outcome is recorded', () => {
  const violation = { status: 'recorded', recommended_sanction: 'Verbal/written reminder to parents.' };
  assert.deepEqual(getPendingParentRequirements(violation).map((r) => r.type), ['reminder']);

  const record = buildRequirementRecord('reminder', {
    status: 'done', date: '2026-11-19', parent_name: ' Rosa Reyes ', relationship: 'Mother', method: 'Phone call',
  }, { user_id: 'u1', email: 'maria@ows.edu.ph' }, new Date('2026-11-19T09:00:00Z'));
  const recorded = { ...violation, parent_involvement: { reminder: record } };
  assert.deepEqual(getPendingParentRequirements(recorded), []);

  const [item] = getParentInvolvementSummary(recorded);
  assert.equal(item.statusLabel, 'Informed');
  assert.equal(describeRequirementRecord(item), 'Informed · 2026-11-19 · Rosa Reyes (Mother) · via Phone call');
  // "Did not attend" is a recorded outcome, not pending
  const notAttended = { recommended_sanction: 'Parent conference', parent_involvement: { conference: { status: 'not_completed' } } };
  assert.equal(getParentInvolvementSummary(notAttended)[0].statusLabel, 'Did not attend');
  assert.deepEqual(getPendingParentRequirements(notAttended), []);
});

test('records are cleaned: unknown values dropped, text trimmed and bounded', () => {
  const record = buildRequirementRecord('conference', {
    status: 'bogus', date: 'tomorrow', method: 'Carrier pigeon', attendees: 'Class adviser',
    parent_agreements: 'x'.repeat(5000), commitment: 'ignored for conferences',
  }, null);
  assert.equal(record.status, 'pending');
  assert.equal(record.date, '');
  assert.equal(record.method, undefined);
  assert.equal(record.attendees, 'Class adviser');
  assert.equal(record.parent_agreements.length, 2000);
  assert.equal(record.commitment, undefined);
  assert.throws(() => buildRequirementRecord('home_visit', {}, null));
});
