import { jsPDF } from "jspdf";
import { describeRequirementRecord, getParentInvolvementSummary } from "../parentInvolvement.js";
import {
  CASE_STATUS,
  getCaseStatus,
  getCaseStatusLabel,
  getEffectiveCaseStatus,
  isMediationCase,
} from "../caseStatus.js";
import { CONFIDENTIALITY_NOTICE, OFFICE_NAME, SCHOOL_NAME, SYSTEM_NAME } from "../schoolInfo.js";
import { getViolationDescription } from "./violationDescription.js";
import {
  formatLongDate,
  formatLongDateTime,
  formatOffenseClassification,
  formatOffenseNumber,
  formatReporterRole,
} from "./documentFormat.js";

/**
 * Incident Report Form (US Letter). This is the single printable form for a
 * case: the Case Assessment "Print" and "Download PDF" buttons and the student
 * record all produce this same document.
 *
 * Facts recorded in SARES are filled in. Things SARES does not know (time,
 * location, witness details, the action actually taken) are left blank for the
 * Guidance Office to complete by hand, so the form never states a guess as fact.
 */

const MARGIN = 14;
const LINE_HEIGHT = 4.3; // mm per line of 9.5pt text
const FOOTER_SPACE = 24;

function safeText(value, fallback = "") {
  return String(value ?? fallback).split("").filter((character) => {
    const code = character.charCodeAt(0);
    return code === 10 || (code >= 32 && code !== 127);
  }).join("").trim();
}

/** The sanction paragraph: what the handbook recommends, worded for the case's status. */
export function getSanctionStatement(caseData) {
  const sanction = safeText(caseData?.recommended_sanction);
  const status = getCaseStatus(caseData);
  if (status === CASE_STATUS.RESOLVED_MEDIATION) return "None. The case was resolved through mediation.";
  if (status === CASE_STATUS.PENDING_MEDIATION) {
    return sanction
      ? `Referred for mediation. If mediation is not successful, the handbook sanction is: ${sanction}`
      : "Referred for mediation.";
  }
  return sanction || "No sanction is listed for this offense.";
}

/** Notes printed under the classification (repeat offense, authority referral, suspension dates). */
export function getClassificationNotes(caseData) {
  const notes = [];
  if (caseData?.beyond_schedule) {
    notes.push("Repeat offense beyond the handbook schedule: the highest listed sanction applies. Refer to the principal / discipline committee.");
  }
  if (caseData?.suggest_authorities) {
    notes.push("This violation may involve illegal activity. Consider referral to the proper authorities.");
  }
  if (caseData?.suspension_start && caseData?.suspension_end) {
    notes.push(`Suspension: ${formatLongDate(caseData.suspension_start)} to ${formatLongDate(caseData.suspension_end)}.`);
  }
  return notes;
}

