import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Packer } from "docx";
import { strFromU8, unzipSync } from "fflate";
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

test("creates a readable A4 landscape DOCX with key incident details", async () => {
  const document = createReportsDocx(
    ["Date", "Student Number", "Student Name", "Grade Level", "Incident"],
    [
      ["2026-10-01", "STU-1042", "Jordan Lee", "Grade 10", "Major Offense", "Student said <hello> & goodbye", "OFF-12", "Counseling", "Pending", "light"],
      ["2026-10-02", "STU-1043", "Alex Kim", "Grade 9", "Minor Offense", "Violation 2", "OFF-13", "Warning", "Pending", "less_serious"],
      ["2026-10-03", "STU-1044", "Sam Lee", "Grade 8", "Major Offense", "Violation 3", "OFF-14", "Suspension", "Pending", "serious"],
      ["2026-10-04", "STU-1045", "Taylor Kim", "Grade 7", "Major Offense", "Violation 4", "OFF-15", "Suspension", "Pending", "very_serious"],
    ]
  );
  const buffer = await Packer.toBuffer(document);
  const text = collectText(document).join(" ");
  const archive = unzipSync(buffer);
  const xml = strFromU8(archive["word/document.xml"]);

  assert.ok(buffer.length > 0);
  assert.equal(buffer.subarray(0, 4).toString("hex"), "504b0304");
  const pageSize = xml.match(/<w:pgSz\b[^>]*\/>/)?.[0];
  assert.ok(pageSize);
  assert.match(pageSize, /w:w="16838"/);
  assert.match(pageSize, /w:h="11906"/);
  assert.match(pageSize, /w:orient="landscape"/);
  for (const width of [1900, 3300, 6500, 3698]) {
    assert.ok(xml.includes(`<w:gridCol w:w="${width}"/>`));
  }
  assert.match(text, /Date/);
  assert.match(text, /Student/);
  assert.match(text, /Violation/);
  assert.match(text, /Outcome/);
  assert.match(text, /Jordan Lee/);
  assert.match(text, /Name: Jordan Lee/);
  assert.match(text, /STU-1042/);
  assert.match(text, /ID: STU-1042/);
  assert.match(text, /Grade 10/);
  assert.match(text, /Major Offense/);
  assert.match(text, /Offense Type: Light/);
  assert.match(text, /Offense Type: Less Serious/);
  assert.match(text, /Offense Type: Serious/);
  assert.match(text, /Offense Type: Very Serious/);
  assert.match(text, /OFF-12/);
  assert.match(text, /Student said/);
  assert.match(text, /Counseling/);
  assert.match(text, /Pending/);
  assert.doesNotMatch(text, /This report includes/);
});

test("adds the SARES header, selected date scope, and generation timestamp", async () => {
  const generatedAt = new Date(2026, 10, 8, 11, 58);
  const logoData = new Uint8Array(readFileSync(new URL("../src/assets/sares-logo.png", import.meta.url)));
  const document = createReportsDocx([], [], { dateRange: "7", generatedAt, logoData });
  const archive = unzipSync(await Packer.toBuffer(document));
  const documentXml = strFromU8(archive["word/document.xml"]);
  const headerXml = strFromU8(archive["word/header1.xml"]);
  const relationshipsXml = strFromU8(archive["word/_rels/header1.xml.rels"]);

  assert.match(documentXml, /<w:pgMar\b[^>]*w:header="0"/);
  assert.match(headerXml, /SARES/);
  assert.match(headerXml, /Scope: November 1, 2026 - November 8, 2026/);
  assert.match(headerXml, /Generated on: November 8, 2026 at 11:58 AM/);
  assert.match(headerXml, /<w:drawing>/);
  assert.match(headerXml, /<wp:extent cx="742950" cy="742950"\/>/);
  assert.equal((headerXml.match(/<w:vAlign w:val="center"\/>/g) || []).length, 4);
  assert.match(relationshipsXml, /media\/[^"]+\.png/);
});