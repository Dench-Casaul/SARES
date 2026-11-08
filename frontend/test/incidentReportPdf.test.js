import test from "node:test";
import assert from "node:assert/strict";
import { createIncidentReportPdf } from "../src/engine/incidentReportPdf.js";
import { formatIncidentCaseNumber } from "../src/engine/incidentCaseNumber.js";

test("generates a PDF containing case details and filing sections", () => {
  const pdf = createIncidentReportPdf({
    id: "case-104",
    case_number: "2026-01-00020",
    student_name: "Jordan Lee",
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
  assert.equal(pdf.getNumberOfPages(), 2);
  assert.match(output, /INCIDENT REPORT FORM/);
  assert.match(output, /Taylor Kim/);
  assert.match(output, /Parent\/Guardian Involvement/);
  assert.match(output, /Called parent and agreed to meet/);
  assert.match(output, /Complainant/);
  assert.match(output, /2026-01-00020/);
});

test("formats case numbers with recording year, offense code, and global sequence", () => {
  const recordedAt = new Date(2026, 10, 8);

  assert.equal(formatIncidentCaseNumber("minor", recordedAt, 20), "2026-01-00020");
  assert.equal(formatIncidentCaseNumber("major", recordedAt, 21), "2026-02-00021");
  assert.throws(() => formatIncidentCaseNumber("other", recordedAt, 1), /Unsupported offense type/);
});