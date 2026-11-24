import { jsPDF } from "jspdf";
import { CONFIDENTIALITY_NOTICE, OFFICE_NAME, SCHOOL_NAME, SYSTEM_NAME } from "../schoolInfo.js";
import {
  formatLongDate,
  formatLongDateTime,
  formatOffenseClassification,
  formatOffenseNumber,
} from "./documentFormat.js";

/**
 * Parent/Guardian Written Commitment form (US Letter), printed for the parent to
 * sign when a case's sanction requires a written commitment from the parents.
 *
 * Case facts are filled in from SARES. The parent's name, relationship, and the
 * specific commitments are filled in when the counselor has already entered them;
 * otherwise blank lines are left for handwriting. The signing date is always left
 * blank, because the form is printed before it is signed.
 */

const MARGIN = 16;
const LINE_HEIGHT = 4.6;
const FOOTER_SPACE = 20;
const RULE_SPACING = 7.5; // mm between handwriting lines, as on the Incident Report Form
const BLANK_NAME = "____________________________";
const BLANK_RELATIONSHIP = "______________";

function safeText(value, fallback = "") {
  return String(value ?? fallback).split("").filter((character) => {
    const code = character.charCodeAt(0);
    return code === 10 || (code >= 32 && code !== 127);
  }).join("").trim();
}

/** The commitment statement, with the parent's name and relationship when known. */
export function getCommitmentStatement({ parentName = "", relationship = "" } = {}) {
  const name = safeText(parentName) || BLANK_NAME;
  const relation = safeText(relationship).toLowerCase() || BLANK_RELATIONSHIP;
  return `I, ${name}, ${relation} of the student named above, have been informed by the Guidance Office `
    + "of the offense and sanction stated in this form under the school's student discipline policy. "
    + "I commit to work with the school to help my child follow its rules and correct this behavior.";
}

export const REPEAT_OFFENSE_NOTICE = "I understand that a repeat of this or a similar offense may result in a "
  + "higher sanction under the school's student discipline policy.";

export const STUDENT_ACKNOWLEDGMENT = "I, the student named above, understand this commitment and promise to "
  + "follow the rules of the school.";

/**
 * @param caseData  the violation record (student, offense, sanction, case number)
 * @param details   { parentName, relationship, commitment } entered by the counselor, if any
 */
