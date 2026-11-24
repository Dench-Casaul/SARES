import { Link, useLocation } from "react-router-dom";
import "../css/CaseAssessment.css";
import wesleyLogo from "../assets/wesley-logo.png";
import {
  LogOut,
  AlertTriangle,
  Printer,
  Download,
} from "lucide-react";
import { formatIdentifiedSanction } from "../engine/sanctionLabel";
import { formatTimeOfDay } from "../engine/documentFormat";
import { describeOffenseSelection } from "../engine/offenseRecommendation";
import { getViolationDescription } from "../engine/violationDescription";
import { useAuthProfile } from "../authContext";
import { getNavItems } from "../navigation";
import { useLogout } from "../useLogout";
import { CASE_STATUS, getCaseStatusLabel, getEffectiveCaseStatus } from "../caseStatus";
import { describeRequirementRecord, getParentInvolvementSummary } from "../parentInvolvement";
import { downloadIncidentReport, printIncidentReport } from "../incidentReportActions";

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
        {getNavItems(userProfile).map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className={`ca-nav-item${activePage === to ? " active" : ""}`}><Icon className="ca-nav-icon" /><span>{label}</span></Link>
        ))}
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

export default function CaseAssessment() {
  const { userProfile } = useAuthProfile();
  const location = useLocation();
  const caseData = location.state?.caseData || null;

  const handleLogout = useLogout();

  if (!caseData) {
    return (
      <div className="ca-page">
        <Sidebar activePage="/sares/violation" onLogout={handleLogout} userProfile={userProfile} />
        <main className="ca-main" data-help-target="assessment-content">
          <section className="ca-card">
            <h1 className="ca-title">Case Assessment</h1>
            <p className="ca-sub" data-help-target="assessment-summary">No submitted case context found.</p>
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
  const caseStatus = getEffectiveCaseStatus(caseData);
  const isPending = caseStatus === CASE_STATUS.PENDING_MEDIATION;
  const isResolvedMediation = caseStatus === CASE_STATUS.RESOLVED_MEDIATION;
  const identifiedSanction = formatIdentifiedSanction(caseData);
  const parentItems = getParentInvolvementSummary(caseData);
  const description = getViolationDescription(caseData);
  const evidenceFiles = Array.isArray(caseData.evidence_urls) ? caseData.evidence_urls : [];
  const groupMembers = Array.isArray(location.state?.groupCaseData) ? location.state.groupCaseData : [caseData];

  // Print and Download produce the same Incident Report Form PDF.
  const handlePrint = () => {
    printIncidentReport(caseData, groupMembers).catch((error) => {
      console.error("Failed to prepare the incident report for printing:", error);
      window.alert("The incident report could not be prepared for printing. Please try again.");
    });
  };
  const handleDownload = () => {
    downloadIncidentReport(caseData, groupMembers).catch((error) => {
      console.error("Failed to download the incident report:", error);
      window.alert("The incident report could not be downloaded. Please try again.");
    });
  };

  return (
    <div className="ca-page">
      <Sidebar activePage="/sares/violation" onLogout={handleLogout} userProfile={userProfile} />
      <main className="ca-main" data-help-target="assessment-content">
        <header className="ca-header" data-help-target="assessment-actions">
          <h1 className="ca-title">Case Assessment</h1>
          <button type="button" className="ca-btn-primary ca-print-button" onClick={handlePrint}>
            <Printer size={16} aria-hidden="true" /> Print Incident Report
          </button>
          <button type="button" className="ca-btn-secondary ca-print-button" onClick={handleDownload}>
            <Download size={16} aria-hidden="true" /> Download PDF
          </button>
        </header>
        <p className="ca-sub" data-help-target="assessment-summary">Violation recorded and assessed based on the Student Discipline Handbook.</p>

        {isMediation && isPending && (
          <div className="ca-mediation-alert">
            <strong>Pending Mediation</strong>
            <p>This case has been routed to the counselor for mediation. The handbook sanction is kept as the escalation option if mediation is not resolved.</p>
          </div>
        )}

        {caseData.beyond_schedule && (
          <div className="ca-authority-alert">
            <AlertTriangle size={20} />
            <div>
              <strong>Repeat Offense Beyond Handbook Schedule</strong>
              <p>This offense number exceeds the last offense listed in the handbook. The highest listed sanction was applied. Refer to the principal/discipline committee for review.</p>
            </div>
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
          <article className="ca-card" data-help-target="assessment-record">
            <h2>Student Profile</h2>
            <div className="ca-row"><span>Student</span><strong>{caseData.student_name || "—"}</strong></div>
            <div className="ca-row"><span>Student Number</span><strong>{caseData.student_number || "—"}</strong></div>
            <div className="ca-row"><span>Year Level</span><strong>{caseData.year_level || "—"}</strong></div>
          </article>

          <article className="ca-card" data-help-target="assessment-violation">
            <h2>Violation Details</h2>
            <div className="ca-row"><span>Date</span><strong>{caseData.incident_date || "—"}</strong></div>
            <div className="ca-row"><span>Time</span><strong>{formatTimeOfDay(caseData.incident_time) || "—"}</strong></div>
            <div className="ca-row"><span>Location</span><strong>{caseData.incident_location || "—"}</strong></div>
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
            {caseData.offense_selection_method && (
              <div className="ca-row">
                <span>Identified By</span>
                <strong>{describeOffenseSelection(caseData.offense_selection_method, caseData.ai_offense_suggestion_source)}</strong>
              </div>
            )}
            <div className="ca-row"><span>Reported By</span><strong>{caseData.reported_by || "—"}</strong></div>
            <div className="ca-row"><span>Reporter Role</span><strong>{caseData.reporter_role || "—"}</strong></div>
            <div className="ca-row"><span>Reporter Contact</span><strong>{caseData.reporter_contact || "—"}</strong></div>
            <div className="ca-row"><span>Status</span><strong>{getCaseStatusLabel(caseStatus)}</strong></div>
          </article>
        </section>

        <section className="ca-grid" data-help-target="assessment-sanction" style={{ marginTop: "16px" }}>
          <article className="ca-card">
            <h2>Offense Count</h2>
            <div className="ca-row"><span>This is offense</span><strong className="ca-highlight">{caseData.offense_number ? `#${caseData.offense_number}` : "—"}</strong></div>
            <p className="ca-sub" style={{ marginTop: "8px" }}>
              Counted by offense level for this school year using the {caseData.school_scope === "elementary" ? "Elementary" : caseData.school_scope === "high_school" ? "High School" : "applicable"} schedule.
            </p>
          </article>

          {!isResolvedMediation && (
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
                <strong>Student Discipline Handbook — Progressive Discipline Table</strong>
              </div>
            </article>
          )}
        </section>

        <section className="ca-card" data-help-target="assessment-description" style={{ marginTop: "16px" }}>
          <h2>{description.label}</h2>
          <p className="ca-paragraph">{description.text || "—"}</p>
          {description.source === "ai_counselor_recommendation" && (
            <p className="ca-sub">
              Generated from the selected handbook policy. It does not replace the rule-based sanction or professional judgment.
            </p>
          )}
          {description.source === "ai_assisted_solution" && (
            <p className="ca-sub">
              Source: {caseData.ai_assisted_solution_source || "Gemini"}. AI-generated guidance for counselor review; it does not replace school policy or professional judgment.
            </p>
          )}
        </section>

        {caseData.ai_counselor_recommendation && description.source !== "ai_counselor_recommendation" && (
          <section className="ca-card" style={{ marginTop: "16px" }}>
            <h2>AI Counselor Recommendation</h2>
            <p className="ca-paragraph">{caseData.ai_counselor_recommendation}</p>
            <p className="ca-sub">
              Generated from the selected handbook policy. It does not replace the rule-based sanction or professional judgment.
            </p>
          </section>
        )}

        {caseData.witnesses && (
          <section className="ca-card" style={{ marginTop: "16px" }}>
            <h2>Witnesses</h2>
            <p className="ca-paragraph">{caseData.witnesses}</p>
          </section>
        )}

        {(parentItems.length > 0 || caseData.parent_contact_notes) && (
          <section className="ca-card" style={{ marginTop: "16px" }}>
            <h2>Parent/Guardian Involvement</h2>
            {parentItems.length > 0 && (
              <>
                <p className="ca-sub">Required by the handbook sanction. Record outcomes from the student's case record.</p>
                <ul className="ca-parent-list">
                  {parentItems.map((item) => (
                    <li key={item.type}>
                      <strong>{item.label}</strong> · {item.record.status === "pending" ? "Pending" : describeRequirementRecord(item)}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {caseData.parent_contact_notes && <p className="ca-paragraph">{caseData.parent_contact_notes}</p>}
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

        {caseData.ai_assisted_solution && description.source !== "ai_assisted_solution" && (
          <section className="ca-card" style={{ marginTop: "16px" }}>
            <h2>AI-Assisted Prevention / Alternative Suggestion</h2>
            <p className="ca-paragraph">{caseData.ai_assisted_solution}</p>
            <p className="ca-sub" style={{ marginTop: "8px" }}>
              Source: {caseData.ai_assisted_solution_source || "Gemini"}. AI-generated guidance for counselor review; it does not replace school policy or professional judgment.
            </p>
          </section>
        )}

        {caseData.generated_explanation && !isResolvedMediation && (
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

      </main>
    </div>
  );
}
