import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../css/CaseAssessment.css";
import wesleyLogo from "../assets/wesley-logo.png";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  ShieldCheck,
  BarChart3,
  LogOut,
  AlertTriangle,
} from "lucide-react";

function Sidebar({ activePage, onLogout }) {
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
  const location = useLocation();
  const navigate = useNavigate();
  const caseData = location.state?.caseData || null;

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!caseData) {
    return (
      <div className="ca-page">
        <Sidebar activePage="/sares/violation" onLogout={handleLogout} />
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

  return (
    <div className="ca-page">
      <Sidebar activePage="/sares/violation" onLogout={handleLogout} />
      <main className="ca-main">
        <header className="ca-header">
          <h1 className="ca-title">Case Assessment</h1>
        </header>
        <p className="ca-sub">Violation recorded and assessed based on the Student Discipline Handbook.</p>

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

          <article className="ca-card">
            <h2>Recommended Sanction</h2>
            <p className="ca-paragraph ca-multiline ca-sanction-text">{caseData.recommended_sanction || "—"}</p>
            <div className="ca-row" style={{ marginTop: "10px" }}>
              <span>Handbook Section</span>
              <strong>Student Discipline Handbook — {isMinor ? "Minor Offense Schedule" : "Major Offense Severity Map"}</strong>
            </div>
          </article>
        </section>

        <section className="ca-card" style={{ marginTop: "16px" }}>
          <h2>Incident Description</h2>
          <p className="ca-paragraph">{caseData.incident_description || "—"}</p>
        </section>

        <section className="ca-card" style={{ marginTop: "16px" }}>
          <h2>Counselor Explanation</h2>
          <p className="ca-paragraph">{caseData.generated_explanation || "No generated explanation available."}</p>
          <div className="ca-row" style={{ marginTop: "10px" }}>
            <span>Explanation Source</span>
            <strong>{caseData.explanation_source || "N/A"}</strong>
          </div>
        </section>

        <div className="ca-actions">
          <Link to="/sares/violation" className="ca-btn-secondary">Log Another Violation</Link>
          <Link to="/sares/reports" className="ca-btn-primary">Go to Reports</Link>
        </div>
      </main>
    </div>
  );
}
