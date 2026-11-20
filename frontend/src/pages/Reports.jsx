import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { Download, Search } from "lucide-react";
import { db } from "../firebase";
import { useAuthProfile } from "../authContext";
import { queryForUserScope } from "../firestoreAccess";
import { isRecordInTrash } from "../recordStatus";
import { getSchoolYearKey } from "../engine/ruleEngine";
import { isResolvedThroughMediation } from "../caseStatus";
import { ordinal } from "../engine/sanctionLabel";
import AppShell from "../AppShell";
import { clampPage, getPageItems, getTotalPages } from "../pagination";
import {
  allViolationsQuery,
  isMissingIndexError,
  listRecentSchoolYears,
  schoolYearViolationsQuery,
} from "../violationQueries";
import {
  DEFAULT_REPORT_FILTERS,
  OFFENSE_LEVELS,
  STATUS_FILTERS,
  countActiveFilters,
  describeReportScope,
  filterReportCases,
  formatIsoDate,
  getGradeLevel,
  getOffenseLevelLabel,
  getReportDate,
  getReportSanction,
  getReportStatus,
  listGradeLevels,
  listSchoolYearMonths,
  summarizeReportCases,
} from "../reportsData";
import "../css/Reports.css";
import saresLogo from "../assets/sares-logo.png";

const LOG_PAGE_SIZE = 10;

function getStudentNumber(record, studentNumbers) {
  return record.student_number || studentNumbers[String(record.student_id)] || "";
}

