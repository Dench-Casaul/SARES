import { jsPDF } from "jspdf";
import { getViolationDescription } from "./violationDescription.js";

const INCIDENT_NATURES = [
  ["Bullying / Harassment", ["bullying", "harassment"]],
  ["Fighting / Physical Altercation", ["fight", "physical"]],
  ["Verbal Abuse", ["verbal", "abuse"]],
  ["Property Damage / Vandalism", ["property damage", "vandalism"]],
  ["Academic Dishonesty", ["academic dishonesty", "cheating", "plagiarism"]],
  ["Substance Use", ["substance", "drug", "alcohol"]],
  ["Truancy / Cutting Classes", ["truancy", "cutting class", "absence"]],
  ["Insubordination", ["insubordination", "disrespect"]],
];

function safeText(value, fallback = "") {
  return String(value ?? fallback).split("").filter((character) => {
    const code = character.charCodeAt(0);
    return code >= 32 && code !== 127;
  }).join("").trim();
}

function cellHeight(doc, width, label, value, minimumHeight) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(safeText(value), width - 4);
  const firstLineHeight = label ? 13 : 10;
  const textHeight = value ? firstLineHeight + Math.max(0, lines.length - 1) * 4 : (label ? 8 : 0);
  return Math.max(minimumHeight, textHeight);
}

function drawCell(doc, x, y, width, height, label, value = "") {
  doc.setDrawColor(130);
  doc.rect(x, y, width, height);
  if (label) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(label, x + 2, y + 4.5);
  }
  if (!value) return;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(safeText(value), width - 4);
  doc.text(lines, x + 2, y + (label ? 9 : 6));
}

