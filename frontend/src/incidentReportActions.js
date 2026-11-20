/**
 * Browser actions for the Incident Report Form: download it, or open it ready
 * to print. Both produce the same PDF (engine/incidentReportPdf.js).
 */
import schoolLogoUrl from './assets/wesley-logo.png';

let logoPromise = null;

/** The school logo as PNG bytes, loaded once. The form still generates if it fails. */
function loadSchoolLogo() {
  if (!logoPromise) {
    logoPromise = fetch(schoolLogoUrl)
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .then((buffer) => (buffer ? new Uint8Array(buffer) : null))
      .catch((error) => {
        console.warn('School logo could not be loaded for the incident report:', error);
        logoPromise = null;
        return null;
      });
  }
  return logoPromise;
}

export async function downloadIncidentReport(caseData, groupMembers = [caseData]) {
  const [{ generateIncidentReportPdf }, logo] = await Promise.all([
    import('./engine/incidentReportPdf'),
    loadSchoolLogo(),
  ]);
  generateIncidentReportPdf(caseData, groupMembers, { logo });
}

/** Opens the form in a new tab with the print dialog. Call directly from a click handler. */
export async function printIncidentReport(caseData, groupMembers = [caseData]) {
  // Open the tab during the click, before any await, so pop-up blockers allow it.
  const printWindow = window.open('', '_blank');
  if (printWindow) printWindow.document.title = 'Preparing incident report…';
  try {
    const [{ printIncidentReportPdf }, logo] = await Promise.all([
      import('./engine/incidentReportPdf'),
      loadSchoolLogo(),
    ]);
    printIncidentReportPdf(caseData, groupMembers, { logo }, printWindow);
  } catch (error) {
    printWindow?.close();
    throw error;
  }
}
