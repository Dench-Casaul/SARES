import test from "node:test";
import assert from "node:assert/strict";
import { strFromU8, unzipSync } from "fflate";
import { createReportsXlsx } from "../src/engine/reportsXlsx.js";

test("creates an XLSX workbook with readable widths and escaped report values", () => {
  const workbook = createReportsXlsx(
    ["Date", "Student Number", "Incident"],
    [["2026-10-01", "STU-1042", "Student said <hello> & goodbye"]],
    [14, 20, 48]
  );
  const files = unzipSync(workbook);
  const worksheet = strFromU8(files["xl/worksheets/sheet1.xml"]);

  assert.ok(files["[Content_Types].xml"]);
  assert.ok(files["xl/workbook.xml"]);
  assert.match(worksheet, /width="14"/);
  assert.match(worksheet, /2026-10-01/);
  assert.match(worksheet, /Student Number/);
  assert.match(worksheet, /Student said &lt;hello&gt; &amp; goodbye/);
});