export function createIncidentReportPdf(caseData, groupMembers = [caseData], { logo = null, generatedAt = new Date() } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = 12;

  const setText = (size, style = "normal", gray = 20) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(gray);
  };
  const wrap = (text, width) => {
    setText(9.5);
    return text ? doc.splitTextToSize(safeText(text), width) : [];
  };
  const newPage = () => {
    doc.addPage();
    y = 16;
  };
  const ensureSpace = (height) => {
    if (y + height > pageHeight - FOOTER_SPACE) newPage();
  };
  const columns = (fractions) => {
    let x = MARGIN;
    return fractions.map((fraction) => {
      const column = { x, width: contentWidth * fraction };
      x += column.width;
      return column;
    });
  };
  const cellBorder = (x, top, width, height) => {
    doc.setDrawColor(150);
    doc.setLineWidth(0.2);
    doc.rect(x, top, width, height);
  };

  const section = (title, followingHeight = 20) => {
    ensureSpace(followingHeight + 11);
    y += 3;
    setText(10.5, "bold", 15);
    doc.text(title, MARGIN, y + 4);
    y += 6;
    doc.setDrawColor(60);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
    y += 2;
  };

  /** A row of labelled boxes, e.g. [{ label: "Case No.", value: "…" }, …]. */
  const fieldRow = (fields, fractions, minimumHeight = 11) => {
    const layout = columns(fractions);
    const wrapped = fields.map((field, index) => wrap(field.value, layout[index].width - 4));
    const height = Math.max(minimumHeight, 7.5 + Math.max(1, ...wrapped.map((lines) => lines.length)) * LINE_HEIGHT);
    ensureSpace(height);
    fields.forEach((field, index) => {
      const { x, width } = layout[index];
      cellBorder(x, y, width, height);
      setText(7.2, "bold", 95);
      doc.text(field.label.toUpperCase(), x + 2, y + 4);
      if (wrapped[index].length) {
        setText(9.5);
        doc.text(wrapped[index], x + 2, y + 8.6);
      }
    });
    y += height;
  };

  /** A full-width labelled box for longer text; continues onto the next page if needed. */
  const textBlock = (label, text, minimumLines = 2) => {
    let lines = wrap(text, contentWidth - 4);
    if (lines.length === 0) lines = [""];
    let first = true;
    while (lines.length) {
      const available = Math.floor((pageHeight - FOOTER_SPACE - y - 9.5) / LINE_HEIGHT);
      if (available < Math.min(3, lines.length)) {
        newPage();
        continue;
      }
      const chunk = lines.splice(0, available);
      const shownLines = Math.max(first ? minimumLines : 1, chunk.length);
      const height = 7.5 + shownLines * LINE_HEIGHT + 2;
      cellBorder(MARGIN, y, contentWidth, height);
      setText(7.2, "bold", 95);
      doc.text(first ? label.toUpperCase() : `${label.toUpperCase()} (CONTINUED)`, MARGIN + 2, y + 4);
      setText(9.5);
      doc.text(chunk, MARGIN + 2, y + 8.6);
      y += height;
      first = false;
      if (lines.length) newPage();
    }
  };

  /** A boxed area with ruled lines, left blank for handwriting. */
  const ruledBox = (label, lineCount) => {
    const height = 7 + lineCount * 7.5;
    ensureSpace(height);
    cellBorder(MARGIN, y, contentWidth, height);
    setText(7.2, "bold", 95);
    doc.text(label.toUpperCase(), MARGIN + 2, y + 4);
    doc.setDrawColor(200);
    doc.setLineWidth(0.15);
    for (let line = 1; line <= lineCount; line += 1) {
      const lineY = y + 6 + line * 7.5;
      doc.line(MARGIN + 2, lineY, pageWidth - MARGIN - 2, lineY);
    }
    y += height;
  };

  const table = (headers, fractions, rows, minimumRowHeight = 8) => {
    const layout = columns(fractions);
    ensureSpace(7 + minimumRowHeight);
    doc.setFillColor(238, 243, 250);
    doc.rect(MARGIN, y, contentWidth, 7, "F");
    headers.forEach((header, index) => {
      cellBorder(layout[index].x, y, layout[index].width, 7);
      setText(7.2, "bold", 70);
      doc.text(header.toUpperCase(), layout[index].x + 2, y + 4.6);
    });
    y += 7;
    rows.forEach((values) => {
      const wrapped = values.map((value, index) => wrap(value, layout[index].width - 4));
      const height = Math.max(minimumRowHeight, 3.6 + Math.max(1, ...wrapped.map((lines) => lines.length)) * LINE_HEIGHT);
      ensureSpace(height);
      values.forEach((_, index) => {
        cellBorder(layout[index].x, y, layout[index].width, height);
        if (wrapped[index].length) {
          setText(9.5);
          doc.text(wrapped[index], layout[index].x + 2, y + 5.3);
        }
      });
      y += height;
    });
  };

  const note = (text) => {
    const lines = (() => {
      setText(7.8, "italic", 80);
      return doc.splitTextToSize(safeText(text), contentWidth);
    })();
    ensureSpace(lines.length * 3.6 + 2);
    setText(7.8, "italic", 80);
    doc.text(lines, MARGIN, y + 3.8);
    y += lines.length * 3.6 + 1.5;
  };

  // ---- Header ------------------------------------------------------------
  if (logo) {
    try {
      doc.addImage(logo, "PNG", MARGIN, y - 1, 19, 19);
    } catch (error) {
      console.warn("Incident report logo could not be added:", error);
    }
  }
  setText(13.5, "bold", 15);
  doc.text(SCHOOL_NAME, pageWidth / 2, y + 4.5, { align: "center" });
  setText(9.5, "normal", 80);
  doc.text(OFFICE_NAME, pageWidth / 2, y + 9.5, { align: "center" });
  setText(15.5, "bold", 15);
  doc.text("INCIDENT REPORT FORM", pageWidth / 2, y + 17, { align: "center" });
  y += 21.5;
  doc.setDrawColor(40);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 3;

  fieldRow([
    { label: "Case No.", value: caseData.case_number || "Not assigned" },
    { label: "Date Filed", value: formatLongDate(caseData.created_at) || formatLongDate(generatedAt) },
    { label: "School Year", value: caseData.school_year_key ? `SY ${caseData.school_year_key}` : "" },
  ], [1 / 3, 1 / 3, 1 / 3]);

  // ---- I. Reporting party ------------------------------------------------
  section("I. Reporting Party / Complainant");
  fieldRow([
    { label: "Full Name", value: caseData.reported_by },
    { label: "Role", value: formatReporterRole(caseData.reporter_role) },
  ], [0.6, 0.4]);
  fieldRow([
    { label: "Contact Information", value: caseData.reporter_contact },
    { label: "Date & Time of Report", value: formatLongDateTime(caseData.created_at) },
  ], [0.6, 0.4]);

  // ---- II. Persons involved ----------------------------------------------
  section("II. Persons Involved", 16);
  const people = (groupMembers && groupMembers.length ? groupMembers : [caseData]).filter(Boolean);
  table(
    ["Name", "LRN", "Grade Level", "Role in Incident", "Contact Information"],
    [0.27, 0.18, 0.14, 0.17, 0.24],
    people.map((person) => [person.student_name, person.student_number, person.year_level, "Respondent", person.student_contact])
  );
  note("Role in Incident: Respondent, Involved Party, Aggrieved Party, or Other. Correct by hand if needed.");

  // ---- III. Incident details ---------------------------------------------
  section("III. Incident Details", 30);
  fieldRow([
    { label: "Date of Incident", value: formatLongDate(caseData.incident_date) },
    { label: "Time of Incident", value: caseData.incident_time },
    { label: "Location", value: caseData.incident_location },
  ], [0.34, 0.22, 0.44]);
  const description = getViolationDescription(caseData);
  textBlock(description.source ? description.label : "Narrative Description of the Incident", description.text, 3);
  note("Evidence attached:   [  ] Photos     [  ] CCTV footage     [  ] Written statement(s)     [  ] Other: ____________________");

  // ---- IV. Handbook classification ---------------------------------------
  section("IV. Handbook Classification (Student Discipline Handbook)", 36);
  fieldRow([
    { label: "Offense Type and Level", value: formatOffenseClassification(caseData) },
    { label: "Offense Number (This School Year)", value: formatOffenseNumber(caseData) },
  ], [0.5, 0.5]);
  fieldRow([
    { label: "Offense Class", value: caseData.group_title || caseData.category_name },
    { label: "Specific Violation", value: caseData.offense_variety },
  ], [0.5, 0.5]);
  fieldRow([
    { label: "Handling", value: isMediationCase(caseData) ? "Mediation first" : "Handbook sanction" },
    { label: `Case Status (as of ${formatLongDate(generatedAt)})`, value: getCaseStatusLabel(getEffectiveCaseStatus(caseData, generatedAt)) },
  ], [0.5, 0.5]);
  textBlock("Recommended Sanction", getSanctionStatement(caseData), 1);
  getClassificationNotes(caseData).forEach(note);

  const parentItems = getParentInvolvementSummary(caseData);
  if (parentItems.length > 0) {
    textBlock(
      "Parent/Guardian Involvement Required by the Sanction",
      parentItems.map((item) => `${item.label}: ${item.record.status === "pending" ? "Pending" : describeRequirementRecord(item)}`).join("\n"),
      1
    );
  }
  if (caseData.parent_contact_notes) textBlock("Parent/Guardian Notes", caseData.parent_contact_notes, 1);

  // ---- V. Witnesses -------------------------------------------------------
  const witnessNames = String(caseData.witnesses || "").split(/\n|;/).map((name) => name.trim()).filter(Boolean);
  section("V. Witnesses", 7 + 8 * Math.max(2, witnessNames.length));
  table(
    ["Name", "Grade / Section", "Contact Information", "Statement Attached"],
    [0.3, 0.2, 0.3, 0.2],
    Array.from({ length: Math.max(2, witnessNames.length) }, (_, index) => [witnessNames[index] || "", "", "", witnessNames[index] ? "[  ] Yes" : ""])
  );

  // ---- VI. Action taken and signatures -----------------------------------
  section("VI. Action Taken (to be completed by the Guidance Office)", 72);
  ruledBox("Action taken / remarks", 3);
  y += 2;
  setText(9, "normal", 30);
  const certification = doc.splitTextToSize(
    "I certify that the information provided in this report is true and accurate to the best of my knowledge.",
    contentWidth
  );
  doc.text(certification, MARGIN, y + 4);
  y += certification.length * 4 + 4;

  const signatureColumns = columns([1 / 3, 1 / 3, 1 / 3]);
  const signatures = [
    ["Complainant", "Signature over printed name"],
    ["Received / Prepared by", "Guidance Counselor"],
    ["Noted by", "School Principal"],
  ];
  ensureSpace(30);
  signatures.forEach(([title, role], index) => {
    const { x, width } = signatureColumns[index];
    const lineStart = x + (index === 0 ? 0 : 4);
    const lineEnd = x + width - (index === 2 ? 0 : 4);
    setText(8, "bold", 40);
    doc.text(title, lineStart, y + 3);
    doc.setDrawColor(40);
    doc.setLineWidth(0.3);
    doc.line(lineStart, y + 16, lineEnd, y + 16);
    setText(7.8, "normal", 60);
    doc.text(role, lineStart, y + 20);
    doc.text("Date: ____________________", lineStart, y + 26);
  });
  y += 28;

  // ---- Footer on every page ----------------------------------------------
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(190);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, pageHeight - 17, pageWidth - MARGIN, pageHeight - 17);
    setText(6.8, "italic", 95);
    const notice = doc.splitTextToSize(CONFIDENTIALITY_NOTICE, contentWidth - 28);
    doc.text(notice, MARGIN, pageHeight - 13);
    doc.text(`Generated by ${SYSTEM_NAME} on ${formatLongDateTime(generatedAt)}`, MARGIN, pageHeight - 13 + notice.length * 3);
    setText(7.5, "normal", 70);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - MARGIN, pageHeight - 13, { align: "right" });
  }
  doc.setTextColor(0);

  return doc;
}

function reportFileName(caseData) {
  const caseNumber = safeText(caseData.case_number);
  return caseNumber ? `SARES-Incident-Report-${caseNumber}.pdf` : "SARES-Incident-Report.pdf";
}

export function generateIncidentReportPdf(caseData, groupMembers = [caseData], options = {}) {
  createIncidentReportPdf(caseData, groupMembers, options).save(reportFileName(caseData));
}

/**
 * Opens the form in a new tab with the print dialog. Pass a window opened during
 * the click (before any await) so pop-up blockers allow it.
 */
export function printIncidentReportPdf(caseData, groupMembers = [caseData], options = {}, targetWindow = null) {
  const doc = createIncidentReportPdf(caseData, groupMembers, options);
  doc.autoPrint();
  const url = doc.output("bloburl");
  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = url;
  } else {
    window.open(url, "_blank");
  }
}