export default function Report() {
  const { userProfile } = useAuthProfile();
  const navigate = useNavigate();
  const [violations, setViolations] = useState([]);
  const [studentNumbers, setStudentNumbers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [filters, setFilters] = useState(DEFAULT_REPORT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const logCardRef = useRef(null);

  // Reports read one school year at a time (the current one by default) instead of
  // every violation ever recorded; "All school years" is an explicit choice.
  const currentSchoolYear = useMemo(() => getSchoolYearKey(formatIsoDate(new Date())), []);
  const schoolYearOptions = useMemo(() => listRecentSchoolYears(currentSchoolYear, 5), [currentSchoolYear]);
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear);

  useEffect(() => {
    if (!userProfile) return undefined;
    let unsubscribe = () => {};
    let cancelled = false;

    const subscribe = (violationQuery, filterYearLocally) => {
      unsubscribe = onSnapshot(
        violationQuery,
        (snapshot) => {
          const rows = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((record) => !isRecordInTrash(record))
            .filter((record) => !filterYearLocally || record.school_year_key === schoolYear);
          setViolations(rows);
          setError("");
          setLoading(false);
        },
        (fetchError) => {
          if (cancelled) return;
          if (!filterYearLocally && schoolYear !== "all" && isMissingIndexError(fetchError)) {
            console.warn("Reports: Firestore index not deployed yet, so every violation was read instead. Deploy firestore.indexes.json to fix.", fetchError);
            subscribe(allViolationsQuery(userProfile), true);
            return;
          }
          console.error(fetchError);
          setError("Report data could not be loaded. Check your connection and try again.");
          setLoading(false);
        }
      );
    };

    subscribe(
      schoolYear === "all" ? allViolationsQuery(userProfile) : schoolYearViolationsQuery(userProfile, schoolYear),
      false
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userProfile, schoolYear]);

  // Cases store the student number; only older records without it need the student list.
  const needsStudentNumbers = useMemo(() => violations.some((v) => !v.student_number), [violations]);
  useEffect(() => {
    if (!userProfile || !needsStudentNumbers) return undefined;
    let cancelled = false;
    getDocs(queryForUserScope(collection(db, "students"), userProfile))
      .then((snapshot) => {
        if (cancelled) return;
        setStudentNumbers(Object.fromEntries(snapshot.docs
          .map((studentDoc) => ({ id: studentDoc.id, ...studentDoc.data() }))
          .filter((student) => !isRecordInTrash(student))
          .map((student) => [student.id, student.student_number || student.id || ""])));
      })
      .catch((fetchError) => console.error("Failed to load student numbers for reports:", fetchError));
    return () => {
      cancelled = true;
    };
  }, [userProfile, needsStudentNumbers]);

  const monthOptions = useMemo(
    () => (schoolYear === "all" ? [] : listSchoolYearMonths(schoolYear)),
    [schoolYear]
  );
  const gradeLevelOptions = useMemo(() => listGradeLevels(violations), [violations]);
  const filteredViolations = useMemo(() => filterReportCases(violations, filters), [violations, filters]);
  const summary = useMemo(() => summarizeReportCases(filteredViolations), [filteredViolations]);
  const scopeLabel = describeReportScope({ schoolYear, filters, months: monthOptions });
  const activeFilterCount = countActiveFilters(filters);

  // The log shows one page at a time; the summary and the export use every filtered case.
  const totalPages = getTotalPages(filteredViolations.length, LOG_PAGE_SIZE);
  const visiblePage = clampPage(currentPage, totalPages);
  const pageStart = (visiblePage - 1) * LOG_PAGE_SIZE;
  const pageViolations = filteredViolations.slice(pageStart, pageStart + LOG_PAGE_SIZE);

  const goToPage = (page) => {
    setCurrentPage(clampPage(page, totalPages));
    // Keep the table header in view when the new page is shorter than the old one.
    const card = logCardRef.current;
    if (card && card.getBoundingClientRect().top < 0) {
      card.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  };

  // Any filter change starts the log again from the first page.
  const updateFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch }));
    setCurrentPage(1);
  };

  const changeSchoolYear = (value) => {
    setLoading(true);
    setSchoolYear(value);
    // Months belong to a school year, so the month filter starts over.
    updateFilters({ month: "all" });
  };

  const clearFilters = () => {
    setFilters(DEFAULT_REPORT_FILTERS);
    setCurrentPage(1);
  };

  const openCase = (record) => {
    const group = record.group_incident_id
      ? violations.filter((item) => item.group_incident_id === record.group_incident_id)
      : [record];
    navigate(`/sares/case-assessment/${record.id}`, { state: { caseData: record, groupCaseData: group } });
  };

  const exportDocx = async () => {
    setExportError("");
    setExporting(true);
    try {
      const { generateReportsDocx } = await import("../engine/reportsXlsx");
      const rows = filteredViolations.map((v) => {
        const offenseNumber = v.cumulative_offense_number || v.offense_number;
        return [
          formatIsoDate(getReportDate(v)) || "N/A",
          getStudentNumber(v, studentNumbers) || "N/A",
          v.student_name || "Unknown",
          getGradeLevel(v),
          v.offense_type === "major" ? "Major Offense" : v.offense_type === "minor" ? "Minor Offense" : "Unspecified",
          v.offense_variety || v.rule_name || "Unspecified",
          offenseNumber ? `${ordinal(offenseNumber)} offense` : "N/A",
          getReportSanction(v) || (isResolvedThroughMediation(v) ? "None (resolved through mediation)" : "N/A"),
          getReportStatus(v).label,
          v.subcategory_id || "",
        ];
      });
      const logoResponse = await fetch(saresLogo);
      if (!logoResponse.ok) throw new Error(`Failed to load SARES logo (${logoResponse.status}).`);
      const logoData = new Uint8Array(await logoResponse.arrayBuffer());

      await generateReportsDocx([], rows, `sares-report-${schoolYear === "all" ? "all-years" : `SY${schoolYear}`}.docx`, {
        generatedAt: new Date(),
        logoData,
        scopeLabel,
      });
    } catch (exportFailure) {
      console.error("Failed to export report:", exportFailure);
      setExportError("The report could not be exported. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell>
      <header className="rpt-header">
        <div className="app-page-heading">
          <h1 className="app-page-title">Reports</h1>
          <p className="app-page-sub">Violations, sanctions, and case outcomes. Filter the cases, then export them as a document.</p>
        </div>
        <button
          type="button"
          className="rpt-export-btn"
          onClick={exportDocx}
          disabled={exporting || loading || filteredViolations.length === 0}
          title={filteredViolations.length === 0 ? "No cases to export for these filters" : undefined}
        >
          <Download size={16} aria-hidden="true" />
          {exporting ? "Exporting…" : `Export DOCX${filteredViolations.length ? ` (${filteredViolations.length})` : ""}`}
        </button>
      </header>
      {exportError && <p className="rpt-alert rpt-alert--error" role="alert">{exportError}</p>}

      <section className="report-card" data-help-target="report-filters" aria-label="Report filters">
        <label className="rpt-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={filters.search}
            onChange={(event) => updateFilters({ search: event.target.value })}
            placeholder="Search by student name, student number, case number, or violation"
            aria-label="Search cases"
          />
        </label>

        <div className="rpt-filter-grid">
          <label className="rpt-field">
            <span>School year</span>
            <select value={schoolYear} onChange={(event) => changeSchoolYear(event.target.value)}>
              {schoolYearOptions.map((year) => (
                <option key={year} value={year}>SY {year}{year === currentSchoolYear ? " (current)" : ""}</option>
              ))}
              <option value="all">All school years</option>
            </select>
          </label>
          <label className="rpt-field">
            <span>Month</span>
            <select
              value={filters.month}
              onChange={(event) => updateFilters({ month: event.target.value })}
              disabled={schoolYear === "all"}
              title={schoolYear === "all" ? "Choose a school year to filter by month" : undefined}
            >
              <option value="all">Whole school year</option>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </label>
          <label className="rpt-field">
            <span>Grade level</span>
            <select value={filters.gradeLevel} onChange={(event) => updateFilters({ gradeLevel: event.target.value })}>
              <option value="all">All grade levels</option>
              {gradeLevelOptions.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </label>
          <label className="rpt-field">
            <span>Offense level</span>
            <select value={filters.offenseLevel} onChange={(event) => updateFilters({ offenseLevel: event.target.value })}>
              <option value="all">All levels</option>
              <optgroup label="Minor">
                {OFFENSE_LEVELS.filter((level) => level.type === "minor").map((level) => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </optgroup>
              <optgroup label="Major">
                {OFFENSE_LEVELS.filter((level) => level.type === "major").map((level) => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </optgroup>
            </select>
          </label>
          <label className="rpt-field">
            <span>Status</span>
            <select value={filters.status} onChange={(event) => updateFilters({ status: event.target.value })}>
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="rpt-filter-footer">
          <p className="rpt-scope">Showing: {scopeLabel}</p>
          {activeFilterCount > 0 && (
            <button type="button" className="rpt-text-btn" onClick={clearFilters}>
              Clear {activeFilterCount === 1 ? "filter" : `${activeFilterCount} filters`}
            </button>
          )}
        </div>
      </section>

      <section className="rpt-stat-grid" data-help-target="report-summary" aria-label="Report summary">
        <article className="rpt-stat">
          <p className="rpt-stat-label">Cases</p>
          <p className="rpt-stat-value">{summary.totalCases}</p>
          <p className="rpt-stat-sub">{summary.minor} minor · {summary.major} major</p>
        </article>
        <article className="rpt-stat">
          <p className="rpt-stat-label">Students involved</p>
          <p className="rpt-stat-value">{summary.students}</p>
          <p className="rpt-stat-sub">
            {summary.repeatStudents} with more than one case
          </p>
        </article>
        <article className={`rpt-stat${summary.open > 0 ? " rpt-stat--attention" : ""}`}>
          <p className="rpt-stat-label">Open cases</p>
          <p className="rpt-stat-value">{summary.open}</p>
          <p className="rpt-stat-sub">
            {summary.open > 0 ? "Pending mediation, sanction, or serving suspension" : "Nothing waiting for action"}
          </p>
        </article>
        <article className="rpt-stat">
          <p className="rpt-stat-label">Most common violation</p>
          <p className="rpt-stat-value rpt-stat-value--text">{summary.mostCommon?.name || "—"}</p>
          <p className="rpt-stat-sub">
            {summary.mostCommon ? `${summary.mostCommon.count} ${summary.mostCommon.count === 1 ? "case" : "cases"}` : "No cases yet"}
          </p>
        </article>
      </section>

      <section className="report-card" data-help-target="report-log" ref={logCardRef}>
        <div className="report-card-header">
          <h2>Violation Log</h2>
          <p>Newest first. Select View to open a case and its printable incident report.</p>
        </div>

        {loading && <p className="report-empty" role="status">Loading report data…</p>}
        {!loading && error && <p className="report-empty report-empty--error" role="alert">{error}</p>}
        {!loading && !error && filteredViolations.length === 0 && (
          <p className="report-empty">
            {violations.length === 0
              ? `No cases recorded for ${schoolYear === "all" ? "any school year" : `SY ${schoolYear}`}.`
              : "No cases match these filters."}
            {activeFilterCount > 0 && (
              <>
                {" "}
                <button type="button" className="rpt-text-btn" onClick={clearFilters}>Clear filters</button>
              </>
            )}
          </p>
        )}

        {!loading && !error && filteredViolations.length > 0 && (
          <div className="report-table-wrap">
            <table className="report-table rpt-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Student</th>
                  <th scope="col">Violation</th>
                  <th scope="col">Sanction</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {pageViolations.map((v) => {
                  const studentNumber = getStudentNumber(v, studentNumbers);
                  const offenseNumber = v.cumulative_offense_number || v.offense_number;
                  const status = getReportStatus(v);
                  const sanction = getReportSanction(v);
                  return (
                    <tr key={v.id}>
                      <td>{formatIsoDate(getReportDate(v)) || "—"}</td>
                      <td>
                        <span className="rpt-cell-main">{v.student_name || "Unknown student"}</span>
                        <span className="rpt-cell-sub">
                          {[studentNumber, getGradeLevel(v) !== "Unspecified" ? getGradeLevel(v) : ""].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </td>
                      <td>
                        <span className="rpt-cell-main">{v.offense_variety || v.rule_name || v.category_name || "Unspecified"}</span>
                        <span className="rpt-cell-sub">
                          {getOffenseLevelLabel(v.subcategory_id) && (
                            <span className={`rpt-level rpt-level--${v.subcategory_id}`}>{getOffenseLevelLabel(v.subcategory_id)}</span>
                          )}
                          {offenseNumber ? `${ordinal(offenseNumber)} offense` : ""}
                        </span>
                      </td>
                      <td>
                        {sanction || (
                          <span className="rpt-cell-muted">
                            {isResolvedThroughMediation(v) ? "None (resolved through mediation)" : "—"}
                          </span>
                        )}
                      </td>
                      <td><span className={`rpt-status rpt-status--${status.tone}`}>{status.label}</span></td>
                      <td>
                        <button type="button" className="rpt-view-btn" onClick={() => openCase(v)}>
                          View<span className="sr-only"> case of {v.student_name || "student"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filteredViolations.length > 0 && (
          <div className="report-pagination-bar">
            <p className="report-pagination-summary">
              Showing {pageStart + 1}–{pageStart + pageViolations.length} of {filteredViolations.length} {filteredViolations.length === 1 ? "case" : "cases"}
            </p>
            {totalPages > 1 && (
              <nav className="report-pagination" aria-label="Violation log pages">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={visiblePage === 1}
                  onClick={() => goToPage(visiblePage - 1)}
                >
                  ‹
                </button>
                {getPageItems(visiblePage, totalPages).map((item, index) => (
                  item === "ellipsis" ? (
                    <span key={`ellipsis-${index}`} className="report-pagination-ellipsis" aria-hidden="true">…</span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className={item === visiblePage ? "active" : ""}
                      aria-label={`Page ${item}`}
                      aria-current={item === visiblePage ? "page" : undefined}
                      onClick={() => goToPage(item)}
                    >
                      {item}
                    </button>
                  )
                ))}
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={visiblePage === totalPages}
                  onClick={() => goToPage(visiblePage + 1)}
                >
                  ›
                </button>
              </nav>
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
