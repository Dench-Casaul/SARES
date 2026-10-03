import test from "node:test";
import assert from "node:assert/strict";
import { Packer } from "docx";
import { createReportsDocx } from "../src/engine/reportsXlsx.js";

function collectText(node, results = []) {
  if (!node) return results;
  if (typeof node === "string") {
    results.push(node);
    return results;
  }
  if (Array.isArray(node)) {
    node.forEach((entry) => collectText(entry, results));
    return results;
  }
  if (typeof node === "object") {
    if (typeof node.text === "string") {
      results.push(node.text);
    }
    Object.values(node).forEach((value) => collectText(value, results));
  }
  return results;
}

test("creates a 4-column DOCX report with grade level and incident details", async () => {
  const document = createReportsDocx(
    ["Date", "Student Number", "Student Name", "Grade Level", "Incident"],
    [["2026-10-01", "STU-1042", "Jordan Lee", "Grade 10", "Student said <hello> & goodbye"]]
  );
  const buffer = await Packer.toBuffer(document);
  const text = collectText(document).join(" ");

  assert.ok(buffer.length > 0);
  assert.equal(buffer.subarray(0, 4).toString("hex"), "504b0304");
  assert.match(text, /Date/);
  assert.match(text, /Student/);
  assert.match(text, /Violation/);
  assert.match(text, /Outcome/);
  assert.match(text, /Jordan Lee/);
  assert.match(text, /Grade 10/);
  assert.match(text, /Student said/);
});