export function createIncidentReportPdf(caseData, groupMembers = [caseData]) {
  const description = getViolationDescription(caseData);
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 13;
  const contentWidth = pageWidth - margin * 2;
  const halfWidth = contentWidth / 2;
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 14;

  const section = (title) => {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, margin, y + 4);
    y += 7;
    doc.setDrawColor(70);
    doc.line(margin, y, pageWidth - margin, y);
    y += 2;
  };

  const addParagraph = (label, value, minimumHeight = 15) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(safeText(value), contentWidth - 4);
    const height = Math.max(minimumHeight, 13 + Math.max(0, lines.length - 1) * 4);
    if (y + height > pageHeight - 16) {
      doc.addPage();
      y = 16;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(label, margin, y + 4);
    doc.setDrawColor(145);
    doc.line(margin, y + height, pageWidth - margin, y + height);
    doc.setFont("helvetica", "normal");
    doc.text(lines, margin + 1, y + 9);
    y += height + 2;
  };

  const drawRow = (cells, minimumHeight = 10) => {
    const height = Math.max(
      minimumHeight,
      ...cells.map((cell) => cellHeight(doc, cell.width, cell.label, cell.value, minimumHeight))
    );
    if (y + height > pageHeight - 16) {
      doc.addPage();
      y = 16;
    }
    cells.forEach((cell) => drawCell(doc, cell.x, y, cell.width, height, cell.label, cell.value));
    y += height;
    return height;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("INCIDENT REPORT FORM", pageWidth / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text("Student Discipline / Guidance Office", pageWidth / 2, y, { align: "center" });
  y += 5;
  drawRow([
    { x: margin, width: halfWidth, label: "Case No.", value: caseData.case_number || "Not Assigned" },
    { x: margin + halfWidth, width: halfWidth, label: "Date Filed", value: caseData.created_at?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString() },
  ], 11);

  section("I. Reporting Party / Complainant");
  drawRow([
    { x: margin, width: halfWidth, label: "Full Name", value: caseData.reported_by },
    { x: margin + halfWidth, width: halfWidth, label: "Date & Time of Report", value: "" },
  ], 15);
  drawRow([
    { x: margin, width: halfWidth, label: "Role", value: caseData.reporter_role },
    { x: margin + halfWidth, width: halfWidth, label: "Grade/Section & Contact No.", value: [caseData.reporter_grade_section, caseData.reporter_contact].filter(Boolean).join(" / ") },
  ], 19);

  section("II. Persons Involved");
  const peopleHeaders = ["Name", "Grade / Section", "Role in Incident", "Contact Information"];
  const peopleWidths = [0.25, 0.22, 0.25, 0.28].map((fraction) => contentWidth * fraction);
  let x = margin;
  drawRow(peopleHeaders.map((header, index) => {
    const cell = { x, width: peopleWidths[index], label: header, value: "" };
    x += peopleWidths[index];
    return cell;
  }), 9);
  const people = groupMembers.length ? groupMembers : [caseData];
  people.forEach((person) => {
    x = margin;
    const values = [person.student_name, person.year_level, "Respondent", person.student_contact];
    drawRow(values.map((value, index) => {
      const cell = { x, width: peopleWidths[index], label: "", value };
      x += peopleWidths[index];
      return cell;
    }), 10);
  });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.text("Role in Incident: Respondent, Involved Party, Aggrieved Party, or Other.", margin, y + 4);
  y += 6;

  if (y + 65 > pageHeight - 16) {
    doc.addPage();
    y = 16;
  }
  section("III. Incident Details");
  drawRow([
    { x: margin, width: halfWidth, label: "Date of Incident", value: caseData.incident_date },
    { x: margin + halfWidth, width: halfWidth, label: "Time of Incident", value: caseData.incident_time },
  ], 13);
  drawRow([
    { x: margin, width: halfWidth, label: "Location", value: caseData.incident_location },
    { x: margin + halfWidth, width: halfWidth, label: "Reported By (if different from complainant)", value: caseData.reported_by },
  ], 13);

  const incidentText = [caseData.group_title, caseData.offense_variety, caseData.incident_description].join(" ").toLowerCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Nature of Incident (check all that apply):", margin, y + 5);
  y += 8;
  doc.setFont("helvetica", "normal");
  const natureLines = [
    INCIDENT_NATURES.slice(0, 4),
    [...INCIDENT_NATURES.slice(4), ["Other", []]],
  ];
  natureLines.forEach((line) => {
    const labels = line.map(([label, terms]) => {
      const selected = terms.some((term) => incidentText.includes(term));
      return `${selected ? "[x]" : "[ ]"} ${label}`;
    });
    const wrappedLabels = doc.splitTextToSize(labels.join("     "), contentWidth);
    doc.text(wrappedLabels, margin, y + 4);
    y += wrappedLabels.length * 4;
  });
  y += 2;
  addParagraph(description.label, description.text, 24);
  if (caseData.parent_contact_notes) {
    addParagraph("Parent/Guardian Involvement", caseData.parent_contact_notes, 15);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Evidence / Attachments:", margin, y + 4);
  y += 7;
  const evidenceFiles = Array.isArray(caseData.evidence_urls) ? caseData.evidence_urls : [];
  const evidenceLabels = ["Photos", "CCTV Footage", "Written Statement(s)", "Other"].map((label) => {
    const selected = evidenceFiles.some((file) => label === "Photos"
      ? file.contentType?.startsWith("image/")
      : label === "CCTV Footage" ? /cctv|video/i.test(file.name || "")
        : label === "Written Statement(s)" ? /statement/i.test(file.name || "") : false);
    return `${selected ? "[x]" : "[ ]"} ${label}`;
  });
  doc.setFont("helvetica", "normal");
  const wrappedEvidenceLabels = doc.splitTextToSize(evidenceLabels.join("     "), contentWidth);
  doc.text(wrappedEvidenceLabels, margin, y + 3);
  y += wrappedEvidenceLabels.length * 4;
  if (evidenceFiles.length) addParagraph("Attached Files", evidenceFiles.map((file) => file.name).join(", "), 9);

  y += 2;
  const witnessNames = String(caseData.witnesses || "").split(/\n|;/).map((name) => name.trim()).filter(Boolean);
  const witnessHeaders = ["Name", "Grade / Section", "Contact Information", "Statement Attached"];
  const witnessWidths = [0.25, 0.24, 0.30, 0.21].map((fraction) => contentWidth * fraction);
  const witnessRows = Array.from({ length: Math.max(3, witnessNames.length) }, (_, index) => [
    witnessNames[index] || "",
    "",
    "",
    witnessNames[index] ? "[ ]" : "",
  ]);
  const witnessHeaderHeight = Math.max(9, ...witnessHeaders.map((header, index) => cellHeight(doc, witnessWidths[index], header, "", 9)));
  const witnessTotalHeight = witnessHeaderHeight + witnessRows.reduce((total, values) => (
    total + Math.max(10, ...values.map((value, index) => cellHeight(doc, witnessWidths[index], "", value, 10)))
  ), 0);
  if (y + 13 + witnessTotalHeight + 8 > pageHeight - 15) {
    doc.addPage();
    y = 16;
  }
  section("IV. Witnesses");
  x = margin;
  drawRow(witnessHeaders.map((header, index) => {
    const cell = { x, width: witnessWidths[index], label: header, value: "" };
    x += witnessWidths[index];
    return cell;
  }), 9);
  witnessRows.forEach((values) => {
    x = margin;
    drawRow(values.map((value, column) => {
      const cell = { x, width: witnessWidths[column], label: "", value };
      x += witnessWidths[column];
      return cell;
    }), 10);
  });

  const actionText = caseData.action_taken || caseData.recommended_sanction ||
    (String(caseData.intervention_type).toLowerCase() === "mediation" ? "Referred for mediation." : "");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const actionLines = doc.splitTextToSize(safeText(actionText), contentWidth - 4);
  const actionParagraphHeight = Math.max(38, 13 + Math.max(0, actionLines.length - 1) * 4) + 2;
  doc.setFontSize(9);
  const certification = "I certify that the information provided in this report is true and accurate to the best of my knowledge.";
  const certificationLines = doc.splitTextToSize(certification, contentWidth);
  const actionSectionHeight = 13 + actionParagraphHeight + 22 + 29;
  if (y + actionSectionHeight > pageHeight - 15) {
    doc.addPage();
    y = 16;
  }
  section("V. Action Taken");
  addParagraph("Immediate Action Taken", actionText, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(certificationLines, margin, y + 9);
  y += 22;

  const signatureWidth = halfWidth - 7;
  const drawSignature = (signatureX, label, dateLabel) => {
    doc.setDrawColor(50);
    doc.line(signatureX, y + 16, signatureX + signatureWidth, y + 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(doc.splitTextToSize(label, signatureWidth), signatureX, y + 20);
    doc.setFont("helvetica", "normal");
    doc.text(dateLabel, signatureX, y + 29);
  };
  drawSignature(margin, "Complainant's Signature over Printed Name", "Date Signed: __________________");
  drawSignature(margin + halfWidth + 3, "Received by - Guidance Office", "Date Filed: __________________");

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(90);
    doc.text(`Confidential - For Guidance Office Use Only     Page ${page} of ${pageCount}`, margin, pageHeight - 8);
  }

  return doc;
}

export function generateIncidentReportPdf(caseData, groupMembers = [caseData]) {
  const doc = createIncidentReportPdf(caseData, groupMembers);
  const caseNumber = safeText(caseData.case_number);
  doc.save(caseNumber
    ? `SARES-Incident-Report-${caseNumber}.pdf`
    : "SARES-Incident-Report.pdf");
}