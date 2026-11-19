import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import {
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { db } from "../firebase";
import { useAuthProfile } from "../authContext";
import { queryForUserScope } from "../firestoreAccess";
import { isRecordInTrash } from "../recordStatus";
import { doesViolationCount } from "../engine/ruleEngine";
import { getCaseStatusLabel, getEffectiveCaseStatus, isOpenCase, isResolvedThroughMediation } from "../caseStatus";
import { formatIdentifiedSanction } from "../engine/sanctionLabel";
import { getNavItems } from "../navigation";
import { useLogout } from "../useLogout";
import "../css/Reports.css";
import saresLogo from "../assets/sares-logo.png";
import wesleyLogo from "../assets/wesley-logo.png";

function Sidebar({ activePage, handleLogout, isOpen, toggleSidebar, userProfile }) {
  return (
    <aside className={`report-sidebar${isOpen ? " report-sidebar--open" : ""}`}>
      <div className="report-sidebar-header">
        <div className="report-logo">
          <div className="report-logo-icon">
            <img src={wesleyLogo} alt="Olongapo Wesley School Logo" className="school-logo" />
          </div>
          <div>
            <h1 className="report-logo-text">SARES</h1>
          </div>
        </div>
      </div>

      <nav className="report-nav">
        <ul className="report-nav-list">
          {getNavItems(userProfile).map(({ to, label, icon: Icon }) => (
            <li key={to}><Link to={to} onClick={toggleSidebar} className={`report-nav-item${activePage === to ? " report-nav-item--active" : ""}`}><Icon className="report-nav-icon" /><span>{label}</span></Link></li>
          ))}
        </ul>
      </nav>

      <div className="report-sidebar-footer">
        <button type="button" className="report-logout-btn" onClick={handleLogout}>
          <LogOut className="report-nav-icon" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

function toDate(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function pickDate(violation) {
  return (
    toDate(violation.incident_date) ||
    toDate(violation.created_at) ||
    toDate(violation.updated_at)
  );
}

function toGradeSection(violation) {
  const year = violation.student_year || violation.year_level || violation.year || "";
  const section = violation.student_section || violation.section || "";
  const value = `${year}${year && section ? " - " : ""}${section}`.trim();
  return value || "Unspecified";
}

export default function Report() {
  const { userProfile } = useAuthProfile();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [violations, setViolations] = useState([]);
  const [studentNumbers, setStudentNumbers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");

  const [dateRange, setDateRange] = useState("all");
  const [gradeSection, setGradeSection] = useState("all");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    if (!userProfile) return undefined;
    const unsubscribe = onSnapshot(
      queryForUserScope(collection(db, "violations"), userProfile),
      (snapshot) => {
        const rows = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((record) => !isRecordInTrash(record));
        setViolations(rows);
        setError("");
        setLoading(false);
      },
      (fetchError) => {
        console.error(fetchError);
        setError("Failed to load report data.");
        setLoading(false);
      }
    );

    const unsubscribeStudents = onSnapshot(
      queryForUserScope(collection(db, "students"), userProfile),
      (snapshot) => {
        const numbers = Object.fromEntries(snapshot.docs
          .map((studentDoc) => ({ id: studentDoc.id, ...studentDoc.data() }))
          .filter((student) => !isRecordInTrash(student))
          .map((student) => [student.id, student.student_number || student.id || ""]));
        setStudentNumbers(numbers);
      },
      (fetchError) => console.error("Failed to load student numbers for reports:", fetchError)
    );

    return () => {
      unsubscribe();
      unsubscribeStudents();
    };
  }, [userProfile]);

  const handleLogout = useLogout();

  const gradeSectionOptions = useMemo(() => {
    const values = new Set(violations.map(toGradeSection));
    return Array.from(values).sort();
  }, [violations]);

  const categoryOptions = useMemo(() => {
    const values = new Set(violations.map((v) => v.category_name || "Unspecified"));
    return Array.from(values).sort();
  }, [violations]);

  const filteredViolations = useMemo(() => {
    const now = new Date();
    return violations.filter((v) => {
      const recordDate = pickDate(v);
      if (dateRange !== "all") {
        if (!recordDate) return false;
        const days = Number(dateRange);
        const diffDays = (now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > days) return false;
      }

      if (gradeSection !== "all" && toGradeSection(v) !== gradeSection) return false;
      if (category !== "all" && (v.category_name || "Unspecified") !== category) return false;
      return true;
    }).sort((a, b) => {
      const timeA = pickDate(a)?.getTime() || 0;
      const timeB = pickDate(b)?.getTime() || 0;
      return timeB - timeA;
    });
  }, [violations, dateRange, gradeSection, category]);

  const summary = useMemo(() => {
    const countedViolations = filteredViolations.filter(doesViolationCount);
    const totalViolations = countedViolations.length;
    const students = new Set(countedViolations.map((v) => v.student_id || v.student_name || v.id));
    // Open cases: pending mediation, pending sanction, or serving a suspension.
    const pendingCases = filteredViolations.filter((v) => isOpenCase(v)).length;

    const counts = countedViolations.reduce((acc, v) => {
      const key = v.category_name || "Unspecified";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const mostCommonOffense =
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    return {
      totalViolations,
      uniqueStudents: students.size,
      pendingCases,
      mostCommonOffense,
    };
  }, [filteredViolations]);

  const exportDocx = async () => {
    setExportError("");
    try {
      const { generateReportsDocx } = await import("../engine/reportsXlsx");
      const headers = [
        "Date",
        "Student Number",
        "Student Name",
        "Grade Level",
        "Offense Classification",
        "Specific Violation",
        "Offense Number",
        "Sanction Recommended",
        "Status",
      ];
      const rows = filteredViolations.map((v) => {
        const recordDate = pickDate(v);
        return [
          recordDate ? recordDate.toISOString().slice(0, 10) : "N/A",
          v.student_number || studentNumbers[String(v.student_id)] || "N/A",
          v.student_name || "Unknown",
          v.student_year || v.year_level || v.year || "N/A",
          v.offense_type || "Unspecified",
          v.offense_variety || v.rule_name || "Unspecified",
          v.cumulative_offense_number || v.offense_number || "N/A",
          v.recommended_sanction || "N/A",
          getCaseStatusLabel(getEffectiveCaseStatus(v)),
          v.subcategory_id || "",
        ];
      });
      const logoResponse = await fetch(saresLogo);
      if (!logoResponse.ok) throw new Error(`Failed to load SARES logo (${logoResponse.status}).`);
      const logoData = new Uint8Array(await logoResponse.arrayBuffer());

      await generateReportsDocx(headers, rows, "sares-reports.docx", {
        dateRange,
        generatedAt: new Date(),
        logoData,
      });
    } catch (exportFailure) {
      console.error("Failed to export report:", exportFailure);
      setExportError("Failed to export report. Please try again.");
    }
  };

  return (
    <div className="report-page">
      <div className="report-mobile-menu-bar">
        <div className="report-logo">
          <div className="report-logo-icon"><img src={wesleyLogo} alt="Logo" className="school-logo" /></div>
          <h1 className="report-logo-text">SARES</h1>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="report-mobile-menu-btn">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <Sidebar activePage={location.pathname} handleLogout={handleLogout} isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(false)} userProfile={userProfile} />

      <main className="report-main">
        <h1>Reports</h1>
        <p>Quick view of violations and sanction outcomes.</p>

        <section className="report-filter-card" data-help-target="report-filters">
          <h2>Quick Filters</h2>
          <div className="report-filter-row">
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="all">All Dates</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
            <select value={gradeSection} onChange={(e) => setGradeSection(e.target.value)}>
              <option value="all">All Grade/Section</option>
              {gradeSectionOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All Offense Categories</option>
              {categoryOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <button type="button" className="report-secondary-btn" onClick={exportDocx}>Export DOCX</button>
          </div>
          {exportError && <p className="report-empty report-empty--error" role="alert">{exportError}</p>}
        </section>

        <section className="report-stat-grid" data-help-target="report-summary">
          <article className="report-stat-card"><p>Total Violations</p><h3>{summary.totalViolations}</h3></article>
          <article className="report-stat-card"><p>Unique Students Involved</p><h3>{summary.uniqueStudents}</h3></article>
          <article className="report-stat-card"><p>Most Common Offense</p><h3 className="report-stat-label">{summary.mostCommonOffense}</h3></article>
          <article className="report-stat-card"><p>Pending Cases</p><h3>{summary.pendingCases}</h3></article>
        </section>

        <section className="report-card" data-help-target="report-log">
          <div className="report-card-header">
            <h2>Violation Log</h2>
            <p>Date, offense, recommendation, and final action.</p>
          </div>

          {loading && <p className="report-empty">Loading report data...</p>}
          {!loading && error && <p className="report-empty report-empty--error">{error}</p>}
          {!loading && !error && filteredViolations.length === 0 && (
            <p className="report-empty">No records found for the selected filters.</p>
          )}

          {!loading && !error && filteredViolations.length > 0 && (
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Student Number</th>
                    <th>Student</th>
                    <th>Offense</th>
                    <th>Reported By</th>
                    <th>Identified Sanction</th>
                    <th>Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredViolations.map((v) => {
                    const recordDate = pickDate(v);
                    return (
                      <tr key={v.id}>
                        <td>{recordDate ? recordDate.toISOString().slice(0, 10) : "N/A"}</td>
                        <td>{v.student_number || studentNumbers[String(v.student_id)] || "N/A"}</td>
                        <td>{v.student_name || v.student_id || "Unknown"}</td>
                        <td>{v.offense_variety || v.rule_name || v.category_name || v.offense_type || "Unspecified"}</td>
                        <td>{v.reported_by || "N/A"}</td>
                        <td>{!isResolvedThroughMediation(v) ? formatIdentifiedSanction(v) : "—"}</td>
                        <td>{Array.isArray(v.evidence_urls) ? v.evidence_urls.length : 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
