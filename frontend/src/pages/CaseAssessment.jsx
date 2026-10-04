import { Link, useLocation, useNavigate } from "react-router-dom";
import "../css/CaseAssessment.css";
import wesleyLogo from "../assets/wesley-logo.png";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Activity,
  ShieldCheck,
  BarChart3,
  LogOut,
  AlertTriangle,
  Printer,
  Download,
  KeyRound,
} from "lucide-react";
import { formatIdentifiedSanction } from "../engine/sanctionLabel";
import { useAuthProfile } from "../authContext";
import { ACTIVITY_ACTIONS, recordActivity } from "../activityLog";

function Sidebar({ activePage, onLogout, userProfile }) {
  return (
    <div className="ca-sidebar">
      <div className="ca-logo">
        <div className="ca-logo-icon">
          <img src={wesleyLogo} alt="Olongapo Wesley School Logo" className="school-logo" />
        </div>
        <h1>SARES</h1>
      </div>
      <nav className="ca-nav">
        <Link to="/sares/dashboard" className={`ca-nav-item${activePage === "/sares/dashboard" ? " active" : ""}`}><LayoutDashboard className="ca-nav-icon" /><span>Dashboard</span></Link>
        <Link to="/sares/students" className={`ca-nav-item${activePage === "/sares/students" ? " active" : ""}`}><Users className="ca-nav-icon" /><span>Students</span></Link>
        <Link to="/sares/rules" className={`ca-nav-item${activePage === "/sares/rules" ? " active" : ""}`}><ShieldCheck className="ca-nav-icon" /><span>Rule Management</span></Link>
        <Link to="/sares/reports" className={`ca-nav-item${activePage === "/sares/reports" ? " active" : ""}`}><BarChart3 className="ca-nav-icon" /><span>Reports</span></Link>
        <Link to="/sares/violation" className={`ca-nav-item${activePage === "/sares/violation" ? " active" : ""}`}><ClipboardList className="ca-nav-icon" /><span>Log Violation</span></Link>
        <Link to="/sares/account" className={`ca-nav-item${activePage === "/sares/account" ? " active" : ""}`}><KeyRound className="ca-nav-icon" /><span>Account Security</span></Link>
        {userProfile?.role === "superadmin" && <Link to="/sares/system-logs" className={`ca-nav-item${activePage === "/sares/system-logs" ? " active" : ""}`}><Activity className="ca-nav-icon" /><span>System Logs</span></Link>}
      </nav>
      <div className="ca-logout-section">
        <button className="ca-logout" onClick={onLogout}><LogOut className="ca-nav-icon" /><span>Logout</span></button>
      </div>
    </div>
  );
}

const SUBCATEGORY_LABELS = {
  light: "Light",
  less_serious: "Less Serious",
  serious: "Serious",
  very_serious: "Very Serious",
};

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

function printableDate(value) {
  if (typeof value === "string") return value.slice(0, 10);
  const date = value?.toDate?.() || (value?.seconds ? new Date(value.seconds * 1000) : null);
  return date instanceof Date && !Number.isNaN(date.getTime())
    ? date.toISOString().slice(0, 10)
    : "";
}

