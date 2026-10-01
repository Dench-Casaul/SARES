import { jsPDF } from "jspdf";

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

function drawCell(doc, x, y, width, height, label, value = "") {
  doc.setDrawColor(130);
  doc.rect(x, y, width, height);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(label, x + 2, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(safeText(value), width - 4);
  doc.text(lines.slice(0, Math.max(1, Math.floor((height - 8) / 4))), x + 2, y + 10);
}

export function createIncidentReportPdf(caseData, groupMembers = [caseData]) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 13;
  const contentWidth = pageWidth - margin * 2;
  const halfWidth = contentWidth / 2;
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
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(label, margin, y + 4);
    const lines = doc.splitTextToSize(safeText(value), contentWidth - 4);
    const height = Math.max(minimumHeight, lines.length * 4 + 7);
    doc.setDrawColor(145);
    doc.line(margin, y + height, pageWidth - margin, y + height);
    doc.setFont("helvetica", "normal");
    doc.text(lines, margin + 1, y + 10);
    y += height + 2;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("INCIDENT REPORT FORM", pageWidth / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text("Student Discipline / Guidance Office", pageWidth / 2, y, { align: "center" });
  y += 5;
  drawCell(doc, margin, y, halfWidth, 11, "Case No.", caseData.id || "");
  drawCell(doc, margin + halfWidth, y, halfWidth, 11, "Date Filed", caseData.created_at?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString());
  y += 11;

  section("I. Reporting Party / Complainant");
  drawCell(doc, margin, y, halfWidth, 15, "Full Name", caseData.reported_by);
  drawCell(doc, margin + halfWidth, y, halfWidth, 15, "Date & Time of Report", "");
  y += 15;
  drawCell(doc, margin, y, halfWidth, 19, "Role", caseData.reporter_role);
  drawCell(doc, margin + halfWidth, y, halfWidth, 19, "Grade/Section & Contact No.", [caseData.reporter_grade_section, caseData.reporter_contact].filter(Boolean).join(" / "));
  y += 19;

  section("II. Persons Involved");
  const peopleHeaders = ["Name", "Grade / Section", "Role in Incident", "Contact Information"];
  const peopleWidths = [0.25, 0.22, 0.25, 0.28].map((fraction) => contentWidth * fraction);
  let x = margin;
  peopleHeaders.forEach((header, index) => {
    drawCell(doc, x, y, peopleWidths[index], 9, header);
    x += peopleWidths[index];
  });
  y += 9;
  const people = groupMembers.length ? groupMembers : [caseData];
  people.forEach((person) => {
    x = margin;
    const values = [person.student_name, person.year_level, "Respondent", person.student_contact];
    values.forEach((value, index) => {
      drawCell(doc, x, y, peopleWidths[index], 10, "", value);
      x += peopleWidths[index];
    });
    y += 10;
  });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.text("Role in Incident: Respondent, Involved Party, Aggrieved Party, or Other.", margin, y + 4);
  y += 6;

  section("III. Incident Details");
  drawCell(doc, margin, y, halfWidth, 13, "Date of Incident", caseData.incident_date);
  drawCell(doc, margin + halfWidth, y, halfWidth, 13, "Time of Incident", caseData.incident_time);
  y += 13;
  drawCell(doc, margin, y, halfWidth, 13, "Location", caseData.incident_location);
  drawCell(doc, margin + halfWidth, y, halfWidth, 13, "Reported By (if different from complainant)", caseData.reported_by);
  y += 13;

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
    doc.text(labels.join("     "), margin, y + 4, { maxWidth: contentWidth });
    y += 5;
  });
  y += 2;
  addParagraph("Narrative Description of the Incident", caseData.incident_description, 24);

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
  doc.text(evidenceLabels.join("     "), margin, y + 3, { maxWidth: contentWidth });
  y += 6;
  if (evidenceFiles.length) addParagraph("Attached Files", evidenceFiles.map((file) => file.name).join(", "), 9);

  if (y > 225) {
    doc.addPage();
    y = 16;
  } else {
    y += 2;
  }
  section("IV. Witnesses");
  const witnessNames = String(caseData.witnesses || "").split(/\n|;/).map((name) => name.trim()).filter(Boolean);
  const witnessHeaders = ["Name", "Grade / Section", "Contact Information", "Statement Attached"];
  const witnessWidths = [0.25, 0.24, 0.30, 0.21].map((fraction) => contentWidth * fraction);
  x = margin;
  witnessHeaders.forEach((header, index) => {
    drawCell(doc, x, y, witnessWidths[index], 9, header);
    x += witnessWidths[index];
  });
  y += 9;
  Array.from({ length: Math.max(3, witnessNames.length) }, (_, index) => {
    x = margin;
    [witnessNames[index] || "", "", "", witnessNames[index] ? "[ ]" : ""].forEach((value, column) => {
      drawCell(doc, x, y, witnessWidths[column], 10, "", value);
      x += witnessWidths[column];
    });
    y += 10;
  });

  doc.addPage();
  y = 16;
  section("V. Action Taken");
  const actionText = caseData.action_taken || caseData.recommended_sanction ||
    (String(caseData.intervention_type).toLowerCase() === "mediation" ? "Referred for mediation." : "");
  addParagraph("Immediate Action Taken", actionText, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const certification = "I certify that the information provided in this report is true and accurate to the best of my knowledge.";
  doc.text(doc.splitTextToSize(certification, contentWidth), margin, y + 9);
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
  doc.save(`incident-report-${safeText(caseData.id, "case")}.pdf`);
}