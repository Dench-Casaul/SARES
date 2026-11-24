import test from "node:test";
import assert from "node:assert/strict";
import { createIncidentReportPdf, getClassificationNotes, getSanctionStatement } from "../src/engine/incidentReportPdf.js";
import { formatIncidentCaseNumber } from "../src/engine/incidentCaseNumber.js";

test("generates a PDF containing case details and filing sections", () => {
  const pdf = createIncidentReportPdf({
    id: "case-104",
    case_number: "2026-01-00020",
    student_name: "Jordan Lee",
    student_number: "136512090001",
    reported_by: "Taylor Kim",
    reporter_role: "teacher",
    incident_date: "2026-10-01",
    group_title: "Academic Dishonesty",
    offense_variety: "Plagiarism",
    incident_description: "Copied text from an unapproved source.",
    parent_contact_notes: "Called parent and agreed to meet.",
    recommended_sanction: "Written warning",
  });
  const output = pdf.output();

  assert.match(output, /^%PDF-/);
  assert.ok(pdf.getNumberOfPages() >= 1);
  assert.match(output, /INCIDENT REPORT FORM/);
  assert.match(output, /Olongapo Wesley School/);
  assert.match(output, /Taylor Kim/);
  assert.match(output, /Teacher/);
  assert.match(output, /136512090001/);
  assert.match(output, /October 1, 2026/);
  assert.match(output, /PARENT\/GUARDIAN NOTES/);
  assert.match(output, /Called parent and agreed to meet/);
  assert.match(output, /Complainant/);
  assert.match(output, /2026-01-00020/);
  assert.match(output, /RA 10173/);
});

test("the form states the handbook classification and labels the sanction as recommended", () => {
  const output = createIncidentReportPdf({
    case_number: "2026-02-00057",
    student_name: "Juan Dela Cruz",
    offense_type: "major",
    subcategory_id: "serious",
    group_title: "Bullying and Harassment",
    offense_variety: "Physical bullying",
    cumulative_offense_number: 2,
    school_year_key: "2026-2027",
    recommended_sanction: "Suspension (5-10 days); disciplinary probation; written commitment from parents/guardians.",
    status: "recorded",
    case_status: "pending_sanction",
  }, undefined, { generatedAt: new Date(2026, 10, 20) }).output();

  assert.match(output, /Major Offense . Serious/);
  assert.match(output, /2nd offense/);
  assert.match(output, /SY 2026-2027/);
  assert.match(output, /RECOMMENDED SANCTION/);
  assert.match(output, /Pending Sanction/);
  assert.match(output, /Written commitment: Pending/);
  // The action actually taken is completed by the Guidance Office, never pre-filled with the recommendation.
  assert.match(output, /to be completed by the Guidance Office/);
  assert.doesNotMatch(output, /Immediate Action Taken/);
  // No keyword-guessed "Nature of Incident" ticks.
  assert.doesNotMatch(output, /\[x\]/);
});

test("mediation cases describe the sanction as conditional or not applied", () => {
  assert.match(
    getSanctionStatement({ intervention_type: "mediation", status: "pending", mediation_status: "pending", recommended_sanction: "Parent conference." }),
    /^Referred for mediation\. If mediation is not successful, the handbook sanction is: Parent conference\.$/
  );
  assert.equal(
    getSanctionStatement({ intervention_type: "mediation", status: "resolved", mediation_status: "resolved", recommended_sanction: "Parent conference." }),
    "None. The case was resolved through mediation."
  );
  assert.deepEqual(getClassificationNotes({}), []);
  assert.equal(getClassificationNotes({ beyond_schedule: true, suggest_authorities: true }).length, 2);
});

test("long narratives continue onto the next page instead of overflowing", () => {
  const pdf = createIncidentReportPdf({
    student_name: "Jordan Lee",
    incident_description: Array.from({ length: 160 }, (_, index) => `Sentence ${index + 1} of a very long incident narrative.`).join(" "),
  });
  assert.ok(pdf.getNumberOfPages() >= 2);
  // PDF text escapes parentheses, so match the label word itself.
  assert.match(pdf.output(), /INCIDENT DESCRIPTION \\\(CONTINUED\\\)/);
});

test("formats case numbers with recording year and system-wide order", () => {
  const recordedAt = new Date(2026, 10, 8);

  assert.equal(formatIncidentCaseNumber(recordedAt, 20), "2026-00020");
  assert.equal(formatIncidentCaseNumber(recordedAt, 21), "2026-00021");
  assert.equal(formatIncidentCaseNumber(recordedAt, 123456), "2026-123456");
  assert.throws(() => formatIncidentCaseNumber(recordedAt, 0), /positive recording order/);
  assert.throws(() => formatIncidentCaseNumber(new Date("invalid"), 1), /valid recording date/);
});