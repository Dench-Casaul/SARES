import test from "node:test";
import assert from "node:assert/strict";
import { createCommitmentFormPdf, getCommitmentStatement } from "../src/engine/commitmentFormPdf.js";

const CASE = {
  case_number: "2026-00031",
  student_name: "Jordan Lee",
  student_number: "136512090001",
  year_level: "8th Grade",
  incident_date: "2026-10-01",
  school_year_key: "2026-2027",
  offense_type: "minor",
  subcategory_id: "serious",
  offense_number: 3,
  group_title: "Dress Code and Uniform Violations",
  offense_variety: "Wearing improper uniform",
  recommended_sanction: "Written commitment from parents/guardians.",
};

test("generates the commitment form with case details and signature lines", () => {
  const pdf = createCommitmentFormPdf(CASE);
  const output = pdf.output();

  assert.match(output, /^%PDF-/);
  assert.equal(pdf.getNumberOfPages(), 1);
  assert.match(output, /PARENT\/GUARDIAN WRITTEN COMMITMENT/);
  assert.match(output, /Olongapo Wesley School/);
  assert.match(output, /2026-00031/);
  assert.match(output, /Jordan Lee/);
  assert.match(output, /136512090001/);
  assert.match(output, /October 1, 2026/);
  assert.match(output, /Wearing improper uniform/);
  assert.match(output, /Written commitment from parents/);
  assert.match(output, /SPECIFICALLY, I COMMIT TO:/);
  assert.match(output, /Witnessed by/);
  assert.match(output, /School Principal/);
  assert.match(output, /RA 10173/);
});

test("prints the commitments the counselor already entered", () => {
  const output = createCommitmentFormPdf(CASE, {
    parentName: "Maria Lee",
    relationship: "Mother",
    commitment: "Check my child's uniform every school morning.",
  }).output();

  assert.match(output, /Maria Lee/);
  assert.match(output, /Check my child's uniform every school morning/);
});

test("leaves blanks for the parent's name and relationship when unknown", () => {
  const blank = getCommitmentStatement();
  assert.match(blank, /^I, _+, _+ of the student named above/);

  const filled = getCommitmentStatement({ parentName: "Maria Lee", relationship: "Mother" });
  assert.match(filled, /^I, Maria Lee, mother of the student named above/);
});

test("a long commitment still fits and missing case data does not break the form", () => {
  const pdf = createCommitmentFormPdf({}, { commitment: "Attend every follow-up meeting. ".repeat(40) });
  assert.match(pdf.output(), /Not assigned/);
  assert.ok(pdf.getNumberOfPages() >= 1);
});
