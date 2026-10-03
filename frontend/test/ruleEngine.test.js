import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildViolationRecordsForStudents,
  countPriorMinorOffenses,
  evaluateMinorOffense,
  isViolationServed,
} from '../src/engine/ruleEngine.js';
import { formatIdentifiedSanction } from '../src/engine/sanctionLabel.js';

test('buildViolationRecordsForStudents creates one record per selected student and links them', () => {
  const incidentData = {
    incident_date: '2026-04-10',
    offense_type: 'minor',
    subcategory_id: 'light',
    group_number: 1,
    group_title: 'Dress Code',
    offense_id: 'm-l-1-1',
    offense_variety: 'Improper Uniform',
    incident_description: 'Group incident during assembly',
    recommended_sanction: 'Warning',
    generated_explanation: 'Test explanation',
    explanation_source: 'fallback',
    suggest_authorities: false,
    status: 'recorded',
    created_by: 'teacher',
    school_year_key: '2025-2026',
    engine_mode: 'handbook_v2',
    created_at: { seconds: 1 },
  };

  const records = buildViolationRecordsForStudents({
    incidentData,
    selectedStudents: [
      { student_id: 's1', full_name: 'Alice Reyes', student_number: '1001', year_level: 'Grade 10' },
      { student_id: 's2', full_name: 'Bob Santos', student_number: '1002', year_level: 'Grade 10' },
    ],
    existingViolations: [],
    recommendation: { recommendedSanction: 'Warning', offenseNumber: 1, offenseLabel: '1st Offense', schoolYearKey: '2025-2026' },
  });

  assert.equal(records.length, 2);
  assert.equal(records[0].student_id, 's1');
  assert.equal(records[1].student_id, 's2');
  assert.equal(records[0].school_scope, 'high_school');
  assert.equal(records[1].school_scope, 'high_school');
  assert.equal(records[0].group_incident_id, records[1].group_incident_id);
  assert.equal(records[0].group_size, 2);
  assert.equal(records[0].incident_description, 'Group incident during assembly');
});

test('minor offense sequence uses incident date first-come-first-serve, not log order', () => {
  const laterLoggedEarlierIncident = {
    student_id: 's1',
    school_year_key: '2025-2026',
    offense_type: 'minor',
    incident_date: '2026-04-10',
    created_at: { seconds: 100 },
    id: 'later-date-logged-first',
  };

  const priorCount = countPriorMinorOffenses(
    's1',
    '2025-2026',
    [laterLoggedEarlierIncident],
    { incident_date: '2026-04-01' }
  );
  assert.equal(priorCount, 0);

  const rec = evaluateMinorOffense({
    studentId: 's1',
    incidentDate: '2026-04-10',
    offenseId: 'm-l-1-1',
    existingViolations: [
      {
        student_id: 's1',
        school_year_key: '2025-2026',
        offense_type: 'minor',
        incident_date: '2026-04-01',
        created_at: { seconds: 200 },
        id: 'earlier-incident',
      },
    ],
  });
  assert.equal(rec.offenseNumber, 2);
  assert.equal(rec.priorMinorCount, 1);

  const label = formatIdentifiedSanction({
    offense_type: 'minor',
    offense_number: 2,
    school_year_key: '2025-2026',
    recommended_sanction: 'Written warning communicated to the student and parent/guardian notice.',
  });
  assert.match(label, /2nd offense/);
  assert.match(label, /Written warning/);
});

test('group incident sanctions are identified separately for each student', () => {
  const records = buildViolationRecordsForStudents({
    incidentData: {
      incident_date: '2026-04-10',
      offense_type: 'minor',
      offense_id: 'm-l-1-1',
      recommended_sanction: 'Shared placeholder',
      school_year_key: '2025-2026',
    },
    selectedStudents: [
      { student_id: 's1', full_name: 'Alice' },
      { student_id: 's2', full_name: 'Bob' },
    ],
    recommendation: { recommendedSanction: 'Shared placeholder', offenseNumber: 1 },
    existingViolations: [{
      student_id: 's1',
      school_year_key: '2025-2026',
      offense_type: 'minor',
      incident_date: '2026-04-01',
      id: 'prior-s1',
    }],
  });

  assert.match(records[0].identified_sanction, /2nd offense/);
  assert.match(records[1].identified_sanction, /1st offense/);
});

test('identified sanction uses cumulative minor offense number beyond the third tier', () => {
  const label = formatIdentifiedSanction({
    offense_type: 'minor',
    offense_number: 3,
    cumulative_offense_number: 4,
    recommended_sanction: 'Counselor review',
  });

  assert.match(label, /4th offense/);
});

test('resolved mediation is treated as served for status summaries', () => {
  assert.equal(isViolationServed({
    status: 'resolved',
    intervention_type: 'mediation',
    mediation_status: 'resolved',
  }), true);
  assert.equal(isViolationServed({
    status: 'pending',
    intervention_type: 'mediation',
    mediation_status: 'pending',
  }), false);
  assert.equal(isViolationServed({
    status: 'Resolved Through Mediation',
    intervention_type: 'mediation',
  }), true);
  assert.equal(isViolationServed({ status: 'served', intervention_type: 'sanction' }), true);
});
