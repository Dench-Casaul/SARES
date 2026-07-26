import test from 'node:test';
import assert from 'node:assert/strict';
import { buildViolationRecordsForStudents } from '../src/engine/ruleEngine.js';

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
  assert.equal(records[0].group_incident_id, records[1].group_incident_id);
  assert.equal(records[0].group_size, 2);
  assert.equal(records[0].incident_description, 'Group incident during assembly');
});
