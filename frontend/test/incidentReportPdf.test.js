import test from "node:test";
import assert from "node:assert/strict";
import { createIncidentReportPdf } from "../src/engine/incidentReportPdf.js";

test("generates a PDF containing case details and filing sections", () => {
  const pdf = createIncidentReportPdf({
    id: "case-104",
    student_name: "Jordan Lee",
    reported_by: "Taylor Kim",
    reporter_role: "teacher",
    incident_date: "2026-10-01",
    group_title: "Academic Dishonesty",
    offense_variety: "Plagiarism",
    incident_description: "Copied text from an unapproved source.",
    recommended_sanction: "Written warning",
  });
  const output = pdf.output();

  assert.match(output, /^%PDF-/);
  assert.match(output, /INCIDENT REPORT FORM/);
  assert.match(output, /Taylor Kim/);
  assert.match(output, /Complainant/);
});