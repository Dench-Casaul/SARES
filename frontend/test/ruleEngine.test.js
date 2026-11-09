import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildViolationRecordsForStudents,
  countPriorOffenses,
  evaluateOffense,
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
    ai_assisted_solution: 'Consider a restorative conversation.',
    ai_assisted_solution_source: 'gemini',
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
  assert.equal(records[0].ai_assisted_solution, 'Consider a restorative conversation.');
  assert.equal(records[1].ai_assisted_solution_source, 'gemini');
});

test('offense-level count uses incident date first-come-first-serve, not log order', () => {
  const laterLoggedEarlierIncident = {
    student_id: 's1',
    school_year_key: '2025-2026',
    offense_type: 'minor',
    subcategory_id: 'light',
    incident_date: '2026-04-10',
    created_at: { seconds: 100 },
    id: 'later-date-logged-first',
  };

  const priorCount = countPriorOffenses(
    's1',
    '2025-2026',
    'light',
    [laterLoggedEarlierIncident],
    { incident_date: '2026-04-01' }
  );
  assert.equal(priorCount, 0);

  const rec = evaluateOffense({
    studentId: 's1',
    incidentDate: '2026-04-10',
    offenseId: 'm-l-1-1',
    subcategoryId: 'light',
    schoolScope: 'elementary',
    existingViolations: [
      {
        student_id: 's1',
        school_year_key: '2025-2026',
        offense_type: 'minor',
        subcategory_id: 'light',
        incident_date: '2026-04-01',
        created_at: { seconds: 200 },
        id: 'earlier-incident',
      },
    ],
  });
  assert.equal(rec.offenseNumber, 2);
  assert.equal(rec.priorOffenseCount, 1);
  assert.match(rec.recommendedSanction, /Verbal\/written reminder to parents/);

  const label = formatIdentifiedSanction({
    offense_type: 'minor',
    offense_number: 2,
    school_year_key: '2025-2026',
    recommended_sanction: 'Written warning communicated to the student and parent/guardian notice.',
  });
  assert.match(label, /2nd offense/);
  assert.match(label, /Written warning/);
});

test('group incident sanctions use each student school-level schedule and offense history', () => {
  const records = buildViolationRecordsForStudents({
    incidentData: {
      incident_date: '2026-04-10',
      offense_type: 'minor',
      subcategory_id: 'light',
      offense_id: 'm-l-1-1',
      recommended_sanction: 'Shared placeholder',
      school_year_key: '2025-2026',
    },
    selectedStudents: [
      { student_id: 's1', full_name: 'Alice', year_level: 'Grade 5' },
      { student_id: 's2', full_name: 'Bob', year_level: 'Grade 10' },
    ],
    recommendation: { recommendedSanction: 'Shared placeholder', offenseNumber: 1 },
    existingViolations: [{
      student_id: 's1',
      school_year_key: '2025-2026',
      offense_type: 'minor',
      subcategory_id: 'light',
      incident_date: '2026-04-01',
      id: 'prior-s1',
    }],
  });

  assert.match(records[0].identified_sanction, /2nd offense/);
  assert.match(records[1].identified_sanction, /1st offense/);
  assert.match(records[0].recommended_sanction, /Verbal\/written reminder to parents/);
  assert.match(records[1].recommended_sanction, /Verbal warning by subject teacher\/adviser/);
  assert.equal(records[0].offense_number, 2);
  assert.equal(records[1].offense_number, 1);
  assert.equal('severity_score' in records[0], false);
});

test('offense counts are cumulative within a level but not across levels', () => {
  const rec = evaluateOffense({
    studentId: 's1',
    incidentDate: '2026-04-10',
    offenseId: 'm-l-1-2',
    subcategoryId: 'light',
    schoolScope: 'elementary',
    existingViolations: [
      { student_id: 's1', school_year_key: '2025-2026', subcategory_id: 'light', incident_date: '2026-04-01', id: 'same-level' },
      { student_id: 's1', school_year_key: '2025-2026', subcategory_id: 'less_serious', incident_date: '2026-04-02', id: 'different-level' },
    ],
  });
  assert.equal(rec.offenseNumber, 2);
});

test('serious-offense sanctions differ between Elementary and High School schedules', () => {
  const elementaryRec = evaluateOffense({
    studentId: 's1',
    incidentDate: '2026-04-10',
    offenseId: 'M-s-1-1',
    subcategoryId: 'serious',
    schoolScope: 'elementary',
    existingViolations: [{
      student_id: 's1',
      school_year_key: '2025-2026',
      subcategory_id: 'serious',
      incident_date: '2026-04-01',
      id: 'prior-serious',
    }],
  });
  const highSchoolRec = evaluateOffense({
    studentId: 's2',
    incidentDate: '2026-04-10',
    offenseId: 'M-s-1-1',
    subcategoryId: 'serious',
    schoolScope: 'high_school',
  });

  assert.match(elementaryRec.recommendedSanction, /Suspension \(1-2 days\)/);
  assert.match(highSchoolRec.recommendedSanction, /Suspension \(5-10 days\)/);
});

test('offense levels without a later schedule do not invent another sanction', () => {
  const rec = evaluateOffense({
    studentId: 's1',
    incidentDate: '2026-04-10',
    offenseId: 'M-s-1-1',
    subcategoryId: 'serious',
    schoolScope: 'high_school',
    existingViolations: [
      { student_id: 's1', school_year_key: '2025-2026', subcategory_id: 'serious', incident_date: '2026-04-01', id: 'prior-serious' },
      { student_id: 's1', school_year_key: '2025-2026', subcategory_id: 'serious', incident_date: '2026-04-02', id: 'second-serious' },
    ],
  });
  assert.equal(rec.offenseNumber, 3);
  assert.match(rec.recommendedSanction, /No additional sanction is listed/);
});

test('identified sanction includes the offense number and school level, not a severity score', () => {
  const label = formatIdentifiedSanction({
    offense_type: 'major',
    subcategory_id: 'serious',
    school_scope: 'high_school',
    offense_number: 2,
    recommended_sanction: 'Counselor review',
  });

  assert.match(label, /2nd offense/);
  assert.match(label, /High School/);
  assert.doesNotMatch(label, /score/i);
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