export default function CaseAssessment() {
  const { userProfile } = useAuthProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const caseData = location.state?.caseData || null;

  const handleLogout = async () => {
    await recordActivity(userProfile, ACTIVITY_ACTIONS.LOGOUT, "session");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!caseData) {
    return (
      <div className="ca-page">
        <Sidebar activePage="/sares/violation" onLogout={handleLogout} userProfile={userProfile} />
        <main className="ca-main">
          <section className="ca-card">
            <h1 className="ca-title">Case Assessment</h1>
            <p className="ca-sub">No submitted case context found.</p>
            <div className="ca-actions">
              <Link to="/sares/violation" className="ca-btn-primary">Back to Log Violation</Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const isMinor = String(caseData.offense_type).toLowerCase() === "minor";
  const isMajor = String(caseData.offense_type).toLowerCase() === "major";
  const subcategoryLabel = SUBCATEGORY_LABELS[caseData.subcategory_id] || caseData.subcategory_id || "—";
  const isMediation = String(caseData.intervention_type || "").toLowerCase() === "mediation";
  const isPending = String(caseData.status || "").toLowerCase() === "pending";
  const identifiedSanction = caseData.identified_sanction || formatIdentifiedSanction(caseData);
  const evidenceFiles = Array.isArray(caseData.evidence_urls) ? caseData.evidence_urls : [];
  const groupMembers = Array.isArray(location.state?.groupCaseData) ? location.state.groupCaseData : [caseData];
  const incidentNatureText = [caseData.group_title, caseData.offense_variety, caseData.incident_description].join(" ").toLowerCase();
  const reporterRole = String(caseData.reporter_role || "").toLowerCase();
  const witnesses = String(caseData.witnesses || "").split(/\n|;/).map((name) => name.trim()).filter(Boolean);
  const dateFiled = printableDate(caseData.created_at) || new Date().toISOString().slice(0, 10);

  return (
    <div className="ca-page">
      <Sidebar activePage="/sares/violation" onLogout={handleLogout} userProfile={userProfile} />
      <main className="ca-main">
        <header className="ca-header">
          <h1 className="ca-title">Case Assessment</h1>
          <button type="button" className="ca-btn-primary ca-print-button" onClick={() => window.print()}>
            <Printer size={16} /> Print Incident Report
          </button>
          <button type="button" className="ca-btn-secondary ca-print-button" onClick={async () => {
            const { generateIncidentReportPdf } = await import("../engine/incidentReportPdf");
            generateIncidentReportPdf(caseData, groupMembers);
          }}>
            <Download size={16} /> Download PDF
          </button>
        </header>
        <p className="ca-sub">Violation recorded and assessed based on the Student Discipline Handbook.</p>

        {isMediation && isPending && (
          <div className="ca-mediation-alert">
            <strong>Pending Mediation</strong>
            <p>This case has been routed to the counselor for mediation. The handbook sanction is kept as the escalation option if mediation is not resolved.</p>
          </div>
        )}

        {caseData.suggest_authorities && (
          <div className="ca-authority-alert">
            <AlertTriangle size={20} />
            <div>
              <strong>Authority Involvement Suggested</strong>
              <p>This violation may involve illegal activity. Consider referral to proper authorities (police/security) at school discretion.</p>
            </div>
          </div>
        )}

        <section className="ca-grid">
          <article className="ca-card">
            <h2>Student Profile</h2>
            <div className="ca-row"><span>Student</span><strong>{caseData.student_name || "—"}</strong></div>
            <div className="ca-row"><span>Student Number</span><strong>{caseData.student_number || "—"}</strong></div>
            <div className="ca-row"><span>Year Level</span><strong>{caseData.year_level || "—"}</strong></div>
          </article>

          <article className="ca-card">
            <h2>Violation Details</h2>
            <div className="ca-row"><span>Date</span><strong>{caseData.incident_date || "—"}</strong></div>
            <div className="ca-row">
              <span>Offense Type</span>
              <strong>
                <span className={`ca-type-badge ca-type-badge--${caseData.offense_type}`}>
                  {isMinor ? "Minor" : isMajor ? "Major" : caseData.offense_type || "—"}
                </span>
              </strong>
            </div>
            <div className="ca-row"><span>Subcategory</span><strong>{subcategoryLabel}</strong></div>
            <div className="ca-row"><span>Violation Group</span><strong>{caseData.group_title || caseData.category_name || "—"}</strong></div>
            <div className="ca-row"><span>Specific Violation</span><strong>{caseData.offense_variety || "—"}</strong></div>
            <div className="ca-row"><span>Reported By</span><strong>{caseData.reported_by || "—"}</strong></div>
            <div className="ca-row"><span>Reporter Role</span><strong>{caseData.reporter_role || "—"}</strong></div>
            <div className="ca-row"><span>Reporter Contact</span><strong>{caseData.reporter_contact || "—"}</strong></div>
            <div className="ca-row"><span>Status</span><strong>{isMediation && isPending ? "Pending Mediation" : caseData.status || "Recorded"}</strong></div>
          </article>
        </section>

        <section className="ca-grid" style={{ marginTop: "16px" }}>
          {isMinor && (
            <article className="ca-card">
              <h2>Offense Count</h2>
              <div className="ca-row"><span>This is offense</span><strong className="ca-highlight">{caseData.offense_number ? `#${caseData.offense_number}` : "—"}</strong></div>
              <p className="ca-sub" style={{ marginTop: "8px" }}>Counted cumulatively across all minor violations for this school year.</p>
            </article>
          )}
          {isMajor && (
            <article className="ca-card">
              <h2>Severity Assessment</h2>
              <div className="ca-row"><span>Severity Score</span><strong className="ca-highlight">{caseData.severity_score !== null && caseData.severity_score !== undefined ? `${caseData.severity_score} / 10` : "—"}</strong></div>
              <p className="ca-sub" style={{ marginTop: "8px" }}>Score assessed by the admin/counselor based on gravity of incident.</p>
            </article>
          )}

          {!(isMediation && (caseData.status === 'resolved' || caseData.mediation_status === 'resolved')) && (
            <article className="ca-card">
              <h2>{isMediation && isPending ? "Escalation Sanction" : "Recommended Sanction"}</h2>
              <p className="ca-paragraph ca-multiline ca-sanction-text">
                {caseData.recommended_sanction || "—"}
              </p>
              <div className="ca-row" style={{ marginTop: "10px" }}>
                <span>Identified Sanction</span>
                <strong>{identifiedSanction}</strong>
              </div>
              <div className="ca-row" style={{ marginTop: "10px" }}>
                <span>Handbook Section</span>
                <strong>Student Discipline Handbook — {isMinor ? "Minor Offense Schedule" : "Major Offense Severity Map"}</strong>
              </div>
            </article>
          )}
        </section>

        <section className="ca-card" style={{ marginTop: "16px" }}>
          <h2>Incident Description</h2>
          <p className="ca-paragraph">{caseData.incident_description || "—"}</p>
        </section>

        {caseData.witnesses && (
          <section className="ca-card" style={{ marginTop: "16px" }}>
            <h2>Witnesses</h2>
            <p className="ca-paragraph">{caseData.witnesses}</p>
          </section>
        )}

        {evidenceFiles.length > 0 && (
          <section className="ca-card" style={{ marginTop: "16px" }}>
            <h2>Supporting Evidence</h2>
            <ul>
              {evidenceFiles.map((file, index) => (
                <li key={file.path || file.url || index}>
                  <a href={file.url} target="_blank" rel="noreferrer">{file.name || `Evidence ${index + 1}`}</a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {caseData.ai_assisted_solution && (
          <section className="ca-card" style={{ marginTop: "16px" }}>
            <h2>AI-Assisted Prevention / Alternative Suggestion</h2>
            <p className="ca-paragraph">{caseData.ai_assisted_solution}</p>
            <p className="ca-sub" style={{ marginTop: "8px" }}>
              Source: {caseData.ai_assisted_solution_source || "Gemini"}. AI-generated guidance for counselor review; it does not replace school policy or professional judgment.
            </p>
          </section>
        )}

        {caseData.generated_explanation && !(isMediation && (caseData.status === 'resolved' || caseData.mediation_status === 'resolved')) && (
          <section className="ca-card" style={{ marginTop: "16px" }}>
            <h2>Counselor Explanation</h2>
            <p className="ca-paragraph">{caseData.generated_explanation}</p>
            <div className="ca-row" style={{ marginTop: "10px" }}>
              <span>Explanation Source</span>
              <strong>{caseData.explanation_source || "N/A"}</strong>
            </div>
          </section>
        )}

        <div className="ca-actions">
          <Link to="/sares/violation" className="ca-btn-secondary">Log Another Violation</Link>
          <Link to="/sares/reports" className="ca-btn-primary">Go to Reports</Link>
        </div>

        <article className="ca-print-report">
          <header className="ca-print-heading">
            <h1>INCIDENT REPORT FORM</h1>
            <p>Student Discipline / Guidance Office</p>
            <div className="ca-print-meta">
              <strong>Case No.: {caseData.id || "________________"}</strong>
              <strong>Date Filed: {dateFiled || "________________"}</strong>
            </div>
          </header>

          <section className="ca-print-section">
            <h2>I. Reporting Party / Complainant</h2>
            <div className="ca-print-grid">
              <div><b>Full Name:</b> {caseData.reported_by || "____________________________"}</div>
              <div><b>Date &amp; Time of Report:</b> {dateFiled} / __________________</div>
              <div className="ca-print-tall">
                <b>Role:</b> {caseData.reporter_role || "________________"}
                <div>{["Student", "Teacher", "Staff", "Parent / Guardian", "Other"].map((role) => (
                  <span key={role} className="ca-print-check">{reporterRole === role.toLowerCase() || (role === "Parent / Guardian" && reporterRole === "parent") ? "☒" : "☐"} {role}</span>
                ))}</div>
              </div>
              <div><b>Grade/Section &amp; Contact No.:</b> {caseData.reporter_grade_section || "____________________________"}<br />{caseData.reporter_contact || "____________________________"}</div>
            </div>
          </section>

          <section className="ca-print-section">
            <h2>II. Persons Involved</h2>
            <table className="ca-print-table">
              <thead><tr><th>Name</th><th>Grade / Section</th><th>Role in Incident</th><th>Contact Information</th></tr></thead>
              <tbody>{groupMembers.map((person, index) => (
                <tr key={person.student_id || index}>
                  <td>{person.student_name || "________________"}</td>
                  <td>{person.year_level || "________________"}</td>
                  <td>Respondent</td>
                  <td>{person.student_contact || "________________"}</td>
                </tr>
              ))}</tbody>
            </table>
            <p className="ca-print-note">Role in Incident: Respondent, Involved Party, Aggrieved Party, or Other.</p>
          </section>

          <section className="ca-print-section">
            <h2>III. Incident Details</h2>
            <div className="ca-print-grid">
              <div><b>Date of Incident:</b> {caseData.incident_date || "________________"}</div>
              <div><b>Time of Incident:</b> {caseData.incident_time || "________________"}</div>
              <div><b>Location:</b> {caseData.incident_location || "____________________________"}</div>
              <div><b>Reported By (if different from complainant):</b> {caseData.reported_by || "____________________________"}</div>
            </div>
            <h3>Nature of Incident (check all that apply):</h3>
            <div className="ca-print-natures">
              {INCIDENT_NATURES.map(([label, terms]) => (
                <span key={label}>{terms.some((term) => incidentNatureText.includes(term)) ? "☒" : "☐"} {label}</span>
              ))}
              <span>☐ Other: ______________________________</span>
            </div>
            <h3>Narrative Description of the Incident:</h3>
            <p className="ca-print-narrative">{caseData.incident_description || " "}</p>
            <h3>Evidence / Attachments:</h3>
            <div className="ca-print-natures">
              {["Photos", "CCTV Footage", "Written Statement(s)", "Other"].map((label) => (
                <span key={label}>{evidenceFiles.some((file) => label === "Photos" ? file.contentType?.startsWith("image/") : label === "CCTV Footage" ? /cctv|video/i.test(file.name || "") : label === "Written Statement(s)" ? /statement/i.test(file.name || "") : false) ? "☒" : "☐"} {label}</span>
              ))}
            </div>
            {evidenceFiles.length > 0 && <p className="ca-print-note">Attached files: {evidenceFiles.map((file) => file.name).join(", ")}</p>}
          </section>

          <section className="ca-print-section">
            <h2>IV. Witnesses</h2>
            <table className="ca-print-table">
              <thead><tr><th>Name</th><th>Grade / Section</th><th>Contact Information</th><th>Statement Attached</th></tr></thead>
              <tbody>{Array.from({ length: Math.max(3, witnesses.length) }, (_, index) => (
                <tr key={index}><td>{witnesses[index] || ""}</td><td></td><td></td><td>{witnesses[index] ? "☐" : ""}</td></tr>
              ))}</tbody>
            </table>
          </section>

          <section className="ca-print-section ca-print-actions-section">
            <h2>V. Action Taken</h2>
            <p className="ca-print-action-text">{caseData.action_taken || caseData.recommended_sanction || (isMediation ? "Referred for mediation." : "")}</p>
            <p className="ca-print-certification">I certify that the information provided in this report is true and accurate to the best of my knowledge.</p>
            <div className="ca-print-signatures">
              <div><span></span><b>Complainant's Signature over Printed Name</b><small>Date Signed: ______________</small></div>
              <div><span></span><b>Received by — Guidance Office</b><small>Date Filed: ______________</small></div>
            </div>
          </section>
          <footer className="ca-print-footer">Confidential — For Guidance Office Use Only</footer>
        </article>
      </main>
    </div>
  );
}
