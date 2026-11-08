import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const A4_SHORT_EDGE = 11906;
const A4_LONG_EDGE = 16838;
const PAGE_MARGIN = 720;
const HEADER_MARGIN = 1200;
const COLUMN_WIDTHS = [1900, 3300, 6500, 3698];
const TABLE_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "D9E1F2" };
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const CELL_MARGINS = { top: 100, bottom: 100, left: 120, right: 120 };
const OFFENSE_TYPE_LABELS = {
  light: "Light",
  less_serious: "Less Serious",
  serious: "Serious",
  very_serious: "Very Serious",
};

function safeText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function formatStudentCell(studentName, studentNumber, gradeLevel) {
  const name = safeText(studentName, "Unknown");
  const number = safeText(studentNumber, "");
  const grade = safeText(gradeLevel, "");
  const lines = [`Name: ${name}`];
  if (number) lines.push(`ID: ${number}`);
  if (grade) lines.push(grade);
  return lines.join("\n");
}

function formatViolationCell(offenseNumber, offenseClassification, specificViolation, offenseType) {
  const parts = [];
  const offenseNo = safeText(offenseNumber, "");
  if (offenseNo) parts.push(`Offense No.: ${offenseNo}`);
  const classification = safeText(offenseClassification, "Unspecified");
  if (classification) parts.push(`Classification: ${classification}`);
  const type = OFFENSE_TYPE_LABELS[offenseType] || safeText(offenseType, "");
  if (type) parts.push(`Offense Type: ${type}`);
  const specific = safeText(specificViolation, "Unspecified");
  if (specific) parts.push(`Violation: ${specific}`);
  return parts.join("\n");
}

function formatOutcomeCell(sanctionRecommended, status) {
  const parts = [];
  const sanction = safeText(sanctionRecommended, "N/A");
  if (sanction) parts.push(`Sanction: ${sanction}`);
  const currentStatus = safeText(status, "N/A");
  if (currentStatus) parts.push(`Status: ${currentStatus}`);
  return parts.join("\n");
}

function formatReportDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function createReportHeader(dateRange, generatedAt, logoData) {
  const days = Number(dateRange);
  const scope = dateRange !== "all" && Number.isFinite(days) && days > 0
    ? (() => {
      const startDate = new Date(generatedAt);
      startDate.setDate(startDate.getDate() - days);
      return `${formatReportDate(startDate)} - ${formatReportDate(generatedAt)}`;
    })()
    : "All Dates";
  const headerBorders = {
    top: NO_BORDER,
    bottom: TABLE_BORDER,
    left: NO_BORDER,
    right: NO_BORDER,
    insideHorizontal: NO_BORDER,
    insideVertical: NO_BORDER,
  };
  const brandBorders = {
    top: NO_BORDER,
    bottom: NO_BORDER,
    left: NO_BORDER,
    right: NO_BORDER,
    insideHorizontal: NO_BORDER,
    insideVertical: NO_BORDER,
  };
  const brand = new Table({
    width: { size: 7700, type: WidthType.DXA },
    columnWidths: [1600, 6100],
    layout: TableLayoutType.FIXED,
    borders: brandBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 1600, type: WidthType.DXA },
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            borders: brandBorders,
            verticalAlign: "center",
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: logoData
                  ? [new ImageRun({
                    data: logoData,
                    type: "png",
                    transformation: { width: 78, height: 78 },
                  })]
                  : [],
              }),
            ],
          }),
          new TableCell({
            width: { size: 6100, type: WidthType.DXA },
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            borders: brandBorders,
            verticalAlign: "center",
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [new TextRun({ text: "SARES", bold: true, font: "Play", size: 32, color: "17365D" })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  return new Header({
    children: [
      new Table({
        width: { size: 15398, type: WidthType.DXA },
        columnWidths: [7700, 7698],
        layout: TableLayoutType.FIXED,
        borders: headerBorders,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 7700, type: WidthType.DXA },
                margins: { top: 60, bottom: 120, left: 0, right: 120 },
                borders: headerBorders,
                verticalAlign: "center",
                children: [brand],
              }),
              new TableCell({
                width: { size: 7698, type: WidthType.DXA },
                margins: { top: 60, bottom: 120, left: 120, right: 0 },
                borders: headerBorders,
                verticalAlign: "center",
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: { before: 0, after: 40 },
                    children: [new TextRun({ text: `Scope: ${scope}`, font: "Aptos", size: 20, color: "243247" })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: { before: 0, after: 0 },
                    children: [new TextRun({
                      text: `Generated on: ${new Intl.DateTimeFormat("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(generatedAt)}`,
                      font: "Aptos",
                      size: 18,
                      color: "526174",
                    })],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

export function createReportsDocx(headers = [], rows = [], {
  dateRange = "all",
  generatedAt = new Date(),
  logoData,
} = {}) {
  void headers;
  const visibleHeaders = ["Date", "Student", "Violation", "Outcome"];
  const visibleRows = rows.map((row) => {
    const [date, studentNumber, studentName, gradeLevel, offenseClassification, specificViolation, offenseNumber, sanctionRecommended, status, offenseType] = row;
    return [
      safeText(date, "N/A"),
      formatStudentCell(studentName, studentNumber, gradeLevel),
      formatViolationCell(offenseNumber, offenseClassification, specificViolation, offenseType),
      formatOutcomeCell(sanctionRecommended, status),
    ];
  });

  const tableRows = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: visibleHeaders.map((header, index) => new TableCell({
        width: { size: COLUMN_WIDTHS[index], type: WidthType.DXA },
        margins: CELL_MARGINS,
        shading: { fill: "1F4E78" },
        borders: { top: TABLE_BORDER, bottom: TABLE_BORDER, left: TABLE_BORDER, right: TABLE_BORDER },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0 },
            children: [new TextRun({ text: header, bold: true, color: "FFFFFF", font: "Aptos", size: 20 })],
          }),
        ],
      })),
    }),
    ...visibleRows.map((row, rowIndex) => new TableRow({
      cantSplit: true,
      children: row.map((value, columnIndex) => new TableCell({
        width: { size: COLUMN_WIDTHS[columnIndex], type: WidthType.DXA },
        margins: CELL_MARGINS,
        verticalAlign: "center",
        shading: { fill: rowIndex % 2 === 0 ? "F4F7FB" : "FFFFFF" },
        borders: { top: TABLE_BORDER, bottom: TABLE_BORDER, left: TABLE_BORDER, right: TABLE_BORDER },
        children: value.split("\n").map((line) => new Paragraph({
          spacing: { before: 0, after: 30 },
          children: [new TextRun({ text: line, font: "Aptos", size: 19, color: "243247" })],
        })),
      })),
    })),
  ];

  return new Document({
    title: "SARES Incident Report Summary",
    description: "Disciplinary violation summary generated by SARES.",
    sections: [{
      headers: { default: createReportHeader(dateRange, generatedAt, logoData) },
      children: [
        new Table({
          width: { size: COLUMN_WIDTHS.reduce((total, width) => total + width, 0), type: WidthType.DXA },
          columnWidths: COLUMN_WIDTHS,
          layout: TableLayoutType.FIXED,
          borders: { top: TABLE_BORDER, bottom: TABLE_BORDER, left: TABLE_BORDER, right: TABLE_BORDER, insideHorizontal: TABLE_BORDER, insideVertical: TABLE_BORDER },
          rows: tableRows,
        }),
      ],
      properties: {
        page: {
          size: { width: A4_SHORT_EDGE, height: A4_LONG_EDGE, orientation: "landscape" },
          margin: { top: HEADER_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN, header: 0 },
        },
      },
    }],
  });
}

export async function generateReportsDocx(headers = [], rows = [], fileName = "sares-reports.docx", options = {}) {
  const doc = createReportsDocx(headers, rows, options);
  const blob = await Packer.toBlob(doc);
  const rootDocument = typeof document !== "undefined" ? document : null;

  if (rootDocument) {
    const url = URL.createObjectURL(blob);
    const link = rootDocument.createElement("a");
    link.href = url;
    link.download = fileName;
    rootDocument.body.appendChild(link);
    link.click();
    rootDocument.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return blob;
}

export const createReportsXlsx = createReportsDocx;