export function createCommitmentFormPdf(caseData = {}, details = {}, { logo = null, generatedAt = new Date() } = {}) {
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
  const ensureSpace = (height) => {
    if (y + height > pageHeight - FOOTER_SPACE) {
      doc.addPage();
      y = 16;
    }
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
  /** A row of labelled boxes. */
  const fieldRow = (fields, fractions) => {
    let x = MARGIN;
    const layout = fractions.map((fraction) => {
      const column = { x, width: contentWidth * fraction };
      x += column.width;
      return column;
    });
    setText(9.5);
    const wrapped = fields.map((field, index) => (
      field.value ? doc.splitTextToSize(safeText(field.value), layout[index].width - 4) : []
    ));
    const height = Math.max(11, 7.5 + Math.max(1, ...wrapped.map((lines) => lines.length)) * 4.3);
    ensureSpace(height);
    fields.forEach((field, index) => {
      const { x: left, width } = layout[index];
      cellBorder(left, y, width, height);
      setText(7.2, "bold", 95);
      doc.text(field.label.toUpperCase(), left + 2, y + 4);
      if (wrapped[index].length) {
        setText(9.5);
        doc.text(wrapped[index], left + 2, y + 8.6);
      }
    });
    y += height;
  };
  const paragraph = (text, { size = 10, style = "normal", gap = 3 } = {}) => {
    setText(size, style, 25);
    const lines = doc.splitTextToSize(safeText(text), contentWidth);
    ensureSpace(lines.length * LINE_HEIGHT + gap);
    // Line spacing matches LINE_HEIGHT (4.6 mm) at 10 pt, so the next block never overlaps.
    doc.text(lines, MARGIN, y + 4, { lineHeightFactor: (LINE_HEIGHT / 25.4 * 72) / size });
    y += lines.length * LINE_HEIGHT + gap;
  };
  /**
   * The specific commitments in a labelled box: the counselor's typed text when
   * given (on the ruled lines, with one spare line), otherwise ruled lines to write on.
   */
  const commitmentBox = (label, text) => {
    setText(10);
    const typed = safeText(text) ? doc.splitTextToSize(safeText(text), contentWidth - 8) : [];
    const ruledLines = Math.max(4, typed.length + 1);
    const height = 6 + ruledLines * RULE_SPACING;
    ensureSpace(height);
    cellBorder(MARGIN, y, contentWidth, height);
    setText(7.2, "bold", 95);
    doc.text(label.toUpperCase(), MARGIN + 2, y + 4);
    doc.setDrawColor(200);
    doc.setLineWidth(0.15);
    for (let line = 1; line <= ruledLines; line += 1) {
      const lineY = y + 4 + line * RULE_SPACING;
      doc.line(MARGIN + 3, lineY, pageWidth - MARGIN - 3, lineY);
    }
    if (typed.length) {
      setText(10, "normal", 20);
      typed.forEach((lineText, index) => doc.text(lineText, MARGIN + 4, y + 4 + (index + 1) * RULE_SPACING - 1.5));
    }
    y += height + 3;
  };
  /** Two signature blocks side by side. */
  const signatureRow = (blocks) => {
    const height = 16 + Math.max(...blocks.map(([, lines]) => lines.length)) * 4.5;
    ensureSpace(height);
    const half = contentWidth / 2;
    blocks.forEach(([title, lines], index) => {
      const left = MARGIN + index * half + (index === 0 ? 0 : 6);
      const right = MARGIN + (index + 1) * half - (index === 0 ? 6 : 0);
      setText(8, "bold", 40);
      doc.text(title, left, y + 3);
      doc.setDrawColor(40);
      doc.setLineWidth(0.3);
      doc.line(left, y + 12, right, y + 12);
      setText(7.8, "normal", 60);
      lines.forEach((lineText, lineIndex) => doc.text(lineText, left, y + 16 + lineIndex * 4.5));
    });
    y += height;
  };

  // ---- Header ------------------------------------------------------------
  if (logo) {
    try {
      doc.addImage(logo, "PNG", MARGIN, y - 1, 19, 19);
    } catch (error) {
      console.warn("Commitment form logo could not be added:", error);
    }
  }
  setText(13.5, "bold", 15);
  doc.text(SCHOOL_NAME, pageWidth / 2, y + 4.5, { align: "center" });
  setText(9.5, "normal", 80);
  doc.text(OFFICE_NAME, pageWidth / 2, y + 9.5, { align: "center" });
  setText(15, "bold", 15);
  doc.text("PARENT/GUARDIAN WRITTEN COMMITMENT", pageWidth / 2, y + 17, { align: "center" });
  y += 21.5;
  doc.setDrawColor(40);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 3;

  fieldRow([
    { label: "Case No.", value: caseData.case_number || "Not assigned" },
    { label: "Date of Incident", value: formatLongDate(caseData.incident_date) },
    { label: "School Year", value: caseData.school_year_key ? `SY ${caseData.school_year_key}` : "" },
  ], [1 / 3, 1 / 3, 1 / 3]);

  // ---- I. Student, offense, and sanction ----------------------------------
  section("I. Student and Offense", 46);
  fieldRow([
    { label: "Student Name", value: caseData.student_name },
    { label: "LRN", value: caseData.student_number },
    { label: "Grade Level", value: caseData.year_level },
  ], [0.5, 0.25, 0.25]);

  fieldRow([
    { label: "Offense Class", value: caseData.group_title || caseData.category_name },
    { label: "Specific Violation", value: caseData.offense_variety },
  ], [0.5, 0.5]);
  fieldRow([
    { label: "Offense Type and Level", value: formatOffenseClassification(caseData) },
    { label: "Offense Number (This School Year)", value: formatOffenseNumber(caseData) },
  ], [0.5, 0.5]);
  fieldRow([
    { label: "Sanction", value: caseData.recommended_sanction || "" },
  ], [1]);

  // ---- II. Commitment ------------------------------------------------------
  section("II. Commitment of the Parent/Guardian", 64);
  paragraph(getCommitmentStatement(details));
  commitmentBox("Specifically, I commit to:", details.commitment);
  paragraph(REPEAT_OFFENSE_NOTICE);

  // ---- III. Signatures -----------------------------------------------------
  section("III. Signatures", 59); // both signature rows + the student acknowledgment
  signatureRow([
    ["Parent/Guardian", ["Signature over printed name", "Date: ____________________"]],
    ["Student", ["Signature over printed name", "Date: ____________________"]],
  ]);
  paragraph(STUDENT_ACKNOWLEDGMENT, { size: 8.5, style: "italic", gap: 3 });
  signatureRow([
    ["Witnessed by", ["Guidance Counselor", "Date: ____________________"]],
    ["Noted by", ["School Principal", "Date: ____________________"]],
  ]);

  // ---- Footer on every page -------------------------------------------------
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

/**
 * Opens the form in a new tab with the print dialog. Pass a window opened during
 * the click (before any await) so pop-up blockers allow it.
 */
export function printCommitmentFormPdf(caseData, details = {}, options = {}, targetWindow = null) {
  const doc = createCommitmentFormPdf(caseData, details, options);
  doc.autoPrint();
  const url = doc.output("bloburl");
  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = url;
  } else {
    window.open(url, "_blank");
  }
}
