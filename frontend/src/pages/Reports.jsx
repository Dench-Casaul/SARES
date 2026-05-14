import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  ShieldCheck,
  BarChart3,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { auth, db } from "../firebase";
import "../css/Reports.css";
import wesleyLogo from "../assets/wesley-logo.png";

function Sidebar({ activePage, handleLogout, isOpen, toggleSidebar }) {
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
          <li><Link to="/sares/dashboard" onClick={toggleSidebar} className={`report-nav-item${activePage === "/sares/dashboard" ? " report-nav-item--active" : ""}`}><LayoutDashboard className="report-nav-icon" /><span>Dashboard</span></Link></li>
          <li><Link to="/sares/students" onClick={toggleSidebar} className={`report-nav-item${activePage === "/sares/students" ? " report-nav-item--active" : ""}`}><Users className="report-nav-icon" /><span>Students</span></Link></li>
          <li><Link to="/sares/rules" onClick={toggleSidebar} className={`report-nav-item${activePage === "/sares/rules" ? " report-nav-item--active" : ""}`}><ShieldCheck className="report-nav-icon" /><span>Rule Management</span></Link></li>
          <li><Link to="/sares/reports" onClick={toggleSidebar} className={`report-nav-item${activePage === "/sares/reports" ? " report-nav-item--active" : ""}`}><BarChart3 className="report-nav-icon" /><span>Reports</span></Link></li>
          <li><Link to="/sares/violation" onClick={toggleSidebar} className={`report-nav-item${activePage === "/sares/violation" ? " report-nav-item--active" : ""}`}><ClipboardList className="report-nav-icon" /><span>Log Violation</span></Link></li>
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

function csvEscape(value) {
  const raw = String(value ?? "");
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function normalizeSeverity(value) {
  if (value === null || value === undefined || value === "") return "Unspecified";
  const text = String(value).trim().toLowerCase();

  if (["low", "minor"].includes(text)) return "Low";
  if (["moderate", "medium"].includes(text)) return "Moderate";
  if (["high", "major"].includes(text)) return "High";
  if (["critical", "severe", "very high"].includes(text)) return "Critical";

  const num = Number(value);
  if (!Number.isNaN(num)) {
    if (num <= 3) return "Low";
    if (num <= 6) return "Moderate";
    if (num <= 8) return "High";
    return "Critical";
  }

  return "Unspecified";
}

export default function Report() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dateRange, setDateRange] = useState("all");
  const [gradeSection, setGradeSection] = useState("all");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const loadViolations = async () => {
      try {
        const snapshot = await getDocs(collection(db, "violations"));
        const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setViolations(rows);
      } catch (fetchError) {
        console.error(fetchError);
        setError("Failed to load report data.");
      } finally {
        setLoading(false);
      }
    };

    loadViolations();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // no-op
    }
    localStorage.removeItem("user");
    navigate("/login");
  };

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
    });
  }, [violations, dateRange, gradeSection, category]);

  const summary = useMemo(() => {
    const totalViolations = filteredViolations.length;
    const students = new Set(filteredViolations.map((v) => v.student_id || v.student_name || v.id));
    const pendingCases = filteredViolations.filter((v) => String(v.status || "").toLowerCase() === "pending").length;

    const counts = filteredViolations.reduce((acc, v) => {
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

  const exportCsv = () => {
    const headers = [
      "Date",
      "Student ID",
      "Student Name",
      "Offense Type",
      "Severity",
      "Sanction Recommended",
    ];
    const rows = filteredViolations.map((v) => {
      const recordDate = pickDate(v);
      return [
        recordDate ? recordDate.toISOString().slice(0, 10) : "N/A",
        v.student_id || "N/A",
        v.student_name || "Unknown",
        v.rule_name || v.offense_type || v.category_name || "Unspecified",
        normalizeSeverity(v.severity),
        v.recommended_sanction || "N/A",
      ];
    });

    const csv = [headers, ...rows].map((line) => line.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sares-reports.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

      <Sidebar activePage={location.pathname} handleLogout={handleLogout} isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(false)} />

      <main className="report-main">
        <h1>Reports</h1>
        <p>Quick view of violations and sanction outcomes.</p>

        <section className="report-filter-card">
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
            <button type="button" className="report-secondary-btn" onClick={exportCsv}>Export CSV</button>
          </div>
        </section>

        <section className="report-stat-grid">
          <article className="report-stat-card"><p>Total Violations</p><h3>{summary.totalViolations}</h3></article>
          <article className="report-stat-card"><p>Unique Students Involved</p><h3>{summary.uniqueStudents}</h3></article>
          <article className="report-stat-card"><p>Most Common Offense</p><h3 className="report-stat-label">{summary.mostCommonOffense}</h3></article>
          <article className="report-stat-card"><p>Pending Cases</p><h3>{summary.pendingCases}</h3></article>
        </section>

        <section className="report-card">
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
                    <th>Student</th>
                    <th>Offense</th>
                    <th>Recommended Sanction</th>
                    <th>Final Action</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredViolations.map((v) => {
                    const recordDate = pickDate(v);
                    return (
                      <tr key={v.id}>
                        <td>{recordDate ? recordDate.toISOString().slice(0, 10) : "N/A"}</td>
                        <td>{v.student_name || v.student_id || "Unknown"}</td>
                        <td>{v.rule_name || v.description || v.category_name || "Unspecified"}</td>
                        <td>{v.recommended_sanction || "N/A"}</td>
                        <td>{v.final_sanction || v.status_note || "N/A"}</td>
                        <td>{v.status || "N/A"}</td>
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
